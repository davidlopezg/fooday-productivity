"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/pagos/Modal";
import { SubirFactura } from "@/components/pagos/SubirFactura";
import { detectarCategoria, type FacturaExtraida } from "@/lib/pagos/parser-pdf";
import {
  CATEGORIAS_PAGO,
  CATEGORIA_ICONO,
  CATEGORIA_LABEL,
  ESTADO_LABEL,
  METODOS_PAGO,
  METODO_LABEL,
  PRIORIDADES_PAGO,
  type CategoriaPago,
  type EstadoPago,
  type MetodoPago,
  type PagoConUrgencia,
  type PrioridadPago,
} from "@/lib/pagos/types";
import { crearPago, editarPago, programarPago } from "@/lib/pagos/mutations";
import { errorMessage } from "@/lib/errors";

const fmtFechaInput = (iso: string | null | undefined): string => iso ?? "";

type Modo = "crear" | "editar";

export function PagoFormModal({
  modo,
  pago,
  onClose,
  onSaved,
  initialConcepto,
}: {
  modo: Modo;
  pago?: PagoConUrgencia;
  onClose: () => void;
  onSaved: () => void;
  /** Pre-rellena el campo "Concepto" (útil desde captura rápida). */
  initialConcepto?: string;
}) {
  // ----- estado del formulario
  const [proveedor, setProveedor] = useState(pago?.proveedor ?? "");
  const [concepto, setConcepto] = useState(
    pago?.concepto ?? initialConcepto ?? "",
  );
  const [categoria, setCategoria] = useState<CategoriaPago>(
    pago?.categoria ?? "proveedor",
  );
  const [importeTotal, setImporteTotal] = useState(
    pago ? String(pago.importe_total) : "",
  );
  const [fechaVencimiento, setFechaVencimiento] = useState(
    fmtFechaInput(pago?.fecha_vencimiento) ||
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [fechaEmision, setFechaEmision] = useState(
    fmtFechaInput(pago?.fecha_emision_factura),
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    pago?.metodo_pago ?? "transferencia",
  );
  const [prioridad, setPrioridad] = useState<PrioridadPago>(
    pago?.prioridad ?? "media",
  );
  const [fechaProgramada, setFechaProgramada] = useState(
    fmtFechaInput(pago?.fecha_pago_programada),
  );
  const [notas, setNotas] = useState(pago?.notas ?? "");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ----- submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!proveedor.trim()) return setError("Proveedor obligatorio");
    if (!concepto.trim()) return setError("Concepto obligatorio");
    const importeNum = Number(importeTotal.replace(",", "."));
    if (Number.isNaN(importeNum) || importeNum <= 0) {
      return setError("Importe debe ser > 0");
    }
    if (!fechaVencimiento) return setError("Fecha de vencimiento obligatoria");

    startTransition(async () => {
      try {
        if (modo === "crear") {
          await crearPago({
            proveedor: proveedor.trim(),
            concepto: concepto.trim(),
            categoria,
            importeTotal: importeNum,
            fechaVencimiento,
            fechaEmisionFactura: fechaEmision || null,
            metodoPago,
            prioridad,
            fechaPagoProgramada: fechaProgramada || null,
            notas: notas.trim() || null,
          });
        } else if (pago) {
          // Edición: no permite tocar importe_pagado (eso es vía "pago parcial").
          // Si se cambia el importe_total a < importe_pagado, la BD lo rechaza (CHECK).
          await editarPago({
            id: pago.id,
            proveedor: proveedor.trim(),
            concepto: concepto.trim(),
            categoria,
            importeTotal: importeNum,
            fechaVencimiento,
            fechaEmisionFactura: fechaEmision || null,
            metodoPago,
            prioridad,
            notas: notas.trim() || null,
          });
          // Si el usuario cambió la fecha_programada, lo programamos aparte
          // (la RPC reprogramar_siguiente_lunes siempre va al lunes siguiente;
          //  aquí queremos una fecha arbitraria).
          if (fechaProgramada !== fmtFechaInput(pago.fecha_pago_programada)) {
            if (fechaProgramada) {
              await programarPago(pago.id, fechaProgramada);
            }
            // Si la vació, no desprogramamos automáticamente (mejor que lo haga
            // explícitamente con "Quitar programación" del menú).
          }
        }
        onSaved();
        onClose();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  };

  // Helper: pre-rellenar fecha_vencimiento con un lunes concreto
  const setProximoLunes = () => {
    const hoy = new Date();
    const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
    const diff = (8 - dow) % 7; // 0 si ya es lunes
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    setFechaProgramada(lunes.toISOString().slice(0, 10));
  };

  const isPagado = pago?.estado_efectivo === "pagado";
  const titulo = modo === "crear" ? "Nuevo pago" : "Editar pago";

  return (
    <Modal
      title={titulo}
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-2">
          {error ? (
            <p className="flex-1 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : (
            <span className="flex-1" />
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
              form="pago-form"
              disabled={isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar"}
            </button>
          </div>
        </div>
      }
    >
      {pago && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Estado actual:</span>
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium">
            {ESTADO_LABEL[pago.estado_efectivo as EstadoPago]}
          </span>
          {pago.importe_pagado > 0 && (
            <span className="text-xs text-muted-foreground">
              · pagado {pago.importe_pagado}/{pago.importe_total} €
            </span>
          )}
        </div>
      )}

      <form id="pago-form" onSubmit={handleSubmit} className="space-y-3">
        {/* Subir PDF (solo en modo crear) */}
        {modo === "crear" && (
          <SubirFactura
            onAplicar={(datos: FacturaExtraida) => {
              if (datos.proveedor) setProveedor(datos.proveedor);
              if (datos.concepto) setConcepto(datos.concepto);
              if (datos.importe != null) setImporteTotal(datos.importe.toFixed(2));
              if (datos.fechaEmision) setFechaEmision(datos.fechaEmision);
              if (datos.fechaVencimiento) setFechaVencimiento(datos.fechaVencimiento);
              if (datos.proveedor || datos.concepto) {
                setCategoria(detectarCategoria(datos.proveedor ?? "", datos.concepto ?? ""));
              }
            }}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Proveedor" required>
            <input
              type="text"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Endesa, Banco Sabadell…"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Concepto" required>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Luz septiembre, Cuota préstamo…"
              className={inputCls}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría" required>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaPago)}
              className={inputCls}
            >
              {CATEGORIAS_PAGO.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_ICONO[c]} {CATEGORIA_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Importe total (€)" required>
            <input
              type="text"
              inputMode="decimal"
              value={importeTotal}
              onChange={(e) => setImporteTotal(e.target.value)}
              placeholder="0,00"
              className={`${inputCls} font-mono tabular-nums`}
              required
              disabled={isPagado}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha emisión factura" hint="opcional">
            <input
              type="date"
              value={fechaEmision}
              onChange={(e) => setFechaEmision(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Fecha vencimiento" required>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Método de pago">
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className={inputCls}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {METODO_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridad">
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as PrioridadPago)}
              className={inputCls}
            >
              {PRIORIDADES_PAGO.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Programado para"
          hint={
            fechaProgramada
              ? "Lunes u otro día. Déjalo vacío si aún no decides."
              : "opcional"
          }
        >
          <div className="flex gap-2">
            <input
              type="date"
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={setProximoLunes}
              className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
              title="Establecer al próximo lunes"
            >
              Próx. lunes
            </button>
            {fechaProgramada && (
              <button
                type="button"
                onClick={() => setFechaProgramada("")}
                className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
              >
                ✕
              </button>
            )}
          </div>
        </Field>

        <Field label="Notas" hint="opcional">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Motivo de prioridad, instrucciones, datos del proveedor…"
            className={inputCls}
          />
        </Field>
      </form>
    </Modal>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-muted-foreground">
        <span>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";
