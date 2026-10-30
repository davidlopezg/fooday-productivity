// ============================================================================
// Tests del modo sombra (Fase 3 del Modo Recuperación).
// ============================================================================
// Ejecuta con: `node src/lib/recuperacion/shadow.test.mjs`
// No usa framework — sigue el patrón del proyecto. Cero llamadas a la IA.
//
// QUÉ SE COMPRUEBA
//   1. Derivación de la capacidad desde el semáforo y desde el estado
//      emocional.
//   2. Comparación con el plan actual (coincide / solo motor / solo plan).
//   3. La propuesta completa: no muta la entrada, es determinista.
//   4. El modo sombra NO escribe: el resultado es sólo lectura.
// ============================================================================

import {
  derivarCapacidad,
  compararConPlan,
  calcularPropuestaShadow,
  construirResumen,
  agruparDescartables,
} from "./shadow.ts";

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

function ok(cond, msg) {
  if (!cond) throw new Error(msg ?? "condición falsa");
}

const HOY = "2026-01-14";

let seq = 0;

function tarea(over = {}) {
  seq += 1;
  return {
    id: `t${seq}`,
    titulo: `Tarea ${seq}`,
    descripcion: null,
    estado: "pendiente",
    prioridad: "media",
    meta_id: null,
    proyecto_id: null,
    area_id: null,
    codigo: null,
    capa: null,
    deadline: null,
    fecha_fin: null,
    pts: null,
    esfuerzo: null,
    importe: null,
    origen: null,
    notas: null,
    completada_at: null,
    ambito: null,
    tags: [],
    es_wig: false,
    wig_orden: null,
    subtareas: null,
    criterio_terminacion: null,
    recurrencia_tipo: null,
    recurrencia_dias_semana: null,
    recurrencia_dia_mes: null,
    recurrencia_ultima_generada: null,
    resultado_periodo_id: null,
    pendiente_respuesta: false,
    pendiente_respuesta_at: null,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: null,
    ...over,
  };
}

function meta(over = {}) {
  seq += 1;
  return {
    id: `m${seq}`,
    area_id: null,
    codigo: null,
    titulo: `Meta ${seq}`,
    descripcion: null,
    estado: "en_progreso",
    prioridad: null,
    rice: null,
    plazo: null,
    ambito: null,
    tags: [],
    es_wig: false,
    wig_orden: null,
    proyecto_id: null,
    fecha_objetivo: null,
    contexto: null,
    situacion_actual: null,
    fecha_inicio_meta: null,
    fecha_fin_bloqueada: null,
    fecha_cierre: null,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: null,
    ...over,
  };
}

function pago(over = {}) {
  seq += 1;
  return {
    id: `p${seq}`,
    recurrencia_id: null,
    recurrente_id: null,
    proveedor: "Sabadell",
    concepto: "Comisión",
    categoria: "otro",
    importe_total: 100,
    importe_pagado: 0,
    fecha_emision_factura: null,
    fecha_vencimiento: HOY,
    fecha_pago_programada: null,
    fecha_pago_real: null,
    estado: "pendiente",
    prioridad: "media",
    urgencia_score: null,
    metodo_pago: "transferencia",
    alerta_vencimiento_dias: 7,
    notas: null,
    created_at: "2026-01-01T08:00:00Z",
    updated_at: null,
    ...over,
  };
}

console.log("\n── derivarCapacidad ──");

test("el semáforo del plan manda sobre todo lo demás", () => {
  eq(
    derivarCapacidad({ semaforo: "rojo", estado: { despertar: "Con energía" } }),
    { capacidad: "rojo", nivel: "minima", origen: "plan" },
  );
  eq(derivarCapacidad({ semaforo: "verde" }).origen, "plan");
  eq(derivarCapacidad({ semaforo: "verde" }).nivel, "alta");
});

test("sin plan, 'Agotado' → carga mínima (estimado)", () => {
  eq(derivarCapacidad({ semaforo: null, estado: { despertar: "Agotado" } }), {
    capacidad: "rojo",
    nivel: "minima",
    origen: "estimado",
  });
});

test("sin plan, 'todo me arrastra' → carga MEDIA (no mínima)", () => {
  // "Todo me arrastra" es saturación, no fatiga. Con el corte 1:1 se
  // quedaba con 1 sola tarea, demasiado severo.
  eq(
    derivarCapacidad({ estado: { despertar: "Con energía", rueda: "Sí, todo me arrastra" } })
      .nivel,
    "media",
  );
});

test("sin plan, 'Cansado pero estable' → media (estimado)", () => {
  eq(
    derivarCapacidad({ estado: { despertar: "Cansado pero estable" } }).nivel,
    "media",
  );
});

test("sin plan, necesidad 'Contención' → media (estimado)", () => {
  eq(
    derivarCapacidad({ estado: { despertar: "Con energía", necesidad: "Contención" } })
      .nivel,
    "media",
  );
});

test("sin plan, 'Con energía' → carga completa (estimado)", () => {
  eq(derivarCapacidad({ estado: { despertar: "Con energía" } }), {
    capacidad: "verde",
    nivel: "alta",
    origen: "estimado",
  });
});

test("sin datos → carga MEDIA por defecto (NUNCA alta: llenaría el día)", () => {
  eq(derivarCapacidad({}), {
    capacidad: "amarillo",
    nivel: "media",
    origen: "por_defecto",
  });
  eq(derivarCapacidad({ semaforo: null, estado: null }).nivel, "media");
});

console.log("\n── compararConPlan ──");

test("sin plan actual → no hay coincidencia y hayPlan=false", () => {
  const r = compararConPlan({ plan: [] }, null);
  eq(r.hayPlan, false);
  eq(r.coincide, []);
});

test("clasifica en coincide / soloMotor / soloPlan", () => {
  const fake = {
    plan: [{ tarea: { id: "a" } }, { tarea: { id: "b" } }],
  };
  const r = compararConPlan(fake, {
    tareas: [{ tarea_id: "b" }, { tarea_id: "c" }],
  });
  eq(r.hayPlan, true);
  eq(r.coincide, ["b"]);
  eq(r.soloMotor, ["a"]);
  eq(r.soloPlan, ["c"]);
});

test("ignora las filas del plan sin tarea_id (tareas libres)", () => {
  const r = compararConPlan({ plan: [] }, {
    tareas: [{ tarea_id: null }, { tarea_id: null }],
  });
  eq(r.soloPlan, []);
});

console.log("\n── calcularPropuestaShadow ──");

test("la propuesta respeta la capacidad derivada del plan", () => {
  const m = meta({});
  const tareas = [tarea({ meta_id: m.id })];
  for (let i = 0; i < 4; i++) tareas.push(tarea({ meta_id: m.id }));

  const verde = calcularPropuestaShadow({
    tareas,
    metas: [m],
    pagos: [],
    planActual: { semaforo: "verde", tareas: [] },
    hoy: HOY,
  });
  eq(verde.capacidad, "verde");
  eq(verde.resultado.secundarias.length, 2);

  const rojo = calcularPropuestaShadow({
    tareas,
    metas: [m],
    pagos: [],
    planActual: { semaforo: "rojo", tareas: [] },
    hoy: HOY,
  });
  eq(rojo.capacidad, "rojo");
  eq(rojo.resultado.secundarias.length, 0);
  eq(rojo.resultado.plan.length, 1);
});

test("el riesgo financiero aparece como aviso aunque la carga sea mínima", () => {
  const p = pago({ fecha_vencimiento: "2026-01-10", importe_total: 500 });
  const r = calcularPropuestaShadow({
    tareas: [],
    metas: [],
    pagos: [p],
    planActual: { semaforo: "rojo", tareas: [] },
    hoy: HOY,
  });
  eq(r.capacidad, "rojo");
  eq(r.resultado.avisos.length, 1);
  ok(r.resultado.avisos[0].texto.includes("500"), "debe llevar el importe");
});

test("NO muta las tareas de entrada (el modo sombra es sólo lectura)", () => {
  const m = meta({});
  const t = tarea({ meta_id: m.id, fecha_fin: HOY });
  const copia = JSON.stringify(t);
  calcularPropuestaShadow({
    tareas: [t],
    metas: [m],
    pagos: [],
    hoy: HOY,
  });
  eq(JSON.stringify(t), copia);
});

test("es determinista: misma entrada → misma propuesta", () => {
  const m = meta({});
  const args = {
    tareas: [tarea({ meta_id: m.id, fecha_fin: HOY })],
    metas: [m],
    pagos: [],
    hoy: HOY,
  };
  const a = calcularPropuestaShadow(args);
  const b = calcularPropuestaShadow(args);
  eq(a.resumen, b.resumen);
  eq(
    a.resultado.plan.map((x) => x.tarea.id),
    b.resultado.plan.map((x) => x.tarea.id),
  );
});

test("el resumen cuenta los roles del plan", () => {
  const m = meta({});
  const r = calcularPropuestaShadow({
    tareas: [
      tarea({ titulo: "Compromiso", meta_id: m.id, fecha_fin: HOY }),
      tarea({ titulo: "Objetivo", meta_id: m.id }),
    ],
    metas: [m],
    pagos: [],
    planActual: { semaforo: "verde", tareas: [] },
    hoy: HOY,
  });
  ok(r.resumen.includes("principal"), `resumen: ${r.resumen}`);
  ok(r.resumen.includes("carga completa"), `resumen: ${r.resumen}`);
});

console.log("\n── construirResumen ──");

test("sin nada que proponer, el resumen lo dice", () => {
  const r = construirResumen(
    { plan: [], principal: null, secundarias: [], mantenimiento: null, bienestar: null },
    "verde",
  );
  ok(r.includes("No hay nada"), r);
});

test("el resumen distingue la carga", () => {
  const fake = {
    plan: [{ tarea: { id: "a" } }],
    principal: { tarea: { id: "a" } },
    secundarias: [],
    mantenimiento: null,
    bienestar: null,
  };
  ok(construirResumen(fake, "minima").includes("carga mínima"));
  ok(construirResumen(fake, "media").includes("carga media"));
  ok(construirResumen(fake, "alta").includes("carga completa"));
});

console.log("\n── agruparDescartables ──");

test("agrupa las descartables por categoría (hábitos / con fecha / sin objetivo)", () => {
  const g = agruparDescartables([
    // Hábitos: recurrente y personal sin fecha → no son trabajo.
    { tarea: { id: "1", titulo: "Hábito", recurrencia_tipo: "semanal" }, motivo: "x", regla: "mejora_no_urgente" },
    { tarea: { id: "1b", titulo: "Caminar", ambito: "personal" }, motivo: "x", regla: "mejora_no_urgente" },
    // Con fecha → puede seguir viva.
    { tarea: { id: "2", titulo: "Cita médica", ambito: "personal", fecha_fin: "2026-02-01" }, motivo: "x", regla: "mejora_no_urgente" },
    // Profesional sin meta → trabajo huérfano.
    { tarea: { id: "3", titulo: "Sin meta", ambito: "profesional" }, motivo: "x", regla: "mejora_no_urgente" },
  ]);
  const porClave = {};
  for (const x of g) porClave[x.clave] = x.tareas.length;
  eq(porClave.habitos, 2);
  eq(porClave.con_fecha, 1);
  eq(porClave.sin_objetivo, 1);
  // Y NO se pierde ninguna: la suma es el total.
  eq(g.reduce((acc, x) => acc + x.tareas.length, 0), 4);
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
