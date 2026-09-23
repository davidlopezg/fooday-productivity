"use client";

import Link from "next/link";
import { fetchContadores, fetchPlanHoy, fetchTareas } from "@/lib/queries";
import { useData } from "@/lib/useData";
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

type Data = {
  plan: (PlanDiario & { tareas: PlanDiarioTarea[] }) | null;
  contadores: { tareasPendientes: number; metasActivas: number; capturasPendientes: number };
  pendientes: Tarea[];
};

export default function HoyPage() {
  const { data, loading } = useData<Data>(async () => {
    const [plan, contadores, pendientes] = await Promise.all([
      fetchPlanHoy(),
      fetchContadores(),
      fetchTareas("pendiente"),
    ]);
    return { plan, contadores, pendientes };
  }, {
    plan: null,
    contadores: { tareasPendientes: 0, metasActivas: 0, capturasPendientes: 0 },
    pendientes: [],
  });

  const stats = [
    { label: "Tareas pendientes", value: data.contadores.tareasPendientes, href: "/tareas" },
    { label: "Metas activas", value: data.contadores.metasActivas, href: "/metas" },
    { label: "Inbox", value: data.contadores.capturasPendientes, href: "/captura" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Hoy</h1>
        <p className="mt-1 text-sm capitalize text-muted-foreground">
          {new Date().toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
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
