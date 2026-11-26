// ============================================================================
// ritualSemanal.ts — la capa de datos del RITUAL SEMANAL (issue #87).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Funciones PURAS (sin red, sin React) que el ritual semanal necesita:
//   qué estados cuentan como "tarea activa", cuál es el cupo, qué fases
//   existen y cómo se serializa una fila de la bitácora.
//
// POR QUÉ ES UN FICHERO APARTE
//   El cupo y los estados son REGLAS DE NEGOCIO, no detalles de pantalla:
//   si viven en un componente, dos pantallas los aplican distinto. Aquí
//   viven en un sitio y se testean (src/lib/ritualSemanal.test.mjs).
//
// LO QUE NO HACE
//   No escribe en BD (eso es src/lib/mutations.ts) ni decide por la
//   persona: el cupo avisa, la BD lo impone (trigger de 0043).
// ============================================================================

import type { EstadoTarea, Tarea } from "@/lib/types";

/** Estados en los que una tarea CUENTA como activa (cupo de 10). */
export const ESTADOS_ACTIVOS_TAREA: readonly EstadoTarea[] = [
  "pendiente",
  "en_progreso",
  "bloqueada",
];

/** Cupo de tareas activas del ritual semanal. Lo impone la BD (0043). */
export const CUPO_TAREAS_ACTIVAS = 10;

/**
 * Catálogo de fases de meta por defecto. Editable en /configuracion
 * (tabla `config_listas`, clave "fases_meta"); esta lista es el fallback
 * cuando el usuario no ha configurado ninguna.
 */
export const FASES_META_POR_DEFECTO: readonly string[] = [
  "exploración",
  "construcción",
  "lanzamiento",
  "consolidación",
];

/** Clave de la lista configurable de fases. */
export const CLAVE_FASES_META = "fases_meta";

/** ¿Esta tarea cuenta como activa (ocupa plaza del cupo)? */
export function tareaEsActiva(t: Pick<Tarea, "estado">): boolean {
  return ESTADOS_ACTIVOS_TAREA.includes(t.estado);
}

/** Nº de tareas activas de una lista. */
export function contarActivas(tareas: Array<Pick<Tarea, "estado">>): number {
  return tareas.filter(tareaEsActiva).length;
}

/**
 * Estado del cupo: cuántas activas hay, cuántas quedan y qué dice.
 * `excedido` solo puede aparecer si alguien escribió por fuera de la app:
 * la BD lo impide (trigger de 0043), pero la UI tiene que poder contarlo.
 */
export function estadoCupo(tareas: Array<Pick<Tarea, "estado">>): {
  activas: number;
  cupo: number;
  libres: number;
  excedido: boolean;
  mensaje: string;
} {
  const activas = contarActivas(tareas);
  const libres = Math.max(0, CUPO_TAREAS_ACTIVAS - activas);
  const excedido = activas > CUPO_TAREAS_ACTIVAS;
  const mensaje = excedido
    ? `Hay ${activas} tareas activas: el cupo es ${CUPO_TAREAS_ACTIVAS}.`
    : libres === 0
      ? `Cupo lleno (${activas}/${CUPO_TAREAS_ACTIVAS}). Para activar otra, baja alguna a En espera.`
      : `${activas}/${CUPO_TAREAS_ACTIVAS} activas · te quedan ${libres}.`;
  return { activas, cupo: CUPO_TAREAS_ACTIVAS, libres, excedido, mensaje };
}

/**
 * Clave de comparación: sin acentos y en minúsculas, para que
 * "Construcción" y "construccion" sean la misma fase. El valor que se
 * guarda y se muestra es el primero que se vio (con su tilde).
 */
function claveFase(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Normaliza una lista de fases: sin vacíos, sin repetidos, recortada. */
export function normalizarFases(valores: unknown): string[] {
  if (!Array.isArray(valores)) return [];
  const vistos = new Map<string, string>();
  for (const v of valores) {
    if (typeof v !== "string") continue;
    const valor = v.trim();
    if (!valor) continue;
    const k = claveFase(valor);
    if (!vistos.has(k)) vistos.set(k, valor);
  }
  return [...vistos.values()];
}

/**
 * Fases finales: el catálogo por defecto + las que el usuario ya usó
 * (para no perder una fase que alguien puso y luego se borró de la lista).
 */
export function fasesDisponibles(
  configuradas: unknown,
  usadas: readonly string[] = [],
): string[] {
  const base = normalizarFases(configuradas);
  const porDefecto = FASES_META_POR_DEFECTO.filter(
    (f) => !base.some((b) => claveFase(b) === claveFase(f)),
  );
  const extra = usadas
    .map((f) => f.trim())
    .filter(
      (f) =>
        f.length > 0 &&
        !base.some((b) => claveFase(b) === claveFase(f)) &&
        !porDefecto.some((p) => claveFase(p) === claveFase(f)),
    );
  return [...base, ...porDefecto, ...extra];
}

/** Payload de la bitácora semanal (lo que se guarda al cerrar el ritual). */
export interface BitacoraSemanal {
  anio: number;
  semana_iso: number;
  metas_vivas: string[];
  wigs_meta: string[];
  krs_foco: string[];
  metas_pausadas: string[];
  tareas_activas: number;
  notas?: string | null;
}

/** Normaliza la bitácora antes de escribirla (sin duplicados ni nulls). */
export function normalizarBitacora(b: BitacoraSemanal): BitacoraSemanal {
  const ids = (xs: readonly string[]) => [...new Set(xs.filter(Boolean))];
  return {
    anio: b.anio,
    semana_iso: b.semana_iso,
    metas_vivas: ids(b.metas_vivas),
    wigs_meta: ids(b.wigs_meta).slice(0, 3),
    krs_foco: ids(b.krs_foco).slice(0, 3),
    metas_pausadas: ids(b.metas_pausadas),
    tareas_activas: b.tareas_activas,
    notas: b.notas ?? null,
  };
}

/** Etiqueta legible de una semana ISO ("2026 · semana 46"). */
export function etiquetaSemana(anio: number, semana_iso: number): string {
  return `${anio} · semana ${semana_iso}`;
}
