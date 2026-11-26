// ============================================================================
// ritualSemanal.ts — la capa de datos del RITUAL SEMANAL (issue #87).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Funciones PURAS (sin red, sin React) que el ritual semanal necesita:
//   qué fases de meta existen y cómo se serializa una fila de la bitácora.
//
// POR QUÉ ES UN FICHERO APARTE
//   Las fases y la bitácora son REGLAS DE NEGOCIO, no detalles de pantalla:
//   si viven en un componente, dos pantallas las aplican distinto. Aquí
//   viven en un sitio y se testean (src/lib/ritualSemanal.test.mjs).
//
// LO QUE NO HACE
//   No escribe en BD (eso es src/lib/mutations.ts) ni decide por la
//   persona: el cupo de tareas activas avisa, no lo impone (issue #96).
// ============================================================================

// El "cupo" de tareas activas del ritual vive en src/lib/ritual/semana.ts
// (OBJETIVO_TAREAS_SEMANA): desde la migration 0046 es ORIENTATIVO, no un
// límite que imponga la BD.

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
