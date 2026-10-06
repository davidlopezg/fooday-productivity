// ============================================================================
// Tipos del módulo PAGOS
// Alineados con supabase/migrations/0021_pagos.sql
// Schema separado `pagos` (portabilidad futura: pg_dump --schema=pagos).
// ============================================================================

/** Estados del pago (CHECK en `pagos.pagos.estado`). */
export type EstadoPago =
  | "pendiente"
  | "programado"
  | "pagado_parcial"
  | "pagado"
  | "vencido"
  | "anulado";

/** Prioridad del pago (CHECK en `pagos.pagos.prioridad`). */
export type PrioridadPago = "critica" | "alta" | "media" | "baja";

/** Categoría del pago (CHECK en `pagos.pagos.categoria`). */
export type CategoriaPago =
  | "alquiler"
  | "suministro"
  | "nomina"
  | "proveedor"
  | "impuesto"
  | "prestamo"
  | "seguro"
  | "otro";

/** Método de pago (CHECK en `pagos.pagos.metodo_pago`).
 *  `domiciliacion` se considera informativo: NO aparece en "A pagar este
 *  lunes" salvo filtro explícito (el banco cobra solo). */
export type MetodoPago =
  | "transferencia"
  | "domiciliacion"
  | "tarjeta"
  | "bizum"
  | "efectivo";

/** Tabla `pagos.recurrentes` (reglas de generación automática). */
export interface RecurrentePago {
  id: string;
  proveedor: string;
  concepto: string;
  categoria: CategoriaPago;
  importe: number;
  dia_del_mes: number;
  dia_vencimiento: number | null;
  metodo_pago: MetodoPago;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

/** Tabla `pagos.pagos` — fila cruda tal cual viene de la BD. */
export interface Pago {
  id: string;
  recurrencia_id: string | null;
  recurrente_id: string | null;
  proveedor: string;
  concepto: string;
  categoria: CategoriaPago;
  importe_total: number;
  importe_pagado: number;
  fecha_emision_factura: string | null;
  fecha_vencimiento: string;
  fecha_pago_programada: string | null;
  fecha_pago_real: string | null;
  estado: EstadoPago;
  prioridad: PrioridadPago;
  urgencia_score: number | null;
  metodo_pago: MetodoPago;
  alerta_vencimiento_dias: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

/** Pago enriquecido con campos calculados (vienen de `pagos.v_pagos`). */
export interface PagoConUrgencia extends Pago {
  estado_efectivo: EstadoPago;
  dias_hasta_vencer: number;
  urgencia_calculada: number;
}

/** Tabla `pagos.movimientos` — log de pagos parciales. */
export interface PagoMovimiento {
  id: string;
  pago_id: string;
  fecha: string;
  importe: number;
  metodo_pago: MetodoPago;
  notas: string | null;
  created_at: string;
}

/** Tabla `pagos.adjuntos` — metadatos de PDFs subidos. */
export interface PagoAdjunto {
  id: string;
  pago_id: string;
  filename: string;
  mime: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Constantes UI (tonos, labels, orden)
// ============================================================================

export const CATEGORIAS_PAGO: CategoriaPago[] = [
  "alquiler",
  "suministro",
  "nomina",
  "proveedor",
  "impuesto",
  "prestamo",
  "seguro",
  "otro",
];

export const METODOS_PAGO: MetodoPago[] = [
  "transferencia",
  "domiciliacion",
  "tarjeta",
  "bizum",
  "efectivo",
];

export const PRIORIDADES_PAGO: PrioridadPago[] = [
  "critica",
  "alta",
  "media",
  "baja",
];

export const ESTADOS_PAGO: EstadoPago[] = [
  "pendiente",
  "programado",
  "pagado_parcial",
  "pagado",
  "vencido",
  "anulado",
];

export const CATEGORIA_LABEL: Record<CategoriaPago, string> = {
  alquiler: "Alquiler",
  suministro: "Suministro",
  nomina: "Nómina",
  proveedor: "Proveedor",
  impuesto: "Impuesto",
  prestamo: "Préstamo",
  seguro: "Seguro",
  otro: "Otro",
};

export const CATEGORIA_ICONO: Record<CategoriaPago, string> = {
  alquiler: "🏠",
  suministro: "💡",
  nomina: "👥",
  proveedor: "📦",
  impuesto: "🏛️",
  prestamo: "🏦",
  seguro: "🛡️",
  otro: "📄",
};

export const METODO_LABEL: Record<MetodoPago, string> = {
  transferencia: "Transferencia",
  domiciliacion: "Domiciliado",
  tarjeta: "Tarjeta",
  bizum: "Bizum",
  efectivo: "Efectivo",
};

export const ESTADO_LABEL: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  programado: "Programado",
  pagado_parcial: "Pagado parcial",
  pagado: "Pagado",
  vencido: "Vencido",
  anulado: "Anulado",
};

/** Tonos Tailwind para chips de estado. */
export const TONO_ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente:
    "bg-muted text-muted-foreground border-border",
  programado:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  pagado_parcial:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  pagado:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  vencido:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  anulado:
    "bg-muted text-muted-foreground border-border line-through",
};

export const TONO_PRIORIDAD_PAGO: Record<PrioridadPago, string> = {
  critica:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  alta:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  media:
    "bg-muted text-muted-foreground border-border",
  baja:
    "bg-muted text-muted-foreground border-border",
};

/** Calcula si el score de urgencia (devuelto por la vista SQL) supera
 *  a la prioridad manual. Sirve para mostrar el warning visual. */
export function urgenciaSuperaPrioridad(
  score: number | null,
  prioridad: PrioridadPago,
): boolean {
  if (score == null) return false;
  // Umbral por prioridad manual: si lo supera, sugiere reasignar.
  const umbral: Record<PrioridadPago, number> = {
    critica: 2000,
    alta: 500,
    media: 100,
    baja: 20,
  };
  return score > (umbral[prioridad] ?? 0);
}
