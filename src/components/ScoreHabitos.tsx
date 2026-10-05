"use client";

import { calcularScoreHabitos, type SemaforoHabitos } from "@/lib/estatus";
import type { EstatusDiario } from "@/lib/types";

/** Badge con score 0-100% + delta vs media 7d + semáforo. */
export function ScoreHabitos({
  estatus,
  media7d,
  delta7d,
  semaforo,
}: {
  estatus: EstatusDiario;
  media7d?: number;
  delta7d?: number;
  semaforo?: SemaforoHabitos;
}) {
  const { score, respondidos } = calcularScoreHabitos(estatus);
  const colorBorde =
    score >= 85
      ? "border-emerald-500/40 bg-emerald-500/10"
      : score >= 60
        ? "border-sky-500/40 bg-sky-500/10"
        : score >= 40
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-red-500/40 bg-red-500/10";
  const colorTexto =
    score >= 85
      ? "text-emerald-700 dark:text-emerald-300"
      : score >= 60
        ? "text-sky-700 dark:text-sky-300"
        : score >= 40
          ? "text-amber-700 dark:text-amber-300"
          : "text-red-700 dark:text-red-300";

  return (
    <div
      className={`inline-flex flex-col gap-0.5 rounded-xl border ${colorBorde} px-3 py-2`}
    >
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tabular-nums ${colorTexto}`}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/100 hábitos</span>
        {semaforo && semaforo !== "—" && (
          <span className="text-sm" aria-label="Semáforo vs 7 días">
            {semaforo}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          {respondidos}/9 respondidos
        </span>
        {typeof delta7d === "number" && typeof media7d === "number" && (
          <>
            <span>·</span>
            <span>
              vs media 7d: {media7d}{" "}
              <span
                className={
                  delta7d > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : delta7d < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }
              >
                ({delta7d > 0 ? "+" : ""}
                {delta7d})
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
