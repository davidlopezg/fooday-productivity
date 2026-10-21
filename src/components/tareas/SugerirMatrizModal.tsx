"use client";

// ============================================================================
// SugerirMatrizModal — revisa y aplica las sugerencias de redistribución
// que devuelve la IA para la matriz Eisenhower. Patrón idéntico a
// SugerirPagosModal y SugerirWigsModal.
//
// Flujo:
//   · IA devuelve lista de tareas que quiere MOVER de cuadrante
//   · Cada fila: tarea, cuadrante_actual (chip) → cuadrante_sugerido (chip),
//     motivo, checkbox
//   · Botones: "Aplicar solo este" (1 fila) y "Aplicar N marcadas" (batch)
//
// La IA NO incluye tareas que considera bien ubicadas — la lista es solo de
// cambios propuestos. Esto evita aplicar "todo" cuando no hay nada que
// mover (reduce ruido y saves innecesarios).
// ============================================================================

import { useMemo, useState } from "react";
import {
  IconCheck,
  IconSparkles,
  IconX,
} from "@/components/icons";
import {
  CUADRANTES,
  type Cuadrante,
} from "@/lib/tareas/matriz";
import type { SugerirMatrizItem } from "@/lib/tareas/sugerirMatrizIA";
import type { Prioridad, Tarea } from "@/lib/types";

const CUADRANTE_VALUES: Cuadrante[] = ["Q1", "Q2", "Q3", "Q4"];
const PRIORIDADES_VALIDAS: Prioridad[] = [
  "critica",
  "urgente",
  "alta",
  "media",
  "baja",
];

function prioridadesDeCuadrante(c: Cuadrante): Prioridad {
  return CUADRANTES[c].prioridad;
}

export function SugerirMatrizModal({
  resultado,
  tareas,
  busy,
  error,
  applyingId,
  appliedOk,
  appliedFail,
  onCancel,
  onAplicarUna,
  onAplicarTodas,
}: {
  resultado: { sugerencias: SugerirMatrizItem[] } | null;
  tareas: Tarea[];
  busy: boolean;
  error: string | null;
  applyingId: string | null;
  appliedOk: string | null;
  appliedFail: string[];
  onCancel: () => void;
  onAplicarUna: (tareaId: string, prioridad: Prioridad) => Promise<boolean>;
  onAplicarTodas: (seleccionados: Array<{ tareaId: string; prioridad: Prioridad }>) => Promise<void>;
}) {
  const tareasById = useMemo(() => new Map(tareas.map((t) => [t.id, t])), [tareas]);

  // Estado local: por cada sugerencia, el cuadrante que el usuario ha
  // confirmado (puede sobrescribir el de la IA antes de aplicar).
  // También un Set de ids que el usuario EXCLUYE del batch.
  const [cuadrantesUsuario, setCuadrantesUsuario] = useState<
    Record<string, Cuadrante>
  >({});
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  // Reset al cambiar el resultado (nueva generación).
  const resetKey = resultado?.sugerencias.length ?? 0;
  void resetKey; // No necesitamos un effect: cuando cambia `resultado` se re-monta el modal con key={...} en la página.

  const itemsActivos = useMemo(() => {
    if (!resultado) return [];
    return resultado.sugerencias.filter((s) => !excluidos.has(s.tarea_id));
  }, [resultado, excluidos]);

  function setCuadranteUsuario(tareaId: string, c: Cuadrante) {
    setCuadrantesUsuario((prev) => ({ ...prev, [tareaId]: c }));
  }

  function toggleExcluir(tareaId: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(tareaId)) next.delete(tareaId);
      else next.add(tareaId);
      return next;
    });
  }

  async function aplicarBatch() {
    const items = itemsActivos.map((s) => ({
      tareaId: s.tarea_id,
      prioridad: prioridadesDeCuadrante(
        cuadrantesUsuario[s.tarea_id] ?? s.cuadrante_sugerido,
      ),
    }));
    await onAplicarTodas(items);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onCancel}
      />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-violet-500" />
            Sugerir redistribución de la matriz
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
          {appliedOk && (
            <div className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              {appliedOk}
            </div>
          )}

          {busy && !resultado && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p>La IA está revisando tu matriz…</p>
              <p className="text-[11px]">
                Cruza fechas de vencimiento con WIGs de metas para proponer
                redistribución.
              </p>
            </div>
          )}

          {resultado && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Estas son las tareas que la IA quiere <strong>mover</strong> de
                cuadrante. Las que NO aparecen aquí ya están bien ubicadas.
                <strong> Solo sugiero</strong>; tú decides cuáles aplicar.
              </p>

              {resultado.sugerencias.length === 0 ? (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  ✅ La IA considera que todas tus tareas activas ya están en
                  el cuadrante correcto. Nada que mover.
                </div>
              ) : (
                <ul className="space-y-3">
                  {resultado.sugerencias.map((s, idx) => {
                    const tarea = tareasById.get(s.tarea_id);
                    if (!tarea) return null;
                    const excluido = excluidos.has(s.tarea_id);
                    const fallada = appliedFail.includes(s.tarea_id);
                    const cFinal =
                      cuadrantesUsuario[s.tarea_id] ?? s.cuadrante_sugerido;
                    const movioCuadrante =
                      cFinal !== s.cuadrante_actual;
                    return (
                      <li
                        key={s.tarea_id}
                        className={`rounded-lg border p-4 transition-colors ${
                          excluido
                            ? "border-border bg-muted/30 opacity-60"
                            : "border-violet-500/30 bg-violet-500/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={!excluido}
                            onChange={() => toggleExcluir(s.tarea_id)}
                            disabled={busy || fallada}
                            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-violet-500 disabled:opacity-40"
                            aria-label={
                              excluido ? "Incluir en el batch" : "Excluir del batch"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold leading-tight">
                              {tarea.titulo}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Prioridad manual actual:{" "}
                              <span className="font-mono">
                                {tarea.prioridad ?? "—"}
                              </span>
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <CuadranteChip
                                c={s.cuadrante_actual}
                                label="actual"
                                dim
                              />
                              <span className="text-muted-foreground">→</span>
                              <select
                                value={cFinal}
                                onChange={(e) =>
                                  setCuadranteUsuario(
                                    s.tarea_id,
                                    e.target.value as Cuadrante,
                                  )
                                }
                                disabled={busy || excluido}
                                className="rounded-md border border-violet-500/30 bg-background px-2 py-1 text-xs font-medium outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
                                aria-label="Cuadrante sugerido"
                              >
                                {CUADRANTE_VALUES.map((c) => (
                                  <option key={c} value={c}>
                                    {CUADRANTES[c].emoji} {CUADRANTES[c].titulo} ({prioridadesDeCuadrante(c)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="mt-2 rounded-md border-l-2 border-violet-500/40 bg-violet-500/5 px-3 py-2 text-xs italic text-foreground/90">
                              {s.motivo}
                            </p>
                            {fallada && (
                              <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-700 dark:text-red-300">
                                ❌ Falló al aplicar.
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() =>
                                  onAplicarUna(
                                    s.tarea_id,
                                    prioridadesDeCuadrante(cFinal),
                                  )
                                }
                                disabled={
                                  busy || excluido || fallada || !movioCuadrante
                                }
                                title={
                                  movioCuadrante
                                    ? "Aplica este cambio individual"
                                    : "No hay cambio respecto al cuadrante actual"
                                }
                                className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <IconCheck className="h-3.5 w-3.5" />
                                {applyingId === s.tarea_id
                                  ? "Aplicando…"
                                  : movioCuadrante
                                    ? "Aplicar solo este"
                                    : "Sin cambio"}
                              </button>
                              <span className="text-[11px] text-muted-foreground">
                                {movioCuadrante
                                  ? `Cambiará prioridad a “${prioridadesDeCuadrante(cFinal)}”`
                                  : "El cuadrante coincide con el actual"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                💡 “Aplicar” solo cambia{" "}
                <code className="rounded bg-background px-1 py-0.5">
                  prioridad
                </code>{" "}
                en cada tarea. NO toca fechas ni meta. Si prefieres mover
                visualmente, usa drag &amp; drop directamente en la matriz.
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Cerrar
          </button>
          <div className="flex items-center gap-2">
            {resultado && resultado.sugerencias.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {itemsActivos.length} de {resultado.sugerencias.length} marcadas
              </span>
            )}
            <button
              onClick={aplicarBatch}
              disabled={busy || itemsActivos.length === 0 || !resultado}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconCheck className="h-4 w-4" />
              {busy
                ? "Aplicando…"
                : `Aplicar ${itemsActivos.length} cambios`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CuadranteChip({
  c,
  label,
  dim,
}: {
  c: Cuadrante;
  label: string;
  dim?: boolean;
}) {
  const cfg = CUADRANTES[c];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.borde} ${cfg.bg} ${
        dim ? "opacity-70" : ""
      }`}
    >
      <span aria-hidden>{cfg.emoji}</span>
      <span>{cfg.titulo}</span>
      <span className="text-[10px] text-muted-foreground">({label})</span>
    </span>
  );
}