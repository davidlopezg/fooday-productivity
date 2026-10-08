"use client";

import Link from "next/link";
import {
  IconArrowLeft,
  IconBolt,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClipboardCheck,
  IconCompass,
  IconFlag,
  IconInbox,
  IconList,
  IconTarget,
  IconX,
} from "@/components/icons";

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
type Punto = { titulo: string; cuerpo: string };

// ============================================================================
// SECCIÓN 1 — El problema
// ============================================================================
const PROBLEMA: Punto[] = [
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

// ============================================================================
// SECCIÓN 2 — Lag vs Lead (4DX)
// ============================================================================
const LAG_VS_LEAD: { dimension: string; lag: string; lead: string }[] = [
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
    lag: "Tabla `metas` + `periodos` + `resultados_periodo` (los KRs viven aquí, ver /metas/plan). El campo `plazo` de la meta define en cuáles trimestres la IA y el agente deben generar KRs.",
    lead: "Columna `es_wig` en `metas` (panel violeta) y en `tareas` (panel fucsia).",
  },
];

// ============================================================================
// SECCIÓN 3 — WIGs (Wildly Important Goals)
// ============================================================================
const WIG_PUNTOS: Punto[] = [
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
    titulo: "El diseño de dos capas de WIGs (novedad de esta app)",
    cuerpo:
      "La mayoría de herramientas mezclan 'meta' y 'tarea' en una sola lista. Esta app separa dos planos: (a) WIGs de METAS (qué resultados quieres, máx 3) y (b) WIGs de TAREAS (qué 3 tareas concretas los sostienen). Son dos caps independientes de 3 — uno sin el otro no funciona.",
  },
  {
    titulo: "Dónde se ven y cómo se marcan en la app",
    cuerpo:
      "Cada capa tiene su panel violeta/fucsia con contador N/3: el de METAS vive arriba de /metas (con botón “Sugerir 3 WIGs” por IA); el de TAREAS vive arriba de /tareas y también en / (sección “Tareas Enormemente Importantes”, debajo del panel de metas). En ambos casos, el botón 🎯 dentro de cada tarjeta/fila asciende a WIG y la RPC toggle_*_wig rechaza el 4º para mantener el cap.",
  },
];

// ============================================================================
// SECCIÓN 4 — El repositorio GTD externo
// ============================================================================
const GTD_PUNTOS: Punto[] = [
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

// ============================================================================
// SECCIÓN 5 — La Próxima Acción Física
// ============================================================================
const NEXT_ACTION_PUNTOS: Punto[] = [
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

// ============================================================================
// SECCIÓN 6 — Los dos inboxes
// ============================================================================
const INBOXES = [
  {
    ruta: "/captura",
    nombre: "Captura",
    que: "Pensamiento suelto: tareas, ideas, problemas, pagos, reflexiones.",
    cuando:
      "Cuando algo lleva más de 15 segundos en tu cabeza. Es escritura rápida, sin estructura.",
    color: "violet",
    icono: IconInbox,
    rama: "ramas: tarea · problema · reflexión · idea · pago · maría · sin_clasificar",
  },
  {
    ruta: "/tareas/inbox",
    nombre: "Tareas (inbox de triaje)",
    que: "Tareas (filas de la tabla `tareas`) sin meta asignada o sin trimestre.",
    cuando:
      "Solo cuando ya tienes una tarea formalizada y necesitas decidir a qué objetivo/trimestre pertenece.",
    color: "sky",
    icono: IconFlag,
    rama: "no se mezcla con el inbox de cabeza: aquí ya son tareas, no pensamientos.",
  },
];

// ============================================================================
// SECCIÓN 7 — Anti-patrones
// ============================================================================
const ANTIPATRONES: { titulo: string; por_que: string; que_hacer: string }[] = [
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
                  UI: panel violeta (WIGs-meta) + panel fucsia (WIGs-tarea) en{" "}
                  <Link href="/" className="font-medium text-foreground underline underline-offset-4">
                    Hoy
                  </Link>
                  .
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-fuchsia-500">·</span>
                <span>
                  <strong className="text-foreground">Alcance temporal de una meta (campo <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">plazo</code>).</strong>{" "}
                  Define en qué trimestres la IA y el agente generan KRs. Formatos: <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">Q3 2026</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">Q1-Q3</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">Q1, Q3</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">fin de 2026</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">trimestre 3</code>… Si lo dejas vacío, se cubren los 4 trimestres. La función <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">parsearTrimestresDePlazo()</code> en <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">/lib/plan.ts</code> hace el mapeo texto → trimestres.
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
                <span><strong>Panel WIG-meta</strong> (violeta) — 1-3 metas, con % de progreso.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">4</span>
                <span><strong>Panel WIG-tarea</strong> (fucsia) — 1-3 tareas que los sostienen.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">5</span>
                <span><strong>Plan de hoy</strong> — 3-4 imprescindibles + autocuidado + micro + extra.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">6</span>
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
                <ib.icono
                  className={`h-5 w-5 ${
                    ib.color === "violet" ? "text-violet-500" : "text-sky-500"
                  }`}
                />
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
          Las 6 capas de la app, de arriba (propósito) a abajo (acción física).
          Cada capa alimenta a la siguiente; nada se pierde al bajar, se enfoca.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-border bg-background font-mono text-xs">
          <Capa
            num="6"
            nombre="Norte"
            color="slate"
            desc="Propósito · Valores · Visión (BHAG)"
            ruta="/norte"
          />
          <Capa
            num="5"
            nombre="Áreas + Metas (Lag) + OKRs + KRs + Hitos"
            color="violet"
            desc="Resultados a 6-12 meses. Sin Lead Measures no avanzan."
            ruta="/metas"
          />
          <Capa
            num="4"
            nombre="WIGs-meta (1-3)"
            color="violet"
            desc="Subconjunto de metas con foco desproporcionado. Enforced por DB."
            ruta="/metas"
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
          Cómo se vería esta meta mapeada a las 6 capas del sistema:
        </p>

        <div className="mt-5 space-y-3">
          <EjemploCapa
            capa="Capa 6 · Norte"
            contenido='"Convertirme en referente técnico de mi nicho en 10 años" (Visión).'
            color="slate"
          />
          <EjemploCapa
            capa="Capa 5 · Meta (Lag)"
            contenido='Título: "Escribir un libro técnico". Plazo: 6 meses. Estado: en_progreso. KRs: 10 capítulos, 5 beta-readers, 200 páginas.'
            color="violet"
          />
          <EjemploCapa
            capa="Capa 4 · WIG-meta"
            contenido='es_wig = true, wig_orden = 1 (la única meta WIG este trimestre).'
            color="violet"
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
          Tu mente solo ve la capa 1 cuando ejecutas. Las otras 5 existen en
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
  color: "slate" | "violet" | "fuchsia" | "emerald" | "amber";
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
  };
  const numMap: Record<typeof color, string> = {
    slate: "bg-slate-500/20 text-slate-700 dark:text-slate-300",
    violet: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
    fuchsia: "bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300",
    emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
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
  color: "slate" | "violet" | "fuchsia" | "emerald" | "amber";
}) {
  const tagClass: Record<typeof color, string> = {
    slate: "border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300",
    violet: "border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300",
    fuchsia: "border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-700 dark:text-fuchsia-300",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
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
