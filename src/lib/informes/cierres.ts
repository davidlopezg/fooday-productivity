// ============================================================================
// informes/cierres.ts — el conteo de "lo que has cerrado" en /informes.
//
// QUÉ ES
//   La lógica que decide qué metas y qué KRs cuentan como CERRADOS y en qué
//   ventana de tiempo (issue #108). Es código PURO: no habla con Supabase,
//   solo con los datos que le pasan. Así se puede testear sin base de datos.
//
// EL PROBLEMA QUE ARREGLA
//   Antes de este módulo, /informes:
//     · No contaba los KRs cerrados (la lectura no traía `updated_at`, así
//       que el filtro `updated_at >= desde` no pasaron nunca) → 0 siempre.
//     · Sacaba la fecha de cierre del KR de `updated_at`, un proxy que
//       cambia con cualquier edición posterior.
//     · Metía metas archivadas en los recuentos de "con plan / sin plan".
//     · Enseñaba `updated_at` en la lista de metas completadas en vez de la
//       fecha real de cierre.
//
// DE DÓNDE VIENE CADA DATO
//   · Meta: `metas.fecha_cierre` (migration 0028_metas_fecha_cierre, la
//     fija el trigger `trg_metas_fecha_cierre`). Respaldo: `updated_at`.
//   · KR: `resultados_periodo.fecha_cierre` (migration 0048_kr_fecha_cierre,
//     trigger `trg_resultados_periodo_fecha_cierre`). Respaldo:
//     `updated_at`.
//   · Tareas de un KR: las que cuelgan del KR (`tareas.resultado_periodo_id`),
//     con su `completada_at` (cuándo se hicieron).
//   · Métrica de un KR: `valor_actual` frente a `valor_objetivo`.
//
// REGLAS (por qué cada una)
//   · META CERRADA: `estado = 'completada'`. Es un logro explícito: la
//     persona ha dicho "esto está hecho". Fecha: la real de cierre.
//   · META RETIRADA: `estado = 'archivada'`. NO es un logro (archivada es
//     «esto no lo voy a hacer»), pero SÍ es un movimiento de la persona
//     worthy de verse: antes no aparecía en ningún sitio. Se cuenta aparte
//     y se etiqueta, para no mezclarla con lo que sí se consiguió.
//   · KR CERRADO, por orden de prioridad:
//       1. `estado = 'completado'` → lo marcaste tú.
//       2. todas sus tareas están hechas → el trabajo está, aunque el KR
//          no se marcara (es lo que pasa en la práctica: el estado del KR
//          casi no se usa).
//       3. `valor_actual >= valor_objetivo` → el objetivo del KR se ha
//          alcanzado (esto es un OKR: el resultado, no las tareas).
//     La fecha de los derivados es la del último movimiento que lo explica:
//     la última tarea hecha (motivo "tareas") o la última actualización del
//     KR (motivo "objetivo").
//   · La ventana es [desde, hasta] en milisegundos.
// ============================================================================

/** Estado de una meta que cuenta como cerrada (logro explícito). */
export const META_CERRADA = "completada";
/** Estado de una meta que se cuenta como retirada (no como logro). */
export const META_ARCHIVADA = "archivada";
/** Estado de un KR que cuenta como cerrado. */
export const KR_CERRADO = "completado";

/** Por qué cuenta una meta. */
export type MotivoMeta = "cerrada" | "retirada";

/** Por qué cuenta un KR. */
export type MotivoKr = "completado" | "tareas" | "objetivo";

/** La parte de la meta que necesita el informe. */
export interface MetaParaCierre {
  id: string;
  codigo?: string | null;
  titulo?: string | null;
  estado?: string | null;
  ambito?: string | null;
  plazo?: string | null;
  /** `metas.fecha_cierre` (migration 0028). */
  fecha_cierre?: string | null;
  updated_at?: string | null;
}

/** La parte del KR que necesita el informe. */
export interface KrParaCierre {
  id: string;
  titulo?: string | null;
  estado?: string | null;
  metrica?: string | null;
  valor_objetivo?: number | null;
  valor_actual?: number | null;
  /** `resultados_periodo.fecha_cierre` (migration 0048). */
  fecha_cierre?: string | null;
  updated_at?: string | null;
  /** Tareas que cuelgan del KR. */
  tareas?: Array<{
    estado?: string | null;
    /** Cuándo se hizo la tarea (`tareas.completada_at`). */
    completada_at?: string | null;
  }>;
}

/** Una meta con sus KRs (lo que devuelve `fetchMetasConProgreso`). */
export interface MetaConPlanParaCierre {
  meta: MetaParaCierre;
  resultados: KrParaCierre[];
  total_tareas?: number;
  tareas_hechas?: number;
}

/** Una meta que sale en el informe de cierres. */
export interface MetaCerrada<
  T extends MetaConPlanParaCierre = MetaConPlanParaCierre,
> {
  /** La meta con su plan (para las tareas hechas). */
  plan: T;
  meta: T["meta"];
  /** Fecha de cierre (o de retirada) en ms. `null` si no se sabe. */
  fecha: number | null;
  motivo: MotivoMeta;
}

/** Un KR que sale en el informe de cierres. */
export interface KrCerrado {
  meta: MetaParaCierre;
  kr: KrParaCierre;
  /** Fecha del cierre en ms. `null` si no se sabe. */
  fecha: number | null;
  motivo: MotivoKr;
  /** Cuántas tareas del KR están hechas (sobre el total). */
  tareas: { hechas: number; total: number };
}

/** Convierte una fecha ISO en ms. `null` si no hay fecha o no se entiende. */
function aMs(fecha?: string | null): number | null {
  if (!fecha) return null;
  const t = Date.parse(fecha);
  return Number.isNaN(t) ? null : t;
}

/**
 * Fecha de cierre de una META: `fecha_cierre` (la real) y, si no la hay,
 * `updated_at` como respaldo.
 */
export function fechaCierreMeta(meta: MetaParaCierre): number | null {
  return aMs(meta.fecha_cierre) ?? aMs(meta.updated_at);
}

/**
 * Fecha de cierre de un KR: `fecha_cierre` (la real, migration 0048) y, si
 * no la hay, `updated_at` como respaldo.
 */
export function fechaCierreKr(kr: KrParaCierre): number | null {
  return aMs(kr.fecha_cierre) ?? aMs(kr.updated_at);
}

/** ¿Cae la fecha dentro de la ventana [desde, hasta]? */
export function enVentana(
  fecha: number | null,
  desde: number,
  hasta: number,
): boolean {
  if (fecha === null) return false;
  return fecha >= desde && fecha <= hasta;
}

/** Fecha en texto (YYYY-MM-DD) para pintar en la lista. */
function aTexto(ms: number | null): string {
  if (ms === null) return "—";
  return new Date(ms).toISOString().slice(0, 10);
}

/** Fecha de cierre de una META en texto (YYYY-MM-DD). */
export function fechaCierreMetaTexto(meta: MetaParaCierre): string {
  return aTexto(fechaCierreMeta(meta));
}

/** Fecha de cierre de un KR en texto (YYYY-MM-DD). */
export function fechaCierreKrTexto(kr: KrParaCierre): string {
  return aTexto(fechaCierreKr(kr));
}

/** Texto del motivo de una meta (para la lista del informe). */
export function textoMotivoMeta(motivo: MotivoMeta): string {
  return motivo === "cerrada" ? "cerrada" : "retirada (archivada)";
}

/** Texto del motivo de un KR (para la lista del informe). */
export function textoMotivoKr(
  motivo: MotivoKr,
  tareas: { hechas: number; total: number },
): string {
  if (motivo === "completado") return "cerrado";
  if (motivo === "tareas") {
    return `tareas completas (${tareas.hechas}/${tareas.total})`;
  }
  return "objetivo alcanzado";
}

/**
 * Cuenta las metas que salen en el informe de cierres.
 *
 * - `cerrada`: `estado = 'completada'` (logro explícito). Fecha: la real
 *   de cierre.
 * - `retirada`: `estado = 'archivada'` (no se va a hacer). No es un logro:
 *   se cuenta aparte y se etiqueta. Fecha: la última modificación, que es
 *   cuando se archivó.
 * - `total` son todas las metas de los dos grupos (las de la ventana más las
 *   de antes), para poder decir "X en ventana de Y en total" y que un 0 en
 *   la ventana no se lea como "no has cerrado nada nunca".
 */
export function contarMetasCerradas<T extends MetaConPlanParaCierre>(
  metas: T[],
  desde: number,
  hasta: number,
): {
  enVentana: MetaCerrada<T>[];
  total: number;
  cerradas: number;
  retiradas: number;
} {
  const cerradas: MetaCerrada<T>[] = [];
  const retiradas: MetaCerrada<T>[] = [];
  for (const plan of metas) {
    const estado = plan.meta.estado;
    if (estado === META_CERRADA) {
      cerradas.push({
        plan,
        meta: plan.meta,
        fecha: fechaCierreMeta(plan.meta),
        motivo: "cerrada",
      });
    } else if (estado === META_ARCHIVADA) {
      retiradas.push({
        plan,
        meta: plan.meta,
        fecha: fechaCierreMeta(plan.meta),
        motivo: "retirada",
      });
    }
  }
  const todas = [...cerradas, ...retiradas];
  const enRango = todas
    .filter((c) => enVentana(c.fecha, desde, hasta))
    .sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
  return {
    enVentana: enRango,
    total: todas.length,
    cerradas: cerradas.length,
    retiradas: retiradas.length,
  };
}

/** Cuántas tareas tiene hechas un KR (sobre el total). */
export function tareasDeKr(kr: KrParaCierre): {
  hechas: number;
  total: number;
} {
  const tareas = kr.tareas ?? [];
  return {
    hechas: tareas.filter((t) => t.estado === "hecha").length,
    total: tareas.length,
  };
}

/** Fecha de la última tarea hecha de un KR (la que explica el cierre). */
function fechaUltimaTareaHecha(kr: KrParaCierre): number | null {
  let max: number | null = null;
  for (const t of kr.tareas ?? []) {
    if (t.estado !== "hecha") continue;
    const ms = aMs(t.completada_at);
    if (ms === null) continue;
    if (max === null || ms > max) max = ms;
  }
  return max;
}

/**
 * Decide si un KR cuenta como cerrado y por qué.
 *
 * Prioridad: (1) marcado como `completado`; (2) todas sus tareas hechas;
 * (3) objetivo alcanzado (`valor_actual >= valor_objetivo`).
 */
export function motivoCierreKr(
  kr: KrParaCierre,
): { motivo: MotivoKr; fecha: number | null } | null {
  if (kr.estado === KR_CERRADO) {
    return { motivo: "completado", fecha: fechaCierreKr(kr) };
  }
  const tareas = tareasDeKr(kr);
  if (tareas.total > 0 && tareas.hechas === tareas.total) {
    return {
      motivo: "tareas",
      fecha: fechaUltimaTareaHecha(kr) ?? aMs(kr.updated_at),
    };
  }
  const objetivo = kr.valor_objetivo;
  const actual = kr.valor_actual;
  if (
    objetivo != null &&
    actual != null &&
    actual >= objetivo &&
    (objetivo > 0 || actual > 0)
  ) {
    return { motivo: "objetivo", fecha: aMs(kr.updated_at) };
  }
  return null;
}

/**
 * Cuenta los KRs cerrados.
 *
 * - Un KR cerrado es el que está marcado como `completado`, el que tiene
 *   TODAS sus tareas hechas o el que ha alcanzado su objetivo.
 * - La fecha es la real de cierre (migration 0048) si está marcado; si no,
 *   la del último movimiento que lo explica.
 * - `total` son todos los KRs cerrados, los de la ventana más los de antes.
 */
export function contarKrsCerrados<T extends MetaConPlanParaCierre>(
  metas: T[],
  desde: number,
  hasta: number,
): { enVentana: KrCerrado[]; total: number } {
  const todos: KrCerrado[] = [];
  for (const plan of metas) {
    for (const kr of plan.resultados ?? []) {
      const cierre = motivoCierreKr(kr);
      if (!cierre) continue;
      todos.push({
        meta: plan.meta,
        kr,
        fecha: cierre.fecha,
        motivo: cierre.motivo,
        tareas: tareasDeKr(kr),
      });
    }
  }
  const enRango = todos
    .filter((k) => enVentana(k.fecha, desde, hasta))
    .sort((a, b) => (b.fecha ?? 0) - (a.fecha ?? 0));
  return { enVentana: enRango, total: todos.length };
}

/**
 * Reparte las metas en "con plan" (tienen KRs) y "sin plan" (no tienen
 * ninguno). Las metas archivadas quedan fuera de los dos recuentos: no
 * cuentan como metas activas.
 */
export function repartirPorPlan<T extends MetaConPlanParaCierre>(
  metas: T[],
): { conPlan: T[]; sinPlan: T[]; archivadas: T[] } {
  const archivadas = metas.filter((m) => m.meta.estado === META_ARCHIVADA);
  const activas = metas.filter((m) => m.meta.estado !== META_ARCHIVADA);
  return {
    conPlan: activas.filter((m) => (m.resultados?.length ?? 0) > 0),
    sinPlan: activas.filter((m) => (m.resultados?.length ?? 0) === 0),
    archivadas,
  };
}
