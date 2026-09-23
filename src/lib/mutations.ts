import { createClient } from "@/lib/supabase/client";

export async function marcarHecha(id: string) {
  await createClient()
    .from("tareas")
    .update({ estado: "hecha", completada_at: new Date().toISOString() })
    .eq("id", id);
}

export async function reabrirTarea(id: string) {
  await createClient()
    .from("tareas")
    .update({ estado: "pendiente", completada_at: null })
    .eq("id", id);
}

export async function archivarTarea(id: string) {
  await createClient().from("tareas").update({ estado: "archivada" }).eq("id", id);
}

export async function desarchivarTarea(id: string) {
  await createClient().from("tareas").update({ estado: "pendiente" }).eq("id", id);
}

export async function eliminarTarea(id: string) {
  await createClient().from("tareas").delete().eq("id", id);
}

export interface TareaCampos {
  id: string;
  titulo?: string;
  descripcion?: string | null;
  prioridad?: string;
  estado?: string;
  deadline?: string | null;
  capa?: string | null;
  pts?: number | null;
  esfuerzo?: string | null;
}

export async function actualizarTarea(datos: TareaCampos) {
  const { id, ...campos } = datos;
  const update: Record<string, unknown> = { ...campos };
  if (campos.estado !== undefined) {
    update.completada_at = campos.estado === "hecha" ? new Date().toISOString() : null;
  }
  await createClient().from("tareas").update(update).eq("id", id);
}

export async function crearTarea(datos: {
  titulo: string;
  prioridad?: string;
  estado?: string;
  descripcion?: string | null;
  deadline?: string | null;
  capa?: string | null;
  pts?: number | null;
  esfuerzo?: string | null;
}) {
  await createClient().from("tareas").insert({
    titulo: datos.titulo,
    prioridad: datos.prioridad ?? "media",
    estado: datos.estado ?? "pendiente",
    descripcion: datos.descripcion ?? null,
    deadline: datos.deadline ?? null,
    capa: datos.capa ?? null,
    pts: datos.pts ?? null,
    esfuerzo: datos.esfuerzo ?? null,
    origen: "manual",
  });
}

export async function crearCaptura(texto: string) {
  const t = texto.trim();
  if (!t) return;
  await createClient().from("capturas").insert({ texto: t, estado: "pendiente" });
}

export async function guardarConfiguracion(datos: {
  base_url?: string;
  minimax_api_key: string | null;
  model: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  await supabase.from("configuracion").upsert(
    {
      user_id: user.id,
      base_url: datos.base_url || "https://api.minimax.io/v1",
      minimax_api_key: datos.minimax_api_key,
      model: datos.model || "Minimax-M3",
    },
    { onConflict: "user_id" },
  );
}

export async function guardarPlanDiario(payload: {
  fecha: string;
  semaforo: string;
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesidad: string;
  resumen: string;
  recomendacion: string;
  tareas: { tipo: "imprescindible" | "autocuidado" | "micro" | "extra"; titulo_libre: string }[];
}) {
  const supabase = createClient();
  const { data: plan, error } = await supabase
    .from("planes_diarios")
    .upsert(
      {
        owner_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        fecha: payload.fecha,
        semaforo: payload.semaforo,
        despertar: payload.despertar,
        mente: payload.mente,
        cuerpo: payload.cuerpo,
        rueda: payload.rueda,
        necesidad: payload.necesidad,
        resumen: payload.resumen,
        recomendacion: payload.recomendacion,
      },
      { onConflict: "owner_id,fecha" },
    )
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("No se pudo guardar el plan");
  // Borra tareas previas de ese plan y reinserta
  await supabase.from("plan_diario_tareas").delete().eq("plan_diario_id", plan.id);
  if (payload.tareas.length > 0) {
    await supabase.from("plan_diario_tareas").insert(
      payload.tareas.map((t, i) => ({
        plan_diario_id: plan.id,
        tipo: t.tipo,
        titulo_libre: t.titulo_libre,
        orden: i,
        hecho: false,
      })),
    );
  }
  return plan.id;
}
