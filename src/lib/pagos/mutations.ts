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
  // 1) Verificar que hay sesión activa y leer el user.id EXPLÍCITAMENTE.
  //    Pasamos owner_id al INSERT en vez de depender del default auth.uid()
  //    para evitar race conditions / sesiones mezcladas que hacen que el
  //    row se guarde con un owner_id distinto al tuyo.
  const client = createClient();
  const { data: sessData, error: sessError } = await client.auth.getSession();
  if (sessError) {
    throw new Error(`No se pudo verificar la sesión: ${sessError.message}`);
  }
  if (!sessData.session) {
    throw new Error(
      "Tu sesión ha caducado. Recarga la página (F5) y vuelve a iniciar sesión.",
    );
  }
  const ownerId = sessData.session.user.id;
  if (!ownerId) {
    throw new Error("La sesión no tiene user.id. Cierra sesión y vuelve a entrar.");
  }

  // 2) Refrescar la sesión si está a punto de expirar.
  await client.auth.refreshSession().catch(() => {
    // noop
  });

  // 3) INSERT con owner_id EXPLÍCITO. Sin esto, dependemos de auth.uid()
  //    en el servidor, que a veces devuelve un UUID que no es el de tu sesión.
  const { data, error } = await db()
    .from("pagos")
    .insert({
      owner_id: ownerId,
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
    .select("id, owner_id, proveedor, concepto")
    .single();

  if (error) {
    let msg = error.message;
    if (error.code === "42501" || /row-level security/i.test(msg)) {
      msg = "Permiso denegado por RLS. Recarga la página o revisa que estés autenticado.";
    } else if (/owner_id/i.test(msg) && /null/i.test(msg)) {
      msg = "Sesión caducada. Recarga la página (F5) y vuelve a iniciar sesión.";
    }
    console.error("[crearPago] fallo:", error);
    throw new Error(`No se pudo crear el pago: ${msg}`);
  }
  if (!data || !data.id) {
    throw new Error(
      "El INSERT se ejecutó pero no devolvió un id. Mira la consola del navegador.",
    );
  }

  // 4) VERIFICACIÓN POST-INSERT: leemos la fila que acabamos de crear.
  //    Esto detecta el caso "INSERT OK pero SELECT no lo ve" (que era el
  //    bug original). Si no la encontramos, lanzamos error claro.
  const { data: verificado, error: errVer } = await db()
    .from("pagos")
    .select("id")
    .eq("id", data.id)
    .maybeSingle();
  if (errVer) {
    throw new Error(
      `INSERT aparentemente OK pero falló la verificación: ${errVer.message}`,
    );
  }
  if (!verificado) {
    throw new Error(
      "El INSERT se ejecutó pero la fila no se persistió (no se encuentra al releerla). " +
        "Esto indica un problema de RLS asimétrico: la policy de INSERT permite " +
        "escribir pero la de SELECT filtra tu propia fila. Dile a tu developer.",
    );
  }

  console.log("[crearPago] OK y verificado:", data.id);
  return data.id;
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
