// ============================================================================
// Tests de las fechas de una tarea (src/lib/fechas.ts).
// ============================================================================
// Ejecuta con: `node src/lib/fechas.test.mjs`
// Sin framework (patrón del repo) y sin API.
//
// QUÉ SE COMPRUEBA
//   1. `fechaISOReal` solo acepta fechas que existen (y no "esta semana").
//   2. `diasHastaFecha` devuelve null ante una fecha inválida (nunca NaN).
//   3. `fechasDeTarea` separa la fecha real de la nota de `deadline`.
// ============================================================================

import { diasHastaFecha, fechaISOReal, fechasDeTarea } from "./fechas.ts";

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

console.log("\nfechaISOReal");

test("acepta YYYY-MM-DD", () => {
  eq(fechaISOReal("2026-03-15"), "2026-03-15");
});

test("acepta una fecha con hora y la normaliza", () => {
  eq(fechaISOReal("2026-03-15T10:30:00.000Z"), "2026-03-15");
});

test("normaliza mes y día de un dígito", () => {
  eq(fechaISOReal("2026-3-5"), "2026-03-05");
});

test("rechaza texto libre (el caso de 'deadline')", () => {
  eq(fechaISOReal("esta semana"), null);
  eq(fechaISOReal("mañana"), null);
  eq(fechaISOReal("fin de mes"), null);
});

test("rechaza una fecha que no existe", () => {
  eq(fechaISOReal("2026-02-31"), null);
  eq(fechaISOReal("2026-13-01"), null);
});

test("rechaza null / vacío", () => {
  eq(fechaISOReal(null), null);
  eq(fechaISOReal(""), null);
});

console.log("\ndiasHastaFecha");

test("una fecha de hoy da 0", () => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, "0");
  const d = String(hoy.getDate()).padStart(2, "0");
  eq(diasHastaFecha(`${y}-${m}-${d}`), 0);
});

test("una fecha de ayer da -1", () => {
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  const iso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, "0")}-${String(ayer.getDate()).padStart(2, "0")}`;
  eq(diasHastaFecha(iso), -1);
});

test("una fecha dentro de 3 días da 3", () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  eq(diasHastaFecha(iso), 3);
});

test("una fecha inválida da null (NUNCA NaN)", () => {
  eq(diasHastaFecha("esta semana"), null);
  eq(diasHastaFecha("2026-02-31"), null);
  eq(diasHastaFecha(null), null);
});

console.log("\nfechasDeTarea");

test("tarea con fecha_fin → fecha real, sin texto", () => {
  eq(fechasDeTarea({ fecha_fin: "2026-03-15", deadline: null }), {
    fecha: "2026-03-15",
    texto: null,
  });
});

test("tarea con deadline en texto libre → solo texto", () => {
  eq(fechasDeTarea({ fecha_fin: null, deadline: "esta semana" }), {
    fecha: null,
    texto: "esta semana",
  });
});

test("tarea con deadline que SÍ es una fecha → fecha real", () => {
  eq(fechasDeTarea({ fecha_fin: null, deadline: "2026-03-15" }), {
    fecha: "2026-03-15",
    texto: null,
  });
});

test("fecha_fin manda sobre el deadline en texto", () => {
  eq(fechasDeTarea({ fecha_fin: "2026-03-15", deadline: "esta semana" }), {
    fecha: "2026-03-15",
    texto: null,
  });
});

test("tarea sin fechas → null y null", () => {
  eq(fechasDeTarea({ fecha_fin: null, deadline: null }), {
    fecha: null,
    texto: null,
  });
  eq(fechasDeTarea({}), { fecha: null, texto: null });
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
