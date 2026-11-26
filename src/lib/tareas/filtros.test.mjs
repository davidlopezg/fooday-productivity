// ============================================================================
// Tests del filtro de la tabla de /tareas (issue #98).
// ============================================================================
// Ejecuta con: `node src/lib/tareas/filtros.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  contarOcultas,
  esTareaVisible,
  filtrarTareas,
  filtrosPorDefecto,
} from "./filtros.ts";

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

const KR_A = "kr-a";
const KR_B = "kr-b";

function tarea(over = {}) {
  return {
    id: "t-" + Math.random().toString(36).slice(2),
    titulo: "Tarea",
    codigo: null,
    descripcion: null,
    prioridad: "media",
    capa: "CAPA 1",
    deadline: null,
    ambito: null,
    tags: [],
    estado: "pendiente",
    meta_id: null,
    proyecto_id: null,
    resultado_periodo_id: null,
    ...over,
  };
}

const metaById = new Map([
  ["meta-1", { id: "meta-1", proyecto_id: "proj-1" }],
  ["meta-2", { id: "meta-2", proyecto_id: null }],
]);

console.log("\nesTareaVisible · estado");
test("«activas» deja fuera las hechas", () => {
  const f = filtrosPorDefecto();
  eq(esTareaVisible(tarea({ estado: "pendiente" }), f, metaById), true);
  eq(esTareaVisible(tarea({ estado: "en_progreso" }), f, metaById), true);
  eq(esTareaVisible(tarea({ estado: "bloqueada" }), f, metaById), true);
  eq(esTareaVisible(tarea({ estado: "hecha" }), f, metaById), false);
  eq(esTareaVisible(tarea({ estado: "en_espera" }), f, metaById), false);
  eq(esTareaVisible(tarea({ estado: "archivada" }), f, metaById), false);
});

test("«todas» deja pasar cualquier estado", () => {
  const f = { ...filtrosPorDefecto(), estado: "todas" };
  eq(esTareaVisible(tarea({ estado: "hecha" }), f, metaById), true);
  eq(esTareaVisible(tarea({ estado: "cancelada" }), f, metaById), true);
});

console.log("\nesTareaVisible · KR");
test("con krId solo pasan las tareas de ese KR", () => {
  const f = { ...filtrosPorDefecto(), krId: KR_A };
  eq(esTareaVisible(tarea({ resultado_periodo_id: KR_A }), f, metaById), true);
  eq(esTareaVisible(tarea({ resultado_periodo_id: KR_B }), f, metaById), false);
  eq(esTareaVisible(tarea({ resultado_periodo_id: null }), f, metaById), false);
});

console.log("\nesTareaVisible · proyecto (directo o derivado de la meta)");
test("una tarea dentro de un KR hereda el proyecto de su meta", () => {
  const f = { ...filtrosPorDefecto(), proyectoId: "proj-1" };
  eq(
    esTareaVisible(
      tarea({ meta_id: "meta-1", resultado_periodo_id: KR_A }),
      f,
      metaById,
    ),
    true,
  );
  eq(
    esTareaVisible(tarea({ meta_id: "meta-2" }), f, metaById),
    false,
  );
});

console.log("\nesTareaVisible · texto, tags, prioridad, capa, ámbito");
test("la búsqueda mira título, código y descripción", () => {
  const f = { ...filtrosPorDefecto(), q: "factura" };
  eq(esTareaVisible(tarea({ titulo: "Pagar factura" }), f, metaById), true);
  eq(esTareaVisible(tarea({ titulo: "Otra", codigo: "F-01" }), f, metaById), false);
  eq(
    esTareaVisible(tarea({ titulo: "Otra", descripcion: "la FACTURA pendiente" }), f, metaById),
    true,
  );
});

test("las tags seleccionadas son OR (con al menos una, la tarea sale)", () => {
  const f = { ...filtrosPorDefecto(), tags: ["casa", "urgent"] };
  eq(esTareaVisible(tarea({ tags: ["casa"] }), f, metaById), true);
  eq(esTareaVisible(tarea({ tags: ["casa", "urgent"] }), f, metaById), true);
  eq(esTareaVisible(tarea({ tags: ["casa", "otro"] }), f, metaById), true);
  eq(esTareaVisible(tarea({ tags: ["otro"] }), f, metaById), false);
  eq(esTareaVisible(tarea({ tags: [] }), f, metaById), false);
});

test("prioridad, capa y ámbito se filtran por igualdad", () => {
  eq(
    esTareaVisible(tarea({ prioridad: "critica" }), { ...filtrosPorDefecto(), prioridad: "critica" }, metaById),
    true,
  );
  eq(
    esTareaVisible(tarea({ capa: "CAPA 2" }), { ...filtrosPorDefecto(), capa: "CAPA 1" }, metaById),
    false,
  );
  eq(
    esTareaVisible(tarea({ ambito: "personal" }), { ...filtrosPorDefecto(), ambito: "personal" }, metaById),
    true,
  );
});

console.log("\nfiltrarTareas");
test("devuelve solo las que pasan los filtros", () => {
  const tareas = [
    tarea({ id: "1", resultado_periodo_id: KR_A }),
    tarea({ id: "2", resultado_periodo_id: KR_A, estado: "hecha" }),
    tarea({ id: "3", resultado_periodo_id: KR_B }),
  ];
  eq(
    filtrarTareas(tareas, { ...filtrosPorDefecto(), krId: KR_A, estado: "todas" }, metaById).map(
      (t) => t.id,
    ),
    ["1", "2"],
  );
  eq(
    filtrarTareas(tareas, { ...filtrosPorDefecto(), krId: KR_A }, metaById).map(
      (t) => t.id,
    ),
    ["1"],
  );
});

console.log("\ncontarOcultas");
test("cuenta lo que esconde el filtro y cuántas están en un KR", () => {
  const tareas = [
    tarea({ id: "1", resultado_periodo_id: KR_A }),
    tarea({ id: "2", resultado_periodo_id: KR_A, estado: "hecha" }),
    tarea({ id: "3", resultado_periodo_id: KR_B, estado: "hecha" }),
    tarea({ id: "4", estado: "hecha" }),
  ];
  // Filtro por defecto (activas): fuera 3 tareas, 2 de ellas en KRs.
  eq(contarOcultas(tareas, filtrosPorDefecto(), metaById), {
    total: 3,
    enKRs: 2,
  });
  // Filtrando por un KR, lo que se esconde es lo que NO es de ese KR.
  eq(
    contarOcultas(tareas, { ...filtrosPorDefecto(), krId: KR_A }, metaById),
    { total: 3, enKRs: 2 },
  );
  // Con «todas» no se esconde nada.
  eq(
    contarOcultas(tareas, { ...filtrosPorDefecto(), estado: "todas" }, metaById),
    { total: 0, enKRs: 0 },
  );
});

console.log(
  `\n${pass} ok · ${fail} fallidos` + (fail ? `\n${failures.map((f) => `  - ${f.nombre}: ${f.error}`).join("\n")}` : ""),
);
process.exit(fail > 0 ? 1 : 0);
