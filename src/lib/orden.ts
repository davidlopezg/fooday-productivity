// ============================================================================
// orden.ts — ORDEN DE EJECUCIÓN (issue #105)
// ----------------------------------------------------------------------------
// El orden en que se ejecuta el trabajo es MANUAL y explícito en los tres
// niveles del árbol:
//
//   proyecto ──▶ meta   (`metas.orden_ejecucion`, 1..N dentro del proyecto)
//                   └──▶ KR   (`resultados_periodo.orden`, 1..N dentro de la meta)
//                          └──▶ tarea (`tareas.orden_ejecucion`, 1..N dentro del KR)
//
// Este módulo es PURO (sin Supabase, sin React): ordena, mueve elementos y
// calcula la secuencia global de ejecución. Así se puede testear con el
// harness del repo (`node --test` a pelo, ver scripts/run-tests.mjs) y se
// reutiliza en la UI y en los prompts de la IA.
//
// CONVENCIÓN
//   · `orden_ejecucion = 0` significa "sin posición" (tarea suelta, meta
//     huérfana). Al ordenar, 0 va AL FINAL: lo que no tiene orden explícito
//     no se cuela por delante de lo que sí lo tiene.
//   · Los empates se rompen por `created_at` y, en último caso, por `id`:
//     el orden es siempre estable y reproducible.
// ============================================================================

import type { Tarea } from "@/lib/types";

/** Valor que sorts "al final" un nivel sin orden (meta sin proyecto, KR
 *  sin posición, tarea sin KR). */
export const SIN_ORDEN = Number.MAX_SAFE_INTEGER;

/** Normaliza un `orden_ejecucion` de BD (0 = sin posición) al valor que
 *  usamos para comparar (sin posición = último). */
export function normalizarOrden(orden: number | null | undefined): number {
  if (orden === null || orden === undefined || !Number.isFinite(orden)) {
    return SIN_ORDEN;
  }
  return orden > 0 ? orden : SIN_ORDEN;
}

/** Compara dos elementos con `orden_ejecucion`. Los empates se rompen por
 *  `created_at` (antiguo primero) y luego por `id` (reproducible). */
export function compararPorEjecucion(
  a: { orden_ejecucion?: number | null; created_at?: string | null; id: string },
  b: { orden_ejecucion?: number | null; created_at?: string | null; id: string },
): number {
  const oa = normalizarOrden(a.orden_ejecucion);
  const ob = normalizarOrden(b.orden_ejecucion);
  if (oa !== ob) return oa - ob;
  const ca = a.created_at ?? "";
  const cb = b.created_at ?? "";
  if (ca !== cb) return ca < cb ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Devuelve una COPIA ordenada por orden de ejecución. No muta la entrada. */
export function ordenarPorEjecucion<T extends {
  orden_ejecucion?: number | null;
  created_at?: string | null;
  id: string;
}>(items: T[]): T[] {
  return items.slice().sort(compararPorEjecucion);
}

/**
 * Mueve un elemento dentro de una lista de ids.
 *
 * `delta` = -1 sube un puesto, +1 baja un puesto. Si el elemento está en el
 * borde, la lista se devuelve igual (mover el primero hacia arriba no hace
 * nada). Devuelve un array NUEVO: el caller decide cómo persistirlo.
 */
export function moverEnLista(ids: string[], id: string, delta: number): string[] {
  const i = ids.indexOf(id);
  if (i < 0 || delta === 0) return ids.slice();
  const j = i + delta;
  if (j < 0 || j >= ids.length) return ids.slice();
  const out = ids.slice();
  out.splice(i, 1);
  out.splice(j, 0, id);
  return out;
}

// ============================================================================
// Secuencia global de ejecución
// ----------------------------------------------------------------------------
// Para los prompts de la IA hace falta un NÚMERO GLOBAL: "la tarea 3 va
// antes que la tarea 7". Ese número se construye recorriendo el árbol en
// orden de ejecución:
//
//   proyecto (por `proyectos.orden`)
//     └── meta (por `metas.orden_ejecucion` dentro del proyecto)
//           └── KR (por `resultados_periodo.orden` dentro de la meta)
//                 └── tarea (por `tareas.orden_ejecucion` dentro del KR)
//
// Las tareas sin meta ni KR (bandeja global) van al final: no tienen sitio
// en el árbol.
// ============================================================================

/** Contexto needed para situar una tarea en el árbol. */
export type ContextoEjecucion = {
  /** proyecto id → `proyectos.orden` (0 = sin orden). */
  ordenProyecto: Map<string, number>;
  /** meta id → proyecto id (null = meta suelta). */
  proyectoDeMeta: Map<string, string | null>;
  /** meta id → `metas.orden_ejecucion` (0 = sin orden). */
  ordenMeta: Map<string, number>;
  /** KR id → meta id. */
  metaDeKr: Map<string, string>;
  /** KR id → `resultados_periodo.orden` (0 = sin orden). */
  ordenKr: Map<string, number>;
};

/** Contexto vacío: todo sin orden (útil en tests y degradaciones). */
export function contextoEjecucionVacio(): ContextoEjecucion {
  return {
    ordenProyecto: new Map(),
    proyectoDeMeta: new Map(),
    ordenMeta: new Map(),
    metaDeKr: new Map(),
    ordenKr: new Map(),
  };
}

/** Clave de ordenación de una tarea dentro del árbol de ejecución. */
export type ClaveEjecucion = {
  proyecto: number;
  meta: number;
  kr: number;
  tarea: number;
  created_at: string;
  id: string;
};

/** Calcula la clave de una tarea a partir del contexto. */
export function claveDeTarea(tarea: Tarea, ctx: ContextoEjecucion): ClaveEjecucion {
  const krId = tarea.resultado_periodo_id;
  const metaId = krId ? ctx.metaDeKr.get(krId) ?? null : tarea.meta_id;

  // Sin meta (bandeja global): al final de todo.
  if (!metaId) {
    return {
      proyecto: SIN_ORDEN,
      meta: SIN_ORDEN,
      kr: SIN_ORDEN,
      tarea: normalizarOrden(tarea.orden_ejecucion),
      created_at: tarea.created_at ?? "",
      id: tarea.id,
    };
  }

  const proyectoId = ctx.proyectoDeMeta.get(metaId) ?? null;
  return {
    proyecto: proyectoId
      ? normalizarOrden(ctx.ordenProyecto.get(proyectoId))
      : SIN_ORDEN,
    meta: normalizarOrden(ctx.ordenMeta.get(metaId)),
    kr: krId ? normalizarOrden(ctx.ordenKr.get(krId)) : SIN_ORDEN,
    tarea: normalizarOrden(tarea.orden_ejecucion),
    created_at: tarea.created_at ?? "",
    id: tarea.id,
  };
}

function compararClaves(a: ClaveEjecucion, b: ClaveEjecucion): number {
  if (a.proyecto !== b.proyecto) return a.proyecto - b.proyecto;
  if (a.meta !== b.meta) return a.meta - b.meta;
  if (a.kr !== b.kr) return a.kr - b.kr;
  if (a.tarea !== b.tarea) return a.tarea - b.tarea;
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Devuelve la POSICIÓN GLOBAL (1..N) de cada tarea en el orden de ejecución.
 * Las tareas que se quedan fuera (sin meta ni KR) van al final, en el orden
 * en que llegan (no se reordenan entre ellas).
 */
export function secuenciaEjecucion(
  tareas: Tarea[],
  ctx: ContextoEjecucion,
): Map<string, number> {
  const conMeta: Array<{ t: Tarea; k: ClaveEjecucion }> = [];
  const sueltas: Tarea[] = [];
  for (const t of tareas) {
    const k = claveDeTarea(t, ctx);
    if (k.meta === SIN_ORDEN && k.proyecto === SIN_ORDEN) sueltas.push(t);
    else conMeta.push({ t, k });
  }
  conMeta.sort((a, b) => compararClaves(a.k, b.k));

  const seq = new Map<string, number>();
  let pos = 1;
  for (const { t } of conMeta) seq.set(t.id, pos++);
  for (const t of sueltas) seq.set(t.id, pos++);
  return seq;
}
