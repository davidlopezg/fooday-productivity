// ============================================================================
// ritual/semana.ts — el INVENTARIO DE LA SEMANA del ritual (issue #96).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Las reglas puras del paso 5 del ritual semanal:
//   · qué tareas son CANDIDATAS a entrar en la semana (por defecto, las de
//     los KRs en foco, las WIG de tarea y las críticas/urgentes);
//   · cómo se fusiona el reparto por días que ya está guardado en la BD con
//     el que llevas toca en el borrador;
//   · qué cambios hay que escribir al guardar el paso.
//
// POR QUÉ UN MÓDULO APARTE
//   Son reglas de negocio, no detalles de pantalla: el paso 5, /semana y la
//   bitácora tienen que aplicar SIEMPRE las mismas. Aquí viven y se testean
//   (src/lib/ritual/semana.test.mjs).
//
// LA DIRECCIÓN (lo que fallaba)
//   El ritual decide el inventario de la semana y lo reparte por días.
//   /semana muestra y afina ese reparto. El flujo nunca es al revés: la
//   cobertura y las "3 del día" se miden sobre lo elegido AQUÍ.
//
// LO QUE NO HACE
//   No escribe en BD (eso es src/lib/mutations.ts) ni decide por la persona.
// ============================================================================

/** Estados en los que una tarea cuenta como activa (mismo criterio que
 *  `ESTADOS_ACTIVOS_TAREA` en src/lib/ritualSemanal.ts). */
export const ESTADOS_ACTIVOS: readonly string[] = [
  "pendiente",
  "en_progreso",
  "bloqueada",
];

/** Objetivo orientativo de tareas en la semana. NO es un tope: la pantalla
 *  avisa, no bloquea (issue #96). */
export const OBJETIVO_TAREAS_SEMANA = 10;

/** Lo mínimo de una tarea que necesita este módulo. */
export interface TareaSemana {
  id: string;
  titulo: string;
  estado: string;
  es_wig: boolean;
  prioridad: string | null;
  /** KR al que apunta la tarea (resultados_periodo). Null = sin KR. */
  resultado_periodo_id: string | null;
  deadline?: string | null;
}

/** Un KR en foco (lo que elegiste en el paso 4). */
export interface KrEnFoco {
  id: string;
  titulo: string;
}

/** El reparto por días: tarea_id → día ISO (1=lunes .. 7=domingo). */
export type PlanSemana = Record<string, number>;

/** El reparto en el borrador: día, o null si la tarea se queda fuera. */
export type PlanSemanaDraft = Record<string, number | null>;

/** ¿La tarea está activa (la que cuenta para el objetivo de la semana)? */
export function esActiva(t: Pick<TareaSemana, "estado">): boolean {
  return ESTADOS_ACTIVOS.includes(t.estado);
}

/**
 * Candidatas por defecto: las tareas que de verdad pueden ser el trabajo de
 * esta semana.
 *
 * En este orden:
 *   1. Las de los KRs en foco (el trabajo que pushes el foco de la semana).
 *   2. Las WIG de tarea (la capa de ciclo).
 *   3. Las críticas o urgentes.
 *
 * NO es un filtro estricto: una tarea puede entrar por varios sitios y solo
 * sale una vez. Las que no entran en ninguna categoría no se muestran (para
 * eso está el buscador: "añadir cualquier otra").
 */
export function candidatasSemana(
  tareas: readonly TareaSemana[],
  krsEnFoco: readonly KrEnFoco[],
): TareaSemana[] {
  const idsKr = new Set(krsEnFoco.map((k) => k.id));
  const vistas = new Set<string>();
  const salida: TareaSemana[] = [];
  for (const t of tareas) {
    if (vistas.has(t.id)) continue;
    if (!esActiva(t)) continue;
    const deFoco = !!t.resultado_periodo_id && idsKr.has(t.resultado_periodo_id);
    const wig = !!t.es_wig;
    const urgente = t.prioridad === "critica" || t.prioridad === "urgente";
    if (!deFoco && !wig && !urgente) continue;
    vistas.add(t.id);
    salida.push(t);
  }
  return salida;
}

/** ¿Por qué esta tarea es candidata? (para explicar la lista en pantalla) */
export function motivoCandidata(
  t: TareaSemana,
  krsEnFoco: readonly KrEnFoco[],
): "foco" | "wig" | "urgente" {
  const idsKr = new Set(krsEnFoco.map((k) => k.id));
  if (t.resultado_periodo_id && idsKr.has(t.resultado_periodo_id)) return "foco";
  if (t.es_wig) return "wig";
  return "urgente";
}

/** Filtra por texto (título). Case-insensitive, sin acentos. */
export function filtrarPorTexto(
  tareas: readonly TareaSemana[],
  texto: string,
): TareaSemana[] {
  const q = normalizar(texto);
  if (!q) return [...tareas];
  return tareas.filter((t) => normalizar(t.titulo).includes(q));
}

/** Minúsculas, sin acentos y sin espacios de sobra: para comparar textos. */
function normalizar(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Fusiona el reparto guardado en la BD con el del borrador.
 * El borrador manda: `null` = la tarea se queda fuera de la semana.
 */
export function fusionarPlan(
  planBd: PlanSemana,
  planDraft: PlanSemanaDraft,
): PlanSemana {
  const salida: PlanSemana = { ...planBd };
  for (const [id, dia] of Object.entries(planDraft)) {
    if (dia === null || dia === undefined) delete salida[id];
    else salida[id] = dia;
  }
  return salida;
}

/** Qué hay que escribir al guardar el paso: qué asignar y qué quitar. */
export function diffPlan(
  planBd: PlanSemana,
  planDraft: PlanSemanaDraft,
): {
  asignar: Array<{ tarea_id: string; dia_semana: number }>;
  quitar: string[];
} {
  return diffPlanCompleto(planBd, fusionarPlan(planBd, planDraft));
}

/**
 * Lo mismo, pero entre dos repartos ya calculados (el guardado y el final).
 * Sirve cuando el reparto final no sale solo del borrador (p. ej. porque una
 * tarea se ha completado y sale de la semana).
 */
export function diffPlanCompleto(
  planBd: PlanSemana,
  final: PlanSemana,
): {
  asignar: Array<{ tarea_id: string; dia_semana: number }>;
  quitar: string[];
} {
  const asignar: Array<{ tarea_id: string; dia_semana: number }> = [];
  const quitar: string[] = [];
  for (const [id, dia] of Object.entries(final)) {
    if (planBd[id] === dia) continue;
    asignar.push({ tarea_id: id, dia_semana: dia });
  }
  for (const id of Object.keys(planBd)) {
    if (!(id in final)) quitar.push(id);
  }
  return { asignar, quitar };
}

/** Las tareas de la semana: las que tienen día en el reparto. */
export function tareasDeLaSemana(
  tareas: readonly TareaSemana[],
  plan: PlanSemana,
): TareaSemana[] {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const salida: TareaSemana[] = [];
  for (const id of Object.keys(plan)) {
    const t = porId.get(id);
    if (t) salida.push(t);
  }
  return salida;
}

/** Las tareas de la semana agrupadas por día (1..7), en orden de día. */
export function tareasPorDia(
  tareas: readonly TareaSemana[],
  plan: PlanSemana,
): Map<number, TareaSemana[]> {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const mapa = new Map<number, TareaSemana[]>();
  for (let d = 1; d <= 7; d++) mapa.set(d, []);
  for (const [id, dia] of Object.entries(plan)) {
    const t = porId.get(id);
    if (!t) continue;
    const arr = mapa.get(dia);
    if (!arr) continue;
    arr.push(t);
  }
  return mapa;
}

/**
 * El estado del objetivo de la semana: cuántas tareas hay, cuántas son
 * activas y qué dice la pantalla. Es ORIENTATIVO: avisa, no bloquea.
 */
export function estadoSemana(
  tareasSemana: readonly TareaSemana[],
): { total: number; activas: number; mensaje: string } {
  const total = tareasSemana.length;
  const activas = tareasSemana.filter(esActiva).length;
  const diferencia = activas - OBJETIVO_TAREAS_SEMANA;
  const mensaje =
    diferencia > 0
      ? `${activas} tareas activas · objetivo ${OBJETIVO_TAREAS_SEMANA} (vas ${diferencia} por encima).`
      : `${activas} tareas activas · objetivo ${OBJETIVO_TAREAS_SEMANA} (te quedan ${-diferencia}).`;
  return { total, activas, mensaje };
}
