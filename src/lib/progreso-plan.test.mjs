// ============================================================================
// Test del progreso del plan diario (issue #23).
// Ejecuta con: `node src/lib/progreso-plan.test.mjs`
//
// QUÉ SE COMPRUEBA (contra un Postgres REAL, no contra mocks):
//   1. `marcar_tarea_y_plan` marca la tarea Y su fila del plan a la vez.
//   2. Si la escritura del plan falla, la de la tarea se DESHACE (transacción).
//   3. `reconciliar_plan_diario` alinea el plan con el estado real de la
//      tarea (incluida la tarea archivada ya completada).
//   4. El reconciliador es idempotente y no toca las tareas libres del plan.
//   5. Una tarea de otro owner no se puede tocar.
//
// CÓMO:
//   - Levanta una base de datos desechable `test_progreso_plan`, aplica la
//     migration 0042 tal cual está en el repo y hace las comprobaciones con
//     `psql`.
//
//   - Si no hay Postgres disponible (CI sin servicio, máquina sin psql) el
//     test se SALTA y avisa: no es un fallo, pero tampoco una verificación.
//
// VARIABLES DE ENTORNO:
//   PGURL  → URL de postgres para el servidor de pruebas.
//            Por defecto `postgres://postgres@localhost:5432/postgres`.
//   PGHOST / PGPORT / PGUSER → alternativas sueltas.
// ============================================================================

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRACION = path.join(
  RAIZ,
  "supabase",
  "migrations",
  "0042_progreso_plan_atomico.sql",
);
const DB_PRUEBAS = "test_progreso_plan";

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${nombre}`);
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e.message });
    console.log(`  ❌ ${nombre}: ${e.message}`);
  }
}

function eq(a, b, msg) {
  const sa = String(a);
  const sb = String(b);
  if (sa !== sb) throw new Error(`${msg ?? "desigual"}: ${sa} !== ${sb}`);
}

// ----------------------------------------------------------------------------
// Conexión
// ----------------------------------------------------------------------------

function urlAdmin() {
  if (process.env.PGURL) return process.env.PGURL;
  const host = process.env.PGHOST ?? "localhost";
  const port = process.env.PGPORT ?? "5432";
  const user = process.env.PGUSER ?? "postgres";
  return `postgres://${user}@${host}:${port}/postgres`;
}

/** Entorno de `psql`: traduce `PGURL` (no es una variable de libpq) a las
 *  variables estándar y añade el `app.test_uid` que usa la RPC. */
function pgEnv(uid) {
  const env = { ...process.env };
  let u;
  try {
    u = new URL(urlAdmin());
  } catch {
    u = null;
  }
  if (u) {
    if (u.hostname) env.PGHOST = decodeURIComponent(u.hostname);
    if (u.port) env.PGPORT = u.port;
    if (u.username) env.PGUSER = decodeURIComponent(u.username);
    if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  }
  if (uid) env.PGOPTIONS = `-c app.test_uid=${uid}`;
  return env;
}

/** Ejecuta SQL en la base `db` y devuelve la salida (sin cabeceras). */
function sql(texto, { db = DB_PRUEBAS, uid = null } = {}) {
  const args = ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-d", db, "-c", texto];
  const r = spawnSync("psql", args, { encoding: "utf8", env: pgEnv(uid) });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`SQL falló: ${(r.stderr || r.stdout || "").trim()}`);
  }
  return (r.stdout ?? "").trim();
}

/** Ejecuta SQL esperando que FALLE (para comprobar los reventones). */
function sqlFalla(texto, { db = DB_PRUEBAS, uid = null } = {}) {
  const args = ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-t", "-A", "-d", db, "-c", texto];
  const r = spawnSync("psql", args, { encoding: "utf8", env: pgEnv(uid) });
  if (r.status === 0) throw new Error("se esperaba un error y la consulta pasó");
  return (r.stderr || r.stdout || "").trim();
}

function tienePsql() {
  const r = spawnSync("psql", ["--version"], { encoding: "utf8" });
  return !r.error && r.status === 0;
}

function hayServidor() {
  try {
    sql("select 1", { db: "postgres" });
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// Montaje del entorno de pruebas
// ----------------------------------------------------------------------------

const OWNER = "11111111-1111-1111-1111-111111111111";
const OTRO = "22222222-2222-2222-2222-222222222222";
const TAREA_A = "aaaaaaaa-0000-0000-0000-000000000001";
const TAREA_B = "aaaaaaaa-0000-0000-0000-000000000002";
const TAREA_OTRO = "bbbbbbbb-0000-0000-0000-000000000001";
const PLAN_1 = "cccccccc-0000-0000-0000-000000000001";
const PLAN_2 = "cccccccc-0000-0000-0000-000000000002";

function montarBase() {
  // La base de pruebas se crea desde cero: el repo y la BD real no se tocan.
  sql(`drop database if exists ${DB_PRUEBAS}`, { db: "postgres" });
  sql(`create database ${DB_PRUEBAS}`, { db: "postgres" });

  // Rol al que la migration da permisos.
  sql("do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;", {
    db: "postgres",
  });

  // Emulamos lo que ofrece Supabase: `auth.uid()`.
  sql(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key, deleted_at timestamptz);
    create or replace function auth.uid() returns uuid
      language sql stable as $$
      select nullif(current_setting('app.test_uid', true), '')::uuid
      $$;
  `);

  // Tablas mínimas con las columnas que usa la migration 0042.
  sql(`
    create table public.tareas (
      id uuid primary key,
      owner_id uuid not null,
      estado text not null default 'pendiente',
      completada_at timestamptz
    );
    create table public.plan_diario_tareas (
      id uuid primary key default gen_random_uuid(),
      owner_id uuid not null,
      plan_diario_id uuid not null,
      tarea_id uuid references public.tareas(id) on delete set null,
      hecho boolean not null default false
    );
  `);

  // Y la migration del repo, TAL CUAL (esto es lo que se prueba).
  const sqlMigracion = readFileSync(MIGRACION, "utf8");
  sql(sqlMigracion);

  // Datos: dos tareas del owner en dos planes, una tarea libre y una de otro.
  sql(`
    insert into public.tareas (id, owner_id, estado) values
      ('${TAREA_A}', '${OWNER}', 'pendiente'),
      ('${TAREA_B}', '${OWNER}', 'pendiente'),
      ('${TAREA_OTRO}', '${OTRO}', 'pendiente');
    insert into public.plan_diario_tareas (owner_id, plan_diario_id, tarea_id, hecho) values
      ('${OWNER}', '${PLAN_1}', '${TAREA_A}', false),
      ('${OWNER}', '${PLAN_2}', '${TAREA_B}', false),
      ('${OWNER}', '${PLAN_1}', null, false),
      ('${OTRO}', '${PLAN_1}', '${TAREA_OTRO}', false);
  `);
}

/** Estado de una fila del plan (hecho) y de su tarea. */
function estado(idTarea, idPlan) {
  return sql(
    `select coalesce((select hecho::text from public.plan_diario_tareas
                       where tarea_id = '${idTarea}' and plan_diario_id = '${idPlan}'), 'null')
            || '/' ||
            coalesce((select estado from public.tareas where id = '${idTarea}'), 'null')
            || '/' ||
            coalesce((select (completada_at is not null)::text from public.tareas where id = '${idTarea}'), 'null')`,
    { uid: OWNER },
  );
}

// ----------------------------------------------------------------------------
// ¿Hay Postgres? Si no, el test se salta (no es un fallo, pero avisa).
// ----------------------------------------------------------------------------

if (!tienePsql()) {
  console.log(
    "\n⚠️  Sin `psql` en el PATH: se salta el test del progreso del plan (issue #23).",
  );
  process.exit(0);
}
if (!hayServidor()) {
  console.log(
    "\n⚠️  Sin servidor Postgres: se salta el test del progreso del plan (issue #23).",
  );
  console.log(
    "    Para ejecutarlo: PGURL=postgres://usuario@host:puerto/postgres npm test",
  );
  process.exit(0);
}
if (!existsSync(MIGRACION)) {
  console.error(`\n❌ No se encuentra la migration ${MIGRACION}`);
  process.exit(1);
}
try {
  montarBase();
} catch (e) {
  console.error(`\n❌ No se pudo preparar la base de pruebas: ${e.message}`);
  process.exit(1);
}

// ----------------------------------------------------------------------------
// Los tests
// ----------------------------------------------------------------------------

console.log("\nmarcar_tarea_y_plan (escritura atómica)");

test("marca la tarea y su fila del plan a la vez", () => {
  sql(`select public.marcar_tarea_y_plan('${TAREA_A}', true)`, { uid: OWNER });
  eq(estado(TAREA_A, PLAN_1), "true/hecha/true", "tarea+plan tras marcar");
});

test("reabrir deshace la tarea y la fila del plan", () => {
  sql(`select public.marcar_tarea_y_plan('${TAREA_A}', false)`, { uid: OWNER });
  eq(estado(TAREA_A, PLAN_1), "false/pendiente/false", "tarea+plan tras reabrir");
});

test("si la escritura del plan falla, la de la tarea se deshace", () => {
  // Trigger que revienta la actualización del plan: simula el corte de red
  // del issue #23 en el momento exacto de la segunda escritura.
  sql(`
    create or replace function public.reventar_plan() returns trigger
      language plpgsql as $$
      begin raise exception 'fallo de red simulado'; end $$;
    create trigger trg_reventar before update on public.plan_diario_tareas
      for each row execute function public.reventar_plan();
  `);

  let fallo = "";
  try {
    sql(`select public.marcar_tarea_y_plan('${TAREA_A}', true)`, { uid: OWNER });
  } catch (e) {
    fallo = e.message;
  }
  if (!fallo) throw new Error("se esperaba un error al escribir el plan");

  // Lo importante: la tarea NO quedó hecha (la transacción se deshizo entera).
  eq(
    estado(TAREA_A, PLAN_1),
    "false/pendiente/false",
    "la tarea no debe quedar hecha si el plan falló",
  );

  sql(`drop trigger if exists trg_reventar on public.plan_diario_tareas`);
});

console.log("\nreconciliar_plan_diario (red de seguridad)");

test("alinea el plan con una tarea hecha fuera del plan", () => {
  // Estado descuadrado: la tarea está hecha pero su fila del plan no.
  sql(`update public.tareas set estado='hecha', completada_at=now() where id='${TAREA_A}'`);
  const corregidas = sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  eq(corregidas, "1", "filas corregidas");
  eq(estado(TAREA_A, PLAN_1), "true/hecha/true", "plan reconciliado");
});

test("desmarca el plan si la tarea ya no está hecha", () => {
  sql(`update public.tareas set estado='pendiente', completada_at=null where id='${TAREA_A}'`);
  sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  eq(estado(TAREA_A, PLAN_1), "false/pendiente/false", "plan desmarcado");
});

test("una tarea archivada ya completada sigue contando como hecha", () => {
  sql(`update public.tareas set estado='archivada', completada_at=now() where id='${TAREA_A}'`);
  sql(`update public.plan_diario_tareas set hecho=false where tarea_id='${TAREA_A}'`);
  sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  eq(estado(TAREA_A, PLAN_1), "true/archivada/true", "archivada hecha sigue hecha");
  // Se deja como estaba para los siguientes tests.
  sql(`update public.tareas set estado='pendiente', completada_at=null where id='${TAREA_A}'`);
  sql(`update public.plan_diario_tareas set hecho=false where tarea_id='${TAREA_A}'`);
});

test("no toca las tareas libres del plan (tarea_id = null)", () => {
  sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  const libre = sql(
    `select hecho::text from public.plan_diario_tareas
      where plan_diario_id='${PLAN_1}' and tarea_id is null`,
    { uid: OWNER },
  );
  eq(libre, "false", "la tarea libre del plan no se toca");
});

test("es idempotente: la segunda pasada no corrige nada", () => {
  sql(`update public.tareas set estado='hecha', completada_at=now() where id='${TAREA_A}'`);
  sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  const segunda = sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  eq(segunda, "0", "la segunda pasada no debe corregir nada");
});

test("reconcilia solo el plan indicado", () => {
  // Dos planes descuadrados a la vez: uno en el plan 1 y otro en el plan 2.
  sql(
    `update public.tareas set estado='hecha', completada_at=now()
      where id in ('${TAREA_A}','${TAREA_B}')`,
  );
  sql(
    `update public.plan_diario_tareas set hecho=false
      where tarea_id in ('${TAREA_A}','${TAREA_B}')`,
  );
  const corregidas = sql(`select public.reconciliar_plan_diario('${PLAN_1}')`, { uid: OWNER });
  eq(corregidas, "1", "solo corrige el plan pedido");
  eq(estado(TAREA_A, PLAN_1), "true/hecha/true", "el plan 1 se corrigió");
  eq(estado(TAREA_B, PLAN_2), "false/hecha/true", "el plan 2 sigue pendiente");
});

console.log("\nseguridad (owner)");

test("no se puede marcar la tarea de otro owner", () => {
  let fallo = "";
  try {
    sql(`select public.marcar_tarea_y_plan('${TAREA_OTRO}', true)`, { uid: OWNER });
  } catch (e) {
    fallo = e.message;
  }
  if (!fallo) throw new Error("se esperaba un error al tocar la tarea de otro");
  const estadoOtro = sql(
    `select estado from public.tareas where id='${TAREA_OTRO}'`,
    { uid: OWNER },
  );
  eq(estadoOtro, "pendiente", "la tarea del otro owner no se modificó");
});

test("el reconciliador no toca los planes de otro owner", () => {
  sql(`select public.reconciliar_plan_diario(null)`, { uid: OWNER });
  const hechoOtro = sql(
    `select hecho::text from public.plan_diario_tareas
      where tarea_id='${TAREA_OTRO}'`,
    { uid: OWNER },
  );
  eq(hechoOtro, "false", "el plan del otro owner no se tocó");
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
