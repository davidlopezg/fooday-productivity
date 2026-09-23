import { createClient } from "@/lib/supabase/client";
import type {
  Area,
  Captura,
  Meta,
  PlanDiario,
  PlanDiarioTarea,
  Ritual,
  Tarea,
} from "@/lib/types";

const HOY = () => new Date().toISOString().slice(0, 10);

export async function fetchAreas(): Promise<Area[]> {
  const { data } = await createClient().from("areas").select("id,nombre,color,orden").order("orden");
  return (data ?? []) as Area[];
}

export async function fetchTareas(estado?: string): Promise<Tarea[]> {
  let q = createClient().from("tareas").select("*").order("created_at", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const { data } = await q;
  return (data ?? []) as Tarea[];
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
  const { data: plan } = await supabase
    .from("planes_diarios")
    .select("*")
    .eq("fecha", HOY())
    .maybeSingle();
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
  minimax_api_key: string | null;
  model: string;
}> {
  const { data } = await createClient()
    .from("configuracion")
    .select("minimax_api_key,model")
    .maybeSingle();
  return {
    minimax_api_key: (data?.minimax_api_key as string | null) ?? null,
    model: (data?.model as string) ?? "MiniMax-Text-01",
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
