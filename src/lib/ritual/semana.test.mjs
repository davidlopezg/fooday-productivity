// ============================================================================
// Test del INVENTARIO DE LA SEMANA del ritual semanal (issue #96).
//
// QUÉ COMPRUEBA
//   1. Las candidatas de la semana: solo las de los KRs en foco, las WIG de
//      tarea y las críticas/urgentes (nada de volcar 230 tareas).
//   2. La fusión del reparto guardado con el del borrador (el borrador manda).
//   3. El diff: qué asignar y qué quitar al guardar el paso.
//   4. Las tareas de la semana agrupadas por día.
//   5. El objetivo de 10 es ORIENTATIVO (avisa, no bloquea).
//   6. La migration 0046 deja el cupo como orientativo (fuera el trigger).
//
// ============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  candidatasSemana,
  diffPlan,
  esActiva,
  estadoSemana,
  filtrarPorTexto,
  fusionarPlan,
  motivoCandidata,
  OBJETIVO_TAREAS_SEMANA,
  tareasDeLaSemana,
  tareasPorDia,
} from "@/lib/ritual/semana";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

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

function deep(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg ?? ""} esperaba ${JSON.stringify(b)}, obtuvo ${JSON.stringify(a)}`);
  }
}

// ----------------------------------------------------------------------------
// Candidatas
// ----------------------------------------------------------------------------

const KRS = [{ id: "kr1", titulo: "Facturar" }];

const TAREAS = [
  // De un KR en foco.
  { id: "t1", titulo: "Preparar facturas", estado: "pendiente", es_wig: false, prioridad: "media", resultado_periodo_id: "kr1" },
  // WIG de tarea.
  { id: "t2", titulo: "Reescribir la propuesta", estado: "pendiente", es_wig: true, prioridad: "media", resultado_periodo_id: null },
  // Crítica.
  { id: "t3", titulo: "Pagar el alquiler", estado: "pendiente", es_wig: false, prioridad: "critica", resultado_periodo_id: null },
  // No es candidata de ninguna categoría.
  { id: "t4", titulo: "Comprar tinta", estado: "pendiente", es_wig: false, prioridad: "baja", resultado_periodo_id: null },
  // Está hecha: no es candidata.
  { id: "t5", titulo: "Tarea hecha", estado: "hecha", es_wig: true, prioridad: "critica", resultado_periodo_id: "kr1" },
];

test("las candidatas son solo las del foco, las WIG y las urgentes", () => {
  const c = candidatasSemana(TAREAS, KRS);
  deep(c.map((t) => t.id), ["t1", "t2", "t3"]);
});

test("una tarea no aparece dos veces aunque sea foco y WIG", () => {
  const c = candidatasSemana(
    [{ id: "t1", titulo: "X", estado: "pendiente", es_wig: true, prioridad: "critica", resultado_periodo_id: "kr1" }],
    KRS,
  );
  eq(c.length, 1);
});

test("sin KRs en foco solo entran las WIG y las urgentes", () => {
  const c = candidatasSemana(TAREAS, []);
  deep(c.map((t) => t.id), ["t2", "t3"]);
});

test("el motivo explica por qué es candidata", () => {
  eq(motivoCandidata(TAREAS[0], KRS), "foco");
  eq(motivoCandidata(TAREAS[1], KRS), "wig");
  eq(motivoCandidata(TAREAS[2], KRS), "urgente");
});

test("el buscador filtra por texto, sin acentos ni mayúsculas", () => {
  eq(filtrarPorTexto(TAREAS, "FACTURAS").length, 1);
  eq(filtrarPorTexto(TAREAS, "preparar").length, 1);
  eq(filtrarPorTexto(TAREAS, "").length, TAREAS.length);
  eq(filtrarPorTexto(TAREAS, "nada de esto").length, 0);
});

test("solo las activas cuentan como activas", () => {
  eq(esActiva({ estado: "pendiente" }), true);
  eq(esActiva({ estado: "en_progreso" }), true);
  eq(esActiva({ estado: "bloqueada" }), true);
  eq(esActiva({ estado: "en_espera" }), false);
  eq(esActiva({ estado: "hecha" }), false);
});

// ----------------------------------------------------------------------------
// Fusión y diff del reparto por días
// ----------------------------------------------------------------------------

test("el borrador manda sobre el reparto guardado", () => {
  const fusionado = fusionarPlan({ a: 1, b: 3 }, { a: 5 });
  deep(fusionado, { a: 5, b: 3 });
});

test("null en el borrador saca la tarea de la semana", () => {
  const fusionado = fusionarPlan({ a: 1, b: 3 }, { a: null });
  deep(fusionado, { b: 3 });
});

test("el diff dice qué asignar y qué quitar", () => {
  const d = diffPlan({ a: 1, b: 3 }, { a: 2, b: null, c: 4 });
  deep(d.asignar, [
    { tarea_id: "a", dia_semana: 2 },
    { tarea_id: "c", dia_semana: 4 },
  ]);
  deep(d.quitar, ["b"]);
});

test("sin cambios en el borrador no hay nada que escribir", () => {
  const d = diffPlan({ a: 1 }, {});
  deep(d.asignar, []);
  deep(d.quitar, []);
});

// ----------------------------------------------------------------------------
// Las tareas de la semana
// ----------------------------------------------------------------------------

test("las tareas de la semana son las que tienen día", () => {
  const s = tareasDeLaSemana(TAREAS, { t1: 1, t3: 4 });
  deep(s.map((t) => t.id), ["t1", "t3"]);
});

test("las tareas se agrupan por día", () => {
  const porDia = tareasPorDia(TAREAS, { t1: 1, t3: 4, t2: 1 });
  eq(porDia.get(1).length, 2);
  eq(porDia.get(4).length, 1);
  eq(porDia.get(2).length, 0);
});

// ----------------------------------------------------------------------------
// El objetivo de 10 (orientativo)
// ----------------------------------------------------------------------------

test("el objetivo de la semana avisa pero no bloquea", () => {
  const muchas = Array.from({ length: 14 }, (_, i) => ({
    id: `x${i}`,
    titulo: `T${i}`,
    estado: "pendiente",
    es_wig: false,
    prioridad: "media",
    resultado_periodo_id: null,
  }));
  const e = estadoSemana(muchas);
  eq(e.activas, 14);
  eq(e.total, 14);
  if (!e.mensaje.includes(`${OBJETIVO_TAREAS_SEMANA}`)) {
    throw new Error(`mensaje inesperado: ${e.mensaje}`);
  }
  if (!e.mensaje.includes("por encima")) {
    throw new Error(`mensaje inesperado: ${e.mensaje}`);
  }
});

test("por debajo del objetivo el mensaje dice cuánto queda", () => {
  const e = estadoSemana([TAREAS[0]]);
  eq(e.activas, 1);
  if (!e.mensaje.includes("te quedan")) {
    throw new Error(`mensaje inesperado: ${e.mensaje}`);
  }
});

// ----------------------------------------------------------------------------
// La migration
// ----------------------------------------------------------------------------

test("la migration 0046 quita el trigger del cupo global", () => {
  const sql = readFileSync(
    path.join(RAIZ, "supabase", "migrations", "0046_cupo_tareas_orientativo.sql"),
    "utf8",
  );
  if (!/drop trigger if exists trg_tareas_cupo_activas/i.test(sql)) {
    throw new Error("falta el drop del trigger del cupo");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ Inventario de la semana del ritual (issue #96)");
