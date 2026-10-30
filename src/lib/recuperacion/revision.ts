// ============================================================================
// recuperacion/revision.ts — Fase 7: el barrido semanal.
// ----------------------------------------------------------------------------
// QUÉ ES
//   Cada domingo (o cuando el usuario lo abra), el sistema revisa el
//   inventario y dice, tarea a tarea, qué propone hacer con cada una:
//
//     · Mantener   → sigue viva, entra en la próxima semana.
//     · Programar → tiene una fecha clara: se propone un día.
//     · Aplazar    → no es para esta semana (se va al siguiente barrido).
//     · Delegar   → no es tuya (o la puede hacer otro).
//     · Descartar → no es trabajo.
//
// POR QUÉ NO HAY LÍMITE DE PROYECTOS
//   Un tope duro frena pero no explica. Una advertencia informa y deja la
//   decisión al usuario, que es el principio del prompt. Por eso el
//   barrido avisa de "5 proyectos sin movimiento" en vez de bloquear nada.
//
// LO QUE NO HACE
//   · No aplica nada por su cuenta: propone. El usuario decide.
//   · No borra ni descarta nada sin confirmación explícita.
// ============================================================================

import type { Meta, Tarea } from "@/lib/types";
import type { Pago } from "@/lib/pagos/types";

// ============================================================================
// Tipos
// ============================================================================

/** Qué se propone hacer con una tarea en el barrido semanal. */
export type SugerenciaRevision =
  | "mantener"
  | "programar"
  | "aplazar"
  | "delegar"
  | "descartar";

/** Una tarea con su sugerencia y el porqué. */
export type RevisionTarea = {
  tarea: Tarea;
  sugerencia: SugerenciaRevision;
  /** Por qué: la explicación, en texto plano. */
  motivo: string;
  /** Qué día se propone (si la sugerencia es "programar"). */
  diaPropuesto?: string;
  /** La tarea lleva demasiado tiempo sin moverse (días). */
  diasSinAvance?: number;
};

/** Un proyecto sin movimiento: advertencia, no bloqueo. */
export type RevisionProyecto = {
  id: string;
  titulo: string;
  /** Tareas activas del proyecto. */
  tareasActivas: number;
  /** Días desde el último avance. */
  diasSinAvance: number;
  motivo: string;
};

/** Aviso de pagos: lo que hay que mirar esta semana. */
export type RevisionPagos = {
  vencidos: number;
  totalVencido: number;
  proximos: number;
  totalProximo: number;
  /** Los pagos individualizados que exigen una decisión. */
  detalle: { texto: string; nivel: number }[];
};

/** El barrido completo. */
export type ResultadoRevision = {
  tareas: RevisionTarea[];
  proyectos: RevisionProyecto[];
  pagos: RevisionPagos;
  /** Resumen legible. */
  resumen: string;
};

// ============================================================================
// Umbrales
// ============================================================================

/** Días sin avanzar a partir de los cuales un proyecto se avisa. */
export const DIAS_PROYECTO_SIN_MOVIMIENTO = 14;

/** Días sin avanzar a partir de los cuales una tarea se propone aplazar. */
export const DIAS_TAREA_APLAZABLE = 21;

/** Número de tareas listadas en el resumen (el resto va con contador). */
export const MAX_TAREAS_DETALLADAS = 12;

// ============================================================================
// Reglas
// ============================================================================

/**
 * Decide qué hacer con una tarea en el barrido.
 *
 * El orden de las reglas es lo importante: primero lo que tiene
 * compromiso (fecha, pago,meta), después lo que se puede mover, y al final
 * lo que no es trabajo.
 */
export function sugerirRevision(tarea: Tarea, args: {
  /** Hoy en formato YYYY-MM-DD. */
  hoy: string;
  /** ¿Hay una meta activa asociada? */
  tieneMetaActiva: boolean;
  /** ¿Está vinculada a un pago en riesgo? */
  pagoEnRiesgo?: boolean;
  /** Días desde el último avance (si se sabe). */
  diasSinAvance?: number;
}): RevisionTarea {
  const { hoy, tieneMetaActiva, pagoEnRiesgo, diasSinAvance } = args;

  // 1. Riesgo financiero: no se aplaza, se atiende. Y aquí la sugerencia
  //    es "programar": necesita una fecha.
  if (pagoEnRiesgo) {
    return {
      tarea,
      sugerencia: "programar",
      motivo:
        "Está vinculada a un pago en riesgo: necesita una fecha concreta, no es cosa de 'cuando cuadre'.",
    };
  }

  // 2. Con fecha propia y no vencida: ya está programada.
  const fecha = tarea.fecha_fin ?? tarea.deadline ?? null;
  if (fecha && fecha >= hoy) {
    return {
      tarea,
      sugerencia: "mantener",
      motivo: `Ya tiene fecha (${fecha}): se queda donde está.`,
    };
  }

  // 3. Vencida: hay que reprogramarla, no olvidarla.
  if (fecha && fecha < hoy) {
    return {
      tarea,
      sugerencia: "programar",
      motivo: `Se pasó la fecha (${fecha}) y sigue abierta: decide si entra en esta semana o se aplaza.`,
    };
  }

  // 4. Sin fecha pero con meta activa: es trabajo de verdad, la única
  //    decisión es cuándo.
  if (tieneMetaActiva) {
    return {
      tarea,
      sugerencia: "programar",
      motivo:
        "Está asociada a un objetivo activo: sin fecha no tiene día de aterrizaje.",
      diasSinAvance,
    };
  }

  // 5. Sin meta y sin fecha: es trabajo huérfano. La pregunta es si
  //    pertenece a un objetivo o si no es trabajo.
  return {
    tarea,
    sugerencia: "aplazar",
    motivo:
      "No tiene fecha ni objetivo asociado: si no entra en un objetivo, no es trabajo todavía.",
    diasSinAvance,
  };
}

/**
 * Calcula el barrido semanal completo.
 */
export function calcularRevision(args: {
  tareas: Tarea[];
  metas: Meta[];
  pagos: Pago[];
  /** Hoy en formato YYYY-MM-DD. */
  hoy: string;
  /** Proyectos con su conteo de tareas activas y su último avance. */
  proyectos?: {
    id: string;
    titulo: string;
    tareasActivas: number;
    diasSinAvance: number;
  }[];
  /** Días por día de la semana (para proponer días). */
  diasSemana?: string[];
}): ResultadoRevision {
  const { tareas, metas, pagos, hoy, proyectos = [] } = args;

  const metaActivaIds = new Set(
    metas
      .filter((m) => m.estado !== "archivada" && m.estado !== "completada")
      .map((m) => m.id),
  );

  // ── Pagos en riesgo (para el cruce pago ↔ tarea) ──
  const pagosEnRiesgo = pagos.filter((p) => {
    const estado =
      (p as { estado_efectivo?: string }).estado_efectivo ?? p.estado;
    if (estado === "pagado" || estado === "anulado") return false;
    const pendiente = (p.importe_total ?? 0) - (p.importe_pagado ?? 0);
    if (pendiente <= 0.005) return false;
    const dias = diasEntre(hoy, p.fecha_vencimiento);
    return dias != null && dias <= 30;
  });

  // ── Pagos: resumen + los que exigen decisión esta semana ──
  let totalVencido = 0;
  let vencidos = 0;
  let totalProximo = 0;
  let proximos = 0;
  const detallePagos: { texto: string; nivel: number }[] = [];
  for (const p of pagosEnRiesgo) {
    const pendiente = (p.importe_total ?? 0) - (p.importe_pagado ?? 0);
    const dias = diasEntre(hoy, p.fecha_vencimiento);
    if (dias == null) continue;
    const etiqueta = p.proveedor || p.concepto || "obligación";
    if (dias < 0) {
      vencidos++;
      totalVencido += pendiente;
      detallePagos.push({
        texto: `${etiqueta}: ${formatearEuros(pendiente)} vencido hace ${Math.abs(dias)} día(s)`,
        nivel: 0,
      });
    } else {
      proximos++;
      totalProximo += pendiente;
      if (dias <= 7) {
        detallePagos.push({
          texto: `${etiqueta}: ${formatearEuros(pendiente)} vence en ${dias} día(s)`,
          nivel: 1,
        });
      }
    }
  }
  detallePagos.sort((a, b) => a.nivel - b.nivel);

  // ── Tareas ──
  const revisadas: RevisionTarea[] = [];
  for (const t of tareas) {
    // ¿Está vinculada a un pago en riesgo? (mismo criterio textual que el
    // motor diario: importe o proveedor/concepto).
    const pagoVinculado = pagosEnRiesgo.find((p) => coincide(p, t));
    const r = sugerirRevision(t, {
      hoy,
      tieneMetaActiva: !!(t.meta_id && metaActivaIds.has(t.meta_id)),
      pagoEnRiesgo: !!pagoVinculado,
      diasSinAvance: diasDesde(t.updated_at, hoy),
    });
    revisadas.push(r);
  }

  // Orden: primero lo que exige decisión (programar), luego lo que se
  // puede aplazar, luego el resto.
  const orden: SugerenciaRevision[] = ["programar", "aplazar", "mantener", "delegar", "descartar"];
  revisadas.sort((a, b) => {
    const d = orden.indexOf(a.sugerencia) - orden.indexOf(b.sugerencia);
    if (d !== 0) return d;
    // A igual sugerencia, primero la que lleva más tiempo parada.
    return (b.diasSinAvance ?? 0) - (a.diasSinAvance ?? 0);
  });

  // ── Proyectos sin movimiento: AVISO, no bloqueo ──
  const revisionProyectos: RevisionProyecto[] = proyectos
    .filter((p) => p.tareasActivas > 0 && p.diasSinAvance >= DIAS_PROYECTO_SIN_MOVIMIENTO)
    .map((p) => ({
      id: p.id,
      titulo: p.titulo,
      tareasActivas: p.tareasActivas,
      diasSinAvance: p.diasSinAvance,
      motivo: `Tiene ${p.tareasActivas} tarea(s) activa(s) y nada se mueve desde hace ${p.diasSinAvance} días. No se bloquea nada: decide tú si sigue vivo, se reduce o se archiva.`,
    }));

  const resumen = construirResumenRevision({
    revisadas,
    proyectos: revisionProyectos,
    vencidos,
    totalVencido,
    proximos,
    totalProximo,
  });

  return {
    tareas: revisadas,
    proyectos: revisionProyectos,
    pagos: {
      vencidos,
      totalVencido,
      proximos,
      totalProximo,
      detalle: detallePagos,
    },
    resumen,
  };
}

/** Resumen legible del barrido. */
export function construirResumenRevision(args: {
  revisadas: RevisionTarea[];
  proyectos: RevisionProyecto[];
  vencidos: number;
  totalVencido: number;
  proximos: number;
  totalProximo: number;
}): string {
  const { revisadas, proyectos, vencidos, totalVencido, proximos } = args;
  const partes: string[] = [];

  const aProgramar = revisadas.filter((r) => r.sugerencia === "programar").length;
  const aAplazar = revisadas.filter((r) => r.sugerencia === "aplazar").length;
  const mantener = revisadas.filter((r) => r.sugerencia === "mantener").length;

  if (aProgramar) partes.push(`${aProgramar} para programar`);
  if (aAplazar) partes.push(`${aAplazar} sin objetivo ni fecha`);
  if (mantener) partes.push(`${mantener} ya programadas`);

  const pagosTxt =
    vencidos > 0
      ? `${vencidos} pago(s) vencido(s) (${formatearEuros(totalVencido)})`
      : proximos > 0
        ? `${proximos} pago(s) por vencer`
        : "pagos al día";

  const proyectosTxt =
    proyectos.length > 0 ? `${proyectos.length} proyecto(s) sin movimiento` : "";

  const base = partes.length > 0 ? partes.join(" · ") : "Nada que revisar";
  return `${base} · ${pagosTxt}${proyectosTxt ? ` · ${proyectosTxt}` : ""}`;
}

// ============================================================================
// Utilidades
// ============================================================================

/** ¿Coincide este pago con esta tarea? (importe o proveedor/concepto) */
function coincide(pago: Pago, tarea: Tarea): boolean {
  const texto = normalizar(`${tarea.titulo} ${tarea.descripcion ?? ""}`);
  const pendiente = (pago.importe_total ?? 0) - (pago.importe_pagado ?? 0);

  // Importe: el pendiente aparece en el texto (con o sin decimales).
  if (pendiente > 0) {
    const conComa = pendiente.toFixed(2).replace(".", ",");
    const sinComa = pendiente.toFixed(0);
    if (texto.includes(normalizar(conComa)) || texto.includes(normalizar(sinComa))) {
      return true;
    }
  }

  // Proveedor o concepto: una palabra significativa.
  const palabras = normalizar(`${pago.proveedor} ${pago.concepto}`)
    .split(" ")
    .filter((p) => p.length >= 4);
  return palabras.some((p) => texto.includes(p));
}

/** Minúsculas, sin acentos ni puntuación. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Días entre dos fechas ISO (positivo = futuro). */
export function diasEntre(hoyIso: string, fechaIso: string): number | null {
  if (!fechaIso) return null;
  const a = new Date(hoyIso + "T00:00:00");
  const b = new Date(fechaIso + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Días desde una fecha ISO hasta hoy. */
export function diasDesde(fechaIso: string | null | undefined, hoyIso: string): number | undefined {
  if (!fechaIso) return undefined;
  const d = diasEntre(fechaIso.slice(0, 10), hoyIso);
  return d == null ? undefined : Math.abs(d);
}

/** Formatea un importe como euros (es-ES). */
export function formatearEuros(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}
