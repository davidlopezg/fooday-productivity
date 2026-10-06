// ============================================================================
// Queries del módulo PAGOS
// Todas usan `supabase.schema('pagos')` para acceder al schema separado.
// La RLS garantiza que cada usuario solo ve lo suyo.
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  Pago,
  PagoConUrgencia,
  PagoMovimiento,
  RecurrentePago,
} from "@/lib/pagos/types";

/** Cliente Supabase con scope al schema `pagos`. */
function db() {
  return createClient().schema("pagos");
}

// ============================================================================
// PAGOS
// ============================================================================

/** Devuelve todos los pagos del owner, ordenados por fecha de vencimiento
 *  ascendente (los más urgentes primero). Sin filtrar por estado: la UI
 *  los filtra por tabs. Para datos "calientes" usa `fetchPagosConUrgencia`. */
export async function fetchPagos(opts?: {
  estados?: string[];
  limit?: number;
}): Promise<Pago[]> {
  let q = db()
    .from("pagos")
    .select("*")
    .order("fecha_vencimiento", { ascending: true });
  if (opts?.estados && opts.estados.length > 0) {
    q = q.in("estado", opts.estados);
  }
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Pago[];
}

/** Pagos con campos calculados (estado_efectivo, dias_hasta_vencer,
 *  urgencia_calculada). Ligeramente más caro pero listo para pintar
 *  sin lógica de cliente. Es la query principal de la pantalla. */
export async function fetchPagosConUrgencia(opts?: {
  estados?: string[];
  incluirDomiciliados?: boolean;
}): Promise<PagoConUrgencia[]> {
  let q = db()
    .from("v_pagos")
    .select("*")
    // Los domiciliados no requieren acción del usuario → los ocultamos
    // salvo que se pida explícitamente.
    .neq("metodo_pago", opts?.incluirDomiciliados ? "no-existe" : "domiciliacion")
    // Urgencia desc para que los más críticos suban arriba
    .order("urgencia_calculada", { ascending: false, nullsFirst: false })
    .order("fecha_vencimiento", { ascending: true });
  if (opts?.estados && opts.estados.length > 0) {
    q = q.in("estado_efectivo", opts.estados);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PagoConUrgencia[];
}

/** Pagos PROGRAMADOS para una fecha concreta (por defecto el próximo lunes).
 *  Es la query del "Este lunes" / "Lunes 14 oct". */
export async function fetchPagosPorFechaProgramada(
  fecha: string,
  opts?: { incluirDomiciliados?: boolean },
): Promise<PagoConUrgencia[]> {
  let q = db()
    .from("v_pagos")
    .select("*")
    .eq("fecha_pago_programada", fecha)
    // Los vencidos también los mostramos aunque no estén programados
    // en esa fecha (urgencia manda). Luego filtramos abajo.
    .order("urgencia_calculada", { ascending: false, nullsFirst: false });
  if (!opts?.incluirDomiciliados) {
    q = q.neq("metodo_pago", "domiciliacion");
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PagoConUrgencia[];
}

/** Pagos vencidos + los que vencen en los próximos N días. Para el bloque
 *  "URGENCIA" de la pantalla. */
export async function fetchPagosUrgentes(
  dias = 7,
  opts?: { incluirDomiciliados?: boolean },
): Promise<PagoConUrgencia[]> {
  const supabase = db();
  const limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  let q = supabase
    .from("v_pagos")
    .select("*")
    .in("estado_efectivo", ["pendiente", "programado", "vencido"])
    .lte("fecha_vencimiento", limite)
    .order("urgencia_calculada", { ascending: false, nullsFirst: false });
  if (!opts?.incluirDomiciliados) {
    q = q.neq("metodo_pago", "domiciliacion");
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PagoConUrgencia[];
}

/** Histórico de pagos ya liquidados (pagado, pagado_parcial, anulado).
 *  Ordenados por fecha_pago_real desc (lo último pagado primero). */
export async function fetchPagosHistorico(limit = 200): Promise<PagoConUrgencia[]> {
  const { data, error } = await db()
    .from("v_pagos")
    .select("*")
    .in("estado_efectivo", ["pagado", "pagado_parcial", "anulado"])
    .order("fecha_pago_real", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PagoConUrgencia[];
}

/** Movimientos (pagos parciales) de un pago concreto. */
export async function fetchMovimientos(pagoId: string): Promise<PagoMovimiento[]> {
  const { data, error } = await db()
    .from("movimientos")
    .select("*")
    .eq("pago_id", pagoId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PagoMovimiento[];
}

// ============================================================================
// RECURRENTES
// ============================================================================

export async function fetchRecurrentes(activos = true): Promise<RecurrentePago[]> {
  let q = db()
    .from("recurrentes")
    .select("*")
    .order("proveedor")
    .order("concepto");
  if (activos) q = q.eq("activo", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RecurrentePago[];
}
