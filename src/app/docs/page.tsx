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
        titulo: "Alcance temporal: campo plazo",
        cuerpo:
          "Una meta sin plazo se diluye. La app usa el campo libre plazo para decidir EN QUÉ trimestres la IA debe generar los KRs (los hitos medibles que la cumplen). Acepta Q3 2026, Q1-Q3, Q1, Q3, fin de 2026, trimestre 3… Si lo dejas vacío, se cubren los 4 trimestres por defecto. Un KR es un resultado medible (no una acción): 'medir sueño 6h/noche' lo es; 'apagar el móvil a las 23h' es la tarea dentro de él.",
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

// ----------------------------------------------------------------------------
// Índice de features documentadas (para la sección "Meta · Índice" de abajo).
// Mantener en sincronía con /src/app/ — cualquier ruta nueva debe aparecer
// aquí con su propósito y la sección de la doc que la explica.
// ----------------------------------------------------------------------------
const FEATURES: Array<{ ruta: string; proposito: string; docs: string }> = [
  // ── Núcleo diario ──
  { ruta: "/", proposito: "Hoy: semáforo del día + plan diario + contadores", docs: "Rituales §1 (mañana 1ª hora) · HelpDrawer" },
  { ruta: "/captura", proposito: "Inbox rápido para vaciar la cabeza (efecto Zeigarnik)", docs: "Pilar 4 · Rituales §1 · HelpDrawer" },
  { ruta: "/estatus", proposito: "9 hábitos + auditoría 20/80 + cierre cognitivo", docs: "Pilar 4 · Rituales §1 (final del día) · HelpDrawer" },
  { ruta: "/estatus/nuevo", proposito: "Crear nueva entrada de Estatus (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/editar", proposito: "Editar entrada existente (1 por día)", docs: "Sub-ruta de /estatus" },
  { ruta: "/estatus/ver", proposito: "Ver una entrada en detalle (racha + micro-acción)", docs: "Sub-ruta de /estatus" },

  // ── Tareas y GTD ──
  { ruta: "/tareas", proposito: "Tareas pendientes: marcar hechas, adjuntos, asignar a meta/KR + panel WIGs (foco del ciclo)", docs: "Pilar 2 · WIGs §3 (cap de ejecución) · HelpDrawer" },
  { ruta: "/tareas/inbox", proposito: "Triaje residual: tareas sin meta o sin KR (después de asignar al crear)", docs: "HelpDrawer" },
  { ruta: "/tareas/completadas", proposito: "Histórico de tareas hechas (7/30/90/365/todo)", docs: "HelpDrawer" },

  // ── Trabajo profundo ──
  { ruta: "/focus", proposito: "Pomodoro + pre-flight check + post-focus", docs: "Pilar 1 · Productivity Stack · Rituales §1 · HelpDrawer" },
  { ruta: "/calendario", proposito: "Time-blocking: 4 bloques fijos × 7 días", docs: "Pilar 3 · Rituales §1 (mañana) · HelpDrawer" },

  // ── Metas y planificación ──
  { ruta: "/metas", proposito: "Cards de metas con estado y progreso + botón IA Sugerir WIGs + EditarMetaModal con botón IA Generar plan", docs: "Pilar 2 · Ritual mensual · HelpDrawer" },
  { ruta: "/metas/nueva", proposito: "Crear meta + botón IA Generar plan (KRs+tareas+hábitos) que respeta el campo plazo", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/agente", proposito: "Agente IA: contexto libre → meta + plan trimestral completo", docs: "Pilar 2 · HelpDrawer" },
  { ruta: "/metas/plan", proposito: "Plan trimestral con scorecard de KRs + proyección", docs: "Pilar 2 · Ritual semanal (domingo) · Ritual mensual · HelpDrawer" },
  { ruta: "/plan-diario", proposito: "Estado emocional + plan diario generado por IA", docs: "Rituales §1 (mañana) · HelpDrawer" },
  { ruta: "/plan-diario/detalle", proposito: "Detalle de un plan con notas e informe", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/plan-diario/historico", proposito: "Histórico de planes (7/30/90/365/todo)", docs: "Sub-ruta de /plan-diario" },
  { ruta: "/semana", proposito: "Pipeline semanal con drag & drop + IA 3 críticas/día", docs: "Ritual semanal (domingo noche) · HelpDrawer" },
  { ruta: "/pipeline", proposito: "Kanban por prioridad + motor IA de priorización", docs: "Ritual semanal (miércoles) · HelpDrawer" },

  // ── Revisión y análisis ──
  { ruta: "/informes", proposito: "KPIs + heatmap de foco + proyectos con conteo + metas y OKRs cerrados + comparación con plan vs sin plan", docs: "Ritual semanal (viernes) · Ritual mensual · HelpDrawer" },
  { ruta: "/dashboard-emocional", proposito: "4 dimensiones: despertar / mente / cuerpo / rueda", docs: "Pilar 4 · HelpDrawer" },

  // ── Identidad y horizonte ──
  { ruta: "/norte", proposito: "Propósito, valores y visión (la brújula)", docs: "Pilar 2 · Ritual diario (despertar) · Ritual mensual · HelpDrawer" },

  // ── Sistema ──
  { ruta: "/pagos", proposito: "Pagos pendientes: ejecutar tesorería lunes 1ª hora", docs: "Apéndice §Bucle de equilibrio · Ritual semanal (lunes estricto) · HelpDrawer" },
  { ruta: "/proyectos", proposito: "Gestión de proyectos con conteo de tareas", docs: "HelpDrawer" },
  { ruta: "/configuracion", proposito: "Configuración: API key IA, base URL, modelo, tema", docs: "HelpDrawer" },

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
            2026-10-07
          </span>
          <span className="text-muted-foreground">
            — selector de meta/KR en CrearModal/EditarModal. Chip visual hábito vs puntual (RecurrenciaChip). Badge "📊 N KRs · M trimestres" en /metas. Tres funciones IA nuevas: botón en /metas/nueva ("Generar plan"), botón en /metas ("Sugerir 3 WIGs"), y nueva ruta /metas/agente (contexto libre → meta + plan completo).
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
                  Planificar la semana entrante: arrastrar y soltar tareas,
                  registrar estado emocional. Es la base de todo lo demás.
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