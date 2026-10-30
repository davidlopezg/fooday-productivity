// ============================================================================
// recuperacion/shadow.ts — SOMBRA: la propuesta SIN escribir nada.
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un wrapper fino sobre `seleccionarPlan()` que:
//     1. junta los datos que el motor necesita (tareas, metas, pagos),
//     2. deriva la CAPACIDAD del sistema emocional que ya existe,
//     3. devuelve la propuesta YA COMPARADA con el plan que hay hoy.
//
// POR QUÉ "SHADOW" (modo sombra)
//   Esta fase NO escribe en la base de datos. Ni una fila, ni un cambio de
//   estado, ni una fecha. Solo LEE y PROPONE. El motivo es simple: un
//   sistema automático que elige mal genera más problemas que tener que
//   decidir a mano. Antes de dejar que escriba, hay que ver durante unos
//   días qué selecciona y por qué.
//
//   El modo sombra y el modo real comparten el 100% del código de selección
//   (`seleccion.ts`). La única diferencia es qué se hace con el resultado:
//   aquí, pintarlo; en el modo real, persistirlo en `plan_diario_tareas`.
//
// LA CAPACIDAD
//   No se inventa: se deriva del semáforo que la app ya calcula
//   (`planes_diarios.semaforo`). Si hoy no hay plan todavía, se usa el
//   estado emocional de HOY (los 5 selects) para estimarlo, y se marca que
//   es una estimación.
// ============================================================================

import type { Meta, PlanDiario, Tarea } from "@/lib/types";
import type { Pago } from "@/lib/pagos/types";
import {
  seleccionarPlan,
  type Capacidad,
  type ResultadoSeleccion,
  type TareaSeleccionada,
} from "./seleccion";

// ============================================================================
// Capacidad
// ============================================================================

/**
 * Deriva la capacidad del día a partir del sistema emocional que ya existe.
 *
 * La fuente principal es el semáforo del plan guardado (`verde`/`amarillo`/
 * `rojo`). Si aún no hay plan, se estima desde los 5 selects del estado
 * emocional:
 *
 *   · "Agotado" o "Todo me arrastra" → rojo
 *   · "Ansioso" o "Cansado pero estable" → amarillo
 *   · "Con energía" → verde
 *
 * `necesidad = "Contención"` o `"Claridad"` con energía baja también baja el
 * semáforo: son señales explícitas de que hoy toca poco.
 */
export function derivarCapacidad(args: {
  /** Semáforo del plan guardado hoy (si existe). */
  semaforo?: string | null;
  /** Estado emocional de HOY (si el usuario lo ha rellenado). */
  estado?: {
    despertar?: string | null;
    rueda?: string | null;
    necesidad?: string | null;
  } | null;
}): { capacidad: Capacidad; origen: "plan" | "estimado" | "por_defecto" } {
  const sem = args.semaforo;
  if (sem === "verde" || sem === "amarillo" || sem === "rojo") {
    return { capacidad: sem, origen: "plan" };
  }

  const despertar = (args.estado?.despertar ?? "").trim();
  const rueda = (args.estado?.rueda ?? "").trim();
  const necesidad = (args.estado?.necesidad ?? "").trim();

  if (
    despertar === "Agotado" ||
    rueda === "Sí, todo me arrastra" ||
    rueda === "Totalmente sobrepasado"
  ) {
    return { capacidad: "rojo", origen: "estimado" };
  }

  if (
    despertar === "Cansado pero estable" ||
    despertar === "Ansioso" ||
    necesidad === "Contención"
  ) {
    return { capacidad: "amarillo", origen: "estimado" };
  }

  if (despertar === "Con energía") {
    return { capacidad: "verde", origen: "estimado" };
  }

  // Sin información:yellow. Es la carga MEDIA, no la mínima.
  // Escribir "verde" por defecto sería lo peligroso: llenaría el día.
  return { capacidad: "amarillo", origen: "por_defecto" };
}

// ============================================================================
// Comparación con el plan actual
// ============================================================================

/** Qué ha seleccionado el motor, contrasted con lo que hay en el plan. */
export type ComparacionPlan = {
  /** Ids de tareas que el motor propone y que YA están en el plan actual. */
  coincide: string[];
  /** Ids de tareas que el motor propone y que NO están en el plan actual. */
  soloMotor: string[];
  /** Ids de tareas que están en el plan actual y el motor NO propone. */
  soloPlan: string[];
  /** ¿Hay plan guardado hoy? */
  hayPlan: boolean;
};

/**
 * Compara la propuesta del motor con el plan guardado hoy.
 * Sirve para responder "¿coincide con lo que ya hice?" sin tener que
 * comparar a ojo.
 */
export function compararConPlan(
  propuesta: ResultadoSeleccion,
  planActual: { tareas: { tarea_id: string | null }[] } | null,
): ComparacionPlan {
  const idsMotor = propuesta.plan.map((s) => s.tarea.id);
  const idsPlan = (planActual?.tareas ?? [])
    .map((t) => t.tarea_id)
    .filter((x): x is string => !!x);

  const setPlan = new Set(idsPlan);
  const setMotor = new Set(idsMotor);

  return {
    coincide: idsMotor.filter((id) => setPlan.has(id)),
    soloMotor: idsMotor.filter((id) => !setPlan.has(id)),
    soloPlan: idsPlan.filter((id) => !setMotor.has(id)),
    hayPlan: !!planActual,
  };
}

// ============================================================================
// Propuesta completa
// ============================================================================

export type PropuestaShadow = {
  resultado: ResultadoSeleccion;
  capacidad: Capacidad;
  /** De dónde salió la capacidad (plan / estimado / por defecto). */
  origenCapacidad: "plan" | "estimado" | "por_defecto";
  comparacion: ComparacionPlan;
  /** Resumen legible para el banner. */
  resumen: string;
};

/**
 * Calcula la propuesta del modo sombra. NO ESCRIBE NADA.
 */
export function calcularPropuestaShadow(args: {
  tareas: Tarea[];
  metas: Meta[];
  pagos: Pago[];
  /** Plan guardado hoy (para comparar y para derivar la capacidad). */
  planActual?: (PlanDiario & { tareas: { tarea_id: string | null }[] }) | null;
  /** Estado emocional de HOY (si el usuario lo ha rellenado). */
  estado?: {
    despertar?: string | null;
    rueda?: string | null;
    necesidad?: string | null;
  } | null;
  /** Fecha de hoy en formato YYYY-MM-DD (local). */
  hoy: string;
}): PropuestaShadow {
  const { capacidad, origen } = derivarCapacidad({
    semaforo: args.planActual?.semaforo ?? null,
    estado: args.estado ?? null,
  });

  const metaPorId = new Map(args.metas.map((m) => [m.id, m]));

  const resultado = seleccionarPlan({
    tareas: args.tareas,
    metas: metaPorId,
    pagos: args.pagos,
    capacidad,
    hoy: args.hoy,
  });

  const comparacion = compararConPlan(resultado, args.planActual ?? null);

  return {
    resultado,
    capacidad,
    origenCapacidad: origen,
    comparacion,
    resumen: construirResumen(resultado, capacidad),
  };
}

/** Una línea que resume la propuesta para el banner. */
export function construirResumen(
  r: ResultadoSeleccion,
  capacidad: Capacidad,
): string {
  const n = r.plan?.length ?? 0;
  if (n === 0) {
    return "No hay nada que el sistema proponga para hoy con estos datos.";
  }
  const partes = [`${n} tarea${n === 1 ? "" : "s"}`];
  if (r.principal) partes.push("1 principal");
  const nSec = r.secundarias?.length ?? 0;
  if (nSec) partes.push(`${nSec} secundaria${nSec === 1 ? "" : "s"}`);
  if (r.mantenimiento) partes.push("1 mantenimiento");
  if (r.bienestar) partes.push("1 de bienestar");
  const sufijo =
    capacidad === "verde"
      ? "carga completa"
      : capacidad === "amarillo"
        ? "carga media"
        : "carga mínima";
  return `${partes.join(" · ")} (${sufijo})`;
}

// ============================================================================
// Utilidades de presentación (para el componente de UI)
// ============================================================================

/** Etiqueta corta de la regla, para el chip de cada tarea. */
export const ETIQUETA_REGLA: Record<string, string> = {
  riesgo_financiero: "💰 Riesgo financiero",
  compromiso_inamovible: "📌 Compromiso",
  riesgo_operativo: "⚠️ Riesgo operativo",
  ingresos: "📈 Ingresos",
  importante_no_urgente: "🎯 Objetivo activo",
  mantenimiento: "🔧 Mantenimiento",
  bienestar: "🌿 Bienestar",
  mejora_no_urgente: "💤 Sin urgencia",
};

/** Tono del chip de la regla. */
export const TONO_REGLA: Record<string, string> = {
  riesgo_financiero:
    "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  compromiso_inamovible:
    "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  riesgo_operativo:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ingresos:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  importante_no_urgente:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  mantenimiento:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  bienestar:
    "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  mejora_no_urgente: "border-border bg-muted text-muted-foreground",
};

/** Título legible de la tarea en el shadow (con su tiempo estimado). */
export function tituloConTiempo(s: TareaSeleccionada): string {
  const base = s.tarea.titulo;
  if (s.minutosEstimados == null) return base;
  return `${base} · ${s.minutosEstimados} min`;
}
