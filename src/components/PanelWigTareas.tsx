"use client";

import { IconTarget } from "@/components/icons";
import type { Tarea } from "@/lib/types";

const TONO_PRIORIDAD: Record<string, string> = {
  critica: "text-red-600 dark:text-red-400",
  urgente: "text-orange-600 dark:text-orange-400",
  alta: "text-amber-600 dark:text-amber-400",
  media: "text-muted-foreground",
  baja: "text-muted-foreground",
};

const AMBITO_LABEL: Record<string, string> = {
  personal: "👤",
  profesional: "💼",
};

/**
 * Panel WIG para la página /tareas — espejo del PanelWig de /metas.
 *
 * Muestra las tareas marcadas como "Enormemente Importantes" (4DX),
 * máx 3 a la vez. El toggle per-tarea ya está en TasksTable; aquí
 * solo se listan y se ofrece el botón "Quitar".
 */
export function PanelWigTareas({
  wigs,
  onQuitar,
  guardandoId,
}: {
  wigs: Tarea[];
  onQuitar: (tareaId: string) => void;
  guardandoId: string | null;
}) {
  return (
    <section
      className="rounded-2xl border-2 border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-500/10 to-violet-500/5 p-5"
      aria-label="Tareas enormemente importantes"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <IconTarget className="h-5 w-5 text-fuchsia-500" />
            WIGs — Tareas foco (máx 3)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Las 3 tareas concretas a las que dedicas energía desproporcionada
            este ciclo. Son la capa de ejecución: si no avanzan los WIGs de
            metas, mira aquí. El botón 🎯 dentro de la tabla asciende una tarea.
          </p>
        </div>
        <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold tabular-nums text-fuchsia-700 dark:text-fuchsia-300">
          {wigs.length} / 3
        </span>
      </header>

      {wigs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-fuchsia-500/30 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Todavía no has marcado ninguna tarea como WIG. Pulsa la{" "}
            <span className="font-medium text-foreground">diana 🎯</span> en
            una fila de abajo para ascenderla a Enormemente Importante.
          </p>
          <p className="mt-2 text-xs">
            Empieza por 1. Cuando la sostengas, añade la segunda. No pases de 3
            aunque te sientas capaz — el punto es la concentración, no la
            ambición.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {wigs.map((t) => (
            <li
              key={t.id}
              className={`flex items-center gap-3 rounded-lg border bg-background/80 px-3 py-2.5 ${
                t.estado === "hecha"
                  ? "border-emerald-500/30 line-through opacity-70"
                  : "border-fuchsia-500/30"
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300">
                {t.wig_orden ?? "?"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {t.titulo}
              </span>
              {t.ambito && (
                <span
                  className="hidden shrink-0 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline"
                  title={t.ambito === "personal" ? "Personal" : "Profesional"}
                >
                  {AMBITO_LABEL[t.ambito]}
                </span>
              )}
              {t.prioridad && (
                <span
                  className={`hidden shrink-0 text-[11px] font-semibold uppercase sm:inline ${
                    TONO_PRIORIDAD[t.prioridad] ?? "text-muted-foreground"
                  }`}
                >
                  {t.prioridad}
                </span>
              )}
              <button
                type="button"
                onClick={() => onQuitar(t.id)}
                disabled={guardandoId === t.id}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="Quitar de WIG"
              >
                {guardandoId === t.id ? "…" : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}