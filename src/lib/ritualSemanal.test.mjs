// ============================================================================
// Tests de las reglas del ritual semanal (issue #87).
// ============================================================================
// Ejecuta con: `node src/lib/ritualSemanal.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  CLAVE_FASES_META,
  FASES_META_POR_DEFECTO,
  etiquetaSemana,
  fasesDisponibles,
  normalizarBitacora,
  normalizarFases,
} from "./ritualSemanal.ts";

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
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg ?? "desigual"}: ${sa} !== ${sb}`);
}

console.log("\nnormalizarFases");

test("recorta y quita repetidos aunque cambien tildes o mayúsculas", () => {
  eq(normalizarFases(["  Construcción ", "construccion", "", "Lanzamiento"]), [
    "Construcción",
    "Lanzamiento",
  ]);
});

test("lo que no es una lista devuelve vacío", () => {
  eq(normalizarFases(null), []);
  eq(normalizarFases("construccion"), []);
});

console.log("\nfasesDisponibles");

test("usa las configuradas y mantiene el resto del catálogo por defecto", () => {
  eq(fasesDisponibles(["personal"]), ["personal", ...FASES_META_POR_DEFECTO]);
});

test("una fase ya usada sobrevive aunque se borre de la lista", () => {
  const fases = fasesDisponibles(["personal"], ["Fase vieja"]);
  eq(fases.includes("Fase vieja"), true);
});

console.log("\nnormalizarBitacora");

test("limpia ids, quita repetidos y tops los caps de 3", () => {
  const b = normalizarBitacora({
    anio: 2026,
    semana_iso: 46,
    metas_vivas: ["m1", "m1", "", "m2"],
    wigs_meta: ["a", "b", "c", "d"],
    krs_foco: ["k1", "k2", "k3", "k4"],
    metas_pausadas: [],
    tareas_activas: 9,
  });
  eq(b.metas_vivas, ["m1", "m2"]);
  eq(b.wigs_meta.length, 3);
  eq(b.krs_foco.length, 3);
  eq(b.notas, null);
});

console.log("\netiquetaSemana");

test("etiqueta legible de la semana", () => {
  eq(etiquetaSemana(2026, 46), "2026 · semana 46");
});

console.log("\nconstantes");

test("la clave de la lista configurable es la esperada", () => {
  eq(CLAVE_FASES_META, "fases_meta");
});

// ── resumen ────────────────────────────────────────────────────────────────
console.log(`\n${pass} ok, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
