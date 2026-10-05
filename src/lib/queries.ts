import { createClient } from "@/lib/supabase/client";
import type {
  Area,
  Captura,
  Meta,
  PlanDiario,
  PlanDiarioBloque,
  PlanDiarioBorrador,
  PlanDiarioSubtarea,
  PlanDiarioTarea,
  PlanSemanalTarea,
  Ritual,
  Tarea,
  TareaAdjunto,
  TareaSubtarea,
} from "@/lib/types";

const HOY = () => new Date().toISOString().slice(0, 10);

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

/** Ordena las subtareas anidadas por `orden` ascendente. */
function ordenarSubtareas<T extends { subtareas: TareaSubtarea[] | null }>(tareas: T[]): T[] {
  return tareas.map((t) => ({
    ...t,
    subtareas: ((t.subtareas ?? []) as TareaSubtarea[]).slice().sort((a, b) => a.orden - b.orden),
  }));
}

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
  const desdeStr = desde.toISOString().slice(0, 10);
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
