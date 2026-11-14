"use client";

import Link from "next/link";
import { IconArrowLeft, IconCheck, IconTarget } from "@/components/icons";
import {
  FEATURES,
  GLOSARIO,
  HABITOS_RECURRENTES,
  PARA_QUE,
  PILARES,
  RITUALES,
} from "@/lib/metodologia/conocimiento";

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


// ----------------------------------------------------------------------------
// Índice de features documentadas (para la sección "Meta · Índice" de abajo).
// Mantener en sincronía con /src/app/ — cualquier ruta nueva debe aparecer
// aquí con su propósito y la sección de la doc que la explica.
// ----------------------------------------------------------------------------

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
          El para qué — el criterio del usuario: contra qué se encuadra todo.
          Los datos vienen de `src/lib/metodologia/conocimiento.ts` (PARA_QUE),
          la misma fuente que alimenta /metodologia y el prompt del agente.
         ===================================================================== */}
      <section
        id="para-que"
        className="scroll-mt-20 rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            El para qué
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Qué es la riqueza
          </h2>
        </header>

        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {PARA_QUE.map((p) => (
            <li key={p.titulo}>
              <strong className="text-foreground">{p.titulo}:</strong>{" "}
              {p.cuerpo}
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-relaxed text-muted-foreground">
          Todo lo que hay debajo — los 5 pilares, las 4 capas, los rituales y la
          arquitectura de metas — se encuadra contra esto. También lo conoce el
          chat del agente:{" "}
          <code className="rounded bg-muted px-1.5 py-1 text-xs">
            src/lib/metodologia/conocimiento.ts
          </code>{" "}
          es la fuente única (esta página,{" "}
          <code className="rounded bg-muted px-1.5 py-1 text-xs">/metodologia</code>{" "}
          y el prompt del agente).
        </p>
      </section>

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
          {GLOSARIO.map((g) => (
            <li key={g.titulo} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{g.emoji}</span>
                <h3 className="text-base font-semibold">{g.titulo}</h3>
              </div>
              <p className="mt-2 text-muted-foreground">{g.cuerpo}</p>
              {g.tip && <p className="mt-2 text-xs text-muted-foreground">💡 {g.tip}</p>}
            </li>
          ))}
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
                    {f.ruta === "/docs" ||
                    f.ruta === "/login" ||
                    f.ruta.startsWith("(") ? (
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
              {RITUALES.diario.map((f) => (
                <tr key={f.cuando}>
                  <td className="px-3 py-2 font-medium">{f.cuando}</td>
                  <td className="px-3 py-2">
                    {f.pantallas.map((p, i) => (
                      <span key={p.texto}>
                        {i > 0 && " + "}
                        {p.ruta ? (
                          <Link
                            href={p.ruta}
                            className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                          >
                            {p.texto}
                          </Link>
                        ) : (
                          <span className="font-mono text-rose-700 dark:text-rose-300">
                            {p.texto}
                          </span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{f.que}</td>
                </tr>
              ))}
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
              {RITUALES.semanal.map((f) => (
                <tr key={f.cuando}>
                  <td className="px-3 py-2 font-medium">{f.cuando}</td>
                  <td className="px-3 py-2">
                    {f.pantallas.map((p, i) => (
                      <span key={p.texto}>
                        {i > 0 && " + "}
                        {p.ruta ? (
                          <Link
                            href={p.ruta}
                            className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                          >
                            {p.texto}
                          </Link>
                        ) : (
                          <span className="font-mono text-rose-700 dark:text-rose-300">
                            {p.texto}
                          </span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <p>{f.que}</p>
                    {f.nota && <p className="mt-1.5 text-xs">{f.nota}</p>}
                  </td>
                </tr>
              ))}
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
          {RITUALES.mensual.map((f) => (
            <li key={f.cuando + f.que.slice(0, 24)} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              <span>
                {f.pantallas.map((p, i) => (
                  <span key={p.texto}>
                    {i > 0 && " + "}
                    {p.ruta ? (
                      <Link
                        href={p.ruta}
                        className="font-mono text-rose-700 dark:text-rose-300 underline-offset-4 hover:underline"
                      >
                        {p.texto}
                      </Link>
                    ) : (
                      <span className="font-mono text-rose-700 dark:text-rose-300">
                        {p.texto}
                      </span>
                    )}
                  </span>
                ))}
                {f.pantallas.length > 0 && ": "}
                {f.que}
                {f.nota && (
                  <span className="mt-1 block text-xs">{f.nota}</span>
                )}
              </span>
            </li>
          ))}
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
          {HABITOS_RECURRENTES.map((h, i) => (
            <li
              key={h.titulo}
              className="flex gap-3 rounded-lg border border-rose-500/20 bg-background/40 p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-700 dark:text-rose-300">
                {i + 1}
              </span>
              <div className="leading-relaxed">
                <strong className="text-foreground">{h.titulo}.</strong>{" "}
                <span className="text-muted-foreground">{h.cuerpo}</span>
              </div>
            </li>
          ))}
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
          Complemento · El agente que conoce tu sistema
          El chat global: pregunta por tus datos reales desde cualquier
          pantalla. Explica qué ve, qué NO hace y por qué está así de
          constru ido (SPA estática → snapshot en el prompt).
         ===================================================================== */}
      <section
        id="agente-global"
        className="scroll-mt-20 rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-6 sm:p-8"
      >
        <header>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Complemento · Agente global
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            💬 El agente que conoce tu sistema
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Hay un botón flotante (abajo a la derecha, en{" "}
            <strong className="text-foreground">todas</strong> las pantallas)
            que abre un chat. No es un chatbot genérico:{" "}
            <strong className="text-foreground">
              ve el estado real de tu sistema
            </strong>{" "}
            —tus metas, sus KRs, tus proyectos, tus tareas, tu plan de hoy,
            el foco de la semana y tu Norte— y te responde con esos datos.
            Es la consulta que antes tenías que hacer abriendo cinco
            pantallas.
          </p>
        </header>

        <hr className="my-6 border-border" />

        {/* 1. Qué puede y qué no puede hacer */}
        <h3 className="text-base font-semibold">
          1. Qué hace y qué NO hace
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              ✅ Sí (solo lectura)
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Consultar metas, KRs, proyectos y tareas.</li>
              <li>Resumir el estado y decir qué está en riesgo.</li>
              <li>Proponer qué hacer hoy, con el plan ya generado.</li>
              <li>Enlazar las entidades que menciona (chips con enlace).</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              🚫 No (y no por descuido)
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>No crea metas ni planes: eso es <code>/agente</code>.</li>
              <li>No completa ni reordena tareas.</li>
              <li>No inventa datos: si no está en el sistema, lo dice.</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La separación es deliberada:{" "}
          <strong className="text-foreground">
            consultar es de lectura, decidir es tuyo
          </strong>
          . Un agente que escribe sin revisión rompe la cadena de
          responsabilidad del sistema (la casa de 4 capas: proyecto → meta →
          KR → tarea). Por eso el chat no toca nada y{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code>{" "}
          sigue siendo la puerta de entrada para{" "}
          <em>crear</em> estructura.
        </p>

        {/* 2. Las conversaciones se guardan */}
        <h3 className="mt-6 text-base font-semibold">
          2. Las conversaciones se guardan
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Cada mensaje (tu pregunta y la respuesta) se guarda en Supabase
          (migration 0035:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            agente_conversaciones
          </code>{" "}
          +{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            agente_mensajes
          </code>
          , con RLS propia: cada quien ve solo lo suyo). El botón{" "}
          <strong className="text-foreground">historial</strong>{" "}
          (⏱-icono en la cabecera del chat) lista las conversaciones, las
          abre y las borra. La conversación se titula sola con tu primera
          pregunta, así que no hay que ponerle nombre a mano.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Por qué importa</strong>: una
          pregunta buena (“¿qué está en riesgo?”) reaparece cada semana. Si
          se pierde al cerrar la app, el ritual se pierde. Guardarla es lo
          que convierte el chat en una herramienta de revisión y no en un
          juguete de un día.
        </p>

        {/* 3. Lo que sabe: el manual del método */}
        <h3 className="mt-6 text-base font-semibold">
          3. Lo que sabe: el manual del método (no solo tus datos)
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          No solo ve tus datos:{" "}
          <strong className="text-foreground">
            conoce el método de la app
          </strong>
          . Con cada mensaje recibe el <em>manual del sistema</em> —los 5
          pilares con sus puntos, el glosario de las 4 capas, los rituales
          (diario/semanal/mensual), las 3 reglas que no se rompen, la
          arquitectura (WIGs, GTD, Próxima Acción, los dos inboxes, los
          anti-patrones, el criterio de selección) y el índice de
          pantallas. Con eso puede:
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Explicar el sistema</strong>:
            “¿qué es el KR de la semana?”, “¿por qué solo 3 WIGs?”, “¿qué
            hago el lunes?”.
          </li>
          <li>
            <strong className="text-foreground">
              Recomendar con tu criterio
            </strong>
            : cuando pregunta “¿qué hago hoy?”, la respuesta sale del
            ritual diario y del <em>criterio de selección</em> (riesgo
            financiero → compromiso inamovible → …), no del criterio
            genérico de la IA.
          </li>
          <li>
            <strong className="text-foreground">Citar la regla</strong> que
            aplica: “esto es el Pilar 2, KR de la semana”.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Y lo importante:{" "}
          <strong className="text-foreground">
            el manual se construye desde los mismos datos que pintan{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /docs
            </code>{" "}
            y{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /metodologia
            </code>
          </strong>
          . No hay dos copias del método que se puedan desincronizar: si
          mañana cambias un pilar o un ritual, el agente lo sabe en la
          misma sesión, porque el texto sale de{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/lib/metodologia/conocimiento.ts
          </code>{" "}
          (fuente única) y las tres vistas —esta página, /metodologia y el
          prompt del agente— se actualizan a la vez.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">
            El manual va en dos niveles, por una razón práctica:
          </strong>{" "}
          la IA tarda (es un modelo de razonamiento) y el prompt entero son
          ~55 KB. Así que las{" "}
          <strong className="text-foreground">
            preguntas de método
          </strong>{" "}
          (“¿qué es el KR de la semana?”, “¿por qué solo 3 WIGs?”) se
          llevan el manual completo y las{" "}
          <strong className="text-foreground">preguntas de datos</strong>{" "}
          (“¿qué hago hoy?”, “¿qué está en riesgo?”) se llevan el{" "}
          <em>resumen operativo</em> (mismo método, textos recortados: los
          pilares, las 4 capas, los rituales, el orden de selección y el
          índice de pantallas). La detección es por palabras clave, sin
          llamar a la IA: una llamada extra duplicaría la espera. Con eso
          el prompt baja de ~17k tokens a ~10k.
        </p>

        {/* 4. Cómo está construido (y por qué) */}
        <h3 className="mt-6 text-base font-semibold">
          4. Cómo funciona por dentro (y por qué así)
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong className="text-foreground">Sin tool-calling.</strong>{" "}
            La app es una SPA estática (export, GitHub Pages): no hay route
            handlers ni backend donde implementar una herramienta. La única
            vía es darle a la IA el estado del sistema{" "}
            <em>dentro del prompt</em>.
          </li>
          <li>
            <strong className="text-foreground">Un snapshot, no un router.</strong>{" "}
            Antes de cada mensaje se arma un{" "}
            <em>snapshot de texto</em> con el estado real ({" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              src/lib/agente/contexto.ts
            </code>{" "}
            ) y se manda entero. Se descartó la alternativa de “primero
            clasificar la pregunta y luego traer solo los datos
            necesarios”: duplica las llamadas a la IA y, si la
            clasificación falla, el agente responde “no tengo ese
            dato” cuando sí lo tenía. Con el snapshot completo, una sola
            llamada y cero falsos negativos.
          </li>
          <li>
            <strong className="text-foreground">
              Las referencias se validan, no se confían.
            </strong>{" "}
            Cuando el agente menciona una entidad escribe su id; el código
            lo extrae, lo contrasta con el catálogo real del snapshot y solo
            entonces lo pinta como chip con enlace. Un id inventado no llega
            a la interfaz.
          </li>
          <li>
            <strong className="text-foreground">Topes.</strong>{" "}
            Tareas, metas y KRs se recortan (300 / 60 / 8 por meta) para que
            el snapshot no crezca sin límite. Cuando hay recorte, el propio
            snapshot lo dice, para que el agente no afirme que “no hay más”.
          </li>
        </ul>

        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">La respuesta llega a trozos.</strong>{" "}
            El chat streamea: el texto se va escribiendo mientras la IA lo
            genera, en vez de aparecer de golpe tras un minuto de espera.
            Debajo de cada respuesta verás cuánto tardó ({" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              tardó 32s
            </code>
            ), para distinguir si el cuello de botella es el modelo o tu
            conexión.
          </li>
          <li className="rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Si algo falla, se puede reintentar.</strong>{" "}
            El error es accionable (“no se pudo conectar…”, “pulsa
            Actualizar app…”) y hay un botón{" "}
            <strong className="text-foreground">Reintentar</strong> que no
            duplica tu pregunta en el historial.
          </li>
        </ul>

        <div className="mt-6 rounded-lg border border-violet-500/30 bg-violet-500/10 p-4 text-sm leading-relaxed text-violet-900 dark:text-violet-200">
          💡 <strong>Empieza por:</strong> “<em>¿qué está en riesgo ahora
          mismo?</em>”, “<em>resume mis metas y sus KRs</em>” o “<em>¿qué
          debería hacer hoy?</em>”. Si no tiene clave de IA configurada, el
          chat te avisa y te lleva a{" "}
          <code className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs">
            /configuracion
          </code>
          .
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
              2026-11-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El para qué: qué es la riqueza (nueva sección al principio de
                esta página).
              </strong>{" "}
              Se añade la definición de riqueza del usuario:{" "}
              <em>
                negocios y activos que producen mientras duermes
              </em>
              . Vive en{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                src/lib/metodologia/conocimiento.ts
              </code>{" "}
              (constante{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                PARA_QUE
              </code>
              ), que es la fuente única: la pintan esta página y{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                /metodologia
              </code>
              , y el chat del agente la tiene en su prompt (sección 0 del
              manual, antes de los 5 pilares). No se cambian pilares, rituales,
              ni la arquitectura de metas y tareas: es el criterio con el que
              se encuadra lo que ya existía.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-13
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El desplegable que filtra por proyecto ya cabe en el móvil.
              </strong>{" "}
              Issue #52: en{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/krs</code>{" "}
              el filtro de proyecto se salía de la pantalla en el teléfono.
              La causa era el propio{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">select</code>
              : el navegador le da el ancho de la opción más larga y, como
              elemento flex, no puede encogerse por debajo de ese ancho. Con
              nombres de proyecto largos, el desplegable se iba de la
              pantalla. Ahora los filtros (proyecto y estado) ocupan el ancho
              disponible en el móvil y vuelven a su tamaño natural en
              escritorio. Lo mismo se arregla en el filtro por proyecto de{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/metas</code>
              , que tenía la misma causa. Sin cambios de datos ni de
              metodología.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Los KRs también se pueden marcar como WIG (el 🎯 de las metas y
                las tareas).
              </strong>{" "}
              Issue #49: en la base de datos, cada KR ahora tiene las mismas
              columnas que las metas y las tareas —{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">es_wig</code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">wig_orden</code>{" "}
              (1-3)— y su RPC{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">toggle_kr_wig</code>,{" "}
              que rechaza el cuarto igual que las otras capas. En la página{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/krs</code>{" "}
              cada fila tiene ahora su botón 🎯 (marca “WIG #n” si lo es) y
              arriba hay un panel “WIGs — KRs del ciclo (máx 3)” con los KRs
              elegidos, su meta y su entrega. Es la capa que faltaba entre los
              WIGs de meta (violeta) y los WIGs de tarea (fucsia): el
              resultado MEDIBLE que manda.{" "}
              <strong className="text-foreground">No es lo mismo que el foco
              semanal</strong>{" "}
              (celeste): aquel dice dónde pones horas ESTA semana y rota solo;
              el WIG de KR es del ciclo y se queda hasta que lo quites. Por
              eso tienen color y cap distintos.
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Nueva migration{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">supabase/migrations/0038_kr_wig.sql</code>{" "}
              (columnas + índice único parcial + RPC), mutación{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">marcarKrWig</code>{" "}
              en <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/mutations.ts</code>,{" "}
              consulta de{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">es_wig</code>/
              <code className="rounded bg-muted px-1 py-0.5 text-xs">wig_orden</code>{" "}
              en <code className="rounded bg-muted px-1 py-0.5 text-xs">fetchKrsOverview</code>{" "}
              y el panel nuevo{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/components/PanelWigKrs.tsx</code>.{" "}
              FEATURES (fila /krs), la sección “Aplicación en la app”,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/metodologia</code>{" "}
              §3 (WIGs) y este changelog actualizados en la misma sesión.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                En /metas, el panel de WIGs muestra solo las 3 metas.
              </strong>{" "}
              Issue #47: el panel violeta de WIGs de /metas metía debajo los KRs
              de cada meta y quedaba enorme sin aportar nada —los KRs ya se
              consultan al abrir la meta—. Ahora el panel de /metas enseña
              únicamente las 3 metas WIG (con su orden, su contador de tareas y
              el botón de quitar); en /tareas el panel sigue con sus KRs,
              porque es la pantalla donde se ejecuta y hay que ver el KR que
              estás moviendo. El texto de cabecera del panel se adapta al
              contenido. Sin cambios de datos ni de metodología.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                En /krs, el panel de arriba es el de los KRs, no el de las metas.
              </strong>{" "}
              Issue #43: la página de KRs enseñaba el panel violeta de metas
              WIG —el mismo que hay en /metas y /tareas—, que no decía nada
              en una pantalla que inventaría KRs. Ahora enseña el panel
              celeste de “KR’s Enormemente Importantes”: los KRs en foco de
              la semana —los resultados medibles en los que pones horas
              ahora—, con su meta, su entrega y su progreso. Es el mismo panel
              y la misma query que la home y /tareas. Si la semana no tiene
              foco elegido, el panel se pinta igual con su estado vacío y
              enlaza a /semana.
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              En{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/app/krs/page.tsx</code>{" "}
              se sustituye{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">PanelWigMetas</code>{" "}
              por{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">PanelFocoSemanaKRs</code>{" "}
              +{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">fetchKRsFocoSemanal</code>{" "}
              (misma query que la home). Sin migración. FEATURES (fila
              /krs), la sección “Aplicación en la app”, el HelpDrawer de /krs y
              este changelog actualizados en la misma sesión.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Las tarjetas de /proyectos ya se aguantan al ancho del móvil.
              </strong>{" "}
              Issue #45: en la versión móvil los paneles de proyectos se salían
              de la pantalla. La causa era el título del proyecto: con{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">truncate</code>{" "}
              pero sin{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">min-w-0</code>,{" "}
              el navegador le daba el ancho del texto entero y la tarjeta
              nunca podía encogerse. Ahora el título se recorta con puntos
              suspensivos, las barras de progreso pueden partirse en dos
              líneas y las metas sin proyecto también se cortan. Sin cambios
              de datos ni de metodología.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Los botones de cada tarjeta de proyecto, arriba y alineados a
                la derecha.
              </strong>{" "}
              En /proyectos, la fila de acciones de cada tarjeta (ver / editar /
              PDF / archivar / eliminar) ocupa ahora su propia fila arriba y se
              alinea a la derecha (issue #40), así se lee como el bloque de
              acciones de la esquina y no se confunde con el contenido de la
              tarjeta. El resto —nombre, descripción, contadores, barras y metas
              hijas— sigue a ancho completo debajo, que es lo que arregló el
              issue #36. FEATURES (fila /proyectos), la sección “Aplicación en
              la app” y este changelog actualizados en la misma sesión.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Las metas se completan solas, las tarjetas de proyecto ya no
                aprietan el texto y /krs enseña arriba los WIGs.
              </strong>{" "}
              Tres arreglos de la capa de resultados (issues #35, #36 y #37).
              (1) <strong className="text-foreground">La barra de metas de
              /proyectos avanza de verdad</strong>: el avance de cada meta se
              calcula desde el estado REAL de sus tareas (las directas y las
              de sus KRs) y, cuando terminas todas las tareas vivas de una
              meta, la meta pasa a “completada” sola; si reabres una, vuelve
              a “en progreso”. Antes el estado de una meta solo lo cambiaba
              el usuario a mano, así que la barra se quedaba en 0 para
              siempre aunque el trabajo estuviera hecho. (2){" "}
              <strong className="text-foreground">Las tarjetas de proyecto
              tienen dos alturas</strong>: los botones (ver / editar / PDF)
              van arriba a la izquierda y el resto —nombre, descripción,
              contadores, barras y metas hijas— ocupa el ancho completo de la
              tarjeta; antes la columna de botones de la derecha robaba el
              ancho al texto y lo dejaba partido en dos líneas. (3){" "}
              <strong className="text-foreground">/krs enseña arriba el panel
              de WIGs</strong> (máx 3): las metas marcadas como Enormemente
              Importantes que tienen KRs, con sus resultados y su entrega —
              el mismo panel que ya había en /metas y /tareas. Al inventariar
              KRs, lo primero es saber en cuál estás concentrando la energía.
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Módulo nuevo{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/metas.ts</code>{" "}
              con la REGLA ÚNICA de “en qué estado debería estar una meta”
              (pura, sin BD, con 22 casos en{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/metas.test.mjs</code>
              ), side-effects de sincronización en{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">marcarHecha</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">reabrirTarea</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">archivarTarea</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">desarchivarTarea</code>{" "}
              y <code className="rounded bg-muted px-1 py-0.5 text-xs">actualizarTarea</code>{" "}
              (no bloqueantes: si la BD falla, la tarea ya está guardada y
              el fallo se avisa por consola). Sin migración nueva. FEATURES
              (filas{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/proyectos</code>{" "}
              y <code className="rounded bg-muted px-1 py-0.5 text-xs">/krs</code>),
              HelpDrawer (nuevas entradas para{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/proyectos</code>{" "}
              y <code className="rounded bg-muted px-1 py-0.5 text-xs">/krs</code>)
              y este changelog actualizados en la misma sesión.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                La página Hoy: las tres capas se ven con nombre propio, las
                fechas ya no son NaN y el Modo Recuperación no se rompe.
              </strong>{" "}
              Cuatro arreglos en la home (issue #34): (1) el panel violeta se
              llama <strong className="text-foreground">“Metas Enormemente
              Importantes”</strong> (antes “Enormemente Importantes”, que no
              decía de qué capa hablaba); (2) la capa intermedia —los{" "}
              <strong className="text-foreground">KR’s Enormemente
              Importantes</strong>— se pinta SIEMPRE, también sin foco
              elegido, con un estado vacío que enlaza a /semana: antes, sin
              foco, el panel desaparecía y la cascada parecía saltarse un
              escalón; (3) el panel <strong className="text-foreground">“Tareas
              con fecha”</strong> ya no enseña “en NaNd” ni “Invalid Date”:
              <code className="rounded bg-muted px-1 py-0.5 text-xs">deadline</code>{" "}
              es una NOTA de texto libre (“esta semana”), no una fecha, así que
              ahora se ordena por <code className="rounded bg-muted px-1 py-0.5 text-xs">fecha_fin</code>{" "}
              (fecha real) y las que solo tienen nota van al final con su
              texto tal cual; (4) si la base de datos va por detrás del
              código (falta la migración 0034), el Modo Recuperación{" "}
              <strong className="text-foreground">degrada en vez de
              romperse</strong>: lee los bloqueos que sí existen, avisa en
              pantalla de qué falta y dice qué migración aplicar, en vez de
              dejar la página entera con “No se pudo calcular la propuesta”.
              <br />
              <br />
              <strong className="text-foreground">Implementación.</strong>{" "}
              Módulo nuevo{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/fechas.ts</code>{" "}
              (una sola regla de qué es una fecha: valida YYYY-MM-DD y
              separa la fecha real de la nota) y{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">src/lib/supabase/esquema.ts</code>{" "}
              (detector de “la BD no tiene esto”). Sin migración nueva: la
              0034 sigue siendo la que hay que aplicar en el proyecto de
              Supabase. FEATURES (fila <code className="rounded bg-muted px-1 py-0.5 text-xs">/</code>),
              Pilar 2 (“Aplicación en la app”), HelpDrawer de{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/metodologia</code>{" "}
              §5 (“Diseño de la página Hoy”) y este changelog actualizados en
              la misma sesión.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Anular un pago ya pagado ya no borra ese dinero, y se puede
                deshacer.
              </strong>{" "}
              Anular un pago (factura errónea, importe 0) funcionaba también
              sobre pagos <em>parciales</em>: ponía el estado en “anulado” sin
              mirar lo ya pagado, ese importe dejaba de sumar en los totales y
              <strong className="text-foreground">no había ninguna forma de
              atrás</strong>. Ahora: (1) antes de anular, si ya has pagado algo,
              el aviso lo dice y recuerda que puedes deshacerlo; (2) el menú
              del pago anulado tiene <strong className="text-foreground">
                “↩︎ Deshacer anulación”
              </strong>
              , que borra los movimientos registrados y devuelve el pago a
              pendiente con el importe pagado a 0 (RPC{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                pagos.deshacer_anulacion
              </code>
              , migración 0037). El dinero que salió de la cuenta sigue
              visible, y si te arrepientes del annulamiento, se corrige en un
              clic.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Los 43 controles que solo funcionaban con el ratón ya funcionan
                con el teclado.
              </strong>{" "}
              Los fondos de los modales y los menús eran{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                div
              </code>{" "}
              con un manejador de clic: el lector de pantalla los anunciaba como
              elementos pulsables sin poder activarlos, y el usuario de teclado
              no tenía forma de cerrarlos. Ahora el fondo es una capa{" "}
              <strong className="text-foreground">decorativa</strong> (
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                aria-hidden
              </code>
              ) y el cierre sigue funcionando igual: el diálogo conserva su
              botón de cerrar y Escape. Afectaba a los 3 popover de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /calendario
              </code>
              , los modales de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /semana
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metas
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/pagos</code>
              , el panel de ayuda y el diálogo de fin de pomodoro. Además, el
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {"<dialog>"}
              </code>{" "}
              nativo de pagos deja de llevar el manejador de clic encima (la
              capa decorativa interior hace el mismo trabajo). Sin cambios de
              aspecto: el fondo sigue cerrando al pulsar fuera.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                La app ya no te roba el foco al abrir una pantalla.
              </strong>{" "}
              Nueve campos tenían <code className="rounded bg-muted px-1.5 py-0.5 text-xs">autoFocus</code>:
              al entrar en la pantalla (o al abrir un modal) el cursor saltaba
              solo a ese campo. En escritorio es un atajo cómodo; en el móvil
              abre el teclado y tapa media pantalla, y con lector de pantalla
              interrumpe la lectura del contenido para empezar por un campo que
              el usuario no había pedido. Afectaba a los buscadores de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/semana</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/calendario</code>,
              a los modales de tarea, editar meta y pago parcial, y a los
              formularios de <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/krs</code>.
              Se elimina el foco automático en los 9: el usuario decide dónde
              empieza a escribir. Sin cambios de aspecto ni de lógica.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">

                Los 18 campos de formulario que estaban “sin nombre” ya se
                anuncian bien.
              </strong>{" "}
              En 8 pantallas y modales había campos con su etiqueta visible en
              el formulario pero <em>sin asociar</em> al campo correspondiente
              (faltaba <code className="rounded bg-muted px-1.5 py-0.5 text-xs">htmlFor</code> +{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">id</code>
              ). El usuario veía “Nombre” encima del campo y lo entendía, pero
              con lector de pantalla el campo se anunciaba <em>sin nombre</em>,
              así que no se sabía qué escribir. El mismo patrón afectaba a los
              checkboxes de “Fecha crítica” (
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/agente</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/agente</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>
              ), donde el aviso de la fecha límite quedaba fuera de la etiqueta.
              Corregidos los 18 casos en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/areas</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/plan-diario</code>,
              el modal de editar proyecto y el de pago parcial. FEATURES
              actualizadas (accesibilidad en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/areas</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code> y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/nueva</code>
              ). Solo se añadieron atributos de asociación y nombres accesibles:
              sin cambiar el texto visible ni la disposición.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El histórico del plan diario ya cuenta lo que hiciste.
              </strong>{" "}
              El plan guarda su propio contador ({" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                plan_diario_tareas.hecho
              </code>
              ) para que el histórico pueda decir “hiciste 3 de 5”. Pero una
              tarea del plan vinculada a una tarea real se completaba desde{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /plan-diario
              </code>{" "}
              o el widget del día, y ninguno de esos sitios conocía la fila del
              plan: el contador se quedaba en 0 y el histórico del ritual
              diario ({" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /plan-diario/historico
              </code>
              ) decía siempre “0 / N”, hicieras lo que hicieras. Ahora{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                marcarHecha
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                reabrirTarea
              </code>{" "}
              sincronizan las filas del plan, así que el contador sube al
              cerrar y baja al reabrir. Y las tareas{" "}
              <strong className="text-foreground">libres</strong> del plan (las
              que propone la IA, sin tarea real detrás) tienen por fin su
              casilla en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /plan-diario/detalle
              </code>
              : antes no había forma de cerrarlas. FEATURES actualizada (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /plan-diario/detalle
              </code>
              ). Sin cambios de modelo ni de metodología.
            </span>
          </li>

          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Los controles de la app se pueden pulsar con el dedo.
              </strong>{" "}
              La app se usa en el móvil, pero había{" "}
              <strong className="text-foreground">
                58 botones, enlaces-acción e iconos pulsables por debajo de 32 px
              </strong>{" "}
              de alto —11 por debajo de 24 px, el mínimo de WCAG 2.2 · 2.5.8
              (nivel AA)—. El más pequeño medía 22 px: con el dedo se falla, y
              el toque errado marca una tarea hecha o borra algo sin querer.
              Es la corrección más amplia de toda la auditoría (27 archivos),
              pero también la más mecánica: todos los controles ganan un{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                min-h-10
              </code>{" "}
              (40 px de área táctil, por encima del mínimo) con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                inline-flex items-center justify-center
              </code>
              , sin cambiar el tamaño visual: en escritorio se ven igual,
              en el móvil se aciertan. El transcriptor quedó sin casos. Anotado
              en FEATURES (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>
              , con su campo de accesibilidad). Sin cambios de modelo ni de
              metodología: es una corrección de implementación.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Regla de progreso de las subtareas: el progreso ya no se cuenta
                dos veces.
              </strong>{" "}
              Una tarea desglosada en subtareas podía marcarse como{" "}
              <em>hecha</em> dejando subtareas pendientes, y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code>{" "}
              sumaba el trabajo dos veces: la tarea cerrada pesa 1 y{" "}
              <strong className="text-foreground">
                cada subtarea hecha pesa 1/3
              </strong>
              , así que una tarea con sus 3 subtareas cerradas marcaba 2 en el
              heatmap y en el chart de barras. La regla que queda escrita (y
              aplicada) es:{" "}
              <strong className="text-foreground">
                una subtarea cuenta como progreso mientras su tarea siga
                ABIERTA
              </strong>
              ; cuando cierras la tarea, su progreso ya lo representa la tarea
              completa (1) y las subtareas dejan de sumar. Cerrar una tarea{" "}
              <strong className="text-foreground">
                no
              </strong>{" "}
              cierra sus subtareas (quedan como pendientes y se retoman al
              reabrir la tarea): marcar como hecho algo que no se ha hecho
              falsearía el registro, y bloquear el cierre añadiría fricción
              al ritual. El KPI{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                Subtareas hechas
              </code>{" "}
              no cambia (es un contador de actividad, no de progreso): ahora
              lo dice su pie. FEATURES actualizadas (filas{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /informes
              </code>
              ) y ritual semanal actualizado. Sin cambios en el modelo de
              datos ni en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metodologia
              </code>
              : no afecta a WIGs, GTD, Próxima Acción ni los dos inboxes.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-12
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Las tareas recurrentes ya no pierden su clasificación al
                clonarse.
              </strong>{" "}
              Al marcar una tarea recurrente como hecha, la copia para la
              siguiente fecha se creaba sin{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                ambito
              </code>
              , sin{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">tags</code>{" "}
              y sin{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                fecha_fin
              </code>
              : la copia se quedaba “sin clasificar” (y salía del inbox
              personal/profesional al que pertenecía), perdía sus etiquetas y
              no aparecía en “Vencen hoy” el día que le tocaba. Ahora la
              clonación (migración 0036) hereda las tres. El{" "}
              <strong className="text-foreground">KR no se hereda</strong>{" "}
              a propósito: un KR pertenece a un trimestre, así que la
              ocurrencia siguiente debe reasignarse al KR del periodo que le
              toque, y queda en la bandeja de la meta (el grupo “con meta sin
              resultado” de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas/inbox
              </code>
              ). FEATURES actualizada (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>
              ). Sin cambios en el modelo de datos más allá de la función de
              clonación, ni en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metodologia
              </code>
              : no afecta a WIGs, GTD, Próxima Acción ni los dos inboxes (al
              contrario: ahora las recurrentes los respetan).
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-03
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                /metas: buscador de texto y filtro por proyecto.
              </strong>{" "}
              La tabla de metas ya se leía de un vistazo, pero con 15+ filas
              hacia falta poder{" "}
              <strong className="text-foreground">encontrar</strong> una sin
              recorrerla a ojo. Ahora, encima de la tabla:{" "}
              <strong className="text-foreground">buscador</strong> (mira en
              título, código, descripción, tags, títulos de KR y nombre de
              proyecto; varias palabras = AND, así que “sol meta” acota más
              que “sol o meta”) y{" "}
              <strong className="text-foreground">
                filtro por proyecto
              </strong>{" "}
              (incluye “Sin proyecto”, que es donde caen las metas huérfanas
              que la sección ámbar de /proyectos avisa de que se están
              perdiendo). Con contador “N de M” para ver que el filtro está
              actuando. Los filtros se combinan con los de antes (ámbito y
              tags) y hay un botón “limpiar”. FEATURES actualizada (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metas
              </code>
              ). No cambia ni el modelo de datos ni la metodología: es
              lectura, no escritura.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-03
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                /metas pasa de tarjetas a TABLA, y /tareas muestra la cascada
                de foco encima de la tabla.
              </strong>{" "}
              Dos cambios de{" "}
              <strong className="text-foreground">diseño</strong> pedidos por
              David, los dos con la misma intención:{" "}
              <em>más operativo</em>. (1){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metas
              </code>{" "}
              era un mosaico de tarjetas: cada meta ocupaba media pantalla, así
              que con 15 metas solo veías 4 a la vez y comparar era
              imposible. Ahora es{" "}
              <strong className="text-foreground">una tabla</strong>: una fila
              por meta con columnas Meta (código, título, descripción, tags) ·
              Estado · Ámbito · Proyecto (con su color) · KRs (con su periodo
              de entrega y el valor actual frente al objetivo) · Progreso
              (barra + % + tareas hechas/total) · Plazo (fecha objetivo, con
              🔒 si es crítica) · Acciones (🎯 WIG, editar, archivar,
              eliminar). Se comparan 15 metas de un vistazo y por COLUMNA; en
              móvil pasa a filas compactas (misma estrategia que la tabla de
              /tareas). El botón Eliminar sigue mostrando el preview de
              impacto antes de borrar. (2){" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>{" "}
              tenía la tabla de tareas y el panel de WIGs-tarea, pero no las
              capas de arriba: ahora,{" "}
              <strong className="text-foreground">
                encima de la tabla se ve la cascada completa
              </strong>
              , igual que en la home — WIGs de META con sus KRs (violeta) →
              KRs en foco de la semana (celeste) → WIGs de TAREAS (fucsia).
              Está así porque al ejecutar hay que saber en qué{" "}
              <em>resultado medible</em> se está poniendo el esfuerzo, no solo
              qué tarea: los tres eslabones (meta → KR → tarea) tienen que
              estar a la vista a la vez. Para no duplicar markup, el panel de
              KRs del foco semanal se extrajo a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/components/PanelFocoSemanaKRs.tsx
              </code>{" "}
              (lo usan la home y /tareas) y el de WIGs de meta + KRs a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/components/PanelWigMetas.tsx
              </code>{" "}
              (lo usan /metas y /tareas). FEATURES actualizadas (filas{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metas
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /tareas
              </code>
              ). No cambian los pilares, los rituales ni el modelo de datos:
              cambia cómo se ve y se lee la misma información.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-11-03
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Los KRs por fin tienen su tabla global, y la home muestra las
                TRES capas de WIG.
              </strong>{" "}
              Dos cambios de un solo tiro.{" "}
              <strong className="text-foreground">
                (1) Nueva pantalla <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/krs</code>
              </strong>
              : una tabla con{" "}
              <em>todos</em> los Key Results del sistema — una fila por KR
              con la <strong className="text-foreground">META a la que
              pertenece</strong> y el{" "}
              <strong className="text-foreground">PROYECTO</strong> resueltos,
              más la entrega (trimestre/mes), el estado, el{" "}
              <em>valor actual editable</em> (el único dato escribible de la
              pantalla) y el progreso de tareas. Filtros por texto, por
              proyecto y por estado. Hasta ahora los KRs solo se veían
              colgando de cada meta ({"/metas/detalle"}) o por columnas de
              trimestre ({"/metas/plan"}): faltaba el inventario completo, que
              es lo que responde a «¿cuántos resultados tengo y de qué
              son?». Sin migración: solo lee.{" "}
              <strong className="text-foreground">
                (2) La home (
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/</code>
                ) completa la cascada
              </strong>{" "}
              : ahora se ven los tres niveles de foco en el mismo sitio —
              WIGs de <em>meta</em> (violeta) → KRs en foco de la{" "}
              <em>semana</em> (celeste, el mismo foco que se elige en{" "}
              {"/semana"}) → WIGs de <em>tarea</em> (fucsia). Antes el
              escalón intermedio faltaba en la home: se veía la meta y la
              tarea, pero no el resultado medible que las une. Eso es
              exactamente la arquitectura de 4 capas (proyecto → meta → KR →
              tarea) hecha visible en el sitio donde se empieza el día.
              <em>Sin cambios de metodología ni rituales</em>: es una vista
              más de lo que ya existía, no una capa nueva.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-30
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El chat va más rápido: manual en dos niveles + streaming.
              </strong>{" "}
              Con todo el método en el prompt, cada mensaje eran ~17k tokens
              y la IA (MiniMax-M3 es un modelo de{" "}
              <strong className="text-foreground">razonamiento</strong>)
              tardaba{" "}
              <em>muchísimo</em>. Tres cambios, de mayor a menor impacto:{" "}
              (1){" "}
              <strong className="text-foreground">
                STREAMING: la respuesta se ve llegar
              </strong>{" "}
              en vez de aparecer de golpe tras un minuto de espera (nueva
              función{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                llamarLLMStream
              </code>{" "}
              en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/lib/llm.ts
              </code>
              , con extractor incremental del JSON{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {"{"}"respuesta": …{"}"}
              </code>{" "}
              que llega a trozos; si el servidor no streamea, cae al formato
              normal sin cambiar el resultado); (2){" "}
              <strong className="text-foreground">
                el manual va en dos niveles
              </strong>
              : las preguntas de MÉTODO (heurística de palabras clave, sin
              llamada extra) se llevan el manual completo (~36 KB) y las de
              DATOS un resumen operativo del{" "}
              <em>mismo</em> método (pilares, 4 capas, rituales, orden de
              selección, índice de pantallas) —todo construido desde el
              módulo compartido, no escrito a mano; (3) el snapshot se
              aligera: 150 tareas (priorizadas) en formato compacto, 120
              KRs en total, descripciones a 140 caracteres. El prompt pasa
              de ~55 KB a ~30 KB. Además, cada respuesta muestra cuánto
              tardó (“tardó 32s”) para distinguir si el cuello de botella
              es el modelo o la red. Tests nuevos (5) del extractor de
              streaming y (6) de los dos niveles del manual. No cambia el
              método: el agente sigue conociendo todo el manual, pero solo lo
              gasta cuando la pregunta lo necesita.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-30
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El chat del agente fallaba en móvil: “Failed to fetch” y
                Sinatra.
              </strong>{" "}
              El manual del método se cargaba con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                import()
              </code>{" "}
              diferido (para no meter 36 KB en el bundle de todas las
              páginas). En la práctica eso era un error:{" "}
              <strong className="text-foreground">
                el primer mensaje tenía que descargar un chunk extra por la
                red
              </strong>{" "}
              y, con una conexión móvil mala, esa descarga fallaba con un
              críptico{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                TypeError: Failed to fetch
              </code>{" "}
              —además de añadir segundos de espera antes de pedirle nada a
              la IA.{" "}
              <strong className="text-foreground">Tres arreglos</strong>:{" "}
              (1) el manual se importa{" "}
              <strong className="text-foreground">estático</strong>{" "}
              (0 peticiones extra; +56 KB en el bundle, +19 KB gzip, sobre
              1 MB que ya carga la app: asumible frente a un fallo
              irrecuperable); (2){" "}
              <strong className="text-foreground">
                el service worker ya no rompe la app
              </strong>{" "}
              —la rama de assets hasheados (cache-first) no tenía{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                try/catch
              </code>
              , así que un fallo de red del SW se convertía en el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                Failed to fetch
              </code>{" "}
              que veía el usuario; ahora devuelve un 503 explícito y
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {" "}
                CACHE_VERSION
              </code>{" "}
              sube a v4; (3){" "}
              <strong className="text-foreground">la UI cuenta el tiempo</strong>
              : el bubble de “Consultando tu sistema…” muestra los segundos
              y avisa de que el prompt es grande (la IA manda el sistema
              entero + el manual), y si algo falla aparece un botón{" "}
              <strong className="text-foreground">Reintentar</strong> que no
              duplica tu mensaje en el historial. Además, el snapshot baja
              de 300 a 200 tareas (priorizadas) y las descripciones se
              recortan a 140 caracteres: el prompt se va de ~80 KB a
              ~55 KB. No cambia el método ni los rituales: cambia cómo se
              entrega el mismo conocimiento.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-30
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                El agente conoce TODO el método de la app (y ya no hay dos
                copias del método).
              </strong>{" "}
              Hasta ahora el método (los 5 pilares, el glosario, los
              rituales, la arquitectura WIG/GTD/Próxima Acción) vivía{" "}
              <strong className="text-foreground">dentro del JSX</strong> de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /docs
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metodologia
              </code>
              . Eso hacía dos cosas malas: era{" "}
              <em>imposible</em> dárselo a la IA (un componente de React no
              es un prompt) y, al no haber fuente única, cualquier cambio
              del método se tenía que hacer en dos sitios.{" "}
              <strong className="text-foreground">
                Ahora el método vive como DATOS
              </strong>{" "}
              en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/lib/metodologia/conocimiento.ts
              </code>{" "}
              (fuente única): los 5 pilares, el glosario de las 4 capas, los
              rituales diario/semanal/mensual, las 3 reglas que no se
              rompen, la arquitectura (problema, lag vs lead, WIGs, GTD,
              Próxima Acción, los dos inboxes, anti-patrones, pendientes de
              respuesta, criterio de selección) y el índice de pantallas.{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /docs
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /metodologia
              </code>{" "}
              los pintan desde ahí (el texto es el mismo, byte a byte) y{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/lib/agente/manual.ts
              </code>{" "}
              lo convierte en un{" "}
              <strong className="text-foreground">
                MANUAL en texto que va en el system prompt del chat
              </strong>{" "}
              (~36 KB, cargado con{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                import()
              </code>{" "}
              diferido para que no pese en el bundle de todas las
              páginas). Con eso el agente: (a) explica el sistema (“¿qué es
              el KR de la semana?”, “¿qué hago el lunes?”), (b){" "}
              <strong className="text-foreground">
                recomienda con el criterio de la app
              </strong>{" "}
              y no con el genérico de la IA —a “¿qué hago hoy?” responde
              con el ritual diario y el criterio de selección (riesgo
              financiero → compromiso inamovible → …)— y (c) cita la regla
              que aplica. Y si mañana cambias un pilar, el agente lo sabe
              en la misma sesión: no hay dos copias del método que se
              puedan desincronizar. Tests nuevos (9) que comprueban que el
              manual sale del módulo compartido y que no se dispara de
              tamaño. FEATURES actualizado (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                (global)
              </code>
              ) y sección nueva §3 en “El agente que conoce tu sistema”.
              No cambian los pilares ni los rituales: cambia{" "}
              <strong className="text-foreground">dónde</strong> viven, no
              <strong className="text-foreground">qué</strong> dicen.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-30
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Chat del agente en toda la app (migration 0035).
              </strong>{" "}
              Botón flotante (abajo a la derecha) presente en{" "}
              <strong className="text-foreground">todas</strong> las
              pantallas: se abre un chat donde preguntas por tus datos
              reales y te responde con el estado real del sistema — metas,
              KRs, proyectos, tareas, plan de hoy, foco semanal y Norte.
              Antes esto solo se podía consultar abriendo cinco pantallas;
              ahora se pregunta.{" "}
              <strong className="text-foreground">Solo lectura</strong>:
              no crea ni modifica nada (escribir sigue siendo cosa de{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                /agente
              </code>
              , que tiene su revisión humana).{" "}
              <strong className="text-foreground">
                Las conversaciones se guardan
              </strong>{" "}
              en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                agente_conversaciones
              </code>{" "}
              +{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                agente_mensajes
              </code>{" "}
              (RLS propia, cascade al borrar) y se retoman desde el botón
              de historial; la conversación se titula sola con la primera
              pregunta.{" "}
              <strong className="text-foreground">
                Sin tool-calling
              </strong>{" "}
              —la app es una SPA estática (export), no hay backend donde
              vivir una tool—, así que el estado real se le da a la IA como{" "}
              <em>snapshot de texto</em> en el prompt ({" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                src/lib/agente/contexto.ts
              </code>
              ): una sola llamada por mensaje, sin router previo (un router
              duplicaría las llamadas y añadiría falsos negativos del tipo
              “no tengo ese dato” cuando sí lo había). Las referencias que
              cita el agente (proyecto / meta / KR / tarea) se validan
              contra el catálogo real del snapshot antes de pintarse como
              chips con enlace, así que ningún id inventado llega a la
              interfaz. Topes: 300 tareas / 60 metas / 8 KRs por meta, y el
              propio snapshot avisa cuando recorta. Nueva sección{" "}
              <strong className="text-foreground">
                “Complemento · El agente que conoce tu sistema”
              </strong>
              , fila nueva en el índice de features ({" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                (global)
              </code>
              ) y dos filas nuevas en los rituales (diario: “¿qué hago
              hoy?”; domingo: “¿qué está en riesgo?”). No se cambian
              pilares ni la arquitectura de metas/tareas: el chat es una capa
              de consulta encima, no una capa más de escritura.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-01-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                7 correcciones al motor de selección tras verlo con datos
                reales.
              </strong>{" "}
              El Modo sombra se probó contra las tareas y pagos reales: el
              criterio acierta en lo importante (la tarea principal propuesta
              fue la correcta: la factura de suministros que enlaza con un
              pago vencido de 350 €), pero la primera versión tenía siete
              defectos. <strong className="text-foreground">1) “1 min”
              inventado</strong>:{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">tareas.esfuerzo</code>{" "}
              es texto libre y a veces contiene un “1” que no son minutos (un
              nº de factura). Decir “1 min” era mentira, así que ahora el
              tiempo estimado sólo se acepta si hay subtareas con
              <code className="rounded bg-muted px-1.5 py-1 text-xs">tiempo_estimado_min</code>{" "}
              o si el texto menciona la unidad; si no, dice “sin estimar”.
              <strong className="text-foreground">2) Pagos vencidos
              ahogando los urgentes</strong>: 15 avisos, de “hace 95 días” a
              “hace 7 días”, todos igual de visibles. Ahora los vencidos hace
              más de 30 días se muestran como un resumen con el total, y al
              desplegarlo salen{" "}
              <em>uno a uno</em> — porque son obligaciones distintas (tres
              TGSS de 480 € son tres pagos) y no se fusiona ni se descarta
              ninguno.{" "}
              <strong className="text-foreground">3) Etiqueta del motivo
              incorrecta</strong>: decía siempre “concepto coincidente”
              aunque lo que hubiera coincidido fuera el importe (la señal más
              fuerte).{" "}
              <strong className="text-foreground">4) El estado real del pago
              no se miraba</strong>: el motor leía{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">estado</code>{" "}
              (crudo) en vez de{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">estado_efectivo</code>{" "}
              (calculado por la vista), que es lo que ve el usuario en
              /pagos. Por eso los pagos vencidos hace meses parecían
              “pendientes”.{" "}
              <strong className="text-foreground">5) No se elegía el peor
              pago</strong>: entre dos deudas vencidas ahora gana la de{" "}
              <em>mayor importe</em>, no la primera que aparece.{" "}
              <strong className="text-foreground">6) La carga era demasiado
              severa</strong>: “Sí, todo me arrastra” se traducía a carga
              mínima y el sistema se quedaba con{" "}
              <em>una sola tarea</em>. Pero arrastrar no es estar agotado:
              ahora hay tres niveles de carga (alta / media / mínima) y el
              corte severo queda reservado para “Agotado” y para un semáforo
              rojo ya guardado.{" "}
              <strong className="text-foreground">7) 47 descartables
              idénticos</strong>: ahora se agrupan por categoría (hábitos y
              recordatorios / tareas con fecha / trabajo sin objetivo / otras)
              y se muestran sus títulos, que es la información valiosa; no se
              pierde ninguna. También se documenta que una tarea importante
              ya vencida{" "}
              <em>entra</em> en el plan (antes sólo salía como aviso:
              avisar de algo que no vas a hacer es contradecirse).{" "}
              <strong className="text-foreground">
                Segunda ronda: 3 correcciones más tras una segunda prueba con
                datos reales
              </strong>
              .{" "}
              <strong className="text-foreground">8) La misma obligación
              ocupaba dos huecos</strong>: si una tarea enlaza con dos
              pagos (p. ej. una fianza de 700 € y otra de 1.000 €), el
              índice elegía el primero que encontraba, no el más caro, y la
              tarea secundaria podía repetir la misma deuda que la
              principal. Ahora gana el de{" "}
              <em>mayor importe pendiente</em> y{" "}
              <strong className="text-foreground">nada repite pago</strong>{" "}
              en el plan: una obligación, un hueco.{" "}
              <strong className="text-foreground">9) El motivo decía
              “vencido” cuando el pago no lo estaba</strong>: la tarea
              enlazaba con un pago que vence dentro de 20 días y el motivo
              lo llamaba “pago vencido”. Un aviso falso es peor que no
              avisar, así que el estado real del pago va{" "}
              <em>dentro</em> del texto (“vence en 20 días”, “vence hoy”,
              “vencido hace N días”), no fuera.{" "}
              <strong className="text-foreground">10) Etiqueta del
              matching imprecisa</strong>: decía “concepto coincidente”
              cuando lo que coincidía era el proveedor (o ambos), y no
              decía{" "}
              <em>cuál</em> de los dos signals había coincidido. Ahora:
              “importe coincidente” o “proveedor o concepto coincidente”.
              Cubierto por 85 tests (67 del motor + 18 del Modo sombra), con
              un bloque dedicado a cada bug corregido. FEATURES y este
              changelog actualizados. No se cambian pilares ni rituales: son
              correcciones de criterio dentro de una vista que ya existía.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-01-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Modo sombra en /plan-diario: “¿Qué propondría el sistema?” (Fase
                3 del Modo Recuperación).
              </strong>{" "}
              Nuevo botón en{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">
                /plan-diario
              </code>{" "}
              que muestra la propuesta del motor de selección determinista{" "}
              <strong className="text-foreground">sin escribir nada en la base
              de datos</strong>. Muestra 1 tarea principal, hasta 2 secundarias,
              un mantenimiento opcional, el tiempo personal protegido y los
              avisos de riesgo, cada una con{" "}
              <strong className="text-foreground">el motivo en texto plano</strong>{" "}
              (“vence mañana”, “hay un pago vencido relacionado”), y además{" "}
              <strong className="text-foreground">la compara con el plan que ya
              tienes hoy</strong> (cuántas coinciden, cuántas sugiere el sistema
              y cuáles son solo tuyas). Detalles de implementación: la
              capacidad se deriva del semáforo que la app ya calcula
              (<code className="rounded bg-muted px-1.5 py-1 text-xs">verde/amarillo/rojo</code>)
              y, si aún no hay plan, se estima desde los 5 selects del estado
              emocional —{" "}
              <strong className="text-foreground">nunca por defecto en
              verde</strong>, porque eso llenaría el día; un pago vencido
              aparece como aviso{" "}
              <strong className="text-foreground">aunque la carga esté
              mínima</strong> (ajustar la carga y ocultar un riesgo son cosas
              distintas); y las tareas recurrentes quedan fuera porque son
              hábitos, no tareas del día.{" "}
              <strong className="text-foreground">Por qué en sombra</strong>:{" "}
              un sistema automático que elige mal genera más problemas que
              tener que decidir a mano. Esta fase es de observación: la
              propuesta se recalcula al entrar,{" "}
              <em>no toca estados, ni fechas, ni descarta nada</em>, y el
              motor es el mismo que usará la fase siguiente, así que lo que
              ves hoy es exactamente lo que se guardará mañana. Cubierto por 17
              tests en{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">
                src/lib/recuperacion/shadow.test.mjs
              </code>
              . FEATURES actualizado (fila{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">
                /plan-diario
              </code>
              ) y este changelog. No se cambian pilares ni rituales: es una
              vista nueva dentro de una pantalla que ya existía.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-01-14
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Motor determinista de selección del día (Fase 1 del Modo
                Recuperación).
              </strong>{" "}
              Nuevo módulo puro{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">src/lib/recuperacion/seleccion.ts</code>{" "}
              que decide <strong className="text-foreground">qué tareas entran
              hoy y por qué</strong>, sin IA y sin tocar la base de datos. No
              es una pantalla todavía: es el criterio de selección que la
              alimentará. Sus reglas, por orden de peso:{" "}
              <strong className="text-foreground">1) riesgo financiero</strong>{" "}
              (tarea vinculada a un pago vencido o próximo —{" "}
              <em>por delante del resto, porque una deuda vencida tiene
              consecuencias más graves que cualquier otro compromiso</em>),{" "}
              <strong className="text-foreground">2) compromiso inamovible</strong>{" "}
              (fecha dura + WIG/meta/capa),{" "}
              <strong className="text-foreground">3) riesgo operativo</strong>{" "}
              (importante y vence pronto),{" "}
              <strong className="text-foreground">4) ingresos</strong> (solo
              con el tag explícito{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">ingresos</code>{" "}
              — nunca se infieren),{" "}
              <strong className="text-foreground">5) importante no urgente</strong>,{" "}
              <strong className="text-foreground">6) mantenimiento</strong>{" "}
              (gestión acotada: ≤15 min o ≤45 min sin fecha próxima) y{" "}
              <strong className="text-foreground">7) bienestar</strong>{" "}
              (ámbito personal: va a su propia sección y <em>no</em> se
              descarta — el tiempo de descanso no es tiempo improductivo); lo
              que no entra por ninguna de las ocho reglas queda como{" "}
              <strong className="text-foreground">candidata a descartar,
              aplazar o delegar</strong> en la revisión semanal. Cada
              selección lleva su{" "}
              <strong className="text-foreground">motivo en texto plano</strong>{" "}
              (“vence mañana”, “hay un pago vencido relacionado”), nunca una
              puntuación opaca. La{" "}
              <strong className="text-foreground">capacidad del usuario
              ajusta la carga, no silencia los riesgos</strong>: con el
              semáforo en rojo el plan se queda en una tarea principal, pero un
              pago vencido sigue apareciendo como aviso. Ajustar la carga y
              ocultar un riesgo son cosas distintas, y la segunda es
              exactamente lo que el sistema debe evitar. Detalles de
              implementación: el tiempo estimado se toma de{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">tareas_subtareas.tiempo_estimado_min</code>{" "}
              (numérico y ya persistido) y no de{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">tareas.esfuerzo</code>{" "}
              (texto libre, no fiable); la relación pago↔tarea se resuelve por
              texto porque <em>no existe FK entre</em>{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">pagos.pagos</code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">public.tareas</code>{" "}
              (importe coincidente o proveedor/concepto coincidente), y solo
              se exige <em>una</em> señal para no generar falsos positivos; las
              recurrentes se excluyen del plan porque son hábitos, no tareas
              del día. Cubierto por 50 tests en{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">seleccion.test.mjs</code>{" "}
              (incluidos el runner general y la suite completa), entre ellos
              el invariante de que <em>ninguna tarea aparece dos veces</em> en
              el plan.{" "}
              <strong className="text-foreground">Nota de diseño</strong>: no
              se han añadido campos de prioridad nuevos (nada de P1–P5) ni
              tablas nuevas: todo se deriva de{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">tareas</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">metas</code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1.5 py-1 text-xs">pagos</code>.{" "}
              FEATURES y este changelog actualizados. No se cambian pilares ni
              rituales: esta fase no introduce ninguna pantalla nueva.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-28
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Barras de progreso por proyecto (/proyectos).
              </strong>{" "}
              Cada proyecto muestra ahora <strong className="text-foreground">
              dos barras</strong>, porque miden cosas distintas y confundirlas
              sería el error clásico:{" "}
              <strong className="text-foreground">la de METAS</strong> (con el
              color del proyecto) es el{" "}
              <em>avance real</em> — un proyecto es un contenedor de{" "}
              <em>resultados</em>, así que lo mide cuántas metas hijas están
              completadas; y{" "}
              <strong className="text-foreground">la de TAREAS</strong> es el{" "}
              <em>esfuerzo operativo</em> — cuántas tareas están cerradas, que
              sirve para ver si hay movimiento pero no para declarar el
              proyecto terminado. Si el proyecto no tiene metas, no se muestra
              la barra de metas (no hay nada que medir todavía). Ambas llevan
              su contador{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">hechas/total</code>{" "}
              y su porcentaje. Detalle de coherencia: las metas{" "}
              <em>archivadas</em> ahora quedan fuera tanto del listado “Metas
              hijas” como del cálculo del progreso, de modo que el contador y
              la barra hablan siempre de lo mismo (antes el listado las
              incluía y el cálculo las excluía: dos fuentes de verdad que
              podían discrepar).{" "}
              <strong className="text-foreground">Nota de diseño</strong>: no se
              han añadido “WIGs de proyecto”. El proyecto ya está dentro del
              WIG de la meta (una meta{" "}
              <em>vive dentro</em> de un proyecto), así que un WIG de proyecto
              sería pedir la misma decisión dos veces y rompería el cap de 3
              (“energía de foco es un recurso finito”). Lo que sí aporta el
              proyecto es <em>visibilidad</em> del reparto del foco, y eso lo
              dan las barras. FEATURES actualizado (fila{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/proyectos</code>)
              y este changelog. No se cambian pilares, rituales ni reglas de
              metodología: es una mejora de visibilidad dentro de una pantalla
              que ya existía.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-28
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Las tarjetas de /metas muestran su proyecto y sus KRs.
              </strong>{" "}
              Antes solo se veía el <em>número</em> de KRs de cada meta, sin
              saber cuáles eran ni de qué proyecto se trataba. Ahora cada
              tarjeta lleva (a) un chip con el{" "}
              <strong className="text-foreground">proyecto</strong> al que
              pertenece la meta, con su color (migration 0024), y (b) un bloque
              desplegable “Ver los N KRs” con el <strong className="text-foreground">
              título de cada KR, su trimestre de entrega y su objetivo
              numérico</strong>. Para poder mostrarlo,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fetchMetasConProgreso()</code>{" "}
              ahora trae los <strong className="text-foreground">periodos reales
              de cada KR</strong> (vía{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">kr_periodos</code>)
              y los KRs llegan ordenados por su campo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">orden</code>.
              De paso se corrige un bug latente: el contador de trimestres de la
              tarjeta se calculaba sobre un{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">periodo</code>{" "}
              <em>placeholder</em> (siempre vacío), así que{" "}
              <strong className="text-foreground">siempre contaba 1
              trimestre</strong> aunque la meta tuviera KRs repartidos en
              varios; ahora cuenta los periodos reales, y un KR que vive en
              Q1 y Q2 cuenta como 2. Detalle de implementación: el bloque de
              KRs se ha puesto <strong className="text-foreground">
              fuera del enlace que abre el detalle de la meta</strong> — un{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;details&gt;</code>{" "}
              dentro de un <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;a&gt;</code>{" "}
              es HTML inválido y el click navegaría en vez de desplegar.
              FEATURES actualizado (fila <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>)
              y este changelog. No se cambian pilares, rituales ni reglas de
              metodología: es una mejora de visibilidad dentro de una pantalla
              que ya existía.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-teal-500/20 bg-background/40 p-3">
            <span className="shrink-0 font-mono text-xs font-bold text-teal-700 dark:text-teal-300 sm:text-sm">
              2026-10-28
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">
                Bug: el listado de metas (y 5 rutas más) salía vacío.
              </strong>{" "}
              La migration 0028 eliminó la columna{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">resultados_periodo.periodo_id</code>{" "}
              (ahora vive en la tabla puente{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">kr_periodos</code>), pero{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">fetchMetasConProgreso()</code>{" "}
              seguía pidiendo esa columna en su{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.select()</code>
              . PostgREST devolvía 400 (<em>column does not exist</em>), la función
              lanzaba y la página se quedaba con <code className="rounded bg-muted px-1.5 py-0.5 text-xs">metas = []</code>{" "}
              → listado vacío <strong className="text-foreground">sin ningún mensaje
              de error</strong>. El comentario de la función incluso decía lo
              contrario (“la tabla ya no tiene{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">periodo_id</code>”)
              mientras el código la pedía: por eso TypeScript no lo detectaba
              (el <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.select()</code>{" "}
              es un string). Arreglado en{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/queries.ts</code>.
              El mismo fallo afectaba a{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/metas/auditoria</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/tareas/inbox</code>,{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/informes</code> y el{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">TareaModal</code>{" "}
              (al editar cualquier tarea) — 7 rutas en total. Además:{" "}
              <strong className="text-foreground">/metas ahora muestra el error</strong>{" "}
              si la carga falla (antes se limitaba a pintar “0 metas”, lo que
              hacía el fallo indistinguible de “no tienes metas”), y se ha añadido
              el test de regresión{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">src/lib/schema-queries.test.mjs</code>,
              que lee las migraciones, extrae las columnas eliminadas y verifica
              que <em>ninguna</em> query del código las pida — así este tipo de
              fallo (típico de cada migración) no puede volver a colarse
              silenciosamente. FEATURES y los rituales no cambian: no se ha
              añadido ni modificado ninguna pantalla, hábito ni regla de
              metodología, solo se arregla una carga que estaba rota.
            </span>
          </li>
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
      "Tabla global de KRs (/krs): una fila por Key Result con su META, su PROYECTO, su entrega y su progreso — el inventario completo del sistema en una pantalla, con el valor actual editable en línea. Encima, el panel de KRs (máx 3): los KRs en foco de la semana —en los que pones horas ahora—, con su meta, su entrega y su progreso; el mismo panel que en la home y en /tareas",
      "WIGs de KR (/krs, issue #49): cada fila de la tabla de KRs lleva el mismo botón 🎯 que tienen las metas y las tareas, para marcar el KR como Enormemente Importante del ciclo; arriba, el panel “WIGs — KRs del ciclo (máx 3)” con su contador. Es la capa que faltaba entre los WIGs de meta (violeta) y los WIGs de tarea (fucsia): el resultado MEDIBLE que manda. El cap de 3 lo impone la BD (RPC toggle_kr_wig, migration 0038). No es lo mismo que el foco semanal (celeste): ese dice dónde pones horas ESTA semana y rota solo",
      "Tres capas de WIG en la home (/): WIGs de META (violeta, “Metas Enormemente Importantes”) → KRs en foco de la semana (celeste, “KR’s Enormemente Importantes”, el foco de /semana) → WIGs de TAREA (fucsia, “Tareas Enormemente Importantes”). La cascada meta → KR → tarea completa, visible de un vistazo. El panel de KRs se pinta siempre: si la semana no tiene foco elegido, lo dice y enlaza a /semana en vez de desaparecer",
      "Semáforo verde/amarillo/rojo en planes diarios",
      "Estados de meta (sin_empezar → en_progreso → completada) con feedback visible — y el estado se DERIVA del trabajo: al completar todas las tareas vivas de una meta, la meta se completa sola (y al reabrir una, vuelve a en progreso). La barra de metas de /proyectos se mueve con ese estado real",
      "Tarjetas de proyecto en dos alturas (/proyectos): los botones van arriba en su propia fila, alineados a la derecha, y el resto del contenido a ancho completo, para que el texto de la tarjeta no se apriete",
      "Las tarjetas de /proyectos caben en el móvil (issue #45): el título se recorta con puntos suspensivos, las barras de progreso pueden partirse en dos líneas y las metas sin proyecto también se cortan, así que ningún panel se sale de la pantalla en el teléfono",
      "Los filtros de /krs y /metas caben en el móvil (issue #52): el desplegable de proyecto ya no se dimensiona con la opción más larga (que lo sacaba de la pantalla en el teléfono), sino que ocupa el ancho disponible en móvil y vuelve a su tamaño natural en escritorio",
      "Botón IA “Generar plan con IA” en /metas/nueva y EditarMetaModal: filtra KRs por el campo plazo (Q3, Q1-Q3, fin de 2026…) y dentro de cada KR anota las tareas y hábitos necesarios para cumplirlo",
      "Escenarios de proyecto (/escenarios): cronología + estado medido + lectura de la situación, y los escenarios con su estrategia generados bajo demanda (migration 0029)",
      "Panel “🎯 3 KRs de la semana” en /semana (migration 0033): la capa intermedia entre la meta y la tarea. ✨ Sugerir 3 KRs por IA elige por riesgo real (los que van por debajo del ritmo y tienen menos días restantes). Solo entran KRs con entrega en marcha (regla de contención en BD). El trimestre sigue mandando en la entrega; la semana manda en el esfuerzo",
      "El panel de WIGs de /metas muestra solo las 3 metas WIG, sin los KRs debajo (issue #47): se quedaba enorme sin aportar nada y los KRs ya se consultan al abrir la meta. En /tareas el panel sí conserva sus KRs, porque es donde se ejecuta y hay que ver el KR que estás moviendo",
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