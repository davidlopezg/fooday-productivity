"use client";

import Link from "next/link";
import { fetchContadores, fetchPlanHoy, fetchTareas, fetchWigs } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { IconTarget } from "@/components/icons";
import type { PlanDiario, PlanDiarioTarea, Tarea } from "@/lib/types";

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

type Wig = Awaited<ReturnType<typeof fetchWigs>>[number];

type Data = {
  plan: (PlanDiario & { tareas: PlanDiarioTarea[] }) | null;
  contadores: { tareasPendientes: number; metasActivas: number; capturasPendientes: number };
  pendientes: Tarea[];
  wigs: Wig[];
};

export default function HoyPage() {
  const { data, loading } = useData<Data>(async () => {
    const [plan, contadores, pendientes, wigs] = await Promise.all([
      fetchPlanHoy(),
      fetchContadores(),
      fetchTareas("pendiente"),
      fetchWigs(),
    ]);
    return { plan, contadores, pendientes, wigs };
  }, {
    plan: null,
    contadores: { tareasPendientes: 0, metasActivas: 0, capturasPendientes: 0 },
    pendientes: [],
    wigs: [],
  });

  const stats = [
    { label: "Tareas pendientes", value: data.contadores.tareasPendientes, href: "/tareas" },
    { label: "Metas activas", value: data.contadores.metasActivas, href: "/metas" },
    { label: "Inbox", value: data.contadores.capturasPendientes, href: "/captura" },
  ];

  return (
    <div className="space-y-8">
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
