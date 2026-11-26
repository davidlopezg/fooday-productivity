// ============================================================================
// tareas/filtros.ts — el filtro de la tabla de /tareas, como función pura.
//
// QUÉ ES
//   Antes el filtro vivía dentro del componente `TasksTable` (un useMemo con
//   seis `if`). Eso lo hacía imposible de testear y escondía un problema real
//   (issue #98): las tareas que viven DENTRO de un KR no se distinguían de
//   las demás, y el filtro de estado por defecto ("activas") escondía
//   justamente las que el usuario ve en la vista de KR de /metas/detalle
//   (las ya completadas). El usuario veía sus tareas en el KR y no las
//   encontraba en la lista.
//
// POR QUÉ ES UN MÓDULO
//   · Se puede testear sin React ni BD (los tests del repo son .mjs sueltos).
//   · El filtro de KR vive aquí, no en el componente: la lista y el "cuántas
//     me faltan" usan EXACTAMENTE la misma regla (si no, el contador miente).
//   · `contarOcultas` responde a la pregunta del usuario: "¿qué está
//     escondiendo el filtro?" (con elKR incluido, que es lo que dolía).
//
// QUÉ NO HACE
//   No toca la BD ni decide estados: solo filtra lo que ya está cargado.
// ============================================================================

import type { Meta, Tarea } from "@/lib/types";
import { proyectoEfectivoDeTarea } from "@/lib/proyectos";

/** Los tres estados "vivos": los que la app considera trabajo abierto. */
export const ESTADOS_ACTIVOS = ["pendiente", "en_progreso", "bloqueada"];

/** Filtros de la tabla de /tareas. */
export interface FiltrosTareas {
  /** "activas" (por defecto) | "todas" | un estado concreto. */
  estado: string;
  prioridad: string;
  capa: string;
  ambito: string;
  /** Búsqueda por texto (título, código, descripción). */
  q: string;
  /** Etiquetas seleccionadas (AND: la tarea tiene al menos una). */
  tags: string[];
  /** KR concreto (`tareas.resultado_periodo_id`). Null = todos. */
  krId: string | null;
  /** Proyecto concreto (directo o derivado de su meta). Null = todos. */
  proyectoId: string | null;
}

/** Filtros vacíos = "todo visible". */
export function filtrosPorDefecto(): FiltrosTareas {
  return {
    estado: "activas",
    prioridad: "todas",
    capa: "todas",
    ambito: "todas",
    q: "",
    tags: [],
    krId: null,
    proyectoId: null,
  };
}

/** ¿Esta tarea pasa los filtros? (regla única, la usan lista y contador) */
export function esTareaVisible(
  tarea: Tarea,
  f: FiltrosTareas,
  metaById: Map<string, Meta>,
): boolean {
  if (f.estado === "activas" && !ESTADOS_ACTIVOS.includes(tarea.estado)) {
    return false;
  }
  if (f.estado !== "activas" && f.estado !== "todas" && tarea.estado !== f.estado) {
    return false;
  }
  if (f.prioridad !== "todas" && tarea.prioridad !== f.prioridad) return false;
  if (f.capa !== "todas" && tarea.capa !== f.capa) return false;
  if (f.ambito !== "todas" && tarea.ambito !== f.ambito) return false;
  if (f.krId && tarea.resultado_periodo_id !== f.krId) return false;
  if (
    f.proyectoId &&
    proyectoEfectivoDeTarea(tarea, metaById) !== f.proyectoId
  ) {
    return false;
  }
  if (f.tags.length > 0 && !(tarea.tags ?? []).some((tg) => f.tags.includes(tg))) {
    return false;
  }
  if (f.q) {
    const s = `${tarea.titulo} ${tarea.codigo ?? ""} ${tarea.descripcion ?? ""}`.toLowerCase();
    if (!s.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

/** Las tareas que pasan los filtros. */
export function filtrarTareas(
  tareas: Tarea[],
  f: FiltrosTareas,
  metaById: Map<string, Meta>,
): Tarea[] {
  return tareas.filter((t) => esTareaVisible(t, f, metaById));
}

/**
 * Cuántas tareas esconde el filtro actual (y cuántas de esas están dentro
 * de un KR). Es el contador que explica el "no aparecen todas las tareas":
 * con el filtro «Activas» las completadas de un KR quedan fuera, y el
 * usuario las ve en la vista de KR de la meta.
 */
export function contarOcultas(
  tareas: Tarea[],
  f: FiltrosTareas,
  metaById: Map<string, Meta>,
): { total: number; enKRs: number } {
  let total = 0;
  let enKRs = 0;
  for (const t of tareas) {
    if (esTareaVisible(t, f, metaById)) continue;
    total++;
    if (t.resultado_periodo_id) enKRs++;
  }
  return { total, enKRs };
}
