// ============================================================================
// proyectos.ts — regla única de "¿de qué proyecto es esta tarea?".
// ----------------------------------------------------------------------------
// EL PROBLEMA (bug de raíz, afectan a 5 pantallas):
//   Una tarea puede colgar de 3 sitios:
//     · `tareas.proyecto_id`   → proyecto directo ("tarea suelta con casa")
//     · `tareas.meta_id`       → una meta del proyecto
//     · `tareas.resultado_periodo_id` → un KR de una meta del proyecto
//   Las tareas que viven DENTRO de un KR llevan `meta_id` y
//   `resultado_periodo_id`, pero NO `proyecto_id`.
//   → Contar o filtrar solo por `tareas.proyecto_id` daba **0 tareas** en
//     los proyectos cuyas tareas están en los KRs de sus metas.
//
// LA REGLA (la misma que ya usaba el breadcrumb de TasksTable):
//   · si la tarea tiene meta → manda el proyecto de la meta;
//   · si no, o si la meta no tiene proyecto → el `proyecto_id` directo.
//
// Este módulo es el sitio único donde vive la regla. Si algún día cambia,
// se cambia aquí y todas las pantallas quedan alineadas.
// ============================================================================

import type { Meta, Tarea } from "@/lib/types";

/** Lo mínimo de una tarea que hace falta para derivar su proyecto. */
export type TareaConProyecto = Pick<Tarea, "meta_id" | "proyecto_id">;

/** Mapa id → meta (o el subconjunto con `proyecto_id`). */
export type MapaMetas<TMeta extends { proyecto_id?: string | null }> = Map<
  string,
  TMeta
>;

/**
 * Proyecto efectivo de una tarea.
 * @returns id del proyecto, o null si la tarea no pertenece a ninguno.
 */
export function proyectoEfectivoDeTarea<
  TMeta extends { proyecto_id?: string | null },
>(
  tarea: TareaConProyecto,
  metaPorId: MapaMetas<TMeta>,
): string | null {
  const meta = tarea.meta_id ? metaPorId.get(tarea.meta_id) : undefined;
  if (meta?.proyecto_id) return meta.proyecto_id;
  return tarea.proyecto_id ?? null;
}

/** Todas las tareas que pertenecen a un proyecto (por meta o directo). */
export function tareasDeProyecto<
  T extends TareaConProyecto,
  TMeta extends { proyecto_id?: string | null },
>(
  tareas: T[],
  proyectoId: string,
  metaPorId: MapaMetas<TMeta>,
): T[] {
  return tareas.filter(
    (t) => proyectoEfectivoDeTarea(t, metaPorId) === proyectoId,
  );
}

/** Agrupa tareas por proyecto efectivo. Devuelve solo los proyectos con
 *  al menos una tarea (los que no aparecen en el mapa). */
export function tareasPorProyectoEfectivo<
  T extends TareaConProyecto,
  TMeta extends { proyecto_id?: string | null },
>(
  tareas: T[],
  metaPorId: MapaMetas<TMeta>,
): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const t of tareas) {
    const pid = proyectoEfectivoDeTarea(t, metaPorId);
    if (!pid) continue;
    const arr = out.get(pid) ?? [];
    arr.push(t);
    out.set(pid, arr);
  }
  return out;
}

/** Construye el mapa id → meta a partir de un array de metas. */
export function mapaMetas(metas: Array<Pick<Meta, "id" | "proyecto_id">>): Map<
  string,
  Pick<Meta, "id" | "proyecto_id">
> {
  return new Map(metas.map((m) => [m.id, m]));
}
