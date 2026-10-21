"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchContadores, fetchPlanHoy, fetchTareas, fetchWigTareas, fetchWigs } from "@/lib/queries";
import { marcarHecha } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { PagosWidget } from "@/components/pagos/PagosWidget";
import { PagosNotificaciones } from "@/components/pagos/PagosNotificaciones";
import { IconCalendar, IconTarget } from "@/components/icons";
import type { AmbitoTarea, PlanDiario, PlanDiarioTarea, Tarea } from "@/lib/types";

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
// Una tarea "tiene fecha" si tiene `deadline` (dura) o `fecha_fin` (blanda,
// migration 0000). Priorizamos `deadline` cuando ambas existen.
// Devuelve la fecha ISO (YYYY-MM-DD) o null.
// ============================================================================
function fechaLimiteTarea(t: Tarea): string | null {
  return t.deadline ?? t.fecha_fin ?? null;
}

/** Días enteros entre hoy (local) y la fecha ISO (YYYY-MM-DD).
 *  Negativo = ya vencida (retrasada). 0 = hoy. Positivo = futura. */
function diasHastaHoy(fechaIso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaIso + "T00:00:00");
  return Math.round((f.getTime() - hoy.getTime()) / 86_400_000);
}

function formatoFechaCorta(fechaIso: string): string {
  const f = new Date(fechaIso + "T00:00:00");
  return f.toLocaleDateString("es-ES", {
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
  wigTareas: WigTarea[];
};

export default function HoyPage() {
  const { data, loading, reload } = useData<Data>(async () => {
    const [plan, contadores, pendientes, wigs, wigTareas] = await Promise.all([
      fetchPlanHoy(),
      fetchContadores(),
      fetchTareas("pendiente"),
      fetchWigs(),
      fetchWigTareas(),
    ]);
    return { plan, contadores, pendientes, wigs, wigTareas };
  }, {
    plan: null,
    contadores: { tareasPendientes: 0, metasActivas: 0, capturasPendientes: 0 },
    pendientes: [],
    wigs: [],
    wigTareas: [],
  });

  // ------------------------------------------------------------------------
  // Tareas con fecha: derivamos del listado de pendientes (estado='pendiente')
  // ya cargado. Filtramos por .deadline o .fecha_fin y ordenamos por fecha
  // ascendente (las más próximas primero; las vencidas van arriba del todo).
  // ------------------------------------------------------------------------
  const tareasConFecha = data.pendientes
    .map((t) => ({ tarea: t, fecha: fechaLimiteTarea(t) }))
    .filter((x): x is { tarea: Tarea; fecha: string } => !!x.fecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

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
              Enormemente Importantes
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
            Tareas pendientes con <code className="rounded bg-muted px-1 py-0.5 text-[10px]">deadline</code> o{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">fecha_fin</code>, ordenadas de la más
            urgente (vencida) a la más lejana. Pulsa el ☐ para marcarla hecha sin salir de aquí.
          </p>
          {errorCheck && (
            <p className="mb-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {errorCheck}
            </p>
          )}
          <ul className="space-y-1.5">
            {tareasConFechaVisibles.slice(0, TAREA_CON_FECHA_MAX).map(({ tarea, fecha }) => {
              const dias = diasHastaHoy(fecha);
              const vencida = dias < 0;
              const hoy = dias === 0;
              // Color del badge por urgencia
              let badgeCls =
                "bg-muted text-muted-foreground border-border";
              let badgeTxt = `en ${dias}d`;
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
                badgeTxt = `en ${dias}d`;
              } else if (dias <= 7) {
                badgeCls =
                  "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20";
                badgeTxt = `en ${dias}d`;
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
                    title={`Fecha: ${formatoFechaCorta(fecha)}`}
                  >
                    {badgeTxt}
                  </span>
                  <span className="hidden shrink-0 text-[10px] tabular-nums text-muted-foreground sm:inline">
                    {formatoFechaCorta(fecha)}
                  </span>
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
