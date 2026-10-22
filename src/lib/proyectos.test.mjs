// ============================================================================
// Tests de la regla de pertenencia de una tarea a un proyecto.
// ============================================================================
// Ejecuta con: `node src/lib/proyectos.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  proyectoEfectivoDeTarea,
  tareasDeProyecto,
  tareasPorProyectoEfectivo,
} from "./proyectos.ts";

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

// Metas: m1 → proyecto A, m2 → proyecto B, m3 → sin proyecto.
const metaPorId = new Map([
  ["m1", { id: "m1", proyecto_id: "projA" }],
  ["m2", { id: "m2", proyecto_id: "projB" }],
  ["m3", { id: "m3", proyecto_id: null }],
]);

console.log("\nproyectoEfectivoDeTarea");

test("tarea con meta de proyecto → el proyecto de la meta", () => {
  eq(proyectoEfectivoDeTarea({ meta_id: "m1", proyecto_id: null }, metaPorId), "projA");
});

test("tarea con meta Y proyecto_id directo → manda la meta", () => {
  eq(
    proyectoEfectivoDeTarea({ meta_id: "m1", proyecto_id: "otro" }, metaPorId),
    "projA",
  );
});

test("tarea sin meta → su proyecto_id directo", () => {
  eq(proyectoEfectivoDeTarea({ meta_id: null, proyecto_id: "projC" }, metaPorId), "projC");
});

test("tarea con meta huérfana (sin proyecto) → cae al proyecto_id directo", () => {
  eq(
    proyectoEfectivoDeTarea({ meta_id: "m3", proyecto_id: "projC" }, metaPorId),
    "projC",
  );
});

test("tarea sin meta ni proyecto → null", () => {
  eq(proyectoEfectivoDeTarea({ meta_id: null, proyecto_id: null }, metaPorId), null);
});

test("tarea con meta_id que no está en el mapa → usa el proyecto_id directo", () => {
  eq(
    proyectoEfectivoDeTarea({ meta_id: "no-existe", proyecto_id: "projC" }, metaPorId),
    "projC",
  );
});

console.log("\ntareasDeProyecto");

const tareas = [
  { id: "t1", meta_id: "m1", proyecto_id: null }, // dentro de un KR de m1
  { id: "t2", meta_id: "m1", proyecto_id: null }, // dentro de un KR de m1
  { id: "t3", meta_id: "m2", proyecto_id: null }, // dentro de un KR de m2
  { id: "t4", meta_id: null, proyecto_id: "projA" }, // directa de projA
  { id: "t5", meta_id: null, proyecto_id: null }, // suelta
];

test("cuenta las tareas de los KRs de las metas del proyecto", () => {
  const a = tareasDeProyecto(tareas, "projA", metaPorId);
  eq(a.map((t) => t.id), ["t1", "t2", "t4"]);
});

test("otro proyecto solo ve las suyas", () => {
  const b = tareasDeProyecto(tareas, "projB", metaPorId);
  eq(b.map((t) => t.id), ["t3"]);
});

test("proyecto sin tareas → lista vacía", () => {
  eq(tareasDeProyecto(tareas, "projX", metaPorId), []);
});

console.log("\ntareasPorProyectoEfectivo");

test("agrupa por proyecto efectivo", () => {
  const map = tareasPorProyectoEfectivo(tareas, metaPorId);
  eq(map.get("projA").map((t) => t.id), ["t1", "t2", "t4"]);
  eq(map.get("projB").map((t) => t.id), ["t3"]);
  eq(map.has("sin-proyecto"), false);
});

test("tareas sueltas sin proyecto no entran en ningún grupo", () => {
  const map = tareasPorProyectoEfectivo(tareas, metaPorId);
  const total = Array.from(map.values()).flat().length;
  eq(total, 4); // t5 se queda fuera
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
