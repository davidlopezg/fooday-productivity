// ============================================================================
// recuperacion/feedback.ts — Fase 6: que el usuario pueda decir "no".
// ----------------------------------------------------------------------------
// QUÉ ES
//   Cuando el Modo Recuperación propone una tarea y el usuario no está de
//   acuerdo, necesita poder responder. Y la respuesta tiene que SERVIR:
//   si el sistema vuelve a proponer lo mismo mañana, y el usuario ya dijo
//   que hoy no, algo se ha roto.
//
//   Este módulo guarda ese "no" de forma que el motor pueda tenerlo en
//   cuenta, sin convertir al sistema en un agente que decide por su
//   cuenta.
//
// LO QUE NO HACE
//   · No crea un estado nuevo de tarea: `tareas.estado` ya tiene
//     'bloqueada' y se usa tal cual.
//   · No borra ni reordena nada.
//   · No manda correos, no notifica a nadie, no toca nada fuera del
//     propietario (RLS de Supabase).
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import { localYMD } from "@/lib/semana";

// ============================================================================
// Tipos
// ============================================================================

/** Qué puede hacer el usuario con una tarea propuesta. */
export type AccionFeedback =
  /** "Sí, esto es lo que toca hoy." */
  | "aceptada"
  /** "Hoy no, pero sigue viva: la aplazo." */
  | "pospuesta"
  /** "No es mi tarea / no puedo hacerla." */
  | "bloqueada"
  /** "No me interesa: no es prioritaria para mí." */
  | "no_prioritaria";

/** Niveles de carga del motor (para contextualizar el feedback). */
export type NivelCarga = "alta" | "media" | "minima";

export type FeedbackRecuperacion = {
  id: string;
  fecha: string;
  tarea_id: string | null;
  regla_propuesta: string;
  accion: AccionFeedback;
  motivo: string | null;
  nivel_carga: NivelCarga | null;
  created_at: string;
};

// ============================================================================
// Acciones
// ============================================================================

/**
 * Registra el feedback del usuario sobre una tarea propuesta.
 *
 * Además de guardar el feedback en su tabla,APLICA el efecto en `tareas`:
 *   · `pospuesta`       → `pospuesta_hasta` = fecha (la tarea SIGUE viva)
 *   · `bloqueada`       → `tareas.estado` = 'bloqueada'
 *   · `no_prioritaria`  → `motivo_no_prioritaria` + `pospuesta_hasta`
 *   · `aceptada`        → no toca la tarea (solo registra que se aceptó)
 *
 * El motivo es OBLIGATORIO cuando la acción no es "aceptada": sin motivo
 * el sistema no puede aprender nada y la tarea volverá a salir igual.
 */
export async function registrarFeedback(args: {
  tareaId: string | null;
  reglaPropuesta: string;
  accion: AccionFeedback;
  motivo?: string | null;
  nivelCarga?: NivelCarga | null;
  /** Días que se pospone (solo para `pospuesta`). Por defecto 1. */
  diasPostergar?: number;
}): Promise<void> {
  const motivo = (args.motivo ?? "").trim();
  if (args.accion !== "aceptada" && !motivo) {
    throw new Error(
      "Para posponer, bloquear o marcar como no prioritaria hace falta un motivo: sin él el sistema no puede evitar repetir la propuesta.",
    );
  }

  const hoy = localYMD(new Date());
  const supabase = createClient();

  // 1. Efecto en la tarea (si la hay).
  if (args.tareaId) {
    const patch: Record<string, unknown> = {};
    if (args.accion === "pospuesta") {
      const dias = Math.max(1, args.diasPostergar ?? 1);
      patch.pospuesta_hasta = sumarDias(hoy, dias);
      patch.postergada_en = new Date().toISOString();
      patch.motivo_no_prioritaria = motivo;
    } else if (args.accion === "bloqueada") {
      patch.estado = "bloqueada";
      patch.motivo_no_prioritaria = motivo;
      patch.postergada_en = new Date().toISOString();
    } else if (args.accion === "no_prioritaria") {
      patch.motivo_no_prioritaria = motivo;
      patch.postergada_en = new Date().toISOString();
    }
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from("tareas")
        .update(patch)
        .eq("id", args.tareaId);
      if (error) {
        throw new Error(`No se pudo actualizar la tarea: ${error.message}`);
      }
    }
  }

  // 2. Registro del feedback (siempre, incluso sin tarea: por si el plan
  //    propone algo libre).
  const { error } = await supabase.from("recuperacion_feedback").insert({
    fecha: hoy,
    tarea_id: args.tareaId,
    regla_propuesta: args.reglaPropuesta,
    accion: args.accion,
    motivo: motivo || null,
    nivel_carga: args.nivelCarga ?? null,
  });
  if (error) {
    throw new Error(`No se pudo guardar el feedback: ${error.message}`);
  }
}

/**
 * Acepta la propuesta. No cambia la tarea: solo deja constancia.
 * (El "empezar" → `en_progreso` es otra acción, ver `iniciarTarea`.)
 */
export async function aceptarPropuesta(args: {
  tareaId: string | null;
  reglaPropuesta: string;
  nivelCarga?: NivelCarga | null;
}): Promise<void> {
  await registrarFeedback({
    tareaId: args.tareaId,
    reglaPropuesta: args.reglaPropuesta,
    accion: "aceptada",
    nivelCarga: args.nivelCarga ?? null,
  });
}

/**
 * Marca una tarea como `en_progreso`.
 *
 * Es el "Iniciar la tarea" del prompt. NO se inventa un estado nuevo:
 * `en_progreso` ya existe en `tareas.estado` desde 0001_init.sql.
 */
export async function iniciarTarea(id: string): Promise<void> {
  const { error } = await createClient()
    .from("tareas")
    .update({ estado: "en_progreso" })
    .eq("id", id);
  if (error) throw new Error(`No se pudo iniciar la tarea: ${error.message}`);
}

/**
 * Limpia la postergación de una tarea (cuando vuelve a ser propuesta o
 * cuando el usuario la reactiva a mano).
 */
export async function limpiarPostergacion(id: string): Promise<void> {
  const { error } = await createClient()
    .from("tareas")
    .update({ pospuesta_hasta: null, postergada_en: null })
    .eq("id", id);
  if (error) {
    throw new Error(`No se pudo limpiar la postergación: ${error.message}`);
  }
}

// ============================================================================
// Lectura
// ============================================================================

/** Lee el feedback de una fecha. */
export async function fetchFeedbackFecha(
  fecha: string,
): Promise<FeedbackRecuperacion[]> {
  const { data, error } = await createClient()
    .from("recuperacion_feedback")
    .select("*")
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`No se pudo leer el feedback: ${error.message}`);
  }
  return (data ?? []) as FeedbackRecuperacion[];
}

/**
 * Lee los bloqueos y postergaciones vigentes.
 *
 * El motor los usa para NO proponer lo que el usuario ya ha apartado:
 * una tarea bloqueada no se propone; una pospuesta hasta una fecha no se
 * propone antes de esa fecha.
 */
export async function fetchAparcamientos(): Promise<{
  bloqueadas: Set<string>;
  pospuestasHasta: Map<string, string>;
}> {
  const { data, error } = await createClient()
    .from("tareas")
    .select("id, estado, pospuesta_hasta")
    .in("estado", ["bloqueada", "archivada", "descartada"]);
  if (error) {
    throw new Error(`No se pudieron leer los apartamientos: ${error.message}`);
  }
  const bloqueadas = new Set<string>();
  const pospuestasHasta = new Map<string, string>();
  for (const t of (data ?? []) as {
    id: string;
    estado: string;
    pospuesta_hasta: string | null;
  }[]) {
    bloqueadas.add(t.id);
    if (t.pospuesta_hasta) pospuestasHasta.set(t.id, t.pospuesta_hasta);
  }

  // Las pospuestas (que siguen 'pendientes') se leen aparte.
  const { data: posp, error: err2 } = await createClient()
    .from("tareas")
    .select("id, pospuesta_hasta")
    .not("pospuesta_hasta", "is", null);
  if (!err2) {
    for (const t of (posp ?? []) as { id: string; pospuesta_hasta: string }[]) {
      if (!bloqueadas.has(t.id)) {
        pospuestasHasta.set(t.id, t.pospuesta_hasta);
      }
    }
  }

  return { bloqueadas, pospuestasHasta };
}

// ============================================================================
// Utilidades
// ============================================================================

/** Suma días a una fecha ISO (YYYY-MM-DD) y devuelve ISO. */
export function sumarDias(fechaIso: string, dias: number): string {
  const f = new Date(fechaIso + "T00:00:00");
  f.setDate(f.getDate() + dias);
  return localYMD(f);
}
