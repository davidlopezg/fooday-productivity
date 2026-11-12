// ============================================================================
// Tests de las reglas de meta ↔ tareas (issue #35).
// ============================================================================
// Ejecuta con: `node src/lib/metas.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  estadoMetaSegunTareas,
  progresoMeta,
  avanceMedioMetas,
  tareaVivaParaMeta,
  tareasPorMeta,
} from "./metas.ts";

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

const t = (estado) => ({ estado });

console.log("\ntareaVivaParaMeta");

test("las tareas hechas, pendientes y en progreso viven", () => {
  eq(tareaVivaParaMeta("hecha"), true);
  eq(tareaVivaParaMeta("pendiente"), true);
  eq(tareaVivaParaMeta("en_progreso"), true);
  eq(tareaVivaParaMeta("bloqueada"), true);
});

test("las archivadas y descartadas no cuentan", () => {
  eq(tareaVivaParaMeta("archivada"), false);
  eq(tareaVivaParaMeta("descartada"), false);
});

console.log("\nestadoMetaSegunTareas");

test("todas las tareas hechas → la meta se completa sola", () => {
  eq(
    estadoMetaSegunTareas(
      { estado: "en_progreso" },
      [t("hecha"), t("hecha")],
    ),
    "completada",
  );
});

test("una meta sin_empezar con todo hecho → completada", () => {
  eq(estadoMetaSegunTareas({ estado: "sin_empezar" }, [t("hecha")]), "completada");
});

test("si queda una tarea sin hacer → no se completa", () => {
  eq(
    estadoMetaSegunTareas(
      { estado: "en_progreso" },
      [t("hecha"), t("pendiente")],
    ),
    null,
  );
});

test("reabrir una tarea de una meta completada → vuelve a en_progreso", () => {
  eq(
    estadoMetaSegunTareas(
      { estado: "completada" },
      [t("hecha"), t("pendiente")],
    ),
    "en_progreso",
  );
});

test("una meta ya completada y con todo hecho → no se toca", () => {
  eq(
    estadoMetaSegunTareas({ estado: "completada" }, [t("hecha")]),
    null,
  );
});

test("meta sin tareas → no se toca (no hay datos para deducir)", () => {
  eq(estadoMetaSegunTareas({ estado: "sin_empezar" }, []), null);
});

test("meta archivada → no se toca nunca", () => {
  eq(
    estadoMetaSegunTareas({ estado: "archivada" }, [t("hecha")]),
    null,
  );
});

test("tareas archivadas o descartadas no bloquean el cierre", () => {
  eq(
    estadoMetaSegunTareas(
      { estado: "en_progreso" },
      [t("hecha"), t("archivada"), t("descartada")],
    ),
    "completada",
  );
});

test("sin_empezar con alguna tarea hecha → en_progreso", () => {
  eq(
    estadoMetaSegunTareas(
      { estado: "sin_empezar" },
      [t("hecha"), t("pendiente")],
    ),
    "en_progreso",
  );
});

test("sin_empezar sin nada hecho → no se toca", () => {
  eq(
    estadoMetaSegunTareas({ estado: "sin_empezar" }, [t("pendiente")]),
    null,
  );
});

test("meta bloqueada con todo hecho → completada", () => {
  eq(estadoMetaSegunTareas({ estado: "bloqueada" }, [t("hecha")]), "completada");
});

console.log("\nprogresoMeta");

test("meta completada → 1", () => {
  eq(progresoMeta({ estado: "completada" }, [t("hecha")]), 1);
});

test("mitad de las tareas hechas → 0.5", () => {
  eq(progresoMeta({ estado: "en_progreso" }, [t("hecha"), t("pendiente")]), 0.5);
});

test("meta sin tareas vivas → 0", () => {
  eq(progresoMeta({ estado: "en_progreso" }, [t("archivada")]), 0);
});

console.log("\navanceMedioMetas");

test("el avance medio es la media del avance de cada meta", () => {
  const metas = [
    { id: "m1", estado: "en_progreso" },
    { id: "m2", estado: "en_progreso" },
  ];
  const tareas = new Map([
    ["m1", [t("hecha"), t("pendiente")]],
    ["m2", [t("hecha"), t("hecha")]],
  ]);
  eq(avanceMedioMetas(metas, tareas), 0.75);
});

test("sin metas → 0 (no se divide por cero)", () => {
  eq(avanceMedioMetas([], new Map()), 0);
});

console.log("\ntareasPorMeta");

const metaDeKr = new Map([
  ["kr1", "m1"],
  ["kr2", "m2"],
]);

const tareas = [
  { id: "t1", meta_id: "m1", resultado_periodo_id: null },
  { id: "t2", meta_id: null, resultado_periodo_id: "kr1" },
  { id: "t3", meta_id: "m2", resultado_periodo_id: "kr2" },
  { id: "t4", meta_id: null, resultado_periodo_id: null },
];

test("agrupa por meta_id directo", () => {
  const m = tareasPorMeta(tareas, metaDeKr);
  eq(m.get("m2")?.map((x) => x.id), ["t3"]);
});

test("si falta meta_id, se usa la meta del KR", () => {
  const m = tareasPorMeta(tareas, metaDeKr);
  eq(m.get("m1")?.map((x) => x.id), ["t1", "t2"]);
});

test("si tiene las dos, manda meta_id", () => {
  const m = tareasPorMeta(
    [{ id: "t5", meta_id: "m2", resultado_periodo_id: "kr1" }],
    metaDeKr,
  );
  eq(m.get("m2")?.map((x) => x.id), ["t5"]);
  eq(m.has("m1"), false);
});

test("las tareas sueltas no entran en ningún grupo", () => {
  const m = tareasPorMeta(tareas, metaDeKr);
  eq(m.has("m4"), false);
  const total = Array.from(m.values()).flat().length;
  eq(total, 3);
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
