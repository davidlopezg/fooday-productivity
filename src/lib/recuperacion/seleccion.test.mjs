// ============================================================================
// Tests del motor determinista de selección (Modo Recuperación).
// ============================================================================
// Ejecuta con: `node src/lib/recuperacion/seleccion.test.mjs`
// No usa framework — sigue el patrón del proyecto (`llm-parser.test.mjs`).
// Consume cero créditos de API: solo funciones puras.
//
// QUÉ SE COMPRUEBA
//   1. Filtro de candidatas (estados excluibles, pendientes de respuesta,
//      recurrentes).
//   2. Utilidades de fecha (diasHasta, fechaLimite, textoVencimiento).
//   3. Estimación de minutos (subtareas > esfuerzo libre).
//   4. Motor financiero (vencido / próximo / horizonte, activos vs pagados).
//   5. Matching pago ↔ tarea (importe, proveedor, ausencia de falsos positivos).
//   6. Orden de las reglas de selección.
//   7. Capacidad: 1 principal + N secundarias, mantenimiento opcional.
//   8. Avisos: el riesgo financiero NO se silencia con capacidad baja.
//   9. Determinismo: misma entrada → misma salida.
// ============================================================================

import {
  seleccionarPlan,
  detectarRiesgosFinancieros,
  indexarPagosPorTarea,
  relacionarPagoConTarea,
  minutosEstimados,
  diasHasta,
  fechaLimite,
  textoVencimiento,
  normalizar,
  detectarImporte,
  formatearImporte,
  esImportante,
  nivelDeCapacidad,
  MAX_SECUNDARIAS,
  TAG_INGRESOS,
  MINUTOS_MANTENIMIENTO,
  MINUTOS_MINIMOS_ESTIMACION,
  DIAS_AVISO_INDIVIDUAL,
} from "./seleccion.ts";

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

// ----------------------------------------------------------------------------
// Helpers de fixtures
// ----------------------------------------------------------------------------

const HOY = "2026-01-14"; // miércoles

let seq = 0;

/** Tarea de test con valores por defecto sensatos. */
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
    created_at: `2026-01-0${(seq % 9) + 1}T08:00:00Z`,
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

const mapaMetas = (metas) => new Map(metas.map((m) => [m.id, m]));

console.log("\n── utilidades de fecha ──");

test("diasHasta: hoy = 0, mañana = 1, ayer = -1", () => {
  eq(diasHasta(HOY, HOY), 0);
  eq(diasHasta("2026-01-15", HOY), 1);
  eq(diasHasta("2026-01-13", HOY), -1);
});

test("diasHasta: null y fecha inválida → null", () => {
  eq(diasHasta(null, HOY), null);
  eq(diasHasta("no-es-fecha", HOY), null);
});

test("fechaLimite: fecha_fin manda sobre deadline", () => {
  eq(fechaLimite({ fecha_fin: "2026-02-01", deadline: "2026-01-20" }), "2026-02-01");
  eq(fechaLimite({ fecha_fin: null, deadline: "2026-01-20" }), "2026-01-20");
  eq(fechaLimite({ fecha_fin: null, deadline: null }), null);
});

test("textoVencimiento: frases legibles", () => {
  eq(textoVencimiento(0), "vence hoy");
  eq(textoVencimiento(1), "vence mañana");
  eq(textoVencimiento(-1), "venció ayer");
  eq(textoVencimiento(-3), "lleva 3 días vencida");
  eq(textoVencimiento(null), "sin fecha");
});

console.log("\n── normalización e importes ──");

test("normalizar: quita acentos, minúsculas y puntuación", () => {
  eq(normalizar("Sabadell — Bancos, S.L."), "sabadell bancos s l");
  eq(normalizar("Añadir urgentemente"), "anadir urgentemente");
});

test("detectarImporte: formato español e inglés", () => {
  eq(detectarImporte("pagar 1.234,56 €"), 1234.56);
  eq(detectarImporte("importe 1234,56"), 1234.56);
  eq(detectarImporte("total 1234.56"), 1234.56);
  eq(detectarImporte("sin números"), null);
});

test("formatearImporte: formato español con millares", () => {
  // Intl usa espacio duro (nbsp) en "€": comparamos normalizando espacios.
  eq(formatearImporte(1234.56).replace(/\s/g, " "), "1.234,56 €");
});

console.log("\n── estimación de minutos ──");

test("minutosEstimados: la primera subtarea pendiente manda", () => {
  const t = tarea({
    subtareas: [
      { id: "s1", descripcion: "A", tiempo_estimado_min: 45, hecho: false },
      { id: "s2", descripcion: "B", tiempo_estimado_min: 90, hecho: false },
    ],
  });
  eq(minutosEstimados(t), 45);
});

test("minutosEstimados: si la primera está hecha, usa la siguiente", () => {
  const t = tarea({
    subtareas: [
      { id: "s1", descripcion: "A", tiempo_estimado_min: 45, hecho: true },
      { id: "s2", descripcion: "B", tiempo_estimado_min: 90, hecho: false },
    ],
  });
  eq(minutosEstimados(t), 90);
});

test("minutosEstimados: sin subtareas, parsea `esfuerzo` numérico", () => {
  eq(minutosEstimados(tarea({ esfuerzo: "30" })), 30);
  eq(minutosEstimados(tarea({ esfuerzo: "45 min" })), 45);
});

test("minutosEstimados: `esfuerzo` no numérico → null (no inventa)", () => {
  eq(minutosEstimados(tarea({ esfuerzo: "media" })), null);
  eq(minutosEstimados(tarea({ esfuerzo: null })), null);
});

console.log("\n── motor financiero ──");

test("detectarRiesgosFinancieros: vence HOY → nivel 1 (aún no está vencido)", () => {
  const r = detectarRiesgosFinancieros([pago({ fecha_vencimiento: HOY })], HOY);
  eq(r.length, 1);
  eq(r[0].nivel, 1);
});

test("detectarRiesgosFinancieros: vencido ayer → nivel 0", () => {
  const r = detectarRiesgosFinancieros(
    [pago({ fecha_vencimiento: "2026-01-13" })],
    HOY,
  );
  eq(r[0].nivel, 0);
});

test("detectarRiesgosFinancieros: pago pagado o anulado se ignora", () => {
  const r = detectarRiesgosFinancieros(
    [
      pago({ estado: "pagado", importe_pagado: 100 }),
      pago({ estado: "anulado" }),
    ],
    HOY,
  );
  eq(r.length, 0);
});

test("detectarRiesgosFinancieros: saldo ya saldado se ignora", () => {
  const r = detectarRiesgosFinancieros(
    [pago({ estado: "pagado_parcial", importe_total: 100, importe_pagado: 100 })],
    HOY,
  );
  eq(r.length, 0);
});

test("detectarRiesgosFinancieros: vence en 3 días → nivel 1", () => {
  const r = detectarRiesgosFinancieros(
    [pago({ fecha_vencimiento: "2026-01-17" })],
    HOY,
  );
  eq(r[0].nivel, 1);
});

test("detectarRiesgosFinancieros: vence en 20 días → nivel 2 (horizonte)", () => {
  const r = detectarRiesgosFinancieros(
    [pago({ fecha_vencimiento: "2026-02-03" })],
    HOY,
  );
  eq(r[0].nivel, 2);
});

test("detectarRiesgosFinancieros: vence en 60 días → fuera de rango", () => {
  const r = detectarRiesgosFinancieros(
    [pago({ fecha_vencimiento: "2026-03-15" })],
    HOY,
  );
  eq(r.length, 0);
});

test("detectarRiesgosFinancieros: ordena por urgencia", () => {
  const r = detectarRiesgosFinancieros(
    [
      pago({ fecha_vencimiento: "2026-01-20" }),
      pago({ fecha_vencimiento: "2026-01-10" }),
    ],
    HOY,
  );
  eq(r[0].nivel, 0);
  eq(r[1].nivel, 1);
});

console.log("\n── matching pago ↔ tarea ──");

test("relacionarPagoConTarea: coincide por importe", () => {
  const p = pago({ proveedor: "X", concepto: "Y", importe_total: 1234.56 });
  const t = tarea({ titulo: "Pagar factura 1234,56 a X" });
  const r = relacionarPagoConTarea(p, t);
  ok(r.senal !== null, "debería detectar señal");
});

test("relacionarPagoConTarea: coincide por proveedor", () => {
  const p = pago({ proveedor: "Sabadell", concepto: "Comisión", importe_total: 25 });
  const t = tarea({ titulo: "Contactar con Sabadell por la comisión" });
  const r = relacionarPagoConTarea(p, t);
  eq(r.senal, "proveedor");
  eq(r.fuerte, false);
});

test("relacionarPagoConTarea: importe + proveedor → match fuerte", () => {
  const p = pago({ proveedor: "Sabadell", concepto: "Comisión", importe_total: 25 });
  const t = tarea({ titulo: "Sabadell: pagar 25,00 € de comisión" });
  const r = relacionarPagoConTarea(p, t);
  eq(r.fuerte, true);
});

test("relacionarPagoConTarea: sin relación → sin señal (sin falsos positivos)", () => {
  const p = pago({ proveedor: "Sabadell", concepto: "Comisión", importe_total: 25 });
  const t = tarea({ titulo: "Preparar propuesta comercial para un restaurante" });
  const r = relacionarPagoConTarea(p, t);
  eq(r.senal, null);
});

test("indexarPagosPorTarea: indexa solo las tareas con match", () => {
  const p = pago({ proveedor: "Sabadell", concepto: "Comisión", importe_total: 25 });
  const t1 = tarea({ titulo: "Sabadell comisión 25" });
  const t2 = tarea({ titulo: "Otra cosa" });
  const idx = indexarPagosPorTarea([p], [t1, t2], HOY);
  eq(idx.size, 1);
  ok(idx.has(t1.id), "t1 debería estar indexada");
  ok(!idx.has(t2.id), "t2 no debería estar indexada");
});

console.log("\n── importancia ──");

test("esImportante: WIG-tarea > WIG-meta > meta activa > huérfana", () => {
  const m = meta({ es_wig: true });
  const mActiva = meta({});
  ok(esImportante(tarea({ es_wig: true }), undefined), "wig-tarea");
  ok(esImportante(tarea({ meta_id: m.id }), m), "wig-meta");
  ok(esImportante(tarea({ meta_id: mActiva.id }), mActiva), "meta activa");
  ok(!esImportante(tarea({}), undefined), "huérfana");
});

test("esImportante: meta archivada o completada no da importancia", () => {
  const m = meta({ estado: "archivada" });
  ok(!esImportante(tarea({ meta_id: m.id }), m), "archivada");
  const m2 = meta({ estado: "completada" });
  ok(!esImportante(tarea({ meta_id: m2.id }), m2), "completada");
});

console.log("\n── exclusión de candidatas ──");

test("seleccionarPlan: excluye hechas, descartadas, archivadas y bloqueadas", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ estado: "hecha", titulo: "H" }),
      tarea({ estado: "descartada", titulo: "D" }),
      tarea({ estado: "archivada", titulo: "A" }),
      tarea({ estado: "bloqueada", titulo: "B" }),
      tarea({ titulo: "Válida", meta_id: m.id }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.plan.length, 1);
  eq(r.plan[0].tarea.titulo, "Válida");
});

test("seleccionarPlan: excluye tareas pendientes de respuesta", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ pendiente_respuesta: true, titulo: "Esperando" })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.plan.length, 0);
  eq(r.principal, null);
});

test("seleccionarPlan: excluye recurrentes (son hábitos, no tareas del día)", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ recurrencia_tipo: "semanal", titulo: "Hábito" })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.plan.length, 0);
});

console.log("\n── orden de las reglas ──");

test("seleccionarPlan: el compromiso inamovible gana a todo lo demás", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Ingreso con tag", tags: [TAG_INGRESOS] }),
      tarea({ titulo: "Compromiso", meta_id: m.id, fecha_fin: HOY }),
      tarea({ titulo: "Mantenimiento", esfuerzo: "10" }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.principal.tarea.titulo, "Compromiso");
  eq(r.principal.motivo.regla, "compromiso_inamovible");
});

test("seleccionarPlan: el riesgo financiero gana al riesgo operativo", () => {
  const m = meta({});
  const p = pago({ proveedor: "Sabadell", concepto: "Comisión", importe_total: 25 });
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Riesgo operativo", meta_id: m.id, fecha_fin: HOY }),
      tarea({ titulo: "Sabadell: pagar 25,00 €" }),
    ],
    metas: mapaMetas([m]),
    pagos: [p],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.principal.motivo.regla, "riesgo_financiero");
  ok(r.principal.motivo.motivo.includes("pago"), "el motivo debe mencionar el pago");
});

test("seleccionarPlan: ingresos solo con el tag explícito", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Cerrar venta", importe: 5000 })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  // Sin tag ni meta, cae en "mejora no urgente" → descartable, no entra.
  eq(r.principal, null);
  eq(r.descartables.length, 1);

  const r2 = seleccionarPlan({
    tareas: [tarea({ titulo: "Cerrar venta", tags: [TAG_INGRESOS] })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r2.principal.motivo.regla, "ingresos");
});

test("seleccionarPlan: importante no urgente entra por detrás", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Avanzar proyecto", meta_id: m.id })],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.principal.motivo.regla, "importante_no_urgente");
});

test("seleccionarPlan: una tarea corta y suelta es mantenimiento", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Revisar mensajes", esfuerzo: "10" })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.mantenimiento?.motivo.regla, "mantenimiento");
  ok(r.mantenimiento.minutosEstimados <= MINUTOS_MANTENIMIENTO, "debe ser corta");
});

test("seleccionarPlan: una tarea corta CON meta sigue siendo mantenimiento", () => {
  // El orden importa: una gestión de 15 min no es "avance en el objetivo",
  // aunque tenga meta. Si no, ocuparía el sitio de una tarea grande.
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Revisar facturas", meta_id: m.id, esfuerzo: "15" })],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.mantenimiento?.motivo.regla, "mantenimiento");
});

test("seleccionarPlan: una tarea corta CON FECHA PRÓXIMA es trabajo, no gestión", () => {
  // "Contactar con un cliente" con fecha la semana que viene es trabajo
  // programado, aunque dure 30 min: no es una gestión "de paso".
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({
        titulo: "Contactar con cliente",
        meta_id: m.id,
        esfuerzo: "30",
        fecha_fin: "2026-01-20",
      }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.mantenimiento, null, "no debe ser mantenimiento");
  // A 6 días, y siendo importante, cae en "riesgo operativo" (importante
  // y vence pronto), no en "importante no urgente".
  eq(r.principal.motivo.regla, "riesgo_operativo");
});

test("seleccionarPlan: ninguna tarea aparece en dos sitios a la vez", () => {
  // Invariante: una tarea no puede ser principal Y secundaria, ni
  // secundaria Y mantenimiento, ni principal Y mantenimiento.
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Compromiso", meta_id: m.id, fecha_fin: HOY }),
      tarea({ titulo: "Objetivo grande", meta_id: m.id }),
      tarea({ titulo: "Gestión 30", meta_id: m.id, esfuerzo: "30" }),
      tarea({ titulo: "Caminar", ambito: "personal", esfuerzo: "30" }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  const ids = [
    r.principal?.tarea.id,
    ...r.secundarias.map((s) => s.tarea.id),
    r.mantenimiento?.tarea.id,
    r.bienestar?.tarea.id,
  ].filter(Boolean);
  eq(ids.length, new Set(ids).size, "hay una tarea duplicada en el plan");
});

test("seleccionarPlan: el ámbito personal va a su propia sección de bienestar", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Caminar 30 minutos", ambito: "personal", esfuerzo: "30" })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.bienestar?.motivo.regla, "bienestar");
  // No compite con el trabajo: no es ni principal ni secundaria.
  eq(r.principal, null);
  eq(r.secundarias.length, 0);
  // Y NO es descartable: el wellbeing no se descarta, se protege.
  eq(r.descartables.length, 0);
});

test("seleccionarPlan: el bienestar no desplaza a un compromiso profesional", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Caminar", ambito: "personal", esfuerzo: "30" }),
      tarea({ titulo: "Compromiso", meta_id: m.id, fecha_fin: HOY }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.principal.tarea.titulo, "Compromiso");
  eq(r.bienestar.tarea.titulo, "Caminar");
});

test("seleccionarPlan: todo motivo es texto plano no vacío", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "A", meta_id: m.id, fecha_fin: HOY }),
      tarea({ titulo: "B", meta_id: m.id }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  for (const s of r.plan) {
    ok(typeof s.motivo.motivo === "string" && s.motivo.motivo.length > 0, "motivo vacío");
  }
});

console.log("\n── capacidad ──");

test("seleccionarPlan: capacidad verde → 1 principal + 2 secundarias", () => {
  const m = meta({});
  const tareas = [tarea({ meta_id: m.id })];
  for (let i = 0; i < 4; i++) tareas.push(tarea({ meta_id: m.id }));
  const r = seleccionarPlan({
    tareas,
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(MAX_SECUNDARIAS.alta, 2);
  eq(r.secundarias.length, 2);
  eq(r.plan.length, 3);
});

test("seleccionarPlan: capacidad amarilla → 1 principal + 1 secundaria", () => {
  const m = meta({});
  const tareas = [tarea({ meta_id: m.id })];
  for (let i = 0; i < 4; i++) tareas.push(tarea({ meta_id: m.id }));
  const r = seleccionarPlan({
    tareas,
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "amarillo",
    hoy: HOY,
  });
  eq(r.secundarias.length, 1);
  eq(r.plan.length, 2);
});

test("seleccionarPlan: capacidad roja → solo la principal", () => {
  const m = meta({});
  const tareas = [tarea({ meta_id: m.id })];
  for (let i = 0; i < 4; i++) tareas.push(tarea({ meta_id: m.id }));
  const r = seleccionarPlan({
    tareas,
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "rojo",
    hoy: HOY,
  });
  eq(r.secundarias.length, 0);
  eq(r.plan.length, 1);
});

test("seleccionarPlan: con capacidad roja no hay mantenimiento", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Revisar mensajes", esfuerzo: "10" })],
    metas: new Map(),
    pagos: [],
    capacidad: "rojo",
    hoy: HOY,
  });
  eq(r.mantenimiento, null);
});

console.log("\n── los riesgos no se silencian ──");

test("seleccionarPlan: un pago vencido aparece como aviso con capacidad roja", () => {
  const p = pago({ fecha_vencimiento: "2026-01-10", importe_total: 500 });
  const r = seleccionarPlan({
    tareas: [],
    metas: new Map(),
    pagos: [p],
    capacidad: "rojo",
    hoy: HOY,
  });
  eq(r.plan.length, 0);
  eq(r.avisos.length, 1);
  eq(r.avisos[0].tipo, "pago_vencido");
  ok(r.avisos[0].texto.includes("500"), "el aviso debe llevar el importe");
});

test("seleccionarPlan: un pago en el horizonte (30d) no genera aviso", () => {
  const p = pago({ fecha_vencimiento: "2026-02-03" });
  const r = seleccionarPlan({
    tareas: [],
    metas: new Map(),
    pagos: [p],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.avisos.length, 0);
});

test("seleccionarPlan: una tarea importante vencida genera aviso", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Entrega vencida", meta_id: m.id, fecha_fin: "2026-01-05" })],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "rojo",
    hoy: HOY,
  });
  ok(
    r.avisos.some((a) => a.tipo === "tarea_vencida"),
    "debería avisar de la tarea vencida",
  );
});

console.log("\n── determinismo ──");

test("seleccionarPlan: misma entrada → misma salida", () => {
  const m = meta({});
  const args = {
    tareas: [
      tarea({ titulo: "A", meta_id: m.id, fecha_fin: "2026-01-16" }),
      tarea({ titulo: "B", meta_id: m.id }),
      tarea({ titulo: "C", meta_id: m.id, fecha_fin: "2026-01-20" }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  };
  const a = seleccionarPlan(args);
  const b = seleccionarPlan(args);
  eq(
    a.plan.map((x) => x.tarea.titulo),
    b.plan.map((x) => x.tarea.titulo),
  );
});

test("seleccionarPlan: no muta la entrada", () => {
  const m = meta({});
  const t = tarea({ titulo: "A", meta_id: m.id });
  const copia = JSON.stringify(t);
  seleccionarPlan({
    tareas: [t],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(JSON.stringify(t), copia);
});

console.log("\n── descartables ──");

test("seleccionarPlan: lo que no entra aparece en `descartables`", () => {
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Mejorar algo más adelante" })],
    metas: new Map(),
    pagos: [],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.plan.length, 0);
  eq(r.descartables.length, 1);
  eq(r.descartables[0].tarea.titulo, "Mejorar algo más adelante");
});

console.log("\n── BUGS CORREGIDOS (reportados con datos reales) ──");

test("BUG 1: `esfuerzo` = '1' NO se interpreta como 1 minuto", () => {
  // Caso real: "He recibido una factura... que tengo que programar el
  // pago" con esfuerzo="1" (no son minutos). Decir "1 min" era MENTIRA.
  eq(minutosEstimados(tarea({ esfuerzo: "1" })), null);
  eq(minutosEstimados(tarea({ esfuerzo: "2" })), null);
  eq(minutosEstimados(tarea({ esfuerzo: "3" })), null);
  eq(minutosEstimados(tarea({ esfuerzo: "4" })), null);
});

test("BUG 1: un tiempo real SÍ se lee (≥5 o con unidad explícita)", () => {
  eq(minutosEstimados(tarea({ esfuerzo: "30" })), 30);
  eq(minutosEstimados(tarea({ esfuerzo: "45 min" })), 45);
  eq(minutosEstimados(tarea({ esfuerzo: "5" })), 5);
  // Con la unidad explícita, un número pequeño SÍ es un tiempo.
  eq(minutosEstimados(tarea({ esfuerzo: "3 min" })), 3);
  eq(minutosEstimados(tarea({ esfuerzo: "2h" })), 120);
  eq(MINUTOS_MINIMOS_ESTIMACION, 5);
});

test("BUG 2: los pagos vencidos hace mucho NO se muestran uno a uno", () => {
  // Caso real: TGSS 480 € × 3, Sabadell 577,85 € × 3, todos de hace 60-95
  // días. Son PAGOS DISTINTOS (no se fusionan), pero el ruido se agrupa.
  const p = (id, imp, venc) =>
    pago({ id, proveedor: "TGSS", concepto: "Cuota", importe_total: imp, fecha_vencimiento: venc });
  const r = seleccionarPlan({
    tareas: [],
    metas: new Map(),
    pagos: [p("p1", 480, "2025-10-01"), p("p2", 480, "2025-10-01"), p("p3", 480, "2025-10-01")],
    capacidad: "verde",
    hoy: HOY,
  });
  // Un solo aviso agrupado (no 3 líneas).
  eq(r.avisos.length, 1);
  ok(r.avisos[0].texto.includes("3 pago(s)"), r.avisos[0].texto);
  // Pero el desglose los lista TODOS: no se pierde ninguno.
  eq(r.avisos[0].detalle.length, 3);
});

test("BUG 2: un pago vencido hace poco SÍ se muestra individual", () => {
  const r = seleccionarPlan({
    tareas: [],
    metas: new Map(),
    pagos: [pago({ fecha_vencimiento: "2026-01-12", importe_total: 500 })],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.avisos.length, 1);
  eq(r.avisos[0].nivel, 0);
  eq(r.avisos[0].detalle, undefined, "no debe estar agrupado");
});

test("BUG 2: el aviso agrupado lleva el TOTAL pendiente", () => {
  const r = seleccionarPlan({
    tareas: [],
    metas: new Map(),
    pagos: [
      pago({ proveedor: "A", fecha_vencimiento: "2025-10-01", importe_total: 100 }),
      pago({ proveedor: "B", fecha_vencimiento: "2025-11-01", importe_total: 250 }),
    ],
    capacidad: "verde",
    hoy: HOY,
  });
  ok(r.avisos[0].texto.includes("350,00"), r.avisos[0].texto);
});

test("BUG 3: el motivo dice QUÉ-SE-COINCIDIÓ de verdad", () => {
  // Antes decía siempre "concepto coincidente" aunque hubiera coincidido
  // el importe (la señal más fuerte).
  const p = pago({ proveedor: "Teresa", concepto: "Suministros", importe_total: 350 });
  const t = tarea({ titulo: "He recibido una factura de suministros 350,00" });
  const r = seleccionarPlan({
    tareas: [t],
    metas: new Map(),
    pagos: [p],
    capacidad: "verde",
    hoy: HOY,
  });
  ok(r.principal.motivo.detalle.includes("importe coincidente"), r.principal.motivo.detalle);
  ok(!r.principal.motivo.detalle.includes("concepto coincidente"), r.principal.motivo.detalle);
});

test("BUG 4: una tarea importante VENCIDA entra en el plan (no solo aviso)", () => {
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({
        titulo: "Ejecutar el control del hito de Intrum",
        meta_id: m.id,
        fecha_fin: "2026-01-10",
      }),
    ],
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "media",
    hoy: HOY,
  });
  eq(r.principal.tarea.titulo, "Ejecutar el control del hito de Intrum");
  // Con meta y fecha vencida, la regla que gana es "compromiso inamovible"
  // (tiene fecha dura + señal de peso). Lo importante es que ENTRE en el
  // plan: antes sólo salía como aviso.
  ok(
    ["compromiso_inamovible", "riesgo_operativo"].includes(r.principal.motivo.regla),
    r.principal.motivo.regla,
  );
  ok(r.principal.motivo.motivo.includes("vencida"), r.principal.motivo.motivo);
  // Y no se queda en "descartable".
  eq(r.descartables.length, 0);
});

test("BUG 5: entre pagos vencidos, gana el de MAYOR importe", () => {
  const p1 = pago({ proveedor: "Teresa", concepto: "Suministros", importe_total: 350 });
  const p2 = pago({ proveedor: "AEAT", concepto: "Impuesto", importe_total: 700 });
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Factura de suministros 350,00" }),
      tarea({ titulo: "Impuesto 700,00" }),
    ],
    metas: new Map(),
    pagos: [p1, p2],
    capacidad: "verde",
    hoy: HOY,
  });
  eq(r.principal.tarea.titulo, "Impuesto 700,00");
  eq(r.principal.motivo.importePendiente, 700);
});

test("BUG 6: 'todo me arrastra' → carga MEDIA (no mínima: no es fatiga)", () => {
  // Antes: "Sí, todo me arrastra" → rojo → 0 secundarias. El sistema se
  // quedaba con 1 tarea, que es demasiado severo.
  eq(nivelDeCapacidad({ despertar: "Con energía", rueda: "Sí, todo me arrastra" }), "media");
  eq(nivelDeCapacidad({ despertar: "Agotado", rueda: "Sí, todo me arrastra" }), "minima");
  eq(nivelDeCapacidad({ despertar: "Cansado pero estable" }), "media");
  eq(nivelDeCapacidad({ despertar: "Con energía" }), "alta");
  eq(nivelDeCapacidad({ semaforo: "rojo" }), "minima");
  eq(nivelDeCapacidad({ semaforo: "amarillo" }), "media");
  eq(nivelDeCapacidad({ semaforo: "verde" }), "alta");
});

test("BUG 6: con carga media hay 1 principal + 1 secundaria", () => {
  const m = meta({});
  const tareas = [tarea({ meta_id: m.id })];
  for (let i = 0; i < 3; i++) tareas.push(tarea({ meta_id: m.id }));
  const r = seleccionarPlan({
    tareas,
    metas: mapaMetas([m]),
    pagos: [],
    capacidad: "amarillo",
    hoy: HOY,
  });
  eq(r.secundarias.length, 1);
  eq(r.plan.length, 2);
});

test("BUG: el estado crudo no se confunde con el efectivo (pagos de meses)", () => {
  // Un pago con estado='pendiente' pero fecha pasada se ve VENCIDO en
  // /pagos (v_pagos.estado_efectivo). El motor debe verlo igual.
  const p = pago({
    estado: "pendiente",
    estado_efectivo: "vencido",
    fecha_vencimiento: "2025-10-01",
    importe_total: 300,
  });
  const r = detectarRiesgosFinancieros([p], HOY);
  eq(r.length, 1);
  eq(r[0].nivel, 0);
  ok(r[0].antiguedad > DIAS_AVISO_INDIVIDUAL, "debe detectarse como antiguo");
});

console.log("\n── BUGS 8-10 (segunda ronda, datos reales) ──");

test("BUG 8: entre varios pagos de la MISMA tarea gana el de mayor importe", () => {
  // Caso real: una tarea de fianza enlaza con dos pagos (700 € y 1.000 €)
  // por la palabra "fianza". El sistema debe señalar el de 1.000 €.
  const p700 = pago({ id: "p700", proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2025-10-01" });
  const p1000 = pago({ id: "p1000", proveedor: "Intrum", concepto: "Fianza", importe_total: 1000, fecha_vencimiento: "2025-10-01" });
  const idx = indexarPagosPorTarea([p700, p1000], [tarea({ id: "t1", titulo: "Liberar la fianza" })], HOY);
  eq(idx.get("t1").pago.id, "p1000");
  eq(idx.get("t1").pago.importe_total, 1000);
});

test("BUG 8: el match FUERTE (importe) sigue ganando al débil (proveedor)", () => {
  const pDebil = pago({ id: "pd", proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2025-10-01" });
  const pFuerte = pago({ id: "pf", proveedor: "Intrum", concepto: "Fianza", importe_total: 350, fecha_vencimiento: "2025-10-01" });
  const idx = indexarPagosPorTarea(
    [pDebil, pFuerte],
    [tarea({ id: "t1", titulo: "Liberar la fianza 350,00" })],
    HOY,
  );
  eq(idx.get("t1").pago.id, "pf");
  eq(idx.get("t1").senal, "importe");
});

test("BUG 9: el texto NO dice 'vencido' si el pago vence en 20 días", () => {
  // Mentir con el estado del pago es peor que no avisar: el usuario ya
  // avisó de que no quiere alertas falsas.
  const p = pago({ proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2026-01-30" });
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Liberar la fianza" })],
    metas: new Map(),
    pagos: [p],
    capacidad: "verde",
    hoy: HOY,
  });
  ok(!r.principal.motivo.motivo.includes("vencido"), r.principal.motivo.motivo);
  ok(r.principal.motivo.motivo.includes("vence pronto"), r.principal.motivo.motivo);
  ok(r.principal.motivo.detalle.includes("vence en"), r.principal.motivo.detalle);
});

test("BUG 9: el detalle dice de verdad QUÉ coincidió", () => {
  const p = pago({ proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2025-10-01" });
  const r = seleccionarPlan({
    tareas: [tarea({ titulo: "Liberar la fianza" })],
    metas: new Map(),
    pagos: [p],
    capacidad: "verde",
    hoy: HOY,
  });
  ok(r.principal.motivo.detalle.includes("proveedor o concepto coincidente"), r.principal.motivo.detalle);
  // Y el detalle lleva también el estado real del pago.
  ok(r.principal.motivo.detalle.includes("vencido hace"), r.principal.motivo.detalle);
  // No dice la etiqueta antigua "concepto coincidente ·" suelta.
  ok(!r.principal.motivo.detalle.includes("· concepto coincidente"), r.principal.motivo.detalle);
});

test("BUG 10: DOS tareas no pueden ocupar el plan con el MISMO pago", () => {
  // Caso real: la principal y la secundaria decían las dos
  // "700,00 € · concepto coincidente" — la misma obligación, dos veces.
  const p = pago({ proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2025-10-01" });
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Redactar escrito sobre la fianza", meta_id: m.id }),
      tarea({ titulo: "Preparar plantilla sobre la fianza", meta_id: m.id }),
      tarea({ titulo: "Otra cosa con la fianza", meta_id: m.id }),
    ],
    metas: mapaMetas([m]),
    pagos: [p],
    capacidad: "alta",
    hoy: HOY,
  });
  const pagosUsados = r.plan.map((s) => s.motivo.pagoId).filter(Boolean);
  eq(new Set(pagosUsados).size, pagosUsados.length, "no hay pagos repetidos en el plan");
});

test("BUG 10: si el único pago posible está en la principal, la secundaria es otra", () => {
  const p = pago({ proveedor: "Intrum", concepto: "Fianza", importe_total: 700, fecha_vencimiento: "2025-10-01" });
  const m = meta({});
  const r = seleccionarPlan({
    tareas: [
      tarea({ titulo: "Redactar escrito sobre la fianza", meta_id: m.id }),
      tarea({ titulo: "Preparar plantilla sobre la fianza", meta_id: m.id }),
      tarea({ titulo: "Revisar el correo del banco", meta_id: m.id }),
    ],
    metas: mapaMetas([m]),
    pagos: [p],
    capacidad: "alta",
    hoy: HOY,
  });
  eq(r.principal.motivo.pagoId, p.id);
  eq(r.secundarias[0].motivo.pagoId, undefined, "la secundaria NO repite el pago");
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
