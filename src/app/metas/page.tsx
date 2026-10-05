"use client";

import Link from "next/link";
import { fetchMetasConProgreso } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import type { MetaConPlan } from "@/lib/types";
import { IconColumns, IconInbox, IconPlus } from "@/components/icons";

const ESTADO: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const ESTADO_DOT: Record<string, string> = {
  sin_empezar: "bg-slate-400",
  en_progreso: "bg-amber-500",
  bloqueada: "bg-red-500",
  completada: "bg-emerald-500",
  archivada: "bg-slate-300",
};

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const pctTxt = Math.round(pct * 100);
  // Color de la barra: rojo < 30%, ámbar < 70%, verde >= 70%.
  const color =
    pct < 0.3
      ? "bg-red-500"
      : pct < 0.7
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progreso</span>
        <span className="font-medium tabular-nums">{pctTxt}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pctTxt}%` }}
        />
      </div>
    </div>
  );
}

export default function MetasPage() {
  const { data: metas, loading } = useData<MetaConPlan[]>(
    fetchMetasConProgreso,
    [],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas / OKR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "…" : metas.length} metas registradas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Metas" items={AYUDA_POR_RUTA["/metas"]?.items ?? []} />
          <Link
            href="/tareas/inbox"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconInbox className="h-4 w-4" />
            Inbox
          </Link>
          <Link
            href="/metas/plan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconColumns className="h-4 w-4" />
            Plan trimestral
          </Link>
          <Link
            href="/metas/nueva"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nueva meta
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {metas.map((mp) => {
          const m = mp.meta;
          return (
            <Link
              key={m.id}
              href={`/metas/detalle?id=${m.id}`}
              className="group block rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {m.codigo ?? "—"}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    ESTADO[m.estado] ?? ESTADO.sin_empezar
                  }`}
                >
                  <span
                    className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                      ESTADO_DOT[m.estado] ?? ESTADO_DOT.sin_empezar
                    }`}
                  />
                  {m.estado.replace("_", " ")}
                </span>
              </div>
              <h2 className="mt-3 font-semibold tracking-tight group-hover:underline">
                {m.titulo}
              </h2>
              {m.descripcion && (
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {m.descripcion}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {m.rice != null && <span>RICE {m.rice}</span>}
                {m.plazo && <span>· {m.plazo}</span>}
                {mp.total_tareas > 0 && (
                  <span>
                    · {mp.tareas_hechas}/{mp.total_tareas} tareas
                  </span>
                )}
              </div>
              {mp.total_tareas > 0 && <ProgressBar value={mp.progreso} />}
            </Link>
          );
        })}
        {!loading && metas.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no tienes metas. Crea la primera con{" "}
              <Link
                href="/metas/nueva"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Nueva meta
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
