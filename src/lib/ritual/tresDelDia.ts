// ============================================================================
// ritual/tresDelDia.ts — la rejilla de LAS 3 DEL DÍA (issue #89, paso 5c).
// ----------------------------------------------------------------------------
// QUÉ ES
//   La rejilla de 7 días × 3 huecos: de las tareas que ya están repartidas
//   en /semana, cuáles 3 te comprometes a hacer cada día. El cap de 3 lo
//   impone la BD (trigger de la migration 0045); aquí solo se eligen y se
//   avisa.
//
// LA DIFERENCIA CON LAS OTRAS CAPAS (importante, se explica en pantalla)
//   · `tareas.es_wig`  → WIG de CICLO: máx 3 en todo el sistema, para
//     meses. No es diario ni depende del día.
//   · plan diario      → la PROPUESTA de la IA para hoy: cambia con el
//     estado de ánimo, se regenera.
//   · las 3 del día    → el COMPROMISO de la semana: lo elegiste tú en el
//     ritual del domingo y es lo que te sostiene.
//
// LO QUE NO HACE
//   No escribe en BD (eso es src/lib/mutations.ts).
// ============================================================================

/** Nº de tareas con las que te comprometes cada día. */
export const CAP_TRES_DEL_DIA = 3;

/** Una tarea candidata a entrar en la rejilla. */
export interface CandidataTresDelDia {
  id: string;
  titulo: string;
}

/** Lo elegido en un día: hasta 3 ids, en orden. */
export type SeleccionDia = string[];

/** Añade una tarea a la selección del día (máx 3). */
export function anadirALaSeleccion(
  seleccion: SeleccionDia,
  tareaId: string,
): SeleccionDia {
  if (seleccion.includes(tareaId)) return seleccion;
  if (seleccion.length >= CAP_TRES_DEL_DIA) return seleccion;
  return [...seleccion, tareaId];
}

/** Quita una tarea de la selección del día. */
export function quitarDeLaSeleccion(
  seleccion: SeleccionDia,
  tareaId: string,
): SeleccionDia {
  return seleccion.filter((id) => id !== tareaId);
}

/**
 * Qué tareas del día se quedan SIN comprometer: las que hay repartidas en
 * ese día y no están entre las 3 elegidas. Son "de apoyo": puede que las
 * hagas, pero no te comprometes a ellas.
 */
export function tareasDeApoyo(
  candidatas: readonly CandidataTresDelDia[],
  seleccion: SeleccionDia,
): CandidataTresDelDia[] {
  return candidatas.filter((c) => !seleccion.includes(c.id));
}

/** ¿La selección del día está completa? */
export function seleccionCompleta(seleccion: SeleccionDia): boolean {
  return seleccion.length === CAP_TRES_DEL_DIA;
}

/**
 * Cuántos huecos quedan libres en el día y qué dice la interfaz.
 * "Te sobran 2" / "Cupo lleno".
 */
export function estadoHuecos(seleccion: SeleccionDia): {
  libres: number;
  completo: boolean;
  mensaje: string;
} {
  const libres = Math.max(0, CAP_TRES_DEL_DIA - seleccion.length);
  return {
    libres,
    completo: libres === 0,
    mensaje:
      libres === 0
        ? "3 de 3. El día ya está comprometido."
        : `${seleccion.length}/3 · te ${libres === 1 ? "falta" : "faltan"} ${libres}.`,
  };
}
