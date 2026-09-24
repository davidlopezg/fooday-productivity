import { createClient } from "@/lib/supabase/client";
import type { InformePlan, Subtarea } from "@/lib/types";
import { desgranarTareaIA } from "@/lib/plan";

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

/**
 * Desgrana una tarea al máximo posible usando la IA y persiste el resultado
 * en `tareas.subtareas` (JSONB). Mantiene el estado `hecho` de las subtareas
 * que ya existieran con la misma descripción.
 */
export async function desgranarTarea(
  id: string,
  cfg: { base_url: string; minimax_api_key: string | null; model: string },
): Promise<Subtarea[]> {
  const supabase = createClient();

  // 1) Lee la tarea actual para tener título + descripción + subtareas previas
  const { data: tarea, error: errRead } = await supabase
    .from("tareas")
    .select("titulo,descripcion,notas,subtareas")
    .eq("id", id)
    .maybeSingle();
  if (errRead) throw errRead;
  if (!tarea) throw new Error("Tarea no encontrada");

  if (!cfg.minimax_api_key) {
    throw new Error(
      "No hay API key configurada. Ve a Configuración → MiniMax API key y guarda una.",
    );
  }

  // 2) Llama a la IA
  const { subtareas } = await desgranarTareaIA(
    cfg.base_url,
    cfg.minimax_api_key,
    cfg.model,
    {
      titulo: (tarea.titulo as string) ?? "",
      descripcion: (tarea.descripcion as string | null) ?? null,
      notas: (tarea.notas as string | null) ?? null,
      subtareasPrevias: (tarea.subtareas as Subtarea[] | null) ?? null,
    },
  );

  // 3) Mezcla con `hecho` previo: si una subtarea nueva coincide (normalizada)
  //    con una ya marcada como hecha, la marcamos como hecha también.
  const previas = ((tarea.subtareas as Subtarea[] | null) ?? []).filter(
    (s) => s.descripcion && s.hecho,
  );
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const hechas = new Set(previas.map((p) => norm(p.descripcion)));
  const mezcladas: Subtarea[] = subtareas.map((s) => ({
    descripcion: s.descripcion,
    tiempo_estimado_min: s.tiempo_estimado_min ?? null,
    hecho: hechas.has(norm(s.descripcion)),
  }));

  // 4) Persiste en Supabase
  const { error: errUpd } = await supabase
    .from("tareas")
    .update({ subtareas: mezcladas })
    .eq("id", id);
  if (errUpd) throw errUpd;

  return mezcladas;
}

/** Guarda manualmente las subtareas de una tarea (sin pasar por la IA). */
export async function guardarSubtareas(id: string, subtareas: Subtarea[]) {
  await createClient()
    .from("tareas")
    .update({ subtareas: subtareas.length > 0 ? subtareas : null })
    .eq("id", id);
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

// ============================================================================
// Plan diario v2 — guardado completo
// ============================================================================

export type SubtareaInput = {
  descripcion: string;
  tiempo_estimado_min?: number;
};

export type TareaInput = {
  tipo: "imprescindible" | "autocuidado" | "micro" | "extra";
  titulo_libre: string;
  tarea_id?: string | null;
  es_ia?: boolean;
  bloque_energia?: "regular" | "estrategia" | "ejecucion" | "mecanica" | null;
  bloque_cognitivo?: "foco" | "operativa" | "distribuida" | null;
  es_tarea_libre?: boolean;
  subtareas?: SubtareaInput[];
};

export type BloqueInput = {
  tipo: "manana_autocuidado" | "primer_trabajo" | "comida" | "segundo_trabajo" | "noche";
  hora_inicio: string;
  hora_fin: string;
  titulo: string;
  contenido: string;
  orden: number;
};

/** Snapshot estático de los 5 bloques del día (reglas fijas del agente) */
export const BLOQUES_FIJOS: BloqueInput[] = [
  {
    tipo: "manana_autocuidado",
    hora_inicio: "07:30",
    hora_fin: "10:30",
    titulo: "🌅 Mañana autocuidado",
    contenido:
      "NO TRABAJO. Móvil OFF. Caminar, Qi Gong, ducha, desayuno con María/Abril. Pon alarma a las 10:25 para volver.",
    orden: 1,
  },
  {
    tipo: "primer_trabajo",
    hora_inicio: "11:00",
    hora_fin: "13:00",
    titulo: "☀️ Primer bloque de trabajo (foco)",
    contenido:
      "2h de trabajo profundo. Máx 1 tarea 🎯 Foco o 1 imprescindible. Móvil en otra habitación.",
    orden: 2,
  },
  {
    tipo: "comida",
    hora_inicio: "13:00",
    hora_fin: "15:00",
    titulo: "🍽️ Comida",
    contenido: "Comer sentado, sin pantalla. Descanso real.",
    orden: 3,
  },
  {
    tipo: "segundo_trabajo",
    hora_inicio: "15:00",
    hora_fin: "20:30",
    titulo: "🌇 Segundo bloque de trabajo (ejecución)",
    contenido:
      "1h30–3h + vaciar cabeza 17:00. Aquí van las tareas ⚙️ Operativa y 🧹 Distribuida.",
    orden: 4,
  },
  {
    tipo: "noche",
    hora_inicio: "21:00",
    hora_fin: "23:00",
    titulo: "🌙 Noche",
    contenido: "Móvil OFF. 5 cosas buenas del día, lectura, dormir.",
    orden: 5,
  },
];

export async function guardarPlanDiario(payload: {
  fecha: string;
  fecha_larga?: string;
  semaforo: "verde" | "amarillo" | "rojo";
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesidad: string;
  resumen: string;
  recomendacion: string;
  reflexion?: string;
  contexto_extra?: string;
  tareas: TareaInput[];
  informe?: InformePlan;
}): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Calcula num_generacion: cuenta cuántas hay para ese (owner, fecha)
  const { count } = await supabase
    .from("planes_diarios")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("fecha", payload.fecha);
  const num_generacion = (count ?? 0) + 1;

  // 1) Cabecera del plan (nueva fila, NO upsert: queremos historial)
  const { data: plan, error } = await supabase
    .from("planes_diarios")
    .insert({
      owner_id: user.id,
      fecha: payload.fecha,
      fecha_larga: payload.fecha_larga ?? null,
      semaforo: payload.semaforo,
      despertar: payload.despertar,
      mente: payload.mente,
      cuerpo: payload.cuerpo,
      rueda: payload.rueda,
      necesidad: payload.necesidad,
      resumen: payload.resumen,
      recomendacion: payload.recomendacion,
      reflexion: payload.reflexion ?? null,
      contexto_extra: payload.contexto_extra ?? null,
      informe_json: payload.informe ?? null,
      num_generacion,
      origen: "ia",
    })
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("No se pudo guardar el plan");
  const planId = plan.id as string;

  // 2) Snapshot de bloques fijos
  await supabase.from("plan_diario_bloques").insert(
    BLOQUES_FIJOS.map((b) => ({ ...b, plan_diario_id: planId })),
  );

  // 3) Tareas + subtareas
  for (let i = 0; i < payload.tareas.length; i++) {
    const t = payload.tareas[i];
    const { data: tareaRow, error: errT } = await supabase
      .from("plan_diario_tareas")
      .insert({
        plan_diario_id: planId,
        tarea_id: t.tarea_id ?? null,
        tipo: t.tipo,
        titulo_libre: t.titulo_libre,
        orden: i,
        hecho: false,
        es_ia: t.es_ia ?? false,
        bloque_energia: t.bloque_energia ?? null,
        bloque_cognitivo: t.bloque_cognitivo ?? null,
        es_tarea_libre: t.es_tarea_libre ?? false,
      })
      .select("id")
      .single();
    if (errT) throw errT;
    if (t.subtareas && t.subtareas.length > 0 && tareaRow) {
      await supabase.from("plan_diario_subtareas").insert(
        t.subtareas.map((s, j) => ({
          plan_diario_tarea_id: tareaRow.id,
          descripcion: s.descripcion,
          tiempo_estimado_min: s.tiempo_estimado_min ?? null,
          orden: j,
          hecho: false,
        })),
      );
    }
  }

  return planId;
}

export async function marcarSubtareaHecha(id: string, hecho: boolean) {
  await createClient().from("plan_diario_subtareas").update({ hecho }).eq("id", id);
}

export async function marcarTareaPlanHecha(id: string, hecho: boolean) {
  await createClient().from("plan_diario_tareas").update({ hecho }).eq("id", id);
}

export async function guardarNotasPlan(id: string, notas: string) {
  await createClient().from("planes_diarios").update({ notas }).eq("id", id);
}

export async function guardarBorrador(payload: {
  plan_diario_tarea_id: string;
  tipo: "email" | "whatsapp" | "documento" | "otro";
  contenido: string;
  prompt_usado?: string;
}): Promise<string> {
  const { data, error } = await createClient()
    .from("plan_diario_borradores")
    .insert({
      plan_diario_tarea_id: payload.plan_diario_tarea_id,
      tipo: payload.tipo,
      contenido: payload.contenido,
      prompt_usado: payload.prompt_usado ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("No se pudo guardar el borrador");
  return data.id as string;
}

export async function actualizarBorrador(id: string, contenido: string) {
  await createClient().from("plan_diario_borradores").update({ contenido }).eq("id", id);
}

export async function eliminarBorrador(id: string) {
  await createClient().from("plan_diario_borradores").delete().eq("id", id);
}
