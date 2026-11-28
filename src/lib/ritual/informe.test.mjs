// ============================================================================
// Test del INFORME DE LA SEMANA del ritual semanal (issue #111).
//
// QUÉ COMPRUEBA
//   1. construirInforme: solo entran los proyectos VIVOS, las metas que se
//      estaban trabajando (ni pausadas ni cerradas), las 3 WIGs en orden,
//      los KRs (WIG de ciclo y/o foco de la semana) y los 7 días con sus 3
//      tareas comprometidas.
//   2. leerInforme: el jsonb de la BD se lee sin romperse (y devuelve null
//      si no tiene la forma esperada: semana guardada antes de la 0049).
//   3. resumenInforme: los números que se ven en el historial.
//   4. informeDesdeBitacora: una semana sin informe se reconstruye con los
//      ids de la bitácora (las semanas viejas también se pueden consultar).
// ============================================================================

import {
  construirInforme,
  informeDesdeBitacora,
  leerInforme,
  resumenInforme,
} from "@/lib/ritual/informe";

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${nombre}`);
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e.message });
    console.log(`  ✗ ${nombre}`);
    console.log(`    ${e.message}`);
  }
}

function eq(a, b, msg = "") {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(
      `${msg}\n    esperado: ${JSON.stringify(b)}\n    obtenido: ${JSON.stringify(a)}`,
    );
  }
}

// ── Datos de ejemplo ───────────────────────────────────────────────────────

const ENTRADA = {
  proyectos: [
    { id: "p1", nombre: "Sol de Nit", estado: "vivo" },
    { id: "p2", nombre: "Casa", estado: "pausado" },
    { id: "p3", nombre: "Tienda", estado: "muerto" },
  ],
  contextoProyectos: {
    p1: "La semana del festival",
    p2: "En pausa hasta que cuadre el presupuesto",
  },
  metas: [
    {
      id: "m1",
      titulo: "Vender 300 pizzas",
      proyecto: "Sol de Nit",
      estado: "en_progreso",
      fase: "construcción",
      situacion: "Vamos por 120",
    },
    {
      id: "m2",
      titulo: "Renovar la web",
      proyecto: "Sol de Nit",
      estado: "pausada",
      fase: null,
      situacion: "Pausada",
    },
    {
      id: "m3",
      titulo: "Ahorrar 6000",
      proyecto: "Casa",
      estado: "sin_empezar",
      fase: null,
      situacion: "",
    },
    {
      id: "m4",
      titulo: "Cerrar la tienda",
      proyecto: "Tienda",
      estado: "archivada",
      fase: null,
      situacion: "Archivada",
    },
  ],
  contextoMetas: { m1: "Vamos por 120 pizzas" },
  wigsMeta: ["m1", "m3"],
  krs: [
    { id: "k1", titulo: "KR pizzas", meta: "Vender 300 pizzas", wig: true },
    { id: "k2", titulo: "KR web", meta: "Renovar la web", wig: false },
    { id: "k3", titulo: "KR ahorro", meta: "Ahorrar 6000", wig: false },
  ],
  focoKrs: ["k3"],
  dias: [
    { dia: 1, nombre: "Lunes", fecha: "2026-11-09" },
    { dia: 2, nombre: "Martes", fecha: "2026-11-10" },
    { dia: 3, nombre: "Miércoles", fecha: "2026-11-11" },
  ],
  tareasDia: {
    "1": ["t1", "t2"],
    "2": ["t3"],
  },
  tareas: [
    { id: "t1", titulo: "Horneo", estado: "pendiente" },
    { id: "t2", titulo: "Compras", estado: "en_progreso" },
    { id: "t3", titulo: "Menú", estado: "pendiente" },
    { id: "t4", titulo: "No comprometida", estado: "pendiente" },
  ],
};

// ── 1. construirInforme ───────────────────────────────────────────────────

test("solo entran los proyectos vivos", () => {
  const i = construirInforme(ENTRADA);
  eq(
    i.proyectos.map((p) => p.nombre),
    ["Sol de Nit"],
    "solo el proyecto vivo",
  );
});

test("el proyecto vivo lleva su último contexto", () => {
  const i = construirInforme(ENTRADA);
  eq(i.proyectos[0].situacion, "La semana del festival");
});

test("las metas fuera de juego no entran (pausada, archivada)", () => {
  const i = construirInforme(ENTRADA);
  eq(
    i.metas.map((m) => m.id),
    ["m1", "m3"],
    "solo las metas que se trabajaban",
  );
});

test("el contexto del ritual manda sobre el Status Meta guardado", () => {
  const i = construirInforme(ENTRADA);
  eq(i.metas[0].situacion, "Vamos por 120 pizzas");
});

test("las 3 WIGs van en el orden elegido", () => {
  const i = construirInforme(ENTRADA);
  eq(
    i.wigs_meta.map((w) => w.titulo),
    ["Vender 300 pizzas", "Ahorrar 6000"],
  );
});

test("los KRs son los del ciclo (WIG) y los del foco de la semana", () => {
  const i = construirInforme(ENTRADA);
  eq(
    i.krs.map((k) => k.id),
    ["k1", "k3"],
    "k1 es WIG y k3 está en foco; k2 no entra",
  );
  eq(i.krs[0].wig, true);
  eq(i.krs[1].foco, true);
});

test("cada día lleva sus tareas comprometidas", () => {
  const i = construirInforme(ENTRADA);
  eq(i.dias.length, 3);
  eq(
    i.dias[0].tareas.map((t) => t.titulo),
    ["Horneo", "Compras"],
  );
  eq(
    i.dias[1].tareas.map((t) => t.titulo),
    ["Menú"],
  );
  eq(i.dias[2].tareas.length, 0, "miércoles sin comprometer");
});

test("una tarea que no existe en la lista se ignora", () => {
  const i = construirInforme({
    ...ENTRADA,
    tareasDia: { "1": ["t1", "no-existe"] },
  });
  eq(i.dias[0].tareas.length, 1);
});

// ── 2. leerInforme ────────────────────────────────────────────────────────

test("leerInforme devuelve null si no hay informe", () => {
  eq(leerInforme(null), null);
  eq(leerInforme(undefined), null);
  eq(leerInforme("texto"), null);
});

test("leerInforme devuelve null si el jsonb no tiene la forma", () => {
  eq(leerInforme({}), null);
  eq(leerInforme({ proyectos: "nope" }), null);
});

test("leerInforme devuelve el informe guardado", () => {
  const i = construirInforme(ENTRADA);
  const leido = leerInforme(JSON.parse(JSON.stringify(i)));
  eq(leido?.proyectos.length, 1);
  eq(leido?.dias.length, 3);
});

// ── 3. resumenInforme ─────────────────────────────────────────────────────

test("resumenInforme cuenta lo que se ve en el historial", () => {
  const r = resumenInforme(construirInforme(ENTRADA));
  eq(r, { proyectos: 1, metas: 2, wigs: 2, krs: 2, tareas: 3 });
});

// ── 4. informeDesdeBitacora (semanas viejas, sin informe) ────────────────

test("una semana sin informe se reconstruye con los ids de la bitácora", () => {
  const i = informeDesdeBitacora(
    {
      metas_vivas: ["m1"],
      wigs_meta: ["m1"],
      krs_foco: ["k3"],
    },
    {
      metas: ENTRADA.metas,
      krs: ENTRADA.krs,
      proyectos: ENTRADA.proyectos,
      tareas: ENTRADA.tareas,
      dias: ENTRADA.dias,
      tareasDia: [
        { dia_semana: 1, tarea_id: "t1" },
        { dia_semana: 1, tarea_id: "t2" },
      ],
    },
  );
  eq(
    i.metas.map((m) => m.id),
    ["m1"],
    "solo las metas que la bitácora marcó como vivas",
  );
  eq(i.wigs_meta.map((w) => w.titulo), ["Vender 300 pizzas"]);
  eq(i.krs.map((k) => k.id), ["k1", "k3"], "el WIG del ciclo y el del foco");
  eq(
    i.dias[0].tareas.map((t) => t.titulo),
    ["Horneo", "Compras"],
  );
});

console.log(`\n${pass} pruebas OK, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
