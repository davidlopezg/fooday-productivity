// Tests del barrido semanal (Fase 7).
// Ejecutar: npm test (o node --import ./scripts/test-alias.mjs este archivo)

import {
  sugerirRevision,
  calcularRevision,
  construirResumenRevision,
  diasEntre,
  DIAS_PROYECTO_SIN_MOVIMIENTO,
} from "./revision.ts";

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
  } catch (e) {
    fail++;
    failures.push({ nombre, actual: e, esperado: null });
    console.log(`  ❌ ${nombre}: error ${e.message ?? e}`);
  }
}

function eq(actual, esperado, nombre) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  if (a === e) {
    pass++;
  } else {
    fail++;
    failures.push({ nombre, actual, esperado });
    console.log(`  ❌ ${nombre}: desigual ${a} !== ${e}`);
  }
}

function ok(cond, nombre) {
  if (cond) pass++;
  else {
    fail++;
    failures.push({ nombre, actual: cond, esperado: true });
    console.log(`  ❌ ${nombre}: condición falsa`);
  }
}

const HOY = "2026-01-14";
const fechaSemanas = (n) => {
  const f = new Date(HOY + "T00:00:00");
  f.setDate(f.getDate() + n);
  // toLocalDateString conserva el día local (evita el desplazamiento UTC).
  return f.toLocaleDateString("sv-SE");
};

const tarea = (o = {}) => ({
  id: o.id ?? "t",
  titulo: o.titulo ?? "Tarea",
  estado: o.estado ?? "pendiente",
  meta_id: o.meta_id ?? null,
  fecha_fin: o.fecha_fin ?? null,
  deadline: o.deadline ?? null,
  updated_at: o.updated_at ?? null,
  descripcion: o.descripcion ?? null,
  importe: o.importe ?? null,
});

const pago = (o = {}) => ({
  id: o.id ?? "p",
  proveedor: o.proveedor ?? "Proveedor",
  concepto: o.concepto ?? "Concepto",
  importe_total: o.importe_total ?? 0,
  importe_pagado: o.importe_pagado ?? 0,
  fecha_vencimiento: o.fecha_vencimiento ?? HOY,
  estado_efectivo: o.estado_efectivo ?? "pendiente",
});

console.log("\n── sugerirRevision ──");

test("con pago en riesgo → programar (nunca desplazar el riesgo)", () => {
  const r = sugerirRevision(tarea({ titulo: "Pagar suministros 50,00" }), {
    hoy: HOY,
    tieneMetaActiva: false,
    pagoEnRiesgo: true,
  });
  eq(r.sugerencia, "programar");
  ok(r.motivo.includes("pago en riesgo"), r.motivo);
});

test("con fecha futura → mantener (ya está programada)", () => {
  eq(
    sugerirRevision(tarea({ fecha_fin: fechaSemanas(5) }), { hoy: HOY, tieneMetaActiva: true })
      .sugerencia,
    "mantener",
  );
});

test("con fecha vencida → programar (reprogramar, no olvidar)", () => {
  const r = sugerirRevision(tarea({ deadline: fechaSemanas(-3) }), {
    hoy: HOY,
    tieneMetaActiva: false,
  });
  eq(r.sugerencia, "programar");
  ok(r.motivo.includes("fecha"), r.motivo);
});

test("sin fecha pero con meta activa → programar", () => {
  eq(
    sugerirRevision(tarea({ meta_id: "m1", fecha_fin: null }), {
      hoy: HOY,
      tieneMetaActiva: true,
    }).sugerencia,
    "programar",
  );
});

test("sin fecha ni meta → aplazar (trabajo huérfano)", () => {
  eq(
    sugerirRevision(tarea({ meta_id: null }), { hoy: HOY, tieneMetaActiva: false }).sugerencia,
    "aplazar",
  );
});

console.log("\n── calcularRevision ──");

test("ordena: lo que exige decisión (programar) delante de lo aplazable", () => {
  const r = calcularRevision({
    tareas: [
      tarea({ id: "a", titulo: "Huérfana" }),
      tarea({ id: "b", titulo: "Con fecha vencida", deadline: fechaSemanas(-5) }),
    ],
    metas: [],
    pagos: [],
    hoy: HOY,
  });
  // la "b" (programar) delante de la "a" (aplazar).
  eq(r.tareas[0].tarea.id, "b");
  eq(r.tareas[1].tarea.id, "a");
});

test("cuenta los pagos vencidos y su total", () => {
  const r = calcularRevision({
    tareas: [],
    metas: [],
    pagos: [
      pago({ proveedor: "TGSS", importe_total: 480, fecha_vencimiento: fechaSemanas(-40), estado_efectivo: "vencido" }),
      pago({ proveedor: "AEAT", importe_total: 700, fecha_vencimiento: fechaSemanas(-10), estado_efectivo: "vencido" }),
      pago({ proveedor: "Luz", importe_total: 100, fecha_vencimiento: fechaSemanas(5) }),
    ],
    hoy: HOY,
  });
  eq(r.pagos.vencidos, 2);
  eq(r.pagos.totalVencido, 1180);
  ok(r.pagos.detalle.length >= 2, "el detalle lista los pagos");
});

test("proyectos sin movimiento solo se AVISAN, no se bloquean", () => {
  const r = calcularRevision({
    tareas: [],
    metas: [],
    pagos: [],
    hoy: HOY,
    proyectos: [
      { id: "p1", titulo: "Estancado", tareasActivas: 3, diasSinAvance: 30 },
      { id: "p2", titulo: "Activo", tareasActivas: 2, diasSinAvance: 2 },
    ],
  });
  eq(r.proyectos.length, 1);
  eq(r.proyectos[0].id, "p1");
  ok(r.proyectos[0].motivo.includes("No se bloquea"), r.proyectos[0].motivo);
  ok(r.proyectos[0].diasSinAvance >= DIAS_PROYECTO_SIN_MOVIMIENTO);
});

test("el resumen distingue programar / aplazar / mantener", () => {
  const r = construirResumenRevision({
    revisadas: [
      { tarea: tarea(), sugerencia: "programar", motivo: "" },
      { tarea: tarea({ id: "x" }), sugerencia: "aplazar", motivo: "" },
      { tarea: tarea({ id: "y" }), sugerencia: "mantener", motivo: "" },
    ],
    proyectos: [],
    vencidos: 0,
    totalVencido: 0,
    proximos: 0,
    totalProximo: 0,
  });
  ok(r.includes("1 para programar"), r);
  ok(r.includes("1 sin objetivo"), r);
  ok(r.includes("1 ya programada"), r);
});

test("diasEntre: calcular días entre fechas", () => {
  eq(diasEntre(HOY, fechaSemanas(7)), 7);
  eq(diasEntre(HOY, fechaSemanas(-2)), -2);
  eq(diasEntre(HOY, ""), null);
});

// ----------------------------------------------------------------------------
// Resumen
// ----------------------------------------------------------------------------
console.log(
  `\n${"=".repeat(60)}\n${
    fail === 0
      ? `✅ ${pass} tests en verde`
      : `❌ ${fail} de ${pass + fail} tests fallaron`
  }\n${"=".repeat(60)}`,
);
if (fail > 0) {
  for (const f of failures) console.error(`  ✖ ${f.nombre}: ${f.error}`);
  process.exit(1);
}