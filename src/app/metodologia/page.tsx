"use client";

import Link from "next/link";
import {
  IconArrowLeft,
  IconBolt,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClipboardCheck,
  IconClock,
  IconCompass,
  IconFlag,
  IconInbox,
  IconList,
  IconMessage,
  IconTarget,
  IconX,
} from "@/components/icons";
import {
  ANTIPATRONES,
  CRITERIO_SELECCION,
  GTD_PUNTOS,
  INBOXES,
  LAG_VS_LEAD,
  NEXT_ACTION_PUNTOS,
  PENDIENTES_RESPUESTA,
  PROBLEMA,
  WIG_PUNTOS,
  type Punto,
} from "@/lib/metodologia/conocimiento";

// ============================================================================
// /metodologia — Arquitectura de metas y tareas
//
// Esta página documenta EL SISTEMA concreto que usa la app para evitar la
// sobrecarga cognitiva y mantener foco sostenible. Es complementaria a
// /docs (los 5 pilares filosóficos: por qué) — aquí se explica el CÓMO
// arquitectónico: WIGs, GTD, Próxima Acción, dos inboxes, etc.
//
// Fuentes que sustentan el diseño:
//   · 4DX (4 Disciplines of Execution) — Lag vs Lead Measures, WIGs (1-3 máx)
//   · GTD (Getting Things Done, David Allen) — captura externa + próxima acción
//   · Ps. Zeigarnik (efecto) + Masicampo & Baumeister (plan concreto lo desactiva)
//   · Deep Work (Cal Newport) — bloques de foco, no listas
// ============================================================================

type Ref = { ruta: string; titulo: string };

// ============================================================================
// SECCIÓN 1 — El problema
// ============================================================================

// ============================================================================
// SECCIÓN 2 — Lag vs Lead (4DX)
// ============================================================================

// ============================================================================
// SECCIÓN 3 — WIGs (Wildly Important Goals)
// ============================================================================

// ============================================================================
// SECCIÓN 4 — El repositorio GTD externo
// ============================================================================

// ============================================================================
// SECCIÓN 5 — La Próxima Acción Física
// ============================================================================

// ============================================================================
// SECCIÓN 6 — Los dos inboxes
// ============================================================================

// ============================================================================
// SECCIÓN 7 — Anti-patrones
// ============================================================================

// ============================================================================
// SECCIÓN 8 — Pendientes de respuesta (lo que NO depende de ti)
// ============================================================================
// Migration 0026. Hay un subtipo especial de pendiente que no es una
// acción a ejecutar sino un BLOQUEO EXTERNO: la tarea existe, pero tu
// próximo paso depende de que alguien te conteste. Marcar la tarea con
// el flag ⏳ “pendiente de respuesta” la separa visualmente del
// inventario activo y la muestra en /tareas/pendientes-respuesta.
//
// Encima de la lista, el panel tiene un banner mental (estoico/Covey)
// que recuerda «no te preocupes de lo que está pendiente de los demás».
// Es un reframe psicológico que refuerza la utilidad operativa del
// panel con la utilidad mental: soltar la preocupación.
// ============================================================================

// ============================================================================
// SECCIÓN 9 — El criterio de selección (qué entra HOY y por qué)
// ============================================================================
// FASE 1 DEL MODO RECUPERACIÓN. Este módulo NO es una pantalla todavía:
// es el CRITERIO de selección que la alimentará. Vive en
// `src/lib/recuperacion/seleccion.ts`.
//
// POR QUÉ EXISTE
//   La app tenía dos motores de priorización, ambos por IA y ambos cajas
//   negras: `motorPriorizacion.ts` elegía 1 tarea, `planSimple.ts` generaba el
//   plan del día. Ninguno te decía POR QUÉ ganó una tarea, y no podías
//   reproducir el criterio ni auditarlo. Este motor es el contrapeso:
//   reglas deterministas, explicables y testeables.
//
// LA REGLA DE ORO
//   Deterministas primero, IA después. La IA redacta el motivo y el primer
//   paso; NO decide qué tareas entran. Y el motivo siempre es TEXTO PLANO
//   ("vence mañana", "hay un pago vencido relacionado"), nunca una
//   puntuación opaca.
// ============================================================================

// ============================================================================
// Componente
// ============================================================================
export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a Hoy
      </Link>

      {/* ================================================================
          HERO
         ================================================================ */}
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          Arquitectura del sistema
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Metas, WIGs y Próxima Acción
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Cómo estructurar objetivos, tareas y foco diario sin saturar la mente.
          Esta página documenta el sistema concreto que ejecuta la app:{" "}
          <strong className="text-foreground">WIGs de 4DX</strong> +{" "}
          <strong className="text-foreground">GTD</strong> +{" "}
          <strong className="text-foreground">Próxima Acción Física</strong>.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Pill numero="1" texto="Lag & Lead" sub="resultado vs conducta" />
          <Pill numero="2" texto="WIGs (1-3)" sub="máx, enforced por DB" />
          <Pill numero="3" texto="Next Action" sub="solo una en foco diario" />
        </div>
        <p className="mt-5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm leading-relaxed text-muted-foreground">
          📚 Buscas la base filosófica (Deep Work, hábitos, descanso, gestión
          del tiempo)? Esa vive en{" "}
          <Link href="/docs" className="font-medium text-foreground underline underline-offset-4">
            /docs · Los 5 pilares
          </Link>
          . Esta página es su implementación concreta.
        </p>
        <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-relaxed text-muted-foreground">
          🤖 <strong className="text-foreground">
            El chat del agente (botón flotante en toda la app) conoce esta
            misma arquitectura
          </strong>
          . No es una copia:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/lib/metodologia/conocimiento.ts
          </code>{" "}
          es la fuente única de los dos (esta página,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/docs</code>{" "}
          y el prompt del agente). Si cambias una regla aquí, el agente la
          aplica en la misma sesión: recomienda con{" "}
          <em>tu</em> criterio (WIGs, Próxima Acción, criterio de
          selección), no con el criterio genérico de la IA.
        </p>
      </header>

      {/* ================================================================
          1. EL PROBLEMA
         ================================================================ */}
      <Seccion
        emoji="⚠️"
        tag="El problema"
        tagColor="red"
        titulo="Por qué una lista plana de tareas no funciona"
        puntos={PROBLEMA}
      />

      {/* ================================================================
          2. LAG vs LEAD
         ================================================================ */}
      <section className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          4DX · Disciplina 1
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Las dos medidas: Lag y Lead
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La metodología <strong>4 Disciplines of Execution</strong> (McChesney,
          Huling, Covey) distingue dos medidas opuestas que toda meta tiene.
          No entender la diferencia es la causa #1 de metas que no se ejecutan.
        </p>

        <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Dimensión</th>
                <th className="px-3 py-2 font-semibold text-violet-700 dark:text-violet-300">
                  Lag Measure
                </th>
                <th className="px-3 py-2 font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                  Lead Measure
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {LAG_VS_LEAD.map((row) => (
                <tr key={row.dimension}>
                  <td className="px-3 py-2.5 font-medium">{row.dimension}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.lag}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.lead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-lg border border-violet-500/20 bg-background/60 p-4">
          <h3 className="text-sm font-semibold">Ejemplo: lanzar un producto en 6 meses</h3>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              <span>
                <strong className="text-foreground">Lag</strong>: "Producto lanzado y cobrando a 50 clientes". Solo lo mides al final.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-500" />
              <span>
                <strong className="text-foreground">Lead 1</strong>: "5 entrevistas de validación con clientes por semana".
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-500" />
              <span>
                <strong className="text-foreground">Lead 2</strong>: "4 bloques semanales de trabajo profundo programando el núcleo".
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">Las 80 tareas administrativas</strong>{" "}
                (contratos, marketing, soporte…) existen en el repositorio pero NO son
                Lead Measures. Son el subproducto.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ================================================================
          3. WIGs
         ================================================================ */}
      <Seccion
        emoji="🎯"
        tag="4DX · Disciplina 1 (cont.)"
        tagColor="violet"
        titulo="WIGs: solo 1-3 metas a la vez"
        puntos={WIG_PUNTOS}
        extra={
          <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
            <h3 className="text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">
              Cómo se aplica en la app
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  Tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">metas</code>{" "}
                  tiene <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">es_wig</code> +{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">wig_orden (1-3)</code>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  Índice único <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">(owner_id, wig_orden)</code>{" "}
                  + RPC <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">toggle_meta_wig</code>{" "}
                  que rechaza el 4º.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  Tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">tareas</code>{" "}
                  tiene el mismo patrón (<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">es_wig</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">wig_orden</code>, RPC{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">toggle_tarea_wig</code>).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  <strong className="text-foreground">Tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">resultados_periodo</code> (migration 0038) — el WIG de KR.</strong>{" "}
                  Los KRs (la capa medible que hay entre la meta y la tarea) tienen el mismo patrón que las metas y las tareas: <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">es_wig</code> +{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">wig_orden</code>, índice único y RPC{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">toggle_kr_wig</code> que rechaza el 4º. En <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">/krs</code> cada fila lleva el mismo botón 🎯, y arriba hay un panel “WIGs — KRs del ciclo (máx 3)”. Es del CICLO: no rota solo como el foco semanal.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  <strong className="text-foreground">Tabla <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">kr_foco_semanal</code> (migration 0033) — la capa intermedia.</strong>{" "}
                  Es la ventana de EJECUCIÓN: qué KRs mueves esta semana. Un KR puede estar en varias semanas (si su entrega dura 3 semanas, aparece 3 veces) y el cap de 3 es <strong>por semana</strong>, así que el foco rota solo cada semana. La RPC{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">toggle_kr_foco_semanal</code>{" "}
                  aplica el cap <em>y</em> la regla de contención: un KR solo entra si alguno de sus periodos contiene la semana actual. No se toca <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">periodos</code> ni <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">kr_periodos</code>: el trimestre sigue mandando en la entrega, la semana en el esfuerzo.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  UI: panel violeta (WIGs-meta) en{" "}
                  <Link href="/metas" className="font-medium text-foreground underline underline-offset-4">
                    /metas
                  </Link>
                  , panel violeta (WIGs-KR del ciclo) en{" "}
                  <Link href="/krs" className="font-medium text-foreground underline underline-offset-4">
                    /krs
                  </Link>
                  , panel celeste (KRs en foco de esta semana) en{" "}
                  <Link href="/semana" className="font-medium text-foreground underline underline-offset-4">
                    /semana
                  </Link>{" "}
                  y panel fucsia (WIGs-tarea) en{" "}
                  <Link href="/" className="font-medium text-foreground underline underline-offset-4">
                    Hoy
                  </Link>
                  . Cada rótulo dice en qué eje vive su capa (issue #59): el foco semanal se llama igual en las cuatro páginas (“KRs en foco — esta semana (máx 3)”) y el WIG de KR (“WIGs — KRs del ciclo (máx 3)”) no se confunde con él.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  <strong className="text-foreground">Alcance temporal de una meta (migration 0025 — rango real).</strong>{" "}
                  /metas/nueva pide dos fechas reales: <em>inicio</em> (default hoy) y <em>límite</em> (opcional). Si marcas 🔒 Fecha crítica, la IA no puede planificar nada después del límite. La IA reparte los KRs como meses sueltos dentro del rango, no fuerza 4 trimestres. El viejo campo libre{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">plazo</code>{" "}
                  se conserva por compat pero ya no es la fuente de verdad. Helpers: <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">parsearMesesDeRango()</code> y <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">parsearTrimestresDePlazo()</code> (legacy) en <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">/lib/plan.ts</code>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  <strong className="text-foreground">Estado de una meta DERIVADO de su trabajo (issue #35).</strong>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">metas.estado</code>{" "}
                  ya no depende de que te acuerdes de cambiarlo: cuando terminas{" "}
                  <strong className="text-foreground">todas las tareas vivas</strong>{" "}
                  de una meta (las sueltas y las de sus KRs), la meta pasa a{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">completada</code>{" "}
                  sola, y al reabrir una vuelve a{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">en_progreso</code>.{" "}
                  Dos excepciones deliberadas: una meta sin tareas vivas no se toca (no hay dato que deducir) y una meta archivada nunca se resucita sola (archivar es decisión explícita del usuario, no un derivado). La regla vive en{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">src/lib/metas.ts</code>{" "}
                  (pura, sin BD, con sus tests) y se aplica como efecto secundario en{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">marcarHecha</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">reabrirTarea</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">archivarTarea</code>,{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">desarchivarTarea</code>{" "}
                  y <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">actualizarTarea</code>. Es lo que hace que la barra de metas de{" "}
                  <Link href="/proyectos" className="font-medium text-foreground underline underline-offset-4">
                    /proyectos
                  </Link>{" "}
                  se mueva sola.
                </span>
              </li>
            </ul>
          </div>
        }
      />

      {/* ================================================================
          4. GTD — REPOSITORIO EXTERNO
         ================================================================ */}
      <Seccion
        emoji="🗄️"
        tag="GTD"
        tagColor="amber"
        titulo="El repositorio externo: TODO está guardado (aunque no se vea)"
        puntos={GTD_PUNTOS}
        extra={
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Dónde verlo en la app
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <IconList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  <Link href="/tareas" className="font-medium text-foreground underline underline-offset-4">
                    /tareas
                  </Link>{" "}
                  — todas las pendientes, filtrables por meta, estado, prioridad, capa.
                </span>
              </li>
              <li className="flex gap-2">
                <IconFlag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  <Link href="/pipeline" className="font-medium text-foreground underline underline-offset-4">
                    /pipeline
                  </Link>{" "}
                  — Kanban por prioridad (motor IA de priorización).
                </span>
              </li>
              <li className="flex gap-2">
                <IconCalendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  <Link href="/semana" className="font-medium text-foreground underline underline-offset-4">
                    /semana
                  </Link>{" "}
                  — pipeline semanal con drag &amp; drop.
                </span>
              </li>
              <li className="flex gap-2">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>
                  <Link href="/tareas/completadas" className="font-medium text-foreground underline underline-offset-4">
                    /tareas/completadas
                  </Link>{" "}
                  — histórico (para auditoría 20/80).
                </span>
              </li>
            </ul>
            <div className="mt-3 rounded-md border border-amber-500/30 bg-background/60 p-3 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Regla de jerarquía (migration 0024 + 0015)</strong>:{" "}
                la tarea que vive dentro de una meta hereda el proyecto de esa meta (no se puede asignar
                a otro proyecto). Si la meta NO tiene proyecto, la tarea queda sin proyecto — pero se
                puede asignarle uno editando la meta en <Link href="/metas" className="font-medium text-foreground underline underline-offset-4">/metas</Link>.
                En el editor y la tabla, esta jerarquía se pinta como una cascada de chips{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">📁 proyecto › 🎯 meta › 🪟 kr</code>.
                Las tareas sin meta (inbox) sí pueden tener un proyecto directo para agrupación
                operativa sin necesidad de crear una meta.
              </p>
            </div>
          </div>
        }
      />

      {/* ================================================================
          5. NEXT ACTION
         ================================================================ */}
      <Seccion
        emoji="⚡"
        tag="GTD · Next Action"
        tagColor="emerald"
        titulo='Solo la "Próxima Acción Física" en el foco diario'
        puntos={NEXT_ACTION_PUNTOS}
        extra={
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Diseño de la página Hoy (curado, no exhaustivo)
            </h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">1</span>
                <span><strong>Semáforo emocional</strong> — cómo estás, no qué tienes que hacer.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">2</span>
                <span><strong>3 contadores</strong> — Tareas pendientes · Metas activas · Inbox.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">3</span>
                <span><strong>Panel WIG-meta</strong> (violeta, “Metas Enormemente Importantes”) — 1-3 metas, con % de progreso.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">4</span>
                <span><strong>Panel de foco semanal de KRs</strong> (celeste, “KRs en foco — esta semana (máx 3)”) — los KRs en foco de la semana. Siempre visible: si no hay foco elegido, dice cuál es el siguiente paso (elegirlo en /semana) en vez de desaparecer.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">5</span>
                <span><strong>Panel WIG-tarea</strong> (fucsia, “Tareas Enormemente Importantes”) — 1-3 tareas que los sostienen.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">6</span>
                <span><strong>Panel “Tareas con fecha”</strong> (ámbar) — las pendientes con fecha real, vencidas arriba; las que solo tienen un deadline en texto van al final, con su nota tal cual.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">7</span>
                <span><strong>Plan de hoy</strong> — 3-4 imprescindibles + autocuidado + micro + extra.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">8</span>
                <span><strong>Preview de pendientes</strong> — máximo 6, con link "ver todas".</span>
              </li>
            </ol>
            <p className="mt-3 text-xs italic text-muted-foreground">
              Nada de listas infinitas. La página Hoy cabe en una pantalla y te dice por dónde empezar.
            </p>
          </div>
        }
      />

      {/* ================================================================
          6. DOS INBOXES
         ================================================================ */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-300">
          GTD · Captura
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Hay dos inboxes. No son lo mismo.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          La app tiene dos rutas llamadas "inbox" pero conceptualmente hacen
          cosas distintas. Mezclarlas es uno de los errores más comunes.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {INBOXES.map((ib) => (
            <div
              key={ib.ruta}
              className={`rounded-xl border-2 p-4 ${
                ib.color === "violet"
                  ? "border-violet-500/30 bg-violet-500/5"
                  : "border-sky-500/30 bg-sky-500/5"
              }`}
            >
              <header className="mb-2 flex items-center gap-2">
                {ib.icono === "inbox" ? (
                  <IconInbox
                    className={`h-5 w-5 ${
                      ib.color === "violet" ? "text-violet-500" : "text-sky-500"
                    }`}
                  />
                ) : (
                  <IconFlag
                    className={`h-5 w-5 ${
                      ib.color === "violet" ? "text-violet-500" : "text-sky-500"
                    }`}
                  />
                )}
                <h3 className="font-semibold">{ib.nombre}</h3>
                <code className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {ib.ruta}
                </code>
              </header>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Qué:</strong> {ib.que}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Cuándo:</strong> {ib.cuando}
              </p>
              <p className="mt-2 text-xs italic text-muted-foreground">
                {ib.rama}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
          <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
            Regla de decisión
          </h3>
          <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-sky-500">1.</span>
              <span>
                <strong className="text-foreground">¿Es un texto libre, una idea, un problema, un pago?</strong> →{" "}
                <Link href="/captura" className="font-medium text-foreground underline underline-offset-4">
                  /captura
                </Link>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">2.</span>
              <span>
                <strong className="text-foreground">¿Ya es una tarea formal con título + meta + prioridad?</strong> →{" "}
                <Link href="/tareas/inbox" className="font-medium text-foreground underline underline-offset-4">
                  /tareas/inbox
                </Link>{" "}
                para asignarle meta/trimestre.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">3.</span>
              <span>
                <strong className="text-foreground">¿Ya tiene meta y trimestre?</strong> → ya está fuera del inbox;
                vive en <Link href="/tareas" className="font-medium text-foreground underline underline-offset-4">/tareas</Link>.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* ================================================================
          7. DIAGRAMA DE CAPAS
         ================================================================ */}
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Cómo se conectan las capas
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Del "por qué" al "qué hago ahora"
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Las 7 capas de la app, de arriba (propósito) a abajo (acción física).
          Cada capa alimenta a la siguiente; nada se pierde al bajar, se enfoca.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background font-mono text-xs">
          <Capa
            num="7"
            nombre="Norte"
            color="slate"
            desc="Propósito · Valores · Visión (BHAG)"
            ruta="/norte"
          />
          <Capa
            num="6"
            nombre="Áreas + Metas (Lag) + OKRs + KRs + Hitos"
            color="violet"
            desc="Resultados a 6-12 meses. Sin Lead Measures no avanzan. El inventario completo de KRs vive en /krs."
            ruta="/metas"
          />
          <Capa
            num="5"
            nombre="WIGs-meta (1-3)"
            color="violet"
            desc="Subconjunto de metas con foco desproporcionado. Enforced por DB."
            ruta="/metas"
          />
          <Capa
            num="4"
            nombre="KRs en foco de la semana (1-3)"
            color="sky"
            desc="Eje ORTOGONAL: el trimestre dice cuándo se entrega; la semana dice dónde pongo horas."
            ruta="/semana"
          />
          <Capa
            num="3"
            nombre="WIGs-tarea (1-3) + Tareas del repositorio (todas)"
            color="fuchsia"
            desc="Conductas que sostienen los WIGs. El resto vive en /tareas."
            ruta="/tareas"
          />
          <Capa
            num="2"
            nombre="Plan semanal + Plan diario"
            color="emerald"
            desc="Qué bloque de tiempo ejecuta qué tarea."
            ruta="/plan-diario"
          />
          <Capa
            num="1"
            nombre="Próxima Acción Física (en /focus, con Pomodoro)"
            color="amber"
            desc="La única tarea visible. El cerebro ejecuta, no decide."
            ruta="/focus"
            ultima
          />
        </div>

        <p className="mt-4 text-xs italic text-muted-foreground">
          ⚠️ El orden importa: si saltas de Norte a Plan diario sin pasar por
          WIGs, terminarás con un día lleno de actividad sin impacto. La app
          está diseñada para que las capas 4 y 3 no puedan quedarse vacías si
          la 5 existe.
        </p>

        <p className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Dónde se ven las capas.</strong>{" "}
          La home (<code className="rounded bg-muted px-1 py-0.5 text-[10px]">/</code>)
          abre con las tres capas de foco{" "}
          <em>una detrás de otra</em>: los WIGs de meta (capa 5, violeta), los
          KRs en foco de la semana (capa 4, celeste, “KRs en foco — esta semana
          (máx 3)”) y los WIGs de tarea (capa 3, fucsia). Esa es la cascada
          meta → KR → tarea completa en la primera pantalla del día: si una
          capa está quieta, ya sabes en cuál mirar. Y el{" "}
          <strong className="text-foreground">inventario global</strong> de
          la capa de KRs (todos los resultados con su meta, su proyecto y su
          entrega) está en{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">/krs</code>.
        </p>
      </section>

      {/* ================================================================
          8. EJEMPLO COMPLETO
         ================================================================ */}
      <section className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          Ejemplo completo
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Meta: "Escribir un libro técnico"
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cómo se vería esta meta mapeada a las 7 capas del sistema:
        </p>

        <div className="mt-5 space-y-3">
          <EjemploCapa
            capa="Capa 7 · Norte"
            contenido='"Convertirme en referente técnico de mi nicho en 10 años" (Visión).'
            color="slate"
          />
          <EjemploCapa
            capa="Capa 6 · Meta (Lag)"
            contenido='Título: "Escribir un libro técnico". Plazo: 6 meses. Estado: en_progreso. KRs: 10 capítulos, 5 beta-readers, 200 páginas.'
            color="violet"
          />
          <EjemploCapa
            capa="Capa 5 · WIG-meta"
            contenido='es_wig = true, wig_orden = 1 (la única meta WIG este trimestre).'
            color="violet"
          />
          <EjemploCapa
            capa="Capa 4 · KRs en foco de la semana"
            contenido={
              <>
                Esta semana enfoco: <strong>KR &quot;10 capítulos&quot;</strong> (Q2, quedan 12 días).
                <br />
                <span className="text-muted-foreground">
                  El trimestre (Q2) dice <em>cuándo se entrega</em>; el foco semanal dice{" "}
                  <em>en qué estás trabajando ahora</em>. Sin esto, el salto documentado
                  era meta → tarea y la semana se planificaba sin mirar tus metas.
                </span>
              </>
            }
            color="sky"
          />
          <EjemploCapa
            capa="Capa 3 · WIGs-tarea + repositorio"
            contenido={
              <>
                <strong>WIG-tarea 1</strong>: "Escribir 90 min/día de trabajo profundo" (es_wig=true, wig_orden=1).
                <br />
                <strong>WIG-tarea 2</strong>: "Leer 1 capítulo de referencia/semana" (wig_orden=2).
                <br />
                <span className="text-muted-foreground">
                  + 40 tareas más en /tareas: investigar, diseñar estructura, entrevistar especialista, maquetar, etc.
                </span>
              </>
            }
            color="fuchsia"
          />
          <EjemploCapa
            capa="Capa 2 · Plan semanal + diario"
            contenido='Lunes: bloque 9-10:30 "Escribir cap. 1". Martes: bloque 9-10:30 "Leer referencia cap. 2". Plan diario: 1 imprescindible = "Redactar primeros 2 párrafos del cap. 1".'
            color="emerald"
          />
          <EjemploCapa
            capa="Capa 1 · Próxima Acción (en /focus)"
            contenido='"Abrir el documento y escribir 2 párrafos del cap. 1". Pomodoro 50 min + pre-flight (cerrar email, silenciar).'
            color="amber"
          />
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          Tu mente solo ve la capa 1 cuando ejecutas. Las otras 6 existen en
          Supabase y te dan la confianza de que "el plan completo está
          guardado". Eso es lo que desactiva el efecto Zeigarnik.
        </p>
      </section>

      {/* ================================================================
          9. ANTI-PATRONES
         ================================================================ */}
      <section className="rounded-2xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-orange-500/5 p-6 sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700 dark:text-red-300">
          Lo que NO hacer
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          5 anti-patrones que rompen el sistema
        </h2>

        <div className="mt-5 space-y-4">
          {ANTIPATRONES.map((ap, i) => (
            <article
              key={i}
              className="rounded-lg border border-red-500/20 bg-background/70 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-700 dark:text-red-300">
                  ✕
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">{ap.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Por qué rompe:</strong>{" "}
                    {ap.por_que}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Qué hacer:</strong>{" "}
                    {ap.que_hacer}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================================================================
          8. PENDIENTES DE RESPUESTA
         ================================================================ */}
      <Seccion
        emoji="⏳"
        tag="GTD · Waiting For"
        tagColor="amber"
        titulo="Lo que NO depende de ti: panel de pendientes de respuesta"
        puntos={PENDIENTES_RESPUESTA}
        extra={
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Cómo se materializa en la app
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>
                · <strong className="text-foreground">BD</strong>: columnas
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">pendiente_respuesta</code>
                (bool) y
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">pendiente_respuesta_at</code>
                (timestamptz) en <code className="rounded bg-muted px-1 py-0.5 text-xs">tareas</code>.
                Migration 0026.
              </li>
              <li>
                · <strong className="text-foreground">Toggle</strong>: icono de reloj ⏳ al
                lado de la diana 🎯 de WIG en cada fila de /tareas. Mismo patrón,
                sin cap (puedes tener N esperando).
              </li>
              <li>
                · <strong className="text-foreground">Panel</strong>:{" "}
                <Link href="/tareas/pendientes-respuesta" className="font-medium text-foreground underline underline-offset-4">
                  /tareas/pendientes-respuesta
                </Link>{" "}
                las lista ordenadas por antigüedad del flag (lo que más tiempo
                lleva esperando primero) con métrica de “cuántas hechas
                probablemente ya tienen respuesta” (= tienes que destildar).
              </li>
              <li>
                · <strong className="text-foreground">Sidebar</strong>: nueva
                entrada “Pendientes respuesta” (icono reloj) en el bloque
                Ejecución.
              </li>
            </ul>
          </div>
        }
      />

      {/* ================================================================
          9. CRITERIO DE SELECCIÓN (Motor determinista)
         ================================================================ */}
      <Seccion
        emoji="🎯"
        tag="GTD · Next Action Automática"
        tagColor="sky"
        titulo="Qué entra HOY y por qué: el criterio de selección"
        puntos={CRITERIO_SELECCION}
        extra={
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
            <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-300">
              Cómo se materializa en la app
            </h3>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>
                · <strong className="text-foreground">Código</strong>:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  src/lib/recuperacion/seleccion.ts
                </code>{" "}
                — función pura{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  seleccionarPlan()
                </code>{" "}
                que devuelve principal, secundarias, mantenimiento, avisos y
                descartables, cada tarea con su motivo en texto plano.
              </li>
              <li>
                · <strong className="text-foreground">Tests</strong>:{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  src/lib/recuperacion/seleccion.test.mjs
                </code>{" "}
                (50 casos, incluidos en{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  npm test
                </code>
                ). Verifican el orden de las reglas, la adaptación a la
                capacidad, que los riesgos no se silencian, que el matching no
                genera falsos positivos y que el motor es determinista y no
                muta la entrada.
              </li>
              <li>
                · <strong className="text-foreground">Datos</strong>: solo
                lectura de{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">tareas</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">metas</code>{" "}
                y{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">pagos</code>. Sin
                campos nuevos, sin tablas nuevas, sin migración.
              </li>
              <li>
                · <strong className="text-foreground">Estado</strong>: el
                <em>criterio</em> ya tiene su Modo sombra: el botón{" "}
                <strong className="text-foreground">“¿Qué propondría el
                sistema?”</strong>{" "}
                en{" "}
                <Link
                  href="/plan-diario"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  /plan-diario
                </Link>{" "}
                pinta la propuesta{" "}
                <strong className="text-foreground">sin escribir nada en la
                base de datos</strong>{" "}
                —ni estados, ni fechas, ni descartes— y la compara con el
                plan que ya tienes. Es la fase de observación: ver si el
                criterio acierta antes de que automatice. El motor es el
                mismo, así que lo que ves hoy es exactamente lo que se
                guardará cuando se active.
              </li>
            </ul>
          </div>
        }
      />

      {/* ================================================================
          FOOTER
         ================================================================ */}
      <footer className="rounded-2xl border border-dashed border-border bg-muted/30 p-6">
        <h3 className="text-sm font-semibold">Ver también</h3>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/docs" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconBook className="h-4 w-4" />
              /docs · Los 5 pilares (base filosófica: Deep Work, Metas, Tiempo, Hábitos, Descanso)
            </Link>
          </li>
          <li>
            <Link href="/metas" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconTarget className="h-4 w-4 text-violet-500" />
              /metas · marcar tus WIGs (panel violeta)
            </Link>
          </li>
          <li>
            <Link href="/tareas" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconList className="h-4 w-4 text-fuchsia-500" />
              /tareas · marcar tus WIGs-tarea (panel fucsia)
            </Link>
          </li>
          <li>
            <Link href="/captura" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconInbox className="h-4 w-4" />
              /captura · vaciar la cabeza (efecto Zeigarnik)
            </Link>
          </li>
          <li>
            <Link href="/tareas/pendientes-respuesta" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconClock className="h-4 w-4 text-amber-500" />
              /tareas/pendientes-respuesta · lo que esperas de otros (Waiting For)
            </Link>
          </li>
          <li>
            <Link href="/pagos" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconClock className="h-4 w-4 text-violet-500" />
              /pagos · botón IA “✨ Sugerir pagos” (migration 0027) — la IA programa los próximos 6 lunes con tu prompt editable en /configuracion
            </Link>
          </li>
          <li>
            <Link href="/matriz" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconTarget className="h-4 w-4 text-blue-500" />
              /matriz · Matriz Eisenhower 2D con drag &amp; drop + IA “Sugerir redistribución” — urgencia × importancia calculada en JS, sin migración
            </Link>
          </li>
          <li>
            <Link href="/escenarios" className="inline-flex items-center gap-2 font-medium text-foreground underline underline-offset-4">
              <IconTarget className="h-4 w-4 text-violet-500" />
              /escenarios · Capa de escenarios de proyecto: contexto (cronología) + estado (medido) + situación (interpretada), y los escenarios con su estrategia generados bajo demanda (migration 0029)
            </Link>
          </li>
          <li>
            <span className="inline-flex items-center gap-2 font-medium text-foreground">
              <IconMessage className="h-4 w-4 text-violet-500" />
              chat del agente · botón flotante en toda la app: pregunta por
              tus metas, KRs, proyectos y tareas y te responde con el estado
              real del sistema. Solo lectura — la arquitectura de 4 capas
              (proyecto → meta → KR → tarea) no cambia, solo se consulta
              (migration 0035)
            </span>
          </li>
        </ul>
        <p className="mt-5 text-sm text-muted-foreground">
          🎯 ¿Quieres que configuremos juntos la estructura desglosada de
          uno de tus proyectos, desde los WIGs-meta hasta las primeras
          próximas acciones? Dime cuál y arrancamos por capas.
        </p>
      </footer>
    </div>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================

function Pill({ numero, texto, sub }: { numero: string; texto: string; sub: string }) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-bold text-violet-700 dark:text-violet-300">
          {numero}
        </span>
        <div>
          <div className="text-sm font-semibold">{texto}</div>
          <div className="text-[11px] text-muted-foreground">{sub}</div>
        </div>
      </div>
    </div>
  );
}

type SeccionProps = {
  emoji: string;
  tag: string;
  tagColor: "red" | "violet" | "amber" | "emerald" | "sky";
  titulo: string;
  puntos: Punto[];
  extra?: React.ReactNode;
};

function Seccion({ emoji, tag, tagColor, titulo, puntos, extra }: SeccionProps) {
  const tagClass: Record<SeccionProps["tagColor"], string> = {
    red: "text-red-700 dark:text-red-300",
    violet: "text-violet-700 dark:text-violet-300",
    amber: "text-amber-700 dark:text-amber-300",
    emerald: "text-emerald-700 dark:text-emerald-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${tagClass[tagColor]}`}>
        {tag}
      </div>
      <header className="mb-4 mt-1 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {emoji}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
      </header>
      <div className="space-y-4">
        {puntos.map((pt, i) => (
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
      {extra && <div className="mt-5">{extra}</div>}
    </section>
  );
}

function Capa({
  num,
  nombre,
  color,
  desc,
  ruta,
  ultima,
}: {
  num: string;
  nombre: string;
  color: "slate" | "violet" | "fuchsia" | "emerald" | "amber" | "sky";
  desc: string;
  ruta: string;
  ultima?: boolean;
}) {
  const colorMap: Record<typeof color, string> = {
    slate: "border-l-slate-500",
    violet: "border-l-violet-500",
    fuchsia: "border-l-fuchsia-500",
    emerald: "border-l-emerald-500",
    amber: "border-l-amber-500",
    sky: "border-l-sky-500",
  };
  const numMap: Record<typeof color, string> = {
    slate: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
    violet: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
    fuchsia: "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
    emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    sky: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  };
  return (
    <div
      className={`flex items-center gap-3 border-b border-border/60 border-l-4 ${colorMap[color]} px-3 py-2.5 ${
        ultima ? "border-b-0" : ""
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${numMap[color]}`}
      >
        {num}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{nombre}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <Link
        href={ruta}
        className="shrink-0 text-[10px] text-muted-foreground underline-offset-4 hover:underline"
      >
        {ruta} →
      </Link>
    </div>
  );
}

function EjemploCapa({
  capa,
  contenido,
  color,
}: {
  capa: string;
  contenido: React.ReactNode;
  color: "slate" | "violet" | "fuchsia" | "emerald" | "amber" | "sky";
}) {
  const tagClass: Record<typeof color, string> = {
    slate: "border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
    sky: "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300",
  };
  return (
    <div className={`rounded-lg border ${tagClass[color]} p-3`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider">
        {capa}
      </div>
      <div className="mt-1.5 text-sm leading-relaxed">{contenido}</div>
    </div>
  );
}
