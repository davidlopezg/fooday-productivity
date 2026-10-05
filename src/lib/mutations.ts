import { createClient } from "@/lib/supabase/client";
import type {
  InformePlan,
  PlanDiarioTarea,
  PlanGeneradoSimple,
  Subtarea,
  TareaAdjunto,
  TareaSubtarea,
} from "@/lib/types";
import { desgranarTareaIA, generarCriterioTerminacionIA } from "@/lib/plan";

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
  prioridad?: string | null;
  estado?: string;
  deadline?: string | null;
  capa?: string | null;
  pts?: number | null;
  esfuerzo?: string | null;
  criterio_terminacion?: string | null;
}

export async function actualizarTarea(datos: TareaCampos) {
  const { id, ...campos } = datos;
  const update: Record<string, unknown> = { ...campos };
  if (campos.estado !== undefined) {
    update.completada_at = campos.estado === "hecha" ? new Date().toISOString() : null;
  }
  const { error } = await createClient().from("tareas").update(update).eq("id", id);
  // Sin esto, un UPDATE fallido (RLS, red, columna inexistente) pasaba por
  // bueno y la UI mentia: el dato no se guardaba y nadie se enteraba.
  if (error) throw new Error(`No se pudo actualizar la tarea: ${error.message}`);
}

export type TareaCreada = {
  id: string;
  titulo: string;
};

/** Crea la tarea y DEVUELVE el id (la fila creada).
 *  Las subtareas se insertan DESPUÉS (necesitamos el id de la tarea).
 *  Si falla la inserción de subtareas, la tarea sigue creada — se perderán
 *  solo las subtareas, que es un mal menor. */
export async function crearTarea(datos: {
  titulo: string;
  prioridad?: string;
  estado?: string;
  descripcion?: string | null;
  deadline?: string | null;
  capa?: string | null;
  pts?: number | null;
  esfuerzo?: string | null;
  criterio_terminacion?: string | null;
  subtareas?: Subtarea[] | null;
}): Promise<TareaCreada> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("tareas")
    .insert({
      // owner_id no se pasa explícitamente porque la columna tiene
      // default auth.uid() + RLS with check. El usuario de la sesión
      // actual se asigna automáticamente en la BD.
      titulo: datos.titulo,
      prioridad: datos.prioridad ?? "media",
      estado: datos.estado ?? "pendiente",
      descripcion: datos.descripcion ?? null,
      deadline: datos.deadline ?? null,
      capa: datos.capa ?? null,
      pts: datos.pts ?? null,
      esfuerzo: datos.esfuerzo ?? null,
      criterio_terminacion: datos.criterio_terminacion ?? null,
      origen: "manual",
    })
    .select("id,titulo")
    .single();
  if (error) {
    console.error("[crearTarea] Supabase error:", error);
    throw new Error(`No se pudo crear la tarea: ${error.message}`);
  }
  if (!data) throw new Error("No se pudo crear la tarea — la base de datos no devolvió confirmación.");
  const id = data.id as string;

  if (datos.subtareas && datos.subtareas.length > 0) {
    try {
      await reemplazarSubtareasTarea(id, datos.subtareas);
    } catch (e) {
      console.warn("[crearTarea] fallo insertando subtareas:", e);
    }
  }

  return { id, titulo: data.titulo as string };
}

/**
 * Crea una tarea y, si el usuario no rellenó manualmente las subtareas y/o
 * el criterio de terminación y hay API key configurada, los GENERA con IA
 * en una llamada en background (no bloquea el guardado).
 *
 * Estrategia: guarda la tarea primero (idempotente), luego enriquece.
 * Si la IA falla, no se pierde la tarea: simplemente queda sin esos campos.
 */
export async function crearTareaConIA(
  datos: {
    titulo: string;
    descripcion?: string | null;
    prioridad?: string;
    estado?: string;
    deadline?: string | null;
    capa?: string | null;
    pts?: number | null;
    esfuerzo?: string | null;
    /** Si el usuario escribió algo manualmente, NO se sobreescribe con IA. */
    criterio_terminacion_manual?: string | null;
    /** Si el usuario metió subtareas a mano, NO se sobreescribe con IA. */
    subtareas_manuales?: Subtarea[] | null;
  },
  cfg: {
    base_url: string;
    minimax_api_key: string | null;
    model: string;
    /** Callback de progreso para mostrar feedback en la UI ("🪄 Mejorando con IA…"). */
    onProgress?: (msg: string) => void;
  },
): Promise<TareaCreada> {
  const subtareasLimpias = (datos.subtareas_manuales ?? [])
    .map((s) => ({
      descripcion: s.descripcion.trim(),
      tiempo_estimado_min:
        s.tiempo_estimado_min && s.tiempo_estimado_min > 0
          ? Math.min(5, Math.round(s.tiempo_estimado_min))
          : null,
      hecho: !!s.hecho,
    }))
    .filter((s) => s.descripcion.length > 0);

  const criterioManual = datos.criterio_terminacion_manual?.trim() || null;

  // 1) Siempre crea la tarea primero (no se pierde nada si la IA falla).
  const creada = await crearTarea({
    titulo: datos.titulo,
    descripcion: datos.descripcion ?? null,
    prioridad: datos.prioridad,
    estado: datos.estado,
    deadline: datos.deadline,
    capa: datos.capa,
    pts: datos.pts,
    esfuerzo: datos.esfuerzo,
    criterio_terminacion: criterioManual,
    subtareas: subtareasLimpias,
  });

  // 2) Decide si hay que invocar a la IA para los huecos.
  const quiereSubtareas = subtareasLimpias.length === 0;
  const quiereCriterio = !criterioManual;
  if ((!quiereSubtareas && !quiereCriterio) || !cfg.minimax_api_key) {
    return creada;
  }

  try {
    cfg.onProgress?.("🪄 Generando con IA…");

    // 2a) Subtareas (si falta) — reutilizamos desgranarTareaIA (mismo flujo que el botón "Desgranar").
    if (quiereSubtareas) {
      const { subtareas } = await desgranarTareaIA(
        cfg.base_url,
        cfg.minimax_api_key,
        cfg.model,
        {
          titulo: datos.titulo,
          descripcion: datos.descripcion ?? null,
          notas: null,
          subtareasPrevias: null,
        },
      );
      if (subtareas.length > 0) {
        await reemplazarSubtareasTarea(creada.id, subtareas);
      }
    }

    // 2b) Criterio de terminación (si falta).
    if (quiereCriterio) {
      const { criterio_terminacion } = await generarCriterioTerminacionIA(
        cfg.base_url,
        cfg.minimax_api_key,
        cfg.model,
        {
          titulo: datos.titulo,
          descripcion: datos.descripcion ?? null,
          notas: null,
          criterioPrevio: null,
        },
      );
      if (criterio_terminacion) {
        await createClient()
          .from("tareas")
          .update({ criterio_terminacion })
          .eq("id", creada.id);
      }
    }

    cfg.onProgress?.("✓ Listo");
  } catch (e) {
    // La IA falla NO debe impedir guardar la tarea. Solo lo registramos.
    console.warn("[crearTareaConIA] enriquecimiento IA falló:", e);
    cfg.onProgress?.("⚠️ IA no disponible, tarea guardada sin enriquecer");
  }

  return creada;
}

export async function crearCaptura(texto: string) {
  const t = texto.trim();
  if (!t) return;
  await createClient().from("capturas").insert({ texto: t, estado: "pendiente" });
}

/**
 * Desgrana una tarea al máximo posible usando la IA y persiste el resultado
 * en `tareas_subtareas`. Mantiene el estado `hecho` de las subtareas que ya
 * existieran con la misma descripción.
 */
export async function desgranarTarea(
  id: string,
  cfg: { base_url: string; minimax_api_key: string | null; model: string },
): Promise<TareaSubtarea[]> {
  const supabase = createClient();

  // 1) Lee la tarea actual para tener título + descripción + subtareas previas
  const { data: tarea, error: errRead } = await supabase
    .from("tareas")
    .select("titulo,descripcion,notas")
    .eq("id", id)
    .maybeSingle();
  if (errRead) throw errRead;
  if (!tarea) throw new Error("Tarea no encontrada");

  if (!cfg.minimax_api_key) {
    throw new Error(
      "No hay API key configurada. Ve a Configuración → MiniMax API key y guarda una.",
    );
  }

  // 2) Lee las subtareas previas para pasarlas al prompt y preservar `hecho`
  const { data: subsPrevias } = await supabase
    .from("tareas_subtareas")
    .select("descripcion, hecho")
    .eq("tarea_id", id);
  const subtareasPreviasWire: Subtarea[] = (subsPrevias ?? []).map((s) => ({
    descripcion: (s as { descripcion: string }).descripcion,
    tiempo_estimado_min: null,
    hecho: (s as { hecho: boolean }).hecho,
  }));

  // 3) Llama a la IA
  const { subtareas } = await desgranarTareaIA(
    cfg.base_url,
    cfg.minimax_api_key,
    cfg.model,
    {
      titulo: (tarea.titulo as string) ?? "",
      descripcion: (tarea.descripcion as string | null) ?? null,
      notas: (tarea.notas as string | null) ?? null,
      subtareasPrevias: subtareasPreviasWire,
    },
  );

  // 4) Persiste (reemplazo total, preservando `hecho` por descripción)
  const guardadas = await reemplazarSubtareasTarea(id, subtareas);
  return guardadas;
}

/**
 * Reemplaza TODAS las subtareas de una tarea. Preserva el flag `hecho` de
 * las que ya estuvieran marcadas, matching por descripción normalizada
 * (trim + lower + colapsar espacios). Devuelve las filas insertadas.
 *
 * Es el único punto de escritura sobre `tareas_subtareas` — úsalo siempre
 * que quieras modificar las subtareas desde la app.
 */
export async function reemplazarSubtareasTarea(
  tareaId: string,
  nuevas: Subtarea[],
): Promise<TareaSubtarea[]> {
  const supabase = createClient();

  // 1) Lee `hecho` de las anteriores
  const { data: anteriores, error: errPrev } = await supabase
    .from("tareas_subtareas")
    .select("descripcion, hecho")
    .eq("tarea_id", tareaId);
  if (errPrev) throw errPrev;

  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const hechas = new Set(
    (anteriores ?? [])
      .filter((a) => a.hecho && (a as { descripcion: string }).descripcion)
      .map((a) => norm((a as { descripcion: string }).descripcion)),
  );

  // 2) Borra todas
  const { error: errDel } = await supabase
    .from("tareas_subtareas")
    .delete()
    .eq("tarea_id", tareaId);
  if (errDel) throw errDel;

  // 3) Sanea e inserta
  const limpias = nuevas
    .map((s) => ({
      descripcion: s.descripcion.trim(),
      tiempo_estimado_min:
        s.tiempo_estimado_min && s.tiempo_estimado_min > 0
          ? Math.min(5, Math.round(s.tiempo_estimado_min))
          : null,
      // Preserva el `hecho` que trae el input (lo que el usuario acaba de
      // marcar en el editor). Solo recurrimos al match por descripción con
      // las filas antiguas cuando el input NO trae `hecho` definido — eso
      // ocurre cuando las subtareas vienen de la IA, que a veces omite el flag.
      hecho: typeof s.hecho === "boolean" ? s.hecho : undefined,
    }))
    .filter((s) => s.descripcion.length > 0);
  if (limpias.length === 0) return [];

  const filas = limpias.map((s, i) => ({
    tarea_id: tareaId,
    descripcion: s.descripcion,
    tiempo_estimado_min: s.tiempo_estimado_min,
    orden: i,
    hecho: typeof s.hecho === "boolean" ? s.hecho : hechas.has(norm(s.descripcion)),
  }));
  const { data: insertadas, error: errIns } = await supabase
    .from("tareas_subtareas")
    .insert(filas)
    .select("*");
  if (errIns) throw errIns;
  return (insertadas ?? []) as TareaSubtarea[];
}

export async function guardarConfiguracion(datos: {
  base_url?: string;
  minimax_api_key: string | null;
  model: string;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const user = session.user;
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const user = session.user;

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

// ============================================================================
// Plan diario v3 — mutaciones simples (input libre + timeblocking + comida)
// ============================================================================

/**
 * Resultado de meter una tarea suelta: si la tarea ya existía, devolvemos su
 * id; si no, la RPC la crea y devuelve el id nuevo.
 */
export type UpsertTareaResultado = {
  id: string;
  creada: boolean;
  titulo: string;
};

/**
 * Tarea suelta introducida por el usuario en el formulario (Parte 1).
 * Se persiste en `tareas` con búsqueda case-insensitive: si ya existe,
 * se devuelve el id sin duplicar; si no, se crea y se devuelve el id nuevo.
 */
export async function upsertTareaPorTitulo(titulo: string): Promise<UpsertTareaResultado> {
  const t = titulo.trim();
  if (!t) throw new Error("Título vacío");

  // Antes de la RPC miramos si ya existe (para saber si fue creada o no).
  // La RPC también lo gestiona, pero esto nos evita una segunda query.
  const supabase = createClient();
  const { data: existente } = await supabase
    .from("tareas")
    .select("id")
    .ilike("titulo", t)
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase.rpc("upsert_tarea_by_titulo", {
    p_titulo: t,
  });
  if (error) throw error;
  if (!data) throw new Error("La RPC no devolvió id de tarea");
  return { id: data as string, creada: !existente, titulo: t };
}

/**
 * Guarda el plan diario completo en su forma simple (Parte 2):
 * cabecera con análisis A + nº de bloques + filas en plan_diario_tareas
 * con bloque_num/tipo_tarea + sugerencia de comida C.
 *
 * Si recibe `estado` (5 dimensiones), también persiste en las columnas
 * v2 (`despertar`, `mente`, `cuerpo`, `rueda`, `necesidad`) para que el
 * Dashboard emocional pueda graficarlas.
 */
export async function guardarPlanDiarioSimple(payload: {
  fecha: string;
  fecha_larga?: string;
  /** Estado emocional estructurado (los 5 selects). Se persiste en columnas v2. */
  estado: {
    despertar: string;
    mente: string;
    cuerpo: string;
    rueda: string;
    necesidad: string;
  };
  /** Reflexión libre opcional. Se persiste en `planes_diarios.reflexion`. */
  reflexion?: string;
  plan: PlanGeneradoSimple;
}): Promise<{ planId: string; tareas: PlanDiarioTarea[] }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const user = session.user;

  // num_generacion: cuenta cuántas hay hoy (puede haber varias generaciones/día)
  const { count } = await supabase
    .from("planes_diarios")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("fecha", payload.fecha);
  const num_generacion = (count ?? 0) + 1;

  const estadoTexto = [
    payload.estado.despertar,
    payload.estado.mente,
    payload.estado.cuerpo,
    payload.estado.rueda,
    payload.estado.necesidad,
  ].join(" · ");

  const { data: plan, error } = await supabase
    .from("planes_diarios")
    .insert({
      owner_id: user.id,
      fecha: payload.fecha,
      fecha_larga: payload.fecha_larga ?? null,
      // 6 secciones finales del plan
      resumen: payload.plan.resumen || null,
      recomendacion: payload.plan.recomendacion || null,
      // Lectura psicológica mapeada a 2 columnas v3 (lo del día + histórico)
      analisis_emocional_ia:
        payload.plan.lectura_psicologica.lo_del_dia || null,
      tendencia_ia:
        payload.plan.lectura_psicologica.analisis_historico || null,
      // Tu día optimizado
      num_bloques_activos: payload.plan.tu_dia_optimizado.num_bloques_activos,
      // Propuesta de comida
      comida_titulo: payload.plan.propuesta_comida.titulo || null,
      comida_descripcion: payload.plan.propuesta_comida.descripcion || null,
      comida_motivo: payload.plan.propuesta_comida.motivo || null,
      // v2 columnas (alimentan Dashboard emocional)
      semaforo: payload.plan.semaforo,
      estado_emocional_texto: estadoTexto || null,
      despertar: payload.estado.despertar || null,
      mente: payload.estado.mente || null,
      cuerpo: payload.estado.cuerpo || null,
      rueda: payload.estado.rueda || null,
      necesidad: payload.estado.necesidad || null,
      reflexion: payload.reflexion?.trim() || null,
      // Legacy (no se reescriben en planes v3 nuevos, pero las dejamos en BD
      // por compat con planes v2 antiguos que pudiera haber).
      // recomendacion_psicologica_ia y contexto_dia_ia quedan en NULL.
      num_generacion,
      origen: "ia",
    })
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("No se pudo guardar el plan");
  const planId = plan.id as string;

  // Filas en plan_diario_tareas (una por bloque activo)
  let tareas: PlanDiarioTarea[] = [];
  const bloques = payload.plan.tu_dia_optimizado.bloques;
  if (bloques.length > 0) {
    const filas = bloques.map((b, i) => ({
      plan_diario_id: planId,
      tarea_id: b.tarea_id ?? null,
      tipo: "imprescindible" as const,
      titulo_libre: b.titulo_libre,
      orden: i,
      hecho: false,
      bloque_num: b.bloque_num,
      tipo_tarea: b.tipo,
      bloque_energia: null,
      bloque_cognitivo: null,
      es_tarea_libre: b.tarea_id == null,
    }));
    const { data: inserted, error: errTareas } = await supabase
      .from("plan_diario_tareas")
      .insert(filas)
      .select("*");
    if (errTareas) throw errTareas;
    tareas = (inserted ?? []) as PlanDiarioTarea[];
  }

  return { planId, tareas };
}

// ============================================================================
// Edición de bloques del plan (post-generación)
// ============================================================================

/**
 * Renombra el `titulo_libre` de una tarea del plan.
 * No toca la tarea en BD si `es_tarea_libre=false` (en ese caso, el nombre
 * viene de la tarea original; el usuario tendría que editar la tarea en /tareas).
 */
export async function renombrarTareaPlan(id: string, titulo: string): Promise<void> {
  const limpio = titulo.trim();
  if (!limpio) throw new Error("El título no puede estar vacío");
  const { error } = await createClient()
    .from("plan_diario_tareas")
    .update({ titulo_libre: limpio })
    .eq("id", id);
  if (error) throw new Error(`No se pudo renombrar: ${error.message}`);
}

/**
 * Mueve una tarea de un bloque a otro dentro del mismo plan.
 * Si el bloque destino ya tiene una tarea, las SWAPpea (origen→destino,
 * destino→origen) en una sola operación atómica via CASE.
 *
 * No hace nada si source.bloque_num === nuevoBloqueNum.
 */
export async function moverTareaABloque(
  planId: string,
  sourceTareaId: string,
  nuevoBloqueNum: 1 | 2 | 3 | 4,
): Promise<void> {
  const supabase = createClient();

  // 1) Lee origen y (si existe) destino
  const { data: src, error: e1 } = await supabase
    .from("plan_diario_tareas")
    .select("id, bloque_num")
    .eq("id", sourceTareaId)
    .eq("plan_diario_id", planId)
    .maybeSingle();
  if (e1) throw new Error(`No se pudo leer el origen: ${e1.message}`);
  if (!src) throw new Error("Tarea origen no encontrada en este plan");
  if (src.bloque_num === nuevoBloqueNum) return; // nada que hacer

  const { data: dst, error: e2 } = await supabase
    .from("plan_diario_tareas")
    .select("id")
    .eq("plan_diario_id", planId)
    .eq("bloque_num", nuevoBloqueNum)
    .neq("id", sourceTareaId)
    .maybeSingle();
  if (e2) throw new Error(`No se pudo leer el destino: ${e2.message}`);

  if (!dst) {
    // Bloque destino vacío → simple UPDATE
    const { error } = await supabase
      .from("plan_diario_tareas")
      .update({ bloque_num: nuevoBloqueNum })
      .eq("id", sourceTareaId);
    if (error) throw new Error(`No se pudo mover: ${error.message}`);
    return;
  }

  // Swap en 2 pasos. No hay UNIQUE sobre (plan_diario_id, bloque_num)
  // y la CHECK solo limita el rango a 1-4, así que ambas tareas pueden
  // coincidir en `nuevoBloqueNum` momentáneamente sin romper nada.
  // Paso 1: origen → nuevoBloqueNum (coincide con dst por un instante).
  const { error: e3 } = await supabase
    .from("plan_diario_tareas")
    .update({ bloque_num: nuevoBloqueNum })
    .eq("id", sourceTareaId);
  if (e3) throw new Error(`No se pudo mover (paso 1): ${e3.message}`);

  // Paso 2: destino → bloque antiguo del origen.
  const { error: e4 } = await supabase
    .from("plan_diario_tareas")
    .update({ bloque_num: src.bloque_num })
    .eq("id", dst.id);
  if (e4) throw new Error(`No se pudo mover (paso 2): ${e4.message}`);
}


// ============================================================================
// Adjuntos de tarea — Supabase Storage + tabla `tarea_adjuntos`
// ============================================================================
//
// Estrategia:
//   • Bytes: bucket PRIVADO "tareas-adjuntos" en Storage. RLS por auth.uid()
//     gracias al path "<owner_id>/<tarea_id>/<uuid>-<filename>".
//   • Metadatos: tabla `tarea_adjuntos` con FK a `tareas(id) ON DELETE CASCADE`.
//   • Descarga: signed URL temporal (1h) — el bucket es privado.
//   • Cap por archivo: 10 MB (validado en cliente y enforced por el bucket).
//
// En el flujo "Crear tarea" subimos los adjuntos DESPUÉS de crear la fila
// (necesitamos el id de la tarea). Si una subida falla, los demás siguen.
// ============================================================================

/** Genera un UUID v4 compatible con navegadores modernos y antiguos Android WebView. */
function generarUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback para navegadores antiguos / WebViews Android < 85
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const ADJUNTOS_BUCKET = "tareas-adjuntos";
export const MAX_ADJUNTO_BYTES = 10 * 1024 * 1024; // 10 MB

export type SubirAdjuntoProgreso = (idx: number, file: File, estado: "subiendo" | "ok" | "error", errMsg?: string) => void;

/** Sanitiza un filename para usarlo dentro de un path de Storage (sin slashes ni acentos peligrosos). */
function sanitizeFilename(name: string): string {
  // Quita rutas raras, deja solo letras/numeros/._-
  return name
    .replace(/[/\\]/g, "_")
    .replace(/[\u0000-\u001F]+/g, "_")
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

/** Sube 1+ archivos al bucket y persiste sus metadatos. */
export async function subirAdjuntos(
  tareaId: string,
  files: File[],
  onProgreso?: SubirAdjuntoProgreso,
): Promise<TareaAdjunto[]> {
  if (files.length === 0) return [];

  // 1) Averigua el owner para construir el path válido bajo el RLS del Storage.
  // Usamos getSession() (cached en memoria) en vez de getUser() (HTTP call).
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const ownerId = session.user.id;

  const creados: TareaAdjunto[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > MAX_ADJUNTO_BYTES) {
      const msg = `${file.name} supera el límite de 10 MB`;
      onProgreso?.(i, file, "error", msg);
      console.warn("[subirAdjuntos]", msg);
      continue;
    }
    onProgreso?.(i, file, "subiendo");
    const safeName = sanitizeFilename(file.name) || "archivo";
    const uniqueName = `${generarUUID()}-${safeName}`;
    const storagePath = `${ownerId}/${tareaId}/${uniqueName}`;

    try {
      const { error: errUp } = await supabase.storage
        .from(ADJUNTOS_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: false,
        });
      if (errUp) throw errUp;

      const { data: fila, error: errIns } = await supabase
        .from("tarea_adjuntos")
        .insert({
          tarea_id: tareaId,
          filename: file.name,
          mime: file.type || null,
          size_bytes: file.size,
          storage_path: storagePath,
        })
        .select("*")
        .single();
      if (errIns || !fila) throw errIns ?? new Error("No se pudo guardar el adjunto");

      creados.push(fila as TareaAdjunto);
      onProgreso?.(i, file, "ok");
    } catch (e) {
      const msg = (e as Error).message ?? "Error al subir";
      console.warn("[subirAdjuntos] fallo subiendo", file.name, e);
      onProgreso?.(i, file, "error", msg);
    }
  }

  return creados;
}

/** Borra un adjunto: archivo del bucket + fila. */
export async function eliminarAdjunto(adj: TareaAdjunto): Promise<void> {
  const supabase = createClient();
  // 1) Storage (best-effort; aunque falle, intentamos borrar la fila).
  const { error: errSt } = await supabase.storage
    .from(ADJUNTOS_BUCKET)
    .remove([adj.storage_path]);
  if (errSt) {
    console.warn("[eliminarAdjunto] storage.remove falló:", errSt);
  }
  // 2) Fila
  const { error: errDel } = await supabase
    .from("tarea_adjuntos")
    .delete()
    .eq("id", adj.id);
  if (errDel) throw errDel;
}

/** Genera un signed URL temporal (1h) para abrir/descargar el archivo. */
export async function signedUrlAdjunto(adj: TareaAdjunto, expiresIn = 3600): Promise<string> {
  const { data, error } = await createClient().storage
    .from(ADJUNTOS_BUCKET)
    .createSignedUrl(adj.storage_path, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("No se pudo generar la URL firmada");
  return data.signedUrl;
}

// ============================================================================
// Plan semanal — mutaciones (plan_semanal_tareas)
//
// Reglas:
//   • Cada tarea aparece como máximo UNA VEZ por (anio, semana_iso).
//   • Para moverla de día, se hace UPDATE sobre la misma fila (no DELETE+INSERT).
//   • Para sacarla de la semana, se hace DELETE.
//   • Para meterla, INSERT (o UPSERT si se quiere idempotencia).
// ============================================================================

/**
 * Coloca una tarea en un día de la semana. Si ya estaba planificada esa
 * semana (en otro día o en el mismo), actualiza `dia_semana` y `orden`.
 */
export async function asignarTareaADia(payload: {
  anio: number;
  semana_iso: number;
  tarea_id: string;
  dia_semana: number;
  orden?: number;
}): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const user = session.user;
  const { error } = await supabase
    .from("plan_semanal_tareas")
    .upsert(
      {
        owner_id: user.id,
        anio: payload.anio,
        semana_iso: payload.semana_iso,
        tarea_id: payload.tarea_id,
        dia_semana: payload.dia_semana,
        orden: payload.orden ?? 0,
      },
      { onConflict: "owner_id,anio,semana_iso,tarea_id" },
    );
  if (error) throw new Error(`No se pudo asignar la tarea: ${error.message}`);
}

/** Saca una tarea de la planificación de esa semana. */
export async function quitarTareaDeSemana(payload: {
  anio: number;
  semana_iso: number;
  tarea_id: string;
}): Promise<void> {
  const { error } = await createClient()
    .from("plan_semanal_tareas")
    .delete()
    .eq("anio", payload.anio)
    .eq("semana_iso", payload.semana_iso)
    .eq("tarea_id", payload.tarea_id);
  if (error) throw new Error(`No se pudo quitar la tarea: ${error.message}`);
}

/**
 * Aplica en batch la propuesta de la IA: mapea dia_semana → [tarea_id, ...]
 * y hace UPSERT de todas las filas en una sola llamada.
 * No borra lo que ya había: AÑADE (lo que ya estuviera en otro día se sobreescribe
 * porque la PK compuesta es (owner, anio, semana, tarea)).
 */
export async function aplicarPropuestaIA(payload: {
  anio: number;
  semana_iso: number;
  /** Ej: { 1: ["uuid1","uuid2"], 3: ["uuid3"], ... }. Días fuera de [1..7] se ignoran. */
  propuesta: Record<number, string[]>;
}): Promise<number> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autenticado");
  const user = session.user;

  const filas: Array<Record<string, unknown>> = [];
  for (const [diaStr, tareaIds] of Object.entries(payload.propuesta)) {
    const dia = Number(diaStr);
    if (!Number.isFinite(dia) || dia < 1 || dia > 7) continue;
    tareaIds.forEach((tareaId, i) => {
      if (!tareaId) return;
      filas.push({
        owner_id: user.id,
        anio: payload.anio,
        semana_iso: payload.semana_iso,
        tarea_id: tareaId,
        dia_semana: dia,
        orden: i,
      });
    });
  }
  if (filas.length === 0) return 0;
  const { error } = await supabase
    .from("plan_semanal_tareas")
    .upsert(filas, { onConflict: "owner_id,anio,semana_iso,tarea_id" });
  if (error) throw new Error(`No se pudo aplicar la propuesta: ${error.message}`);
  return filas.length;
}
