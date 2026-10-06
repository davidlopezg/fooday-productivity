"use client";

import Link from "next/link";
import { IconArrowLeft, IconCheck } from "@/components/icons";

// ============================================================================
// /docs — Los 5 pilares que sustentan fooday·productivity.
// Esta es la "brújula" del sistema: cada pantalla de la app está pensada
// para reforzar uno o varios de estos principios. Si una feature no
// contribuye a ninguno, probablemente no debería existir.
//
// Los textos contextuales por pantalla viven en
// `src/components/HelpDrawer.tsx` (mapa AYUDA_POR_RUTA) — un solo sitio
// para mantener toda la metodología.
// ============================================================================

type Punto = { titulo: string; cuerpo: string };

type Pilar = {
  num: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  titulo: string;
  resumen: string;
  puntos: Punto[];
};

const PILARES: Pilar[] = [
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

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a Hoy
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Metodología · Los 5 pilares
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Para formar parte del reducido porcentaje de personas que logran
          concretar consistentemente todo lo que se proponen, la evidencia
          científica y las investigaciones sobre rendimiento, psicología y
          autorregulación demuestran que el éxito no proviene de la fuerza
          de voluntad bruta ni de estar ocupado constantemente, sino de
          estructurar <strong className="text-foreground">sistemas de enfoque,
          autorregulación y hábitos sostenibles</strong>.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Esta página resume los 5 pilares que sustentan cada pantalla de la
          app. Si una feature no contribuye a ninguno, no debería existir.
          Cada botón "Por qué existe esto" en las pantallas apunta aquí.
        </p>
      </header>

      {PILARES.map((p) => (
        <section
          key={p.num}
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <header className="mb-4 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              {p.emoji}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pilar {p.num}
              </div>
              <h2 className="mt-0.5 text-xl font-bold tracking-tight">
                {p.titulo}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p.resumen}
              </p>
            </div>
          </header>

          <div className="space-y-4">
            {p.puntos.map((pt, i) => (
              <article
                key={i}
                className="rounded-lg border border-border bg-background p-4"
              >
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  {pt.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {pt.cuerpo}
                </p>
              </article>
            ))}
          </div>

          <AplicacionEnApp pilar={p.num} />
        </section>
      ))}

      {/* =====================================================================
          Apéndice · Evidencia científica sobre bloques de enfoque profundo
          Respaldo cuantitativo y experimental a los pilares 1, 3 y 5.
         ===================================================================== */}
      <section className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-sky-500/5 p-6 sm:p-8">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Apéndice · Evidencia científica
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Por qué ~4 horas de enfoque profundo superan a 16 horas de trabajo fragmentado
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Aunque tus fuentes{" "}
            <strong>no contienen un estudio estadístico específico sobre el "1% de los autónomos más ricos del mundo"</strong>,
            sí ofrecen abundante evidencia científica (incluyendo experimentos de neurociencia,
            psicología del rendimiento y un metaanálisis cuantitativo masivo) que demuestra por
            qué trabajar en{" "}
            <strong>bloques reducidos de alta concentración (alrededor de 4 horas diarias)</strong>{" "}
            es inmensamente más efectivo y productivo que vivir estresado trabajando jornadas de
            16 horas [1-3].
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A continuación se detallan los hallazgos clave extraídos de tus fuentes:
          </p>
        </header>

        <hr className="my-6 border-border" />

        {/* ── 1. Límite cognitivo ── */}
        <h3 className="text-base font-semibold">
          1. El límite cognitivo del cerebro (~4 horas de enfoque profundo)
        </h3>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Límite biológico de la concentración</strong>: Las investigaciones sobre
              rendimiento experto de K. Anders Ericsson revelan que la capacidad del cerebro para
              sostener un trabajo cognitivamente exigente (trabajo profundo) tiene un límite de{" "}
              <strong>máximo 4 horas diarias</strong> en personas altamente entrenadas (y
              alrededor de 1 hora en principiantes) [2, 4, 5]. Intentar forzar más horas de
              concentración intensa produce rendimientos decrecientes drásticos [4, 6].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <strong>La fórmula del rendimiento de élite</strong>: La producción de alto valor
              no depende del tiempo total sentado, sino de la intensidad:
              <div className="my-3 rounded-lg border border-emerald-500/30 bg-background/80 px-4 py-3 text-center font-mono text-sm">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Trabajo de Alta Calidad Producido
                </span>
                {" = ("}
                <span className="font-semibold">Tiempo Invertido</span>
                {") × ("}
                <span className="font-semibold">Intensidad de Enfoque</span>
                {")"}
              </div>
              Un profesional que concentra su energía en 4 horas de enfoque total produce más y
              mejor resultado que quien diluye 16 horas en un estado de semi-distracción [7-9].
            </div>
          </li>
        </ul>

        {/* ── 2. Costo cognitivo ── */}
        <h3 className="mt-6 text-base font-semibold">
          2. El costo cognitivo de las jornadas de 16 horas (Trabajo superficial y disperso)
        </h3>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Residuo de atención</strong>: Los experimentos de la investigadora Sophie
              Leroy demuestran que al cambiar constantemente entre tareas o responder mensajes
              mientras se trabaja (típico de las jornadas de 16 horas saturadas de emails e
              interrupciones), la atención no se traslada de inmediato. Queda un{" "}
              <strong>"residuo de atención"</strong> pegado a la tarea anterior que degrada
              gravemente el rendimiento en la siguiente actividad [10-13].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>El "impuesto" del cambio de contexto</strong>: Shiftear continuamente entre
              tareas principales y tareas secundarias puede consumir hasta un{" "}
              <strong>40% del tiempo productivo</strong> en puras pérdidas de tracción mental
              [14].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Estar ocupado no es producir valor</strong>: En el trabajo del conocimiento,
              la "ocupación visible" (<em>busyness as a proxy for productivity</em>) imita la
              productividad industrial de fábrica, pero genera muy poco valor real [15, 16].
              Además, agota la fuerza de voluntad, que funciona como un recurso biológico finito
              que se degrada con el uso continuo [17].
            </span>
          </li>
        </ul>

        {/* ── 3. Metaanálisis PLOS ONE ── */}
        <h3 className="mt-6 text-base font-semibold">
          3. Metaanálisis científico sobre gestión del tiempo y bienestar (PLOS ONE)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Un metaanálisis de <strong>158 estudios científicos con 53,957 participantes</strong>{" "}
          (realizado por Aeon et al.) evaluó cuantitativamente el impacto de estructurar y
          proteger el tiempo [3, 18, 19]:
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Rendimiento laboral</strong>: Estructurar el día y proteger los bloques de
              enfoque se relaciona de forma sólida y positiva con un mejor rendimiento en el
              trabajo (<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">r = 0.259</code>)
              y una reducción directa del estrés psicológico [20, 21].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Impacto superior en el bienestar</strong>: La gestión estructurada del
              tiempo tiene un impacto <strong>aún más fuerte en la satisfacción con la vida</strong>
              {" "}(<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">r = 0.426</code>)
              {" "}<strong>que en la sola productividad</strong> [22, 23]. Esto desmiente la idea de
              que trabajar hasta el agotamiento sea la vía para destacar, demostrando que la
              organización del tiempo protege contra el distrés psicológico y la ansiedad
              [21, 24, 25].
            </span>
          </li>
        </ul>

        {/* ── 4. Shutdown / Desconexión ── */}
        <h3 className="mt-6 text-base font-semibold">
          4. La necesidad de la desconexión total (<em>Shutdown</em>)
        </h3>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Teoría de Restauración de la Atención (ART)</strong>: La concentración
              requiere "atención dirigida", un recurso mental limitado [26]. Desconectar
              completamente del trabajo al final de la jornada permite que los centros de atención
              se recarguen, garantizando la energía mental para rendir al máximo al día siguiente
              [27-29].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Efecto Zeigarnik y mente inconsciente</strong>: Desconectar mediante un plan
              explícito al final del día libera la carga cognitiva y permite que la mente
              inconsciente procese problemas complejos durante el descanso sin la interferencia
              del estrés [27, 30, 31].
            </span>
          </li>
        </ul>

        {/* ── 5. Casos de élite ── */}
        <h3 className="mt-6 text-base font-semibold">
          5. Resultados de élite documentados con bloques de enfoque
        </h3>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>
              <strong>Casos académicos y profesionales de alto rendimiento</strong>: Casos
              documentados en la literatura académica —como el del profesor Adam Grant en Wharton o
              la investigadora Radhika Nagpal en Harvard— demuestran que fijar límites estrictos
              de horario y trabajar en bloques consolidados de trabajo profundo permitió{" "}
              <strong>duplicar y triplicar su producción de resultados de élite</strong> en
              comparación con colegas que trabajaban 12 o 16 horas diarias de forma fragmentada
              [1, 32-35].
            </span>
          </li>
        </ul>

        <hr className="my-6 border-border" />

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium leading-relaxed text-emerald-700 dark:text-emerald-300">
            🧠 ¿Quieres que analicemos cómo estructurar una rutina diaria de 4 bloques de
            enfoque adaptada específicamente a tu actividad como autónomo?
          </p>
        </div>
      </section>

      {/* =====================================================================
          Apéndice · Implementación práctica del Productivity Stack
          Cómo encajan las micro-tareas operativas con los bloques de foco.
         ===================================================================== */}
      <section className="rounded-2xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-violet-500/5 p-6 sm:p-8">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            Apéndice · Implementación práctica
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            El Productivity Stack: cómo encajan las micro-tareas con los bloques de foco
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Integrar la alta concentración con las tareas operativas diarias es una de las
            mayores dudas al implementar este sistema. Las fuentes sobre rendimiento y gestión
            del tiempo ofrecen soluciones concretas para ambos casos:
          </p>
        </header>

        <hr className="my-6 border-border" />

        {/* ── 1. Loteado de micro-tareas ── */}
        <h3 className="text-base font-semibold">
          1. ¿Dónde van las 20 micro-tareas de 10 minutos? (Loteado de trabajo superficial)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Si dispersas 20 micro-tareas de 10 minutos a lo largo del día intercalándolas con tus
          bloques de foco, tu cerebro nunca alcanzará la máxima concentración [1, 2]. Cada
          cambio de tarea genera <strong>"residuo de atención"</strong> (<em>attention residue</em>),
          haciendo que la mente siga procesando la tarea anterior y perdiendo hasta un{" "}
          <strong>40% del tiempo en puras pérdidas de tracción mental</strong> [2, 3].
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La estrategia respaldada por los investigadores para gestionar estas tareas es la
          siguiente:
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            <span>
              <strong>Agrupamiento en lotes (<em>Batching</em>)</strong>: En lugar de atender las
              tareas operativas a medida que surgen, agrúpalas todas en un sistema de captura
              externo (una lista de tareas o base de datos estilo GTD) para liberar tu mente de
              recordatorios constantes [4, 5].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            <span>
              <strong>Bloques de trabajo superficial (<em>Task / Shallow Work Blocks</em>)</strong>:
              Reserva 1 o 2 bloques en tu calendario al día (por ejemplo, de 60 a 90 minutos al
              final de la mañana o de la tarde) dedicados <strong>exclusivamente a procesar esas
              micro-tareas en lote</strong> [6, 7]. Durante ese bloque operativo, ejecutas una
              tarea tras otra de forma continua [7].
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
            <span>
              <strong>Presupuesto de trabajo superficial</strong>: La investigación sugiere
              definir un "presupuesto" diario para lo administrativo (habitualmente entre un{" "}
              <strong>30% y un 50% de tu jornada</strong>), protegiendo el resto del tiempo para
              tus 4 bloques de foco profundo [8, 9].
            </span>
          </li>
        </ul>

        {/* ── 2. Tarea incompleta ── */}
        <h3 className="mt-6 text-base font-semibold">
          2. ¿Qué hacer si la tarea requiere más tiempo y queda a medias?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dejar una tarea incompleta suele generar ansiedad debido al{" "}
          <strong>efecto Zeigarnik</strong>, que es la tendencia del cerebro a mantener "bucles
          abiertos" y seguir pensando en lo que no ha terminado [4, 10]. Sin embargo, la ciencia
          demuestra que <strong>no necesitas terminar la tarea para liberar tu mente</strong>,
          solo necesitas gestionarla correctamente [4, 11].
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cuando se acaba el tiempo del bloque y la tarea no está terminada, debes aplicar estos
          tres pasos:
        </p>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              1
            </span>
            <span>
              <strong>Anotar la "siguiente acción física"</strong>: Antes de cerrar el bloque,
              escribe exactamente en qué punto te quedaste y cuál es la siguiente acción concreta
              que debes realizar para reanudarla [11, 12].
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              2
            </span>
            <span>
              <strong>Asignarle un nuevo bloque en el calendario</strong>: Los estudios de
              Masicampo y Baumeister demostraron que crear un plan concreto de cuándo se
              completará un objetivo pendiente elimina el efecto Zeigarnik y libera por completo
              la carga cognitiva del cerebro [4, 11].
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              3
            </span>
            <span>
              <strong>
                Usar bloques condicionales de desbordamiento (<em>Overflow Blocks</em>)
              </strong>
              : Al planificar tu agenda, es recomendable dejar bloques de amortiguación o
              desbordamiento al final de la jornada [13]. Si una tarea principal requiere más
              tiempo del previsto, usas el bloque de desbordamiento para continuarla sin alterar
              el resto de tus compromisos [13].
            </span>
          </li>
        </ol>

        {/* ── 3. Productivity Stack ── */}
        <h3 className="mt-6 text-base font-semibold">
          🧩 La combinación perfecta (El "Productivity Stack")
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Para que el sistema funcione sin fricción, las fuentes recomiendan conectar tres capas
          [5]:
        </p>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              1
            </span>
            <span>
              <strong>GTD (Base de datos)</strong>: Vacía tu cabeza y registra las 20
              micro-tareas [4, 5].
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              2
            </span>
            <span>
              <strong>Bloques de tiempo (Calendario)</strong>: Define cuándo harás los 4 bloques
              de foco y cuándo procesarás las tareas operativas [14].
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-700 dark:text-sky-300">
              3
            </span>
            <span>
              <strong>Sprints / Pomodoro (Motor de ejecución)</strong>: Dentro de cada bloque,
              trabaja en sprints sin distracciones para mantener el ritmo sin agotarte [15, 16].
            </span>
          </li>
        </ol>
      </section>

      <footer className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        ¿Falta algo? Cada botón "Por qué existe esto" en las pantallas de la
        app apunta a esta página. La metodología no es dogma: si algo no
        te funciona, ajústalo — pero registra el cambio para no perder el
        aprendizaje.
      </footer>
    </div>
  );
}

function AplicacionEnApp({ pilar }: { pilar: 1 | 2 | 3 | 4 | 5 }) {
  const items: Record<number, string[]> = {
    1: [
      "Pre-flight checklist antes de cada pomodoro (/focus)",
      "PomodoroWidget flotante que protege el foco en cualquier ruta",
      "Tiempo × Intensidad: minutos de foco rastreados en /informes",
    ],
    2: [
      "Scorecard de KRs con proyección lineal (/metas/plan)",
      "Semáforo verde/amarillo/rojo en planes diarios",
      "Estados de meta (sin_empezar → en_progreso → completada) con feedback visible",
    ],
    3: [
      "Time-blocking con 4 bloques fijos por día (/calendario)",
      "Auditoría 20/80 en el Estatus Diario",
      "Motor de priorización con IA que devuelve 1 sola acción (<45 min)",
    ],
    4: [
      "9 hábitos diarios con score 0-100 y racha (/estatus)",
      "Captura / Inbox para vaciar la cabeza (/captura)",
      "Micro-acción priorizada para mañana basada en patrón semanal",
    ],
    5: [
      "Límite de 4 bloques/día en el calendario (señal visual)",
      "Cierre cognitivo de 5 preguntas en el Estatus Diario",
      "Dashboard emocional que detecta semanas en rojo antes de quebrar",
    ],
  };
  const ejemplos = items[pilar] ?? [];
  return (
    <div className="mt-5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        Cómo se aplica en fooday·productivity
      </h4>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {ejemplos.map((ej, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-violet-500">·</span>
            <span>{ej}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}