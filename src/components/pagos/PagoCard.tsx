"use client";

import { useState, useTransition } from "react";
import {
  CATEGORIA_ICONO,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  METODO_LABEL,
  TONO_ESTADO_PAGO,
  TONO_PRIORIDAD_PAGO,
  type EstadoPago,
  type PagoConUrgencia,
  type PrioridadPago,
  urgenciaSuperaPrioridad,
} from "@/lib/pagos/types";
import {
  anularPago,
  desprogramarPago,
  eliminarPago,
  registrarPago,
  reprogramarSiguienteLunes,
} from "@/lib/pagos/mutations";
import { errorMessage } from "@/lib/errors";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconPencil,
  IconTrash,
} from "@/components/icons";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtFechaCorta = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
};

const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

const fmtHoy = () => new Date().toISOString().slice(0, 10);

function Badge({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {children}
    </span>
  );
}

function diasLabel(dias: number): string {
  if (dias < 0) return `vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias < 7) return `vence en ${dias}d`;
  if (dias < 30) return `vence en ${Math.round(dias / 7)}sem`;
  return `vence en ${Math.round(dias / 30)}mes`;
}

function DiasCell({ dias }: { dias: number }) {
  let cls = "text-muted-foreground";
  if (dias < 0) cls = "text-red-600 dark:text-red-400 font-semibold";
  else if (dias <= 3) cls = "text-red-600 dark:text-red-400 font-medium";
  else if (dias <= 7) cls = "text-amber-600 dark:text-amber-400 font-medium";
  return <span className={`text-xs ${cls}`}>{diasLabel(dias)}</span>;
}

export type PagoCardProps = {
  pago: PagoConUrgencia;
  /** Se llama tras cualquier mutación exitosa para refrescar la lista. */
  onChanged: () => void | Promise<unknown>;
  /** Si true, oculta el botón PAGADO (p.ej. en histórico). */
  sinAcciones?: boolean;
  /** Si true, se permite editar/eliminar (modo admin). */
  permitirEdicion?: boolean;
  /** Abre el modal de edición. Si no se pasa, el botón "Editar" no aparece. */
  onEdit?: (pago: PagoConUrgencia) => void;
  /** Abre el modal de pago parcial. Si no se pasa, se usa prompt nativo. */
  onPagoParcial?: (pago: PagoConUrgencia) => void;
};

export function PagoCard({
  pago,
  onChanged,
  sinAcciones,
  permitirEdicion = true,
  onEdit,
  onPagoParcial,
}: PagoCardProps) {
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendiente =
    pago.estado_efectivo === "pendiente" ||
    pago.estado_efectivo === "programado" ||
    pago.estado_efectivo === "pagado_parcial" ||
    pago.estado_efectivo === "vencido";

  const scoreExcedePrioridad = urgenciaSuperaPrioridad(
    pago.urgencia_calculada,
    pago.prioridad as PrioridadPago,
  );

  const handlePagarEntero = () => {
    const restante = pago.importe_total - pago.importe_pagado;
    if (restante <= 0) return;
    startTransition(async () => {
      try {
        setError(null);
        await registrarPago({
          pagoId: pago.id,
          importe: restante,
          metodo: pago.metodo_pago,
        });
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const handleReprogramar = () => {
    startTransition(async () => {
      try {
        setError(null);
        await reprogramarSiguienteLunes(pago.id);
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const handlePagarParcial = () => {
    if (onPagoParcial) {
      onPagoParcial(pago);
      return;
    }
    // Fallback a prompt nativo si no hay modal configurado
    const input = window.prompt(
      `Importe a pagar (restante: ${fmtEUR(pago.importe_total - pago.importe_pagado)}):`,
      String(pago.importe_total - pago.importe_pagado),
    );
    if (!input) return;
    const importe = Number(input.replace(",", "."));
    if (Number.isNaN(importe) || importe <= 0) {
      setError("Importe no válido");
      return;
    }
    startTransition(async () => {
      try {
        setError(null);
        await registrarPago({
          pagoId: pago.id,
          importe,
          metodo: pago.metodo_pago,
        });
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const handleEdit = () => {
    onEdit?.(pago);
  };

  const handleAnular = () => {
    if (!window.confirm(`¿Anular "${pago.proveedor} · ${pago.concepto}"?`)) return;
    startTransition(async () => {
      try {
        setError(null);
        await anularPago(pago.id);
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const handleEliminar = () => {
    if (!window.confirm(`¿Eliminar definitivamente "${pago.proveedor} · ${pago.concepto}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      try {
        setError(null);
        await eliminarPago(pago.id);
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  const handleDesprogramar = () => {
    startTransition(async () => {
      try {
        setError(null);
        await desprogramarPago(pago.id);
        onChanged();
      } catch (e) {
        setError(errorMessage(e));
      }
    });
  };

  // Mostrar fecha destacada: la programada si existe, si no la de vencimiento.
  const fechaDestacada = pago.fecha_pago_programada ?? pago.fecha_vencimiento;
  const esProgramada = !!pago.fecha_pago_programada;

  return (
    <div
      className={`group rounded-lg border bg-card p-4 transition-colors ${
        pago.estado_efectivo === "vencido"
          ? "border-red-500/30 bg-red-500/5"
          : pago.estado_efectivo === "pagado_parcial"
          ? "border-amber-500/20"
          : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icono categoría */}
        <div className="text-2xl shrink-0 select-none" aria-hidden>
          {CATEGORIA_ICONO[pago.categoria]}
        </div>

        {/* Centro: proveedor + concepto + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="truncate font-semibold">{pago.proveedor}</span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="truncate text-sm text-muted-foreground">
              {pago.concepto}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={TONO_ESTADO_PAGO[pago.estado_efectivo as EstadoPago]}>
              {ESTADO_LABEL[pago.estado_efectivo as EstadoPago]}
            </Badge>
            {pago.prioridad !== "media" && (
              <Badge tone={TONO_PRIORIDAD_PAGO[pago.prioridad as PrioridadPago]}>
                {pago.prioridad}
              </Badge>
            )}
            {pago.metodo_pago !== "transferencia" && (
              <Badge tone="bg-muted text-muted-foreground border-border">
                {METODO_LABEL[pago.metodo_pago]}
              </Badge>
            )}
            {scoreExcedePrioridad && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                title={`Score de urgencia ${Math.round(pago.urgencia_calculada)} supera tu prioridad "${pago.prioridad}"`}
              >
                <IconAlertTriangle className="h-3 w-3" />
                score &gt; prioridad
              </span>
            )}
          </div>
        </div>

        {/* Importe + acción principal */}
        <div className="shrink-0 text-right">
          {pago.estado_efectivo === "pagado_parcial" ? (
            <>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {fmtEUR(pago.importe_pagado)}
                <span className="text-muted-foreground"> / {fmtEUR(pago.importe_total)}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                pagado / total
              </div>
            </>
          ) : (
            <>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {fmtEUR(pago.importe_total)}
              </div>
              {pago.importe_pagado > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  ({fmtEUR(pago.importe_pagado)} ya pagado)
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Línea inferior: fecha + acciones */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <IconClock className="h-3 w-3" />
            {esProgramada ? "Programado" : "Vence"}:{" "}
            <span className="font-medium text-foreground">
              {fmtFechaLarga(fechaDestacada)}
            </span>
          </span>
          {esProgramada && pago.estado_efectivo !== "vencido" && (
            <DiasCell dias={pago.dias_hasta_vencer} />
          )}
          {!esProgramada && (
            <DiasCell dias={pago.dias_hasta_vencer} />
          )}
        </div>

        {/* Acciones */}
        {!sinAcciones && pendiente && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePagarEntero}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:bg-emerald-700 disabled:opacity-50"
            >
              <IconCheck className="h-3.5 w-3.5" />
              PAGADO
            </button>
            {permitirEdicion && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  disabled={isPending}
                  aria-label="Más acciones"
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handlePagarParcial();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        💰 Pago parcial
                      </button>
                      {pago.estado_efectivo === "programado" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            handleDesprogramar();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          ⏪ Quitar programación
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            handleReprogramar();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          ⏩ Al lunes siguiente
                        </button>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            handleEdit();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <IconPencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handleAnular();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        🚫 Anular
                      </button>
                      <div className="border-t border-border" />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          handleEliminar();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-500/10"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {sinAcciones && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {pago.fecha_pago_real && (
              <span>
                Pagado el {fmtFechaCorta(pago.fecha_pago_real)}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
