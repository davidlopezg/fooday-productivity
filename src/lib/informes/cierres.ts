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
//     · Metía metas archivadas en los recuentos de "con plan / sin plan"
//       y en los KRs cerrados, aunque el rótulo decía "metas activas".
//     · Enseñaba `updated_at` en la lista de metas completadas en vez de la
//       fecha real de cierre.
//
// DE DÓNDE VIENE CADA DATO
//   · Meta: `metas.fecha_cierre` (migration 0028_metas_fecha_cierre, la
//     fija el trigger `trg_metas_fecha_cierre`). Respaldo: `updated_at`.
//   · KR: `resultados_periodo.fecha_cierre` (migration 0048_kr_fecha_cierre,
//     trigger `trg_resultados_periodo_fecha_cierre`). Respaldo:
//     `updated_at`.
//   · Tareas de un KR: las que cuelgan del KR (`tareas.resultado_periodo_id`).
//
// REGLAS
//   · Una meta cuenta como cerrada si `estado = 'completada'`.
//   · Un KR cuenta como cerrado si `estado = 'completado'`.
//   · Las metas ARCHIVADAS (`estado = 'archivada'`) no cuentan: no se van a
//     hacer (ver `src/lib/metas.ts`), así que ni sus KRs ni su plan suman.
//   · La ventana es [desde, hasta] en milisegundos.
// ============================================================================

/** Estado de una meta que cuenta como cerrada. */
export const META_CERRADA = "completada";
/** Estado de una meta que no cuenta para nada (no se va a hacer). */
export const META_ARCHIVADA = "archivada";
/** Estado de un KR que cuenta como cerrado. */
export const KR_CERRADO = "completado";

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
  /** `resultados_periodo.fecha_cierre` (migration 0048). */
  fecha_cierre?: string | null;
  updated_at?: string | null;
  /** Tareas que cuelgan del KR. */
  tareas?: Array<{ estado?: string | null }>;
}

/** Una meta con sus KRs (lo que devuelve `fetchMetasConProgreso`). */
export interface MetaConPlanParaCierre {
  meta: MetaParaCierre;
  resultados: KrParaCierre[];
  total_tareas?: number;
  tareas_hechas?: number;
}

/** Un KR cerrado, con la meta de la que cuelga. */
export interface KrCerrado {
  meta: MetaParaCierre;
  kr: KrParaCierre;
  /** Fecha de cierre en ms (epoch). 0 si no se sabe. */
  fecha: number;
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

/** Fecha de cierre en texto (YYYY-MM-DD) para pintar en la lista. */
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

/**
 * Cuenta las metas cerradas.
 *
 * - Una meta cerrada es la que tiene `estado = 'completada'`.
 * - En la ventana entran las cerradas cuya fecha de cierre cae dentro.
 * - `total` son todas las metas cerradas, para poder decir "X en ventana de
 *   Y en total" y que un 0 en la ventana no se lea como "no has cerrado
 *   nada nunca".
 */
export function contarMetasCerradas<T extends MetaConPlanParaCierre>(
  metas: T[],
  desde: number,
  hasta: number,
): { enVentana: T[]; total: number } {
  const cerradas = metas.filter((m) => m.meta.estado === META_CERRADA);
  const enRango = cerradas
    .filter((m) => enVentana(fechaCierreMeta(m.meta), desde, hasta))
    .sort((a, b) => (fechaCierreMeta(b.meta) ?? 0) - (fechaCierreMeta(a.meta) ?? 0));
  return { enVentana: enRango, total: cerradas.length };
}

/**
 * Cuenta los KRs cerrados.
 *
 * - Un KR cerrado es el que tiene `estado = 'completado'`.
 * - Los KRs de una meta ARCHIVADA no cuentan: la meta no se va a hacer.
 * - En la ventana entran los cerrados cuya fecha de cierre cae dentro.
 */
export function contarKrsCerrados<T extends MetaConPlanParaCierre>(
  metas: T[],
  desde: number,
  hasta: number,
): { enVentana: KrCerrado[]; total: number } {
  const todos: KrCerrado[] = [];
  for (const m of metas) {
    if (m.meta.estado === META_ARCHIVADA) continue;
    for (const kr of m.resultados ?? []) {
      if (kr.estado !== KR_CERRADO) continue;
      todos.push({ meta: m.meta, kr, fecha: fechaCierreKr(kr) ?? 0 });
    }
  }
  const enRango = todos
    .filter((k) => enVentana(k.fecha || null, desde, hasta))
    .sort((a, b) => b.fecha - a.fecha);
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
