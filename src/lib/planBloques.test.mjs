// ============================================================================
// Test de la lógica de bloques del plan diario (issue #73).
// Ejecuta con: `node src/lib/planBloques.test.mjs`
// Sin framework (patrón del repo) y sin base de datos.
//
// CONTEXTO (issue #73):
//   El plan diario era de solo lectura: la IA proponía N bloques con una
//   tarea cada uno y no se podía añadir nada, activar un bloque desactivado
//   ni cambiar la tarea propuesta. Este módulo es la parte pura de ese
//   arreglo (agrupación por bloque, bloques activos y selector de
//   candidatas), así que aquí se fija su comportamiento sin Supabase.
// ============================================================================

import {
  agruparPorBloque,
  candidatasParaElPlan,
  claveFila,
  esFilaDelPlan,
  esTareaActiva,
  existeTituloEnCandidatas,
  normalizarTitulo,
  numBloquesActivos,
  ordenarCandidatas,
} from "./planBloques.ts";

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

// ----------------------------------------------------------------------------
// 1) Agrupación por bloque
// ----------------------------------------------------------------------------

console.log("\n=== Agrupar filas por bloque ===");

test("devuelve siempre los 4 bloques, aunque estén vacíos", () => {
  const g = agruparPorBloque([]);
  eq(g.map((x) => x.bloque), [1, 2, 3, 4]);
  eq(g.map((x) => x.tareas.length), [0, 0, 0, 0]);
});

test("un bloque puede llevar varias tareas (ya no es 1:1)", () => {
  const filas = [
    { id: "a", bloque_num: 1, titulo_libre: "Tarea A" },
    { id: "b", bloque_num: 1, titulo_libre: "Tarea B" },
    { id: "c", bloque_num: 3, titulo_libre: "Tarea C" },
  ];
  const g = agruparPorBloque(filas);
  eq(g[0].tareas.map((t) => t.titulo_libre), ["Tarea A", "Tarea B"]);
  eq(g[1].tareas.length, 0);
  eq(g[2].tareas.map((t) => t.titulo_libre), ["Tarea C"]);
  eq(g[3].tareas.length, 0);
});

test("las filas sin bloque no se cuelan en ningún bloque", () => {
  const g = agruparPorBloque([
    { id: "x", bloque_num: null, titulo_libre: "Sin bloque" },
  ]);
  eq(g.map((b) => b.tareas.length), [0, 0, 0, 0]);
});

// ----------------------------------------------------------------------------
// 2) Bloques activos
// ----------------------------------------------------------------------------

console.log("\n=== Bloques activos ===");

test("sin filas no hay bloques activos", () => {
  eq(numBloquesActivos([]), 0);
});

test("dos tareas en el mismo bloque = UN bloque activo", () => {
  const filas = [
    { id: "a", bloque_num: 1, titulo_libre: "A" },
    { id: "b", bloque_num: 1, titulo_libre: "B" },
  ];
  eq(numBloquesActivos(filas), 1);
});

test("bloques distintos = varios bloques activos", () => {
  const filas = [
    { id: "a", bloque_num: 1, titulo_libre: "A" },
    { id: "b", bloque_num: 3, titulo_libre: "B" },
  ];
  eq(numBloquesActivos(filas), 2);
});

test("las filas sin bloque no cuentan como bloque activo", () => {
  const filas = [{ id: "a", bloque_num: null, titulo_libre: "A" }];
  eq(numBloquesActivos(filas), 0);
});

test("nunca más de 4 bloques activos (el modelo tiene 4 huecos)", () => {
  const filas = [1, 2, 3, 4].map((n) => ({
    id: String(n),
    bloque_num: n,
    titulo_libre: "T",
  }));
  eq(numBloquesActivos(filas), 4);
});

// ----------------------------------------------------------------------------
// 3) Identidad de las filas
// ----------------------------------------------------------------------------

console.log("\n=== Identidad de fila ===");

test("claveFila prefiere plan_tarea_id y cae en id", () => {
  eq(claveFila({ plan_tarea_id: "p1", id: "i1", bloque_num: 1, titulo_libre: "x" }), "p1");
  eq(claveFila({ id: "i1", bloque_num: 1, titulo_libre: "x" }), "i1");
  eq(claveFila({ bloque_num: 1, titulo_libre: "x" }), null);
});

test("esFilaDelPlan = tiene id", () => {
  eq(esFilaDelPlan({ id: "a", bloque_num: 1, titulo_libre: "x" }), true);
  eq(esFilaDelPlan({ bloque_num: 1, titulo_libre: "x" }), false);
});

// ----------------------------------------------------------------------------
// 4) Candidatas: qué tareas de la BD se pueden meter en el plan
// ----------------------------------------------------------------------------

console.log("\n=== Candidatas para el plan ===");

const TAREAS = [
  { id: "1", titulo: "Llamar a María", estado: "pendiente", es_wig: false, fecha_fin: null },
  { id: "2", titulo: "Cerrar la caixa", estado: "pendiente", es_wig: true, fecha_fin: null },
  { id: "3", titulo: "Renovar el alquiler", estado: "pendiente", es_wig: false, fecha_fin: "2026-11-20" },
  { id: "4", titulo: "Tarea hecha", estado: "hecha", es_wig: false, fecha_fin: null },
  { id: "5", titulo: "Tarea archivada", estado: "archivada", es_wig: false, fecha_fin: null },
  { id: "6", titulo: "Otra pendiente", estado: "en_progreso", es_wig: false, fecha_fin: null },
];

test("solo ofrece tareas activas (no hechas ni archivadas)", () => {
  const c = candidatasParaElPlan(TAREAS);
  const ids = c.map((t) => t.id);
  eq(ids.includes("4"), false, "la hecha no debe salir");
  eq(ids.includes("5"), false, "la archivada no debe salir");
  eq(ids.includes("6"), true, "la en_progreso sí es activa");
});

test("excluye las tareas que ya están en el plan", () => {
  const c = candidatasParaElPlan(TAREAS, { yaEnElPlan: ["2"] });
  eq(c.map((t) => t.id).includes("2"), false);
});

test("filtra por texto (sin distinguir mayúsculas)", () => {
  const c = candidatasParaElPlan(TAREAS, { query: "MARÍA" });
  eq(c.map((t) => t.id), ["1"]);
});

test("respeta el límite de candidatas", () => {
  const c = candidatasParaElPlan(TAREAS, { limite: 2 });
  eq(c.length, 2);
});

test("ordena: primero los WIGs, luego lo que tiene fecha, luego el resto", () => {
  const c = candidatasParaElPlan(TAREAS);
  eq(c.map((t) => t.id), ["2", "3", "1", "6"]);
});

test("ordenarCandidatas no muta el array original", () => {
  const original = TAREAS.slice();
  ordenarCandidatas(original);
  eq(original.map((t) => t.id), TAREAS.map((t) => t.id));
});

test("esTareaActiva: null/'' cuenta como activa (no se filtra por estado)", () => {
  eq(esTareaActiva(null), true);
  eq(esTareaActiva(undefined), true);
  eq(esTareaActiva(""), true);
  eq(esTareaActiva("pendiente"), true);
  eq(esTareaActiva("bloqueada"), true);
  eq(esTareaActiva("hecha"), false);
  eq(esTareaActiva("descartada"), false);
  eq(esTareaActiva("archivada"), false);
});

// ----------------------------------------------------------------------------
// 5) Títulos duplicados
// ----------------------------------------------------------------------------

console.log("\n=== Títulos duplicados ===");

test("normalizarTitulo quita mayúsculas y espacios de sobra", () => {
  eq(normalizarTitulo("  Llamar   a María "), "llamar a maría");
});

test("existeTituloEnCandidatas compara normalizado", () => {
  eq(existeTituloEnCandidatas(TAREAS, "llamar a maría"), true);
  eq(existeTituloEnCandidatas(TAREAS, "  LLAMAR   A MARÍA "), true);
  eq(existeTituloEnCandidatas(TAREAS, "otra cosa"), false);
  eq(existeTituloEnCandidatas(TAREAS, "   "), false);
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ La lógica de bloques del plan diario se comporta como debe");
