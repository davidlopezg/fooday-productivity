// ============================================================================
// Mutaciones del módulo PAGOS
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  CategoriaPago,
  EstadoPago,
  MetodoPago,
  Pago,
  PrioridadPago,
} from "@/lib/pagos/types";

function db() {
  return createClient().schema("pagos");
}

// ============================================================================
// HIGHER-LEVEL (usan las RPC de la BD)
// ============================================================================

/** Refresca el estado `vencido` en pagos cuya fecha_vencimiento ya pasó.
 *  La BD lo hace idempotente; la app lo llama al cargar /pagos. */
export async function refreshPagosVencidos(): Promise<number> {
  const { data, error } = await db().rpc("refresh_vencidos");
  if (error) throw new Error(`No se pudo refrescar vencidos: ${error.message}`);
  return (data as number) ?? 0;
}

/** Registra un pago (entero o parcial). Devuelve el id del movimiento. */
export async function registrarPago(opts: {
  pagoId: string;
  importe: number;
  metodo: MetodoPago;
  fecha?: string; // YYYY-MM-DD; default current_date en la BD
}): Promise<string> {
  const { data, error } = await db().rpc("registrar_pago", {
    p_pago_id: opts.pagoId,
    p_importe: opts.importe,
    p_metodo: opts.metodo,
    p_fecha: opts.fecha ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(`No se pudo registrar el pago: ${error.message}`);
  return data as string;
}

/** Mueve el pago al siguiente lunes. Devuelve la nueva fecha. */
export async function reprogramarSiguienteLunes(pagoId: string): Promise<string> {
  const { data, error } = await db().rpc("reprogramar_siguiente_lunes", {
    p_pago_id: pagoId,
  });
  if (error) throw new Error(`No se pudo reprogramar: ${error.message}`);
  return data as string;
}

/** Genera los pagos del mes desde las reglas recurrentes activas.
 *  Devuelve el número de pagos creados. */
export async function generarRecurrentes(mes: number, anio: number): Promise<number> {
  const { data, error } = await db().rpc("generar_recurrentes", {
    p_mes: mes,
    p_anio: anio,
  });
  if (error) throw new Error(`No se pudieron generar los recurrentes: ${error.message}`);
  return (data as number) ?? 0;
}

// ============================================================================
// LOWER-LEVEL (UPDATE/INSERT directos)
// ============================================================================

/** Marca un pago como programado para una fecha concreta (un lunes). */
export async function programarPago(pagoId: string, fecha: string): Promise<void> {
  const { error } = await db()
    .from("pagos")
    .update({
      fecha_pago_programada: fecha,
      estado: "programado",
    })
    .eq("id", pagoId);
  if (error) throw new Error(`No se pudo programar el pago: ${error.message}`);
}

/** Quita la programación (vuelve a pendiente). */
export async function desprogramarPago(pagoId: string): Promise<void> {
  const { error } = await db()
    .from("pagos")
    .update({
      fecha_pago_programada: null,
      estado: "pendiente",
    })
    .eq("id", pagoId);
  if (error) throw new Error(`No se pudo desprogramar: ${error.message}`);
}

/** Marca como anulado (no se va a pagar: factura errónea, importe 0, etc.). */
export async function anularPago(pagoId: string): Promise<void> {
  const { error } = await db()
    .from("pagos")
    .update({ estado: "anulado", fecha_pago_programada: null })
    .eq("id", pagoId);
  if (error) throw new Error(`No se pudo anular: ${error.message}`);
}

/** Cambia la prioridad manual del pago. */
export async function cambiarPrioridadPago(
  pagoId: string,
  prioridad: PrioridadPago,
): Promise<void> {
  const { error } = await db()
    .from("pagos")
    .update({ prioridad })
    .eq("id", pagoId);
  if (error) throw new Error(`No se pudo cambiar la prioridad: ${error.message}`);
}

/** Crea un pago manualmente. Devuelve el id. */
export async function crearPago(opts: {
  proveedor: string;
  concepto: string;
  categoria: CategoriaPago;
  importeTotal: number;
  fechaVencimiento: string;
  fechaEmisionFactura?: string | null;
  metodoPago?: MetodoPago;
  prioridad?: PrioridadPago;
  fechaPagoProgramada?: string | null;
  notas?: string | null;
}): Promise<string> {
  const { data, error } = await db()
    .from("pagos")
    .insert({
      proveedor: opts.proveedor,
      concepto: opts.concepto,
      categoria: opts.categoria,
      importe_total: opts.importeTotal,
      fecha_vencimiento: opts.fechaVencimiento,
      fecha_emision_factura: opts.fechaEmisionFactura ?? null,
      metodo_pago: opts.metodoPago ?? "transferencia",
      prioridad: opts.prioridad ?? "media",
      fecha_pago_programada: opts.fechaPagoProgramada ?? null,
      estado: opts.fechaPagoProgramada ? "programado" : "pendiente",
      notas: opts.notas ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el pago: ${error.message}`);
  return (data as { id: string }).id;
}

/** Edita un pago existente. Solo campos permitidos (no se toca importe_pagado
 *  ni estado: para eso están las RPC). */
export async function editarPago(opts: {
  id: string;
  proveedor?: string;
  concepto?: string;
  categoria?: CategoriaPago;
  importeTotal?: number;
  fechaVencimiento?: string;
  fechaEmisionFactura?: string | null;
  metodoPago?: MetodoPago;
  prioridad?: PrioridadPago;
  notas?: string | null;
}): Promise<void> {
  const update: Record<string, unknown> = {};
  if (opts.proveedor !== undefined) update.proveedor = opts.proveedor;
  if (opts.concepto !== undefined) update.concepto = opts.concepto;
  if (opts.categoria !== undefined) update.categoria = opts.categoria;
  if (opts.importeTotal !== undefined) update.importe_total = opts.importeTotal;
  if (opts.fechaVencimiento !== undefined) update.fecha_vencimiento = opts.fechaVencimiento;
  if (opts.fechaEmisionFactura !== undefined) update.fecha_emision_factura = opts.fechaEmisionFactura;
  if (opts.metodoPago !== undefined) update.metodo_pago = opts.metodoPago;
  if (opts.prioridad !== undefined) update.prioridad = opts.prioridad;
  if (opts.notas !== undefined) update.notas = opts.notas;
  if (Object.keys(update).length === 0) return;

  const { error } = await db().from("pagos").update(update).eq("id", opts.id);
  if (error) throw new Error(`No se pudo editar el pago: ${error.message}`);
}

/** Elimina un pago definitivamente. */
export async function eliminarPago(pagoId: string): Promise<void> {
  const { error } = await db().from("pagos").delete().eq("id", pagoId);
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`);
}
