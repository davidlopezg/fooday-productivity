// ============================================================================
// fechas.ts — las fechas de una tarea, sin adivinar.
// ----------------------------------------------------------------------------
// QUÉ ES
//   En `tareas` hay DOS cosas que se parecen a una fecha y no lo son:
//     · `deadline`  → una NOTA de texto libre ("esta semana", "mañana…",
//                     "fin de mes"). El input lo llama "Deadline (nota)".
//     · `fecha_fin` → una FECHA de verdad (columna `date` → "YYYY-MM-DD").
//
//   Este módulo las separa y devuelve SOLO fechas que existen de verdad.
//
// POR QUÉ EXISTE
//   La página /Hoy trataba `deadline` como si fuera una fecha:
//     new Date("esta semana" + "T00:00:00")  →  Invalid Date
//   y de ahí salían los badges "en NaNd" y las fechas "Invalid Date".
//   La regla nueva: si no hay fecha, NO se inventa una — se enseña el
//   texto tal cual.
//
// REGLAS
//   · Una fecha solo es válida si es YYYY-MM-DD (con hora opcional) y sus
//     componentes existen de verdad (no "2026-02-31").
//   · `fecha_fin` manda sobre `deadline` (mismo criterio que el motor del
//     Modo Recuperación y que `tareas/matriz.ts`).
//   · Todo el cálculo es en zona LOCAL (nunca `toISOString`), para que el
//     "hoy" sea el hoy del usuario y no el del servidor.
// ============================================================================

/** Resultado de mirar las fechas de una tarea. */
export type FechasTarea = {
  /** Fecha real (YYYY-MM-DD) o null si la tarea no tiene fecha. */
  fecha: string | null;
  /** `deadline` en texto libre (cuando no hay fecha real). null si no hay. */
  texto: string | null;
};

/** ¿Es este texto una fecha YYYY-MM-DD (con hora opcional) que existe? */
export function fechaISOReal(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(valor);
  if (!m) return null;
  const y = Number(m[1]);
  const mes = Number(m[2]);
  const d = Number(m[3]);
  if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
  // Comprobación real: "2026-02-31" no existe (JS lo pasa a marzo).
  const f = new Date(y, mes - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mes - 1 || f.getDate() !== d) {
    return null;
  }
  const mesTxt = String(mes).padStart(2, "0");
  const dTxt = String(d).padStart(2, "0");
  return `${m[1]}-${mesTxt}-${dTxt}`;
}

/**
 * Días enteros entre hoy (local, medianoche) y la fecha ISO (YYYY-MM-DD).
 * Negativo = ya vencida. 0 = hoy. null si la fecha no es válida.
 */
export function diasHastaFecha(fechaIso: string | null): number | null {
  const iso = fechaISOReal(fechaIso);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const objetivo = new Date(y, m - 1, d, 0, 0, 0, 0);
  const ahora = new Date();
  const hoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    0,
    0,
    0,
    0,
  );
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86400000);
}

/**
 * Las fechas de una tarea, ya separadas en "fecha de verdad" y "nota".
 *
 *   · Si hay `fecha_fin` (o un `deadline` que sea una fecha), devuelve esa.
 *   · Si solo hay `deadline` en texto libre, lo devuelve como `texto`.
 *   · Si no hay ninguna de las dos, devuelve `{ fecha: null, texto: null }`.
 */
export function fechasDeTarea(tarea: {
  fecha_fin?: string | null;
  deadline?: string | null;
}): FechasTarea {
  const fecha = fechaISOReal(tarea.fecha_fin) ?? fechaISOReal(tarea.deadline);
  if (fecha) return { fecha, texto: null };
  const nota = (tarea.deadline ?? "").trim();
  return { fecha: null, texto: nota.length > 0 ? nota : null };
}
