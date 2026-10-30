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
  nivelDeCapacidad,
} from "./seleccion";
import type {
  Capacidad,
  NivelCapacidad,
  ResultadoSeleccion,
  TareaSeleccionada,
} from "./seleccion";
import type { CandidataDescartable } from "./seleccion";

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
 *   · "Agotado" o "Totalmente sobrepasado" → carga mínima
 *   · "Sí, todo me arrastra", "Cansado pero estable" o "Ansioso" → media
 *   · "Con energía" → carga completa
 *
 * `necesidad = "Contención"` con energía baja también baja la carga: son
 * señales explícitas de que hoy toca poco.
 *
 * NOTA: el semáforo NO se traduce 1:1 a carga. "Todo me arrastra" es
 * saturación (hagamos menos cosas), no fatiga (no puedo más): con el corte
 * 1:1, el sistema se quedaba con una sola tarea y era inútil. El corte
 * severo queda reservado para "Agotado" y para un semáforo rojo guardado.
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
}): {
  capacidad: Capacidad;
  nivel: NivelCapacidad;
  origen: "plan" | "estimado" | "por_defecto";
} {
  const sem = args.semaforo;
  const estado = args.estado ?? null;

  if (sem === "verde" || sem === "amarillo" || sem === "rojo") {
    return {
      capacidad: sem,
      nivel: nivelDeCapacidad({ semaforo: sem, ...estado }),
      origen: "plan",
    };
  }

  const despertar = (estado?.despertar ?? "").trim();
  const rueda = (estado?.rueda ?? "").trim();
  const necesidad = (estado?.necesidad ?? "").trim();

  if (
    despertar === "Agotado" ||
    rueda === "Sí, todo me arrastra" ||
    rueda === "Totalmente sobrepasado"
  ) {
    return {
      capacidad: "rojo",
      nivel: nivelDeCapacidad({ semaforo: null, ...estado }),
      origen: "estimado",
    };
  }

  if (
    despertar === "Cansado pero estable" ||
    despertar === "Ansioso" ||
    necesidad === "Contención"
  ) {
    return {
      capacidad: "amarillo",
      nivel: nivelDeCapacidad({ semaforo: null, ...estado }),
      origen: "estimado",
    };
  }

  if (despertar === "Con energía") {
    return {
      capacidad: "verde",
      nivel: nivelDeCapacidad({ semaforo: null, ...estado }),
      origen: "estimado",
    };
  }

  // Sin información: carga MEDIA, no la mínima. Escribir "verde" por
  // defecto sería lo peligroso: llenaría el día.
  return { capacidad: "amarillo", nivel: "media", origen: "por_defecto" };
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
  /** Nivel de carga efectivo (alta / media / minima). Es lo que manda
   *  sobre cuántas tareas caben: el semáforo es la entrada, el nivel es
   *  la decisión. */
  nivel: NivelCapacidad;
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
  const { capacidad, nivel, origen } = derivarCapacidad({
    semaforo: args.planActual?.semaforo ?? null,
    estado: args.estado ?? null,
  });

  const metaPorId = new Map(args.metas.map((m) => [m.id, m]));

  const resultado = seleccionarPlan({
    tareas: args.tareas,
    metas: metaPorId,
    pagos: args.pagos,
    capacidad,
    nivel,
    hoy: args.hoy,
  });

  const comparacion = compararConPlan(resultado, args.planActual ?? null);

  return {
    resultado,
    capacidad,
    nivel,
    origenCapacidad: origen,
    comparacion,
    resumen: construirResumen(resultado, nivel),
  };
}

/** Una línea que resume la propuesta para el banner. */
export function construirResumen(
  r: ResultadoSeleccion,
  nivel: NivelCapacidad,
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
    nivel === "alta"
      ? "carga completa"
      : nivel === "media"
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

// ============================================================================
// Agrupación de las descartables
// ============================================================================

/**
 * Agrupa las tareas descartables para no pintar 47 líneas iguales.
 *
 * Lo que se agrupa es la PRESENTACIÓN, nunca los datos: dentro de cada
 * grupo están TODAS las tareas, una a una. Los motivos reales del usuario
 * (sus títulos) son la información valiosa: 47 títulos distintos dan una
 * foto mucho mejor del inventario que 47 copias del mismo motivo.
 *
 * La clasificación no inventa categorías: usa datos que ya existen
 * (`ambito`, `recurrencia_tipo`, si tiene meta, si tiene fecha).
 */
export type GrupoDescartables = {
  /** Clave del grupo. */
  clave: "habitos" | "sin_objetivo" | "con_fecha" | "otros";
  /** Etiqueta legible del grupo. */
  titulo: string;
  /** Todas las tareas del grupo. */
  tareas: CandidataDescartable[];
};

/**
 * Clasifica una tarea descartable en su grupo.
 *
 * El orden importa: lo más accionable primero.
 */
export function grupoDeDescartable(d: CandidataDescartable): GrupoDescartables["clave"] {
  const t = d.tarea;
  const tieneFecha = !!(t.fecha_fin || t.deadline);
  // Un hábito o recordatorio recurrente: no son trabajo, son mantenimiento
  // de la rutina, y no tiene sentido revisarlos como backlog.
  if (t.recurrencia_tipo) return "habitos";
  // Personal (familia, salud) CON fecha: tiene que ver con una cita, un
  // médico, un trámite. Merece una decisión, no un descarte automático.
  if (t.ambito === "personal" && tieneFecha) return "con_fecha";
  // Personal SIN fecha: no es trabajo ni compromiso, es vida. Se agrupa
  // aparte para que no se confunda con un descarte.
  if (t.ambito === "personal") return "habitos";
  // Profesional con fecha: puede seguir viva.
  if (tieneFecha) return "con_fecha";
  // Profesional sin meta ni objetivo: es trabajo huérfano. Merece revisión.
  if (!t.meta_id && !t.es_wig) return "sin_objetivo";
  return "otros";
}

/** Etiquetas de los grupos. */
export const TITULO_GRUPO: Record<GrupoDescartables["clave"], string> = {
  habitos: "Hábitos y recordatorios (no son trabajo pendiente)",
  con_fecha: "Tareas con fecha (revisar: pueden seguir vivas)",
  sin_objetivo: "Trabajo sin objetivo asociado (revisar)",
  otros: "Otras tareas sin urgencia",
};

/**
 * Agrupa las descartables y las ordena por grupo.
 * Cada grupo conserva TODAS sus tareas (no se recorta nada).
 */
export function agruparDescartables(
  descartables: CandidataDescartable[],
): GrupoDescartables[] {
  const grupos = new Map<GrupoDescartables["clave"], CandidataDescartable[]>();
  for (const d of descartables) {
    const k = grupoDeDescartable(d);
    const arr = grupos.get(k) ?? [];
    arr.push(d);
    grupos.set(k, arr);
  }
  const orden: GrupoDescartables["clave"][] = [
    "habitos",
    "con_fecha",
    "sin_objetivo",
    "otros",
  ];
  return orden
    .filter((k) => grupos.has(k))
    .map((k) => ({
      clave: k,
      titulo: TITULO_GRUPO[k],
      tareas: grupos.get(k) ?? [],
    }));
}
