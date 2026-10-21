"use client";

// ============================================================================
// SugerirPagosModal — muestra las sugerencias de programación de pagos
// que devuelve la IA tras analizar los pagos activos del usuario.
//
// Patrón idéntico a SugerirWigsModal:
//   · La IA SOLO sugiere; nunca escribe en la BD.
//   · El usuario revisa cada fila (puede incluir/excluir).
//   · "Aplicar marcadas" hace el batch (cada UPDATE pasa por RLS).
//   · "Aplicar solo esta" aplica una fila concreta sin tocar las demás.
//
// Las sugerencias recibidas son { pago_id, fecha_pago_programada,
// importe_a_pagar, motivo }. Se muestra:
//   · fila 1: pago actual (proveedor, importe pendiente, fecha_vencimiento)
//   · fila 2: fecha sugerida (cuándo lo pagaría la IA) + importe sugerido
//   · fila 3: motivo (1 frase)
// ============================================================================

import { useMemo, useState } from "react";
import {
  IconCheck,
  IconSparkles,
  IconX,
} from "@/components/icons";
import type { SugerirPagoItem } from "@/lib/pagos/sugerirPagosIA";
import type { PagoConUrgencia } from "@/lib/pagos/types";
import {
  CATEGORIA_ICONO,
  CATEGORIA_LABEL,
  TONO_ESTADO_PAGO,
} from "@/lib/pagos/types";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);

const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

function fmtFechaCorta(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function SugerirPagosModal({
  resultado,
  pagos,
  lunesValidos,
  busy,
  error,
  applyingId,
  appliedOk,
  appliedFail,
  onCancel,
  onAplicarUna,
  onAplicarTodas,
}: {
  resultado: { sugerencias: SugerirPagoItem[]; prompt_usado: string } | null;
  pagos: PagoConUrgencia[];
  /** Set de YYYY-MM-DD que la IA podía proponer (los próximos 6 lunes). */
  lunesValidos: string[];
  busy: boolean;
  error: string | null;
  applyingId: string | null;
  /** Mensaje de éxito tras aplicar (ej: "7/8 aplicadas"). null = sin mensaje. */
  appliedOk: string | null;
  /** Lista de ids que fallaron al aplicar (se muestran en ámbar). */
  appliedFail: string[];
  onCancel: () => void;
  onAplicarUna: (pagoId: string, fecha: string) => Promise<boolean>;
  onAplicarTodas: (seleccionados: string[]) => Promise<void>;
}) {
  const pagosById = useMemo(
    () => new Map(pagos.map((p) => [p.id, p])),
    [pagos],
  );

  // Por defecto: TODAS las sugerencias están marcadas. El usuario puede
  // desmarcar las que no quiera aplicar.
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  const totalSugerencias = resultado?.sugerencias.length ?? 0;
  const seleccionados = useMemo(() => {
    if (!resultado) return [];
    return resultado.sugerencias
      .filter((s) => !excluidos.has(s.pago_id))
      .map((s) => s.pago_id);
  }, [resultado, excluidos]);

  function toggleExcluir(pagoId: string) {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(pagoId)) next.delete(pagoId);
      else next.add(pagoId);
      return next;
    });
  }

  async function aplicarTodasAhora() {
    const items =
      resultado?.sugerencias.filter((s) => !excluidos.has(s.pago_id)) ?? [];
    await onAplicarTodas(items.map((s) => s.pago_id));
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
            Sugerir pagos del próximo mes
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
              <p>La IA está pensando tus próximos pagos…</p>
              <p className="text-[11px]">
                Aplica el snowball (deuda más pequeña primero) y prioriza
                vencimientos de esta semana.
              </p>
            </div>
          )}

          {resultado && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Estas son mis sugerencias de programación para los próximos 6
                lunes. <strong>Solo sugiero</strong>; tú decides cuáles aplicar.
                La IA no escribe en tu BD sin tu confirmación.
              </p>

              {resultado.sugerencias.length === 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                  La IA no devolvió sugerencias. Probablemente todos tus pagos
                  activos ya están bien programados.
                </div>
              ) : (
                <ul className="space-y-3">
                  {resultado.sugerencias.map((s, idx) => {
                    const pago = pagosById.get(s.pago_id);
                    if (!pago) {
                      return (
                        <li
                          key={s.pago_id + idx}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300"
                        >
                          ⚠️ La IA sugirió un pago que ya no existe
                          ({s.pago_id.slice(0, 8)}…). Se ignoró.
                        </li>
                      );
                    }
                    const excluido = excluidos.has(s.pago_id);
                    const fallada = appliedFail.includes(s.pago_id);
                    const pendiente = pago.importe_total - pago.importe_pagado;
                    const importeSugerido =
                      s.importe_a_pagar != null ? s.importe_a_pagar : pendiente;
                    return (
                      <li
                        key={s.pago_id}
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
                            onChange={() => toggleExcluir(s.pago_id)}
                            disabled={busy || fallada}
                            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-violet-500 disabled:opacity-40"
                            aria-label={
                              excluido
                                ? "Incluir en el batch"
                                : "Excluir del batch"
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="text-base">
                                {CATEGORIA_ICONO[pago.categoria]}
                              </span>
                              <span className="font-mono">
                                {pago.proveedor}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${TONO_ESTADO_PAGO[pago.estado_efectivo]}`}
                              >
                                {pago.estado_efectivo.replace("_", " ")}
                              </span>
                              <span className="text-[10px]">
                                {CATEGORIA_LABEL[pago.categoria]}
                              </span>
                            </div>
                            <h3 className="mt-1 font-semibold tracking-tight">
                              {pago.concepto}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Pendiente:{" "}
                              <strong className="text-foreground">
                                {fmtEUR(pendiente)}
                              </strong>{" "}
                              · vence {fmtFechaCorta(pago.fecha_vencimiento)}
                              {pago.fecha_pago_programada && (
                                <>
                                  {" "}
                                  · ya estaba programado para{" "}
                                  {fmtFechaCorta(pago.fecha_pago_programada)}
                                </>
                              )}
                            </p>
                            <div className="mt-3 rounded-md border-l-2 border-violet-500/40 bg-violet-500/5 px-3 py-2 text-sm">
                              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <span className="font-semibold text-violet-700 dark:text-violet-300">
                                  📅 Programar para el{" "}
                                  {fmtFechaLarga(s.fecha_pago_programada)}
                                </span>
                                {s.importe_a_pagar != null ? (
                                  <span className="text-[11px] text-muted-foreground">
                                    Pagar {fmtEUR(s.importe_a_pagar)} (
                                    {Math.round((s.importe_a_pagar / pendiente) * 100)}
                                    % del pendiente)
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                    Pagar el total ({fmtEUR(importeSugerido)})
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-xs italic text-foreground/90">
                                {s.motivo}
                              </p>
                            </div>
                            {fallada && (
                              <p className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-700 dark:text-red-300">
                                ❌ Falló al aplicar (revisa la conexión o RLS).
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() =>
                                  onAplicarUna(
                                    s.pago_id,
                                    s.fecha_pago_programada,
                                  )
                                }
                                disabled={busy || excluido || fallada}
                                className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Programa este pago en este lunes (no toca a los demás)"
                              >
                                <IconCheck className="h-3.5 w-3.5" />
                                {applyingId === s.pago_id
                                  ? "Aplicando…"
                                  : "Aplicar solo este"}
                              </button>
                              <span className="text-[11px] text-muted-foreground">
                                o marca la casilla y pulsa “Aplicar N
                                marcadas” abajo.
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
                  fecha_pago_programada
                </code>{" "}
                y pone el pago en estado{" "}
                <code className="rounded bg-background px-1 py-0.5">
                  programado
                </code>
                . NO registra pagos parciales (para eso usa el botón “Pagar
                parcial” en la tarjeta del pago). Si quieres ajustar la
                estrategia, edita el prompt en{" "}
                <code className="rounded bg-background px-1 py-0.5">
                  /configuracion
                </code>
                .
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
            {totalSugerencias > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {seleccionados.length} de {totalSugerencias} marcadas
              </span>
            )}
            <button
              onClick={aplicarTodasAhora}
              disabled={
                busy || seleccionados.length === 0 || !resultado
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconCheck className="h-4 w-4" />
              {busy
                ? "Aplicando…"
                : `Aplicar ${seleccionados.length} marcadas`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}