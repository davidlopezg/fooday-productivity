"use client";

import { useState } from "react";
import Link from "next/link";
import {
  fetchContadores,
  fetchKRsFocoSemanal,
  fetchPlanHoy,
  fetchTareas,
  fetchWigTareas,
  fetchWigs,
} from "@/lib/queries";
import { marcarHecha } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { getCurrentISOWeek } from "@/lib/semana";
import { diasHastaFecha, fechasDeTarea } from "@/lib/fechas";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { PanelFocoSemanaKRs } from "@/components/PanelFocoSemanaKRs";
import { PagosWidget } from "@/components/pagos/PagosWidget";
import { PagosNotificaciones } from "@/components/pagos/PagosNotificaciones";
import { PlanRecuperacion } from "@/components/PlanRecuperacion";
import { usePropuestaRecuperacion } from "@/lib/recuperacion/usePropuestaRecuperacion";
import { IconCalendar, IconTarget } from "@/components/icons";
import type {
  AmbitoTarea,
  KrFocoConDetalle,
  PlanDiario,
  PlanDiarioTarea,
  Tarea,
} from "@/lib/types";

const SEMAFORO: Record<string, string> = {
  verde: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amarillo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rojo: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const TONO_PRIORIDAD: Record<string, string> = {
  critica: "text-red-600 dark:text-red-400",
  urgente: "text-orange-600 dark:text-orange-400",
  alta: "text-amber-600 dark:text-amber-400",
  media: "text-muted-foreground",
  baja: "text-muted-foreground",
};

const AMBITO_LABEL_TAREA: Record<AmbitoTarea, string> = {
  personal: "👤 Personal",
  profesional: "💼 Profesional",
};

// ============================================================================
// Tareas con fecha — utilidades
// ----------------------------------------------------------------------------
// Una tarea "tiene fecha" si tiene `fecha_fin` (columna date) o si su
// `deadline` es una fecha de verdad. OJO: `deadline` es una NOTA de texto
// libre ("esta semana", "mañana…"), no una fecha — por eso las fechas se
// validan con `fechasDeTarea()` y las notas se pintan como texto.
// Las que solo tienen nota se muestran AL FINAL del panel, sin badge de
// días: antes se intentaba parsear y salían "en NaNd" / "Invalid Date".
// ============================================================================

/** "mié 12 nov" a partir de un YYYY-MM-DD. */
function formatoFechaCorta(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type Wig = Awaited<ReturnType<typeof fetchWigs>>[number];
type WigTarea = Awaited<ReturnType<typeof fetchWigTareas>>[number];

type Data = {
  plan: (PlanDiario & { tareas: PlanDiarioTarea[] }) | null;
  contadores: { tareasPendientes: number; metasActivas: number; capturasPendientes: number };
  pendientes: Tarea[];
  wigs: Wig[];
  /** KRs en el foco de la semana actual (capa intermedia meta → tarea). */
  focoKRs: KrFocoConDetalle[];
  wigTareas: WigTarea[];
};

export default function HoyPage() {
  // ── Modo Recuperación (Fases 4, 5, 6): la propuesta ejecutable. ──
  // Se carga siempre en la home `/`: es el corazón del sistema.
  const {
    propuesta,
    cargando: propCargando,
    error: propError,
    aviso: propAviso,
    recargar: propRecargar,
  } = usePropuestaRecuperacion(true);

  const { data, loading, reload } = useData<Data>(async () => {
    const semana = getCurrentISOWeek();
    const [plan, contadores, pendientes, wigs, focoKRs, wigTareas] = await Promise.all([
      fetchPlanHoy(),
      fetchContadores(),
      fetchTareas("pendiente"),
      fetchWigs(),
      fetchKRsFocoSemanal(semana.anio, semana.semana_iso),
      fetchWigTareas(),
    ]);
    return { plan, contadores, pendientes, wigs, focoKRs, wigTareas };
  }, {
    plan: null,
    contadores: { tareasPendientes: 0, metasActivas: 0, capturasPendientes: 0 },
    pendientes: [],
    wigs: [],
    focoKRs: [],
    wigTareas: [],
  });

  // ------------------------------------------------------------------------
  // Tareas con fecha: derivamos del listado de pendientes (estado='pendiente')
  // ya cargado. Una tarea entra si tiene `fecha_fin` (fecha real) o un
  // `deadline` en texto libre (nota). Las de fecha real van primero, ordenadas
  // ascendente (las vencidas arriba del todo); las que solo tienen nota van
  // detrás, sin cálculo de días (su deadline no es una fecha).
  // ------------------------------------------------------------------------
  const tareasConFecha = data.pendientes
    .map((t) => ({ tarea: t, ...fechasDeTarea(t) }))
    .filter((x) => x.fecha !== null || x.texto !== null)
    .sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha);
      if (a.fecha) return -1;
      if (b.fecha) return 1;
      return (a.texto ?? "").localeCompare(b.texto ?? "");
    });

  // Para el check inline sin tocar la API de `data`: estado local optimista.
  // Cuando el usuario marca una tarea hecha, la sacamos de la vista al
  // instante. Si falla, la devolvemos y mostramos error.
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const [errorCheck, setErrorCheck] = useState<string | null>(null);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  async function toggleHecho(t: Tarea) {
    setErrorCheck(null);
    setGuardandoId(t.id);
    // Optimista: ocultamos al instante. Si falla, revertimos.
    setOcultas((cur) => {
      const next = new Set(cur);
      next.add(t.id);
      return next;
    });
    try {
      await marcarHecha(t.id);
      await reload();
    } catch (e) {
      setOcultas((cur) => {
        const next = new Set(cur);
        next.delete(t.id);
        return next;
      });
      setErrorCheck(
        e instanceof Error ? e.message : "No se pudo actualizar la tarea.",
      );
    } finally {
      setGuardandoId(null);
    }
  }

  const tareasConFechaVisibles = tareasConFecha.filter((x) => !ocultas.has(x.tarea.id));
  const TAREA_CON_FECHA_MAX = 8;

  const stats = [
    { label: "Tareas pendientes", value: data.contadores.tareasPendientes, href: "/tareas" },
    { label: "Metas activas", value: data.contadores.metasActivas, href: "/metas" },
    { label: "Inbox", value: data.contadores.capturasPendientes, href: "/captura" },
  ];

  return (
    <div className="space-y-8">
      {/* Activa las notificaciones PWA del domingo por la noche. No pinta nada. */}
      <PagosNotificaciones />

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hoy</h1>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {new Date().toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <HelpDrawer title="Hoy" items={AYUDA_POR_RUTA["/"]?.items ?? []} />
        </div>
      </header>

      {/* Widget de pagos: lunes o próximos */}
      <PagosWidget />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="text-3xl font-bold tracking-tight">
              {loading ? "—" : c.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{c.label}</div>
          </Link>
        ))}
      </section>

      {/* WIGs del día — recordatorio de foco */}
      {data.wigs.length > 0 && (
        <section
          className="rounded-xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5"
          aria-label="Metas enormemente importantes"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <IconTarget className="h-5 w-5 text-violet-500" />
              Metas Enormemente Importantes
            </h2>
            <Link
              href="/metas"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              editar WIGs
            </Link>
          </header>
          <ul className="space-y-2">
            {data.wigs.map((w) => {
              const pct =
                w.total_tareas === 0
                  ? 0
                  : Math.round((w.tareas_hechas / w.total_tareas) * 100);
              return (
                <li
                  key={w.id}
                  className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-background/70 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">
                    {w.wig_orden ?? "?"}
                  </span>
                  <Link
                    href={`/metas/detalle?id=${w.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {w.titulo}
                  </Link>
                  {w.ambito && (
                    <span className="hidden shrink-0 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                      {w.ambito === "personal" ? "👤" : "💼"}
                    </span>
                  )}
                  <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                    {w.tareas_hechas}/{w.total_tareas}
                  </span>
                  <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* KRs WIG — capa intermedia: los resultados medibles en los que se
          pone horas esta semana (foco semanal de /semana). Va ENTRE los
          WIGs de meta y los WIGs de tarea porque esa es la cascada:
          meta → KR → tarea. (Panel compartido con /tareas.)
          Si esta semana no hay foco elegido, el panel se pinta IGUAL con
          su estado vacío: la capa intermedia siempre se ve, para que se
          sepa que falta elegir el foco. */}
      <PanelFocoSemanaKRs
        focos={data.focoKRs}
        estadoVacio="Esta semana todavía no has elegido el foco: los KRs en los que pones horas son el eslabón entre tus metas y tus tareas. Elige hasta 3 en /semana."
      />

      {/* Tareas WIG — capa de ejecución de los WIGs de metas */}
      {data.wigTareas.length > 0 && (
        <section
          className="rounded-xl border-2 border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-5"
          aria-label="Tareas enormemente importantes"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <IconTarget className="h-5 w-5 text-fuchsia-500" />
              Tareas Enormemente Importantes
            </h2>
            <Link
              href="/tareas"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              editar
            </Link>
          </header>
          <p className="mb-3 text-xs text-muted-foreground">
            Las {data.wigTareas.length} tareas concretas (de las 3 máx) que sostienen
            tus WIGs de arriba. Si no avanzan los WIGs, mira aquí primero.
          </p>
          <ul className="space-y-2">
            {data.wigTareas.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-lg border border-fuchsia-500/30 bg-background/70 px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold tabular-nums text-fuchsia-700 dark:text-fuchsia-300">
                  {w.wig_orden ?? "?"}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-sm font-medium ${
                    w.estado === "hecha" ? "line-through opacity-60" : ""
                  }`}
                >
                  {w.titulo}
                </span>
                {w.ambito && (
                  <span className="hidden shrink-0 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                    {AMBITO_LABEL_TAREA[w.ambito]}
                  </span>
                )}
                {w.prioridad && (
                  <span
                    className={`shrink-0 text-[11px] font-medium uppercase ${
                      TONO_PRIORIDAD[w.prioridad] ?? "text-muted-foreground"
                    }`}
                  >
                    {w.prioridad}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Modo Recuperación: lo que el sistema propone hoy, con su porque,
              su primer paso y su pomodoro. Es la home. ── */}
      <PlanRecuperacion
        propuesta={propuesta}
        cargando={propCargando}
        error={propError}
        aviso={propAviso}
        onCambio={() => {
          void propRecargar();
          void reload();
        }}
      />

      {/* Tareas con fecha — ordenadas por deadline ascendente.
          Lo más urgente arriba (vencidas primero, luego HOY, luego futuras). */}
      {tareasConFechaVisibles.length > 0 && (
        <section
          className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5"
          aria-label="Tareas con fecha"
        >
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <IconCalendar className="h-5 w-5 text-amber-500" />
              Tareas con fecha
            </h2>
            <Link
              href="/tareas"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              title="Ver todas las tareas con fecha en /tareas"
            >
              ver todas
            </Link>
          </header>
          <p className="mb-3 text-xs text-muted-foreground">
            Tareas pendientes con{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">fecha_fin</code> (fecha real) o con{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">deadline</code> (nota), ordenadas de la
            más urgente (vencida) a la más lejana. Las que solo tienen nota van al final, con su texto
            tal cual. Pulsa el ☐ para marcarla hecha sin salir de aquí.
          </p>
          {errorCheck && (
            <p className="mb-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {errorCheck}
            </p>
          )}
          <ul className="space-y-1.5">
            {tareasConFechaVisibles.slice(0, TAREA_CON_FECHA_MAX).map(({ tarea, fecha, texto }) => {
              // Sin fecha real no hay badge de días: se muestra la nota tal cual.
              const dias = fecha ? diasHastaFecha(fecha) : null;
              let badgeCls = "bg-muted text-muted-foreground border-border";
              let badgeTxt = texto ?? "";
              let badgeTitulo = texto ? `Deadline: ${texto}` : "";
              if (dias !== null) {
                const vencida = dias < 0;
                const hoy = dias === 0;
                // Color del badge por urgencia
                badgeTxt = `en ${dias}d`;
                if (vencida) {
                  badgeCls =
                    "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30";
                  badgeTxt = `retrasada ${Math.abs(dias)}d`;
                } else if (hoy) {
                  badgeCls =
                    "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30";
                  badgeTxt = "HOY";
                } else if (dias <= 2) {
                  badgeCls =
                    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
                } else if (dias <= 7) {
                  badgeCls =
                    "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20";
                }
                badgeTitulo = `Fecha: ${formatoFechaCorta(fecha!)}`;
              }
              const guardando = guardandoId === tarea.id;
              return (
                <li
                  key={tarea.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleHecho(tarea)}
                    disabled={guardando}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border hover:border-amber-500 disabled:opacity-50"
                    title="Marcar hecha"
                    aria-label={`Marcar hecha: ${tarea.titulo}`}
                  >
                    {guardando ? "…" : ""}
                  </button>
                  <span className="min-w-0 flex-1 truncate">
                    {tarea.titulo}
                  </span>
                  {tarea.prioridad && (
                    <span
                      className={`hidden shrink-0 text-[10px] font-medium uppercase sm:inline ${
                        TONO_PRIORIDAD[tarea.prioridad] ?? "text-muted-foreground"
                      }`}
                    >
                      {tarea.prioridad}
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] tabular-nums ${badgeCls}`}
                    title={badgeTitulo}
                  >
                    {badgeTxt}
                  </span>
                  {fecha && (
                    <span className="hidden shrink-0 text-[10px] tabular-nums text-muted-foreground sm:inline">
                      {formatoFechaCorta(fecha)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {tareasConFechaVisibles.length > TAREA_CON_FECHA_MAX && (
            <div className="mt-3 text-center">
              <Link
                href="/tareas"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                + {tareasConFechaVisibles.length - TAREA_CON_FECHA_MAX} más con fecha en /tareas
              </Link>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold tracking-tight">Plan de hoy</h2>
        {data.plan ? (
          <div className="space-y-4">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                SEMAFORO[data.plan.semaforo ?? "amarillo"]
              }`}
            >
              {(data.plan.semaforo ?? "—").toUpperCase()}
            </span>
            {data.plan.resumen && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.plan.resumen}
              </p>
            )}
            <ul className="space-y-2">
              {data.plan.tareas.map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="text-base">{t.hecho ? "✅" : "⬜"}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                    {t.tipo}
                  </span>
                  <span>{t.titulo_libre ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay plan generado para hoy.{" "}
            <Link href="/captura" className="font-medium text-foreground underline underline-offset-4">
              Haz una captura
            </Link>{" "}
            y el agente generará el plan.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold tracking-tight">Tareas pendientes</h2>
          <Link
            href="/tareas"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ver todas
          </Link>
        </div>
        <ul className="divide-y divide-border/60">
          {data.pendientes.slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="min-w-0 flex-1">{t.titulo}</span>
              {t.prioridad && (
                <span
                  className={`text-[11px] font-medium uppercase ${
                    TONO_PRIORIDAD[t.prioridad] ?? ""
                  }`}
                >
                  {t.prioridad}
                </span>
              )}
            </li>
          ))}
          {!loading && data.pendientes.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Sin tareas pendientes.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
