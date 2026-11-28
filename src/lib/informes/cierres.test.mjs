// ============================================================================
// Test del conteo de cierres de /informes (issue #108).
//
// QUÉ COMPRUEBA
//   1. Las metas cerradas: cuáles entran en la ventana y cuántas hay en
//      total (una meta con `fecha_cierre` y otra con `updated_at` de
//      respaldo).
//   2. Los KRs cerrados: cuentan, se ordenan por fecha y los de una meta
//      archivada NO.
//   3. Un KR reeditado después de cerrarse (updated_at de HOY, fecha_cierre
//      de hace 3 meses) NO vuelve a la ventana.
//   4. El reparto con plan / sin plan ignora las metas archivadas.
//   5. El ratio de tareas de un KR.
//
// ============================================================================

import {
  contarKrsCerrados,
  contarMetasCerradas,
  enVentana,
  fechaCierreKr,
  fechaCierreMeta,
  repartirPorPlan,
  tareasDeKr,
} from "@/lib/informes/cierres";

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
    failures.push({ nombre, error: e instanceof Error ? e.message : String(e) });
    console.log(`  ❌ ${nombre}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg ?? ""} esperaba ${b}, obtuvo ${a}`);
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg ?? "esperaba true");
}

const HOY = "2026-11-28T12:00:00.000Z";
const HACE_3_MESES = "2026-08-28T12:00:00.000Z";
const HACE_40_DIAS = "2026-10-19T12:00:00.000Z";
const DESDE = Date.parse(HACE_40_DIAS);
const HASTA = Date.parse(HOY);

console.log("\n=== Cierres de /informes (issue #108) ===");

// ─────────────────────────────────────────────────────────────────────────────
test("una meta cerrada cuenta si su fecha de cierre cae en la ventana", () => {
  const metas = [
    {
      meta: {
        id: "m1",
        titulo: "Cerrada hoy",
        estado: "completada",
        fecha_cierre: "2026-11-20T10:00:00.000Z",
        updated_at: "2026-11-20T10:00:00.000Z",
      },
      resultados: [],
    },
    {
      meta: {
        id: "m2",
        titulo: "Cerrada hace 40 días (justo en la ventana)",
        estado: "completada",
        fecha_cierre: HACE_40_DIAS,
        updated_at: HACE_40_DIAS,
      },
      resultados: [],
    },
  ];
  const r = contarMetasCerradas(metas, DESDE, HASTA);
  eq(r.enVentana.length, 2, "metas en ventana:");
  eq(r.total, 2, "metas cerradas totales:");
});

test("una meta cerrada fuera de la ventana no cuenta, pero sí suma al total", () => {
  const metas = [
    {
      meta: {
        id: "m1",
        titulo: "Cerrada hace 6 meses",
        estado: "completada",
        fecha_cierre: HACE_3_MESES,
        updated_at: HACE_3_MESES,
      },
      resultados: [],
    },
  ];
  const r = contarMetasCerradas(metas, DESDE, HASTA);
  eq(r.enVentana.length, 0, "en ventana:");
  eq(r.total, 1, "total de cerradas:");
});

test("una meta sin fecha_cierre usa updated_at como respaldo", () => {
  const meta = {
    id: "m1",
    estado: "completada",
    updated_at: "2026-11-10T08:00:00.000Z",
  };
  eq(fechaCierreMeta(meta), Date.parse("2026-11-10T08:00:00.000Z"));
  const r = contarMetasCerradas([{ meta, resultados: [] }], DESDE, HASTA);
  eq(r.enVentana.length, 1, "en ventana con el respaldo:");
});

test("una meta que no está completada no cuenta como cerrada", () => {
  const metas = [
    {
      meta: {
        id: "m1",
        estado: "en_progreso",
        fecha_cierre: "2026-11-20T10:00:00.000Z",
      },
      resultados: [],
    },
  ];
  const r = contarMetasCerradas(metas, DESDE, HASTA);
  eq(r.enVentana.length, 0);
  eq(r.total, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
test("los KRs cerrados cuentan y se ordenan por fecha de cierre", () => {
  const metas = [
    {
      meta: { id: "m1", titulo: "Meta", estado: "en_progreso" },
      resultados: [
        {
          id: "k1",
          titulo: "KR viejo",
          estado: "completado",
          fecha_cierre: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "k2",
          titulo: "KR nuevo",
          estado: "completado",
          fecha_cierre: "2026-11-25T10:00:00.000Z",
        },
        {
          id: "k3",
          titulo: "KR abierto",
          estado: "en_progreso",
          fecha_cierre: null,
        },
      ],
    },
  ];
  const r = contarKrsCerrados(metas, DESDE, HASTA);
  eq(r.enVentana.length, 2, "KRs cerrados en ventana:");
  eq(r.enVentana[0].kr.id, "k2", "el más reciente va primero:");
  eq(r.total, 2, "KRs cerrados totales:");
});

test("un KR reeditado hoy NO vuelve a la ventana (usa fecha_cierre)", () => {
  const metas = [
    {
      meta: { id: "m1", estado: "en_progreso" },
      resultados: [
        {
          id: "k1",
          titulo: "KR cerrado hace 3 meses y reeditado hoy",
          estado: "completado",
          fecha_cierre: HACE_3_MESES,
          updated_at: HOY,
        },
      ],
    },
  ];
  const r = contarKrsCerrados(metas, DESDE, HASTA);
  eq(r.enVentana.length, 0, "no debe reaparecer en la ventana:");
  eq(r.total, 1, "pero sigue contando como KR cerrado total:");
  eq(fechaCierreKr(metas[0].resultados[0]), Date.parse(HACE_3_MESES));
});

test("un KR cerrado sin fecha_cierre usa updated_at como respaldo", () => {
  const metas = [
    {
      meta: { id: "m1", estado: "en_progreso" },
      resultados: [
        {
          id: "k1",
          estado: "completado",
          updated_at: "2026-11-15T09:00:00.000Z",
        },
      ],
    },
  ];
  const r = contarKrsCerrados(metas, DESDE, HASTA);
  eq(r.enVentana.length, 1, "con el respaldo entra:");
});

test("los KRs de una meta archivada NO cuentan", () => {
  const metas = [
    {
      meta: { id: "m1", titulo: "Meta archivada", estado: "archivada" },
      resultados: [
        {
          id: "k1",
          titulo: "KR cerrado de una meta archivada",
          estado: "completado",
          fecha_cierre: "2026-11-10T10:00:00.000Z",
        },
      ],
    },
  ];
  const r = contarKrsCerrados(metas, DESDE, HASTA);
  eq(r.enVentana.length, 0, "no cuenta en la ventana:");
  eq(r.total, 0, "no cuenta en el total:");
});

// ─────────────────────────────────────────────────────────────────────────────
test("el reparto con plan / sin plan ignora las metas archivadas", () => {
  const metas = [
    {
      meta: { id: "m1", titulo: "Con KRs", estado: "en_progreso" },
      resultados: [{ id: "k1", estado: "pendiente" }],
    },
    {
      meta: { id: "m2", titulo: "Sin KRs", estado: "sin_empezar" },
      resultados: [],
    },
    {
      meta: { id: "m3", titulo: "Archivada con KRs", estado: "archivada" },
      resultados: [{ id: "k2", estado: "pendiente" }],
    },
  ];
  const r = repartirPorPlan(metas);
  eq(r.conPlan.length, 1, "con plan:");
  eq(r.sinPlan.length, 1, "sin plan:");
  eq(r.archivadas.length, 1, "archivadas:");
  eq(
    r.conPlan.length + r.sinPlan.length,
    metas.length - r.archivadas.length,
    "las activas cuadran con con plan + sin plan:",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
test("el ratio de tareas de un KR cuenta solo las hechas", () => {
  const t = tareasDeKr({
    id: "k1",
    tareas: [
      { estado: "hecha" },
      { estado: "hecha" },
      { estado: "pendiente" },
      { estado: "descartada" },
    ],
  });
  eq(t.hechas, 2, "hechas:");
  eq(t.total, 4, "total:");
});

// ─────────────────────────────────────────────────────────────────────────────
test("la ventana incluye los dos extremos", () => {
  ok(enVentana(DESDE, DESDE, HASTA), "el inicio de la ventana entra");
  ok(enVentana(HASTA, DESDE, HASTA), "el final de la ventana entra");
  ok(!enVentana(DESDE - 1, DESDE, HASTA), "un ms antes no");
  ok(!enVentana(HASTA + 1, DESDE, HASTA), "un ms después no");
  ok(!enVentana(null, DESDE, HASTA), "sin fecha no");
});

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ El informe cuenta bien las metas y los KRs cerrados");
