// ============================================================================
// Plan diario — lógica pura de los bloques (issue #73).
//
// CONTEXTO:
// Hasta ahora el plan del día era de SOLO LECTURA una vez generado: la IA
// proponía N bloques con una tarea cada uno y la persona solo podía
// renombrar o mover. El issue #73 pide tres cosas:
//
//   1. Poder AÑADIR tareas al plan ya generado (una nueva o una que ya
//      está en la base de datos de tareas y no está completada).
//   2. Poder ACTIVAR los bloques que la IA dejó desactivados.
//   3. Poder MODIFICAR la tarea que propone la IA (renombrarla, cambiarle
//      el tipo, sustituirla por otra, quitarla).
//
// Este módulo es la parte PURA de eso: no toca la BD ni la red, así que se
// puede testear sin Supabase (ver planBloques.test.mjs). Las escrituras
// viven en src/lib/mutations.ts.
//
// MODELO DE DATOS:
// Un bloque ya no lleva "una" tarea: lleva las que haya. Cada fila de
// `plan_diario_tareas` es una tarea dentro de un bloque (`bloque_num` 1-4).
// La BD no pone UNIQUE sobre (plan_diario_id, bloque_num), así que varias
// filas pueden compartir bloque. `num_bloques_activos` = nº de bloques
// DISTINTOS con al menos una tarea (no nº de filas).
// ============================================================================

export type NumeroBloque = 1 | 2 | 3 | 4;

export const NUMEROS_BLOQUE: readonly NumeroBloque[] = [1, 2, 3, 4];

/** Fila mínima de `plan_diario_tareas` que necesita esta lógica. */
export type FilaPlan = {
  /** id de la fila en `plan_diario_tareas` (la UI lo llama plan_tarea_id). */
  id?: string;
  plan_tarea_id?: string;
  bloque_num: NumeroBloque | null;
  titulo_libre?: string | null;
  tarea_id?: string | null;
  tipo_tarea?: "profunda" | "rapida" | null;
  hecho?: boolean;
  orden?: number;
};

/** Tarea de `tareas` tal y como la ve el selector de candidatas. */
export type TareaCandidata = {
  id: string;
  titulo: string;
  estado?: string | null;
  prioridad?: string | null;
  es_wig?: boolean | null;
  fecha_fin?: string | null;
  deadline?: string | null;
};

// ----------------------------------------------------------------------------
// Normalización
// ----------------------------------------------------------------------------

/** Compara títulos como lo hace la RPC `upsert_tarea_by_titulo`: sin mayúsculas
 *  y sin espacios de sobra. */
export function normalizarTitulo(titulo: string): string {
  return titulo.trim().toLowerCase().replace(/\s+/g, " ");
}

// ----------------------------------------------------------------------------
// Bloques
// ----------------------------------------------------------------------------

/**
 * Agrupa las filas del plan por bloque. Devuelve SIEMPRE los 4 bloques
 * (1-4), también los vacíos: la UI los pinta como "desactivado" y ofrece
 * activarlos.
 */
export function agruparPorBloque<T extends FilaPlan>(
  filas: T[],
): { bloque: NumeroBloque; tareas: T[] }[] {
  return NUMEROS_BLOQUE.map((bloque) => ({
    bloque,
    tareas: filas.filter((f) => f.bloque_num === bloque),
  }));
}

/**
 * Nº de bloques ACTIVOS = bloques distintos con al menos una tarea.
 * Es lo que se persiste en `planes_diarios.num_bloques_activos`.
 */
export function numBloquesActivos(filas: FilaPlan[]): number {
  const usados = new Set(
    filas
      .map((f) => f.bloque_num)
      .filter((b): b is NumeroBloque => b !== null && b !== undefined),
  );
  return usados.size;
}

/** ¿La fila pertenece al plan (y por tanto se puede editar)? */
export function esFilaDelPlan(fila: FilaPlan): boolean {
  return !!(fila.id ?? fila.plan_tarea_id);
}

/** Clave de la fila: `id` de BD o `plan_tarea_id` (la UI usa este último). */
export function claveFila(fila: FilaPlan): string | null {
  return fila.plan_tarea_id ?? fila.id ?? null;
}

// ----------------------------------------------------------------------------
// Candidatas: qué tareas de la base de datos se pueden meter en el plan
// ----------------------------------------------------------------------------

/** Una tarea está ACTIVA si no está hecha, descartada ni archivada. */
export function esTareaActiva(estado?: string | null): boolean {
  if (!estado) return true;
  return estado !== "hecha" && estado !== "descartada" && estado !== "archivada";
}

/**
 * Ordena las candidatas para que lo más accionable salga arriba:
 *   1º WIGs (son lo que mueve el día),
 *   2º con fecha de finalización (la más próxima primero),
 *   3º el resto, por título.
 */
export function ordenarCandidatas<T extends TareaCandidata>(candidatas: T[]): T[] {
  return candidatas.slice().sort((a, b) => {
    const wig = Number(!!b.es_wig) - Number(!!a.es_wig);
    if (wig !== 0) return wig;
    if (a.fecha_fin && b.fecha_fin && a.fecha_fin !== b.fecha_fin) {
      return a.fecha_fin < b.fecha_fin ? -1 : 1;
    }
    if (a.fecha_fin && !b.fecha_fin) return -1;
    if (!a.fecha_fin && b.fecha_fin) return 1;
    return a.titulo.localeCompare(b.titulo, "es");
  });
}

/**
 * Devuelve las tareas que se pueden ofrecer para meter en el plan:
 *   • solo las activas (no hechas/descartadas/archivadas),
 *   • solo las que NO están ya en el plan (por id),
 *   • filtradas por texto (título; también mira el deadline como nota),
 *   • ordenadas por accionabilidad y limitadas a `limite`.
 */
export function candidatasParaElPlan<T extends TareaCandidata>(
  tareas: T[],
  opts: {
    /** ids de tareas ya presentes en el plan (se excluyen). */
    yaEnElPlan?: string[];
    /** texto que escribe la persona (case-insensitive). */
    query?: string;
    /** máximo de candidatas devueltas (por defecto 20). */
    limite?: number;
  } = {},
): T[] {
  const yaEnElPlan = new Set(opts.yaEnElPlan ?? []);
  const q = normalizarTitulo(opts.query ?? "");

  const filtradas = tareas.filter((t) => {
    if (!esTareaActiva(t.estado)) return false;
    if (yaEnElPlan.has(t.id)) return false;
    if (!q) return true;
    const titulo = normalizarTitulo(t.titulo);
    const nota = normalizarTitulo(t.deadline ?? "");
    return titulo.includes(q) || nota.includes(q);
  });

  return ordenarCandidatas(filtradas).slice(0, opts.limite ?? 20);
}

/**
 * ¿Existe ya una tarea con ese título entre las candidatas? Sirve para no
 * crear duplicados cuando la persona escribe un título que ya está en la BD
 * (el quick-add ya usa la RPC `upsert_tarea_by_titulo`, pero el aviso previo
 * evita el viaje de ida y vuelta).
 */
export function existeTituloEnCandidatas(
  candidatas: TareaCandidata[],
  titulo: string,
): boolean {
  const n = normalizarTitulo(titulo);
  if (!n) return false;
  return candidatas.some((t) => normalizarTitulo(t.titulo) === n);
}
