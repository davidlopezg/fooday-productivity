"use client";

// ============================================================================
// SugerirWigsModal — muestra las 3 sugerencias de WIGs que devuelve la IA
// para las metas activas del usuario. Cada sugerencia es solo texto: el
// usuario tiene que pulsar la 🎯 en la tarjeta correspondiente (o el botón
// "Marcar como WIG" aquí) para aplicarla.
//
// Razón: la IA no debería escribir directamente en la BD sin revisión
// humana. Sugerir en texto, decidir el usuario.
// ============================================================================

import { IconSparkles, IconTarget, IconX } from "@/components/icons";
import type { SugerirWigsResultado } from "@/lib/plan";
import type { MetaConPlan } from "@/lib/types";

export function SugerirWigsModal({
  resultado,
  metas,
  busy,
  error,
  wigsActuales,
  onCancel,
  onAplicarWig,
  applyingId,
}: {
  resultado: SugerirWigsResultado | null;
  metas: MetaConPlan[];
  busy: boolean;
  error: string | null;
  wigsActuales: string[];
  onCancel: () => void;
  onAplicarWig: (metaId: string) => Promise<boolean>;
  applyingId: string | null;
}) {
  const metasById = new Map(metas.map((m) => [m.meta.id, m.meta]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-violet-500" />
            Sugerencias de WIGs
          </h2>
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1.5 hover:bg-accent disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {busy && !resultado && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p>La IA está pensando tus 3 WIGs…</p>
              <p className="text-[11px]">Mira urgencia, estado y leverage de cada meta.</p>
            </div>
          )}

          {resultado && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Estas son mis 3 sugerencias para este trimestre. <strong>Solo sugiero</strong>;
                tú decides si aplicarlas. La IA no escribe en tu BD sin tu confirmación.
              </p>

              {resultado.sugerencias.length === 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  No devolvió ninguna sugerencia. Prueba a tener al menos 2-3 metas activas.
                </div>
              ) : (
                <ul className="space-y-3">
                  {resultado.sugerencias.map((s, idx) => {
                    const meta = metasById.get(s.meta_id);
                    if (!meta) return null;
                    const esWig = wigsActuales.includes(s.meta_id);
                    return (
                      <li
                        key={s.meta_id}
                        className={`rounded-lg border p-4 transition-colors ${
                          esWig
                            ? "border-violet-500/40 bg-violet-500/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              esWig
                                ? "bg-violet-500/30 text-violet-700 dark:text-violet-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {meta.codigo && <span className="font-mono">{meta.codigo}</span>}
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                  meta.estado === "en_progreso"
                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : "border-border bg-muted"
                                }`}
                              >
                                {meta.estado.replace("_", " ")}
                              </span>
                              {esWig && (
                                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                  🎯 YA WIG #{meta.wig_orden ?? "?"}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-1 font-semibold tracking-tight">{meta.titulo}</h3>
                            <p className="mt-2 rounded-md border-l-2 border-violet-500/40 bg-violet-500/5 px-3 py-2 text-sm italic text-foreground/90">
                              {s.razon}
                            </p>
                            <button
                              onClick={() => onAplicarWig(s.meta_id)}
                              disabled={busy || esWig || applyingId === s.meta_id}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <IconTarget className="h-3.5 w-3.5" />
                              {esWig
                                ? "Ya es WIG"
                                : applyingId === s.meta_id
                                  ? "Marcando…"
                                  : "Marcar como WIG"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                💡 Si no estás de acuerdo con la sugerencia, puedes ignorar este cuadro y
                pulsar la 🎯 directamente en cualquier tarjeta de{" "}
                <span className="font-mono text-foreground">/metas</span>.
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}