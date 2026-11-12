// ============================================================================
// metodologia/conocimiento.ts — LA FUENTE ÚNICA DE VERDAD DEL MÉTODO.
//
// QUÉ ES ESTE MÓDULO
//   El método de la app (los 5 pilares, el glosario, los rituales y la
//   arquitectura WIG/GTD/Próxima Acción) escrito como DATOS, no como JSX.
//
// POR QUÉ EXISTE (y por qué no hay un `.md` aparte)
//   Tres consumidores necesitan el mismo contenido:
//     · /docs          → lo PINTA (pilares, glosario, rituales, índice).
//     · /metodologia  → lo PINTA (arquitectura concreta).
//     · el agente     → lo RECIBE en el prompt (manualMetodo).
//   Antes el método vivía dentro del JSX de las dos páginas, y eso hace
//   imposible dárselo a la IA: un componente de React no es un prompt. La
//   alternativa "tirar de un markdown aparte" duplicaría el contenido — y
//   dos copias del mismo método se desincronizan en silencio (ya pasó con
//   el prompt de pagos, duplicado en configStore y en sugerirPagosIA).
//   Con los datos aquí, el texto sale de UN sitio para las tres vistas.
//
// REGLA DE ORO AL EDITAR
//   Si cambias un pilar, un ritual o una regla de arquitectura, se cambia
//   AQUÍ. Las tres vistas se actualizan solas y el agente deja de estar
//   desfasado sin que nadie se acuerde.
//
// NOTA
//   Este módulo es puro dato (sin React y sin componentes): lo importan
//   páginas y también el prompt del agente.
// ============================================================================

export type Punto = { titulo: string; cuerpo: string };

export type Pilar = {
  num: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  titulo: string;
  resumen: string;
  puntos: Punto[];
};

/** Fila de un ritual (diario / semanal / mensual). */
export type RitualFila = {
  /** Cuándo (columna "Cuándo" / "Día"). */
  cuando: string;
  /** Pantalla(s) implicadas: texto + ruta (si es una pantalla de la app). */
  pantallas: Array<{ texto: string; ruta?: string }>;
  /** Qué hacer. */
  que: string;
  /** Nota opcional (se pinta en letra pequeña). */
  nota?: string;
};

/** Ítem del glosario (las 4 capas de la "casa de tus objetivos"). */
export type GlosarioItem = {
  emoji: string;
  titulo: string;
  cuerpo: string;
  tip?: string;
};

/** Fila del índice de pantallas. */
export type Feature = { ruta: string; proposito: string; docs: string; accesibilidad?: string };

// ----------------------------------------------------------------------------
// 1. LOS 5 PILARES (base filosófica) — vive en /docs
// ----------------------------------------------------------------------------

export const PILARES: Pilar[] = [
  {
    num: 1,
    emoji: "🧠",
    titulo: "Trabajo profundo (Deep Work)",
    resumen:
      "La calidad del trabajo es Tiempo × Intensidad, no horas. Eliminar distracciones de entrada es la palanca con mayor retorno.",
    puntos: [
      {
        titulo: "Fórmula del rendimiento de élite",
        cuerpo:
          "El trabajo de alta calidad producido es el resultado directo de multiplicar (Tiempo invertido) × (Intensidad de enfoque). Las personas de mayor rendimiento no necesariamente trabajan más horas, sino que maximizan la intensidad de concentración en cada bloque de tiempo.",
      },
      {
        titulo: "Residuo de atención",
        cuerpo:
          "Cambiar constantemente de tarea, responder mensajes o revisar redes sociales deja un 'residuo de atención' en el cerebro que degrada significativamente el rendimiento en la siguiente actividad. Enfocarse sin distracciones en una sola tarea compleja es una habilidad cada vez más rara y valiosa.",
      },
      {
        titulo: "Rutinas y rituales",
        cuerpo:
          "La fuerza de voluntad es un recurso finito que se agota a lo largo del día. Para no depender de la motivación fluctuante, es indispensable establecer rutinas y rituales claros sobre dónde, cuándo y cómo trabajarás profundamente.",
      },
    ],
  },
  {
    num: 2,
    emoji: "🎯",
    titulo: "Metas específicas como puntos de referencia",
    resumen:
      "Las metas vagas ('hacer lo mejor que pueda') llevan a bajo rendimiento. Las metas medibles activan la aversión a la pérdida y motivan al cerebro a trabajar más.",
    puntos: [
      {
        titulo: "Las metas vagas no funcionan",
        cuerpo:
          "Decir simplemente 'haré lo mejor que pueda' suele conducir a un bajo rendimiento porque carece de un estándar claro de evaluación. Las metas específicas y desafiantes actúan como puntos de referencia internos.",
      },
      {
        titulo: "Aversión a la pérdida",
        cuerpo:
          "El cerebro se motiva a trabajar más duro debido al temor psicológico a no alcanzar el nivel aspirado. Por eso el Scorecard de KRs en /metas/plan te dice si vas por encima, en línea o por debajo del ritmo esperado: es la 'señal de referencia'.",
      },
      {
        titulo: "Autorregulación equilibrada",
        cuerpo:
          "La meta debe ser lo suficientemente alta para motivar al cerebro a superar el sesgo del presente, pero no tan extrema que se vuelva un castigo insostenible que lleve a abandonar la autorregulación. Ajusta cada trimestre.",
      },
      {
        titulo: "Alcance temporal: rango real [inicio, fin]",
        cuerpo:
          "Una meta sin plazo se diluye. Desde la migración 0025, /metas/nueva pide dos fechas reales (no texto libre): inicio (cuándo puedes empezar) y límite (deadline). La IA reparte los KRs SOLO dentro de ese rango como meses sueltos — una meta de 2 semanas cabe en un mes; una de 8 meses usa 8. Si el inicio cae en mitad de año (ej. mayo), Q1/Q2 quedan vacíos. Si el límite está marcado 🔒 HARD CONSTRAINT, la IA no puede planificar nada después. Razón: forzar 4 trimestres lineales sesga el plan cuando las metas son de tamaños muy distintos. Un KR es un resultado medible (no una acción): 'dormir 6h/noche' lo es; 'apagar el móvil a las 23h' es la tarea dentro de él.",
      },
      {
        titulo: "El KR de la semana: dónde pones horas, no cuándo se entrega",
        cuerpo:
          "Un KR se mide en un trimestre o mes (su compromiso de entrega). Además, cada domingo eliges 3 KRs para la semana: en qué resultados medibles vas a poner horas AHORA. Son dos ejes distintos y complementarios — el trimestre no se sustituye. Sin este paso, la cascada saltaba de la meta a la tarea y la semana se planificaba sin mirar tus metas. Solo entra en el foco un KR cuya entrega está en marcha: lo caducado y lo prematuro quedan fuera solos. La IA elige por riesgo real (los que van por debajo del ritmo y tienen menos días restantes), pero tú confirmas.",
      },
      {
        titulo: "El estado de una meta se deriva de su trabajo, no de tu memoria",
        cuerpo:
          "Una meta no se “da por buena” a mano: se completa cuando todas sus tareas vivas están hechas y vuelve a “en progreso” en cuanto reabres una. Es el mismo principio del scorecard aplicado al estado — si el trabajo que sostiene la meta está cerrado, la meta está cerrada. Dos salvagurdas: una meta sin tareas vivas no se toca (no hay dato que deducir) y una meta archivada nunca se resucita sola (archivar es una decisión explícita, no un derivado). Consecuencia práctica: la barra de avance de /proyectos se mueve sola, sin upkeep manual.",
      },
    ],
  },
  {
    num: 3,
    emoji: "⏱",
    titulo: "Gestión del tiempo y reducir el trabajo superficial",
    resumen:
      "La gestión del tiempo se relaciona con mejor rendimiento y, sobre todo, con mayor satisfacción vital. La regla 20/80 y el time-blocking son las herramientas concretas.",
    puntos: [
      {
        titulo: "Impacto en bienestar y rendimiento",
        cuerpo:
          "Estructurar, proteger y adaptar la agenda se relaciona de forma moderada con un mejor rendimiento laboral y académico, pero tiene un impacto aún más fuerte en la satisfacción con la vida y el bienestar general.",
      },
      {
        titulo: "Bloqueo de tiempo (Time Blocking)",
        cuerpo:
          "Asignar bloques específicos en el calendario para tareas prioritarias evita el costo de hasta un 40% de pérdida de productividad provocado por el cambio continuo de contexto. La pantalla /calendario implementa esto: 4 bloques fijos por día.",
      },
      {
        titulo: "Regla 20/80 y trabajo superficial",
        cuerpo:
          "El 20% de tus actividades genera la gran mayoría de tus resultados reales. Se debe establecer un 'presupuesto de trabajo superficial' y reducir con firmeza los compromisos de bajo valor que saturan el día. La auditoría del Estatus Diario te recuerda cada noche cuántas críticas hiciste de más.",
      },
    ],
  },
  {
    num: 4,
    emoji: "🔁",
    titulo: "Hábitos incrementales y descargar la mente",
    resumen:
      "Las grandes mejoras vienen del 1% diario. Sacar lo pendiente de la cabeza (efecto Zeigarnik) libera el cortex prefrontal para ejecutar con claridad.",
    puntos: [
      {
        titulo: "Ganancias marginales",
        cuerpo:
          "Los grandes avances a largo plazo se construyen mediante pequeñas mejoras incrementales (del 1%) y la repetición constante. Con la práctica, el control de la acción pasa de la corteza prefrontal al ganglio basal, haciendo que la conducta sea automática y consuma poco esfuerzo mental.",
      },
      {
        titulo: "Liberar la carga cognitiva (GTD)",
        cuerpo:
          "Intentar recordar todo genera estrés y activa el efecto Zeigarnik, donde las tareas pendientes interfieren constantemente con el pensamiento enfocado. Sacar los compromisos de la cabeza y llevarlos a un sistema confiable libera recursos mentales. La pantalla /captura es exactamente eso: tu 'vaciar cabeza' externo.",
      },
      {
        titulo: "Pendientes de respuesta: lo que NO depende de ti",
        cuerpo:
          "Hay un subtipo especial de pendiente que NO está en tu control: las tareas bloqueadas externamente (un email que mandaste esperando OK, una llamada pendiente, una confirmación que necesitas para avanzar). Marcar la tarea con el flag ⏳ “pendiente de respuesta” (icono de reloj en /tareas) la separa del resto y la muestra en /tareas/pendientes-respuesta ordenada por antigüedad. Razón: lo que más tiempo lleva esperando es lo que más probablemente se te ha “caído” del radar — y muchas veces también lo más fácil de desatascar con un follow-up corto. La regla: este panel debería ser pequeño. Si crece, o bien no haces follow-ups a tiempo, o bien estás delegando demasiado sin control. Cuando llega la respuesta, destildas el flag (botón ✓ Respuesta recibida en el panel) y la tarea vuelve a la lista normal. Encima de la lista hay un banner mental (estoico/Covey): «no te preocupes de lo que está pendiente de los demás». Es un reframe psicológico, no operativo — recuerda que la única acción posible bajo aquí es el follow-up y que el panel te lo recordará cuando toque actuar.",
      },
    ],
  },
  {
    num: 5,
    emoji: "🌙",
    titulo: "Descanso estratégico y desconexión",
    resumen:
      "La capacidad cognitiva para sostener foco profundo está limitada a 1-4h diarias. Un shutdown ritual libera al cerebro del estrés nocturno.",
    puntos: [
      {
        titulo: "Límite diario de concentración",
        cuerpo:
          "La capacidad cognitiva para sostener un trabajo profundo de máxima intensidad está limitada a aproximadamente entre 1 y 4 horas diarias. Más allá de eso, el rendimiento cae en picado aunque sigas 'haciendo'. Por eso /calendario limita 4 bloques/día.",
      },
      {
        titulo: "Ritual de cierre (Shutdown Ritual)",
        cuerpo:
          "Finalizar la jornada a una hora fija e implementar un ritual explícito de cierre libera al cerebro del estrés nocturno, restaura la atención dirigida y permite que la mente inconsciente procese problemas complejos durante el descanso. El Estatus Diario (cierre cognitivo de 5 preguntas) es tu ritual de cierre.",
      },
    ],
  },
];

// ----------------------------------------------------------------------------
// GLOSARIO — las 4 capas (la "casa de tus objetivos") — vive en /docs
// ----------------------------------------------------------------------------
export const GLOSARIO: GlosarioItem[] = [
  {
    emoji: "🏠",
    titulo: "Proyecto = la casa",
    cuerpo:
      'Una iniciativa grande que tiene sentido por sí sola y engloba varias metas. Ejemplos: "Renegociar el alquiler de Sol de Nit", "Lanzar la v1 de Fooday", "Ponerme en forma este trimestre". Vive en la tabla `proyectos`. Tiene color, descripción opcional, área opcional.',
    tip: "Si tu idea es una sola cosa, no necesita proyecto: es una meta directa (ver más abajo).",
  },
  {
    emoji: "🚪",
    titulo: "Meta = una habitación",
    cuerpo:
      'Un resultado concreto con plazo. Si la casa es "Renegociar alquiler", las habitaciones son: "Preparar el dossier financiero", "Buscar 3 locales alternativos", "Redactar la propuesta para Teresa", "Ensayar la reunión". Las metas pueden vivir dentro de un proyecto (`metas.proyecto_id`) o sueltas (sin casa). Una meta sin KRs y sin tareas es una habitación vacía.',
    tip: "La migración 0025 añadió fechas reales (inicio + límite + 🔒 hard constraint) para que el planificador no fuerce 4 trimestres lineales cuando tu meta dura 2 semanas.",
  },
  {
    emoji: "🪟",
    titulo: "KR (Key Result) = un mueble medible",
    cuerpo:
      'Una medición que dice "esta habitación está X% hecha". Para "Buscar 3 locales alternativos": KR = "Tener 3 locales visitados y valorados antes del 15 de noviembre". Si los muebles están, la habitación está hecha. Un KR sin tareas es un mueble que todavía no has comprado: sabes lo que quieres, pero nadie lo está montando.',
    tip: "Los KRs viven en la tabla `resultados_periodo` con FK a la meta y al periodo (trimestre 1–4 o mes 1–12 desde la migración 0025).",
  },
  {
    emoji: "🔨",
    titulo: "Tarea / Hábito = mover las manos",
    cuerpo:
      'Para tener los muebles necesitas acciones concretas que haces una vez (tarea) o que repites (hábito). Para "Tener 3 locales visitados": llamar a 3 inmobiliarias, visitar local 1 el martes, rellenar la ficha comparativa. Si haces todas las tareas del KR, el KR se cumple. Un hábito es una tarea con `recurrencia_tipo = diaria | semanal | mensual` en vez de `null`.',
    tip: "Resumen en una línea: Proyecto = la casa. Meta = una habitación. KR = un mueble medible. Tarea = la acción que haces para poner el mueble. Hábito = una tarea que se repite.",
  },
];

// ----------------------------------------------------------------------------
// RITUALES (la chuleta: qué abrir, cuándo y por qué) — vive en /docs
// ----------------------------------------------------------------------------
export const RITUALES: {
  diario: RitualFila[];
  semanal: RitualFila[];
  mensual: RitualFila[];
} = {
  diario: [
    {
      cuando: "Al despertar",
      pantallas: [{ texto: "/norte", ruta: "/norte" }],
      que: "Recordar propósito/valores (10s). Ancla emocional del día.",
    },
    {
      cuando: "Mañana, 1ª hora",
      pantallas: [
        { texto: "/plan-diario", ruta: "/plan-diario" },
        { texto: "/calendario", ruta: "/calendario" },
      ],
      que: "Definir las 3 cosas del día + pintar 4 bloques. Es lo primero que se hace, antes de emails.",
    },
    {
      cuando: "Cuando algo se te cruce por la cabeza",
      pantallas: [{ texto: "/captura", ruta: "/captura" }],
      que: "Vaciar cabeza en <30s. No pienses, captura. Luego lo trias.",
    },
    {
      cuando: "Bloques de trabajo",
      pantallas: [{ texto: "/focus", ruta: "/focus" }],
      que: "Pomodoro con pre-flight (silenciar, cerrar email, criterio de éxito). Máx 4/día.",
    },
    {
      cuando: "Final del día",
      pantallas: [{ texto: "/estatus", ruta: "/estatus" }],
      que: "Marcar los 9 hábitos + cierre cognitivo 5 preguntas. Esto es sagrado: si no se hace, el sistema pierde valor al día siguiente.",
    },
    {
      cuando: "Cuando quieras saber dónde estás",
      pantallas: [{ texto: "chat del agente" }],
      que: 'El botón flotante (abajo a la derecha) está en todas las pantallas. Pregunta en lenguaje natural: "¿qué hago hoy?", "¿qué está en riesgo?", "resume el proyecto X". Te responde con el estado real del sistema (metas, KRs, proyectos, tareas, plan de hoy, foco semanal) y solo lee: no crea ni cambia nada.',
    },
  ],
  semanal: [
    {
      cuando: "Domingo noche",
      pantallas: [
        { texto: "/semana", ruta: "/semana" },
        { texto: "/plan-diario", ruta: "/plan-diario" },
      ],
      que: "Planificar la semana entrante: primero elige los 3 KRs de la semana (panel azul arriba del pipeline), luego arrastra las tareas a los días. Es la base de todo lo demás.",
      nota: 'Los KRs en foco son la capa intermedia: el trimestre dice cuándo se entrega, la semana dice dónde pones horas. Solo entran KRs cuya entrega está en marcha. Usa "✨ Sugerir 3 KRs" y la IA elige por riesgo real (los que van por debajo del ritmo y tienen menos días restantes).',
    },
    {
      cuando: "Lunes, 1ª hora (ESTRICTO)",
      pantallas: [{ texto: "/pagos", ruta: "/pagos" }],
      que: "Revisar y ejecutar pagos pendientes. Es lo primero del lunes, antes de cualquier otra cosa. Si el lunes es festivo, se hace el martes a 1ª hora (no más tarde). Si tampoco se puede, se salta esa semana, pero se vuelve al lunes siguiente sin falta.",
    },
    {
      cuando: "Domingo (tras planificar)",
      pantallas: [{ texto: "/escenarios", ruta: "/escenarios" }],
      que: "Un vistazo a los proyectos: qué ha pasado (cronología), dónde están hoy (estado medido) y qué puede pasar (escenarios con estrategia). Solo entra en los que te importen: el resto se puede mirar después o nunca, sin penalización.",
    },
    {
      cuando: "Domingo (después de planificar)",
      pantallas: [{ texto: "chat del agente" }],
      que: 'Pregunta: "¿qué está en riesgo esta semana?". Es la revisión del sistema hecha en una frase: el agente cruza metas, KRs y tareas y te dice dónde se está atascando. Es lectura pura — si luego hay que actuar, se actúa en la pantalla correspondiente.',
    },
    {
      cuando: "Miércoles",
      pantallas: [{ texto: "/pipeline", ruta: "/pipeline" }],
      que: "Revisar Kanban: mover tarjetas, repriorizar, lanzar motor IA si hay atasco. Punto medio de semana para corregir rumbo.",
    },
    {
      cuando: "Viernes tarde",
      pantallas: [{ texto: "/informes", ruta: "/informes" }],
      que: "Mirar heatmap de foco + scorecard de hábitos. Cierre semanal objetivo: cuántas horas reales de foco vs. las 4/día prometidas.",
    },
    {
      cuando: "Domingo (parte final)",
      pantallas: [{ texto: "/metas/plan", ruta: "/metas/plan" }],
      que: "Revisar la proyección lineal de KRs: ¿voy en línea, por encima o por debajo del ritmo esperado? Ajustar si toca.",
    },
  ],
  mensual: [
    {
      cuando: "Primer domingo del mes",
      pantallas: [
        { texto: "/metas", ruta: "/metas" },
        { texto: "/metas/plan", ruta: "/metas/plan" },
      ],
      que: "Revisión profunda de OKR. ¿Qué KRs avancé? ¿Cuáles están persistentemente en rojo? ¿Aparecen metas nuevas? ¿Qué metas mueren (ya no aportan al norte)?",
      nota: "Reservar un bloque protegido. No más de 90 min: si se pasa, el ritual está mal dimensionado.",
    },
    {
      cuando: "Primer domingo del mes",
      pantallas: [{ texto: "/norte", ruta: "/norte" }],
      que: "Vigencia del norte: ¿mi propósito/valores siguen siendo los mismos? (Esto se hace de forma más profunda cada trimestre; una mirada mensual basta).",
    },
    {
      cuando: "Primer domingo del mes",
      pantallas: [{ texto: "/informes", ruta: "/informes" }],
      que: 'Tendencia 30 días: heatmap de foco, score de hábitos, días en rojo emocionales, metas y KRs cerrados en la ventana, y la brecha "metas con plan vs sin plan" (las aspiracionales sin KRs son el típico cuello de botella del mes). Si una racha roja emocional supera los 5 días, abrir una acción correctiva ya (no esperar al mes siguiente). En el heatmap, una subtarea cuenta como progreso (1/3) mientras su tarea siga abierta; al cerrar la tarea, la tarea cuenta 1 y sus subtareas dejan de sumar.',
    },
    {
      cuando: "Primer domingo del mes",
      pantallas: [{ texto: "/tareas", ruta: "/tareas" }],
      que: 'Decidir 1-3 experimentos para el mes (no más): cosas concretas que vas a probar los próximos 30 días. Se registran en /tareas con un tag o ámbito "experimento_mes" para poder evaluarlos en el siguiente ritual.',
    },
  ],
};

/** Las 3 reglas que no se rompen (si solo pudieras mantener 3 hábitos). */
export const HABITOS_RECURRENTES: Punto[] = [
  {
    titulo: "Nunca dejes una idea en la cabeza",
    cuerpo:
      "Si piensas algo —una tarea, una preocupación, una idea—, va a /captura en el momento. Sin excepción. Luego la trias cuando toca.",
  },
  {
    titulo: "Nunca empieces un bloque sin /focus + pre-flight",
    cuerpo:
      'Silenciar notificaciones, cerrar email, definir criterio de éxito del bloque. Es la única forma de que los 4 bloques diarios sean bloques de verdad y no tiempo perdido con sensación de "trabajar".',
  },
  {
    titulo: "Nunca cierres el día sin /estatus",
    cuerpo:
      "Marcar los 9 hábitos + cierre cognitivo de 5 preguntas. Si saltas esto 2 días seguidos, el sistema pierde valor: el score de hábitos se rompe, el cierre cognitivo se acumula sin procesar y el dashboard emocional deja de detectar patrones a tiempo.",
  },
];



// ----------------------------------------------------------------------------
// ARQUITECTURA (WIGs / GTD / Próxima Acción) — vive en /metodologia
// ----------------------------------------------------------------------------

export const PROBLEMA: Punto[] = [
  {
    titulo: "Sobrecarga cognitiva → parálisis por análisis",
    cuerpo:
      "Mostrar 40 tareas pendientes en la agenda diaria dispara una fricción psicológica que lleva a la procrastinación. El cerebro, ante un inventario abrumador, prefiere la tarea fácil (responder un email) a la difícil (avanzar el WIG).",
  },
  {
    titulo: "Efecto Zeigarnik: los bucles abiertos consumen atención",
    cuerpo:
      "Las tareas inacabadas permanecen activas en la memoria de trabajo, ocupando ciclo del cortex prefrontal. No necesitas terminarlas para liberar al cerebro: basta con que estén en un sistema externo y sepas cuál es la siguiente acción inmediata.",
  },
  {
    titulo: "Confundir resultados con conductas",
    cuerpo:
      "Una meta vaga (\"ser más productivo\") no genera un plan accionable. Una meta medible (\"publicar el libro en 6 meses\") sin las 2-3 conductas recurrentes que la sostienen, se queda en deseo. El sistema exige las dos capas explícitas.",
  },
];

export const LAG_VS_LEAD: { dimension: string; lag: string; lead: string }[] = [
  {
    dimension: "¿Qué es?",
    lag: "El resultado final que quieres alcanzar.",
    lead: "Las 2-3 conductas recurrentes que tú controlas y que producen el resultado.",
  },
  {
    dimension: "¿Cuándo se mide?",
    lag: "Al final (semanas / meses).",
    lead: "Semanal o diario.",
  },
  {
    dimension: "¿Puedes actuar sobre ella hoy?",
    lag: "No — solo esperar.",
    lead: "Sí — es la palanca que mueve la aguja.",
  },
  {
    dimension: "En la app",
    lag: "Tabla `metas` + `periodos` + `resultados_periodo` (los KRs viven aquí, ver /metas/plan). Desde la migración 0025, dos campos reales en `metas` (`fecha_inicio_meta`, `fecha_objetivo` + flag `fecha_fin_bloqueada`) definen el rango real de la meta — la IA reparte los KRs SOLO dentro de ese rango, como meses sueltos (no siempre 4 trimestres). El campo libre `plazo` queda como legacy. Migration 0028: la tabla `resultados_periodo` ya no tiene `periodo_id`; un KR puede vivir en uno o varios trimestres/meses a través de la tabla puente `kr_periodos` (N:M). Eso elimina el límite “1 KR por trimestre” que el usuario vivía como bug.",
    lead: "Columna `es_wig` en `metas` (panel violeta) y en `tareas` (panel fucsia).",
  },
];

export const WIG_PUNTOS: Punto[] = [
  {
    titulo: "Definición",
    cuerpo:
      "Un WIG (Wildly Important Goal) es una meta de altísimo impacto a la que dedicas atención desproporcionada. Es la concreción práctica de la Lead Measure: la meta-en-forma-de-resultado-más-3-conductas.",
  },
  {
    titulo: "Por qué máximo 1-3 (y no 10)",
    cuerpo:
      "La energía de foco es un recurso finito (~4h/día de trabajo profundo sostenible). Multiplicarla entre 10 WIGs equivale a no tener ninguno. La app lo hace cumplir por la base de datos: índice único (owner_id, wig_orden) + RPC `toggle_meta_wig` que rechaza el 4º.",
  },
  {
    titulo: "El diseño de tres capas de foco (novedad de esta app)",
    cuerpo:
      "La mayoría de herramientas mezclan 'meta' y 'tarea' en una sola lista. Esta app separa tres planos: (a) WIGs de METAS (qué resultados quieres, máx 3), (b) KRs de la SEMANA (en qué resultados medibles pones horas ahora, máx 3) y (c) WIGs de TAREAS (qué 3 tareas concretas los sostienen). Son caps independientes de 3 — uno sin el otro no funciona.",
  },
  {
    titulo: "Dónde se ven y cómo se marcan en la app",
    cuerpo:
      "Cada capa tiene su panel con contador N/3: el de METAS vive arriba de /metas (con botón “Sugerir 3 WIGs” por IA); el de KRs SEMANALES vive en /semana (con botón “✨ Sugerir 3 KRs” por IA, el ritual del domingo); el de TAREAS vive arriba de /tareas y también en / (sección “Tareas Enormemente Importantes”). En la home (/), las tres capas aparecen en cascada y con nombre propio: “Metas Enormemente Importantes” → “KR’s Enormemente Importantes” → “Tareas Enormemente Importantes”. El panel de KRs se pinta siempre: si la semana no tiene foco elegido, lo dice y enlaza a /semana en vez de desaparecer (una capa invisible noAvisa de que falta). En todos los casos el cap lo impone la base de datos: las RPC toggle_meta_wig / toggle_kr_foco_semanal / toggle_tarea_wig rechazan el 4º.",
  },
  {
    titulo: "El KR de la semana: dos ejes de tiempo, no uno",
    cuerpo:
      "Un KR se mide en trimestres o meses (su COMPROMISO de entrega: “este resultado está listo antes de Q3”). Además, desde la migration 0033, cada KR puede estar en el FOCO de una semana concreta (tu ESFUERZO: “esta semana pongo horas aquí”). Son dos ejes ortogonales: el trimestre no se sustituye, se complementan. Solo entra en el foco semanal un KR cuyo periodo de entrega contiene la semana actual — así lo caducado y lo prematuro se quedan fuera solos.",
  },
];

export const GTD_PUNTOS: Punto[] = [
  {
    titulo: "Principio: la cabeza es para tener ideas, no para guardarlas",
    cuerpo:
      "David Allen (GTD): el cortex prefrontal no está diseñado para almacenar listas. Cada vez que retienes una tarea, consumes atención. La solución: un sistema externo (Supabase, en este caso) donde TODO el inventario existe — incluso lo que no se ve hoy.",
  },
  {
    titulo: "Cómo se materializa en la app",
    cuerpo:
      "La tabla `tareas` admite: meta, área, prioridad, deadline, estado, capa, esfuerzo, importe, RICE, adjuntos, comentarios, subtareas (migración 0010) y recurrencia. Es el repositorio completo de tu operativa. La pantalla /tareas lo muestra todo, pero la página Hoy solo expone 6 en preview.",
  },
  {
    titulo: "El inventario completo vs el foco del día",
    cuerpo:
      "El sistema hace explícita la distinción: 'tener 200 tareas registradas en Supabase' es señal de buena higiene. 'Ver 200 tareas pendientes en la página de inicio' es un error de diseño. La app impone la primera condición y la previene en la segunda.",
  },
];

export const NEXT_ACTION_PUNTOS: Punto[] = [
  {
    titulo: "Definición GTD",
    cuerpo:
      "Una Próxima Acción es la siguiente acción física, visible y concreta que puedes hacer ahora mismo para avanzar la tarea. Si no puedes hacerla en 2 minutos sin ambigüedad, no es una próxima acción — es un proyecto.",
  },
  {
    titulo: "Por qué solo UNA en el foco diario",
    cuerpo:
      "La investigación de Masicampo & Baumeister (2011) demuestra que basta con tener un plan concreto de cuándo ejecutar la tarea pendiente para desactivar el efecto Zeigarnik. No necesitas terminarla. Necesitas saber (a) que está guardada y (b) cuál es el siguiente paso físico.",
  },
  {
    titulo: "Cómo se implementa",
    cuerpo:
      "La tabla `plan_diario_tareas` admite 4 tipos: imprescindible, autocuidado, micro, extra. La página Hoy prioriza las imprescindibles (3-4) y oculta el resto. El componente `MicroAccionCard` elige, además, una única micro-acción para mañana según criterios (racha, score bajo, patrón semanal).",
  },
];

export const INBOXES = [
  {
    ruta: "/captura",
    nombre: "Captura",
    que: "Pensamiento suelto: tareas, ideas, problemas, pagos, reflexiones.",
    cuando:
      "Cuando algo lleva más de 15 segundos en tu cabeza. Es escritura rápida, sin estructura.",
    color: "violet",
    icono: "inbox" as const,
    rama: "ramas: tarea · problema · reflexión · idea · pago · maría · sin_clasificar",
  },
  {
    ruta: "/tareas/inbox",
    nombre: "Tareas (inbox de triaje)",
    que: "Tareas (filas de la tabla `tareas`) sin meta asignada o sin trimestre.",
    cuando:
      "Solo cuando ya tienes una tarea formalizada y necesitas decidir a qué objetivo/trimestre pertenece.",
    color: "sky",
    icono: "flag" as const,
    rama: "no se mezcla con el inbox de cabeza: aquí ya son tareas, no pensamientos.",
  },
];

export const ANTIPATRONES: { titulo: string; por_que: string; que_hacer: string }[] = [
  {
    titulo: "Marcar 5+ WIGs",
    por_que:
      "La RPC `toggle_meta_wig` ya lo bloquea (devuelve false), pero si relajas la restricción perderás el efecto concentrador. Es como repartir un foco de 4h entre 8 objetivos: ninguno avanza.",
    que_hacer:
      "Si tienes 5 candidatos, jerarquiza: ¿cuál, si lo logras, hace irrelevantes a los otros 4? Ese es tu WIG.",
  },
  {
    titulo: "Mostrar 40 tareas en la página Hoy",
    por_que:
      "Anula el efecto de la Próxima Acción. El cerebro ve la lista, calcula el coste, procrastina. Por eso Hoy está deliberadamente curado (3 stats + 2 paneles WIG + plan + 6 en preview).",
    que_hacer:
      "Si quieres ver las 40, ve a /tareas. La página Hoy es para ejecutar, no para revisar.",
  },
  {
    titulo: "Confundir los dos inboxes",
    por_que:
      "/captura es para VACIAR la cabeza. /tareas/inbox es para TRIAR tareas. Mezclarlos satura ambos: terminas con ideas de pago en tu lista de tareas formales y con tareas estructuradas en tu captura rápida.",
    que_hacer:
      "Regla: si lleva <15s en tu cabeza, ni lo captures. Si es un texto libre sin estructura → /captura. Si ya es una tarea con meta, prioridad y deadline → /tareas/inbox hasta que la asignes.",
  },
  {
    titulo: "No saber si lo tuyo es proyecto o meta",
    por_que:
      "Confusión clásica. Un proyecto agrupa 2-4 metas dentro de un área; una meta es un resultado medible con plazo. Sin esta distinción, las metas se quedan sueltas, los proyectos sin metas hijas, y la jerarquía no cuenta la historia.",
    que_hacer:
      "El agente de /agente decide por ti: pega el contexto y la IA CLASIFICA entre proyecto (te propone 2-4 metas hijas con KR inicial y fecha objetivo cada una), meta (una sola) o captura (no accionable, va al inbox). Si prefieres decidir tú: «¿puedo partir esto en 2-4 resultados con plazo? → proyecto. ¿es un único resultado medible? → meta. ¿no tiene forma? → captura».",
  },
  {
    titulo: "Saltarse la captura y 'tenerlo en la cabeza'",
    por_que:
      "El efecto Zeigarnik se reactiva cada vez que el sistema pierde confianza. Si dudas de que la app guarda todo, el cortex prefrontal vuelve a cargar con la lista.",
    que_hacer:
      "Captura todo lo que pese, en cualquier momento. El costo de capturar es bajo; el costo de recordarlo es alto.",
  },
  {
    titulo: "Definir WIGs-meta sin WIGs-tarea (o al revés)",
    por_que:
      "Sin Lead Measures concretas, el Lag Measure se queda en deseo. Sin Lag Measure, las tareas son actividad sin propósito. Ambas capas son obligatorias y se conectan por la columna `tareas.meta_id`.",
    que_hacer:
      "Cada vez que marques un WIG-meta, pregúntate: '¿cuáles son las 3 tareas semanales que, si las hago, garantizan que avanzo?'. Márcalas como WIGs-tarea.",
  },
];

export const PENDIENTES_RESPUESTA: Punto[] = [
  {
    titulo: "Definición",
    cuerpo:
      "Una tarea está 'pendiente de respuesta' cuando ya iniciaste una acción (mandar un email, pedir un OK, dejar una llamada apuntada) y tu próximo paso es ESPERAR, no actuar. El flag ⏳ en /tareas lo marca. No es un estado (la tarea puede seguir en pendiente, en_progreso o hecha), es un ATRIBUTO SEMÁNTICO.",
  },
  {
    titulo: "El reframe mental: estoico y Covey",
    cuerpo:
      "Encima de la lista de /tareas/pendientes-respuesta hay un banner que dice «No te preocupes de lo que está pendiente de los demás». No es un añadido decorativo: es la mitad del trabajo. La utilidad operativa del panel ya te dice cuándo hacer follow-up; este banner te recuerda la regla de fondo: cada fila representa algo que NO está bajo tu control, tu única acción posible es el follow-up, y si hoy no toca, déjalo aquí — el panel vuelve a sacarlo cuando lleve demasiado tiempo esperando. Razón: según Covey (Los 7 hábitos), preocuparse por lo que está fuera del círculo de influencia gasta energía sin mover la aguja; según Epicteto, lo que no depende de ti ni siquiera merece preocupación. El panel te ayuda operativamente a desatascar; el banner te ayuda mentalmente a soltar.",
  },
  {
    titulo: "Por qué necesita un panel propio",
    cuerpo:
      "Porque el resto de la lista mide cosas que TÚ controlas (prioridad, deadline, esfuerzo). En cambio, una pendiente de respuesta es algo que depende de OTRO. Mezclada con la lista principal, compite por foco con cosas que sí puedes hacer ahora. Sacada a un panel propio, deja de 'pesar' en el inventario activo y solo reaparece cuando toca hacer follow-up.",
  },
  {
    titulo: "Regla de uso: panel pequeño",
    cuerpo:
      "El panel /tareas/pendientes-respuesta debería tener pocos elementos. Si crece, o bien no estás haciendo follow-ups a tiempo (la antigüedad lo delata: lo de arriba lleva esperando más), o bien estás externalizando demasiado trabajo sin control. La acción correctiva casi siempre es la misma: un follow-up corto, escrito, con deadline ('si para el viernes no hay respuesta, escalo / replanteo / descarto').",
  },
  {
    titulo: "Cuándo destildar el flag",
    cuerpo:
      "Tres situaciones: (1) llegó la respuesta y la tarea se cierra (destildas y, si era el objetivo, la marcas como hecha). (2) llegó la respuesta y te abre trabajo nuevo (destildas, queda como tarea normal, y creas la nueva si toca). (3) se enfrió y ya no aplica (destildas, opcionalmente archivas la tarea). El botón '✓ Respuesta recibida' en el panel hace (1)/(2)/(3) en un click.",
  },
];

export const CRITERIO_SELECCION: Punto[] = [
  {
    titulo: "El orden de decisión (de más a menos peso)",
    cuerpo:
      "1) RIESGO FINANCIERO: tarea vinculada a un pago vencido o próximo. Va POR DELANTE del resto a propósito: una deuda vencida tiene consecuencias más graves que cualquier otro compromiso, aunque la otra tarea tenga la fecha más restrictiva. 2) COMPROMISO INAMOVIBLE: fecha dura + señal de peso (WIG, meta o capa). 3) RIESGO OPERATIVO: importante y vence en ≤7 días. 4) INGRESOS: solo con el tag explícito 'ingresos' — nunca se infieren. 5) IMPORTANTE NO URGENTE: meta activa o WIG sin urgencia de fecha. 6) MANTENIMIENTO: gestión acotada (≤15 min, o ≤45 min si no tiene fecha próxima). 7) BIENESTAR: ámbito personal — va a su propia sección y NO se descarta. 8) Lo que no encaja en ninguna: candidata a descartar, aplazar o delegar en la revisión semanal.",
  },
  {
    titulo: "Mantenimiento ≠ «tarea corta»",
    cuerpo:
      "El hueco de mantenimiento es para una gestión acotada: revisar facturas, contestar un aviso, actualizar un dato. Se recognize por ser corta Y por no aprieta: si tiene fecha próxima, es trabajo programado y va como secundaria, aunque dure 20 minutos. Y si tiene más de 45 minutos, ya no es una gestión: es trabajo de verdad. El orden importa, porque una gestión de 30 minutos con meta no es «avance en el objetivo»: ocuparía el sitio de una tarea grande con el mismo valor operativo.",
  },
  {
    titulo: "El bienestar no es una tarea más: es tiempo protegido",
    cuerpo:
      "Las tareas de ámbito personal (caminar, estar con la familia, descansar) NO compiten por el sitio de la tarea principal ni se leen como otra tarea del plan: van a su propia sección, con su propio motivo. Y en ningún caso caen en la lista de descartables — el brief es explícito en que ese tiempo no debe contar automáticamente como improductivo. Ajustar la carga de trabajo y proteger el tiempo de descanso son cosas distintas.",
  },
  {
    titulo: "Qué NO entra nunca en el plan",
    cuerpo:
      "Las tareas en estado hecha, descartada, archivada o bloqueada (ya no sonInventory activo). Las marcadas con el flag ⏳ 'pendiente de respuesta' (esperar no es actuar: su próximo paso depende de otro). Y las recurrentes, porque un hábito no es una 'tarea del día': los hábitos viven en /estatus, no en el plan de ejecución.",
  },
  {
    titulo: "La capacidad ajusta la carga, NO silencia los riesgos",
    cuerpo:
      "El semáforo emocional que ya existe (verde / amarillo / rojo) se traduce a un NIVEL DE CARGA más fino (alta / media / mínima), y el corte es deliberadamente menos severo: “Sí, todo me arrastra” es saturación (hagamos menos cosas), no fatiga (no puedo más), así que da carga MEDIA, no mínima. El corte severo queda para “Agotado” y para un semáforo rojo ya guardado. Con carga alta entran 1 principal + 2 secundarias; con media, 1 + 1; con mínima, sólo la principal. Pero un pago vencido NO desaparece por estar en carga mínima: sigue apareciendo como AVISO. Ajustar la carga y ocultar un riesgo son cosas distintas, y la segunda es exactamente lo que el sistema debe evitar.",
  },
  {
    titulo: "Los pagos vencidos se agrupan, pero NO se fusionan",
    cuerpo:
      "Tres TGSS de 480 € son tres obligaciones distintas y el usuario tiene que ver cuántas son y cuánto pesan: nunca se fusionan ni se descartan. Lo que se agrupa es el RUIDO: los vencidos hace más de 30 días se muestran como un resumen con el total, y al desplegarlo salen uno a uno. Los que vencen esta semana se muestran siempre en individual, porque son los que exigen una decisión hoy. Y el estado que se mira es el EFECTIVO (el que ve el usuario en /pagos), no el crudo de la tabla: si no, los pagos vencidos hace meses pasarían por 'pendientes'.",
  },
  {
    titulo: "Una obligación, un hueco (y la más cara primero)",
    cuerpo:
      "Si una tarea enlaza con varios pagos (una fianza de 700 € y otra de 1.000 €, por ejemplo), el sistema elige el de MAYOR IMPORTE PENDIENTE, no el primero que aparece. Y una misma obligación no puede ocupar dos huecos del plan: si la principal ya es “atender la fianza”, la secundaria no vuelve a ser “atender la fianza”. Sin esto, la pantalla decía dos veces “este es el riesgo que debes atender” y la segunda no era una segunda cosa que hacer, sino la misma otra vez.",
  },
  {
    titulo: "El estado del pago va DENTRO del motivo, nunca inventado",
    cuerpo:
      "El motivo dice la verdad: “vence en 20 días”, “vence hoy”, “vencido hace 30 días”, con el importe pendiente y qué señal coincidió (importe o proveedor/concepto). Un aviso falso es PEOR que no avisar: si el sistema llama “vencido” a un pago que vence en tres semanas, deja de ser creíble para todo lo demás. Por eso el estado se lee del pago efectivo (el que ve el usuario en /pagos) y se escribe tal cual.",
  },
  {
    titulo: "El tiempo estimado sólo se dice si es fiable",
    cuerpo:
      "De `tareas_subtareas.tiempo_estimado_min` (numérico, ya persistido, y la primera subtarea PENDIENTE es la próxima acción = el tiempo real de trabajo). NO de `tareas.esfuerzo`, que es texto libre: en los datos reales aparecía un “1” en una factura que no eran minutos, y el motor lo leía como “1 minuto”. Un número suelto menor de 5, o sin unidad explícita, NO se interpreta como tiempo: es preferible decir “sin estimar” que mentir con un número.",
  },
  {
    titulo: "La relación pago ↔ tarea se resuelve por texto (y con cautela)",
    cuerpo:
      "No existe FK entre `pagos.pagos` y `public.tareas` (son schemas separados). La única relación posible hoy es textual: el importe pendiente del pago aparece en el título o la descripción de la tarea, o coincide una palabra significativa del proveedor o del concepto. Se exige UNA sola señal para no generar falsos positivos, y el motivo siempre dice cuál fue ('importe coincidente' / 'concepto coincidente'). Un vínculo duro exigiría una tabla puente: es una decisión pendiente, no una limitación aceptada.",
  },
  {
    titulo: "Sin IA para decidir QUÉ; con IA para explicar CÓMO",
    cuerpo:
      "El módulo es una función pura: sin efectos secundarios, sin llamadas a la API y sin escrituras en la BD. Eso permite (a) testearlo sin coste, (b) generar la propuesta en modo 'shadow' —verla sin que se escriba nada— antes de activarla, y (c) cambiar el criterio sin tocar la interfaz. La IA entra después: redacta el motivo en lenguaje natural y propone el primer paso concreto.",
  },
];


// ----------------------------------------------------------------------------
// ÍNDICE DE PANTALLAS (qué hace cada ruta) — vive en /docs
// ----------------------------------------------------------------------------

export const FEATURES: Feature[] = [
  // ── Núcleo diario ──
  { ruta: "/", proposito: "Hoy: semáforo del día + plan diario + contadores + TRES capas de WIG, una por panel y con nombre propio: ‘Metas Enormemente Importantes’ (violeta) → ‘KR’s Enormemente Importantes’ (celeste, los KRs en foco de la semana; el panel se pinta SIEMPRE, y si esta semana no hay foco elegido dice cuál es el siguiente paso en vez de desaparecer) → ‘Tareas Enormemente Importantes’ (fucsia) + panel ‘Tareas con fecha’ entre los WIGs-tareas y el Plan de hoy, con check inline para marcarlas hechas sin navegar. El panel ordena por fecha REAL (fecha_fin): las vencidas arriba, luego HOY, luego futuras; las tareas cuyo deadline es solo una nota de texto (‘esta semana’) van al final, con su nota tal cual, y nunca con ‘en NaNd’", docs: "Rituales §1 (mañana 1ª hora) · HelpDrawer" },
  { ruta: "/captura", proposito: "Inbox rápido para vaciar la cabeza (efecto Zeigarnik)", docs: "Pilar 4 · Rituales §1 · HelpDrawer" },
  { ruta: "/estatus", proposito: "9 hábitos + auditoría 20/80 + cierre cognitivo", docs: "Pilar 4 · Rituales §1 (final del día) · HelpDrawer" },
  { ruta: "/estatus/nuevo", proposito: "Crear nueva entrada de Estatus (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/editar", proposito: "Editar entrada existente (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/ver", proposito: "Ver una entrada en detalle (racha + micro-acción)", docs: "Sub-ruta de /estatus" },

  // ── Tareas y GTD ──
  { ruta: "/tareas", proposito: "Tareas pendientes: marcar hechas, adjuntos, asignar a meta/KR + toggle ⏳ pendiente de respuesta por fila. Cerrar una tarea NO cierra sus subtareas: las que queden pendientes siguen visibles como pendientes y se retoman al reabrir la tarea (decisión del usuario, sin falsear el registro). RECURRENCIA: al completarse, la tarea recurrente se clona para la siguiente fecha conservando su clasificación (ámbito personal/profesional, tags y fecha dura de finalización); el KR NO se hereda porque pertenece a un trimestre, así que la copia aparece en la bandeja de la meta para reasignarla al KR del periodo que le toque. Encima de la tabla, la CASCADA DE FOCO completa (como en la home): WIGs de META con sus KRs (violeta) → KRs en foco de la semana (celeste, el mismo foco que se elige en /semana) → WIGs de TAREAS (fucsia). Así, mientras ejecutas, ves en qué resultado medible estás poniendo horas y no solo qué tarea", accesibilidad: "Todos los controles de la app (botones, enlaces-acción e iconos pulsables) tienen un área táctil de 40 px de alto (min-h-10): antes había 58 por debajo de 32 px —11 por debajo de 24—, imposibles de pulsar con el dedo. La app se usa en el móvil: el objetivo táctil es usabilidad, no un detalle visual.", docs: "Pilar 2 · WIGs §3 (cap de ejecución) · Pilar 4 (sección “Pendientes de respuesta”) · HelpDrawer" },
  { ruta: "/tareas/inbox", proposito: "Triaje residual: tareas sin meta o sin KR (después de asignar al crear)", docs: "HelpDrawer" },
  { ruta: "/tareas/pendientes-respuesta", proposito: "Panel dedicado a tareas con el flag “pendiente de respuesta” (esperando a alguien). Ordenadas por antigüedad: lo que más tiempo lleva esperando primero. Botón para destildar cuando llega la respuesta", docs: "Pilar 4 (sección “Pendientes de respuesta”) · HelpDrawer" },
  { ruta: "/tareas/completadas", proposito: "Histórico de tareas hechas (7/30/90/365/todo)", docs: "HelpDrawer" },

  // ── Trabajo profundo ──
  { ruta: "/focus", proposito: "Pomodoro + pre-flight check + post-focus", docs: "Pilar 1 · Productivity Stack · Rituales §1 · HelpDrawer" },
  { ruta: "/calendario", proposito: "Time-blocking: 4 bloques fijos × 7 días", accesibilidad: "Los buscadores no roban el foco al abrirse (auditoría #5). Los popover de bloque se cierran con Escape y con su botón: el fondo es decorativo y no anuncia nada al lector de pantalla (auditoría #2).", docs: "Pilar 3 · Rituales §1 (mañana) · HelpDrawer" },

  // ── Metas y planificación ──
  { ruta: "/metas", proposito: "LISTADO EN TABLA (no tarjetas): una fila por meta con columnas Meta (código + título + descripción + tags) · Estado · Ámbito · Proyecto (con su color) · KRs (resultados con su periodo de entrega y valor actual/objetivo) · Progreso (barra + % + tareas hechas/total) · Plazo (fecha objetivo 🔒 o plazo) · Acciones (WIG 🎯 / Editar / Archivar / Eliminar). Es la vista de gestión: las 15 metas se comparan de un vistazo por columna (las tarjetas ocupaban media pantalla cada una y solo se veían 4 a la vez). En móvil pasa a filas compactas. BUSCADOR de texto (mira en título, código, descripción, tags, títulos de KR y nombre de proyecto; varias palabras = AND) + FILTRO por proyecto (incluye “Sin proyecto”) + filtro por ámbito + por tags, con contador “N de M”. Encima, panel WIGs (máx 3) con sus KRs. + IA Sugerir WIGs + filtro Archivadas + EditarMetaModal con botón IA Generar plan. El botón Eliminar muestra preview del impacto (cuántos KRs y tareas quedarán huérfanos) antes de borrar — aprovecha el ON DELETE SET NULL/CASCADE de migration 0001 para que las tareas sigan vivas sin meta", docs: "Pilar 2 · Ritual mensual · HelpDrawer" },
  { ruta: "/metas/nueva", proposito: "Crear meta con rango real [inicio, fin] + botón IA Generar plan (KRs+tareas+hábitos) que reparte los KRs SOLO dentro del rango. Hard constraint opcional 🔒", accesibilidad: "Casillas y campos con nombre accesible (auditoría #1).", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/agente", proposito: "Agente IA: contexto libre → meta + plan trimestral completo (atajo directo a meta; la entrada unificada es /agente)", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/agente", proposito: "Agente unificado: clasifica la idea (proyecto/meta/captura) y propone estructura. Bucle de aplicación con 2 pases + árbitro adversarial que verifica que el 100% de las metas hijas se persistan en Supabase antes de redirigir; si hay gap muestra panel con nombres faltantes y motivo del error. Fase 2 automática: tras crear metas+KRs iniciales, genera el plan completo (KRs+tareas+hábitos) por meta con generarPlanMetaIA + aplicarKrsYTareasEnMeta. Pre-bucle: getSession() para evitar fallo de RLS por JWT transitorio + backoff de 50ms entre inserts. Detección de PGRST303 (reloj desincronizado) con banner en AppShell + panel diagnóstico. migration 0024", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/auditoria", proposito: "Auditoría de metas: qué les falta (área, proyecto, fecha objetivo, contexto, KRs). migration 0024", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/detalle", proposito: "Detalle de una meta con sus KRs (uno o varios por trimestre/mes) + tareas por KR + botones Editar/✨ Generar plan con IA (KRs+tareas+hábitos, respeta KRs existentes por título) + Archivar + WIG + asignar tareas del inbox. Migration 0028: ya no hay UNIQUE por (meta, trimestre) — puedes tener N KRs en el mismo trimestre.", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/plan", proposito: "Plan trimestral con scorecard de KRs + proyección", docs: "Pilar 2 · Ritual semanal (domingo) · Ritual mensual · HelpDrawer" },
  { ruta: "/krs", proposito: "Tabla con TODOS los Key Results del sistema: una fila por KR con la META a la que pertenece y el PROYECTO resueltos, más la entrega (trimestre/mes), el estado, el valor actual editable (el único dato escribible de la página) y el progreso de tareas. Filtros por texto (KR, meta o proyecto), por proyecto y por estado. Es el inventario completo que faltaba: /metas/plan se lee por columnas de trimestre y /metas/detalle obliga a abrir meta por meta. Encima de la tabla, el PANEL DE KRs (máx 3): los KRs en FOCO DE LA SEMANA —los resultados medibles en los que pones horas ahora—, con su meta, su entrega y su progreso; el mismo panel que hay en la home y en /tareas, para que al inventariar KRs se vea de inmediato en qué resultado se está Focusing. Si la semana no tiene foco elegido, el panel lo dice y enlaza a /semana. Sin migración: solo lee kr_foco_semanal + resultados_periodo + metas + kr_periodos + periodos + tareas", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/plan-diario", proposito: "Estado emocional + plan diario generado por IA. El prompt recibe los KRs en foco de la semana (migration 0033) y ancla los bloques del día a esos resultados medibles; si no hay foco elegido, el día se planifica igual por compromiso y deadline (el foco semanal nunca bloquea el día). BOTÓN “¿Qué propondría el sistema?” (Modo sombra, Fase 3 del Modo Recuperación): muestra la propuesta del motor DETERMINISTA de selección —1 tarea principal + hasta 2 secundarias + mantenimiento + tiempo personal + avisos de riesgo— con el motivo en texto plano de cada una y comparada con tu plan actual. NO escribe nada en la BD: es de observación", docs: "Rituales §1 (mañana) · HelpDrawer" },
  { ruta: "/plan-diario/detalle", proposito: "Detalle de un plan con notas e informe y casilla para marcar las tareas LIBRES del día (las que propone la IA). Las tareas vinculadas a una tarea real se marcan desde /tareas y el contador del plan se sincroniza solo: el histórico ya refleja el progreso real (antes siempre decía 0/N)", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/plan-diario/historico", proposito: "Histórico de planes (7/30/90/365/todo)", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/semana", proposito: "Pipeline semanal con drag & drop + IA 3 críticas/día + PANEL DE FOCO SEMANAL DE KRs (máx 3, migration 0033): los resultados medibles en los que pones horas esta semana, con scorecard y ✨ Sugerir 3 KRs por IA. El trimestre NO se sustituye (sigue diciendo cuándo se entrega); la semana dice dónde pones el esfuerzo. Solo entran KRs con entrega en marcha (regla de contención, aplicada en BD). La propuesta IA de tareas ahora prioriza las ancladas a los KRs en foco", accesibilidad: "El buscador no roba el foco al abrir el modal (auditoría #5). Los modales de la semana se cierran con Escape y con su botón (auditoría #2).", docs: "Ritual semanal (domingo noche) · HelpDrawer" },
  { ruta: "/pipeline", proposito: "Kanban por prioridad + motor IA de priorización", docs: "Ritual semanal (miércoles) · HelpDrawer" },
  { ruta: "/matriz", proposito: "Matriz Eisenhower 2D (urgencia × importancia) de tareas activas. Drag & drop entre cuadrantes (dnd-kit/core) + botón IA “✨ Sugerir redistribución” que propone mover las tareas desubicadas al cuadrante correcto (módulo IA en src/lib/tareas/sugerirMatrizIA.ts). Sin migración: la clasificación se calcula en cada render desde fecha_fin + meta.es_wig; aplicar cambios solo escribe `prioridad`. Filtros: solo WIGs-meta / solo con fecha. Complemento visual de /pipeline (1D) — la matriz es 2D", docs: "Pilar 4 · HelpDrawer" },

  // ── Revisión y análisis ──
  { ruta: "/informes", proposito: "KPIs (incluye subtareas) + heatmap de actividad + chart de tareas y subtareas por día/semana + proyectos con conteo + metas y OKRs cerrados + comparación con plan vs sin plan. REGLA DE PROGRESO: una subtarea cuenta como progreso mientras su tarea siga ABIERTA; al cerrar la tarea, su progreso ya lo representa la tarea completa (1) y las subtareas dejan de sumar, para no contar dos veces el mismo trabajo", docs: "Ritual semanal (viernes) · Ritual mensual · HelpDrawer" },
  { ruta: "/dashboard-emocional", proposito: "4 dimensiones: despertar / mente / cuerpo / rueda", docs: "Pilar 4 · HelpDrawer" },

  // ── Identidad y horizonte ──
  { ruta: "/norte", proposito: "Propósito, valores y visión (la brújula)", docs: "Pilar 2 · Ritual diario (despertar) · Ritual mensual · HelpDrawer" },
  { ruta: "/areas", proposito: "Áreas de responsabilidad (ámbitos continuos sin fecha de cierre). CRUD + listado de proyectos hijos por área + sección 'Sin área' para huérfanos. Migración 0001 (la tabla ya existía; aquí se le da página propia estilo /proyectos). Icono IconLayers. Reordenado en el sidebar Estrategia (posición 2, entre Norte y Proyectos)", accesibilidad: "Cada campo de formulario tiene su etiqueta asociada (htmlFor/id): el lector de pantalla anuncia qué es cada campo. En toda la app (auditoría #1).", docs: "Pilar 2 · HelpDrawer" },

  // ── Sistema ──
{ ruta: "/pagos", proposito: "Pagos pendientes: ejecutar tesorería lunes 1ª hora + botón IA “✨ Sugerir pagos” (migration 0027) que analiza los pagos activos y propone programación para los próximos 6 lunes aplicando el prompt editable en /configuracion (snowball por defecto, ingresos viernes/sábado). Modal de revisión estilo SugerirWigs: la IA sugiere, tú marcas qué incluir, botón “Aplicar N marcadas” actualiza solo fecha_pago_programada y estado=programado (no registra pagos parciales). Prompt editable en /configuracion §Prompt de pagos (columna prompt_pagos)", accesibilidad: "Los modales de pago se cierran con Escape y con su botón (auditoría #2). Un pago anulado con dinero ya pagado se puede deshacer desde su menú (↩︎ Deshacer anulación): el importe pagado no se pierde (auditoría #14).", docs: "Apéndice §Bucle de equilibrio · Ritual semanal (lunes estricto) · HelpDrawer" },
  { ruta: "/proyectos", proposito: "Gestión de proyectos con conteo de tareas, DOBLE barra de progreso, listado de metas hijas (migration 0024), archivado en cascada a metas+tareas, confirm con preview de impacto al eliminar, botón Editar (modal ligero con nombre/color/descripción/área), exportación a PDF por proyecto (modal con vista previa + Imprimir a PDF nativo del navegador, sin librerías externas). Las dos barras miden cosas distintas: la de METAS (con el color del proyecto) es el avance real —un proyecto es un contenedor de resultados, así que lo mide el avance de sus metas hijas— y la de TAREAS es el esfuerzo operativo. El avance de una meta se calcula desde el estado REAL de sus tareas (las directas y las de sus KRs), no de un contador manual: al completar todas las tareas vivas de una meta, la meta se COMPLETA SOLA y la barra avanza (issue #35). Un proyecto sin metas no muestra la barra de metas (no hay nada que medir todavía). Las TARJETAS tienen dos alturas: los botones (ver / editar / PDF / archivar / eliminar) van arriba en su propia fila, alineados a la derecha (issue #40), y el resto —nombre, descripción, contadores, barras y metas hijas— ocupa el ancho completo de la tarjeta (issue #36): antes los botones de la derecha robaban el ancho al texto y lo dejaban en dos líneas. Al pulsar 'ver' se navega a /tareas?proyecto=X y se abre el filtro en 'todas' (no 'activas') para que las tareas hechas/archivadas del mismo proyecto sean visibles, especialmente en proyectos ya cerrados o arrastrados. Sección ámbar final con metas sin proyecto asignado (huérfanas, patrón simétrico a /areas → proyectos sin área) para que David no las pierda — archivadas ocultas, y cada huérfana trae un botón Eliminar con preview de impacto (las tareas no se borran, solo se desvinculan de la meta gracias a ON DELETE SET NULL). Las tarjetas se adaptan al ancho del móvil (issue #45): el título se recorta con puntos suspensivos, las barras de progreso pueden partirse en dos líneas y las metas sin proyecto también se cortan, de modo que ningún panel se sale de la pantalla en el móvil", accesibilidad: "Los campos del alta y del modal de edición llevan etiqueta asociada (auditoría #1).", docs: "HelpDrawer" },
  { ruta: "/escenarios", proposito: "Escenarios de proyecto: las 3 dimensiones separadas — CONTEXTO (cronología append-only de hechos, tipada como contexto/estado/situación), ESTADO (el presente MEDIDO, calculado de las tareas en cada render, sin tabla que se pudra) y SITUACIÓN (el presente interpretado: nota manual + la lectura de la IA). Botón “✨ Analizar escenarios” que pide a la IA los escenarios del proyecto agrupados por categoría (riesgos / oportunidades / puntos ciegos / wildcard), cada uno con probabilidad (dato secundario), estrategia accionable, justificación e indicador de validación; el más probable sale destacado. Historial de todos los análisis (la lectura cambia con los nuevos hechos). Migration 0029 (proyecto_eventos + proyecto_analisis). Módulo IA: src/lib/escenarios/analizarEscenariosIA.ts (prompt adaptado de fooday-intelligence-core/agents/agente-generador-hipotesis.md)", docs: "Ritual semanal (domingo) · Pilar 2 · HelpDrawer" },
  { ruta: "/configuracion", proposito: "Configuración: API key IA, base URL, modelo, tema, prompt de pagos editable (migration 0027) y perfil para la IA — quién eres, familia, restricciones y contexto del negocio (migration 0032, antes hardcodeado en los prompts). Campo vacío = se usa el valor por defecto de la app", docs: "Pilar 2 · HelpDrawer" },

  // ── Global (presente en TODAS las pantallas) ──
  { ruta: "(global)", proposito: "Chat del agente: botón flotante en toda la app para PREGUNTAR por tus datos reales (metas, KRs, proyectos, tareas, plan de hoy, foco semanal, norte). Es de SOLO LECTURA: no crea ni modifica nada (escribir es cosa de /agente). Las conversaciones se GUARDAN y se retoman desde el botón de historial. Sin tool-calling: la app es una SPA estática, así que el estado real se le da a la IA como snapshot de texto en el prompt (src/lib/agente/contexto.ts) y cada mensaje es UNA llamada. CONOCE TODO EL MÉTODO: el manual del sistema (5 pilares, glosario, rituales, arquitectura WIG/GTD, índice de pantallas) se construye desde los MISMOS datos que pintan /docs y /metodologia (src/lib/metodologia/conocimiento.ts) y va en el system prompt, así que recomienda con el criterio de la app y no con el genérico de la IA. migration 0035", docs: "Pilar 2 · Complemento §El agente que conoce tu sistema · Rituales de uso" },

  // ── Documentación ──
  { ruta: "/docs", proposito: "Esta página: pilares + rituales + apéndices + índice", docs: "(auto-referencial)" },
  { ruta: "/metodologia", proposito: "WIGs, GTD, Próxima Acción, dos inboxes", docs: "(complemento directo de /docs)" },

  // ── Auth ──
  { ruta: "/login", proposito: "Login con Supabase (email + password)", docs: "(no requiere metodología)" },
];
