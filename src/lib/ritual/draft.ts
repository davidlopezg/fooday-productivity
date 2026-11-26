// ============================================================================
// draft.ts — el BORRADOR del ritual semanal (issue #88).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El estado del wizard mientras lo estás haciendo: qué has contestado de
//   cada proyecto y de cada meta, qué 3 WIGs has elegido, qué KRs has
//   marcado y en qué paso estás.
//
// POR QUÉ EXISTE UN DRAFT
//   El ritual son ~2 horas en el móvil. Si te cierras la app a mitad (o se
//   queda sin batería), no puedes perder lo que llevas. El draft se guarda
//   en el navegador (localStorage), se restaura al volver, y SOLO se limpia
//   cuando cierras la semana.
//
// QUÉ NO HACE
//   No escribe en la BD. Aquí solo se decide; escribir es cosa de
//   `src/lib/mutations.ts` (y de los pasos del wizard, que preguntan antes).
// ============================================================================

import type { EstadoMeta, Periodo, ProyectoEstado } from "@/lib/types";

/** Los 4 pasos del ritual, en orden. */
export const PASOS = [
  { id: "proyectos", titulo: "Proyectos", minutos: 10 },
  { id: "metas", titulo: "Metas", minutos: 10 },
  { id: "wigs", titulo: "WIGs de meta", minutos: 10 },
  { id: "krs", titulo: "KRs de la semana", minutos: 10 },
] as const;

export type PasoId = (typeof PASOS)[number]["id"];

/** Versión del formato del draft. Si cambia, los borradores viejos se
 *  descartan en silencio (mejor perder un draft que romper la app). */
export const VERSION_DRAFT = 1;

export interface DraftProyecto {
  /** 'vivo' | 'pausado' | 'muerto'. */
  estado?: ProyectoEstado;
  /** Motivo del bloqueo (texto libre). */
  bloqueo?: string;
  /** Situación actual escrita en el paso 1. */
  situacion?: string;
}

export interface DraftMeta {
  /** Estado decidido en el ritual (viva / en pausa / muere). */
  estado?: EstadoMeta;
  /** Fase del catálogo. */
  fase?: string | null;
  /** Si está bloqueada y por qué. */
  bloqueo?: string;
  /** Situación actual ("Status Meta"). */
  situacion?: string;
}

export interface DraftKr {
  /** WIG del CICLO (resultados_periodo.es_wig). */
  wig: boolean;
  /** Foco de ESTA semana (kr_foco_semanal). */
  foco: boolean;
}

export interface DraftRitual {
  version: number;
  anio: number;
  semana_iso: number;
  /** Paso en el que estás. */
  paso: PasoId;
  /** Respuestas por proyecto. */
  proyectos: Record<string, DraftProyecto>;
  /** Respuestas por meta. */
  metas: Record<string, DraftMeta>;
  /** Las 3 WIGs de meta, en orden (1-3). */
  wigsMeta: string[];
  /** Estado de cada KR tocado. */
  krs: Record<string, DraftKr>;
  /** Espejo: marcar WIG de KR marca también el foco semanal (y al revés). */
  espejo: boolean;
  /** Pasos que has saltado (noObligatorios). */
  saltados: PasoId[];
}

/** Draft vacío para una semana. */
export function draftVacio(anio: number, semana_iso: number): DraftRitual {
  return {
    version: VERSION_DRAFT,
    anio,
    semana_iso,
    paso: "proyectos",
    proyectos: {},
    metas: {},
    wigsMeta: [],
    krs: {},
    espejo: true,
    saltados: [],
  };
}

/** Serializa el draft (JSON). */
export function serializarDraft(d: DraftRitual): string {
  return JSON.stringify(d);
}

/**
 * Lee un draft guardado. Devuelve `null` si no hay, si el formato es de otra
 * versión o si es de OTRA semana (el ritual es semanal: un draft de la
 * semana pasada no se arrastra).
 */
export function leerDraft(
  raw: string | null,
  anio: number,
  semana_iso: number,
): DraftRitual | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<DraftRitual>;
    if (!d || d.version !== VERSION_DRAFT) return null;
    if (d.anio !== anio || d.semana_iso !== semana_iso) return null;
    const base = draftVacio(anio, semana_iso);
    return {
      ...base,
      ...d,
      proyectos: d.proyectos ?? {},
      metas: d.metas ?? {},
      wigsMeta: Array.isArray(d.wigsMeta) ? d.wigsMeta : [],
      krs: d.krs ?? {},
      espejo: d.espejo !== false,
      saltados: Array.isArray(d.saltados) ? d.saltados : [],
      paso: esPaso(d.paso) ? d.paso : "proyectos",
    } as DraftRitual;
  } catch {
    return null;
  }
}

function esPaso(p: unknown): p is PasoId {
  return PASOS.some((x) => x.id === p);
}

/**
 * Alterna un interruptor de un KR. Con el ESPEJO activo, alternar uno
 * alterna el otro (salvo que el KR no pueda entrar en el foco semanal).
 *
 * `puedeFoco` decide si el foco semanal es posible (ventana temporal).
 */
export function alternarKr(
  d: DraftRitual,
  krId: string,
  campo: "wig" | "foco",
  puedeFoco: boolean,
): DraftRitual {
  const actual = d.krs[krId] ?? { wig: false, foco: false };
  const siguiente = !actual[campo];
  let { wig, foco } = actual;

  if (campo === "wig") {
    wig = siguiente;
    if (d.espejo && puedeFoco) foco = siguiente;
  } else {
    if (!puedeFoco) {
      // No se puede enfocar: el interruptor queda como estaba.
      return d;
    }
    foco = siguiente;
    if (d.espejo) wig = siguiente;
  }

  return { ...d, krs: { ...d.krs, [krId]: { wig, foco } } };
}

/**
 * ¿Este KR puede entrar en el foco de la semana?
 *
 * MISMA REGLA que la RPC `toggle_kr_foco_semanal` (migration 0033) y que
 * `periodoCubreSemana` en queries.ts: el periodo [inicio, fin] contiene la
 * semana [lunes, domingo] si inicio <= domingo Y fin >= lunes.
 */
export function puedeEnfocar(
  periodos: ReadonlyArray<Pick<Periodo, "fecha_inicio" | "fecha_fin">>,
  lunes: string,
  domingo: string,
): boolean {
  return periodos.some((p) => p.fecha_inicio <= domingo && p.fecha_fin >= lunes);
}

/** Nº de KRs marcados como WIG de ciclo en el draft. */
export function contarWigKrs(d: DraftRitual): number {
  return Object.values(d.krs).filter((k) => k.wig).length;
}

/** Nº de KRs marcados como foco de la semana en el draft. */
export function contarFocoKrs(d: DraftRitual): number {
  return Object.values(d.krs).filter((k) => k.foco).length;
}

/** El wizard no deja pasar de 3: avisa en vez de escribir de más. */
export const CAP_WIGS = 3;
