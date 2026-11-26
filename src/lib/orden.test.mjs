// ============================================================================
// Tests del orden de ejecución (issue #105).
// ============================================================================
// Ejecuta con: `node src/lib/orden.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  SIN_ORDEN,
  compararPorEjecucion,
  contextoEjecucionVacio,
  moverEnLista,
  normalizarOrden,
  ordenarPorEjecucion,
  secuenciaEjecucion,
} from "./orden.ts";

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

const tarea = (id, extra = {}) => ({
  id,
  meta_id: null,
  resultado_periodo_id: null,
  orden_ejecucion: 0,
  created_at: "2026-01-01T00:00:00Z",
  ...extra,
});

console.log("\nnormalizarOrden");

test("0 (sin posición) se normaliza al final", () => {
  eq(normalizarOrden(0), SIN_ORDEN);
  eq(normalizarOrden(null), SIN_ORDEN);
  eq(normalizarOrden(undefined), SIN_ORDEN);
  eq(normalizarOrden(3), 3);
});

console.log("\nordenarPorEjecucion");

test("ordena por orden_ejecucion ascendente", () => {
  const lista = [
    tarea("c", { orden_ejecucion: 3 }),
    tarea("a", { orden_ejecucion: 1 }),
    tarea("b", { orden_ejecucion: 2 }),
  ];
  eq(ordenarPorEjecucion(lista).map((t) => t.id), ["a", "b", "c"]);
});

test("lo que no tiene orden (0) va al final", () => {
  const lista = [
    tarea("sin", { orden_ejecucion: 0 }),
    tarea("b", { orden_ejecucion: 2 }),
    tarea("a", { orden_ejecucion: 1 }),
  ];
  eq(ordenarPorEjecucion(lista).map((t) => t.id), ["a", "b", "sin"]);
});

test("no muta la lista original", () => {
  const lista = [
    tarea("b", { orden_ejecucion: 2 }),
    tarea("a", { orden_ejecucion: 1 }),
  ];
  ordenarPorEjecucion(lista);
  eq(lista.map((t) => t.id), ["b", "a"]);
});

test("a igualdad de orden, el más antiguo primero", () => {
  const lista = [
    tarea("nuevo", { orden_ejecucion: 1, created_at: "2026-02-01T00:00:00Z" }),
    tarea("viejo", { orden_ejecucion: 1, created_at: "2026-01-01T00:00:00Z" }),
  ];
  eq(ordenarPorEjecucion(lista).map((t) => t.id), ["viejo", "nuevo"]);
});

console.log("\nmoverEnLista");

test("sube un puesto", () => {
  eq(moverEnLista(["a", "b", "c"], "c", -1), ["a", "c", "b"]);
});

test("baja un puesto", () => {
  eq(moverEnLista(["a", "b", "c"], "a", 1), ["b", "a", "c"]);
});

test("el primero no baja y el último no sube", () => {
  eq(moverEnLista(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  eq(moverEnLista(["a", "b", "c"], "c", 1), ["a", "b", "c"]);
});

test("un id que no está no cambia nada", () => {
  eq(moverEnLista(["a", "b"], "z", -1), ["a", "b"]);
});

console.log("\nsecuenciaEjecucion");

test("recorre proyecto → meta → KR → tarea", () => {
  const ctx = contextoEjecucionVacio();
  ctx.ordenProyecto.set("p1", 1);
  ctx.proyectoDeMeta.set("m1", "p1");
  ctx.ordenMeta.set("m1", 1);
  ctx.metaDeKr.set("k1", "m1");
  ctx.ordenKr.set("k1", 1);

  const tareas = [
    tarea("t2", { resultado_periodo_id: "k1", orden_ejecucion: 2 }),
    tarea("t1", { resultado_periodo_id: "k1", orden_ejecucion: 1 }),
  ];
  const seq = secuenciaEjecucion(tareas, ctx);
  eq(seq.get("t1"), 1);
  eq(seq.get("t2"), 2);
});

test("el orden de la meta manda sobre el de la tarea", () => {
  const ctx = contextoEjecucionVacio();
  ctx.ordenProyecto.set("p1", 1);
  ctx.proyectoDeMeta.set("m1", "p1");
  ctx.ordenMeta.set("m1", 1);
  ctx.metaDeKr.set("k1", "m1");
  ctx.ordenKr.set("k1", 1);
  ctx.ordenMeta.set("m2", 2);
  ctx.metaDeKr.set("k2", "m2");
  ctx.ordenKr.set("k2", 1);

  const tareas = [
    // Tarea de la meta 2 (posicion 1 dentro de su meta) pero de la meta 1
    // la que va despues: el nivel superior manda.
    tarea("deM2", { resultado_periodo_id: "k2", orden_ejecucion: 1 }),
    tarea("deM1", { resultado_periodo_id: "k1", orden_ejecucion: 9 }),
  ];
  const seq = secuenciaEjecucion(tareas, ctx);
  eq(seq.get("deM1"), 1);
  eq(seq.get("deM2"), 2);
});

test("las tareas sin meta ni KR van al final", () => {
  const ctx = contextoEjecucionVacio();
  ctx.ordenProyecto.set("p1", 1);
  ctx.proyectoDeMeta.set("m1", "p1");
  ctx.ordenMeta.set("m1", 1);
  ctx.metaDeKr.set("k1", "m1");
  ctx.ordenKr.set("k1", 1);

  const tareas = [
    tarea("suelta", {}),
    tarea("conKr", { resultado_periodo_id: "k1", orden_ejecucion: 1 }),
  ];
  const seq = secuenciaEjecucion(tareas, ctx);
  eq(seq.get("conKr"), 1);
  eq(seq.get("suelta"), 2);
});

test("las metas sin proyecto van detrás de las que lo tienen", () => {
  const ctx = contextoEjecucionVacio();
  ctx.ordenProyecto.set("p1", 1);
  ctx.proyectoDeMeta.set("m1", "p1");
  ctx.ordenMeta.set("m1", 1);
  ctx.metaDeKr.set("k1", "m1");
  ctx.ordenKr.set("k1", 1);
  ctx.ordenMeta.set("mSuelta", 1);
  ctx.metaDeKr.set("kS", "mSuelta");
  ctx.ordenKr.set("kS", 1);

  const tareas = [
    tarea("deMetaSuelta", { resultado_periodo_id: "kS", orden_ejecucion: 1 }),
    tarea("deProyecto", { resultado_periodo_id: "k1", orden_ejecucion: 1 }),
  ];
  const seq = secuenciaEjecucion(tareas, ctx);
  eq(seq.get("deProyecto"), 1);
  eq(seq.get("deMetaSuelta"), 2);
});

console.log("\ncompararPorEjecucion");

test("es estable y determinista", () => {
  const a = tarea("a", { orden_ejecucion: 1 });
  const b = tarea("b", { orden_ejecucion: 1 });
  eq(compararPorEjecucion(a, b) < 0, true);
  eq(compararPorEjecucion(b, a) > 0, true);
  eq(compararPorEjecucion(a, a), 0);
});

// ---------------------------------------------------------------------------
console.log(`\n${pass} pruebas OK, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ❌ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
