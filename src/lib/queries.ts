import { createClient } from "@/lib/supabase/client";
import { localYMD } from "@/lib/semana";
import type {
  Area,
  CalendarioBloque,
  CalendarioBloqueConTarea,
  Captura,
  EstatusConComidas,
  Meta,
  MetaConPlan,
  Periodo,
  PlanDiario,
  PlanDiarioBloque,
  PlanDiarioBorrador,
  PlanDiarioSubtarea,
  PlanDiarioTarea,
  PlanSemanalTarea,
  PomodoroSesion,
  Proyecto,
  ResultadoConTareas,
  ResultadoPeriodo,
  Ritual,
  Tarea,
  TareaAdjunto,
  TareaComentario,
  TareaSubtarea,
  TareaSinMeta,
} from "@/lib/types";

// localYMD, no toISOString(): las fechas de esta capa son "día civil" del
// usuario, no instantes UTC. Con toISOString() el rango se desplazaba un día
// hacia atrás entre las 00:00 y las 02:00 en zonas UTC+.
const HOY = () => localYMD(new Date());

export async function fetchAreas(): Promise<Area[]> {
  const { data } = await createClient().from("areas").select("id,nombre,color,orden").order("orden");
  return (data ?? []) as Area[];
}

export async function fetchTareas(estado?: string): Promise<Tarea[]> {
  let q = createClient()
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .order("created_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) throw error;
  return ordenarSubtareas((data ?? []) as Tarea[]);
}

/** Migration 0026: tareas con `pendiente_respuesta = true`, ordenadas
 *  por antigüedad del flag (lo que más tiempo lleva esperando primero).
 *  Incluye tareas hechas/archivadas para no perder el rastro de respuestas
 *  que llegaron (el usuario puede destildarlas manualmente). */
export async function fetchTareasPendientesRespuesta(): Promise<Tarea[]> {
  const { data, error } = await createClient()
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .eq("pendiente_respuesta", true)
    .order("pendiente_respuesta_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ordenarSubtareas((data ?? []) as Tarea[]);
}

/** Trae una tarea concreta con sus subtareas anidadas. */
export async function fetchTareaById(id: string): Promise<Tarea | null> {
  const { data, error } = await createClient()
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return ordenarSubtareas([data as Tarea])[0];
}

/** Ordena las subtareas anidadas por `orden` ascendente. */
function ordenarSubtareas<T extends { subtareas: TareaSubtarea[] | null }>(tareas: T[]): T[] {
  return tareas.map((t) => ({
    ...t,
    subtareas: ((t.subtareas ?? []) as TareaSubtarea[]).slice().sort((a, b) => a.orden - b.orden),
  }));
}

/** Export público: ordena subtareas por `orden` ascendente. Usado por el
 *  reporte PDF de proyecto (ver /lib/exportarProyecto.ts). */
export { ordenarSubtareas };

/**
 * Tareas completadas (estado='hecha'), ordenadas por fecha de completación
 * descendente. Devuelve también las áreas relacionadas para poder pintar
 * chips sin un join extra. Limita a `limit` filas para no traer la historia
 * entera si el usuario tiene miles.
 */
export async function fetchTareasCompletadas(opts?: { limit?: number }) {
  const supabase = createClient();
  const limit = opts?.limit ?? 1000;
  const { data: tareas, error } = await supabase
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .eq("estado", "hecha")
    .not("completada_at", "is", null)
    .order("completada_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const tareasArr = ordenarSubtareas((tareas ?? []) as Tarea[]);
  if (tareasArr.length === 0) return [] as Array<Tarea & { area: Area | null; subtareas: TareaSubtarea[] | null }>;

  const areaIds = Array.from(
    new Set(tareasArr.map((t) => t.area_id).filter((id): id is string => !!id)),
  );
  const { data: areas } = areaIds.length
    ? await supabase.from("areas").select("id,nombre,color,orden").in("id", areaIds)
    : { data: [] };
  const areaById = new Map<string, Area>(
    ((areas ?? []) as Area[]).map((a) => [a.id, a]),
  );
  return tareasArr.map((t) => ({
    ...t,
    area: t.area_id ? areaById.get(t.area_id) ?? null : null,
  }));
}

export async function fetchMetas(): Promise<Meta[]> {
  const { data } = await createClient().from("metas").select("*").order("codigo");
  return (data ?? []) as Meta[];
}

/** WIGs activos del usuario, ordenados por wig_orden.
 *  Incluye métricas rápidas: total_tareas y tareas_hechas (sin unir periodos).
 *  Pensada para /Hoy donde no se necesita el scorecard completo. */
export async function fetchWigs(): Promise<
  Array<{
    id: string;
    codigo: string | null;
    titulo: string;
    ambito: Meta["ambito"];
    tags: string[];
    wig_orden: number | null;
    plazo: string | null;
    total_tareas: number;
    tareas_hechas: number;
  }>
> {
  const supabase = createClient();
  const { data: metas, error: e1 } = await supabase
    .from("metas")
    .select("id,codigo,titulo,ambito,tags,wig_orden,plazo")
    .eq("es_wig", true)
    .order("wig_orden", { ascending: true, nullsFirst: false });
  if (e1) throw e1;
  const wigs = (metas ?? []) as Meta[];
  if (wigs.length === 0) return [];
  const ids = wigs.map((m) => m.id);
  const { data: tareas, error: e2 } = await supabase
    .from("tareas")
    .select("meta_id,estado")
    .in("meta_id", ids);
  if (e2) throw e2;
  const counts = new Map<string, { total: number; hechas: number }>();
  for (const t of (tareas ?? []) as Array<{ meta_id: string; estado: string }>) {
    const c = counts.get(t.meta_id) ?? { total: 0, hechas: 0 };
    c.total++;
    if (t.estado === "hecha") c.hechas++;
    counts.set(t.meta_id, c);
  }
  return wigs.map((m) => {
    const c = counts.get(m.id) ?? { total: 0, hechas: 0 };
    return {
      id: m.id,
      codigo: m.codigo,
      titulo: m.titulo,
      ambito: m.ambito,
      tags: m.tags ?? [],
      wig_orden: m.wig_orden,
      plazo: m.plazo,
      total_tareas: c.total,
      tareas_hechas: c.hechas,
    };
  });
}

/** Tareas marcadas como WIG (Wildly Important Goal — capa de ejecución).
 *  Ordenadas por wig_orden asc. Solo trae columnas ligeras — pensado para
 *  el panel de /Hoy, no para vistas de detalle. */
export async function fetchWigTareas(): Promise<
  Array<{
    id: string;
    titulo: string;
    ambito: import("@/lib/types").AmbitoTarea | null;
    tags: string[];
    wig_orden: number | null;
    estado: string;
    prioridad: string | null;
    meta_id: string | null;
  }>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tareas")
    .select("id,titulo,ambito,tags,wig_orden,estado,prioridad,meta_id")
    .eq("es_wig", true)
    .order("wig_orden", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    titulo: string;
    ambito: import("@/lib/types").AmbitoTarea | null;
    tags: string[];
    wig_orden: number | null;
    estado: string;
    prioridad: string | null;
    meta_id: string | null;
  }>;
}

export async function fetchRituales(): Promise<Ritual[]> {
  const { data } = await createClient()
    .from("rituales")
    .select("*")
    .eq("activo", true)
    .order("dia_semana")
    .order("hora");
  return (data ?? []) as Ritual[];
}

export async function fetchPlanHoy(): Promise<
  (PlanDiario & { tareas: PlanDiarioTarea[] }) | null
> {
  const supabase = createClient();
  // Si hay varias generaciones del mismo día, coge la de num_generación más alto.
  const { data: planes } = await supabase
    .from("planes_diarios")
    .select("*")
    .eq("fecha", HOY())
    .order("num_generacion", { ascending: false })
    .limit(1);
  const plan = planes?.[0];
  if (!plan) return null;
  const { data: tareas } = await supabase
    .from("plan_diario_tareas")
    .select("*")
    .eq("plan_diario_id", plan.id)
    .order("orden");
  return { ...(plan as PlanDiario), tareas: (tareas ?? []) as PlanDiarioTarea[] };
}

export async function fetchCapturasPendientes(): Promise<Captura[]> {
  const { data } = await createClient()
    .from("capturas")
    .select("*")
    .eq("estado", "pendiente")
    .order("fecha", { ascending: false });
  return (data ?? []) as Captura[];
}

export async function fetchConfiguracion(): Promise<{
  base_url: string;
  minimax_api_key: string | null;
  model: string;
}> {
  const { data } = await createClient()
    .from("configuracion")
    .select("base_url,minimax_api_key,model")
    .maybeSingle();
  return {
    base_url: (data?.base_url as string) ?? "https://api.minimax.io/v1",
    minimax_api_key: (data?.minimax_api_key as string | null) ?? null,
    model: (data?.model as string) ?? "Minimax-M3",
  };
}

export async function fetchNorte() {
  const supabase = createClient();
  const [p, v, vi] = await Promise.all([
    supabase.from("propositos").select("*").order("orden"),
    supabase.from("valores").select("*").order("orden"),
    supabase.from("visiones").select("*").order("orden"),
  ]);
  return {
    propositos: (p.data ?? []) as { id: string; texto: string }[],
    valores: (v.data ?? []) as { id: string; nombre: string; descripcion: string | null }[],
    visiones: (vi.data ?? []) as { id: string; horizonte: string; texto: string }[],
  };
}

export async function fetchContadores() {
  const supabase = createClient();
  const [t, m, c] = await Promise.all([
    supabase
      .from("tareas")
      .select("id", { count: "exact", head: true })
      .neq("estado", "hecha")
      .neq("estado", "archivada"),
    supabase
      .from("metas")
      .select("id", { count: "exact", head: true })
      .neq("estado", "archivada"),
    supabase
      .from("capturas")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente"),
  ]);
  return {
    tareasPendientes: t.count ?? 0,
    metasActivas: m.count ?? 0,
    capturasPendientes: c.count ?? 0,
  };
}

// ============================================================================
// Plan diario v2 — queries extendidas
// ============================================================================

/** Plan completo: cabecera + tareas + subtareas + bloques + borradores */
export async function fetchPlanCompleto(
  id: string,
): Promise<
  | (PlanDiario & {
      tareas: (PlanDiarioTarea & { subtareas: PlanDiarioSubtarea[]; borradores: PlanDiarioBorrador[] })[];
      bloques: PlanDiarioBloque[];
    })
  | null
> {
  const supabase = createClient();
  const { data: plan } = await supabase.from("planes_diarios").select("*").eq("id", id).maybeSingle();
  if (!plan) return null;
  const { data: tareas } = await supabase
    .from("plan_diario_tareas")
    .select("*, subtareas:plan_diario_subtareas(*), borradores:plan_diario_borradores(*)")
    .eq("plan_diario_id", id)
    .order("orden");
  const { data: bloques } = await supabase
    .from("plan_diario_bloques")
    .select("*")
    .eq("plan_diario_id", id)
    .order("orden");
  return {
    ...(plan as PlanDiario),
    bloques: (bloques ?? []) as PlanDiarioBloque[],
    tareas: ((tareas ?? []) as Array<PlanDiarioTarea & { subtareas: PlanDiarioSubtarea[]; borradores: PlanDiarioBorrador[] }>).map(
      (t) => ({
        ...t,
        subtareas: ((t.subtareas ?? []) as PlanDiarioSubtarea[]).sort((a, b) => a.orden - b.orden),
        borradores: ((t.borradores ?? []) as PlanDiarioBorrador[]).sort(
          (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
        ),
      }),
    ),
  };
}

/** Histórico paginado de planes (incluye todas las generaciones del mismo día) */
export async function fetchPlanes(opts?: { desde?: string; hasta?: string; limit?: number }) {
  const supabase = createClient();
  let q2 = supabase
    .from("planes_diarios")
    .select(`id,fecha,semaforo,resumen,recomendacion,num_generacion,created_at,
            despertar,mente,cuerpo,rueda,necesidad,notas,
            tendencia_ia,contexto_dia_ia,num_bloques_activos,
            comida_titulo,comida_descripcion,comida_motivo`)
    .order("fecha", { ascending: false })
    .order("num_generacion", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (opts?.desde) q2 = q2.gte("fecha", opts.desde);
  if (opts?.hasta) q2 = q2.lte("fecha", opts.hasta);
  const { data: planes } = await q2;
  if (!planes || planes.length === 0) return [];
  // Trae tareas para conteo + estructura de bloques (timeblocking 1-4).
  const ids = planes.map((p) => p.id);
  const { data: conteos } = await supabase
    .from("plan_diario_tareas")
    .select("plan_diario_id,hecho,titulo_libre,bloque_num,tipo_tarea,tarea_id,orden")
    .in("plan_diario_id", ids);
  type TareaHist = {
    plan_diario_id: string;
    hecho: boolean;
    titulo_libre: string | null;
    bloque_num: number | null;
    tipo_tarea: string | null;
    tarea_id: string | null;
    orden: number;
  };
  const tareasPorPlan = new Map<string, TareaHist[]>();
  const agg = new Map<string, { total: number; hechas: number }>();
  for (const t of (conteos ?? []) as TareaHist[]) {
    const a = agg.get(t.plan_diario_id) ?? { total: 0, hechas: 0 };
    a.total++;
    if (t.hecho) a.hechas++;
    agg.set(t.plan_diario_id, a);
    const arr = tareasPorPlan.get(t.plan_diario_id) ?? [];
    arr.push(t);
    tareasPorPlan.set(t.plan_diario_id, arr);
  }
  return planes.map((p) => ({
    ...(p as unknown as PlanDiario),
    tareas_total: agg.get(p.id)?.total ?? 0,
    tareas_hechas: agg.get(p.id)?.hechas ?? 0,
    tareas_bloques: (tareasPorPlan.get(p.id) ?? [])
      .filter((t) => t.bloque_num !== null)
      .sort((a, b) => (a.bloque_num ?? 0) - (b.bloque_num ?? 0) || a.orden - b.orden),
  }));
}

/** Últimos N planes (para histórico emocional) — incluye los estados emocionales */
export async function fetchHistorialEmocional(n: number): Promise<PlanDiario[]> {
  const { data } = await createClient()
    .from("planes_diarios")
    .select("*")
    .order("fecha", { ascending: false })
    .order("num_generacion", { ascending: false })
    .limit(n);
  return ((data ?? []) as PlanDiario[]).reverse();
}

/** Estadísticas emocionales agregadas para el dashboard */
export async function fetchEmocionalStats(dias: number) {
  const supabase = createClient();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = localYMD(desde);
  const { data } = await supabase
    .from("planes_diarios")
    .select("fecha,semaforo,despertar,mente,cuerpo,rueda,reflexion")
    .gte("fecha", desdeStr)
    .order("fecha", { ascending: true });
  const planes = (data ?? []) as Array<
    Pick<PlanDiario, "fecha" | "semaforo" | "despertar" | "mente" | "cuerpo" | "rueda" | "reflexion">
  >;
  // agrupa por fecha y quédate con la última generación del día
  const porDia = new Map<string, (typeof planes)[number]>();
  for (const p of planes) {
    const cur = porDia.get(p.fecha);
    if (!cur) porDia.set(p.fecha, p);
  }
  const serie = Array.from(porDia.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  // distribución semáforo
  const distSem = { verde: 0, amarillo: 0, rojo: 0, sin_definir: 0 };
  for (const p of serie) {
    if (p.semaforo === "verde") distSem.verde++;
    else if (p.semaforo === "amarillo") distSem.amarillo++;
    else if (p.semaforo === "rojo") distSem.rojo++;
    else distSem.sin_definir++;
  }
  return { serie, totalDias: serie.length, distSem };
}

// ============================================================================
// Adjuntos de tarea
// ============================================================================

/** Lista los adjuntos de una tarea (más recientes primero). */
export async function fetchAdjuntosTarea(tareaId: string): Promise<TareaAdjunto[]> {
  const { data, error } = await createClient()
    .from("tarea_adjuntos")
    .select("*")
    .eq("tarea_id", tareaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TareaAdjunto[];
}

// ============================================================================
// Plan semanal — queries (plan_semanal_tareas)
// ============================================================================

/** Devuelve las asignaciones tarea↔día de una semana concreta. */
export async function fetchPlanSemanal(opts: {
  anio: number;
  semana_iso: number;
}): Promise<PlanSemanalTarea[]> {
  const { data, error } = await createClient()
    .from("plan_semanal_tareas")
    .select("*")
    .eq("anio", opts.anio)
    .eq("semana_iso", opts.semana_iso)
    .order("dia_semana", { ascending: true })
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanSemanalTarea[];
}

/**
 * Tareas marcadas como CRÍTICAS y activas (no hechas/archivadas/descartadas),
 * ordenadas por deadline ascendente (las sin deadline al final).
 * Es la "pool" que usa la página /semana para proponer con IA y para el
 * backlog de planificación.
 */
export async function fetchTareasCriticasActivas(): Promise<Tarea[]> {
  const { data, error } = await createClient()
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .eq("prioridad", "critica")
    .in("estado", ["pendiente", "en_progreso", "bloqueada"])
    // deadline NULL al final: las más urgentes primero, las sin fecha al final.
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ordenarSubtareas((data ?? []) as Tarea[]);
}

/**
 * Devuelve un Map<tarea_id, count> con el nº de adjuntos por tarea.
 * Útil para pintar el icono "📎 N" en la tabla principal sin N+1 queries.
 */
export async function fetchAdjuntosCount(
  tareaIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (tareaIds.length === 0) return map;
  const { data, error } = await createClient()
    .from("tarea_adjuntos")
    .select("tarea_id")
    .in("tarea_id", tareaIds);
  if (error) throw error;
  for (const row of data ?? []) {
    const id = (row as { tarea_id: string }).tarea_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

// ============================================================================
// Pomodoro / Focus
// ============================================================================

/** Sesiones pomodoro de los últimos N días, ordenado por ended_at desc. */
export async function fetchPomodoroSesiones(
  dias = 30,
): Promise<PomodoroSesion[]> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createClient()
    .from("pomodoro_sesiones")
    .select("*")
    .eq("fase", "focus")
    .gte("ended_at", desde)
    .order("ended_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PomodoroSesion[];
}

/** Sesiones del día en curso, para mostrar el histórico en /focus. */
export async function fetchPomodoroHoy(): Promise<PomodoroSesion[]> {
  const h = localYMD(new Date());
  const { data, error } = await createClient()
    .from("pomodoro_sesiones")
    .select("*")
    .eq("fase", "focus")
    .gte("ended_at", `${h}T00:00:00.000Z`)
    .lte("ended_at", `${h}T23:59:59.999Z`)
    .order("ended_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PomodoroSesion[];
}

/** Subtareas marcadas como hechas en los últimos `dias` días.
 *  Usa `updated_at` como proxy de cuándo se cerró (mismo patrón que
 *  `metas`/`resultados_periodo` en /informes: el trigger `set_updated_at`
 *  se dispara al cambiar `hecho` a true). Incluye la tarea padre para
 *  poder agrupar por proyecto en /informes.
 */
export async function fetchSubtareasHechas(
  dias = 30,
): Promise<
  Array<{
    id: string;
    tarea_id: string;
    descripcion: string;
    hecho: boolean;
    updated_at: string;
    tarea: Array<{ id: string; proyecto_id: string | null }> | null;
  }>
> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createClient()
    .from("tareas_subtareas")
    .select("id,tarea_id,descripcion,hecho,updated_at,tarea:tareas(id,proyecto_id)")
    .eq("hecho", true)
    .gte("updated_at", desde)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: string;
    tarea_id: string;
    descripcion: string;
    hecho: boolean;
    updated_at: string;
    tarea: Array<{ id: string; proyecto_id: string | null }> | null;
  }>;
}

// ============================================================================
// Proyectos — migration 0012
// ============================================================================
export async function fetchProyectos(opts?: { includeArchivados?: boolean }): Promise<Proyecto[]> {
  let q = createClient()
    .from("proyectos")
    .select("id,nombre,color,descripcion,orden,archivado,area_id")
    .order("orden")
    .order("nombre");
  if (!opts?.includeArchivados) q = q.eq("archivado", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Proyecto[];
}

/** Tareas del owner agrupadas por proyecto (id → nº tareas activas). */
export async function fetchProyectosConConteo(): Promise<Array<Proyecto & { total_tareas: number; tareas_hechas: number }>> {
  const supabase = createClient();
  const [proyectosRes, tareasRes] = await Promise.all([
    supabase.from("proyectos").select("id,nombre,color,descripcion,orden,archivado,area_id").order("orden"),
    supabase.from("tareas").select("proyecto_id,estado").not("proyecto_id", "is", null),
  ]);
  if (proyectosRes.error) throw proyectosRes.error;
  if (tareasRes.error) throw tareasRes.error;
  const proyectos = (proyectosRes.data ?? []) as Proyecto[];
  const conteo = new Map<string, { total: number; hechas: number }>();
  for (const t of tareasRes.data ?? []) {
    const pid = (t as { proyecto_id: string }).proyecto_id;
    if (!pid) continue;
    const c = conteo.get(pid) ?? { total: 0, hechas: 0 };
    c.total++;
    if ((t as { estado: string }).estado === "hecha") c.hechas++;
    conteo.set(pid, c);
  }
  return proyectos.map((p) => ({
    ...p,
    total_tareas: conteo.get(p.id)?.total ?? 0,
    tareas_hechas: conteo.get(p.id)?.hechas ?? 0,
  }));
}

// ============================================================================
// Comentarios — migration 0012
// ============================================================================
export async function fetchComentariosTarea(tareaId: string): Promise<TareaComentario[]> {
  const { data, error } = await createClient()
    .from("tarea_comentarios")
    .select("id,tarea_id,cuerpo,tags,created_at")
    .eq("tarea_id", tareaId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TareaComentario[];
}

/** Comentarios que contienen un @tag concreto (p.ej. "maria"). */
export async function fetchComentariosPorTag(tag: string): Promise<TareaComentario[]> {
  const { data, error } = await createClient()
    .from("tarea_comentarios")
    .select("id,tarea_id,cuerpo,tags,created_at")
    .contains("tags", [tag.toLowerCase().replace(/^@/, "")])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TareaComentario[];
}

// ============================================================================
// Estatus diario — migration 0013
// ============================================================================

/** Lista las entradas de estatus con sus comidas anidadas.
 *  Opcionalmente filtrada por rango [desde, hasta] (YYYY-MM-DD). */
export async function fetchEstatusList(
  opts?: { desde?: string; hasta?: string; limit?: number },
): Promise<EstatusConComidas[]> {
  const supabase = createClient();
  let q = supabase
    .from("estatus_diarios")
    .select("*, comidas:estatus_comidas(*)")
    .order("fecha", { ascending: false })
    .limit(opts?.limit ?? 365);
  if (opts?.desde) q = q.gte("fecha", opts.desde);
  if (opts?.hasta) q = q.lte("fecha", opts.hasta);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as EstatusConComidas[]).map((e) => ({
    ...e,
    comidas: ((e.comidas ?? []) as EstatusConComidas["comidas"]).slice().sort(
      (a, b) => a.orden - b.orden,
    ),
  }));
}

/** Una entrada concreta por fecha (YYYY-MM-DD) o null si no existe. */
export async function fetchEstatusPorFecha(
  fecha: string,
): Promise<EstatusConComidas | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estatus_diarios")
    .select("*, comidas:estatus_comidas(*)")
    .eq("fecha", fecha)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const e = data as EstatusConComidas;
  e.comidas = ((e.comidas ?? []) as EstatusConComidas["comidas"]).slice().sort(
    (a, b) => a.orden - b.orden,
  );
  return e;
}

/** Una entrada concreta por id (para edición). */
export async function fetchEstatusPorId(
  id: string,
): Promise<EstatusConComidas | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("estatus_diarios")
    .select("*, comidas:estatus_comidas(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const e = data as EstatusConComidas;
  e.comidas = ((e.comidas ?? []) as EstatusConComidas["comidas"]).slice().sort(
    (a, b) => a.orden - b.orden,
  );
  return e;
}

/** Histórico plano (sin comidas) de los últimos N días — para cálculos
 *  de score / rachas / patrón semanal. No incluye el día de HOY. */
export async function fetchHabitosHistorico(
  dias: number,
): Promise<EstatusConComidas[]> {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return fetchEstatusList({ desde });
}

// ============================================================================
// Plan trimestral (migration 0015)
// Capa nueva: metas → periodos → resultados → tareas. No modifica
// nada de lo anterior; solo lee de las tablas nuevas y de `metas` / `tareas`.
// ============================================================================

/** Periodos del owner. Opcionalmente filtrados por tipo y/o año. */
export async function fetchPeriodos(opts?: {
  tipo?: "trimestre" | "mes" | "custom";
  anio?: number;
}): Promise<Periodo[]> {
  let q = createClient()
    .from("periodos")
    .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin")
    .order("anio", { ascending: false })
    .order("tipo")
    .order("numero");
  if (opts?.tipo) q = q.eq("tipo", opts.tipo);
  if (opts?.anio != null) q = q.eq("anio", opts.anio);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Periodo[];
}

/** KRs (= resultados_periodo) de una meta (o de todas si metaId=null).
 *  Migration 0028: la tabla ya NO tiene `periodo_id`. Para obtener los
 *  periodos de cada KR, usa `fetchKeyResultConPeriodos` o mira la tabla
 *  `kr_periodos` directamente. */
export async function fetchResultadosPeriodo(
  metaId?: string,
): Promise<ResultadoPeriodo[]> {
  let q = createClient()
    .from("resultados_periodo")
    .select("id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden")
    .order("orden");
  if (metaId) q = q.eq("meta_id", metaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ResultadoPeriodo[];
}

/** Devuelve los periodos asignados a cada KR de una meta (o todos si
 *  metaId=null). Migration 0028: necesario porque `resultados_periodo`
 *  ya no tiene `periodo_id` directo.
 *  Devuelve: Array<{ kr_id, kr_titulo, periodos: Periodo[] }> */
export async function fetchKeyResultConPeriodos(
  metaId?: string,
): Promise<Array<{ kr_id: string; kr_titulo: string; periodos: Periodo[] }>> {
  const supabase = createClient();
  const [{ data: krs }, { data: asignaciones }, { data: periodos }] = await Promise.all([
    metaId
      ? supabase
          .from("resultados_periodo")
          .select("id,titulo")
          .eq("meta_id", metaId)
          .order("orden")
      : supabase
          .from("resultados_periodo")
          .select("id,titulo")
          .order("orden"),
    supabase
      .from("kr_periodos")
      .select("kr_id,periodo_id,orden"),
    { data: [] as Periodo[] }, // periodos cargados después
  ]);
  // Cargar periodos en bloque.
  const periodoIds = Array.from(
    new Set(((asignaciones ?? []) as Array<{ periodo_id: string }>).map((a) => a.periodo_id)),
  );
  let periodosById: Record<string, Periodo> = {};
  if (periodoIds.length > 0) {
    const { data: ps } = await supabase
      .from("periodos")
      .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin")
      .in("id", periodoIds);
    periodosById = Object.fromEntries(
      ((ps ?? []) as Periodo[]).map((p) => [p.id, p]),
    );
  }
  // Inicializa todos los KRs con periodos=[], aunque no tengan ninguno.
  const porKr = new Map<string, { kr_id: string; kr_titulo: string; periodos: Periodo[] }>();
  for (const k of (krs ?? []) as Array<{ id: string; titulo: string }>) {
    porKr.set(k.id, { kr_id: k.id, kr_titulo: k.titulo, periodos: [] });
  }
  for (const a of (asignaciones ?? []) as Array<{
    kr_id: string;
    periodo_id: string;
    orden: number;
  }>) {
    const grupo = porKr.get(a.kr_id);
    if (!grupo) continue;
    const p = periodosById[a.periodo_id];
    if (!p) continue;
    grupo.periodos.push(p);
  }
  // Ordena periodos de cada KR por (anio, numero) — más natural para
  // vista trimestral Q1→Q4.
  for (const g of porKr.values()) {
    g.periodos.sort(
      (x, y) => x.anio - y.anio || x.numero - y.numero,
    );
  }
  return Array.from(porKr.values());
}

/** Tareas de un resultado (no se usa en fetchMetaConPlan porque ya las
 *  trae con filtro; queda por si en el futuro se quiere "tareas de un
 *  resultado concreto" sin tener que cargar toda la meta). */
export async function fetchTareasDeResultado(
  resultadoId: string,
): Promise<Tarea[]> {
  const { data, error } = await createClient()
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .eq("resultado_periodo_id", resultadoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ordenarSubtareas((data ?? []) as Tarea[]);
}

/** Tareas sin meta asignada = "bandeja de entrada" del plan.
 *  Incluye dos subtipos: sin meta en absoluto, o con meta pero sin
 *  resultado_periodo concreto. La UI puede distinguirlas por
 *  `tiene_meta_sin_resultado`. */
export async function fetchTareasSinMeta(): Promise<TareaSinMeta[]> {
  const supabase = createClient();
  // 1) Tareas que no tienen ningún resultado_periodo_id Y tampoco meta_id
  //    (bandeja de entrada global).
  const { data: sinNada, error: e1 } = await supabase
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .is("meta_id", null)
    .is("resultado_periodo_id", null)
    .order("created_at", { ascending: false });
  if (e1) throw e1;
  // 2) Tareas que SÍ tienen meta pero NO tienen resultado_periodo_id
  //    (bandeja dentro de la meta — el usuario aún no las ha repartido
  //    por trimestres).
  const { data: conMetaSinRes, error: e2 } = await supabase
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .not("meta_id", "is", null)
    .is("resultado_periodo_id", null)
    .order("created_at", { ascending: false });
  if (e2) throw e2;
  const a = ordenarSubtareas((sinNada ?? []) as Tarea[]).map((t) => ({
    tarea: t,
    tiene_meta_sin_resultado: false,
  }));
  const b = ordenarSubtareas((conMetaSinRes ?? []) as Tarea[]).map((t) => ({
    tarea: t,
    tiene_meta_sin_resultado: true,
  }));
  return [...a, ...b];
}

/** Detalle completo de UNA meta: sus KRs, los periodos de esos KRs
 *  (1..N cada uno, vía `kr_periodos` — migration 0028), y las tareas de
 *  cada KR. Devuelve también métricas agregadas (progreso, total/hechas).
 *
 *  Migration 0028: la columna `periodo_id` ya no existe en
 *  `resultados_periodo`; un KR puede tener 1..N periodos vía la tabla
 *  puente `kr_periodos`. Para mantener la API de UI, seguimos exponiendo
 *  `periodo` (el "principal", el de menor orden) y añadimos `periodos`
 *  (array con todos). */
export async function fetchMetaConPlan(metaId: string): Promise<MetaConPlan | null> {
  const supabase = createClient();

  const [metaRes, krsRes, krPeriodosRes, periodosRes, tareasRes] = await Promise.all([
    supabase.from("metas").select("*").eq("id", metaId).maybeSingle(),
    supabase
      .from("resultados_periodo")
      .select("id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden")
      .eq("meta_id", metaId)
      .order("orden"),
    // Asignaciones N:M KR↔periodo (migration 0028).
    supabase
      .from("kr_periodos")
      .select("kr_id,periodo_id,orden"),
    // Traemos TODOS los periodos del owner. Es poco (≤16 filas/año) y
    // evita join complejo desde el cliente.
    supabase
      .from("periodos")
      .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin"),
    supabase
      .from("tareas")
      .select("*, subtareas:tareas_subtareas(*)")
      .in("estado", ["pendiente", "en_progreso", "bloqueada", "hecha", "descartada"])
      .not("resultado_periodo_id", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  if (metaRes.error) throw metaRes.error;
  if (!metaRes.data) return null;
  if (krsRes.error) throw krsRes.error;
  if (krPeriodosRes.error) throw krPeriodosRes.error;
  if (periodosRes.error) throw periodosRes.error;
  if (tareasRes.error) throw tareasRes.error;

  const periodosById = new Map<string, Periodo>(
    ((periodosRes.data ?? []) as Periodo[]).map((p) => [p.id, p]),
  );

  // Agrupar los periodos de cada KR (ordenados por kr_periodos.orden).
  const periodosPorKr = new Map<string, Periodo[]>();
  for (const a of (krPeriodosRes.data ?? []) as Array<{
    kr_id: string;
    periodo_id: string;
    orden: number;
  }>) {
    const p = periodosById.get(a.periodo_id);
    if (!p) continue;
    const arr = periodosPorKr.get(a.kr_id) ?? [];
    arr.push(p);
    periodosPorKr.set(a.kr_id, arr);
  }
  for (const arr of periodosPorKr.values()) {
    // Ordena por kr_periodos.orden ascendente (el campo `orden` en el
    // array viene del SELECT pero perdemos esa info tras mapear a
    // Periodo). Usamos (anio, numero) como criterio estable.
    arr.sort((x, y) => x.anio - y.anio || x.numero - y.numero);
  }

  // Solo nos interesan las tareas cuyos KRs pertenecen a ESTA meta.
  const krsDeMeta = (krsRes.data ?? []) as ResultadoPeriodo[];
  const krIds = new Set(krsDeMeta.map((r) => r.id));
  const tareas = ordenarSubtareas((tareasRes.data ?? []) as Tarea[]).filter(
    (t) => t.resultado_periodo_id && krIds.has(t.resultado_periodo_id),
  );
  const tareasPorKr = new Map<string, Tarea[]>();
  for (const t of tareas) {
    if (!t.resultado_periodo_id) continue;
    const arr = tareasPorKr.get(t.resultado_periodo_id) ?? [];
    arr.push(t);
    tareasPorKr.set(t.resultado_periodo_id, arr);
  }

  const resultados: ResultadoConTareas[] = krsDeMeta
    .map((r) => {
      const periodosDelKr = periodosPorKr.get(r.id) ?? [];
      // periodo principal = el primero por orden (que ya está ordenado
      // por anio/numero). Si el KR no tiene NINGÚN periodo, fabricamos
      // un placeholder "sin asignar" para que la UI no rompa — pero la
      // migración 0028 siempre crea al menos uno en el relleno de datos.
      const periodo = periodosDelKr[0] ?? null;
      if (!periodo) {
        // KR huérfano (sin periodos). En UI lo mostraremos como "sin
        // trimestre asignado" para que el usuario lo corrija.
        return {
          ...r,
          periodos: [],
          periodo: {
            id: "",
            tipo: "custom",
            anio: 0,
            numero: 0,
            nombre: "sin trimestre",
            fecha_inicio: "",
            fecha_fin: "",
          },
          tareas: (tareasPorKr.get(r.id) ?? []).slice().sort(
            (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
          ),
        } as ResultadoConTareas;
      }
      return {
        ...r,
        periodos: periodosDelKr,
        periodo,
        tareas: (tareasPorKr.get(r.id) ?? []).slice().sort(
          (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
        ),
      } as ResultadoConTareas;
    })
    // Orden principal por periodo principal; secundarios por orden del KR.
    .sort((a, b) => {
      if (a.periodo.anio !== b.periodo.anio) return a.periodo.anio - b.periodo.anio;
      if (a.periodo.numero !== b.periodo.numero) return a.periodo.numero - b.periodo.numero;
      return (a.orden ?? 0) - (b.orden ?? 0);
    });

  const total_tareas = tareas.length;
  const tareas_hechas = tareas.filter((t) => t.estado === "hecha").length;
  const progreso = calcularProgreso(resultados);

  return {
    meta: metaRes.data as Meta,
    resultados,
    total_tareas,
    tareas_hechas,
    progreso,
  };
}

/** Lista de metas con su progreso agregado (para la página /metas).
 *  Hace un solo lote de queries y calcula en cliente.
 *  Migration 0028: la tabla `resultados_periodo` ya no tiene `periodo_id`;
 *  construimos esqueletos con `periodo` placeholder para mantener la API. */
export async function fetchMetasConProgreso(): Promise<MetaConPlan[]> {
  const supabase = createClient();
  const [metasRes, krsRes, tareasRes] = await Promise.all([
    supabase.from("metas").select("*").order("codigo", { ascending: true, nullsFirst: false }),
    supabase
      .from("resultados_periodo")
      .select("id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden"),
    supabase
      .from("tareas")
      .select("id,meta_id,resultado_periodo_id,estado")
      .not("resultado_periodo_id", "is", null),
  ]);
  if (metasRes.error) throw metasRes.error;
  if (krsRes.error) throw krsRes.error;
  if (tareasRes.error) throw tareasRes.error;

  const metas = (metasRes.data ?? []) as Meta[];
  const krs = (krsRes.data ?? []) as ResultadoPeriodo[];
  const tareas = (tareasRes.data ?? []) as Array<
    Pick<Tarea, "id" | "meta_id" | "resultado_periodo_id" | "estado">
  >;

  const krsPorMeta = new Map<string, ResultadoPeriodo[]>();
  for (const r of krs) {
    const arr = krsPorMeta.get(r.meta_id) ?? [];
    arr.push(r);
    krsPorMeta.set(r.meta_id, arr);
  }
  const tareasPorKr = new Map<string, Array<Pick<Tarea, "estado">>>();
  for (const t of tareas) {
    if (!t.resultado_periodo_id) continue;
    const arr = tareasPorKr.get(t.resultado_periodo_id) ?? [];
    arr.push(t);
    tareasPorKr.set(t.resultado_periodo_id, arr);
  }

  return metas.map((m) => {
    const krsDeMeta = krsPorMeta.get(m.id) ?? [];
    // Esqueletos con periodo placeholder (la lista /metas no necesita el
    // trimestre real — solo el progreso ponderado).
    const esqueletos: ResultadoConTareas[] = krsDeMeta.map((r) => ({
      ...r,
      periodos: [],
      periodo: {
        id: "",
        tipo: "trimestre",
        anio: 0,
        numero: 0,
        nombre: "",
        fecha_inicio: "",
        fecha_fin: "",
      },
      tareas: ((tareasPorKr.get(r.id) ?? []) as unknown as Tarea[]),
    }));
    const total_tareas = krsDeMeta.reduce(
      (acc, r) => acc + (tareasPorKr.get(r.id)?.length ?? 0),
      0,
    );
    const tareas_hechas = krsDeMeta.reduce(
      (acc, r) =>
        acc +
        (tareasPorKr.get(r.id) ?? []).filter((t) => t.estado === "hecha").length,
      0,
    );
    return {
      meta: m,
      resultados: esqueletos,
      total_tareas,
      tareas_hechas,
      progreso: calcularProgreso(esqueletos),
    };
  });
}

/** Plan trimestral de un año: los 4 trimestres con TODOS los KRs que
 *  tienen al menos un periodo dentro de ese año.
 *  Migration 0028: la relación KR↔periodo pasa por `kr_periodos`.
 *  Un KR que vive en 2 trimestres aparece en ambos.
 *  Útil para la vista Q1-Q4. */
export async function fetchPlanTrimestral(anio: number): Promise<{
  periodos: Periodo[];
  /** Clave = periodo_id, valor = KRs con su meta y tareas (un KR puede
   *  aparecer en varios trimestres si está asignado a varios). */
  porTrimestre: Map<
    string,
    Array<{ meta: Meta; resultado: ResultadoPeriodo; tareas: Tarea[] }>
  >;
}> {
  const supabase = createClient();
  // 1) Periodos del año (Q1-Q4).
  const { data: periodosData, error: eP } = await supabase
    .from("periodos")
    .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin")
    .eq("tipo", "trimestre")
    .eq("anio", anio)
    .order("numero");
  if (eP) throw eP;
  const periodos = (periodosData ?? []) as Periodo[];
  if (periodos.length === 0) {
    return { periodos: [], porTrimestre: new Map() };
  }
  const periodoIds = periodos.map((p) => p.id);

  // 2) Asignaciones kr_periodos (de los periodos del año) + KRs + metas.
  // Migration 0028: JOIN por kr_periodos en vez de por resultados_periodo.periodo_id.
  const { data: asignacionesData, error: eA } = await supabase
    .from("kr_periodos")
    .select("kr_id,periodo_id")
    .in("periodo_id", periodoIds);
  if (eA) throw eA;
  const asignaciones = (asignacionesData ?? []) as Array<{
    kr_id: string;
    periodo_id: string;
  }>;
  if (asignaciones.length === 0) {
    return { periodos, porTrimestre: new Map() };
  }

  const krIds = Array.from(new Set(asignaciones.map((a) => a.kr_id)));
  const { data: krsData, error: eK } = await supabase
    .from("resultados_periodo")
    .select("id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden")
    .in("id", krIds)
    .order("orden");
  if (eK) throw eK;
  const krs = (krsData ?? []) as ResultadoPeriodo[];
  const krsById = new Map<string, ResultadoPeriodo>(krs.map((k) => [k.id, k]));

  const metaIds = Array.from(new Set(krs.map((r) => r.meta_id)));
  const { data: metasData, error: eM } = await supabase
    .from("metas")
    .select("*")
    .in("id", metaIds);
  if (eM) throw eM;
  const metasById = new Map<string, Meta>(
    ((metasData ?? []) as Meta[]).map((m) => [m.id, m]),
  );

  // 3) Tareas de esos KRs.
  const { data: tareasData, error: eT } = await supabase
    .from("tareas")
    .select("*, subtareas:tareas_subtareas(*)")
    .in("resultado_periodo_id", krIds)
    .order("created_at", { ascending: false });
  if (eT) throw eT;
  const tareasPorKr = new Map<string, Tarea[]>();
  for (const t of ordenarSubtareas((tareasData ?? []) as Tarea[])) {
    if (!t.resultado_periodo_id) continue;
    const arr = tareasPorKr.get(t.resultado_periodo_id) ?? [];
    arr.push(t);
    tareasPorKr.set(t.resultado_periodo_id, arr);
  }

  // 4) Agrupar por trimestre. Un mismo KR puede aparecer varias veces
  //    (una por cada trimestre al que está asignado).
  const porTrimestre = new Map<
    string,
    Array<{ meta: Meta; resultado: ResultadoPeriodo; tareas: Tarea[] }>
  >();
  for (const p of periodos) porTrimestre.set(p.id, []);
  for (const a of asignaciones) {
    const r = krsById.get(a.kr_id);
    if (!r) continue;
    const meta = metasById.get(r.meta_id);
    if (!meta) continue;
    const arr = porTrimestre.get(a.periodo_id) ?? [];
    arr.push({
      meta,
      resultado: r,
      tareas: tareasPorKr.get(r.id) ?? [],
    });
    porTrimestre.set(a.periodo_id, arr);
  }
  return { periodos, porTrimestre };
}

// ---------------------------------------------------------------------------
// Helper: progreso 0..1 de un conjunto de resultados.
//   progreso_resultado = tareas_hechas / total_tareas (0 si no hay tareas)
//   progreso_meta      = media ponderada por `peso` de cada resultado
// Si no hay resultados, progreso = 0.
// ---------------------------------------------------------------------------
function calcularProgreso(resultados: ResultadoConTareas[]): number {
  if (resultados.length === 0) return 0;
  let suma = 0;
  let pesoTotal = 0;
  for (const r of resultados) {
    const total = r.tareas.length;
    const hechas = r.tareas.filter((t) => t.estado === "hecha").length;
    const p = total === 0 ? 0 : hechas / total;
    suma += p * (r.peso || 1);
    pesoTotal += r.peso || 1;
  }
  return pesoTotal === 0 ? 0 : suma / pesoTotal;
}

// ============================================================================
// Calendario / Time-blocking (migration 0017)
// ============================================================================

/** Devuelve los bloques entre `desde` y `hasta` (YYYY-MM-DD) ya
 *  enriquecidos con la tarea anidada (si la hay). Para bloques 1, 2 y 4
 *  hay a lo sumo 1 fila; para el bloque 3 puede haber hasta 4 (operativas
 *  en lote — migration 0020). Ordenados por (fecha, numero_bloque, orden). */
export async function fetchCalendarioSemana(opts: {
  desde: string;
  hasta: string;
}): Promise<CalendarioBloqueConTarea[]> {
  const supabase = createClient();
  const { data: bloques, error } = await supabase
    .from("calendario_bloques")
    .select("*")
    .gte("fecha", opts.desde)
    .lte("fecha", opts.hasta)
    .order("fecha")
    .order("numero_bloque")
    .order("orden");
  if (error) throw error;

  const tareasIds = Array.from(
    new Set(((bloques ?? []) as CalendarioBloque[]).map((b) => b.tarea_id).filter((id): id is string => !!id)),
  );
  const { data: tareasData } = tareasIds.length
    ? await supabase.from("tareas").select("*, subtareas:tareas_subtareas(*)").in("id", tareasIds)
    : { data: [] };
  const tareasById = new Map<string, Tarea>(
    ((tareasData ?? []) as Tarea[]).map((t) => [t.id, t]),
  );

  return ((bloques ?? []) as CalendarioBloque[]).map((b) => ({
    ...b,
    tarea: b.tarea_id ? tareasById.get(b.tarea_id) ?? null : null,
  }));
}

/** Upsert: asigna (o reemplaza) la tarea de un bloque. Si `tareaId` es null,
 *  queda como bloque libre con `nota`. Solo para bloques 1, 2 y 4 (los
 *  tres llevan índice UNIQUE PARCIAL; ver migración 0020). Para el Bloque 3
 *  usa `agregarTareaABloque3` / `quitarTareaDeBloque3`.
 *
 *  NOTA: NO usamos `supabase.upsert(..., { onConflict: ... })` porque la
 *  UNIQUE de bloques 1/2/4 es un ÍNDICE PARCIAL (`WHERE numero_bloque IN
 *  (1,2,4)`) y Postgres NO soporta `ON CONFLICT` sobre índices parciales
 *  (error 42P10). Hacemos el upsert a mano: SELECT fila existente → si
 *  existe, UPDATE; si no, INSERT. Como en bloques 1/2/4 solo puede haber
 *  1 fila (lo garantiza el índice parcial), no hay race condition real. */
export async function upsertBloque(opts: {
  fecha: string;
  numeroBloque: 1 | 2 | 3 | 4;
  tareaId: string | null;
  nota?: string | null;
}) {
  if (opts.numeroBloque === 3) {
    throw new Error(
      "upsertBloque no soporta el Bloque 3 (multi-tarea). Usa agregarTareaABloque3.",
    );
  }
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sin sesión");

  const ownerId = session.user.id;
  const updateValues = {
    tarea_id: opts.tareaId,
    nota: opts.nota ?? null,
  };

  // 1) SELECT fila existente (en bloques 1/2/4 solo puede haber 0 o 1).
  const { data: existente, error: errSelect } = await supabase
    .from("calendario_bloques")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("fecha", opts.fecha)
    .eq("numero_bloque", opts.numeroBloque)
    .maybeSingle();
  if (errSelect) throw errSelect;

  if (existente) {
    // 2a) UPDATE de la fila existente.
    const { error: errUpdate } = await supabase
      .from("calendario_bloques")
      .update(updateValues)
      .eq("id", existente.id);
    if (errUpdate) throw errUpdate;
    return;
  }

  // 2b) INSERT de fila nueva. Si dos requests entran a la vez, el índice
  // parcial 1/2/4 garantiza que solo uno gana; el otro recibe 23505
  // (subidor lo verá como error normal).
  const { error: errInsert } = await supabase.from("calendario_bloques").insert({
    owner_id: ownerId,
    fecha: opts.fecha,
    numero_bloque: opts.numeroBloque,
    orden: 0,
    ...updateValues,
  });
  if (errInsert) throw errInsert;
}

/** Añade una tarea al Bloque 3 (operativas en lote). El `orden` se asigna
 *  como (max(orden)+1) de las filas existentes en (fecha, bloque=3), o 0
 *  si el bloque está vacío. La UI limita a 4 filas; el backend no. */
export async function agregarTareaABloque3(opts: {
  fecha: string;
  tareaId: string;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sin sesión");

  // 1) siguiente orden = MAX(orden)+1 (o 0 si vacío)
  const { data: existentes, error: errExistentes } = await supabase
    .from("calendario_bloques")
    .select("orden")
    .eq("owner_id", session.user.id)
    .eq("fecha", opts.fecha)
    .eq("numero_bloque", 3);
  if (errExistentes) throw errExistentes;
  const nextOrden =
    (existentes ?? []).reduce((acc, r) => Math.max(acc, r.orden ?? 0), -1) + 1;

  // 2) insert
  const { error } = await supabase.from("calendario_bloques").insert({
    owner_id: session.user.id,
    fecha: opts.fecha,
    numero_bloque: 3,
    tarea_id: opts.tareaId,
    nota: null,
    orden: nextOrden,
  });
  if (error) throw error;
}

/** Quita UNA tarea concreta del Bloque 3 (identificada por el id de la
 *  fila en `calendario_bloques`). */
export async function quitarTareaDeBloque3(opts: { bloqueId: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("calendario_bloques")
    .delete()
    .eq("id", opts.bloqueId);
  if (error) throw error;
}

/** Quita la asignación de un bloque (lo deja libre). */
export async function limpiarBloque(opts: {
  fecha: string;
  numeroBloque: 1 | 2 | 3 | 4;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from("calendario_bloques")
    .delete()
    .eq("fecha", opts.fecha)
    .eq("numero_bloque", opts.numeroBloque);
  if (error) throw error;
}
