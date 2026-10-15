// ============================================================================
// Matriz Eisenhower — clasificación pura (sin BD).
// ----------------------------------------------------------------------------
// Calcula para cada tarea activa:
//   · urgencia     — bucket temporal derivado de fecha_fin / deadline
//   · importancia  — bucket estratégico derivado de WIGs y meta
//   · cuadrante    — Q1..Q4 según la matriz de Eisenhower
//
// NO se persiste nada. Cada render se recalcula. Esto permite:
//   · Ver el cuadrante "real" de la tarea (puede diverger de `prioridad`)
//   · Detectar desalineamientos (tarea marcada `alta` pero vence hoy)
//   · La IA sugiere el cuadrante correcto; el apply actualiza `prioridad`.
//
// Mapping cuadrante → prioridad (lo que la app ya tiene):
//   Q1 → critica   (urgente + importante)
//   Q2 → alta      (no urgente + importante)
//   Q3 → media     (urgente + no importante)
//   Q4 → baja      (no urgente + no importante)
// ============================================================================

import type { Meta, Prioridad, Tarea } from "@/lib/types";

// ----------------------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------------------

export type Cuadrante = "Q1" | "Q2" | "Q3" | "Q4";

export type Urgencia =
  | "vencida"
  | "hoy"
  | "semana"
  | "mes"
  | "lejos"
  | "sin_fecha";

export type Importancia =
  | "wig_tarea"
  | "wig_meta"
  | "meta_activa"
  | "sin_meta";

export interface ClasificacionMatriz {
  urgencia: Urgencia;
  importancia: Importancia;
  cuadrante: Cuadrante;
  /** Días hasta vencer (negativo si vencida). null si no hay fecha. */
  diasHastaVencer: number | null;
  /** Etiqueta humana de la urgencia (para mostrar en cards). */
  urgenciaLabel: string;
  /** Etiqueta humana de la importancia (para mostrar en cards). */
  importanciaLabel: string;
}

// ----------------------------------------------------------------------------
// Constantes de UI (orden estable para no reordenar al recalcular)
// ----------------------------------------------------------------------------

export const CUADRANTES: Record<
  Cuadrante,
  { titulo: string; emoji: string; borde: string; bg: string; prioridad: Prioridad }
> = {
  Q1: {
    titulo: "Hacer YA",
    emoji: "🔴",
    borde: "border-red-500/40",
    bg: "bg-red-500/[0.03]",
    prioridad: "critica",
  },
  Q2: {
    titulo: "Planificar",
    emoji: "🔵",
    borde: "border-blue-500/40",
    bg: "bg-blue-500/[0.03]",
    prioridad: "alta",
  },
  Q3: {
    titulo: "Delegar",
    emoji: "🟡",
    borde: "border-amber-500/40",
    bg: "bg-amber-500/[0.03]",
    prioridad: "media",
  },
  Q4: {
    titulo: "Eliminar",
    emoji: "⚪",
    borde: "border-border",
    bg: "bg-muted/20",
    prioridad: "baja",
  },
};

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  vencida: "Vencida",
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Este mes",
  lejos: "Más adelante",
  sin_fecha: "Sin fecha",
};

export const IMPORTANCIA_LABEL: Record<Importancia, string> = {
  wig_tarea: "WIG-tarea",
  wig_meta: "WIG-meta",
  meta_activa: "Meta activa",
  sin_meta: "Huérfana",
};

// ----------------------------------------------------------------------------
// Funciones puras
// ----------------------------------------------------------------------------

/** Diferencia en días entre hoy (LOCAL) y la fecha objetivo (LOCAL).
 *  Negativo si la fecha ya pasó. null si la fecha es null/inválida. */
export function diasHastaFecha(iso: string | null): number | null {
  if (!iso) return null;
  // Trabajamos en local para evitar off-by-one en UTC+ como pasaba con toISOString.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / 86400000);
}

/** Bucket de urgencia a partir de los días hasta vencer. */
export function clasificarUrgencia(dias: number | null): Urgencia {
  if (dias == null) return "sin_fecha";
  if (dias < 0) return "vencida";
  if (dias === 0) return "hoy";
  if (dias <= 7) return "semana";
  if (dias <= 30) return "mes";
  return "lejos";
}

/** Bucket de importancia a partir de la tarea y sus metas. */
export function clasificarImportancia(
  tarea: Pick<Tarea, "es_wig" | "meta_id">,
  meta: Meta | undefined,
): Importancia {
  if (tarea.es_wig) return "wig_tarea";
  if (meta?.es_wig) return "wig_meta";
  if (meta && meta.estado !== "archivada" && meta.estado !== "completada") {
    return "meta_activa";
  }
  return "sin_meta";
}

/** Cuadrante Eisenhower a partir de urgencia + importancia. */
export function clasificarCuadrante(
  urgencia: Urgencia,
  importancia: Importancia,
): Cuadrante {
  const urgente = urgencia === "vencida" || urgencia === "hoy";
  const importante =
    importancia === "wig_tarea" ||
    importancia === "wig_meta" ||
    importancia === "meta_activa";
  if (urgente && importante) return "Q1";
  if (!urgente && importante) return "Q2";
  if (urgente && !importante) return "Q3";
  return "Q4";
}

/** API de una sola llamada: devuelve la clasificación completa. */
export function clasificarMatriz(
  tarea: Tarea,
  meta: Meta | undefined,
): ClasificacionMatriz {
  // Toma la fecha más restrictiva: si hay fecha_fin, manda; si no, deadline.
  const fecha = tarea.fecha_fin || null;
  const dias = fecha ? diasHastaFecha(fecha) : diasHastaFecha(tarea.deadline);
  const urgencia = clasificarUrgencia(dias);
  const importancia = clasificarImportancia(tarea, meta);
  const cuadrante = clasificarCuadrante(urgencia, importancia);
  return {
    urgencia,
    importancia,
    cuadrante,
    diasHastaVencer: dias,
    urgenciaLabel: URGENCIA_LABEL[urgencia],
    importanciaLabel: IMPORTANCIA_LABEL[importancia],
  };
}

/** Prioridad canónica de un cuadrante (para aplicar al campo `prioridad`). */
export function cuadranteAPrioridad(c: Cuadrante): Prioridad {
  return CUADRANTES[c].prioridad;
}

// ----------------------------------------------------------------------------
// Helper de orden estable (no afecta a la BD, solo al render)
// ----------------------------------------------------------------------------

const URGENCIA_ORDEN: Record<Urgencia, number> = {
  vencida: 0,
  hoy: 1,
  semana: 2,
  mes: 3,
  lejos: 4,
  sin_fecha: 5,
};

const IMPORTANCIA_ORDEN: Record<Importancia, number> = {
  wig_tarea: 0,
  wig_meta: 1,
  meta_activa: 2,
  sin_meta: 3,
};

/** Orden de pintado dentro de un cuadrante: vencidas/hoy primero, después
 *  por importancia. Devuelve un comparador para usar con `sort()`.
 *  Es ESTABLE: la prioridad manual del usuario se usa como tiebreaker. */
export function comparadorMatriz(
  metaById: Map<string, Meta | undefined>,
): (a: Tarea, b: Tarea) => number {
  return (a, b) => {
    const ca = clasificarMatriz(a, metaById.get(a.meta_id ?? ""));
    const cb = clasificarMatriz(b, metaById.get(b.meta_id ?? ""));
    // Si están en cuadrantes distintos, gana el más urgente+importante.
    // (En la práctica este comparador se aplica DENTRO de un cuadrante,
    //  así que normalmente son iguales. Lo dejo por seguridad.)
    const ua = URGENCIA_ORDEN[ca.urgencia];
    const ub = URGENCIA_ORDEN[cb.urgencia];
    if (ua !== ub) return ua - ub;
    const ia = IMPORTANCIA_ORDEN[ca.importancia];
    const ib = IMPORTANCIA_ORDEN[cb.importancia];
    if (ia !== ib) return ia - ib;
    // Tiebreaker: prioridad manual (critica > urgente > alta > media > baja).
    const PR: Record<Prioridad, number> = {
      critica: 0,
      urgente: 1,
      alta: 2,
      media: 3,
      baja: 4,
    };
    return (PR[a.prioridad ?? "media"] ?? 3) - (PR[b.prioridad ?? "media"] ?? 3);
  };
}