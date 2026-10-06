"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/pagos/Modal";
import { fetchMovimientos } from "@/lib/pagos/queries";
import { registrarPago } from "@/lib/pagos/mutations";
import { useData } from "@/lib/useData";
import {
  METODOS_PAGO,
  METODO_LABEL,
  type MetodoPago,
  type PagoConUrgencia,
  type PagoMovimiento,
} from "@/lib/pagos/types";
import { errorMessage } from "@/lib/errors";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const fmtFecha = (iso: string) => {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
};

export function PagoPagarParcialModal({
  pago,
  onClose,
  onSaved,
}: {
  pago: PagoConUrgencia;
  onClose: () => void;
  onSaved: () => void;
}) {
  const restante = pago.importe_total - pago.importe_pagado;
  const [importe, setImporte] = useState(String(restante));
  const [metodo, setMetodo] = useState<MetodoPago>(pago.metodo_pago);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Carga los movimientos previos para mostrar el histórico
  const movs = useData<PagoMovimiento[]>(
    () => fetchMovimientos(pago.id),
    [],
    [pago.id],
  );

  // Validación rápida
  const importeNum = Number(importe.replace(",", "."));
  const valido =
    !Number.isNaN(importeNum) && importeNum > 0 && importeNum <= restante;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido) {
      setError(
        importeNum > restante
          ? `El importe no puede superar el restante (${fmtEUR(restante)})`
          : "Importe no válido",
      );
      return;
    }
    startTransition(async () => {
      try {
        setError(null);
        await registrarPago({
          pagoId: pago.id,
          importe: importeNum,
          metodo,
          fecha,
        });
        onSaved();
        onClose();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  };

  // Atajos de importe
  const setFraccion = (n: number) => {
    setImporte(String(Math.round(restante * n * 100) / 100));
  };

  return (
    <Modal
      title="Registrar pago"
      onClose={onClose}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-2">
          {error ? (
            <p className="flex-1 text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">
              {valido
                ? `Quedará ${fmtEUR(restante - importeNum)} por pagar`
                : ""}
            </span>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="pago-parcial-form"
              disabled={isPending || !valido}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "Registrando…" : "Registrar"}
            </button>
          </div>
        </div>
      }
    >
      {/* Resumen del pago */}
      <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-sm">
        <div className="font-semibold">
          {pago.proveedor} · {pago.concepto}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>Total: {fmtEUR(pago.importe_total)}</span>
          <span>Pagado: {fmtEUR(pago.importe_pagado)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="font-medium">Restante:</span>
          <span className="font-mono font-semibold tabular-nums">
            {fmtEUR(restante)}
          </span>
        </div>
      </div>

      <form id="pago-parcial-form" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Importe a pagar (€) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            className={`h-10 w-full rounded-md border bg-background px-3 font-mono text-base tabular-nums outline-none focus:ring-2 focus:ring-ring ${
              !valido && importe ? "border-red-500" : "border-input"
            }`}
            autoFocus
            required
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setFraccion(0.5)}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setFraccion(0.33)}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
            >
              33%
            </button>
            <button
              type="button"
              onClick={() => setFraccion(0.25)}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => setImporte(String(restante))}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-accent"
            >
              Todo ({fmtEUR(restante)})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Método
            </label>
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPago)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {METODO_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </form>

      {/* Histórico de movimientos previos */}
      {movs.data.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Movimientos anteriores ({movs.data.length})
          </h3>
          <ul className="space-y-1 text-xs">
            {movs.data.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-2 py-1.5"
              >
                <span className="text-muted-foreground">{fmtFecha(m.fecha)}</span>
                <span className="text-muted-foreground">
                  {METODO_LABEL[m.metodo_pago]}
                </span>
                <span className="font-mono font-semibold tabular-nums">
                  {fmtEUR(m.importe)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
