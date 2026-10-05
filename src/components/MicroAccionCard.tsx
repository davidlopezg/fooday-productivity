"use client";

import type { MicroAccion } from "@/lib/estatus";

const ETIQUETAS_CRITERIO: Record<number, string> = {
  1: "Racha a punto de romperse",
  2: "Hábito nunca cumplido",
  3: "Patrón semanal detectado",
  4: "Score general bajo del día",
  5: "Sostener score alto",
};

/** Card destacado con la única micro-acción priorizada para mañana. */
export function MicroAccionCard({ micro }: { micro: MicroAccion | null }) {
  if (!micro) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        Sin micro-acción priorizada todavía.
      </div>
    );
  }
  return (
    <div className="rounded-xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
        <span>🎯</span>
        <span>Micro-acción para mañana</span>
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
          {ETIQUETAS_CRITERIO[micro.criterio]}
        </span>
      </div>
      <p className="text-sm font-medium leading-relaxed">{micro.accion}</p>
      {micro.justificacion && (
        <p className="mt-1.5 text-xs text-muted-foreground">{micro.justificacion}</p>
      )}
    </div>
  );
}
