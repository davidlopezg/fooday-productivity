// ============================================================================
// Test del FILTRO de metas del paso 2 del ritual semanal.
//
// QUÉ COMPRUEBA
//   1. Un proyecto "vivo" → sus metas se revisan.
//   2. Un proyecto "en pausa" → sus metas SE REVISAN (pausa ≠ muerte) y se
//      marcan como tales.
//   3. Un proyecto "muerto" (en la BD o marcado en el borrador del ritual)
//      → sus metas NO aparecen, y se avisa de cada una con el motivo.
//   4. Un proyecto que ya no está (archivado/borrado) → sus metas tampoco
//      aparecen, pero el aviso dice la verdad: no "proyecto muerto".
//   5. Una meta suelta (sin proyecto) siempre se revisa.
//   6. Una meta archivada (muere) no se revisa ni se avisa.
//
// ============================================================================

import {
  clasificarMetasRitual,
  estadoProyectoEnRitual,
  textoMotivo,
} from "@/lib/ritual/metasVisibles";

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

const PROYECTOS = [
  { id: "p1", nombre: "Web", estado: "vivo" },
  { id: "p2", nombre: "Tienda", estado: "pausado" },
  { id: "p3", nombre: "Podcast", estado: "muerto" },
];

const METAS = [
  { id: "m1", titulo: "Vender 100", proyecto_id: "p1", estado: "en_progreso" },
  { id: "m2", titulo: "Tienda online", proyecto_id: "p2", estado: "en_progreso" },
  { id: "m3", titulo: "10 episodios", proyecto_id: "p3", estado: "en_progreso" },
  { id: "m4", titulo: "Suelta", proyecto_id: null, estado: "en_progreso" },
  { id: "m5", titulo: "Cerrada", proyecto_id: "p1", estado: "archivada" },
];

test("el estado del proyecto sale del borrador si has decidido en el ritual", () => {
  eq(estadoProyectoEnRitual(PROYECTOS[0], { proyectos: { p1: { estado: "muerto" } } }), "muerto");
  eq(estadoProyectoEnRitual(PROYECTOS[0], { proyectos: { p1: { estado: "pausado" } } }), "pausado");
  eq(estadoProyectoEnRitual(PROYECTOS[0], null), "vivo");
});

test("solo las metas de proyectos muertos o desaparecidos se dejan fuera", () => {
  const { visibles, excluidas } = clasificarMetasRitual(METAS, PROYECTOS, null);
  eq(visibles.map((m) => m.id).join(","), "m1,m2,m4");
  eq(excluidas.length, 1);
  eq(excluidas[0].meta.id, "m3");
  eq(excluidas[0].proyecto, "Podcast");
  eq(excluidas[0].motivo, "proyecto_muerto");
});

test("una meta en pausa se revisa: pausa no es muerte", () => {
  const { visibles, excluidas } = clasificarMetasRitual(METAS, PROYECTOS, null);
  if (!visibles.some((m) => m.id === "m2")) throw new Error("m2 debería revisarse");
  if (excluidas.some((x) => x.meta.id === "m2")) throw new Error("m2 no debería excluirse");
});

test("marcar un proyecto como muerto en el ritual oculta sus metas", () => {
  const { visibles, excluidas } = clasificarMetasRitual(METAS, PROYECTOS, {
    proyectos: { p1: { estado: "muerto" } },
  });
  if (visibles.some((m) => m.id === "m1")) throw new Error("m1 no debería revisarse");
  eq(excluidas.length, 2);
  eq(excluidas.find((x) => x.meta.id === "m1").motivo, "proyecto_muerto");
});

test("el proyecto que ya no está se avisa como no disponible, no como muerto", () => {
  const metas = [{ id: "m9", titulo: "Meta huérfana", proyecto_id: "pX", estado: "en_progreso" }];
  const { visibles, excluidas } = clasificarMetasRitual(metas, PROYECTOS, null);
  eq(visibles.length, 0);
  eq(excluidas[0].motivo, "proyecto_no_disponible");
  eq(excluidas[0].proyecto, null);
  if (!textoMotivo("proyecto_no_disponible").includes("no está disponible"))
    throw new Error("el texto del motivo debe decirlo");
});

test("una meta archivada no se revisa ni se avisa", () => {
  const { visibles, excluidas } = clasificarMetasRitual(METAS, PROYECTOS, null);
  if (visibles.some((m) => m.id === "m5")) throw new Error("m5 no debería revisarse");
  if (excluidas.some((x) => x.meta.id === "m5")) throw new Error("m5 no debería avisarse");
});

test("marcar la meta como archivada en el ritual la saca de la revisión", () => {
  const { visibles } = clasificarMetasRitual(METAS, PROYECTOS, {
    metas: { m1: { estado: "archivada" } },
  });
  if (visibles.some((m) => m.id === "m1")) throw new Error("m1 no debería revisarse");
});

// ----------------------------------------------------------------------------

if (fail > 0) {
  console.error("\n✗ metasVisibles: fallos\n");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log(`✓ metasVisibles: ${pass} tests`);
