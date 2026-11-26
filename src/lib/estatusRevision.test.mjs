// ============================================================================
// Test del checklist de REVISIÓN DIARIA del Estatus (issue #85).
//
// QUÉ COMPRUEBA
//   1. El checklist tiene los 9 ítems del enunciado, agrupados en
//      Trabajo (3) / Atención (2) / Vida personal (4).
//   2. `resumenRevision` cuenta respondidos, cumplidos y pendientes, y
//      diferencia "no respondido" (null) de "no lo hice" (false).
//   3. La migration 0044 existe y declara las 10 columnas (9 booleanas +
//      la mejora de mañana): si alguien la borra o renombra, esto falla.
//
// ============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHECKLIST_REVISION,
  CAMPO_MEJORA_MANANA,
  itemsRevision,
  resumenRevision,
  valorRevision,
} from "@/lib/estatusRevision";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e instanceof Error ? e.message : String(e) });
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg ?? ""} esperaba ${b}, obtuvo ${a}`);
}

// ----------------------------------------------------------------------------

test("el checklist tiene 9 ítems en 3 grupos", () => {
  eq(CHECKLIST_REVISION.length, 3);
  eq(itemsRevision().length, 9);
  eq(CHECKLIST_REVISION[0].titulo, "Trabajo");
  eq(CHECKLIST_REVISION[1].titulo, "Atención");
  eq(CHECKLIST_REVISION[2].titulo, "Vida personal");
});

test("cada ítem apunta a un campo distinto", () => {
  const campos = itemsRevision().map((i) => i.campo);
  eq(new Set(campos).size, campos.length);
  for (const c of campos) {
    if (!c.startsWith("rev_")) throw new Error(`campo inesperado: ${c}`);
  }
});

test("el grupo de trabajo tiene 3 ítems y el de vida personal 4", () => {
  eq(CHECKLIST_REVISION[0].items.length, 3);
  eq(CHECKLIST_REVISION[1].items.length, 2);
  eq(CHECKLIST_REVISION[2].items.length, 4);
});

test("sin responder: 0 respondidos y 9 pendientes", () => {
  const r = resumenRevision({});
  eq(r.respondidos, 0);
  eq(r.cumplidos, 0);
  eq(r.total, 9);
  eq(r.pendientes.length, 9);
  eq(r.porcentaje, 0);
});

test("null no es false: sin responder no cuenta como incumplido", () => {
  const r = resumenRevision({ rev_trabajo_avance: null });
  eq(r.respondidos, 0);
  eq(r.pendientes.length, 9);
});

test("false cuenta como respondido pero no cumplido", () => {
  const r = resumenRevision({ rev_trabajo_avance: false });
  eq(r.respondidos, 1);
  eq(r.cumplidos, 0);
  eq(r.pendientes.length, 8);
  eq(r.porcentaje, 0);
});

test("true cuenta como cumplido", () => {
  const r = resumenRevision({ rev_trabajo_avance: true, rev_vida_lectura: true });
  eq(r.respondidos, 2);
  eq(r.cumplidos, 2);
  eq(r.porcentaje, 100);
});

test("el porcentaje se calcula sobre los respondidos", () => {
  const r = resumenRevision({
    rev_trabajo_avance: true,
    rev_trabajo_sin_nuevos: true,
    rev_trabajo_cierre_razonable: false,
  });
  eq(r.respondidos, 3);
  eq(r.cumplidos, 2);
  eq(r.porcentaje, 67);
});

test("valorRevision devuelve null si el campo no es booleano", () => {
  eq(valorRevision({}, "rev_vida_lectura"), null);
  eq(valorRevision({ rev_vida_lectura: "sí" }, "rev_vida_lectura"), null);
  eq(valorRevision({ rev_vida_lectura: true }, "rev_vida_lectura"), true);
});

test("la migration 0044 declara las 10 columnas", () => {
  const sql = readFileSync(
    path.join(RAIZ, "supabase", "migrations", "0044_estatus_revision_diaria.sql"),
    "utf8",
  );
  for (const campo of itemsRevision().map((i) => i.campo)) {
    if (!sql.includes(campo)) throw new Error(`falta la columna ${campo}`);
  }
  if (!sql.includes(CAMPO_MEJORA_MANANA)) {
    throw new Error(`falta la columna ${CAMPO_MEJORA_MANANA}`);
  }
  if (!/add column if not exists/i.test(sql)) {
    throw new Error("la migration debe ser idempotente (add column if not exists)");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ La revisión diaria del Estatus tiene los 9 campos (issue #85)");
