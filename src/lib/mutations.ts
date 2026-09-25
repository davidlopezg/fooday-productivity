import { createClient } from "@/lib/supabase/client";
import type {
  InformePlan,
  PlanGeneradoSimple,
  Subtarea,
  TareaAdjunto,
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
  prioridad?: string;
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
  await createClient().from("tareas").update(update).eq("id", id);
}

export type TareaCreada = {
  id: string;
  titulo: string;
};

/** Crea la tarea y DEVUELVE el id (la fila creada). */
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
      titulo: datos.titulo,
      prioridad: datos.prioridad ?? "media",
      estado: datos.estado ?? "pendiente",
      descripcion: datos.descripcion ?? null,
      deadline: datos.deadline ?? null,
      capa: datos.capa ?? null,
      pts: datos.pts ?? null,
      esfuerzo: datos.esfuerzo ?? null,
      criterio_terminacion: datos.criterio_terminacion ?? null,
      subtareas:
        datos.subtareas && datos.subtareas.length > 0 ? datos.subtareas : null,
      origen: "manual",
    })
    .select("id,titulo")
    .single();
  if (error) throw error;
  if (!data) throw new Error("No se pudo crear la tarea");
  return { id: data.id as string, titulo: data.titulo as string };
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
        await createClient()
          .from("tareas")
          .update({ subtareas })
          .eq("id", creada.id);
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
 */
export async function guardarPlanDiarioSimple(payload: {
  fecha: string;
  fecha_larga?: string;
  estadoEmocionalTexto: string;
  plan: PlanGeneradoSimple;
}): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // num_generacion: cuenta cuántas hay hoy (puede haber varias generaciones/día)
  const { count } = await supabase
    .from("planes_diarios")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("fecha", payload.fecha);
  const num_generacion = (count ?? 0) + 1;

  const { data: plan, error } = await supabase
    .from("planes_diarios")
    .insert({
      owner_id: user.id,
      fecha: payload.fecha,
      fecha_larga: payload.fecha_larga ?? null,
      estado_emocional_texto: payload.estadoEmocionalTexto.trim() || null,
      semaforo: payload.plan.semaforo,
      analisis_emocional_ia: payload.plan.analisis_emocional || null,
      tendencia_ia: payload.plan.tendencia || null,
      recomendacion_psicologica_ia: payload.plan.recomendacion_psicologica || null,
      contexto_dia_ia: payload.plan.contexto_dia || null,
      num_bloques_activos: payload.plan.num_bloques_activos,
      comida_titulo: payload.plan.comida.titulo || null,
      comida_descripcion: payload.plan.comida.descripcion || null,
      comida_motivo: payload.plan.comida.motivo || null,
      resumen: payload.plan.analisis_emocional || null,
      recomendacion: payload.plan.recomendacion_psicologica || null,
      num_generacion,
      origen: "ia",
    })
    .select("id")
    .single();
  if (error || !plan) throw error ?? new Error("No se pudo guardar el plan");
  const planId = plan.id as string;

  // Filas en plan_diario_tareas (una por bloque activo)
  if (payload.plan.bloques.length > 0) {
    const filas = payload.plan.bloques.map((b, i) => ({
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
    const { error: errTareas } = await supabase.from("plan_diario_tareas").insert(filas);
    if (errTareas) throw errTareas;
  }

  return planId;
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const ownerId = user.id;

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
    const uniqueName = `${crypto.randomUUID()}-${safeName}`;
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
