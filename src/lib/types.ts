// Tipos del dominio operativo (alineados con supabase/migrations/0001_init.sql)

export type Semaforo = "verde" | "amarillo" | "rojo";

export type EstadoMeta =
  | "sin_empezar"
  | "en_progreso"
  | "bloqueada"
  | "completada"
  | "archivada";

export type EstadoTarea =
  | "pendiente"
  | "en_progreso"
  | "bloqueada"
  | "hecha"
  | "descartada"
  | "archivada";

export type Prioridad = "critica" | "urgente" | "alta" | "media" | "baja";

export interface Area {
  id: string;
  nombre: string;
  color: string | null;
  orden: number;
}

export interface Proposito {
  id: string;
  area_id: string | null;
  texto: string;
  orden: number;
}

export interface Valor {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface Vision {
  id: string;
  horizonte: string;
  texto: string;
  es_bhag: boolean;
  orden: number;
}

export interface Meta {
  id: string;
  area_id: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoMeta;
  prioridad: Prioridad | null;
  rice: number | null;
  plazo: string | null;
}

/**
 * Forma "wire" de una subtarea — la que produce/acepta la IA y la UI
 * (sin id, sin tarea_id). Cuando la subtarea ya está persistida, se usa
 * `TareaSubtarea` (con id, tarea_id, owner_id, orden).
 */
export interface Subtarea {
  descripcion: string;
  tiempo_estimado_min?: number | null;
  hecho?: boolean;
}

/** Fila persistida en `tareas_subtareas` (FK a `tareas`). */
export interface TareaSubtarea {
  id: string;
  owner_id: string;
  tarea_id: string;
  descripcion: string;
  tiempo_estimado_min: number | null;
  hecho: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
}

/** Fila de metadatos en `tarea_adjuntos`. Los bytes viven en Supabase Storage. */
export interface TareaAdjunto {
  id: string;
  tarea_id: string;
  filename: string;
  mime: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

export interface Tarea {
  id: string;
  area_id: string | null;
  meta_id: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad | null;
  capa: string | null;
  deadline: string | null;
  pts: number | null;
  esfuerzo: string | null;
  importe: number | null;
  estado: EstadoTarea;
  origen: string | null;
  notas: string | null;
  completada_at: string | null;
  /** Subtareas (desglose) — vienen con la tarea al hacer nested select. */
  subtareas: TareaSubtarea[] | null;
  /** Frase "Esta tarea está HECHA cuando __________". */
  criterio_terminacion: string | null;
}

export interface Ritual {
  id: string;
  dia_semana: number; // ISO 1=lunes .. 7=domingo
  hora: string | null;
  bloque: string | null;
  descripcion: string;
  activo: boolean;
}

/**
 * Asignación de una tarea a un día de una semana concreta.
 * Una tarea solo puede aparecer una vez por semana (constraint UNIQUE).
 * Para moverla de día, se hace UPDATE sobre la misma fila.
 */
export interface PlanSemanalTarea {
  id: string;
  owner_id: string;
  anio: number;
  semana_iso: number;
  tarea_id: string;
  dia_semana: number; // ISO 1=lunes .. 7=domingo
  orden: number;
  created_at: string;
  updated_at: string;
}

export interface PlanDiario {
  id: string;
  fecha: string;
  semaforo: Semaforo | null;
  despertar: string | null;
  mente: string | null;
  cuerpo: string | null;
  rueda: string | null;
  necesidad: string | null;
  resumen: string | null;
  recomendacion: string | null;
  reflexion: string | null;
  contexto_extra: string | null;
  notas: string | null;
  num_generacion: number;
  origen: string | null;
  fecha_larga: string | null;
  informe_json: InformePlan | null;
  /** v3 columnas (planes generados por el formulario nuevo Parte 1+2). */
  estado_emocional_texto?: string | null;
  analisis_emocional_ia?: string | null;
  tendencia_ia?: string | null;
  recomendacion_psicologica_ia?: string | null;
  contexto_dia_ia?: string | null;
  num_bloques_activos?: number | null;
  comida_titulo?: string | null;
  comida_descripcion?: string | null;
  comida_motivo?: string | null;
}

export type BloqueEnergia = "regular" | "estrategia" | "ejecucion" | "mecanica";
export type BloqueCognitivo = "foco" | "operativa" | "distribuida";
export type TipoPlanTarea = "imprescindible" | "autocuidado" | "micro" | "extra";

export interface PlanDiarioTarea {
  id: string;
  plan_diario_id: string;
  tarea_id: string | null;
  tipo: TipoPlanTarea;
  titulo_libre: string | null;
  hecho: boolean;
  orden: number;
  es_ia: boolean;
  bloque_energia: BloqueEnergia | null;
  bloque_cognitivo: BloqueCognitivo | null;
  es_tarea_libre: boolean;
  /** Bloque del timeblocking 1-4 (null si la tarea no está en bloques). */
  bloque_num: 1 | 2 | 3 | 4 | null;
  /** "profunda" = bloque entero · "rapida" = micro-tarea. */
  tipo_tarea: "profunda" | "rapida" | null;
}

export interface PlanDiarioSubtarea {
  id: string;
  plan_diario_tarea_id: string;
  descripcion: string;
  orden: number;
  hecho: boolean;
  tiempo_estimado_min: number | null;
}

export type TipoBloque =
  | "manana_autocuidado"
  | "primer_trabajo"
  | "comida"
  | "segundo_trabajo"
  | "noche";

export interface PlanDiarioBloque {
  id: string;
  plan_diario_id: string;
  tipo: TipoBloque;
  hora_inicio: string;
  hora_fin: string;
  titulo: string;
  contenido: string;
  orden: number;
}

export type TipoBorrador = "email" | "whatsapp" | "documento" | "otro";

export interface PlanDiarioBorrador {
  id: string;
  plan_diario_tarea_id: string;
  tipo: TipoBorrador;
  contenido: string;
  prompt_usado: string | null;
  created_at: string;
}

export interface Captura {
  id: string;
  fecha: string;
  rama:
    | "tarea"
    | "problema"
    | "reflexion"
    | "idea"
    | "pago"
    | "maria"
    | "sin_clasificar"
    | null;
  texto: string;
  estado: "pendiente" | "procesada" | "descartada";
  destino: string | null;
}

// ============================================================================
// Informe rico del plan diario v3 (almacenado en JSONB)
// ============================================================================

export interface InformeEstadoCampo {
  campo: string;
  valor: string;
  emoji: string;
}

export interface InformeEstadoHoy {
  semaforo: Semaforo;
  dias_seguidos: number;
  tabla: InformeEstadoCampo[];
  conexion_emocional: string;
}

export interface InformeTendenciaRegistro {
  fecha: string;
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesita: string;
  semaforo: string;
  tendencia_despertar?: string;
}

export interface InformeTendencia {
  registros: InformeTendenciaRegistro[];
  lectura: string;
}

export interface InformeLecturaPsicologica {
  estado_actual: string;
  analisis_emocional: string;
  recomendaciones_hoy: string[];
  si_sobrepasado: string[];
  si_cuerpo_empeora: string[];
  para_esta_semana: string[];
}

export interface InformeAnalisisRealismo {
  tarea: string;
  origen?: string;
  realista_hoy: "si" | "si_condiciones" | "no";
  por_que: string;
  accion: string;
}

export interface InformeConexionTareas {
  analisis_realismo: InformeAnalisisRealismo[];
  justificacion_3_tareas: string;
}

export interface InformeHorario {
  horario: string;
  bloque: string;
  tarea: string;
  por_que: string;
}

export interface InformeDiaOptimizado {
  energia_disponible: string;
  principio_hoy: string;
  horario: InformeHorario[];
  delegacion_ia: { que: string; cuando_listo: string }[];
  patron_detectado?: string;
}

export interface InformeTareaClasificada {
  id?: string;
  titulo: string;
  origen?: string;
  tipo?: string;
  bloque_energia?: string;
  tiempo_min?: number;
  notas?: string;
  esfuerzo?: string;
  deadline?: string;
}

export interface InformeClasificacionTareas {
  del_dia: InformeTareaClasificada[];
  pendientes_criticas: InformeTareaClasificada[];
  programables: InformeTareaClasificada[];
  backlog: InformeTareaClasificada[];
}

export interface InformeRecomendacionEstrategica {
  vs_plan_largo: { tarea: string; meta: string; conexion: string }[];
  si_estancas: string;
  cierre_dia: string[];
}

export interface InformeNota {
  titulo: string;
  texto: string;
}

export interface InformePlatoBase {
  estructura: string;
  tiempo: string;
  variaciones: string[];
  base_metabolica: string;
}

export interface InformeComida {
  plato_base_desayuno: InformePlatoBase;
  plato_base_comida: InformePlatoBase;
  cambio_20_80: { propuesto: string; impacto: string; implementacion: string };
  merienda: string;
  cena: string;
  menu_familiar: { dia: string; comida: string; cena: string }[];
  lista_compra: { categoria: string; items: string }[];
  plan_domingo: string;
}

// ============================================================================
// Plan diario v3 — entrada/salida simple (Parte 1 + Parte 2)
// ============================================================================

/** Input emocional libre del usuario (Parte 1) */
export interface EstadoEmocionalInput {
  texto: string;
}

/** Tarea suelta del input (Parte 1) — se persiste vía upsertTareaPorTitulo */
export interface TareaLibreInput {
  titulo: string;
  /** id que devuelve la RPC si ya existía en BD; null si se acaba de crear */
  tarea_id_existente: string | null;
}

/** Sugerencia gastronómica única (Parte 2 — Sección C) */
export interface ComidaSugerida {
  titulo: string;
  descripcion: string;
  motivo: string;
}

/** Tarea asignada a un bloque de timeblocking (Parte 2 — Sección B) */
export interface BloqueTareaPlan {
  bloque_num: 1 | 2 | 3 | 4;
  /** Una sola tarea profunda por bloque; en rápidas se rellena `titulo_libre` agrupado */
  tipo: "profunda" | "rapida";
  tarea_id: string | null;
  titulo_libre: string;
  /** Tiempo estimado en minutos (60 = bloque entero) */
  tiempo_min: number;
  /** id de la fila en plan_diario_tareas (lo añade la UI tras guardar, para edición). */
  plan_tarea_id?: string;
}

/**
 * Plan diario v3 — estructura de 6 secciones que se muestra al usuario
 * Y se persiste en el histórico. La IA devuelve este JSON; la UI lo pinta
 * tal cual; la mutación lo mapea a las columnas de `planes_diarios`.
 */
export interface PlanGeneradoSimple {
  semaforo: "verde" | "amarillo" | "rojo";

  /** 1. Resumen del día (2-3 frases). */
  resumen: string;

  /** 2. Recomendación (2-4 acciones en imperativo). */
  recomendacion: string;

  /** 3. Lectura psicológica: lo del día + análisis del histórico. */
  lectura_psicologica: {
    lo_del_dia: string;
    analisis_historico: string;
  };

  /** 4. Tu día optimizado — nº de bloques activos + 1 fila por bloque. */
  tu_dia_optimizado: {
    num_bloques_activos: 1 | 2 | 3 | 4;
    bloques: BloqueTareaPlan[];
  };

  /** 5. Propuesta de comida para hoy. */
  propuesta_comida: ComidaSugerida;
}

export interface InformePlan {
  cabecera: string;
  estado_hoy: InformeEstadoHoy;
  tendencia: InformeTendencia;
  lectura_psicologica: InformeLecturaPsicologica;
  conexion_tareas: InformeConexionTareas;
  dia_optimizado: InformeDiaOptimizado;
  clasificacion_tareas: InformeClasificacionTareas;
  recomendacion_estrategica: InformeRecomendacionEstrategica;
  notas: InformeNota[];
  comida: InformeComida;
}
