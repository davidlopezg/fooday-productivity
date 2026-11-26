// ============================================================================
// Marco Personal de Vida — documento base de la página /norte.
//
// Es un documento de principios, límites y compromisos. Vive aquí (y no en la
// base de datos) porque es estático: es la referencia que se relee cuando se
// pierde el rumbo, no algo que se edita cada día.
//
// La estructura (`MarcoSeccion`) está pensada para renderizarse tal cual en
// /norte: títulos numerados, bloques de texto, listas de límites/compromisos,
// tablas y un cierre. Así el documento es legible de un vistazo.
// ============================================================================

export type MarcoLista = {
  titulo: string;
  items: string[];
};

export type MarcoBloque = {
  titulo: string;
  parrafos?: string[];
  lista?: MarcoLista;
  cierre?: string;
};

export type MarcoTabla = {
  titulo?: string;
  columnas: string[];
  filas: string[][];
};

export type MarcoSeccion = {
  num: string;
  titulo: string;
  intro?: string[];
  bloques?: MarcoBloque[];
  listas?: MarcoLista[];
  tablas?: MarcoTabla[];
  cierre?: string[];
};

export const MARCO_TITULO = "Mi Marco Personal de Vida";
export const MARCO_SUBTITULO =
  "Los límites que quiero establecer y la vida que quiero construir. Documento personal de principios, prioridades y compromisos.";

/** Cuándo y con qué frecuencia hay que releer el documento. */
export const MARCO_RECORDATORIO = {
  titulo: "Cuándo leer este marco",
  intro:
    "Este documento no se lee de un tirón ni todos los días. Tiene un ritmo: unas lecturas breves para no perder el rumbo y una lectura profunda cada trimestre. Si un compromiso nuevo aparece (proyecto, cliente, contrato), léelo ANTES de aceptarlo: es el filtro, no el trámite.",
  momentos: [
    {
      cuando: "Cada día",
      cuanto: "2 min",
      donde: "Al despertar, antes de mirar el móvil",
      que: "El propósito (§1) y tus prioridades del día (§5).",
    },
    {
      cuando: "Cada semana",
      cuanto: "15 min",
      donde: "Revisión semanal",
      que: "Tus límites no negociables (§4) y tus señales de alerta (§7).",
    },
    {
      cuando: "Cada mes",
      cuanto: "30 min",
      donde: "Revisión mensual",
      que: "El compromiso de 90 días (§8) y cómo va la medición (§9).",
    },
    {
      cuando: "Cada trimestre",
      cuanto: "45 min",
      donde: "Revisión trimestral",
      que: "El documento completo: comprueba que el Norte sigue siendo el tuyo.",
    },
    {
      cuando: "Antes de decidir",
      cuanto: "5 min",
      donde: "Antes de aceptar un proyecto, cliente o compromiso",
      que: "Las 8 preguntas de §6 y los límites no negociables (§4).",
    },
  ],
};

export const MARCO_SECCIONES: MarcoSeccion[] = [
  // ── 1. Propósito ─────────────────────────────────────────────────────────
  {
    num: "1",
    titulo: "Mi propósito",
    intro: [
      "Quiero construir una vida tranquila, equilibrada, intelectualmente estimulante y económicamente estable.",
      "Quiero tener tiempo para mi familia, disfrutar de mi hija mientras crece, cuidar mi salud, desarrollar mis capacidades intelectuales y trabajar en proyectos que me aporten satisfacción y libertad.",
      "No quiero que mi vida consista en trabajar, resolver problemas, preocuparme por el dinero, mirar el móvil y esperar a que llegue el siguiente día.",
      "Quiero recuperar el control de mi tiempo y de mi atención.",
      "Quiero seguir aprendiendo, creando, emprendiendo y desarrollándome, pero sin que todo ello implique sacrificar mi bienestar o el de mi familia.",
      "Mi objetivo no es tener más cosas, hacer más cosas o ganar más dinero a cualquier precio. Mi objetivo es tener una vida que merezca la pena vivir.",
    ],
  },

  // ── 2. Lo que no quiero ──────────────────────────────────────────────────
  {
    num: "2",
    titulo: "Lo que no quiero en mi vida",
    intro: [
      "Estos son los comportamientos, situaciones y dinámicas que quiero dejar atrás.",
    ],
    bloques: [
      {
        titulo: "2.1 · No quiero vivir pegado al móvil",
        parrafos: [
          "No quiero que el teléfono sea lo primero que consulte al despertarme y lo último que mire antes de dormir.",
          "No quiero pasar horas consumiendo información, vídeos, noticias, redes sociales o conversaciones sin un propósito concreto.",
          "No quiero depender de estímulos constantes para entretenerme, evitar el aburrimiento o aplazar mis responsabilidades.",
          "No quiero que mi capacidad de concentración se deteriore por estar permanentemente interrumpiendo mis pensamientos.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "No consultar el móvil durante la primera hora del día.",
            "No utilizar redes sociales ni vídeos cortos como entretenimiento automático.",
            "No llevar el móvil encima cuando estoy realizando una tarea importante.",
            "No utilizar el móvil durante el tiempo familiar.",
            "No llevarme el teléfono a la cama.",
            "No sustituir sistemáticamente los libros y la lectura por contenido digital de consumo rápido.",
          ],
        },
      },
      {
        titulo: "2.2 · No quiero vivir permanentemente preocupado",
        parrafos: [
          "No quiero que los problemas económicos, las deudas, los bancos, las reclamaciones o la incertidumbre empresarial ocupen mi cabeza durante todo el día.",
          "No quiero despertarme pensando en problemas ni acostarme repasando conversaciones, posibles escenarios o situaciones que todavía no puedo resolver.",
          "No quiero dedicar horas a revisar una misma cuestión cuando no existe información nueva.",
          "No quiero tomar decisiones precipitadas para aliviar mi ansiedad.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "Cada problema tendrá un momento concreto para ser atendido.",
            "No revisaré constantemente expedientes, correos o cuentas bancarias.",
            "No confundiré preocupación con trabajo realizado.",
            "No tomaré decisiones importantes bajo presión emocional.",
            "No asumiré que todos los problemas deben resolverse inmediatamente.",
            "No permitiré que un problema económico ocupe todo el espacio mental de mi vida.",
          ],
        },
      },
      {
        titulo: "2.3 · No quiero vivir trabajando",
        parrafos: [
          "No quiero que mi identidad dependa exclusivamente de mis empresas y mis responsabilidades profesionales.",
          "No quiero trabajar hasta agotarme, sentirme culpable cuando descanso o convertir cada día en una carrera por terminar tareas.",
          "No quiero que mi familia reciba únicamente el tiempo que queda después de trabajar.",
          "No quiero que los negocios determinen permanentemente mis horarios y mi disponibilidad.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "Estableceré horarios de trabajo y de desconexión.",
            "No convertiré las noches en una segunda jornada laboral.",
            "No compensaré los días improductivos sacrificando el descanso.",
            "No aceptaré cualquier proyecto por miedo a perder ingresos.",
            "No sacrificaré sistemáticamente fines de semana y momentos familiares.",
            "No confundiré estar ocupado con estar avanzando.",
          ],
        },
      },
      {
        titulo: "2.4 · No quiero dispersarme en demasiados proyectos",
        parrafos: [
          "No quiero empezar constantemente nuevas ideas, herramientas, automatizaciones, sistemas o proyectos sin terminar los anteriores.",
          "No quiero pasar más tiempo diseñando sistemas de productividad que utilizando esos sistemas para trabajar.",
          "No quiero cambiar continuamente de herramientas porque aparece una alternativa aparentemente mejor.",
          "No quiero utilizar la inteligencia artificial como otra forma de consumir información y evitar ejecutar.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "No tendré más de dos proyectos profesionales prioritarios simultáneamente.",
            "No incorporaré herramientas sin una necesidad concreta.",
            "No cambiaré de sistema de organización sin una razón importante.",
            "No empezaré automatizaciones que no tengan un beneficio identificable.",
            "No confundiré investigar posibilidades con conseguir resultados.",
            "No abandonaré proyectos por la simple aparición de una idea nueva.",
          ],
        },
      },
      {
        titulo: "2.5 · No quiero analizar indefinidamente sin actuar",
        parrafos: [
          "No quiero buscar permanentemente la solución perfecta.",
          "No quiero comparar veinte alternativas cuando tres serían suficientes.",
          "No quiero revisar una decisión una y otra vez por miedo a equivocarme.",
          "No quiero convertir el análisis en una manera de posponer el trabajo.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "Las decisiones sencillas y reversibles se tomarán rápidamente.",
            "Estableceré un tiempo máximo de análisis para cada asunto.",
            "No reabriré decisiones razonables sin información nueva.",
            "Aceptaré soluciones suficientemente buenas.",
            "Cuando tenga información suficiente, pasaré a la acción.",
            "No esperaré a tener motivación para empezar.",
          ],
        },
      },
      {
        titulo: "2.6 · No quiero responsabilizarme de todo ni de todos",
        parrafos: [
          "No quiero cargar con problemas que corresponden a otras personas, empresas o instituciones.",
          "No quiero perseguir indefinidamente a personas que no responden.",
          "No quiero dedicar cantidades desproporcionadas de energía a conseguir que otros cumplan con sus obligaciones.",
          "No quiero sentirme responsable de controlar situaciones que no dependen de mí.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "Cada persona debe asumir sus responsabilidades.",
            "No perseguiré indefinidamente a quien no colabora.",
            "Estableceré plazos y seguimientos razonables.",
            "Documentaré los asuntos importantes y utilizaré los procedimientos adecuados.",
            "No confundiré ayudar con hacerme cargo de todo.",
            "No permitiré que la falta de profesionalidad de otros destruya mi tranquilidad.",
          ],
        },
      },
      {
        titulo: "2.7 · No quiero regalar mi tiempo y mi experiencia",
        parrafos: [
          "No quiero trabajar gratuitamente por miedo a perder una oportunidad.",
          "No quiero estar permanentemente disponible para clientes, proveedores o colaboradores.",
          "No quiero preparar propuestas extensas sin haber identificado una oportunidad comercial real.",
          "No quiero aceptar proyectos sin definir responsabilidades, alcance y condiciones económicas.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "Mi experiencia profesional tiene un valor económico.",
            "Los proyectos deben tener un alcance definido.",
            "No ofreceré disponibilidad ilimitada.",
            "No regalaré consultoría de manera indefinida.",
            "No aceptaré clientes que no respeten mi trabajo.",
            "No confundiré ser amable con estar siempre disponible.",
          ],
        },
      },
      {
        titulo: "2.8 · No quiero descuidar mi salud",
        parrafos: [
          "No quiero normalizar el cansancio, el dolor, el sedentarismo o la alimentación desordenada.",
          "No quiero que la comodidad, los horarios del negocio o la falta de tiempo determinen permanentemente lo que como y cómo cuido mi cuerpo.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "No sacrificaré sistemáticamente mis horas de sueño.",
            "No utilizaré el cansancio como excusa permanente para no moverme.",
            "No convertiré la pizza y los dulces en la base de mi alimentación.",
            "No ignoraré síntomas físicos persistentes.",
            "No abandonaré mi salud por mantener un negocio.",
            "No consideraré el ejercicio y el descanso actividades secundarias.",
          ],
        },
      },
      {
        titulo: "2.9 · No quiero vivir exclusivamente para mejorar",
        parrafos: [
          "No quiero convertir cada aspecto de mi vida en un proyecto de optimización.",
          "No quiero sentir que siempre tengo que aprender algo, producir algo, mejorar algo o conseguir algún resultado.",
          "No quiero medir mi valor personal por mi productividad, mis conocimientos o mis resultados económicos.",
          "No quiero sentir culpabilidad por disfrutar de un día sin hacer nada extraordinario.",
        ],
        lista: {
          titulo: "Mis límites",
          items: [
            "No necesito aprovechar todos los minutos.",
            "No necesito aprender algo nuevo cada día.",
            "No necesito estar permanentemente disponible.",
            "No necesito demostrar constantemente mi capacidad.",
            "No convertiré todos mis intereses en oportunidades de negocio.",
            "Me permitiré disfrutar sin justificarlo.",
          ],
        },
      },
    ],
  },

  // ── 3. Lo que sí quiero ─────────────────────────────────────────────────
  {
    num: "3",
    titulo: "Lo que sí quiero en mi vida",
    intro: [
      "Esta parte es igual de importante. No quiero limitarme a eliminar comportamientos negativos. Quiero construir activamente una vida con sentido.",
    ],
    bloques: [
      {
        titulo: "3.1 · Quiero una familia presente y una relación de calidad",
        parrafos: [
          "Quiero disfrutar de María y Abril.",
          "Quiero participar activamente en la infancia de mi hija, acompañarla en su aprendizaje, jugar con ella, conversar, leer juntos y estar presente en sus descubrimientos.",
          "Quiero que Abril recuerde que su padre estaba disponible, que compartía tiempo con ella y que disfrutaba de su compañía.",
          "Quiero cuidar mi relación con María, tener conversaciones que no giren exclusivamente alrededor de problemas y compartir experiencias.",
          "Quiero que nuestra familia tenga momentos de tranquilidad, diversión y espontaneidad.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Dedicar tiempo diario a mi familia sin móvil.",
            "Compartir actividades con Abril.",
            "Leer y aprender cosas juntos.",
            "Reservar momentos de pareja con María.",
            "Proteger los momentos familiares de las obligaciones profesionales.",
            "Crear recuerdos, no solamente cumplir responsabilidades.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: que mi familia sea una parte central de mi vida cotidiana, no una prioridad teórica a la que nunca llego.",
      },
      {
        titulo: "3.2 · Quiero recuperar mi vida intelectual",
        parrafos: [
          "Quiero volver a disfrutar leyendo, aprendiendo, investigando y pensando.",
          "Quiero recuperar la capacidad de concentrarme durante largos periodos.",
          "Quiero desarrollar mi pensamiento crítico, mi capacidad de razonamiento, mi cultura general y mi comprensión del mundo.",
          "Quiero aprender filosofía, historia, ciencia, psicología, tecnología, economía y otras disciplinas que despierten mi curiosidad.",
          "Quiero leer libros completos, reflexionar sobre ellos y construir mis propias opiniones.",
          "No quiero aprender únicamente aquello que pueda utilizar para ganar dinero.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Leer al menos 30 minutos diarios.",
            "Dedicar tiempo a estudiar sin interrupciones.",
            "Mantener un espacio de lectura separado del consumo de redes y entretenimiento.",
            "Tomar notas de las ideas importantes.",
            "Leer libros completos y no solamente resúmenes.",
            "Reservar tiempo para pensar sin dispositivos.",
            "Estudiar por curiosidad y placer intelectual.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: volver a sentir curiosidad por el mundo y disfrutar de mi propia capacidad de pensar.",
      },
      {
        titulo: "3.3 · Quiero recuperar el control de mi tiempo",
        parrafos: [
          "Quiero decidir cómo utilizo mis días.",
          "Quiero tener tiempo para trabajar, pero también para descansar, aprender, hacer ejercicio, estar con mi familia y disfrutar.",
          "No quiero que cada minuto esté ocupado por una obligación.",
          "Quiero tener margen para improvisar, pasear, leer o simplemente no hacer nada.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Organizar mis días con pocas prioridades.",
            "Reservar espacios de tiempo sin obligaciones.",
            "Proteger las mañanas para las actividades importantes.",
            "Evitar que las interrupciones determinen mi jornada.",
            "Establecer horarios razonables de trabajo.",
            "No llenar automáticamente cualquier hueco libre.",
          ],
        },
        cierre: "Lo que quiero conseguir: sentir que soy dueño de mi tiempo.",
      },
      {
        titulo: "3.4 · Quiero tranquilidad y seguridad económica",
        parrafos: [
          "Quiero tener estabilidad financiera.",
          "Quiero que mis empresas sean sostenibles y que no dependan constantemente de mi esfuerzo personal.",
          "Quiero disponer de ingresos suficientes, una tesorería saludable y capacidad para afrontar imprevistos.",
          "Quiero reducir las deudas, evitar compromisos financieros innecesarios y construir patrimonio.",
          "Quiero dejar de vivir pendiente de los próximos vencimientos y de la siguiente incertidumbre económica.",
          "Pero no quiero conseguirlo a cualquier precio.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Priorizar la rentabilidad y la tesorería frente al crecimiento por apariencia.",
            "No asumir riesgos financieros que no pueda comprender y controlar.",
            "Mantener una planificación económica realista.",
            "Separar las necesidades de la empresa de mis necesidades personales.",
            "Construir ingresos sostenibles y recurrentes.",
            "Evitar negocios que requieran sacrificios desproporcionados.",
            "Tomar decisiones financieras con datos y no desde el miedo.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: que el dinero sea una herramienta para vivir con tranquilidad y libertad, no una preocupación permanente.",
      },
      {
        titulo: "3.5 · Quiero trabajar en proyectos que me aporten valor",
        parrafos: [
          "Quiero seguir desarrollando mi capacidad empresarial y profesional.",
          "Quiero utilizar mi experiencia, mis conocimientos de hostelería, tecnología, gestión y organización para crear valor.",
          "Quiero que FOODAY sea un negocio rentable, profesional y sostenible.",
          "Quiero trabajar con clientes que valoren mi experiencia y que tengan problemas reales que pueda ayudarles a resolver.",
          "Quiero utilizar la inteligencia artificial y la automatización para reducir tareas repetitivas y mejorar la eficiencia, no para llenar mi vida de más tecnología.",
          "Quiero que Sol de Nit funcione correctamente sin depender de que yo esté permanentemente encima de todo.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Priorizar proyectos rentables y estratégicos.",
            "Trabajar con objetivos y resultados medibles.",
            "Delegar y automatizar cuando tenga sentido económico.",
            "Evitar tareas que no aporten valor.",
            "Definir procesos que reduzcan mi dependencia operativa.",
            "Mantener una estructura empresarial compatible con mi vida personal.",
          ],
        },
        cierre: "Lo que quiero conseguir: trabajar mejor, no necesariamente trabajar más.",
      },
      {
        titulo: "3.6 · Quiero cuidar mi cuerpo y sentirme bien físicamente",
        parrafos: [
          "Quiero recuperar una buena condición física.",
          "Quiero alcanzar progresivamente un peso saludable, mejorar mi fuerza, movilidad y resistencia y sentirme cómodo con mi cuerpo.",
          "Quiero tener energía durante el día y evitar que el trabajo y los malos hábitos deterioren mi salud.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Caminar diariamente.",
            "Incorporar entrenamiento de fuerza de forma progresiva.",
            "Mejorar mi alimentación sin recurrir a dietas extremas.",
            "Reducir el consumo habitual de dulces y alimentos poco nutritivos.",
            "Dormir suficientemente.",
            "Realizar los controles médicos necesarios.",
            "Cuidar mi espalda, cuello y movilidad.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: tener salud y energía para disfrutar de mi familia y de mi vida durante muchos años.",
      },
      {
        titulo: "3.7 · Quiero disfrutar de las cosas sencillas",
        parrafos: [
          "Quiero recuperar el placer de las actividades que no necesitan producir ningún resultado.",
          "Quiero disfrutar de un paseo, un café, una conversación, un libro, una comida tranquila o una tarde con mi familia.",
          "Quiero viajar y conocer lugares cuando sea posible.",
          "Quiero tener aficiones que no estén relacionadas con el trabajo.",
          "Quiero poder disfrutar del presente sin estar pensando constantemente en lo que tengo pendiente.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Reservar tiempo para actividades que disfrute.",
            "Hacer planes familiares sin convertirlos en una obligación.",
            "Recuperar aficiones personales.",
            "Disfrutar de momentos sin tecnología.",
            "No convertir todo lo que me gusta en una actividad productiva.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: que mi vida tenga momentos agradables incluso cuando las cosas no vayan perfectamente.",
      },
      {
        titulo: "3.8 · Quiero independencia y libertad",
        parrafos: [
          "Quiero tener capacidad para decidir qué trabajos acepto, con quién colaboro y cómo organizo mi vida.",
          "Quiero que mis empresas me proporcionen libertad y no que se conviertan en una fuente permanente de obligaciones.",
          "Quiero poder desconectar sin miedo a que todo se paralice.",
          "Quiero disponer de recursos económicos y tiempo para tomar decisiones sin sentirme atrapado.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Reducir mi dependencia operativa de Sol de Nit.",
            "Construir ingresos que no dependan exclusivamente de mis horas.",
            "No asumir compromisos que limiten innecesariamente mi libertad.",
            "Mantener capacidad de elección.",
            "Priorizar la sostenibilidad personal y empresarial.",
          ],
        },
        cierre:
          "Lo que quiero conseguir: tener libertad para decidir cómo quiero vivir, no estar obligado a vivir como exigen mis negocios.",
      },
      {
        titulo: "3.9 · Quiero desarrollar mi personalidad y mi confianza",
        parrafos: [
          "Quiero tener más seguridad al comunicar mis ideas, expresar lo que pienso y defender el valor de mi trabajo.",
          "Quiero aprender a relacionarme profesionalmente sin sentir que estoy molestando o que tengo que justificar constantemente mis capacidades.",
          "Quiero ser capaz de establecer límites sin sentirme culpable.",
          "Quiero comunicarme con claridad, sin agresividad y sin necesidad de agradar a todo el mundo.",
        ],
        lista: {
          titulo: "Mis compromisos",
          items: [
            "Expresar mis necesidades y expectativas.",
            "Aprender a decir que no.",
            "Defender mis intereses con educación y firmeza.",
            "No evitar conversaciones importantes por incomodidad.",
            "No buscar constantemente la aprobación de los demás.",
            "Aceptar que algunas personas no estarán de acuerdo conmigo.",
          ],
        },
        cierre: "Lo que quiero conseguir: actuar con seguridad, coherencia y tranquilidad.",
      },
    ],
  },

  // ── 4. Límites no negociables ───────────────────────────────────────────
  {
    num: "4",
    titulo: "Mis límites no negociables",
    intro: [
      "Estas son las reglas que deben orientar mis decisiones incluso cuando aparezcan oportunidades, dificultades o momentos de incertidumbre.",
    ],
    tablas: [
      {
        columnas: ["Área", "Mi límite"],
        filas: [
          ["Familia", "No sacrificar sistemáticamente el tiempo con mi familia por trabajo."],
          ["Móvil", "No permitir que el consumo digital controle mi atención."],
          ["Trabajo", "No trabajar permanentemente fuera de horarios razonables."],
          ["Salud", "No sacrificar mi bienestar físico y mental por una empresa."],
          ["Dinero", "No tomar decisiones financieras importantes desde el miedo."],
          ["Proyectos", "No mantener demasiados frentes abiertos."],
          ["Clientes", "No regalar mi experiencia ni aceptar condiciones abusivas."],
          ["Relaciones", "No asumir responsabilidades que corresponden a otros."],
          ["Aprendizaje", "No abandonar mi desarrollo intelectual."],
          ["Descanso", "No sentir culpabilidad por descansar."],
          ["Tiempo", "No llenar todos mis espacios libres con obligaciones."],
          ["Crecimiento", "No sacrificar mi vida actual por una hipotética vida mejor en el futuro."],
        ],
      },
    ],
  },

  // ── 5. Cómo organizar mi vida ────────────────────────────────────────────
  {
    num: "5",
    titulo: "Cómo quiero organizar mi vida",
    intro: [
      "No quiero un sistema de productividad complejo. Quiero una estructura sencilla que me ayude a mantener el equilibrio.",
    ],
    listas: [
      {
        titulo: "Mis prioridades diarias",
        items: [
          "Familia y bienestar: estar presente y cuidar mi salud.",
          "Trabajo importante: avanzar en una tarea que realmente importe.",
          "Desarrollo personal: leer, estudiar o aprender.",
          "Descanso: tener tiempo libre sin obligaciones.",
        ],
      },
      {
        titulo: "Mi regla de trabajo · cada día identificaré",
        items: [
          "Una tarea verdaderamente importante.",
          "Las obligaciones que no puedo aplazar.",
          "Las tareas secundarias que puedo realizar si tengo tiempo.",
        ],
      },
    ],
    tablas: [
      {
        titulo: "Mi estructura diaria de referencia",
        columnas: ["Momento", "Prioridad"],
        filas: [
          ["Al despertar", "Evitar el móvil y comenzar el día tranquilamente."],
          ["Mañana", "Trabajo de concentración y tarea prioritaria."],
          ["Mediodía", "Alimentación, descanso y movimiento."],
          ["Tarde", "Trabajo operativo, gestiones o actividades necesarias."],
          ["Final de jornada", "Desconexión profesional."],
          ["Noche", "Familia, lectura y descanso."],
        ],
      },
    ],
    cierre: [
      "Esta estructura debe adaptarse a los horarios reales de Sol de Nit y a las necesidades familiares, sin convertirse en otra fuente de presión.",
    ],
  },

  // ── 6. Cómo tomaré decisiones ────────────────────────────────────────────
  {
    num: "6",
    titulo: "Cómo tomaré decisiones a partir de ahora",
    intro: [
      "Antes de aceptar un compromiso, comenzar un proyecto o dedicar una cantidad importante de tiempo a algo, quiero hacerme estas preguntas:",
    ],
    listas: [
      {
        titulo: "Las 8 preguntas",
        items: [
          "¿Esto contribuye realmente a la vida que quiero?",
          "¿Qué voy a tener que sacrificar para hacerlo?",
          "¿Es responsabilidad mía?",
          "¿Tiene un beneficio real o solamente me mantiene ocupado?",
          "¿Estoy decidiendo desde la tranquilidad o desde el miedo?",
          "¿Puedo conseguir un resultado parecido con menos esfuerzo?",
          "¿Me acerca a la libertad o me genera una nueva dependencia?",
          "¿Qué consecuencias tendrá para mi familia, mi salud y mi tiempo?",
        ],
      },
    ],
    cierre: [
      "Si una oportunidad económica me obliga a sacrificar permanentemente mi salud, mi familia y mi tranquilidad, probablemente no sea una buena oportunidad.",
      "Si un proyecto es interesante, pero no tengo capacidad para atenderlo, puedo aplazarlo.",
      "Si un problema no depende de mí, puedo establecer un seguimiento y dejar de dedicarle atención constantemente.",
      "Si una decisión es suficientemente buena, puedo ejecutarla sin seguir buscando alternativas.",
    ],
  },

  // ── 7. Señales de alerta ─────────────────────────────────────────────────
  {
    num: "7",
    titulo: "Mis señales de alerta",
    intro: [
      "Quiero aprender a reconocer cuándo estoy volviendo a una dinámica que no deseo.",
    ],
    tablas: [
      {
        columnas: ["Señal", "Qué significa", "Qué debo hacer"],
        filas: [
          [
            "Paso horas con el móvil",
            "Estoy perdiendo el control de mi atención.",
            "Alejar el teléfono y recuperar una actividad concreta.",
          ],
          [
            "No consigo empezar a trabajar",
            "Puede haber bloqueo, saturación o dificultad de concentración.",
            "Reducir la tarea al primer paso y comenzar con poco.",
          ],
          [
            "Abro nuevos proyectos",
            "Estoy dispersándome.",
            "Volver a mis prioridades actuales.",
          ],
          [
            "Pienso constantemente en deudas",
            "Estoy entrando en un ciclo de preocupación.",
            "Anotar el siguiente paso y establecer cuándo atenderlo.",
          ],
          [
            "Trabajo hasta tarde",
            "Estoy perdiendo mis límites.",
            "Cerrar la jornada y revisar la organización.",
          ],
          [
            "No leo ni aprendo",
            "Estoy abandonando mi desarrollo personal.",
            "Recuperar 30 minutos de lectura.",
          ],
          [
            "Estoy irritable con mi familia",
            "Mi vida está absorbiendo demasiado espacio mental.",
            "Desconectar y recuperar tiempo de calidad.",
          ],
          [
            "No hago ejercicio",
            "Estoy descuidando mi salud.",
            "Empezar con movimiento sencillo.",
          ],
          [
            "Reviso una decisión muchas veces",
            "Estoy buscando una certeza imposible.",
            "Revisar si existe información nueva y decidir.",
          ],
          [
            "Me siento culpable al descansar",
            "Estoy identificando mi valor con mi productividad.",
            "Recordar que descansar también forma parte de mis prioridades.",
          ],
        ],
      },
    ],
  },

  // ── 8. Compromiso 90 días ────────────────────────────────────────────────
  {
    num: "8",
    titulo: "Mi compromiso para los próximos 90 días",
    intro: [
      "No voy a intentar transformar todos los aspectos de mi vida simultáneamente.",
      "Quiero empezar por recuperar el control de las áreas que más condicionan mi bienestar.",
    ],
    listas: [
      {
        titulo: "Primer mes · Recuperar el control",
        items: [
          "Reducir drásticamente el uso improductivo del móvil.",
          "Recuperar una rutina diaria de lectura.",
          "Establecer horarios de trabajo y desconexión.",
          "Identificar una tarea prioritaria al día.",
          "Dedicar tiempo diario de calidad a mi familia.",
          "Caminar y recuperar progresivamente la actividad física.",
        ],
      },
      {
        titulo: "Segundo mes · Consolidar hábitos",
        items: [
          "Mantener el control del móvil.",
          "Mejorar la alimentación y el descanso.",
          "Establecer una estructura semanal de trabajo.",
          "Reducir proyectos y tareas innecesarias.",
          "Avanzar en la sostenibilidad de mis negocios.",
          "Mantener espacios de aprendizaje y ocio.",
        ],
      },
      {
        titulo: "Tercer mes · Construir libertad",
        items: [
          "Evaluar qué responsabilidades puedo delegar.",
          "Identificar actividades que generan ingresos sin consumir todo mi tiempo.",
          "Mejorar la organización financiera.",
          "Consolidar mis hábitos de salud.",
          "Recuperar aficiones y actividades personales.",
          "Revisar si mi vida está siendo más equilibrada.",
        ],
      },
    ],
  },

  // ── 9. Cómo mediré ──────────────────────────────────────────────────────
  {
    num: "9",
    titulo: "Cómo mediré si mi vida está mejorando",
    intro: [
      "No quiero medir mi progreso exclusivamente por el dinero, los proyectos terminados o las horas trabajadas.",
      "Quiero medirlo por la calidad de mi vida.",
      "Cada semana revisaré:",
    ],
    listas: [
      {
        titulo: "Mis 9 preguntas semanales",
        items: [
          "¿He estado realmente presente con mi familia?",
          "¿He controlado el uso del móvil?",
          "¿He conseguido concentrarme y avanzar?",
          "¿He leído y aprendido algo?",
          "¿He cuidado mi salud?",
          "¿He tenido tiempo para descansar?",
          "¿He dedicado menos tiempo a preocupación improductivas?",
          "¿Estoy construyendo estabilidad económica?",
          "¿He disfrutado de algún momento sin pensar en obligaciones?",
        ],
      },
    ],
    cierre: [
      "No necesito obtener una puntuación perfecta. Necesito comprobar que avanzo en la dirección correcta.",
    ],
  },

  // ── 10. Declaración personal ────────────────────────────────────────────
  {
    num: "10",
    titulo: "Mi declaración personal",
    intro: [
      "Quiero dejar de vivir permanentemente condicionado por las obligaciones, las preocupaciones y las expectativas.",
      "Quiero recuperar mi capacidad de concentración, mi curiosidad intelectual y mi ilusión por aprender.",
      "Quiero disfrutar de María y Abril, participar en la vida de mi hija y construir recuerdos con ellas.",
      "Quiero tener una buena salud, cuidar mi cuerpo y disponer de energía.",
      "Quiero que mis empresas sean rentables, pero que trabajen para mi vida y no que mi vida trabaje exclusivamente para ellas.",
      "Quiero tener tranquilidad económica, libertad de decisión y tiempo para hacer cosas que me gustan.",
      "Quiero seguir creciendo profesional e intelectualmente, pero sin sentir que nunca es suficiente.",
      "Quiero aprender a decir que no, establecer límites y dejar de responsabilizarme de todo.",
      "Quiero ser una persona que piensa, decide y actúa, no alguien que pasa el día preocupado por lo que debería hacer.",
      "Quiero disfrutar del presente sin renunciar a construir mi futuro.",
      "Y, sobre todo, quiero recordar que no tengo que esperar a resolver todos mis problemas para empezar a vivir.",
    ],
    cierre: [
      "Mi principio fundamental: no voy a sacrificar mi salud, mi familia, mi tranquilidad ni mi libertad para conseguir una vida mejor en el futuro. Quiero construir ese futuro sin dejar de disfrutar de mi vida en el presente.",
      "Este documento no es una lista de exigencias. Es una referencia para volver a ella cuando pierda el rumbo, cuando aparezcan nuevas obligaciones o cuando vuelva a caer en hábitos que no quiero mantener.",
      "No necesito cumplirlo perfectamente. Necesito ser coherente con él cada vez más a menudo.",
    ],
  },
];

/** Ancla de cada sección (para el índice y los enlaces internos). */
export function marcoAnchor(seccion: MarcoSeccion): string {
  return `marco-${seccion.num}`;
}
