"use client";

import { fetchMetas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { Meta } from "@/lib/types";

const ESTADO: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

export default function MetasPage() {
  const { data: metas, loading } = useData<Meta[]>(fetchMetas, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Metas / OKR</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "…" : metas.length} metas registradas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {metas.map((m) => (
          <article
            key={m.id}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">{m.codigo ?? "—"}</span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  ESTADO[m.estado] ?? ESTADO.sin_empezar
                }`}
              >
                {m.estado.replace("_", " ")}
              </span>
            </div>
            <h2 className="mt-3 font-semibold tracking-tight">{m.titulo}</h2>
            {m.descripcion && (
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {m.descripcion}
              </p>
            )}
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              {m.rice != null && <span>RICE {m.rice}</span>}
              {m.plazo && <span>· {m.plazo}</span>}
            </div>
          </article>
        ))}
        {!loading && metas.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay metas cargadas.</p>
        )}
      </div>
    </div>
  );
}
