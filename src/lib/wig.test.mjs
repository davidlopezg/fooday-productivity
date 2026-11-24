// ============================================================================
// Test de regresión: los WIGs de TAREA solo cuentan tareas VIVAS.
//
// CONTEXTO (issue #80, bug real):
// Una tarea marcada como WIG (🎯) que luego se marcaba como HECA se quedaba
// en el panel "WIGs — Tareas foco (máx 3)" y, peor, seguía OCUPANDO una de
// las 3 plazas: la RPC `toggle_tarea_wig` cuenta `es_wig = true` sin mirar el
// estado, así que con 3 WIGs marcadas y una completada el contador decía
// 3/3 y no se podía promover otra tarea a WIG.
//
// LA REGLA (issue #80):
// El foco es para lo que está VIVO. Una tarea WIG que se cierra (hecha /
// archivada / descartada) deja de ser WIG: sale del panel y libera su plaza.
//
// POR QUÉ ESTE TEST ES ESTÁTICO:
// La regla vive en la BASE DE DATOS (trigger BEFORE UPDATE + backfill), que
// es donde ya vive el cap de 3 (`toggle_tarea_wig`). No hay BD en el runner,
// así que este test lee las migraciones y comprueba que la regla está
// escrita — igual que `schema-queries.test.mjs` lee las migraciones para
// cazar queries que piden columnasinexistentes.
//
// Si alguien borra o renombra la migration 0041, este test falla.
//
// ============================================================================

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIG_DIR = path.join(RAIZ, "supabase", "migrations");

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

/** @returns {string|null} Contenido de la migration 0041, o null si no está. */
function migrationWig() {
  const f = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .find((f) => f.startsWith("0041_") && f.includes("wig"));
  if (!f) return null;
  return readFileSync(path.join(MIG_DIR, f), "utf8");
}

console.log("\n=== La regla de los WIGs de tarea (issue #80) ===");

const sql = migrationWig();

test("existe la migration 0041 de los WIGs de tarea", () => {
  if (!sql) {
    throw new Error(
      "No se encontró supabase/migrations/0041_*wig*.sql — sin ella, una " +
        "tarea WIG completada se queda en el panel y sigue ocupando plaza " +
        "(issue #80)",
    );
  }
});

test("el trigger BEFORE UPDATE está sobre public.tareas", () => {
  const t = sql.match(
    /create\s+trigger\s+trg_tareas_wig_al_cerrar[\s\S]*?before\s+update\s+on\s+public\.tareas[\s\S]*?execute\s+function\s+public\.tareas_wig_al_cerrar\s*\(\s*\)\s*;/i,
  );
  if (!t) {
    throw new Error(
      "La migration no crea el trigger BEFORE UPDATE trg_tareas_wig_al_cerrar " +
        "sobre public.tareas",
    );
  }
});

test("el trigger suelta es_wig y wig_orden al cerrar la tarea", () => {
  const cuerpo = sql.match(
    /create\s+or\s+replace\s+function\s+public\.tareas_wig_al_cerrar[\s\S]*?\$\$([\s\S]*?)\$\$/i,
  );
  if (!cuerpo) {
    throw new Error("No se encontró la función public.tareas_wig_al_cerrar");
  }
  if (!/new\.es_wig\s*:=\s*false/i.test(cuerpo[1])) {
    throw new Error("La función no pone es_wig := false");
  }
  if (!/new\.wig_orden\s*:=\s*null/i.test(cuerpo[1])) {
    throw new Error("La función no pone wig_orden := null");
  }
});

test("el trigger solo actúa sobre tareas cerradas (no vivas)", () => {
  const cuerpo = sql.match(
    /create\s+or\s+replace\s+function\s+public\.tareas_wig_al_cerrar[\s\S]*?\$\$([\s\S]*?)\$\$/i,
  );
  if (!cuerpo) throw new Error("No se encontró la función del trigger");
  const vivos = cuerpo[1].match(
    /not\s+in\s*\(\s*'pendiente'\s*,\s*'en_progreso'\s*,\s*'bloqueada'\s*\)/i,
  );
  if (!vivos) {
    throw new Error(
      "La función no comprueba que el estado no sea uno de los vivos " +
        "(pendiente / en_progreso / bloqueada): el trigger soltaría el WIG " +
        "de tareas que siguen vivas",
    );
  }
});

test("la migration limpia las tareas ya cerradas que quedaban como WIG", () => {
  const backfill = sql.match(
    /update\s+public\.tareas\s+set\s+es_wig\s*=\s*false[\s\S]*?where\s+es_wig\s*=\s*true[\s\S]*?estado\s+not\s+in/i,
  );
  if (!backfill) {
    throw new Error(
      "La migration no tiene el backfill: las tareas que YA estaban " +
        "completadas y quedaban como WIG seguirían en el panel y ocupando " +
        "plaza",
    );
  }
});

test("la migration es idempotente (se puede volver a aplicar)", () => {
  if (!/create\s+or\s+replace\s+function/i.test(sql)) {
    throw new Error("La función no se crea con `create or replace function`");
  }
  if (!/drop\s+trigger\s+if\s+exists/i.test(sql)) {
    throw new Error("El trigger no se drops con `drop trigger if exists`");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ Los WIGs de tarea solo cuentan tareas vivas (issue #80)");
