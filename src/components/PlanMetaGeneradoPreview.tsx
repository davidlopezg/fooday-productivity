"use client";

// ============================================================================
// PlanMetaGeneradoPreview — modal que muestra el plan generado por la IA
// para una meta nueva (KRs por trimestre + tareas). El usuario puede:
//   · Ver el resumen (cuántos KRs, cuántas tareas, cuántos hábitos).
//   · Cancelar y volver a /metas/nueva para cambiar título/descripción.
//   · Confirmar → el caller se encarga de crear la meta + KRs + tareas.
// ============================================================================

import { useMemo } from "react";
import { IconSparkles, IconX } from "@/components/icons";
import type { PlanMetaGenerado } from "@/lib/plan";

export function PlanMetaGeneradoPreview({
  plan,
  metaTitulo,
  trimestrersDisponibles,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  plan: PlanMetaGenerado | null;
  metaTitulo: string;
  trimestrersDisponibles: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const stats = useMemo(() => {
    if (!plan) return null;
    const totalKrs = plan.krs.length;
    const totalTareas = plan.krs.reduce((acc, k) => acc + k.tareas.length, 0);
    const totalHabitos = plan.krs.reduce(
      (acc, k) => acc + k.tareas.filter((t) => t.recurrencia_tipo).length,
      0,
    );
    return { totalKrs, totalTareas, totalHabitos };
  }, [plan]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-violet-500" />
            Plan generado para: <span className="text-foreground">{metaTitulo || "(sin título)"}</span>
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

          {busy && !plan && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p>La IA está pensando el plan trimestral…</p>
              <p className="text-[11px]">Suele tardar entre 10 y 30 segundos.</p>
            </div>
          )}

          {plan && stats && (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2">
                  <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                    {stats.totalKrs}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-violet-700/70 dark:text-violet-300/70">
                    KRs
                  </div>
                </div>
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2">
                  <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                    {stats.totalTareas}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-sky-700/70 dark:text-sky-300/70">
                    Tareas
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {stats.totalHabitos}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-emerald-700/70 dark:text-emerald-300/70">
                    Hábitos
                  </div>
                </div>
              </div>

              {plan.krs.length === 0 && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  La IA no devolvió ningún KR. Prueba a dar más contexto en la descripción.
                </p>
              )}

              <div className="space-y-3">
                {plan.krs.map((kr, idx) => {
                  const trimNombre =
                    trimestrersDisponibles.find((t) => t.numero === kr.trimestre)?.nombre ??
                    `Q${kr.trimestre}`;
                  return (
                    <article
                      key={`${kr.trimestre}-${idx}`}
                      className="rounded-lg border border-border bg-muted/20 p-4"
                    >
                      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded bg-violet-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                            {trimNombre}
                          </span>
                          <h3 className="mt-1 font-semibold tracking-tight">{kr.titulo}</h3>
                          {kr.descripcion && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{kr.descripcion}</p>
                          )}
                        </div>
                        {kr.metrica && (
                          <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] text-sky-700 dark:text-sky-300">
                            {kr.metrica}: {kr.valor_objetivo}
                            {kr.unidad && ` ${kr.unidad}`}
                          </span>
                        )}
                      </header>
                      <ul className="space-y-1.5">
                        {kr.tareas.map((t, j) => (
                          <li
                            key={j}
                            className="flex items-start gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
                          >
                            <span className="mt-0.5 shrink-0 text-muted-foreground/60">
                              {t.recurrencia_tipo ? (
                                t.recurrencia_tipo === "diaria" ? (
                                  <span title="Hábito diario">🔁</span>
                                ) : t.recurrencia_tipo === "semanal" ? (
                                  <span title="Hábito semanal">🗓️</span>
                                ) : (
                                  <span title="Hábito mensual">📅</span>
                                )
                              ) : (
                                <span title="Tarea puntual">📋</span>
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{t.titulo}</div>
                              {t.criterio_terminacion && (
                                <div className="mt-0.5 text-[10px] text-muted-foreground/80">
                                  ✓ {t.criterio_terminacion}
                                </div>
                              )}
                              {t.recurrencia_tipo && (
                                <div className="mt-0.5 text-[10px] text-muted-foreground/80">
                                  {t.recurrencia_tipo === "semanal" && t.recurrencia_dias_semana
                                    ? `Días: ${t.recurrencia_dias_semana
                                        .slice()
                                        .sort((a, b) => a - b)
                                        .map((d) => "DLXJVSD".charAt(d))
                                        .join(", ")}`
                                    : t.recurrencia_tipo === "mensual" && t.recurrencia_dia_mes
                                      ? `Día ${t.recurrencia_dia_mes} de cada mes`
                                      : "Todos los días"}
                                </div>
                              )}
                            </div>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${
                                t.prioridad === "critica"
                                  ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                  : t.prioridad === "alta"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {t.prioridad}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>

              <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                💡 Esto es un borrador inicial. Después podrás editar cada KR, tarea, prioridad
                o recurrencia desde{" "}
                <span className="font-mono text-foreground">/metas/detalle</span>.
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-muted-foreground">
            {busy ? "Aplicando…" : "La IA puede equivocarse. Revisa antes de aplicar."}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={busy || !plan || plan.krs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <IconSparkles className="h-4 w-4" />
              {busy ? "Aplicando…" : "Crear meta con plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}