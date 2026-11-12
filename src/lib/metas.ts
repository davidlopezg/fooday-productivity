// ============================================================================
// metas.ts — las reglas puras de "en qué estado está una meta".
// ----------------------------------------------------------------------------
// EL PROBLEMA (issue #35):
//   La barra de METAS de /proyectos no se movía nunca. La razón no era el
//   dibujo de la barra: era que el estado de una meta solo lo cambiaba el
//   usuario a mano (EditarMetaModal). Completar las tareas de una meta no
//   completaba la meta, así que el contador "metas completadas" se quedaba
//   en 0 para siempre aunque el trabajo estuviera hecho.
//
// LA REGLA (una sola, escrita aquí y usada por todas las pantallas):
//   · Una meta se COMPLETA sola cuando todas sus tareas vivas están hechas.
//   · Si se reabre una tarea de una meta completada, la meta vuelve a
//     "en_progreso" (ya no está cerrada: queda trabajo por hacer).
//   · Una meta sin tareas (o sin tareas vivas) NO se toca: no hay datos
//     para deducir su estado.
//   · Una meta ARCHIVADA no se toca nunca (archivar es una decisión
//     explícita del usuario, no un derivado del trabajo pendiente).
//
// TODO esto es puro (sin BD) para poder testearlo: `metas.test.mjs`.
// ============================================================================

/** Los estados que puede tener una tarea (columna `tareas.estado`). */
export type EstadoTarea =
  | "pendiente"
  | "en_progreso"
  | "bloqueada"
  | "hecha"
  | "descartada"
  | "archivada";

/** Los estados que puede tener una meta (columna `metas.estado`). */
export type EstadoMeta =
  | "sin_empezar"
  | "en_progreso"
  | "bloqueada"
  | "completada"
  | "archivada";

/** Lo mínimo de una tarea que necesita esta regla. */
export type TareaDeMeta = { estado: string };

/**
 * ¿Esta tarea cuenta para el avance de la meta?
 *
 * Las archivadas y las descartadas NO cuentan: no se van a hacer, así que
 * no deben dejar la meta eternamente a medias.
 */
export function tareaVivaParaMeta(estado: string): boolean {
  return estado !== "archivada" && estado !== "descartada";
}

/**
 * Estado que debería tener la meta según el estado de sus tareas.
 *
 * @param meta Estado actual de la meta.
 * @param tareas Todas las tareas de la meta (las vivas y las que no).
 * @returns El estado nuevo, o `null` si no hay que tocar la meta.
 */
export function estadoMetaSegunTareas(
  meta: { estado: string },
  tareas: TareaDeMeta[],
): EstadoMeta | null {
  // Una meta archivada no se resucita sola: archivar es del usuario.
  if (meta.estado === "archivada") return null;

  const vivas = tareas.filter((t) => tareaVivaParaMeta(t.estado));
  // Sin tareas vivas no hay nada que deducir: una meta sin plan puede estar
  // en cualquier estado (incluso completada a mano).
  if (vivas.length === 0) return null;

  const hechas = vivas.filter((t) => t.estado === "hecha").length;

  if (hechas === vivas.length) {
    // Todo el trabajo de la meta está hecho → la meta está completada.
    return meta.estado === "completada" ? null : "completada";
  }

  // Queda trabajo sin hacer:
  if (meta.estado === "completada") return "en_progreso";
  if (meta.estado === "sin_empezar" && hechas > 0) return "en_progreso";
  return null;
}

/**
 * Progreso 0..1 de una meta a partir de sus tareas.
 *
 * Una meta ya completada vale 1 (aunque sus tareas se hayan archivado:
 * el resultado está achieved y no se va a retar).
 */
export function progresoMeta(
  meta: { estado: string },
  tareas: TareaDeMeta[],
): number {
  if (meta.estado === "completada") return 1;
  const vivas = tareas.filter((t) => tareaVivaParaMeta(t.estado));
  if (vivas.length === 0) return 0;
  return vivas.filter((t) => t.estado === "hecha").length / vivas.length;
}

/**
 * Avance medio de un conjunto de metas (0..1).
 * Es lo que pintan las barras de /proyectos: cada meta pesa lo mismo.
 */
export function avanceMedioMetas(
  metas: Array<{ id: string; estado: string }>,
  tareasPorMeta: Map<string, TareaDeMeta[]>,
): number {
  if (metas.length === 0) return 0;
  const suma = metas.reduce(
    (acc, m) => acc + progresoMeta(m, tareasPorMeta.get(m.id) ?? []),
    0,
  );
  return suma / metas.length;
}

/** Lo mínimo de una tarea para saber a qué meta pertenece. */
export type TareaConMeta = {
  id: string;
  meta_id?: string | null;
  resultado_periodo_id?: string | null;
};

/**
 * Agrupa las tareas por la meta a la que pertenecen.
 *
 * Una tarea pertenece a una meta por DOS caminos (los dos existen en la BD):
 *   · `tareas.meta_id` → la meta directa (tarea suelta dentro de la meta).
 *   · `tareas.resultado_periodo_id` → el KR, y el KR pertenece a una meta
 *     (`resultados_periodo.meta_id`). Las tareas que viven dentro de un KR
 *     llevan las dos columnas, pero hay filas antiguas donde solo la
 *     segunda está puesta: por eso se mira el mapa `metaDeKr` como
 *     respaldo.
 *
 * @param tareas Tareas con `meta_id` y/o `resultado_periodo_id`.
 * @param metaDeKr Mapa kr_id → meta_id.
 */
export function tareasPorMeta<T extends TareaConMeta>(
  tareas: T[],
  metaDeKr: Map<string, string>,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const t of tareas) {
    const metaId =
      t.meta_id ??
      (t.resultado_periodo_id
        ? (metaDeKr.get(t.resultado_periodo_id) ?? null)
        : null);
    if (!metaId) continue;
    const arr = out.get(metaId) ?? [];
    arr.push(t);
    out.set(metaId, arr);
  }
  return out;
}
