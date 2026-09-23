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
