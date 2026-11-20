import { createClient } from "@/lib/supabase/client";
import { llamarLLMStream } from "@/lib/llm";
import { construirContexto } from "@/lib/agente/contexto";
import { crearTarea } from "@/lib/mutations";
import type { Tarea } from "@/lib/types";
import { parsearRespuestaAgente, type PropuestaTarea } from "@/lib/agentes/propuesta";
export { parsearRespuestaAgente } from "@/lib/agentes/propuesta";
export type { PropuestaTarea } from "@/lib/agentes/propuesta";

export type Agente = {
  id: string; owner_id: string; nombre: string; descripcion: string; icono: string;
  especialidad: string; objetivo: string; prompt: string; prompt_version: number;
  modelo: string | null; activo: boolean; created_at: string; updated_at: string;
};
export type Skill = {
  id: string; owner_id: string; nombre: string; descripcion: string;
  instrucciones: string; herramientas: string[]; version: number; activo: boolean;
  created_at: string; updated_at: string;
};
export type Conversacion = {
  id: string; owner_id: string; titulo: string; proyecto_id: string | null;
  estado: "activa" | "archivada"; created_at: string; updated_at: string;
};
export type Mensaje = {
  id: string; conversation_id: string; agent_id: string | null;
  autor: "user" | "agent"; contenido: string; refs: unknown[];
  propuesta: PropuestaTarea | null; created_at: string;
};

export type Asignacion = {
  id: string; tarea_id: string; agent_id: string; conversation_id: string | null;
  instrucciones: string; estado: string; resultado: string | null; created_at: string;
};
export type Propuesta = {
  id: string; conversation_id: string | null; agent_id: string | null;
  tipo: "crear_tarea"; payload: PropuestaTarea; estado: "pendiente" | "aplicando" | "aplicada" | "rechazada" | "error";
  resultado: { tarea_id?: string } | null; error: string | null; created_at: string;
};

function check(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(`${fallback}: ${error.message}`);
}

export async function listarAgentes(): Promise<Agente[]> {
  const { data, error } = await createClient().from("agent_configs").select("*").order("nombre");
  check(error, "No se pudieron cargar los agentes");
  return (data ?? []) as Agente[];
}
export async function listarSkills(): Promise<Skill[]> {
  const { data, error } = await createClient().from("agent_skills_mvp").select("*").order("nombre");
  check(error, "No se pudieron cargar las skills");
  return (data ?? []) as Skill[];
}
export async function guardarAgente(a: Partial<Agente>): Promise<Agente> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  const payload = {
    owner_id: sesion.session.user.id, nombre: a.nombre?.trim() || "Agente",
    descripcion: a.descripcion?.trim() ?? "", icono: a.icono?.trim() || "🤖",
    especialidad: a.especialidad?.trim() ?? "", objetivo: a.objetivo?.trim() ?? "",
    prompt: a.prompt?.trim() ?? "", modelo: a.modelo?.trim() || null,
    activo: a.activo ?? true,
  };
  if (a.id) {
    const anterior = await listarAgentes().then((xs) => xs.find((x) => x.id === a.id));
    const { data, error } = await supabase.from("agent_configs").update({
      ...payload, prompt_version: (anterior?.prompt_version ?? 1) + (anterior?.prompt !== payload.prompt ? 1 : 0),
    }).eq("id", a.id).select("*").single();
    check(error, "No se pudo guardar el agente");
    if (anterior?.prompt !== payload.prompt) {
      const v = await supabase.from("agent_config_versions").insert({ owner_id: payload.owner_id, agent_id: a.id, version: (data as Agente).prompt_version, prompt: payload.prompt });
      check(v.error, "No se pudo versionar el prompt");
    }
    return data as Agente;
  }
  const { data, error } = await supabase.from("agent_configs").insert(payload).select("*").single();
  check(error, "No se pudo crear el agente");
  const created = data as Agente;
  const version = await supabase.from("agent_config_versions").insert({ owner_id: payload.owner_id, agent_id: created.id, version: 1, prompt: payload.prompt });
  check(version.error, "No se pudo versionar el prompt");
  return created;
}
export async function guardarSkill(s: Partial<Skill>): Promise<Skill> {
  const payload = { nombre: s.nombre?.trim() || "Skill", descripcion: s.descripcion?.trim() ?? "", instrucciones: s.instrucciones?.trim() ?? "", herramientas: s.herramientas ?? [], activo: s.activo ?? true };
  const q = createClient().from("agent_skills_mvp");
  const anterior = s.id ? (await listarSkills()).find((x) => x.id === s.id) : null;
  const version = anterior ? anterior.version + 1 : 1;
  const { data, error } = s.id
    ? await q.update({ ...payload, version }).eq("id", s.id).select("*").single()
    : await q.insert({ ...payload, version }).select("*").single();
  check(error, "No se pudo guardar la skill");
  return data as Skill;
}
export async function toggleAgente(a: Agente): Promise<void> {
  const { error } = await createClient().from("agent_configs").update({ activo: !a.activo }).eq("id", a.id);
  check(error, "No se pudo cambiar el agente");
}
export async function toggleSkill(s: Skill): Promise<void> {
  const { error } = await createClient().from("agent_skills_mvp").update({ activo: !s.activo }).eq("id", s.id);
  check(error, "No se pudo cambiar la skill");
}
export async function listarLinks(agentId: string): Promise<string[]> {
  const { data, error } = await createClient().from("agent_skill_links").select("skill_id").eq("agent_id", agentId);
  check(error, "No se pudieron cargar las skills del agente");
  return (data ?? []).map((x) => x.skill_id);
}
export async function guardarLinks(agentId: string, skillIds: string[]): Promise<void> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  await supabase.from("agent_skill_links").delete().eq("agent_id", agentId);
  if (skillIds.length) {
    const { error } = await supabase.from("agent_skill_links").insert(skillIds.map((skill_id) => ({ owner_id: sesion.session.user.id, agent_id: agentId, skill_id })));
    check(error, "No se pudieron guardar las skills");
  }
}
export async function listarConversaciones(): Promise<Conversacion[]> {
  const { data, error } = await createClient().from("agent_conversations_mvp").select("*").order("updated_at", { ascending: false });
  check(error, "No se pudieron cargar las conversaciones");
  return (data ?? []) as Conversacion[];
}
export async function crearConversacion(titulo: string, proyectoId: string | null, agentIds: string[]): Promise<Conversacion> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  const { data, error } = await supabase.from("agent_conversations_mvp").insert({ owner_id: sesion.session.user.id, titulo: titulo.trim() || "Nueva conversación", proyecto_id: proyectoId }).select("*").single();
  check(error, "No se pudo crear la conversación");
  const conv = data as Conversacion;
  if (agentIds.length) {
    const { error: e } = await supabase.from("agent_conversation_participants_mvp").insert(agentIds.map((agent_id) => ({ owner_id: sesion.session.user.id, conversation_id: conv.id, agent_id })));
    check(e, "No se pudieron añadir participantes");
  }
  return conv;
}
export async function participants(conversationId: string): Promise<string[]> {
  const { data, error } = await createClient().from("agent_conversation_participants_mvp").select("agent_id").eq("conversation_id", conversationId);
  check(error, "No se pudieron cargar participantes");
  return (data ?? []).map((x) => x.agent_id);
}
export async function guardarParticipantes(conversationId: string, agentIds: string[]): Promise<void> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  await supabase.from("agent_conversation_participants_mvp").delete().eq("conversation_id", conversationId);
  if (agentIds.length) {
    const { error } = await supabase.from("agent_conversation_participants_mvp").insert(agentIds.map((agent_id) => ({ owner_id: sesion.session.user.id, conversation_id: conversationId, agent_id })));
    check(error, "No se pudieron guardar participantes");
  }
}
export async function listarMensajes(conversationId: string): Promise<Mensaje[]> {
  const { data, error } = await createClient().from("agent_messages_mvp").select("*").eq("conversation_id", conversationId).order("created_at");
  check(error, "No se pudieron cargar los mensajes");
  return (data ?? []) as Mensaje[];
}
export async function guardarMensaje(conversationId: string, agentId: string | null, autor: "user" | "agent", contenido: string, propuesta?: PropuestaTarea | null): Promise<Mensaje> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  const { data, error } = await supabase.from("agent_messages_mvp").insert({ owner_id: sesion.session.user.id, conversation_id: conversationId, agent_id: agentId, autor, contenido, propuesta: propuesta ?? null }).select("*").single();
  check(error, "No se pudo guardar el mensaje");
  return data as Mensaje;
}



export async function responder(conversationId: string, agent: Agente, skills: Skill[], pregunta: string, historial: Mensaje[], config: { base_url: string; minimax_api_key: string; model: string }, onToken: (t: string) => void): Promise<{ contenido: string; propuesta: PropuestaTarea | null }> {
  const { texto: snapshot } = await construirContexto(pregunta);
  const instrucciones = skills.filter((s) => s.activo).map((s) => `# ${s.nombre}\n${s.instrucciones}`).join("\n\n");
  const system = `${agent.objetivo || agent.especialidad || "Ayuda al usuario con sus tareas."}\n${agent.prompt}\n${instrucciones}\n\nSi quieres proponer una tarea, responde JSON {"respuesta":"...","propuesta":{"titulo":"...","descripcion":"...","prioridad":"media","proyecto_id":null,"fecha_fin":null}}. Nunca afirmes que la tarea ya está creada: la提案 requiere confirmación humana.`;
  const user = `SNAPSHOT\n${snapshot}\n\nHISTORIAL\n${historial.slice(-8).map((m) => `${m.autor}: ${m.contenido}`).join("\n")}\n\nPREGUNTA\n${pregunta}\n\nResponde en JSON con respuesta y, solo si conviene, propuesta.`;
  const bruto = await llamarLLMStream(config.base_url, config.minimax_api_key, agent.modelo || config.model, system, user, { onToken });
  return parsearRespuestaAgente(bruto);
}

export async function crearPropuesta(conversationId: string, agentId: string, propuesta: PropuestaTarea): Promise<Propuesta> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  const { data, error } = await supabase.from("agent_action_proposals_mvp").insert({ owner_id: sesion.session.user.id, conversation_id: conversationId, agent_id: agentId, tipo: "crear_tarea", payload: propuesta }).select("*").single();
  check(error, "No se pudo guardar la propuesta");
  return data as Propuesta;
}
export async function listarPropuestas(): Promise<Propuesta[]> {
  const { data, error } = await createClient().from("agent_action_proposals_mvp").select("*").order("created_at", { ascending: false });
  check(error, "No se pudieron cargar las propuestas");
  return (data ?? []) as Propuesta[];
}
export async function aplicarPropuesta(p: Propuesta): Promise<void> {
  // Reclamar la propuesta antes de escribir impide que dos pulsaciones
  // simultáneas creen dos tareas. Si la tarea falla, la propuesta queda en
  // error y puede revisarse sin duplicar.
  const supabase = createClient();
  const { data: claimed, error: claimError } = await supabase
    .from("agent_action_proposals_mvp")
    .update({ estado: "aplicando" })
    .eq("id", p.id).eq("estado", "pendiente").select("id").single();
  check(claimError, "La propuesta ya fue aplicada o no se puede aplicar");
  if (!claimed) throw new Error("La propuesta ya fue aplicada");
  try {
    const tarea = await crearTarea({
      titulo: p.payload.titulo, descripcion: p.payload.descripcion ?? null,
      prioridad: p.payload.prioridad ?? "media",
      fecha_fin: p.payload.fecha_fin ?? null,
    });
    const { error } = await supabase.from("agent_action_proposals_mvp").update({ estado: "aplicada", resultado: { tarea_id: tarea.id } }).eq("id", p.id);
    check(error, "La tarea se creó, pero no se pudo actualizar la propuesta");
  } catch (error) {
    await supabase.from("agent_action_proposals_mvp").update({ estado: "error", error: error instanceof Error ? error.message : "Error desconocido" }).eq("id", p.id);
    throw error;
  }
}
export async function rechazarPropuesta(id: string): Promise<void> {
  const { error } = await createClient().from("agent_action_proposals_mvp").update({ estado: "rechazada" }).eq("id", id).eq("estado", "pendiente");
  check(error, "No se pudo rechazar la propuesta");
}
export async function asignarTarea(tarea: Tarea, agentId: string, instrucciones: string, conversationId: string | null): Promise<void> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) throw new Error("Sesión expirada");
  const { error } = await supabase.from("agent_task_assignments_mvp").insert({ owner_id: sesion.session.user.id, tarea_id: tarea.id, agent_id: agentId, conversation_id: conversationId, instrucciones });
  check(error, "No se pudo asignar la tarea");
}
export async function listarAsignaciones(): Promise<Asignacion[]> {
  const { data, error } = await createClient().from("agent_task_assignments_mvp").select("*").order("created_at", { ascending: false });
  check(error, "No se pudieron cargar las asignaciones");
  return (data ?? []) as Asignacion[];
}
export async function registrarActividad(tipo: string, agentId?: string | null, conversationId?: string | null, detalles: Record<string, unknown> = {}): Promise<void> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) return;
  await supabase.from("agent_activity_mvp").insert({ owner_id: sesion.session.user.id, tipo, agent_id: agentId ?? null, conversation_id: conversationId ?? null, detalles });
}
