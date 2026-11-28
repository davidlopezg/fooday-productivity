// ============================================================================
// informe.ts — el INFORME de una semana de ritual (issue #111).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El documento de la semana: qué proyectos estaban vivos (y con qué
//   contexto), qué metas se trabajaban, cuáles eran las 3 WIGs, qué KRs
//   mandaban y qué te comprometiste cada día. Es lo que se CONSULTA en el
//   historial y lo que se DESCARGA en PDF.
//
// POR QUÉ ES UN FICHERO APARTE
//   Es una regla de negocio (qué entra en el informe y en qué orden), no un
//   detalle de pantalla: el wizard lo construye, el historial lo lee y el
//   PDF lo imprime. Si viviera en un componente, los tres lo harían
//   distinto. Aquí vive en un sitio y se testea.
//
// LO QUE NO HACE
//   No escribe en la BD (eso es src/lib/mutations.ts) ni decide qué es
//   "activo": el que decide es el wizard, que le pasa los datos ya
//   resueltos.
// ============================================================================

/** Un proyecto vivo en esa semana, con el último contexto del ritual. */
export interface InformeProyecto {
  id: string;
  nombre: string;
  /** 'vivo' | 'pausado' | 'muerto'. */
  estado: string;
  /** El último contexto escrito en el ritual de esa semana. */
  situacion: string;
}

/** Una meta que se estaba trabajando esa semana. */
export interface InformeMeta {
  id: string;
  titulo: string;
  /** Nombre del proyecto al que pertenece (si tiene). */
  proyecto: string | null;
  estado: string;
  fase: string | null;
  /** El "Status Meta" de esa semana. */
  situacion: string;
}

/** Una WIG de meta (las 3 que mandan). */
export interface InformeWig {
  id: string;
  titulo: string;
}

/** Un KR: WIG del ciclo y/o foco de esa semana. */
export interface InformeKr {
  id: string;
  titulo: string;
  /** Nombre de la meta a la que pertenece. */
  meta: string | null;
  /** WIG del ciclo (trimestre). */
  wig: boolean;
  /** Foco de esta semana. */
  foco: boolean;
}

/** Una tarea comprometida (de las 3 del día). */
export interface InformeTarea {
  id: string;
  titulo: string;
  estado: string;
}

/** Un día de la semana con sus 3 tareas comprometidas. */
export interface InformeDia {
  /** 1 = lunes … 7 = domingo. */
  dia: number;
  nombre: string;
  /** YYYY-MM-DD del día concreto. */
  fecha: string;
  tareas: InformeTarea[];
}

/** El informe completo de una semana (lo que se guarda y se imprime). */
export interface InformeRitual {
  proyectos: InformeProyecto[];
  metas: InformeMeta[];
  wigs_meta: InformeWig[];
  krs: InformeKr[];
  dias: InformeDia[];
}

/** Lo que el wizard le pasa al constructor: datos ya resueltos. */
export interface EntradaInforme {
  /** Todos los proyectos con su estado ('vivo' | 'pausado' | 'muerto'). */
  proyectos: Array<{ id: string; nombre: string; estado: string }>;
  /** Último contexto escrito en el ritual, por proyecto. */
  contextoProyectos: Record<string, string>;
  /** Todas las metas con su estado, fase y situación. */
  metas: Array<{
    id: string;
    titulo: string;
    proyecto: string | null;
    estado: string;
    fase: string | null;
    situacion: string;
  }>;
  /** Contexto escrito en el ritual, por meta. */
  contextoMetas: Record<string, string>;
  /** Ids de las 3 WIGs de meta, en orden. */
  wigsMeta: string[];
  /** Todos los KRs con su meta y su marca de WIG de ciclo. */
  krs: Array<{
    id: string;
    titulo: string;
    meta: string | null;
    wig: boolean;
  }>;
  /** Ids de los KRs en foco de la semana. */
  focoKrs: string[];
  /** Los 7 días (lunes … domingo) con su fecha. */
  dias: Array<{ dia: number; nombre: string; fecha: string }>;
  /** Las 3 tareas comprometidas de cada día: "1" → ids de tareas. */
  tareasDia: Record<string, string[]>;
  /** Tareas (id → título y estado) para resolver los ids. */
  tareas: Array<{ id: string; titulo: string; estado: string }>;
}

/** Estados de meta que NO se consideran "en juego" esa semana. */
export const ESTADOS_META_FUERA = [
  "pausada",
  "completada",
  "archivada",
] as const;

/**
 * Construye el informe de la semana a partir de lo que el wizard ha
 * resuelto. Determinista: mismos datos → mismo informe.
 */
export function construirInforme(e: EntradaInforme): InformeRitual {
  const metasPorId = new Map(e.metas.map((m) => [m.id, m]));
  const tareasPorId = new Map(e.tareas.map((t) => [t.id, t]));

  // 1) PROYECTOS: los que estaban VIVOS esa semana, con su contexto.
  const proyectos: InformeProyecto[] = e.proyectos
    .filter((p) => (p.estado || "vivo") === "vivo")
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado || "vivo",
      situacion: (e.contextoProyectos[p.id] ?? "").trim(),
    }));

  // 2) METAS: las que se estaban trabajando (ni pausadas ni cerradas).
  const metas: InformeMeta[] = e.metas
    .filter((m) => !ESTADOS_META_FUERA.includes(m.estado as never))
    .map((m) => ({
      id: m.id,
      titulo: m.titulo,
      proyecto: m.proyecto ?? null,
      estado: m.estado,
      fase: m.fase ?? null,
      situacion: (e.contextoMetas[m.id] ?? m.situacion ?? "").trim(),
    }));

  // 3) LAS 3 WIGs DE META, en el orden elegido.
  const wigs_meta: InformeWig[] = e.wigsMeta
    .map((id) => metasPorId.get(id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map((m) => ({ id: m.id, titulo: m.titulo }));

  // 4) LOS KRs: los del ciclo (WIG) y los del foco de la semana.
  const foco = new Set(e.focoKrs);
  const krs: InformeKr[] = e.krs
    .filter((k) => k.wig || foco.has(k.id))
    .map((k) => ({
      id: k.id,
      titulo: k.titulo,
      meta: k.meta ?? null,
      wig: k.wig,
      foco: foco.has(k.id),
    }));

  // 5) LA SEMANA: 7 días con sus 3 tareas comprometidas.
  const dias: InformeDia[] = e.dias.map((d) => ({
    dia: d.dia,
    nombre: d.nombre,
    fecha: d.fecha,
    tareas: (e.tareasDia[String(d.dia)] ?? [])
      .map((id) => tareasPorId.get(id))
      .filter((t): t is NonNullable<typeof t> => !!t)
      .map((t) => ({ id: t.id, titulo: t.titulo, estado: t.estado })),
  }));

  return { proyectos, metas, wigs_meta, krs, dias };
}

/**
 * Lee el informe guardado en la BD (jsonb). Devuelve `null` si no hay o si
 * no tiene la forma esperada (una semana guardada antes de la migration
 * 0049, o un jsonb corrupto): el historial la reconstruye desde los ids.
 */
export function leerInforme(valor: unknown): InformeRitual | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Partial<InformeRitual>;
  if (!Array.isArray(v.proyectos) || !Array.isArray(v.dias)) return null;
  return {
    proyectos: v.proyectos.filter((p) => p && typeof p.id === "string"),
    metas: Array.isArray(v.metas) ? v.metas : [],
    wigs_meta: Array.isArray(v.wigs_meta) ? v.wigs_meta : [],
    krs: Array.isArray(v.krs) ? v.krs : [],
    dias: v.dias.filter((d) => d && typeof d.dia === "number"),
  } as InformeRitual;
}

/** Resumen de una semana (lo que se ve en la lista del historial). */
export interface ResumenInforme {
  proyectos: number;
  metas: number;
  wigs: number;
  krs: number;
  tareas: number;
}

/** Cuenta lo que hay en el informe (para la lista del historial). */
export function resumenInforme(i: InformeRitual): ResumenInforme {
  return {
    proyectos: i.proyectos.length,
    metas: i.metas.length,
    wigs: i.wigs_meta.length,
    krs: i.krs.length,
    tareas: i.dias.reduce((n, d) => n + d.tareas.length, 0),
  };
}

/**
 * Reconstruye el informe de una semana que se guardó SIN informe (antes de
 * la migration 0049): con los ids de la bitácora y los nombres de ahora.
 * Sirve para que las semanas viejas también se puedan consultar y bajar.
 */
export function informeDesdeBitacora(
  fila: {
    metas_vivas: string[];
    wigs_meta: string[];
    krs_foco: string[];
  },
  ctx: {
    metas: Array<{
      id: string;
      titulo: string;
      proyecto: string | null;
      estado: string;
      fase: string | null;
      situacion: string;
    }>;
    krs: Array<{ id: string; titulo: string; meta: string | null; wig: boolean }>;
    proyectos: Array<{ id: string; nombre: string; estado: string }>;
    tareas: Array<{ id: string; titulo: string; estado: string }>;
    dias: Array<{ dia: number; nombre: string; fecha: string }>;
    /** Las 3 del día guardadas en `ritual_tareas_dia`. */
    tareasDia: Array<{ dia_semana: number; tarea_id: string }>;
  },
): InformeRitual {
  const porDia: Record<string, string[]> = {};
  for (const r of ctx.tareasDia) {
    const arr = porDia[String(r.dia_semana)] ?? [];
    arr.push(r.tarea_id);
    porDia[String(r.dia_semana)] = arr;
  }
  // Las metas de esa semana son las que la bitácora marcó como vivas; si
  // la lista está vacía (semana muy vieja) se toman todas las que hay.
  const metas = fila.metas_vivas.length
    ? ctx.metas.filter((m) => fila.metas_vivas.includes(m.id))
    : ctx.metas;
  return construirInforme({
    proyectos: ctx.proyectos,
    contextoProyectos: {},
    metas,
    contextoMetas: {},
    wigsMeta: fila.wigs_meta,
    krs: ctx.krs,
    focoKrs: fila.krs_foco,
    dias: ctx.dias,
    tareasDia: porDia,
    tareas: ctx.tareas,
  });
}
