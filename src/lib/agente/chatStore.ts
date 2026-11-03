"use client";

// ============================================================================
// agente/chatStore.ts — persistencia del chat del agente.
//
// DOS TABLAS (migration 0035):
//   · `agente_conversaciones` — una fila por conversación.
//   · `agente_mensajes`       — un mensaje por fila (rol user/assistant).
//
// Por qué dos y no una con JSONB: el historial se lee y se escribe con
// queries simples. Con JSONB habría que releer y reescribir el blob entero
// en cada mensaje (read-modify-write) y dos clientes a la vez se pisan.
//
// TODO el acceso es de LECTURA/escritura simple sobre datos del propio
// usuario; las políticas RLS de la migration 0035 hacen el resto.
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";

/** Tipo de entidad del dominio que la respuesta puede mencionar. */
export type TipoRef = "proyecto" | "meta" | "kr" | "tarea";

/** Referencia navegable: la respuesta la pinta como chip con enlace. */
export type RefEntidad = {
  tipo: TipoRef;
  id: string;
  etiqueta: string;
  /** Solo para tipo "kr": la meta a la que pertenece (destino del enlace,
   *  porque el detalle de un KR vive dentro del de su meta). */
  meta_id?: string | null;
};

export type Conversacion = {
  id: string;
  titulo: string | null;
  created_at: string;
  updated_at: string;
};

export type MensajeChat = {
  id: string;
  conversacion_id: string;
  rol: "user" | "assistant";
  contenido: string;
  refs: RefEntidad[];
  created_at: string;
  /** NO se guarda en la BD: solo en el estado local. Cuánto tardó la
   *  IA en responder (para que el usuario vea si el cuello de botella es
   *  el modelo o la red). */
  ms?: number;
};

/** Historial de conversaciones, más reciente primero. */
export async function listarConversaciones(): Promise<Conversacion[]> {
  const { data, error } = await createClient()
    .from("agente_conversaciones")
    .select("id,titulo,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(errorMessage(error, "No se pudo leer el historial"));
  return (data ?? []) as Conversacion[];
}

/** Crea una conversación vacía. El título se rellena con el 1er mensaje. */
export async function crearConversacion(
  titulo?: string | null,
): Promise<Conversacion> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) {
    throw new Error("Sesión expirada. Recarga la página y vuelve a intentarlo.");
  }
  const { data, error } = await supabase
    .from("agente_conversaciones")
    .insert({
      owner_id: sesion.session.user.id,
      titulo: titulo ?? null,
    })
    .select("id,titulo,created_at,updated_at")
    .single();
  if (error) throw new Error(errorMessage(error, "No se pudo crear la conversación"));
  return data as Conversacion;
}

/** Mensajes de una conversación, en orden cronológico. */
export async function cargarMensajes(
  conversacionId: string,
): Promise<MensajeChat[]> {
  const { data, error } = await createClient()
    .from("agente_mensajes")
    .select("id,conversacion_id,rol,contenido,refs,created_at")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(errorMessage(error, "No se pudo leer el chat"));
  return ((data ?? []) as Array<Omit<MensajeChat, "refs"> & { refs: unknown }>).map(
    (m) => ({
      ...m,
      refs: Array.isArray(m.refs) ? (m.refs as RefEntidad[]) : [],
    }),
  );
}

/** Guarda un mensaje y lo devuelve con su id. */
export async function guardarMensaje(
  conversacionId: string,
  rol: "user" | "assistant",
  contenido: string,
  refs: RefEntidad[] = [],
): Promise<MensajeChat> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getSession();
  if (!sesion?.session?.user) {
    throw new Error("Sesión expirada. Recarga la página y vuelve a intentarlo.");
  }
  const { data, error } = await supabase
    .from("agente_mensajes")
    .insert({
      owner_id: sesion.session.user.id,
      conversacion_id: conversacionId,
      rol,
      contenido,
      refs,
    })
    .select("id,conversacion_id,rol,contenido,refs,created_at")
    .single();
  if (error) throw new Error(errorMessage(error, "No se pudo guardar el mensaje"));
  return {
    ...(data as Omit<MensajeChat, "refs">),
    refs: Array.isArray(data.refs) ? (data.refs as RefEntidad[]) : [],
  };
}

/** Borra la conversación y todos sus mensajes (cascade en BD). */
export async function borrarConversacion(conversacionId: string): Promise<void> {
  const { error } = await createClient()
    .from("agente_conversaciones")
    .delete()
    .eq("id", conversacionId);
  if (error) throw new Error(errorMessage(error, "No se pudo borrar el chat"));
}

/** Ruta de la app a la que lleva una referencia. */
export function rutaDeRef(ref: RefEntidad): string | null {
  switch (ref.tipo) {
    case "proyecto":
      // /proyectos no tiene detalle propio: la vista de tareas del proyecto.
      return `/tareas?proyecto=${ref.id}`;
    case "meta":
      return `/metas/detalle?id=${ref.id}`;
    case "kr":
      // El detalle de KR vive dentro del de su meta.
      return ref.meta_id ? `/metas/detalle?id=${ref.meta_id}` : "/metas";
    case "tarea":
      return `/tareas`;
    default:
      return null;
  }
}
