// ============================================================================
// estatusRevision.ts — el checklist de REVISIÓN DIARIA (issue #85).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Las 9 afirmaciones de cierre que se responden con sí / no (o sin
//   responder) + "una cosa que quiero mejorar mañana". Viven en columnas
//   planas de `estatus_diarios` (migration 0044).
//
// POR QUÉ ES UN FICHERO A PARTE
//   La definición del checklist (texto, orden, grupo) la necesitan DOS
//   pantallas: el formulario (para rellenarlo) y la vista de detalle (para
//   leerlo). Si cada una lo escribiera, se desincronizarían al primer
//   cambio de texto. Aquí hay una sola lista.
//
// LO QUE NO HACE
//   No escribe en BD (eso es src/lib/mutations.ts).
// ============================================================================

import type { EstatusDiario } from "@/lib/types";

/** Campo booleano del checklist dentro de la fila del Estatus. */
export type CampoRevision =
  | "rev_trabajo_avance"
  | "rev_trabajo_sin_nuevos"
  | "rev_trabajo_cierre_razonable"
  | "rev_atencion_movil"
  | "rev_atencion_sin_interrupciones"
  | "rev_vida_familia"
  | "rev_vida_lectura"
  | "rev_vida_ejercicio"
  | "rev_vida_descanso";

/** Un ítem del checklist: un campo booleano + su enunciado. */
export interface ItemRevision {
  campo: CampoRevision;
  texto: string;
}

/** Un grupo del checklist (Trabajo / Atención / Vida personal). */
export interface GrupoRevision {
  titulo: string;
  emoji: string;
  items: ItemRevision[];
}

export const CHECKLIST_REVISION: readonly GrupoRevision[] = [
  {
    titulo: "Trabajo",
    emoji: "💼",
    items: [
      { campo: "rev_trabajo_avance", texto: "He avanzado en mi tarea principal." },
      {
        campo: "rev_trabajo_sin_nuevos",
        texto: "He evitado abrir nuevos proyectos sin necesidad.",
      },
      {
        campo: "rev_trabajo_cierre_razonable",
        texto: "He cerrado el trabajo a una hora razonable.",
      },
    ],
  },
  {
    titulo: "Atención",
    emoji: "🎯",
    items: [
      {
        campo: "rev_atencion_movil",
        texto: "He evitado el consumo automático del móvil.",
      },
      {
        campo: "rev_atencion_sin_interrupciones",
        texto: "He trabajado sin interrupciones importantes.",
      },
    ],
  },
  {
    titulo: "Vida personal",
    emoji: "🌿",
    items: [
      {
        campo: "rev_vida_familia",
        texto: "He dedicado tiempo de calidad a mi familia.",
      },
      { campo: "rev_vida_lectura", texto: "He leído al menos 30 minutos." },
      { campo: "rev_vida_ejercicio", texto: "He caminado o hecho ejercicio." },
      {
        campo: "rev_vida_descanso",
        texto: "He tenido un momento de descanso real.",
      },
    ],
  },
];

/** Campo de la "una cosa que quiero mejorar mañana". */
export const CAMPO_MEJORA_MANANA = "rev_mejora_manana";

/** Todos los ítems, en orden, sin agrupar. */
export function itemsRevision(): ItemRevision[] {
  return CHECKLIST_REVISION.flatMap((g) => g.items);
}

/** Valor de un ítem en una entrada (null = sin responder). */
export function valorRevision(
  e: Pick<EstatusDiario, CampoRevision>,
  campo: CampoRevision,
): boolean | null {
  const v = (e as Record<string, unknown>)[campo];
  return typeof v === "boolean" ? v : null;
}

/**
 * Resultado de la revisión: cuántos ítems se respondieron, cuántos se
 * cumplen y cuáles quedan sin responder.
 */
export interface ResumenRevision {
  respondidos: number;
  cumplidos: number;
  total: number;
  /** Ítems sin responder (null). */
  pendientes: ItemRevision[];
  /** Proporción de cumplidos sobre los respondidos (0-100). */
  porcentaje: number;
}

export function resumenRevision(
  e: Pick<EstatusDiario, CampoRevision>,
): ResumenRevision {
  const items = itemsRevision();
  const pendientes: ItemRevision[] = [];
  let cumplidos = 0;
  let respondidos = 0;
  for (const it of items) {
    const v = valorRevision(e, it.campo);
    if (v === null) pendientes.push(it);
    else {
      respondidos++;
      if (v) cumplidos++;
    }
  }
  const porcentaje = respondidos === 0 ? 0 : Math.round((cumplidos / respondidos) * 100);
  return { respondidos, cumplidos, total: items.length, pendientes, porcentaje };
}
