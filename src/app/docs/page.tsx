"use client";

import Link from "next/link";
import { IconArrowLeft, IconCheck, IconTarget } from "@/components/icons";

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
// Índice de features documentadas (para la sección "Meta · Índice" de abajo).
// Mantener en sincronía con /src/app/ — cualquier ruta nueva debe aparecer
// aquí con su propósito y la sección de la doc que la explica.
// ----------------------------------------------------------------------------
const FEATURES: Array<{ ruta: string; proposito: string; docs: string }> = [
  // ── Núcleo diario ──
  { ruta: "/", proposito: "Hoy: semáforo del día + plan diario + contadores + paneles WIGs (metas + tareas) + panel ‘Tareas con fecha’ (orden ascendente por deadline, las vencidas arriba) entre WIGs-tareas y Plan de hoy, con check inline para marcarlas hechas sin navegar", docs: "Rituales §1 (mañana 1ª hora) · HelpDrawer" },
  { ruta: "/captura", proposito: "Inbox rápido para vaciar la cabeza (efecto Zeigarnik)", docs: "Pilar 4 · Rituales §1 · HelpDrawer" },
  { ruta: "/estatus", proposito: "9 hábitos + auditoría 20/80 + cierre cognitivo", docs: "Pilar 4 · Rituales §1 (final del día) · HelpDrawer" },
  { ruta: "/estatus/nuevo", proposito: "Crear nueva entrada de Estatus (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/editar", proposito: "Editar entrada existente (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/ver", proposito: "Ver una entrada en detalle (racha + micro-acción)", docs: "Sub-ruta de /estatus" },

  // ── Tareas y GTD ──
  { ruta: "/tareas", proposito: "Tareas pendientes: marcar hechas, adjuntos, asignar a meta/KR + panel WIGs (foco del ciclo) + toggle ⏳ pendiente de respuesta por fila", docs: "Pilar 2 · WIGs §3 (cap de ejecución) · Pilar 4 (sección “Pendientes de respuesta”) · HelpDrawer" },
  { ruta: "/tareas/inbox", proposito: "Triaje residual: tareas sin meta o sin KR (después de asignar al crear)", docs: "HelpDrawer" },
  { ruta: "/tareas/pendientes-respuesta", proposito: "Panel dedicado a tareas con el flag “pendiente de respuesta” (esperando a alguien). Ordenadas por antigüedad: lo que más tiempo lleva esperando primero. Botón para destildar cuando llega la respuesta", docs: "Pilar 4 (sección “Pendientes de respuesta”) · HelpDrawer" },
  { ruta: "/tareas/completadas", proposito: "Histórico de tareas hechas (7/30/90/365/todo)", docs: "HelpDrawer" },

  // ── Trabajo profundo ──
  { ruta: "/focus", proposito: "Pomodoro + pre-flight check + post-focus", docs: "Pilar 1 · Productivity Stack · Rituales §1 · HelpDrawer" },
  { ruta: "/calendario", proposito: "Time-blocking: 4 bloques fijos × 7 días", docs: "Pilar 3 · Rituales §1 (mañana) · HelpDrawer" },

  // ── Metas y planificación ──
  { ruta: "/metas", proposito: "Cards de metas con estado y progreso + botones Archivar/Editar/WIG/Eliminar + IA Sugerir WIGs + filtro Archivadas + EditarMetaModal con botón IA Generar plan. El botón Eliminar muestra preview del impacto (cuántos KRs y tareas quedarán huérfanos) antes de borrar — aprovecha el ON DELETE SET NULL/CASCADE de migration 0001 para que las tareas sigan vivas sin meta", docs: "Pilar 2 · Ritual mensual · HelpDrawer" },
  { ruta: "/metas/nueva", proposito: "Crear meta con rango real [inicio, fin] + botón IA Generar plan (KRs+tareas+hábitos) que reparte los KRs SOLO dentro del rango. Hard constraint opcional 🔒", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/agente", proposito: "Agente IA: contexto libre → meta + plan trimestral completo (atajo directo a meta; la entrada unificada es /agente)", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/agente", proposito: "Agente unificado: clasifica la idea (proyecto/meta/captura) y propone estructura. Bucle de aplicación con 2 pases + árbitro adversarial que verifica que el 100% de las metas hijas se persistan en Supabase antes de redirigir; si hay gap muestra panel con nombres faltantes y motivo del error. Fase 2 automática: tras crear metas+KRs iniciales, genera el plan completo (KRs+tareas+hábitos) por meta con generarPlanMetaIA + aplicarKrsYTareasEnMeta. Pre-bucle: getSession() para evitar fallo de RLS por JWT transitorio + backoff de 50ms entre inserts. Detección de PGRST303 (reloj desincronizado) con banner en AppShell + panel diagnóstico. migration 0024", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/auditoria", proposito: "Auditoría de metas: qué les falta (área, proyecto, fecha objetivo, contexto, KRs). migration 0024", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/detalle", proposito: "Detalle de una meta con sus KRs (uno o varios por trimestre/mes) + tareas por KR + botones Editar/✨ Generar plan con IA (KRs+tareas+hábitos, respeta KRs existentes por título) + Archivar + WIG + asignar tareas del inbox. Migration 0028: ya no hay UNIQUE por (meta, trimestre) — puedes tener N KRs en el mismo trimestre.", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/plan", proposito: "Plan trimestral con scorecard de KRs + proyección", docs: "Pilar 2 · Ritual semanal (domingo) · Ritual mensual · HelpDrawer" },
  { ruta: "/plan-diario", proposito: "Estado emocional + plan diario generado por IA. El prompt recibe los KRs en foco de la semana (migration 0033) y ancla los bloques del día a esos resultados medibles; si no hay foco elegido, el día se planifica igual por compromiso y deadline (el foco semanal nunca bloquea el día)", docs: "Rituales §1 (mañana) · HelpDrawer" },
  { ruta: "/plan-diario/detalle", proposito: "Detalle de un plan con notas e informe", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/plan-diario/historico", proposito: "Histórico de planes (7/30/90/365/todo)", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/semana", proposito: "Pipeline semanal con drag & drop + IA 3 críticas/día + PANEL DE FOCO SEMANAL DE KRs (máx 3, migration 0033): los resultados medibles en los que pones horas esta semana, con scorecard y ✨ Sugerir 3 KRs por IA. El trimestre NO se sustituye (sigue diciendo cuándo se entrega); la semana dice dónde pones el esfuerzo. Solo entran KRs con entrega en marcha (regla de contención, aplicada en BD). La propuesta IA de tareas ahora prioriza las ancladas a los KRs en foco", docs: "Ritual semanal (domingo noche) · HelpDrawer" },
  { ruta: "/pipeline", proposito: "Kanban por prioridad + motor IA de priorización", docs: "Ritual semanal (miércoles) · HelpDrawer" },
  { ruta: "/matriz", proposito: "Matriz Eisenhower 2D (urgencia × importancia) de tareas activas. Drag & drop entre cuadrantes (dnd-kit/core) + botón IA “✨ Sugerir redistribución” que propone mover las tareas desubicadas al cuadrante correcto (módulo IA en src/lib/tareas/sugerirMatrizIA.ts). Sin migración: la clasificación se calcula en cada render desde fecha_fin + meta.es_wig; aplicar cambios solo escribe `prioridad`. Filtros: solo WIGs-meta / solo con fecha. Complemento visual de /pipeline (1D) — la matriz es 2D", docs: "Pilar 4 · HelpDrawer" },

  // ── Revisión y análisis ──
  { ruta: "/informes", proposito: "KPIs (incluye subtareas) + heatmap de actividad + chart de tareas y subtareas por día/semana + proyectos con conteo + metas y OKRs cerrados + comparación con plan vs sin plan", docs: "Ritual semanal (viernes) · Ritual mensual · HelpDrawer" },
  { ruta: "/dashboard-emocional", proposito: "4 dimensiones: despertar / mente / cuerpo / rueda", docs: "Pilar 4 · HelpDrawer" },

  // ── Identidad y horizonte ──
  { ruta: "/norte", proposito: "Propósito, valores y visión (la brújula)", docs: "Pilar 2 · Ritual diario (despertar) · Ritual mensual · HelpDrawer" },
  { ruta: "/areas", proposito: "Áreas de responsabilidad (ámbitos continuos sin fecha de cierre). CRUD + listado de proyectos hijos por área + sección 'Sin área' para huérfanos. Migración 0001 (la tabla ya existía; aquí se le da página propia estilo /proyectos). Icono IconLayers. Reordenado en el sidebar Estrategia (posición 2, entre Norte y Proyectos)", docs: "Pilar 2 · HelpDrawer" },

  // ── Sistema ──
  { ruta: "/pagos", proposito: "Pagos pendientes: ejecutar tesorería lunes 1ª hora + botón IA “✨ Sugerir pagos” (migration 0027) que analiza los pagos activos y propone programación para los próximos 6 lunes aplicando el prompt editable en /configuracion (snowball por defecto, ingresos viernes/sábado). Modal de revisión estilo SugerirWigs: la IA sugiere, tú marcas qué incluir, botón “Aplicar N marcadas” actualiza solo fecha_pago_programada y estado=programado (no registra pagos parciales). Prompt editable en /configuracion §Prompt de pagos (columna prompt_pagos)", docs: "Apéndice §Bucle de equilibrio · Ritual semanal (lunes estricto) · HelpDrawer" },
  { ruta: "/proyectos", proposito: "Gestión de proyectos con conteo de tareas, listado de metas hijas (migration 0024), archivado en cascada a metas+tareas, confirm con preview de impacto al eliminar, botón Editar (modal ligero con nombre/color/descripción/área), exportación a PDF por proyecto (modal con vista previa + Imprimir a PDF nativo del navegador, sin librerías externas). Al pulsar 'ver' se navega a /tareas?proyecto=X y se abre el filtro en 'todas' (no 'activas') para que las tareas hechas/archivadas del mismo proyecto sean visibles, especialmente en proyectos ya cerrados o arrastrados. Sección ámbar final con metas sin proyecto asignado (huérfanas, patrón simétrico a /areas → proyectos sin área) para que David no las pierda — archivadas ocultas, y cada huérfana trae un botón Eliminar con preview de impacto (las tareas no se borran, solo se desvinculan de la meta gracias a ON DELETE SET NULL)", docs: "HelpDrawer" },
  { ruta: "/escenarios", proposito: "Escenarios de proyecto: las 3 dimensiones separadas — CONTEXTO (cronología append-only de hechos, tipada como contexto/estado/situación), ESTADO (el presente MEDIDO, calculado de las tareas en cada render, sin tabla que se pudra) y SITUACIÓN (el presente interpretado: nota manual + la lectura de la IA). Botón “✨ Analizar escenarios” que pide a la IA los escenarios del proyecto agrupados por categoría (riesgos / oportunidades / puntos ciegos / wildcard), cada uno con probabilidad (dato secundario), estrategia accionable, justificación e indicador de validación; el más probable sale destacado. Historial de todos los análisis (la lectura cambia con los nuevos hechos). Migration 0029 (proyecto_eventos + proyecto_analisis). Módulo IA: src/lib/escenarios/analizarEscenariosIA.ts (prompt adaptado de fooday-intelligence-core/agents/agente-generador-hipotesis.md)", docs: "Ritual semanal (domingo) · Pilar 2 · HelpDrawer" },
  { ruta: "/configuracion", proposito: "Configuración: API key IA, base URL, modelo, tema, prompt de pagos editable (migration 0027) y perfil para la IA — quién eres, familia, restricciones y contexto del negocio (migration 0032, antes hardcodeado en los prompts). Campo vacío = se usa el valor por defecto de la app", docs: "Pilar 2 · HelpDrawer" },

  // ── Documentación ──
  { ruta: "/docs", proposito: "Esta página: pilares + rituales + apéndices + índice", docs: "(auto-referencial)" },
  { ruta: "/metodologia", proposito: "WIGs, GTD, Próxima Acción, dos inboxes", docs: "(complemento directo de /docs)" },

  // ── Auth ──
  { ruta: "/login", proposito: "Login con Supabase (email + password)", docs: "(no requiere metodología)" },
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

      {/* =====================================================================
          Glosario — Arquitectura explicada para humanos.
          La app tiene 4 capas (Proyecto → Meta → KR → Tarea/Hábito) que
          encajan como una casa. Esta sección existe para que David pueda
          volver aquí cuando dude qué es qué o cómo encaja. La metáfora es
          deliberadamente doméstica: si la entiendes en 30 segundos, la
          aplicación se vuelve autoexplicativa.
         ===================================================================== */}
      <section
        id="glosario"
        className="scroll-mt-20 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Glosario · Arquitectura en 4 capas
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            🏠 La casa de tus objetivos (explicado sin jerga)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tu vida tiene <strong className="text-foreground">casas grandes</strong>{" "}
            (proyectos). Cada casa tiene <strong className="text-foreground">habitaciones</strong>{" "}
            (metas) que tienen que estar terminadas. Cada habitación tiene{" "}
            <strong className="text-foreground">muebles medibles</strong> (KRs) que
            dicen “esta habitación está X% hecha”. Y para tener los
            muebles hay que <strong className="text-foreground">mover las manos</strong>{" "}
            (tareas), algunas de ellas repetidas (hábitos). El orden importa:
            no puedes decorar una habitación que no existe, ni montar un
            mueble que no has comprado.
          </p>
        </header>

        <ol className="mt-6 space-y-5 text-sm leading-relaxed">
          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              <h3 className="text-base font-semibold">Proyecto = la casa</h3>
            </div>
            <p className="mt-2 text-muted-foreground">
              Una <strong className="text-foreground">iniciativa grande</strong>{" "}
              que tiene sentido por sí sola y engloba varias metas. Ejemplos:
              “Renegociar el alquiler de Sol de Nit”, “Lanzar la v1 de
              Fooday”, “Ponerme en forma este trimestre”. Vive en la tabla{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyectos</code>.
              Tiene color, descripción opcional, área opcional.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Si tu idea es una sola cosa, no necesita proyecto: es una meta
              directa (ver más abajo).
            </p>
          </li>

          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚪</span>
              <h3 className="text-base font-semibold">Meta = una habitación</h3>
            </div>
            <p className="mt-2 text-muted-foreground">
              Un <strong className="text-foreground">resultado concreto con
              plazo</strong>. Si la casa es “Renegociar alquiler”, las
              habitaciones son: “Preparar el dossier financiero”, “Buscar 3
              locales alternativos”, “Redactar la propuesta para Teresa”,
              “Ensayar la reunión”. Las metas pueden vivir dentro de un
              proyecto (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.proyecto_id</code>)
              o sueltas (sin casa). Una meta sin KRs y sin tareas es una
              habitación vacía.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 La migración 0025 añadió fechas reales (inicio + límite + 🔒
              hard constraint) para que el planificador no fuerce 4 trimestres
              lineales cuando tu meta dura 2 semanas.
            </p>
          </li>

          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪟</span>
              <h3 className="text-base font-semibold">KR (Key Result) = un mueble medible</h3>
            </div>
            <p className="mt-2 text-muted-foreground">
              Una <strong className="text-foreground">medición</strong> que dice
              “esta habitación está X% hecha”. Para “Buscar 3 locales
              alternativos”: KR = “Tener 3 locales visitados y valorados
              antes del 15 de noviembre”. Si los muebles están, la
              habitación está hecha. Un KR sin tareas es un mueble que
              todavía no has comprado: sabes lo que quieres, pero nadie lo
              está montando.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Los KRs viven en la tabla{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>{" "}
              con FK a la meta y al periodo (trimestre 1–4 o mes 1–12
              desde la migración 0025).
            </p>
          </li>

          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔨</span>
              <h3 className="text-base font-semibold">Tarea / Hábito = mover las manos</h3>
            </div>
            <p className="mt-2 text-muted-foreground">
              Para tener los muebles necesitas <strong className="text-foreground">acciones
              concretas</strong> que haces una vez (tarea) o que repites
              (hábito). Para “Tener 3 locales visitados”: llamar a 3
              inmobiliarias, visitar local 1 el martes, rellenar la ficha
              comparativa. Si haces todas las tareas del KR, el KR se cumple.
              Un <strong className="text-foreground">hábito</strong> es una
              tarea con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">recurrencia_tipo = diaria | semanal | mensual</code>{" "}
              en vez de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">null</code>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              💡 Resumen en una línea: <strong className="text-foreground">Proyecto</strong>{" "}
              = la casa. <strong className="text-foreground">Meta</strong> = una
              habitación. <strong className="text-foreground">KR</strong> = un
              mueble medible. <strong className="text-foreground">Tarea</strong>{" "}
              = la acción que haces para poner el mueble.{" "}
              <strong className="text-foreground">Hábito</strong> = una tarea
              que se repite.
            </p>
          </li>
        </ol>

        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            🧠 ¿Cómo encaja esto con el botón "IA" de cada capa?
          </p>
          <ul className="mt-2 space-y-1.5 text-muted-foreground">
            <li>
              · <strong className="text-foreground">/agente</strong> (la entrada
              unificada): le cuentas un contexto y la IA decide si es
              <em> proyecto / meta / captura</em>, lo clasifica, propone la
              estructura completa (casa + habitaciones + mueble inicial por
              habitación) y en una segunda fase genera el plan entero
              (muebles + tareas + hábitos) por cada meta. Tú solo ejecutas.
            </li>
            <li>
              · <strong className="text-foreground">/metas/nueva</strong> y el{" "}
              <strong className="text-foreground">botón IA en EditarMetaModal</strong>:
              si ya tienes una meta (suelta o dentro de un proyecto), pulsas
              "✨ Generar plan con IA" y rellena los KRs + tareas + hábitos
              que faltan. El KR inicial se respeta si ya existía.
            </li>
            <li>
              · <strong className="text-foreground">Botón IA en cada KR</strong>{" "}
              (en /metas/detalle): si ya tienes un KR puesto y quieres
              afinarlo o regenerarle las tareas, este botón le pide a la IA
              solo las tareas/hábitos para ese KR concreto, sin tocar los
              demás. Útil cuando ajustas un KR a mano y el plan original ya
              no encaja.
            </li>
          </ul>
        </div>
      </section>

      {/* =====================================================================
          Meta · Cómo se mantiene este documento actualizado
          Regla de sincronización docs ↔ app + última actualización.
         ===================================================================== */}
      <section
        id="meta-mantenimiento"
        className="scroll-mt-20 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Meta · Mantenimiento
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            📌 Cómo se mantiene este documento actualizado
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta página se actualiza{" "}
            <strong className="text-foreground">en la misma sesión</strong>{" "}
            en que se añade o modifica cualquier feature de la app. Si la doc
            no se actualiza, el trabajo no está terminado. Convención
            sincronizada con{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AGENTS.md</code>.
          </p>
        </header>

        <ol className="mt-5 space-y-2 text-sm leading-relaxed">
          <li className="flex gap-3 rounded-lg border border-indigo-500/20 bg-background/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              1
            </span>
            <div>
              <strong className="text-foreground">Pantalla nueva</strong>{" "}
              <span className="text-muted-foreground">
                → añadir fila al índice de abajo y revisar si aplica a un
                ritual (diario / semanal / mensual).
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-indigo-500/20 bg-background/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              2
            </span>
            <div>
              <strong className="text-foreground">Hábito nuevo</strong>{" "}
              <span className="text-muted-foreground">
                → actualizar{" "}
                <Link
                  href="/metodologia"
                  className="font-mono text-indigo-700 dark:text-indigo-300 underline-offset-4 hover:underline"
                >
                  /metodologia
                </Link>{" "}
                y Pilar 4 de{" "}
                <Link
                  href="/docs"
                  className="font-mono text-indigo-700 dark:text-indigo-300 underline-offset-4 hover:underline"
                >
                  /docs
                </Link>
                .
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-indigo-500/20 bg-background/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              3
            </span>
            <div>
              <strong className="text-foreground">Regla de metodología</strong>{" "}
              <span className="text-muted-foreground">
                → actualizar el pilar correspondiente. Si contradice
                evidencia, revisar también el apéndice "Evidencia
                científica".
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-indigo-500/20 bg-background/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              4
            </span>
            <div>
              <strong className="text-foreground">Cambio de nombre o comportamiento</strong>{" "}
              <span className="text-muted-foreground">
                → actualizar índice, rituales y HelpDrawer de la página
                afectada.
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-indigo-500/20 bg-background/40 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              5
            </span>
            <div>
              <strong className="text-foreground">Cualquier cambio</strong>{" "}
              <span className="text-muted-foreground">
                → añadir entrada al "Registro de cambios" (abajo del todo)
                con fecha.
              </span>
            </div>
          </li>
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm">
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
            Última actualización:
          </span>
          <span className="font-mono text-indigo-700 dark:text-indigo-300">
            2026-10-14
          </span>
          <span className="text-muted-foreground">
            — migration 0025: las metas pasan a tener rango real (fecha_inicio_meta + fecha_objetivo + fecha_fin_bloqueada). El planificador reparte los KRs como meses sueltos dentro del rango, no fuerza 4 trimestres. /metas/nueva con dos date inputs + checkbox 🔒 Fecha crítica. Helpers nuevos: parsearMesesDeRango() y ensurePeriodosMeses() (RPC ensure_periodos_meses).
          </span>
        </div>
      </section>

      {/* =====================================================================
          Meta · Índice de features documentadas
          Mapa: ruta → propósito → dónde se documenta.
         ===================================================================== */}
      <section
        id="meta-indice"
        className="scroll-mt-20 rounded-2xl border-2 border-slate-500/30 bg-gradient-to-br from-slate-500/5 to-zinc-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Meta · Índice
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            🗂️ Índice de features documentadas
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Mapa completo de las 27 rutas de la app. Cada fila dice qué hace
            la pantalla y en qué sección de esta página (o de{" "}
            <Link
              href="/metodologia"
              className="font-mono text-slate-700 dark:text-slate-300 underline-offset-4 hover:underline"
            >
              /metodologia
            </Link>
            ) se explica el método que la sustenta. Si una fila solo dice
            "HelpDrawer", significa que no tiene sección dedicada en{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/docs</code>{" "}
            y se explica en el cajón de ayuda de la propia pantalla.
          </p>
        </header>

        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-500/20">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-500/10">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ruta
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Propósito
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Documentado en
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/40">
              {FEATURES.map((f) => (
                <tr key={f.ruta}>
                  <td className="px-3 py-2 font-mono font-medium">
                    {f.ruta === "/docs" || f.ruta === "/login" ? (
                      <span className="text-slate-700 dark:text-slate-300">
                        {f.ruta}
                      </span>
                    ) : (
                      <Link
                        href={f.ruta}
                        className="text-slate-700 dark:text-slate-300 underline-offset-4 hover:underline"
                      >
                        {f.ruta}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {f.proposito}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {f.docs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Leyenda:</strong>{" "}
          <span className="font-mono">Pilar X</span> = sección de los 5 pilares ·{" "}
          <span className="font-mono">Ritual X</span> = bloque "Rituales de uso" ·{" "}
          <span className="font-mono">Apéndice §…</span> = apéndice específico ·{" "}
          <span className="font-mono">HelpDrawer</span> = solo cajón de ayuda
          in-app.
        </p>
      </section>

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

      <section className="rounded-2xl border-2 border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-violet-500/5 p-6 sm:p-8">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            Complemento · El flujo del foco
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Del quarterly al daily: tres niveles, un selector cada uno
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            La app no te pide &quot;haz todo&quot;. Te pide{" "}
            <strong>una decisión por nivel</strong>, y cada decisión hace más
            fácil la siguiente. Así
            no acabas con 40 tareas en la agenda:{" "}
            <strong className="text-foreground">
              el trimestre dice QUÉ, la semana dice DÓNDE, el día dice QUÉ
              HACES AHORA
            </strong>
            .
          </p>
        </header>

        <ol className="mt-6 space-y-3">
          <li className="flex flex-wrap items-center gap-3 rounded-lg border border-violet-500/30 bg-background/70 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-700 dark:text-violet-300">
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                🎯 3 metas WIG —{" "}
                <span className="font-normal text-muted-foreground">
                  el ciclo. Se revisan cada mes.
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Las 3 metas a las que dedicas atención desproporcionada.{" "}
                <span className="font-mono">/metas</span> · ✨ Sugerir 3 WIGs
              </p>
            </div>
          </li>
          <li className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/30 bg-background/70 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-700 dark:text-sky-300">
              2
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                🎯 3 KRs de la semana —{" "}
                <span className="font-normal text-muted-foreground">
                  la semana. Se renueva cada domingo.
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                En qué <em>resultados medibles</em> pones horas ahora.{" "}
                <span className="font-mono">/semana</span> · ✨ Sugerir 3 KRs
                (la IA elige por riesgo: los que van por debajo del ritmo y
                tienen menos días restantes)
              </p>
            </div>
          </li>
          <li className="flex flex-wrap items-center gap-3 rounded-lg border border-fuchsia-500/30 bg-background/70 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300">
              3
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                🎯 3 tareas del día —{" "}
                <span className="font-normal text-muted-foreground">
                  el día. Se eligen cada mañana.
                </span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Qué haces hoy, siempre empujando los KRs de la semana.{" "}
                <span className="font-mono">/semana</span> +{" "}
                <span className="font-mono">/plan-diario</span>
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">
              ¿Y los trimestres? No se sustituyen.
            </strong>{" "}
            Son otro eje, perpendicular: el trimestre dice{" "}
            <em>cuándo se entrega</em> un KR, la semana dice{" "}
            <em>en qué estás trabajando ahora</em>. Por eso un KR solo entra
            en el foco semanal si su entrega está en marcha — así lo caducado
            y lo prematuro no te distraen. Si no eliges foco semanal, el día se
            planifica igual por compromiso y deadline:{" "}
            <strong className="text-foreground">nunca te bloquea</strong>.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-6 sm:p-8">
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Complemento · Arquitectura
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Cómo se implementa este sistema en la app
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Los 5 pilares de arriba son la <strong className="text-foreground">base filosófica</strong> (por qué). Su implementación
            concreta — WIGs, GTD, Próxima Acción, dos inboxes — vive en una página aparte
            porque es más densa y operativa:
          </p>
        </header>
        <Link
          href="/metodologia"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-background/60 px-4 py-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <IconTarget className="h-4 w-4 text-violet-500" />
          Ir a /metodologia — WIGs, GTD y Próxima Acción
        </Link>
      </section>

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

      {/* =====================================================================
          Complemento · Aplicación sectorial
          Bucle de equilibrio para restaurantes de temporada: cómo proteger
          liquidez antes de amortizar deuda en negocios con ingresos
          estacionales. Apunta también desde /pagos.
         ===================================================================== */}
      <section
        id="bucle-equilibrio-temporada"
        className="scroll-mt-20 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Complemento · Aplicación sectorial
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Bucle de equilibrio para restaurantes de temporada
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            En negocios con ingresos estacionales (hostelería, turismo,etc.) el{" "}
            <strong className="text-foreground">ahorro acumulado no es
            excedente libre</strong>: es el combustible que permite sobrevivir
            la temporada baja. Si lo gastas todo en amortizar de forma agresivo
            durante los meses flacos, desproteges el flujo de caja y ante el
            primer imprevisto (avería, subida de suministros, impuesto) te ves
            obligado a créditos caros o impagos — la espiral de deuda.
            Esta nota describe cómo reducir deuda de forma{" "}
            <strong className="text-foreground">estratégica</strong> sin
            desproteger el restaurante.
          </p>
        </header>

        <hr className="my-6 border-border" />

        {/* 1. Bucle de equilibrio */}
        <h3 className="text-base font-semibold">
          1. Divide el ahorro en dos bloques (bucle de equilibrio)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Antes de destinar un solo euro a amortización anticipada, fija esta
          regla de dos bloques sobre tu ahorro:
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>
              <strong className="font-bold text-amber-700 dark:text-amber-300">
                Bloque A — Colchón operativo de temporada baja.
              </strong>{" "}
              Calcula el déficit neto mensual (gastos fijos − ingresos
              estimados de temporada baja) y multiplica por el número de
              meses de temporada baja. <strong>No se toca para pagar
              deuda</strong>: es el bucle de equilibrio que absorbe los meses
              en negativo sin generar nuevos impagos.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>
              <strong className="font-bold text-amber-700 dark:text-amber-300">
                Bloque B — Excedente real.
              </strong>{" "}
              Solo el dinero que sobra por encima del colchón operativo se
              considera disponible para amortización acelerada de deuda.
            </span>
          </li>
        </ul>

        {/* 2. Punto de apalancamiento */}
        <h3 className="mt-6 text-base font-semibold">
          2. Identifica el punto de apalancamiento (qué pagar y cuándo)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Una vez identificado el excedente real, aplica el apalancamiento de
          mayor impacto:
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>
              <strong className="font-bold text-amber-700 dark:text-amber-300">
                Timing.
              </strong>{" "}
              Protege la liquidez durante los meses en negativo. Las
              amortizaciones extraordinarias se hacen al final de la
              temporada alta (máxima certidumbre de caja) o de forma muy
              gradual en temporada baja, siempre con el colchón intacto.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>
              <strong className="font-bold text-amber-700 dark:text-amber-300">
                Aparcamiento de deudas caras.
              </strong>{" "}
              Destina el excedente prioritariamente a las deudas con la{" "}
              <strong>TAE más alta</strong> (pólizas de crédito, préstamos
              personales, microcréditos): son las que tienen efecto
              multiplicador de coste.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            <span>
              <strong className="font-bold text-amber-700 dark:text-amber-300">
                Mantener los mínimos.
              </strong>{" "}
              En deudas baratas o a largo plazo (hipotecas, líneas con bajo
              interés), paga solo la cuota mínima obligatoria. No genera
              penalizaciones ni agota liquidez.
            </span>
          </li>
        </ul>

        {/* 3. Modelo mental */}
        <h3 className="mt-6 text-base font-semibold">
          3. Modelo mental (la base del iceberg)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Ajusta la creencia profunda sobre qué priorizar en cada fase del
          año:
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-500/30 bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Temporada alta
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              El objetivo del sistema es{" "}
              <strong className="text-foreground">acumular liquidez</strong> y
              amortizar deuda con el excedente. Aquí se gana el año.
            </p>
          </div>
          <div className="rounded-lg border border-sky-500/30 bg-background/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
              Temporada baja
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              La prioridad absoluta es la{" "}
              <strong className="text-foreground">estabilidad financiera</strong>{" "}
              y la preservación de la liquidez. No la velocidad de pago de
              la deuda.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium leading-relaxed text-amber-700 dark:text-amber-300">
            💡 Si quieres, calculamos juntos la estructura de costes fijos de
            tu restaurante para determinar exactamente de cuánto debe ser tu
            colchón de temporada baja antes de destinardinero a amortizar
            deudas.
          </p>
        </div>
      </section>

      {/* =====================================================================
          Complemento · Rituales de uso (chuleta diaria / semanal / mensual)
          Cuándo abrir cada pantalla y qué hábitos mantener para que el
          sistema no se rompa por desuso.
         ===================================================================== */}
      <section
        id="rituales-uso"
        className="scroll-mt-20 rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-pink-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            Complemento · Rituales de uso
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Cuándo usar cada pantalla (y qué hábitos no se rompen)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta app tiene más de 15 pantallas. Sin un orden, se te olvidan
            o las usas mal. Aquí está la chuleta:{" "}
            <strong className="text-foreground">qué abrir, cuándo y por qué</strong>.
            Si saltas un ritual, el sistema pierde valor acumulado: la
            información se desactualiza, el semáforo miente y el Estatus
            Diario deja de detectar patrones.
          </p>
        </header>

        <hr className="my-6 border-border" />

        {/* ── 1. Ritual diario ── */}
        <h3 className="text-base font-semibold">
          ☀️ 1. Ritual diario (todos los días, ~5 aperturas)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Aperturas obligatorias del día. Si te saltas una, anótalo en el
          Estatus y compénsalo mañana — no improvises una rutina nueva.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-rose-500/20">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-rose-500/10">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Cuándo
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Pantalla
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Qué hacer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/40">
              <tr>
                <td className="px-3 py-2 font-medium">Al despertar</td>
                <td className="px-3 py-2">
                  <Link
                    href="/norte"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /norte
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Recordar propósito/valores (10s). Ancla emocional del día.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Mañana, 1ª hora</td>
                <td className="px-3 py-2">
                  <Link
                    href="/plan-diario"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /plan-diario
                  </Link>
                  {" + "}
                  <Link
                    href="/calendario"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /calendario
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Definir las 3 cosas del día + pintar 4 bloques. Es lo
                  primero que se hace, antes de emails.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">
                  Cuando algo se te cruce por la cabeza
                </td>
                <td className="px-3 py-2">
                  <Link
                    href="/captura"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /captura
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Vaciar cabeza en &lt;30s. No pienses, captura. Luego lo
                  trias.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Bloques de trabajo</td>
                <td className="px-3 py-2">
                  <Link
                    href="/focus"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /focus
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Pomodoro con pre-flight (silenciar, cerrar email, criterio
                  de éxito). Máx 4/día.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Final del día</td>
                <td className="px-3 py-2">
                  <Link
                    href="/estatus"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /estatus
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Marcar los 9 hábitos + cierre cognitivo 5 preguntas. Esto
                  es sagrado: si no se hace, el sistema pierde valor al día
                  siguiente.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className="my-6 border-border" />

        {/* ── 2. Ritual semanal ── */}
        <h3 className="text-base font-semibold">
          📅 2. Ritual semanal (1 acción por día, ~15-30 min total)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Una sola cosa importante por día. No acumules todo en el domingo:
          satura.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-rose-500/20">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-rose-500/10">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Día
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Pantalla
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/40">
              <tr>
                <td className="px-3 py-2 font-medium">Domingo noche</td>
                <td className="px-3 py-2">
                  <Link
                    href="/semana"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /semana
                  </Link>
                  {" + "}
                  <Link
                    href="/plan-diario"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /plan-diario
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <p>
                    Planificar la semana entrante:{" "}
                    <strong className="text-foreground">
                      primero elige los 3 KRs de la semana
                    </strong>{" "}
                    (panel azul arriba del pipeline), luego arrastra las tareas
                    a los días. Es la base de todo lo demás.
                  </p>
                  <p className="mt-1.5 text-xs">
                    🎯 Los KRs en foco son la capa intermedia: el trimestre dice{" "}
                    <em>cuándo se entrega</em>, la semana dice{" "}
                    <em>dónde pones horas</em>. Solo entran KRs cuya entrega
                    está en marcha. Usa{" "}
                    <span className="font-medium text-foreground">
                      ✨ Sugerir 3 KRs
                    </span>{" "}
                    y la IA elige por riesgo real (los que van por debajo del
                    ritmo y tienen menos días restantes).
                  </p>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">
                  <span className="block">Lunes, 1ª hora</span>
                  <span className="mt-1 inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Estricto
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href="/pagos"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /pagos
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <strong className="text-foreground">Estricto.</strong>{" "}
                  Revisar y ejecutar pagos pendientes. Es lo primero del
                  lunes, antes de cualquier otra cosa. Si el lunes es
                  festivo, se hace el martes a 1ª hora (no más tarde). Si
                  tampoco se puede, se salta esa semana, pero se vuelve al
                  lunes siguiente sin falta.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Domingo (tras planificar)</td>
                <td className="px-3 py-2">
                  <Link
                    href="/escenarios"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /escenarios
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Un vistazo a los proyectos: qué ha pasado (cronología), dónde
                  están hoy (estado medido) y qué puede pasar (escenarios con
                  estrategia). Solo entra en los que te importen: el resto se
                  puede mirar después o nunca, sin penalización.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Miércoles</td>
                <td className="px-3 py-2">
                  <Link
                    href="/pipeline"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /pipeline
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Revisar Kanban: mover tarjetas, repriorizar, lanzar motor
                  IA si hay atasco. Punto medio de semana para corregir
                  rumbo.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Viernes tarde</td>
                <td className="px-3 py-2">
                  <Link
                    href="/informes"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /informes
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Mirar heatmap de foco + scorecard de hábitos. Cierre
                  semanal objetivo: cuántas horas reales de foco vs. las
                  4/día prometidas.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Domingo (parte final)</td>
                <td className="px-3 py-2">
                  <Link
                    href="/metas/plan"
                    className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                  >
                    /metas/plan
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  Revisar la proyección lineal de KRs: ¿voy en línea, por
                  encima o por debajo del ritmo esperado? Ajustar si toca.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <hr className="my-6 border-border" />

        {/* ── 3. Ritual mensual ── */}
        <h3 className="text-base font-semibold">
          🗓️ 3. Ritual mensual (1 vez al mes, ~60-90 min)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Reservar un bloque protegido el primer domingo del mes nuevo. No
          más de 90 min. Si se pasa, el ritual está mal dimensionado.
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <span>
              <Link
                href="/metas"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /metas
              </Link>
              {" + "}
              <Link
                href="/metas/plan"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /metas/plan
              </Link>
              : <strong className="text-foreground">revisión profunda de OKR</strong>.
              ¿Qué KRs avancé? ¿Cuáles están persistentemente en rojo?
              ¿Aparecen metas nuevas? ¿Qué metas mueren (ya no aportan al
              norte)?
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <span>
              <Link
                href="/norte"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /norte
              </Link>
              : <strong className="text-foreground">vigencia del norte</strong>.
              ¿Mi propósito/valores siguen siendo los mismos? (Esto se hace
              de forma más profunda cada trimestre; una mirada mensual
              basta).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <span>
              <Link
                href="/informes"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /informes
              </Link>
              : <strong className="text-foreground">tendencia 30 días</strong>.
              Heatmap de foco, score de hábitos, días en rojo emocionales,
              metas y KRs cerrados en la ventana, y la brecha “metas con
              plan vs sin plan” (las aspiracionales sin KRs son el típico
              cuello de botella del mes). Si una racha roja emocional
              supera los 5 días, abrir una acción correctiva ya (no
              esperar al mes siguiente).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <span>
              <strong className="text-foreground">
                Decidir 1-3 experimentos para el mes (no más).
              </strong>{" "}
              Cosas concretas que vas a probar los próximos 30 días. Se
              registran en{" "}
              <Link
                href="/tareas"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /tareas
              </Link>{" "}
              con un tag o ámbito "experimento_mes" para poder evaluarlos
              en el siguiente ritual.
            </span>
          </li>
        </ul>

        <hr className="my-6 border-border" />

        {/* ── 4. Hábitos recurrentes ── */}
        <h3 className="text-base font-semibold">
          🔁 4. Hábitos recurrentes (las 3 reglas que no se rompen)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Si solo pudieras mantener 3 hábitos del sistema, que sean estos.
          Lo demás se puede recuperar; si rompes uno de estos, el sistema
          pierde coherencia.
        </p>

        <ol className="mt-3 space-y-3 text-sm">
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-700 dark:text-rose-300">
              1
            </span>
            <div className="leading-relaxed">
              <strong className="text-foreground">
                Nunca dejes una idea en la cabeza.
              </strong>{" "}
              <span className="text-muted-foreground">
                Si piensas algo —una tarea, una preocupación, una idea—,
                va a{" "}
              </span>
              <Link
                href="/captura"
                className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
              >
                /captura
              </Link>
              <span className="text-muted-foreground">
                {" "}
                en el momento. Sin excepción. Luego la trias cuando toca.
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-700 dark:text-rose-300">
              2
            </span>
            <div className="leading-relaxed">
              <strong className="text-foreground">
                Nunca empieces un bloque sin /focus + pre-flight.
              </strong>{" "}
              <span className="text-muted-foreground">
                Silenciar notificaciones, cerrar email, definir criterio de
                éxito del bloque. Es la única forma de que los 4 bloques
                diarios sean bloques de verdad y no tiempo perdido con
                sensación de "trabajar".
              </span>
            </div>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-700 dark:text-rose-300">
              3
            </span>
            <div className="leading-relaxed">
              <strong className="text-foreground">
                Nunca cierres el día sin /estatus.
              </strong>{" "}
              <span className="text-muted-foreground">
                Marcar los 9 hábitos + cierre cognitivo de 5 preguntas. Si
                saltas esto 2 días seguidos, el sistema pierde valor: el
                score de hábitos se rompe, el cierre cognitivo se acumula
                sin procesar y el dashboard emocional deja de detectar
                patrones a tiempo.
              </span>
            </div>
          </li>
        </ol>

        <div className="mt-6 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm font-medium leading-relaxed text-rose-700 dark:text-rose-300">
            💡 ¿Quieres que te recuerde el ritual diario automáticamente al
            abrir la app cada mañana? Puedo añadir un mini-banner en la
            home (/) que muestre "Hoy toca: X" según el día de la semana.
          </p>
        </div>
      </section>

      {/* =====================================================================
          Meta · Registro de cambios de esta página
          Historial manual, en orden inverso. No se borran entradas.
         ===================================================================== */}
      <section
        id="meta-changelog"
        className="scroll-mt-20 rounded-2xl border-2 border-teal-500/30 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
            Meta · Registro de cambios
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            📜 Registro de cambios de esta página
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Historial manual en orden inverso (lo más reciente arriba). Cada
            vez que se añade o modifica una sección, se anota aquí con la
            fecha. Para no perder el aprendizaje,{" "}
            <strong className="text-foreground">no se borran entradas</strong>:
            si una sección se renombra o se mueve, se anota la operación.
          </p>
        </header>

        <ul className="mt-5 space-y-3 text-sm leading-relaxed">
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-28
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Nueva capa: “🎯 3 KRs de la semana” (migration 0033).
              </strong>{" "}
              Hasta ahora la cascada documentada saltaba de la meta a la tarea: el
              KR se medía en trimestres pero <em>nada</em> decía en qué KRs
              ponías horas esta semana, y la planificación semanal filtraba por{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">prioridad = &apos;critica&apos;</code>{" "}
              (un corte ciego que ignoraba metas y KRs). Se añade la capa
              intermedia, que es <strong className="text-foreground">ortogonal al
              trimestre, no sustitutiva</strong>:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">kr_periodos</code>{" "}
              sigue siendo la ventana de MEDICIÓN (“cuándo se entrega”) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">kr_foco_semanal</code>{" "}
              es la de EJECUCIÓN (“dónde pongo horas”). Consecuencias: (a) el cap
              de 3 es <em>por semana</em>, así que el foco rota solo cada semana; (b)
              la <strong className="text-foreground">regla de contención</strong>{" "}
              (un KR solo entra si alguno de sus periodos contiene la semana
              actual) la aplica la RPC{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">toggle_kr_foco_semanal</code>{" "}
              en BD — lo caducado y lo prematuro quedan fuera solos; (c) la IA
              elige por <strong className="text-foreground">riesgo real</strong>{" "}
              (los KRs que van por debajo del ritmo esperado y tienen menos días
              restantes), con cobertura suave (no más de 2 de la misma meta) y
              siempre con confirmación humana; (d) la propuesta IA de tareas de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/semana</code>{" "}
              ahora prioriza las ancladas al foco y el prompt de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario</code>{" "}
              recibe los KRs de la semana para anclar los bloques del día. Si no
              hay foco elegido, el día se planifica igual por compromiso y
              deadline: el foco semanal <em>nunca</em> bloquea.{" "}
              <strong className="text-foreground">Documentación actualizada en
              la misma sesión</strong> (AGENTS.md): este registro, el índice{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">FEATURES</code>{" "}
              (filas <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/semana</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario</code>),{" "}
              el Pilar 2 (nuevo punto “El KR de la semana”), el bloque visual
              “Del quarterly al daily: tres niveles, un selector cada uno”, el
              ritual semanal del domingo, y en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metodologia</code>{" "}
              la §3 (de “dos capas de WIGs” a tres, con el detalle de los dos
              ejes temporales), el §7 (diagrama de 6 → 7 capas, nueva capa “KRs en
              foco de la semana”) y el §8 (ejemplo completo). Archivos nuevos:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/components/PanelFocoKRs.tsx</code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/sugerirKRsSemanaIA.ts</code>
              .
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-29
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">El perfil del usuario sale de los prompts (migration 0032).</strong>{" "}
              El contexto personal (“David”, familia “María y Abril (5 años)”, restricciones
              alimentarias, TDAH/cervicales, negocio del restaurante) estaba escrito{" "}
              <strong className="text-foreground">dentro de las plantillas de prompt</strong> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plan.ts</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">planSimple.ts</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">iaSugerencias.ts</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirMatrizIA.ts</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirPagosIA.ts</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">analizarEscenariosIA.ts</code> —134 ocurrencias. Eso obligaba a tocar el código para cambiarlo y{" "}
              <strong className="text-foreground">no había forma de testear qué se le manda a la IA</strong>. Ahora vive en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configuracion.perfil / familia / restricciones / contexto_negocio</code>{" "}
              (columnas nuevas, RLS ya existente), es editable en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/configuracion</code> y se inyecta con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">bloquePerfil()</code>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/perfilIA.ts</code>).{" "}
              <strong className="text-foreground">Cero cambios de comportamiento</strong>:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DEFAULT_PERFIL_IA</code> contiene
              literalmente los textos que estaban hardcodeados, y campo vacío = default, así que
              quien no toque nada recibe prompts idénticos a los de antes (fijado con tests).{" "}
              De paso se{" "}
              <strong className="text-foreground">elimina una duplicación real</strong>:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DEFAULT_PROMPT_PAGOS</code> estaba
              copiado en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configStore.tsx</code> y en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirPagosIA.ts</code> (el comentario
              lo justificaba por una “dependencia circular” que no existía; ya se habían desincronizado).{" "}
              <strong className="text-foreground">FEATURES actualizado</strong> (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/configuracion</code>).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-29
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Ya hay tests que se ejecutan (y CI que los ejecuta).</strong>{" "}
              Existían 7 ficheros <code className="rounded bg-muted px-1.5 py-0.5 text-xs">*.test.mjs</code> pero{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">package.json</code> no tenía script{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">test</code>: nadie los corría nunca, y 3 de
              los 7 no(arrancaban (importaban <code className="rounded bg-muted px-1.5 py-0.5 text-xs">./plan.ts</code>, que usa el
              alias <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@/…</code> y parameter properties que el
              type-stripping de Node no soporta). Arreglado sin dependencias nuevas:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">scripts/test-alias.mjs</code> resuelve{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@/…</code> y las rutas relativas sin
              extensión, y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">scripts/run-tests.mjs</code> agrega
              un único veredicto. Nuevo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm test</code> (8
              ficheros, 106 aserciones) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run typecheck</code>, ambos en el
              workflow <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.github/workflows/test.yml</code>.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-29
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Fuera 4 tablas muertas (migration 0030).</strong>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public.okrs</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public.key_results</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public.hitos</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public.planes_semanales</code>{" "}
              se crearon en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0001_init.sql</code> y las
              sustituyeron <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code> (0015/0028) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plan_semanal_tareas</code> (0009). Tenían{" "}
              <strong className="text-foreground">0 referencias en el código</strong>. Eran la causa de que el
              esquema tuviera{" "}
              <strong className="text-foreground">tres modelos de KR simultáneos</strong>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">okrs</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">key_results</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>). La migración es
              idempotente y verificada replayando la cadena completa contra Postgres.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-29
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Fuera el segundo sistema de migraciones.</strong>{" "}
              Había 9 ficheros <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/APLICAR-*.sql</code>{" "}
              para pegar a mano en el SQL Editor, que duplicaban migraciones ya versionadas y se habían
              desincronizado. Antes de borrarlos se verificó sentencia por sentencia que no había SQL
              único,{" "}
              <strong className="text-foreground">salvo en APLICAR-0024</strong>: el KR “Alimentación consciente” de
              M8101 y 9 tareas <code className="rounded bg-muted px-1.5 py-0.5 text-xs">N8101-*</code> con sus vínculos
              KR no existían en ningún otro sitio. Se rescató como{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0031_seed_m8101_kr_y_tareas.sql</code>{" "}
              (verificado 1:1, 25 sentencias) para no perder datos. También se{" "}
              <strong className="text-foreground">corregió un bug real de documentación</strong>:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">eliminarMeta()</code> documentaba que los KRs
              quedaban huérfanos (SET NULL) cuando la FK real es{" "}
              <strong className="text-foreground">ON DELETE CASCADE</strong> — borrarla elimina los KRs. Los
              números duplicados 0027/0028 <strong className="text-foreground">no se renumeran</strong> a propósito
              (rompería el tracking de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase_migrations</code> en producción); queda
              documentado en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/README.md</code>.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-28
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Fix raíz: un proyecto ya no muestra 0 tareas.</strong>{" "}
              Una tarea puede colgar de <strong className="text-foreground">tres</strong> sitios:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.proyecto_id</code> (directa),{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.meta_id</code> (dentro de una meta) o{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.resultado_periodo_id</code> (dentro de un KR).{" "}
              Las tareas que viven <strong className="text-foreground">dentro de un KR de una meta</strong> llevan{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">meta_id</code> pero{" "}
              <strong className="text-foreground">NO</strong>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_id</code>. Contar o filtrar solo por{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.proyecto_id</code> devolvía{" "}
              <strong className="text-foreground">0 tareas</strong> en todos los proyectos cuyas tareas están en los KRs de sus metas (justo lo que pasó en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/escenarios</code>). Se afectados{" "}
              <strong className="text-foreground">6 sitios</strong>: el estado medido de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/escenarios</code>, el contador y el PDF de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>, el filtro{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">?proyecto=</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas</code>, y la distribución por proyecto de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code>.{" "}
              <strong className="text-foreground">Fix de raíz, no síntoma por síntoma</strong>: nuevo módulo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/proyectos.ts</code> con{" "}
              <strong className="text-foreground">la regla en un solo sitio</strong> —{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyectoEfectivoDeTarea()</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareasDeProyecto()</code> /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareasPorProyectoEfectivo()</code>. La regla es la que{" "}
              <strong className="text-foreground">ya usaba</strong> el breadcrumb de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">TasksTable</code> desde siempre (si la tarea tiene meta, manda el proyecto de la meta; si no, el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_id</code> directo) — ahora es la única implementación y todas las pantallas quedan alineadas.{" "}
              Test: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">node src/lib/proyectos.test.mjs</code> (11 casos).{" "}
              <strong className="text-foreground">Sin migración</strong> (es lógica de lectura, no de esquema).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-27
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Nueva pantalla /escenarios: contexto, estado, situación e hipótesis por proyecto.</strong>{" "}
              Capa por encima del ritual (no lo reemplaza) que recoge la idea de
              “un proyecto es vivo, suceden cosas”. Las 3 dimensiones van
              <strong className="text-foreground">separadas y sin solaparse</strong>:{" "}
              <em>Contexto</em> = el pasado (cronología append-only de hechos, cada uno tipado como contexto/estado/situación),{" "}
              <em>Estado</em> = el presente <strong className="text-foreground">medido</strong> (se calcula de las tareas en cada render: total, hechas, abiertas, bloqueadas, vencidas, % avance y próximo vencimiento — no es una tabla, porque una tabla de estado se pudre),{" "}
              <em>Situación</em> = el presente <strong className="text-foreground">interpretado</strong> (nota manual + la lectura que devuelve la IA). El botón{' '}
              <strong className="text-foreground">“✨ Analizar escenarios”</strong> pide a la IA los escenarios del proyecto agrupados por categoría (riesgos / oportunidades / puntos ciegos / wildcard), cada uno con probabilidad (dato secundario), estrategia accionable, justificación e indicador de validación; el más probable sale destacado, y se guarda el <strong className="text-foreground">historial</strong> de todos los análisis (la lectura cambia con los nuevos hechos). El prompt está adaptado de{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fooday-intelligence-core/agents/agente-generador-hipotesis.md</code>. Nueva migration{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0029</code> (2 tablas: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_eventos</code> y{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_analisis</code>), nuevo módulo IA{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/escenarios/analizarEscenariosIA.ts</code> y helper compartido de llamada al LLM{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/llm.ts</code>. La fricción se mantiene baja:{' '}
              <strong className="text-foreground">un solo punto de entrada</strong> (la lista de proyectos) y el ritual semanal del domingo enlaza a{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/escenarios</code> desde{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/semana</code> — no añade pasos. Enlace en el sidebar (Estrategia) y fila nueva en el{' '}
              <strong className="text-foreground">ritual semanal</strong> (domingo, tras planificar).{' '}
              <strong className="text-foreground">FEATURES actualizado</strong> (fila{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/escenarios</code>).{' '}
              <em className="text-muted-foreground">Migración ya versionada: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/0029_escenarios_proyecto.sql</code> (se aplica con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npx supabase db push</code>).</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-26
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Proyectos: botón Editar + fix de &ldquo;tabla vacía&rdquo; al pulsar &ldquo;ver&rdquo; + sección &ldquo;metas sin proyecto&rdquo;.</strong>{" "}
              Tres cambios relacionados con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>:
              <em> (1)</em> cada card de proyecto gana un botón{' '}
              <strong className="text-foreground">Editar</strong> (icono lápiz) que abre un modal ligero con nombre, color, descripción y área (mismos campos que el formulario de creación, precargados con los valores actuales). Al guardar llama a{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">actualizarProyecto</code> ya existente y recarga la lista. Implementación: nuevo componente{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/components/EditarProyectoModal.tsx</code>.{' '}
              <em>(2)</em> al pulsar &ldquo;ver&rdquo; (que navega a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas?proyecto=X</code>) el filtro de estado por defecto era &ldquo;activas&rdquo; y descartaba las tareas hechas/archivadas del proyecto, dejando la tabla vacía en cualquier proyecto ya cerrado o arrastrado en cascada. Fix mínimo: si la URL trae <code className="rounded bg-muted px-1.5 py-0.5 text-xs">?proyecto=X</code>, el filtro se inicializa a &ldquo;todas&rdquo; para que la vista del proyecto sea completa. Sin migración ni cambio en mutaciones (la query de proyecto a tareas ya estaba bien; era solo la preselección de estado en el cliente).{' '}
              <em>(3)</em> abajo del grid de proyectos aparece ahora una sección ámbar{' '}
              <strong className="text-foreground">&ldquo;⚠️ N metas sin proyecto&rdquo;</strong> con las metas huérfanas (aquellas con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_id = null</code>, permitido por migration 0024). Las metas con estado <code className="rounded bg-muted px-1.5 py-0.5 text-xs">archivada</code> se ocultan (no son accionables y solo contaminarían la vista); si todas las huérfanas están archivadas la sección no se muestra, y si hay mezcla aparece un paréntesis <em>&ldquo;(N archivadas ocultas)&rdquo;</em>. Cada meta huérfana se muestra como chip con su dot de color por estado + link a{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle?id=…</code>. El patrón es simétrico al que ya tiene <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/areas</code> para los proyectos sin área.{' '}
              <em>(4)</em> nueva acción <strong className="text-foreground">Eliminar meta</strong> en la card de cada meta en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code> (esquina superior derecha, junto a Editar/WIG/Archivar). El confirm muestra preview del impacto: KRs que quedarán huérfanos + tareas (activas y hechas/archivadas) que se desvincularán + liberación del slot de WIG si lo tenía. Nueva mutación{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">eliminarMeta(id)</code> en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/mutations.ts</code> que aprovecha el{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ON DELETE SET NULL</code> de{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.meta_id</code> y el{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ON DELETE CASCADE</code> de{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">okrs.meta_id</code> /{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hitos.meta_id</code> de migration 0001: las tareas <strong>no se borran</strong>, solo se desvinculan; KRs e hitos se borran. Confirm recuerda explícitamente &ldquo;💡 si quieres dejarla de lado pero recuperarla, usa Archivar&rdquo; para que Archivar siga siendo el camino reversible por defecto.{' '}
              <strong className="text-foreground">FEATURES actualizado</strong>{" "}
              (fila <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>).{' '}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales. Es una mejora de UX en una pantalla de gestión existente.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-blue-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-blue-700 dark:text-blue-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Reordenado el menú Estrategia + nueva página /areas.</strong>{" "}
              Bloque "Estrategia" del sidebar pasa a (en este orden):
              <strong className="text-foreground"> 1. Norte · 2. Áreas · 3. Proyectos · 4. Metas · 5. Agente · 6. Plan trimestral</strong>.
              Las áreas son las áreas de responsabilidad (ya existían en BD, tabla{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">areas</code>{" "}
              migration 0001) y ahora tienen página propia{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/areas</code>{" "}
              estilo /proyectos con CRUD (crear/editar/eliminar + color) +
              listado de proyectos hijos por área + sección "⚠️ proyectos sin área"
              para que David no pierda los huérfanos. Mutaciones nuevas en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/mutations.ts</code>:
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">crearArea()</code>,
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">eliminarArea()</code>{" "}
              (el update de nombre/color va inline en la página; podría
              convertirse en helper dedicado si se reusa). Icono nuevo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">IconLayers</code>{" "}
              añadido al final de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/components/icons.tsx</code>.
              <strong className="text-foreground"> Sin migración nueva</strong>:
              la tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs">areas</code> ya
              tenía políticas RLS (own_insert/own_update/own_delete) y las FKs{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ON DELETE SET NULL</code>,
              así que eliminar un área no rompe proyectos (pasan a "Sin área")
              ni metas ni tareas. FEATURES actualizado (nueva fila /areas bajo
              "Identidad y horizonte"). Sidebar reordenado (bloque 2).
              Regla de sincronización AGENTS.md cumplida en esta sesión.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-blue-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-blue-700 dark:text-blue-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/matriz — vista 2D Eisenhower con drag &amp; drop + IA “Sugerir redistribución”.</strong>{" "}
              Nueva página <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/matriz</code>{" "}
              (debajo de “Prioridad” en el sidebar, bloque Ejecución) que
              distribuye las tareas activas en 4 cuadrantes calculados en
              JS desde <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fecha_fin</code>{" "}
              + <code className="rounded bg-muted px-1.5 py-0.5 text-xs">meta.es_wig</code>.
              <strong className="text-foreground"> Sin migración.</strong> La
              clasificación (urgencia × importancia → cuadrante) vive en
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/tareas/matriz.ts</code>; el
              grid 2×2 con drag &amp; drop en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/components/tareas/MatrizEisenhower.tsx</code>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">@dnd-kit/core</code>, ya
              instalado). El drop reasigna{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">prioridad</code>{" "}
              según el cuadrante destino (Q1→critica, Q2→alta, Q3→media, Q4→baja).
              <br />
              <br />
              <strong className="text-foreground">Botón IA.</strong>{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/tareas/sugerirMatrizIA.ts</code>{" "}
              (patrón <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirPagosIA</code>;
              JSON estricto, saneador que valida Q1..Q4).{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">SugerirMatrizModal</code>{" "}
              con revisión por fila (override del cuadrante), checkbox para
              excluir y batch apply. Mutación nueva{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarPrioridadesTareas()</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/mutations.ts</code>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">Promise.allSettled</code>,
              pasa por <code className="rounded bg-muted px-1.5 py-0.5 text-xs">actualizarTarea</code>{" "}
              para mantener el invariante de RLS).
              <br />
              <br />
              <strong className="text-foreground">UX.</strong>{" "}
              Filtros “solo WIGs-meta” y “solo con fecha”. HelpDrawer
              específico. Si la prioridad manual no coincide con el cuadrante
              calculado, las cards llevan un puntito violeta junto al título.
              Sincronizado con FEATURES y Aplicación pilar 4.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-violet-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-violet-700 dark:text-violet-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Botón IA “✨ Sugerir pagos” en /pagos (migration 0027) + prompt editable en /configuracion.</strong>{" "}
              Nuevo botón en la cabecera de /pagos que llama a la IA con los
              pagos activos y devuelve sugerencias de programación para los
              próximos 6 lunes. Modal de revisión (estilo SugerirWigsModal):
              cada fila muestra el pago actual + fecha sugerida + importe sugerido
              + motivo + checkbox. El usuario marca qué aplicar y pulsa
              “Aplicar N marcadas”. La IA <strong className="text-foreground">solo sugiere</strong>;
              tú decides. Aplica únicamente cambios en
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fecha_pago_programada</code>{" "}
              + pone estado <code className="rounded bg-muted px-1.5 py-0.5 text-xs">programado</code>;
              NO registra pagos parciales (para eso está el flujo normal).
              <br />
              <br />
              <strong className="text-foreground">Prompt editable.</strong>{" "}
              Nueva columna
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">prompt_pagos TEXT</code>{" "}
              en la tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configuracion</code>{" "}
              (migration 0027). Nueva sección “Prompt de pagos (IA)” en
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/configuracion</code>{" "}
              con textarea monoespaciado, botón “Restaurar ejemplo” y contador
              de chars. El prompt por defecto es snowball + ingresos
              viernes/sábado + anticipar vencimientos al lunes anterior.
              Si está vacío en BD, la app usa
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">DEFAULT_PROMPT_PAGOS</code>{" "}
              en runtime (exportado tanto de
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configStore.tsx</code>{" "}
              como de
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirPagosIA.ts</code>;
              si lo cambias, cambia los dos sitios).
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Archivos nuevos: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/0027_configuracion_prompt_pagos.sql</code>,
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/pagos/sugerirPagosIA.ts</code>{" "}
              (buildPrompt + sanear + JSON estricto, mismo patrón que
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">motorPriorizacion.ts</code>),
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">src/components/pagos/SugerirPagosModal.tsx</code>{" "}
              (revisión + checkboxes + per-row apply + batch apply).
              Mutación nueva: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarSugerenciasPagos()</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/pagos/mutations.ts</code>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">Promise.allSettled</code> con
              conteo de aplicadas vs fallidas por RLS).
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">configStore.tsx</code>{" "}
              extendido para hacer upsert del <code className="rounded bg-muted px-1.5 py-0.5 text-xs">prompt_pagos</code>{" "}
              (RLS existente aplica). Actualizado FEATURES (fila
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pagos</code>),
              Aplicación en la app (pilar 3 · Tiempo), este changelog y
              sincronizado con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metodologia</code>{" "}
              §Apéndice Bucle de equilibrio.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-emerald-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Banner mental arriba de /tareas/pendientes-respuesta: «No te preocupes de lo que está pendiente de los demás».</strong>{" "}
              Reframe psicológico (estoico/Covey) sin lógica ni BD: emerald+teal,
              cita a Covey («círculo de influencia vs preocupación») y Epicteto
              («preocúpate solo de lo que depende de ti»). Refuerza la regla
              operativa del panel («el panel debería ser pequeño, tu única acción
              posible es el follow-up») con la regla mental («si hoy no toca,
              déjalo aquí — el panel te lo recordará cuando lleve demasiado
              tiempo esperando»).
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Un único{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;aside role=&quot;note&quot;&gt;</code>{" "}
              encima del título en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/app/tareas/pendientes-respuesta/page.tsx</code>.
              Cero cambio en BD, queries, mutaciones ni estado. Solo JSX + texto.
              Actualizado Pilar 4 («Pendientes de respuesta: lo que NO depende de
              ti»), Aplicación en la app (pilar 4), fila del índice de features
              (FEATURES) y este changelog. Sincronización equivalente en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metodologia</code>{" "}
              §8.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-amber-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-amber-700 dark:text-amber-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/Hoy: nuevo panel ‘Tareas con fecha’ entre los WIGs-tareas y el Plan de hoy.</strong>{" "}
              Panel ámbar que lista las tareas con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">estado=&apos;pendiente&apos;</code>{" "}
              que tengan{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">deadline</code> o{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fecha_fin</code>, ordenadas
              <strong className="text-foreground"> ascendente</strong> por fecha: las vencidas
              arriba del todo (badge rojo “retrasada Xd”), después HOY (badge ámbar),
              después futuras. Cada fila tiene un ☐ para marcar hecha{" "}
              <strong className="text-foreground">inline</strong> (optimista: la fila se
              oculta al instante; si falla, revierte y muestra el error). Si hay más de 8,
              sale un enlace “+N más con fecha en /tareas” al final del panel. Si no hay
              tareas pendientes con fecha, el panel no se pinta (no contamina la pantalla).
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Reutiliza el listado{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">data.pendientes</code>{" "}
              que ya carga <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/</code>{" "}
              desde <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fetchTareas(&apos;pendiente&apos;)</code>:
              cero fetch nuevo, cero cambio en queries.ts. Estado local para el check
              optimista (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">ocultas: Set&lt;string&gt;</code>)
              + reload del fetch global al confirmar. <strong className="text-foreground">FEATURES actualizado</strong>{" "}
              (fila <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/</code>, propósito ampliado)
              y HelpDrawer de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/</code>{" "}
              con un item nuevo en el Pilar 3 (Tiempo).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-violet-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-violet-700 dark:text-violet-300 sm:text-sm">
              2026-10-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Botones IA puntuales: extraer tareas de un email/contexto (/tareas/inbox) y sugerir 3 siguientes acciones (/tareas).</strong>{" "}
              Dos botones nuevos que siguen el mismo principio del botón
              ya existente “Sugerir 3 WIGs” en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>:
              la IA <strong className="text-foreground">solo sugiere</strong>,
              tú editas y confirmas; nunca escribe en la BD sin tu OK.
              <br />
              <br />
              <strong className="text-foreground">(1) /tareas/inbox — “Sugerir tareas con IA”.</strong>{" "}
              Nuevo panel violeta con un <code className="rounded bg-muted px-1.5 py-0.5 text-xs">textarea</code>{" "}
              para pegar un email, un mensaje o un contexto. El botón “Sugerir
              tareas” llama a la IA, que devuelve 1–8 sugerencias de tareas
              accionables (título, descripción opcional, prioridad, motivo
              corto y, si encaja, asociación a un proyecto existente).
              Antes de añadirlas al inbox se muestran en un modal con cada
              fila editable: checkbox para descartar, input para el título,
              textarea para la descripción y select para la prioridad. Solo al
              pulsar “Añadir N tareas” se persisten (vía{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">crearTarea()</code>).
              Si fallan algunas, las que se crearon se quedan y las que no
              se reintentan desde el formulario.
              <br />
              <br />
              <strong className="text-foreground">(2) /tareas — “Sugerir 3 siguientes acciones”.</strong>{" "}
              Nuevo botón en la cabecera, junto al HelpDrawer. Mira{" "}
              <strong className="text-foreground">TODA</strong> la lista
              abierta (tareas con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">estado ≠ &apos;hecha&apos; ∧ &apos;archivada&apos;</code>{" "}
              — incluye inbox, tareas con meta y tareas sueltas) y los{" "}
              <strong className="text-foreground">argumentos</strong> de cada
              una: meta + código, KR, prioridad, deadline, ámbito, tags,
              si es WIG y días que lleva abierta. Pasa también los WIGs
              activos (ancla al foco del ciclo) y los proyectos activos (por
              si la IA quiere sugerir asociación). El prompt pide 3
              acciones concretas para hoy/mañana, con razón mirando esos
              argumentos. Mismo modal de revisión que (1) — la IA sugiere,
              tú editas y confirmas.
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Nuevo módulo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/iaSugerencias.ts</code>{" "}
              con dos funciones puras:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirTareasDesdeContextoIA()</code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sugerirProximasAccionesIA()</code>.
              Reutilizan el parser robusto de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">llm-parser.ts</code>{" "}
              (sin Zod — coherente con el resto del proyecto) y el helper
              de timeout de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ai-timeout.ts</code>.
              El provider, modelo y API key se leen de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">useConfig()</code>{" "}
              (mismo flujo que el resto de botones IA). Nuevo componente
              reutilizable{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/components/SugerenciasTareasModal.tsx</code>{" "}
              que sirve a los dos botones (DRY).{" "}
              <strong className="text-foreground">FEATURES actualizado</strong>{" "}
              (filas <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas/inbox</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas</code>) y
              HelpDrawer de ambas rutas con el item correspondiente.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-13
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Tareas: flag ⏳ “pendiente de respuesta” + panel /tareas/pendientes-respuesta.</strong>{" "}
              Migration 0026. Dos cambios relacionados con el
              “Waiting For” de GTD: (1) las tareas admiten un flag binario
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">pendiente_respuesta</code>{" "}
              (con timestamp
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">pendiente_respuesta_at</code>{" "}
              para ordenar por antigüedad). El flag es un ATRIBUTO SEMÁNTICO
              independiente de <code className="rounded bg-muted px-1 py-0.5 text-xs">estado</code>:
              la tarea puede estar pendiente, en_progreso o hecha; el flag solo
              dice “mi próximo paso depende de que alguien me conteste”. Toggle
              con icono de reloj ⏳ al lado de la diana 🎯 de WIG en cada fila
              de /tareas. (2) Nueva página{" "}
              <Link href="/tareas/pendientes-respuesta" className="font-medium text-foreground underline underline-offset-4">
                /tareas/pendientes-respuesta
              </Link>{" "}
              con todas las que tienen el flag activo, ordenadas por
              antigüedad (las más viejas primero — lo que más probablemente
              se te ha caído del radar). Métricas: total esperando + cuántas
              hechas con flag activo (= probablemente ya respondieron, falta
              destildar) + cuál es la más antigua. Botón
              “✓ Respuesta recibida” para destildar en un click. Entrada
              nueva en el sidebar (Ejecución) con icono de reloj. FEATURES
              actualizado (filas /tareas y /tareas/pendientes-respuesta).{" "}
              <em className="text-muted-foreground">Sin cambios de rituales.
              Es un nuevo patrón arquitectónico: lo que NO depende de ti
              se gestiona aparte para no contaminar la lista principal.
              Sección “Pendientes de respuesta” añadida al Pilar 4, y nueva
              SECCIÓN 8 en /metodologia (“Lo que NO depende de ti: panel
              de pendientes de respuesta”).</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-24
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Exportar proyecto a PDF desde /proyectos.</strong>{" "}
              Cada card de proyecto tiene ahora un botón{' '}
              <strong className="text-foreground">“PDF”</strong> con icono de archivo que abre un modal de <strong className="text-foreground">vista previa</strong> con el documento estructurado:{" "}
              <em>(1) portada con nombre, área, color, totales y fecha de generación;</em>{' '}
              <em>(2) contexto general: descripción, estado (activo/archivado), color, totales;</em>{' '}
              <em>(3) metas hijas con sus KRs (resultados_periodo) y las tareas dentro de cada KR;</em>{' '}
              <em>(4) tareas no recurrentes del proyecto;</em>{' '}
              <em>(5) tareas recurrentes.</em>{' '}Las secciones 4 y 5 listan{' '}
              <strong className="text-foreground">todas las tareas</strong>, hechas y no hechas (las hechas aparecen tachadas para distinguirlas a simple vista), ordenadas por estado y luego por fecha de creación. El modal tiene un botón{" "}
              <strong className="text-foreground">“Imprimir / Guardar PDF”</strong> que dispara el diálogo nativo del navegador (doble{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">requestAnimationFrame</code> para evitar problemas de timing); el usuario elige “Guardar como PDF” en el desplegable de destino. Cero librerías externas (sin jsPDF ni html2canvas), todo CSS nativo:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">@media print</code> en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">globals.css</code> oculta el chrome del modal (toolbar, backdrop, scroll) y deja solo el reporte en formato A4. Implementación: nuevo componente{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ProyectoReport</code> + componente modal{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ReporteModal</code> dentro de{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/app/proyectos/page.tsx</code> + helper{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">cargarDatosProyectoParaReporte</code> en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/exportarProyecto.ts</code> que hace 6 queries en paralelo (proyecto, metas del proyecto, todos los resultados_periodo, periodos, todas las tareas del proyecto, áreas) y las agrupa en cliente. FEATURES actualizado (fila /proyectos).{' '}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales. Es una nueva capacidad: el humano puede “ver el proyecto entero de un vistazo” y exportarlo a PDF sin abrir cada sección de la app.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-23
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Botón "✨ Generar tareas con IA" dentro de cada KR en /metas/detalle.</strong>{" "}
              Hasta ahora el único flujo de generación por IA regeneraba el plan entero (KRs + tareas + hábitos). Si un KR ya estaba creado pero sin tareas, o si querías ampliarlo, no había botón granular: o regenerabas todo, o escribías las tareas a mano. Ahora cada tarjeta de KR tiene su propio botón{' '}
              <strong className="text-foreground">"Generar tareas con IA"</strong> que llama a un nuevo helper{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarTareasParaKrIA</code> en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/plan.ts</code>. Ese helper: (1) pide a la IA SOLO las tareas de ese KR, con la meta, la métrica, la unidad temporal y el contexto del proyecto padre (mismo que el plan completo); (2) le pasa la lista de tareas ya existentes para que no repita ninguna; (3) deduplica de nuevo en el cliente (case-insensitive, trim); (4) materializa cada tarea con{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">crearTareaConIA</code> +{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">setRecurrencia</code> (mismos helpers que el apply del plan completo — sin reinventar nada). Reutiliza el pipeline robusto:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">llamarLLM</code> +{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">extraerJSON</code> +{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">saneKrsFromParsed</code>, con nuevo esquema{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ESQUEMA_TAREAS_KR</code> que valida la estructura de respuesta. Estado local en la tarjeta: muestra progreso ("Generando…", "Creando N tareas…", "Listo: N tareas") y errores inline. Si la IA no propone tareas nuevas, se lo decimos al usuario en vez de presentar un éxito vacío. El contexto del proyecto se calcula una sola vez en el componente padre (useMemo) y se comparte con el botón "Generar plan completo", evitando duplicación de código.{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-22
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Fix raíz: unidades_disponibles en /metas/detalle y single-source-of-truth en generarPlanMetaIA.</strong>{" "}
              El bug{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">raw_krs=9, saneados=0</code>{" "}
              se reproducía en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code> porque esa página llamaba a{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarPlanMetaIA</code> sin pasar{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">unidades_disponibles</code>. Solución: (1) nuevo helper
              reutilizable <code className="rounded bg-muted px-1.5 py-0.5 text-xs">construirUnidadesParaPlan</code> en{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/plan.ts</code> — meses del rango si hay fechas, 4
              trimestres si no. (2) <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarPlanMetaIA</code> ahora
              siempre deriva las unidades internamente si el caller no las pasa, garantizando que el prompt y el saneador usen
              EXACTAMENTE la misma lista. (3) <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code> usan el helper compartido (DRY).
              Bonus: log mejorado cuando <code className="rounded bg-muted px-1.5 py-0.5 text-xs">saneados=0</code> muestra
              unidades pedidas vs aceptadas (causa clara), y las funciones lanzan error si la IA no devolvió KRs válidos
              en vez de presentar un plan vacío como éxito.{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">contexto_proyecto</code>{" "}
              se pasa también desde la página de detalle cuando la meta pertenece a un proyecto (sin inventar asociaciones).{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/sw.js</code> v2→v3: no cachea navegaciones con
              query params y devuelve 504 explícito en offline en vez de{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Response.error()</code> críptico.{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configStore</code>: logs con{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">code/message/details/hint</code> de Supabase (sin
              filtrar API key) y detección de RLS bloqueante (upsert con 0 filas). Tests nuevos:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plan-unidades.test.mjs</code> (15 casos) +{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">llm-retry.test.mjs</code> (8 casos) +{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configStore.test.mjs</code> (4 casos).{' '}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-21
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Refactor: parser y validación LLM + contexto de proyecto + dedupe de tareas.</strong>{" "}
              Tres bloques: (1) nuevo módulo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/llm-parser.ts</code>{" "}
              centraliza la extracción del JSON de la respuesta del LLM
              (limpieza de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;think&gt;</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">```</code>, razonamiento,
              balanceo de llaves sin regex frágiles) y añade un
              validador de esquema manual (sin dependencias) con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ESQUEMA_PLAN_META</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ESQUEMA_CLASIFICADOR</code>.{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">llamarLLM</code> usa este
              parser y valida contra esquema cuando se le pasa uno.
              Si la validación falla, lanza{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">LLMSchemaError</code> con
              qué campo falló. (2) el agente pasa el contexto del
              proyecto padre a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarPlanMetaIA</code>{" "}
              (nombre, descripción, área). Esto evita que la IA
              malinterprete palabras ambiguas: “local” en un proyecto
              de pizzería = local comercial para pizzería, no un bar
              genérico. (3) dedupe de tareas por título normalizado en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarKrsYTareasEnMeta</code>:
              si una tarea con el mismo título ya existe, no se crea
              de nuevo. Protege contra reintentos. Tests:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/llm-parser.test.mjs</code>,{" "}
              31 casos — 31/31 pasan.{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-rose-700 dark:text-rose-300 sm:text-sm">
              2026-10-20
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Bugfix: timeout IA 45s→90s + detección de plan vacío (éxito falso).</strong>{" "}
              Síntoma: David vio en consola <code className="rounded bg-muted px-1.5 py-0.5 text-xs">[Agente] ❌ plan falló para "...": La IA no respondió a tiempo (más de 87s, prompt de 4159 chars)</code>{" "}
              en 2 de 4 metas, y las otras 2 marcaban <code className="rounded bg-muted px-1.5 py-0.5 text-xs">✅ 0 KRs + 0 KRs + 0 tareas</code>{" "}
              — éxito falso porque la IA devolvía <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{"{krs: []}"}</code> y
              el motor no lanzaba error. Dos fixes: (a){" "}
              <strong className="text-foreground">ai-timeout.ts</strong>: base
              45s→90s, ratio 1s/100ch→1.5s/100ch, max 180s→240s. Para
              prompts de 4-5KB ahora se permite hasta 153s en vez de 87s.
              (b) <strong className="text-foreground">/agente</strong>:
              tras llamar a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarPlanMetaIA</code>,
              si <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plan.krs.length === 0</code>{" "}
              Y la meta no tenía KRs previos, marcamos el plan como
              fallido (error explícito en el panel diagnóstico) en vez
              de reportar <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0 KRs</code>{" "}
              como si fuera un éxito. Esto permite distinguir “la IA no
              generó nada” de “la meta ya estaba bien y no hacía falta
              añadir más”. Si David ve el plan vacío persistente, lo
              lógico es reintentar la generación clicando otra vez en
              Aplicar (las metas ya están creadas, así que la fase 2 se
              vuelve a intentar sola).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-rose-700 dark:text-rose-300 sm:text-sm">
              2026-10-19
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Bugfix reloj desincronizado (PGRST303 / JWT issued at future).</strong>{" "}
              Síntoma: David reportó que el agente creaba las metas pero
              no generaba las tareas ni los hábitos. Causa raíz: el
              reloj de su dispositivo estaba adelantado respecto al
              servidor PostgREST; los JWT que se firman localmente
              aparecen como del futuro y Supabase los rechaza con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PGRST303</code>{" "}
              (RLS evalúa <code className="rounded bg-muted px-1.5 py-0.5 text-xs">auth.uid()</code>{" "}
              = null). Resultado: las queries de lectura fallaban en
              todas las pantallas y los inserts de la fase 2 (plan
              completo) se abortaban silenciosamente en el catch del
              bucle. Solución: nuevo store global{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/clockSkew.ts</code>{" "}
              que detecta PGRST303 / JWT future / clock skew en
              cualquier error de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">useData</code>{" "}
              y reporta un banner sticky arriba de toda la app
              (AppShell) con la solución. Además, el panel de
              diagnóstico del agente muestra un banner ámbar específico
              si el flujo de aplicar detectó el problema (motivo
              exacto, no genérico). La solución real sigue siendo
              arreglar el reloj del dispositivo: <strong className="text-foreground">ajustes
              → fecha y hora → automático</strong>. FEATURES
              actualizado (fila /agente, propósito ampliado con
              mención del clock skew).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-18
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/docs: glosario “la casa de tus objetivos” + /metas/detalle: botón ✨ Generar plan con IA.</strong>{" "}
              Dos cambios: (1) nueva sección <strong className="text-foreground">“Glosario · Arquitectura en 4 capas”</strong> al
              principio de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/docs</code> con
              la metáfora casa/habitación/mueble/tarea/hábito explicada sin
              jerga, más una subsección que aclara cómo encaja el botón IA
              de cada capa (/agente → /metas/nueva+EditarMetaModal → KR
              concreto). (2) el botón <strong className="text-foreground">“✨ Generar plan con
              IA”</strong> ya estaba en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code> y en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">EditarMetaModal</code>,
              pero faltaba en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>{" "}
              — que es donde David más tiempo pasa mirando una meta ya
              creada. Ahora al pulsar genera KRs+tareas+hábitos para esa
              meta concreta, respeta KRs existentes (no duplica, les añade
              tareas) y respeta el rango real (migration 0025) si lo
              tiene. FEATURES actualizado (fila /metas/detalle añadida).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales. La
              respuesta a “cómo creo las tareas a partir de la meta” ahora es
              obvia: agente → botón IA en la meta.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-17
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/metas: botón archivar en cada card + filtro "🗄️ Archivadas".</strong>{" "}
              Antes la única forma de archivar una meta era entrar a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">EditarMetaModal</code>{" "}
              y cambiar el estado. Ahora cada card de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>{" "}
              tiene un tercer botón (icono de archivador) al lado del
              lápiz y de la WIG. Pulsarlo archiva la meta (estado
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs"> archivada</code>); la
              meta desaparece del listado por defecto y aparece en el
              nuevo filtro “🗄️ Archivadas” de la barra de ámbito. La
              meta archivada deja de contar para WIGs (3/3 libres
              otra vez) pero sus KRs y tareas NO se archivan
              automáticamente — eso se hace desde sus propias pantallas
              (consistente con el principio de “arrastrar la cascada es
              decisión humana, no implícita”). El confirm avisa del
              alcance (“tus N KRs y M tareas NO se archivan
              automáticamente — hazlo desde sus pantallas si quieres”).
              FEATURES actualizado (fila /metas).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-16
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Plan completo en /agente + archivado en cascada en /proyectos.</strong>{" "}
              Tres cambios alineados con la regla “plan entero o nada”: (1){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code>{" "}
              ahora genera el plan completo (KRs + tareas + hábitos) en una
              segunda fase automática, una llamada a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">generarPlanMetaIA</code>{" "}
              por meta (reutiliza el motor ya testeado de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">EditarMetaModal</code>), con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">saltarExistentes=true</code>{" "}
              para no duplicar el KR inicial. Si una meta falla, las otras
              siguen; el panel diagnóstico del árbitro (sesiones
              anteriores) lista por meta cuántas KRs+tareas se generaron
              y el motivo del fallo si lo hubo. Spinner en el botón
              Aplicar muestra “Generando plan para meta N/M…”. Resumen
              final en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sessionStorage</code>{" "}
              para que el detalle de la primera meta lo muestre como
              banner. (2){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>{" "}
              archiva en cascada: al archivar un proyecto se archivan
              sus metas hijas + las tareas de esas metas + las tareas
              asignadas directamente al proyecto. La función nueva{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">archivarProyectoEnCascada</code>{" "}
              (en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">mutations.ts</code>)
              respeta metas/tareas ya completadas o hechas (no se
              revierte el progreso) y devuelve el conteo para que la UI
              lo muestre en el confirm. (3) Tanto archivar como
              eliminar tienen confirm con preview de impacto (“esto
              arrastrará N metas y M tareas”). Eliminar sigue con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ON DELETE SET NULL</code>{" "}
              de la FK (las metas quedan huérfanas pero vivas, no se
              borra nada físicamente). FEATURES actualizado (filas
              /agente y /proyectos).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales. El
              proyecto, la meta, los KRs y las tareas siguen siendo las 4 capas del modelo;
              ahora el agente las crea todas en una sola transacción y el ciclo de vida del
              proyecto es coherente (archivar arrastra, eliminar avisa).</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/proyectos: card del proyecto ahora lista las metas hijas (migration 0024).</strong>{" "}
              Antes la página <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>{" "}
              solo mostraba el conteo de tareas por proyecto. Si el agente creaba un proyecto con 4
              metas hijas (caso real: “Renegociar el alquiler de Sol de Nit”), las metas vivían en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code> como cards sueltas sin
              agrupación visible — el humano tenía que recordar qué metas colgaban de qué proyecto.
              Ahora cada card de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>{" "}
              lista sus metas hijas con: dot de estado (sin empezar / en progreso / bloqueada /
              completada / archivada), código + título clicable a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>{" "}
              y marcador de WIG si la meta está marcada como foco. Implementación: una query
              adicional a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fetchMetas()</code> y
              agrupación en cliente por <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyecto_id</code>{" "}
              (las metas sin proyecto se ignoran aquí). FEATURES actualizado (fila /proyectos).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Migración 0025: rango real en las metas (fin del sesgo a 4 trimestres).</strong>{" "}
              Los tres huecos que veías en el planificador —(1) propuesta cerrada a Q1–Q4 aunque estuviéramos en Q4; (2) metas pequeñas de 2 semanas infladas a 4 trimestres, metas grandes de 6+ meses comprimidas; (3) imposibilidad de bloquear una fecha como dura— quedan cerrados con dos date inputs reales en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>{" "}
              (inicio con default hoy, límite opcional) y un checkbox “🔒 Fecha crítica”. El motor del planificador (en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/plan.ts</code>
              ) trabaja ahora con <em>unidades de tiempo</em> (trimestre <em>o</em> mes), no solo trimestres: si la meta cabe en un mes devuelve 1 mes; si dura 8 meses devuelve 8. El campo libre{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plazo</code>{" "}
              (texto) se conserva por compat pero ya no es la fuente de verdad. Migration nueva:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0025_metas_fecha_inicio_fin_bloqueada.sql</code>{" "}
              añade <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.fecha_inicio_meta</code>{" "}
              (date) y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.fecha_fin_bloqueada</code>{" "}
              (bool default false), más la RPC{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ensure_periodos_meses(anio, mes_inicio, mes_fin)</code>{" "}
              que crea periodos mensuales idempotentemente. Helpers exportados nuevos:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">parsearMesesDeRango()</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ensurePeriodosMeses()</code>{" "}
              (mutations). El tipo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">KrGenerado</code>{" "}
              sustituye <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trimestre</code>{" "}
              fijo por <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{`{ unidad_tiempo: 'trimestre' | 'mes', trimestre?: 1..4, mes?: 1..12 }`}</code>; el viejo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trimestres_usados</code>{" "}
              pasa a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">unidades_usadas: Array&lt;{`{unidad, numero}`}&gt;</code>. Los tres callers de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarKrsYTareasEnMeta()</code>{" "}
              (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/agente</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">EditarMetaModal</code>) ya están migrados: limpian periodos, construyen un <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Map&lt;"trimestre:N"|"mes:N", {`{id, tipo}`}&gt;</code> y materializan el plan de forma uniforme. El preview{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PlanMetaGeneradoPreview</code>{" "}
              pinta la etiqueta de unidad correcta (Q1 o “Mayo 2026”). Prompt del planificador reescrito para soportar meses, hard constraint y múltiples unidades; cuando <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fecha_fin_bloqueada</code>, añade la línea “NINGÚN KR puede planificar trabajo después de la fecha límite”. FEATURES actualizado (fila /metas/nueva con la nueva propuesta + hard constraint) y Pilar 2 reescrito (“Alcance temporal: rango real [inicio, fin]”) explicando por qué dejar de forzar 4 trimestres. Lo que sigue fuera de scope: botón “🔄 regenerar este KR” (sesión 2), calendario de disponibilidad (Abril, festivos), reajustar plan completo con histórico. Esta entrada es la única obligatoria de AGENTS.md.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-13
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Agente unificado en /agente + auditoría de metas en /metas/auditoria + migration 0024.</strong>{" "}
              Cuatro cambios: (1) la entrada oficial del agente pasa a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code>{" "}
              (atajo: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Sidebar</code>{" "}
              → bloque 2 y botón en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>).
              La IA CLASIFICA primero la idea en
              {" "}<strong className="text-foreground">proyecto</strong> /{" "}
              <strong className="text-foreground">meta</strong> /{" "}
              <strong className="text-foreground">captura</strong>{" "}
              y propone la estructura adecuada (proyecto + N metas hijas
              con su KR inicial y fecha objetivo, o meta sola, o
              “déjalo en el inbox”). El humano revisa y aplica. /metas/agente
              sigue existiendo como atajo para “crear meta directamente”; (2)
              nueva página{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/auditoria</code>{" "}
              con tabla semáforo por meta (área, proyecto, fecha objetivo,
              contexto, situación actual, KRs) ordenada por “más huecos primero”.
              Click en cualquier ❌ abre el editor rápido; (3) migration{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">0024_metas_proyecto_contexto.sql</code>{" "}
              añade <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.proyecto_id</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.fecha_objetivo</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.contexto</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas.situacion_actual</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">proyectos.area_id</code>;
              (4) el editor de meta y el alta de proyecto exponen los
              nuevos campos (los 4 de meta van en un bloque plegable
              “Clasificación y contexto” para no saturar).{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">FEATURES</code>{" "}
              actualizado con 2 filas (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/auditoria</code>) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/agente</code>{" "}
              reetiquetado como atajo. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AGENTS.md</code>{" "}
              no se toca (regla de sincronización: la regla “docs ↔ app
              sincronizadas” ya cubre este caso).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/informes: subtareas cuentan + chart tareas/subtareas por día/semana.</strong>{" "}
              Tres cambios en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code>
              : (1) nueva query{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fetchSubtareasHechas(dias)</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/queries.ts</code>{" "}
              que trae las subtareas con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hecho = true</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">updated_at</code>{" "}
              en la ventana (trigger <code className="rounded bg-muted px-1.5 py-0.5 text-xs">set_updated_at</code>{" "}
              como proxy, mismo patrón que metas/KRs); (2) nueva KPI “Subtareas hechas” en violeta, heatmap “Actividad por día” que suma tareas + subtareas/3 (una subtarea pesa ⅓ de tarea) y racha que ya no se rompe cuando solo se cierran subtareas — los días con micro-progreso dejan de verse vacíos; (3) nuevo chart “Tareas y subtareas por día/semana” con barras apiladas (verde = tareas, violeta = subtareas), granularidad diaria para 7/30/90 días y semanal (lunes a domingo) para 1 año. El grid de KPIs pasa a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">xl:grid-cols-7</code>{" "}
              para acomodar la nueva tarjeta. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">HelpDrawer</code>{" "}
              añade un ítem “Subtareas también cuentan como progreso” en la ruta. Actualizado el índice de features (FEATURES) y este changelog.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-11
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Botón IA “Generar plan” respeta el campo plazo.</strong>{" "}
              El botón “✨ Generar plan con IA” en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>{" "}
              y en el editor rápido de meta (lápiz desde{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>)
              ahora interpreta el campo libre{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">plazo</code>{" "}
              y SOLO genera KRs en los trimestres que implica. Formatos aceptados:
              {" "}<code className="rounded bg-muted px-1.5 py-0.5 text-xs">Q3</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Q3 2026</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">2026-Q3</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Q1-Q3</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Q1, Q3</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fin de 2026</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">trimestre 3</code>…
              Si está vacío, fallback a los 4 trimestres. La lógica vive en la nueva función exportada{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">parsearTrimestresDePlazo()</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/plan.ts</code>{" "}
              y se aplica también al{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/agente</code>{" "}
              (la IA propone el <code className="rounded bg-muted px-1.5 py-0.5 text-xs">meta_plazo</code> y los KRs del plan se filtran a ese plazo). Se ha añadido un hint visual en el input de plazo con los formatos soportados. Pilar 2 (“Metas específicas”) ahora incluye un punto nuevo sobre “Alcance temporal: campo plazo”, su “Cómo se aplica en la app” menciona el filtrado por plazo, y el índice FEATURES actualiza la fila de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>.
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metodologia</code>{" "}
              §3 menciona también la regla plazo → trimestres en su aplicación de WIGs.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-rose-700 dark:text-rose-300 sm:text-sm">
              2026-10-11
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Bugfix por toda la app (8 bugs).</strong>{" "}
              Sin cambios de UX: todo arregla comportamiento incorrecto.
              (1) El widget de la home <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pagos</code> consultaba
              el DOMINGO en vez del lunes en husos UTC+ (España) porque{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">setHours(0,0,0,0) + toISOString().slice(0,10)</code>{" "}
              cruza a UTC; ahora se usa <code className="rounded bg-muted px-1.5 py-0.5 text-xs">localYMD()</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/semana.ts</code>. Mismo bug en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PagosLista</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PagoFormModal</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PagosNotificaciones</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">inicioDeSemana()</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code>, el filtro{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hoy()</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pomodoroStore</code>, el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">default fecha</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">registrarPago</code>, los{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">HOY</code> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/estatus</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/estatus/nuevo</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario/historico</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pipeline</code>, las queries de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/queries.ts</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/pagos/queries.ts</code> y la recurrencia{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">siguienteFechaRecurrencia()</code> en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/mutations.ts</code>. (2) El pomodoro
              <strong> duplicaba sesiones</strong>: cerrar el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PostFocusDialog</code> dejaba{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">endAt=0</code> y al pulsar Reanudar se
              llamaba a <code className="rounded bg-muted px-1.5 py-0.5 text-xs">onFaseTerminada()</code> (que graba
              sesión); ahora reanuda con la duración de la fase. (3){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">elegirMicroAccion</code> criterio 1 era
              código muerto (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">racha === 0</code> justo
              cuando <code className="rounded bg-muted px-1.5 py-0.5 text-xs">rota</code> es true); añadido{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">rachaPrevia</code> a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">RachaHabito</code> y el criterio 1 ya
              dispara de verdad. (4){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">parsearTrimestresDePlazo()</code> perdía
              trimestres en plural/listas:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">"2º y 3º trimestre" → [3]</code> (Q2
              silenciado) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">"trimestres 2 y 3" → [1,2,3,4]</code>; ahora
              acumula ordinales y soporta plural/listas. (5) Parser de PDF: la etiqueta{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">"De"</code> casaba dentro de "Desde:" y
              metía <code className="rounded bg-muted px-1.5 py-0.5 text-xs">"sde: mi banco"</code> como proveedor
              (añadido <code className="rounded bg-muted px-1.5 py-0.5 text-xs">\b…\b</code>); además{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">extraerTextoPDF</code> ya detecta saltos de
              línea por coordenada Y cuando los PDFs no marcan{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hasEOL</code>. (6) ~11 mutaciones de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/mutations.ts</code> ignoraban el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">error</code> de Supabase y mentían a la UI
              (RLS/red): <code className="rounded bg-muted px-1.5 py-0.5 text-xs">marcarHecha</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">reabrirTarea</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">archivar/desarchivar/eliminarTarea</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">crearCaptura</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">marcarSubtareaHecha</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">marcarTareaPlanHecha</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">guardarNotasPlan</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">actualizar/eliminarBorrador</code> — ahora
              todas lanzan error. (7) <code className="rounded bg-muted px-1.5 py-0.5 text-xs">configStore</code>{" "}
              podía borrar la API key local si el upsert best-effort de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">save()</code> fallaba: el remoto con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">key: null</code> pisaba local; ahora solo
              sobrescribe si el remoto trae key o no tenemos local. (8) Menores: flash de tema en dark (ahora hay
              un script inline en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">layout.tsx</code> que
              aplica la clase <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.dark</code> antes del primer
              paint) y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">useData</code> ya marca{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">loading: true</code> al recargar por cambio
              de deps (antes pintaba datos viejos como frescos).{" "}
              <em className="text-muted-foreground">No se han añadido/modificado pantallas, hábitos, rituales
              ni reglas de metodología, así que el índice FEATURES y los rituales no cambian. Esta entrada es
              la única actualización obligatoria del AGENTS.md.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-rose-700 dark:text-rose-300 sm:text-sm">
              2026-10-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Bugfix /agente: hipótesis JWT transitorio como causa raíz + panel diagnóstico visible sin DevTools.</strong>{" "}
              Síntoma original (2026-10-11) sigue: con un proyecto de 4 metas hijas el bucle persistía solo 1
              y redirigía al detalle. El árbitro de la sesión anterior NO lo resolvió. Nueva hipótesis
              (no confirmada todavía, pero altamente probable): el JWT está cerca de expirar cuando David
              pulsa <em>Aplicar</em>, el 1º INSERT pasa con el token viejo aún válido,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">autoRefreshToken</code> se dispara
              entre INSERTs, y los siguientes fallan con RLS (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">owner_id = auth.uid()</code>{" "}
              devuelve <code className="rounded bg-muted px-1.5 py-0.5 text-xs">null</code> durante el
              refresh). Mitigación: (a) antes del bucle, <strong className="text-foreground">forzar{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase.auth.getSession()</code></strong>{" "}
              para serializar el refresh y garantizar sesión estable; (b) entre INSERTs,{" "}
              <strong className="text-foreground">backoff de 50&nbsp;ms</strong> (cede el event loop para
              que el refresh se complete); (c) si el gap sigue, el panel rojo/ámbar del árbitro (sesión
              anterior) ahora muestra el mensaje de error de Supabase exacto — David puede copiarlo y
              mandarlo sin abrir DevTools. FEATURES actualizado (fila /agente, propósito ampliado).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales. Si la hipótesis
              es correcta, el bug queda cerrado; si no, el panel de diagnóstico nos dará la causa real en el
              próximo intento de David.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-rose-700 dark:text-rose-300 sm:text-sm">
              2026-10-11
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Bugfix /agente: aplicar solo persistía 1 meta de N + árbitro adversarial.</strong>{" "}
              Síntoma: con un proyecto de 4 metas hijas (caso real: “Renegociar el alquiler de Sol de Nit”),
              al pulsar <em>Aplicar</em> solo quedaba guardada la primera y la app redirigía al detalle de esa,
              dando la falsa sensación de éxito. Causa exacta no aislada todavía (el bucle tenía{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">try/catch</code> por meta y las mutaciones
              son correctas, así que sospechamos un throw no catalogado del propio cliente Supabase o un lock
              transitorio de RLS). Solución adoptada, alineada con la regla del proyecto
              &ldquo;100% generado por el agente debe quedar guardado&rdquo;: (a) bucle con{" "}
              <strong className="text-foreground">2 pases</strong> — pase 1 crea todas las metas en serie, pase
              2 reintenta UNA vez las que no se pudieron crear; (b) cada intento se loguea con prefix{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">[Agente]</code>{" "}
              para diagnóstico sin DevTools; (c) un{" "}
              <strong className="text-foreground">árbitro adversarial</strong> al final compara
              esperadas vs creadas y, si hay gap, NO redirige — muestra panel rojo con los nombres de las
              metas que faltan y el motivo exacto del fallo; (d) si todo OK redirige; si hay KR fallido (sin
              periodo resoluble) pero todas las metas creadas, muestra panel ámbar con la lista. FEATURES
              actualizado (fila /agente, propósito ampliado).{" "}
              <em className="text-muted-foreground">Sin cambios de metodología ni rituales.</em>
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-10
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">/informes: metas y OKRs cerrados + comparación con plan vs sin plan.</strong>{" "}
              Tres bloques nuevos al final de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code>:
              (1) dos KPIs en violeta — “Metas cerradas” y “OKRs (KRs)
              cerrados” — que respetan el selector de ventana (7/30/90/365);
              (2) dos secciones con listas de metas y KRs cuyo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">estado = &apos;completada&apos;/&apos;completado&apos;</code>{" "}
              y cuyo <code className="rounded bg-muted px-1.5 py-0.5 text-xs">updated_at</code>{" "}
              cae en la ventana (el trigger{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">set_updated_at</code>{" "}
              se dispara al cerrar); (3) “Plan trimestral: ¿cuántas metas
              tienen KRs?” — barras comparativas con % de metas con al
              menos un <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>{" "}
              vs metas aspiracionales sin KRs, y desplegable con el
              listado de las que faltan para animar a materializar el plan
              (botón ✨ Generar plan con IA en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>).
              Actualizado el índice de features (FEATURES) y este changelog.
              Añadidos los campos opcionales{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">updated_at?</code>
              /<code className="rounded bg-muted px-1.5 py-0.5 text-xs">created_at?</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Meta</code>{" "}
              y <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ResultadoPeriodo</code>{" "}
              (las queries ya hacían <code className="rounded bg-muted px-1.5 py-0.5 text-xs">select(&quot;*&quot;)</code>
              , solo faltaba tiparlos).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-09
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Botón IA en EditarMetaModal.</strong>{" "}
              El botón “✨ Generar plan con IA” que ya existía en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>{" "}
              ahora también aparece en el editor rápido de cada meta (el modal
              que se abre desde el lápiz de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>{" "}
              y desde <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>).
              Materializa el plan sobre la meta ya existente: crea los KRs que
              falten en cada trimestre y suma las tareas al KR correspondiente
              (los trimestres que ya tengan KR se respetan). Por contrato, la
              meta <strong className="text-foreground">no se marca como
              completada</strong>. Refactor menor: la lógica de aplicar plan
              vive ahora en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarKrsYTareasEnMeta()</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/lib/plan.ts</code>{" "}
              y la comparten ambos flujos.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-08
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Panel WIGs en /tareas.</strong>{" "}
              Nuevo componente{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PanelWigTareas</code>{" "}
              que muestra, encima de la tabla de tareas, las 1–3 tareas marcadas
              como Enormemente Importantes (cap independiente del panel de
              metas). Mismo patrón que{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">PanelWig</code>{" "}
              en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>:
              contador N/3, lista con título/ámbito/prioridad y botón Quitar.
              El backend (RPC{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">toggle_tarea_wig</code>{" "}
              + columnas <code className="rounded bg-muted px-1.5 py-0.5 text-xs">es_wig</code>/
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">wig_orden</code>) ya
              existía; solo faltaba el panel en esta pantalla. Actualizado
              índice de features, FEATURES de /docs y metodología §3
              (“Dónde se ven y cómo se marcan en la app”).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-07
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Tres funciones IA nuevas + UX hábitos.</strong>{" "}
              (1) <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code> ahora tiene un botón "✨ Generar plan con IA" que propone KRs por trimestre + tareas (incluyendo recurrencia) usando el contexto del título+descripción. (2) <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>{" "}
              tiene un botón "✨ Sugerir 3 WIGs" que devuelve texto (no escribe en BD) y un botón "Agente" que lleva a la nueva ruta. (3) Nueva ruta{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/agente</code>: textarea libre donde David cuenta qué quiere conseguir, la IA devuelve meta+descripción+plan, el usuario revisa y aplica. Nuevo componente <code className="rounded bg-muted px-1.5 py-0.5 text-xs">RecurrenciaChip</code>{" "}
              que distingue visualmente hábitos de tareas puntuales en TasksTable y /metas/detalle. Cada tarjeta de meta ahora muestra un badge "📊 N KRs · M trimestres".
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2025-10-07
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Selector de meta y KR en CrearModal/EditarModal.</strong>{" "}
              Las tareas ahora se asignan a su meta y KR (resultado del trimestre)
              directamente al crear/editar, sin tener que pasar por{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas/inbox</code>.
              La derivación meta_id desde KR está centralizada en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">crearTarea</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">actualizarTarea</code>{" "}
              (mismo invariante que el chokepoint{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">asignarTareaResultado</code>).
              El inbox queda como triaje residual. Corregida también la fila
              Lag/Lead en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metodologia</code>{" "}
              (antes mencionaba <code className="rounded bg-muted px-1.5 py-0.5 text-xs">okrs</code>/
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">key_results</code>, ahora
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas</code>+
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">periodos</code>+
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2025-10-07
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Sistema de sincronización docs ↔ app.</strong>{" "}
              Añadidos 3 bloques meta: "Cómo se mantiene este documento
              actualizado" (regla de sincronización), "Índice de features
              documentadas" (mapa de las 27 rutas) y este "Registro de
              cambios". Regla equivalente añadida a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AGENTS.md</code>.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2025-10-07
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Pasada retro del índice.</strong>{" "}
              Las 27 rutas existentes quedan indexadas con su propósito y la
              sección de la doc donde se explican. Pantallas sin sección
              dedicada (proyectos, configuración, login, sub-rutas) marcadas
              como "HelpDrawer" o "sub-ruta".
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2025-10-07
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Añadido bloque "Rituales de uso".</strong>{" "}
              Nuevo bloque con ritual diario (5 micro-acciones), ritual
              semanal (1 acción por día, lunes{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pagos</code>{" "}
              marcado como estricto), ritual mensual (revisión profunda de
              OKR) y 3 hábitos innegociables.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-amber-700 dark:text-amber-400 sm:text-sm">
              2025-10-15
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Migration 0028 — KR separado del trimestre.</strong>{" "}
              Bug histórico: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">unique(meta_id, periodo_id)</code> en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>{" "}
              forzaba “1 KR por trimestre”. David reportaba “solo puedo poner
              un KR por meta”. Refactor: la tabla{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo</code>{" "}
              ahora modela el KR (sin trimestre). La asignación a 1..N
              trimestres/meses se hace en la nueva tabla puente{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">kr_periodos</code>.{" "}
              <strong className="text-foreground">Ya puedes tener N KRs por meta, y cada KR puede vivir en varios trimestres.</strong>{" "}
              Tareas siguen en <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tareas.resultado_periodo_id</code>{" "}
              apuntando al KR (la columna se mantiene; el nombre es legacy).
              UI: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/detalle</code>{" "}
              permite seleccionar 1..N trimestres al añadir un KR;{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/plan</code>{" "}
              muestra todos los KRs de cada trimestre (puede haber varios).
              IA: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">aplicarKrsYTareasEnMeta</code>{" "}
              ahora deduplica por TÍTULO del KR (no por trimestre). Seed nuevo:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">001b_seed_metas_2026_kr.sql</code>{" "}
              (sustituye al 001 legacy, que queda documentado como
              pre-0028). <strong className="text-foreground">Acción manual</strong>:{" "}
              <strong className="text-foreground">ninguna</strong> — la migración ya está
              versionada en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/0028_kr_separado_de_trimestre.sql</code>{" "}
              y se aplica con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npx supabase db push</code>.
            </span>
          </li>
        </ul>
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
      "Botón IA “Generar plan con IA” en /metas/nueva y EditarMetaModal: filtra KRs por el campo plazo (Q3, Q1-Q3, fin de 2026…) y dentro de cada KR anota las tareas y hábitos necesarios para cumplirlo",
      "Escenarios de proyecto (/escenarios): cronología + estado medido + lectura de la situación, y los escenarios con su estrategia generados bajo demanda (migration 0029)",
      "Panel “🎯 3 KRs de la semana” en /semana (migration 0033): la capa intermedia entre la meta y la tarea. ✨ Sugerir 3 KRs por IA elige por riesgo real (los que van por debajo del ritmo y tienen menos días restantes). Solo entran KRs con entrega en marcha (regla de contención en BD). El trimestre sigue mandando en la entrega; la semana manda en el esfuerzo",
    ],
    3: [
      "Time-blocking con 4 bloques fijos por día (/calendario)",
      "Auditoría 20/80 en el Estatus Diario",
      "Motor de priorización con IA que devuelve 1 sola acción (<45 min)",
      "Botón IA “✨ Sugerir pagos” en /pagos (migration 0027): analiza los pagos activos y propone programación para los próximos 6 lunes con el prompt editable en /configuracion. Snowball + ingresos viernes/sábado por defecto",
    ],
    4: [
      "9 hábitos diarios con score 0-100 y racha (/estatus)",
      "Captura / Inbox para vaciar la cabeza (/captura)",
      "Micro-acción priorizada para mañana basada en patrón semanal",
      "Banner mental arriba de /tareas/pendientes-respuesta: «no te preocupes de lo que está pendiente de los demás» (reframe estoico/Covey, sin lógica)",
      "Matriz Eisenhower 2D en /m (/matriz) con drag & drop entre cuadrantes y botón IA «Sugerir redistribución» — clasificación urgencia × importancia calculada en JS desde fecha_fin + meta.es_wig, sin migración",
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