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

// ============================================================================
// Proyectos (agrupan tareas) — migration 0012
// ============================================================================
export interface Proyecto {
  id: string;
  nombre: string;
  color: string | null;
  descripcion: string | null;
  orden: number;
  archivado: boolean;
}

export type RecurrenciaTipo = "diaria" | "semanal" | "mensual" | null;

/** Comentario en una tarea, con @tags extraídos del cuerpo. */
export interface TareaComentario {
  id: string;
  tarea_id: string;
  cuerpo: string;
  tags: string[];
  created_at: string;
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

// ============================================================================
// Plan trimestral (migration 0015)
// Capa nueva: metas → periodos → resultados → tareas. La tabla `metas` y
// `tareas` no se modifican (salvo +1 columna `resultado_periodo_id` en
// tareas). Convive con `okrs` / `key_results` / `hitos` ya existentes.
// ============================================================================

/** Fila persistida en `periodos`. Rango temporal con tipo flexible
 *  (trimestre / mes / custom) para soportar tanto Q1-Q4 como meses o
 *  rangos libres. */
export interface Periodo {
  id: string;
  tipo: "trimestre" | "mes" | "custom";
  anio: number;
  numero: number;
  nombre: string;
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string;    // YYYY-MM-DD
}

export type EstadoResultado =
  | "pendiente"
  | "en_progreso"
  | "completado"
  | "descartado";

/** Fila persistida en `resultados_periodo` (resultado esperado por
 *  trimestre/mes dentro de una meta). */
export interface ResultadoPeriodo {
  id: string;
  meta_id: string;
  periodo_id: string;
  titulo: string;
  descripcion: string | null;
  metrica: string | null;
  valor_objetivo: number | null;
  valor_actual: number | null;
  unidad: string | null;
  estado: EstadoResultado;
  peso: number;
  orden: number;
}

/** Vista agregada: un resultado con su periodo y sus tareas anidadas.
 *  Es lo que devuelve `fetchMetaConPlan` y `fetchPlanTrimestral`. */
export interface ResultadoConTareas extends ResultadoPeriodo {
  periodo: Periodo;
  tareas: Tarea[];
}

/** Meta con sus resultados (cada uno con su periodo + tareas) y
 *  métricas calculadas en cliente. */
export interface MetaConPlan {
  meta: Meta;
  resultados: ResultadoConTareas[];
  /** Nº total de tareas vinculadas (en todos los resultados). */
  total_tareas: number;
  /** Nº de tareas hechas. */
  tareas_hechas: number;
  /** Progreso 0..1 (media ponderada por peso de resultado). */
  progreso: number;
}

/** Solo las tareas sin meta asignada — la "bandeja de entrada" del plan. */
export interface TareaSinMeta {
  tarea: Tarea;
  /** True si tiene meta pero no resultado_periodo; false si no tiene ni meta. */
  tiene_meta_sin_resultado: boolean;
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
  /** Fecha dura de finalización (YYYY-MM-DD). Null si no se ha fijado.
   *  Aparece automáticamente en /plan-diario cuando coincide con HOY. */
  fecha_fin: string | null;
  /** Subtareas (desglose) — vienen con la tarea al hacer nested select. */
  subtareas: TareaSubtarea[] | null;
  /** Frase "Esta tarea está HECHA cuando __________". */
  criterio_terminacion: string | null;
  /** Proyecto al que pertenece (null = sin proyecto). */
  proyecto_id: string | null;
  /** Recurrencia: si no es null, la tarea se clona al marcarla como hecha. */
  recurrencia_tipo: RecurrenciaTipo;
  /** Días de la semana (0=Dom..6=Sáb) cuando es 'semanal'. */
  recurrencia_dias_semana: number[] | null;
  /** Día del mes (1..28) cuando es 'mensual'. */
  recurrencia_dia_mes: number | null;
  /** Última fecha en la que se generó la siguiente copia. */
  recurrencia_ultima_generada: string | null;
  /** FK opcional a `resultados_periodo` (migration 0015). Null = bandeja
   *  de entrada (tarea suelta, sin meta o meta sin resultado). */
  resultado_periodo_id: string | null;
  /** Tiempos del registro (la BD los devuelve siempre; reflejados aquí
   *  para poder ordenar por `created_at` sin casts). */
  created_at?: string;
  updated_at?: string;
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

// ============================================================================
// Estatus diario (migration 0013)
// Una entrada por día del usuario con productividad, hábitos, comidas, etc.
// Adaptación app del agente `agente-estatus-diario`.
// ============================================================================

/** Estado de un hábito en un día concreto. 'no' = no cumplido. */
export type HabitoEstado = "hecho" | "parcial" | "no";

/** Identificadores canónicos de los 9 hábitos personales (orden estable). */
export const HABITOS_IDS = [
  "qigong",
  "caminar",
  "ducha",
  "meditacion",
  "desayuno",
  "vaciado_mental",
  "comida_siesta",
  "estatus",
  "tres_cosas_buenas",
] as const;
export type HabitoId = (typeof HABITOS_IDS)[number];

/** Metadata de cada hábito: nombre legible, emoji y momento del día. */
export interface HabitoMeta {
  id: HabitoId;
  nombre: string;
  emoji: string;
  momento: string;
  opcional?: boolean;
}

export const HABITOS_META: HabitoMeta[] = [
  { id: "qigong", nombre: "Qi Gong 2 min", emoji: "🧘", momento: "Mañana" },
  { id: "caminar", nombre: "Caminar", emoji: "🚶", momento: "Mañana" },
  { id: "ducha", nombre: "Ducha", emoji: "🚿", momento: "Mañana", opcional: true },
  { id: "meditacion", nombre: "Meditación Silva", emoji: "🌙", momento: "Mañana" },
  { id: "desayuno", nombre: "Desayuno sentado y sin móvil", emoji: "🍽️", momento: "Mañana" },
  { id: "vaciado_mental", nombre: "Vaciado mental 3 min", emoji: "🧠", momento: "Antes de comida" },
  { id: "comida_siesta", nombre: "Comida y siesta sin móvil", emoji: "🥗", momento: "Mediodía" },
  { id: "estatus", nombre: "Estatus", emoji: "📝", momento: "Noche (cierre)" },
  { id: "tres_cosas_buenas", nombre: "3 cosas buenas antes de dormir", emoji: "✨", momento: "Noche" },
];

/** Fila persistida en `estatus_diarios` (1 por día por owner). */
export interface EstatusDiario {
  id: string;
  fecha: string; // YYYY-MM-DD
  // Productividad
  tareas_profesionales: string | null;
  tareas_personales: string | null;
  trabajo_futuro_ideal: string | null;
  tareas_nuevas: string | null;
  correos_importantes: string | null;
  tareas_no_terminadas: string | null;
  // Emocional / mental
  estado_emocional: string | null;
  pensamientos_emociones: string | null;
  bloqueos_procrastinacion: string | null;
  ideas_nuevas: string | null;
  agradecimientos: string | null;
  lo_que_hiciste_bien: string | null;
  // Relaciones
  tiempo_pareja: string | null;
  tiempo_hija: string | null;
  tareas_hogar: string | null;
  // Bienestar
  uso_movil_min: number | null;
  acto_de_bondad: string | null;
  cuido_cuerpo: string | null;
  mente_subconsciente: string | null;
  // 9 hábitos (nullable = aún no respondido)
  habito_qigong: HabitoEstado | null;
  habito_caminar: HabitoEstado | null;
  habito_ducha: HabitoEstado | null;
  habito_meditacion: HabitoEstado | null;
  habito_desayuno: HabitoEstado | null;
  habito_vaciado_mental: HabitoEstado | null;
  habito_comida_siesta: HabitoEstado | null;
  habito_estatus: HabitoEstado | null;
  habito_3_cosas_buenas: HabitoEstado | null;
  // Auditoría 20/80
  audit_tareas_criticas: number | null;
  audit_termino_3_principales: boolean | null;
  audit_anadio_sin_terminar: boolean | null;
  audit_eran_20_80: "si" | "no" | "parcial" | null;
  audit_sintio: "cumpli" | "corri" | "nada" | null;
  // Cierre Cognitivo (5 preguntas)
  cierre_que_consigo: string | null;
  cierre_queda_abierto: string | null;
  cierre_decisiones_tomadas: string | null;
  cierre_carga_mental: string | null;
  cierre_primer_problema_manana: string | null;
  // Salida emocional / micro-acción
  podes_soltar: string | null;
  micro_accion_manana: string | null;
  // Semáforo
  semaforo: Semaforo | null;
  // Veredicto narrativo del agente LLM (opcional)
  reflexion_agente: string | null;
  created_at: string;
  updated_at: string;
}

/** Fila de `estatus_comidas` (1:N con estatus_diarios). */
export interface EstatusComida {
  id: string;
  estatus_id: string;
  hora: string | null; // "HH:MM:SS" o null
  descripcion: string;
  orden: number;
  created_at: string;
}

/** Forma "wire" de una comida (sin id/estatus_id) — para el formulario. */
export interface ComidaInput {
  hora: string | null; // "HH:MM" o ""
  descripcion: string;
}

/** Estatus con sus comidas anidadas (lo que devuelven los fetches compuestos). */
export type EstatusConComidas = EstatusDiario & {
  comidas: EstatusComida[];
};

// ============================================================================
// Pomodoro / Focus
// ============================================================================

export type PomodoroFase = "focus" | "descanso_corto" | "descanso_largo";

/** Fila persistida en `pomodoro_sesiones` — un pomodoro TERMINADO. */
export interface PomodoroSesion {
  id: string;
  owner_id: string;
  tarea_id: string;
  subtarea_id: string | null;
  started_at: string;
  ended_at: string;
  duracion_seg: number;
  fase: PomodoroFase;
  created_at: string;
  /** Pre-flight check [10-12]: silencié el móvil. */
  pre_silencio_notif: boolean | null;
  /** Pre-flight check: cerré email/mensajería. */
  pre_cerre_email: boolean | null;
  /** Pre-flight check: criterio de éxito declarado por el usuario. */
  pre_criterio_exito: string | null;
}

/** Estado del timer que vive solo en cliente (localStorage + memoria). */
export interface PomodoroObjetivo {
  tarea_id: string;
  tarea_titulo: string;
  subtarea_id: string | null;
  subtarea_descripcion: string | null;
}

/** Respuestas del checklist pre-pomodoro. Se pasa al iniciar() y se graba
 *  con la sesión completada. */
export interface PreFlightCheck {
  silencioNotif: boolean;
  cerreEmail: boolean;
  criterioExito: string;
}

/** Time-blocking (migrations 0017): un bloque horario de una fecha con su
 *  tarea asignada (o NULL = bloque libre). numero_bloque ∈ {1,2,3,4}. */
export interface CalendarioBloque {
  id: string;
  fecha: string;        // YYYY-MM-DD
  numero_bloque: 1 | 2 | 3 | 4;
  tarea_id: string | null;
  nota: string | null;
}

/** Vista enriquecida: bloque + tarea anidada (si la hay). La monta la app
 *  con un join en cliente (N pequeño: solo los bloques de una semana). */
export interface CalendarioBloqueConTarea extends CalendarioBloque {
  tarea: Tarea | null;
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
