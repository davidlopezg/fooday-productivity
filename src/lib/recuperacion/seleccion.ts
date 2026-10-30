// ============================================================================
// recuperacion/seleccion.ts — MOTOR DETERMINISTA DE SELECCIÓN DEL DÍA.
// ----------------------------------------------------------------------------
// QUÉ ES
//   Una función PURA que, dada la foto de las tareas/metas/pagos activos y
//   la capacidad del usuario, decide QUÉ TAREAS ENTRAN HOY y POR QUÉ.
//
// POR QUÉ EXISTE
//   La app tiene dos motores de priorización por IA (`motorPriorizacion.ts`
//   elige 1 tarea; `planSimple.ts` genera el plan del día). Los dos son cajas
//   negras: no puedes saber por qué una tarea ganó ni reproducir el criterio.
//   Este motor es el CONTRAPESO: reglas deterministas, explicables y testeables.
//   La IA no decide QUÉ entra — solo redacta el motivo y el primer paso.
//
// REGLAS DE ORO (no negociables)
//   1. CERO efectos secundarios. No toca la BD, no muta nada, no llama a la IA.
//   2. CERO campos nuevos. Todo se deriva de `tareas`, `metas` y `pagos`.
//   3. Todo lo seleccionado tiene un motivo EN TEXTO PLANO. Sin puntuaciones opacas.
//   4. La capacidad ajusta la CARGA, nunca oculta un riesgo.
//
// ORDEN DE DECISIÓN (de más a menos peso) — el mismo que describe el
// "Modo Recuperación":
//   1. Compromiso inamovible  (fecha dura + es_wig/meta/capa)
//   2. Riesgo financiero       (pago vencido o próximo)
//   3. Riesgo operativo        (importante + vence pronto)
//   4. Ingresos                (SOLO con tag explícito "ingresos")
//   5. Importante no urgente   (meta activa / WIG)
//   6. Mantenimiento           (recurrente o muy corta)
//   7. Mejoras no urgentes     (no entran hoy; salen como "descartables")
//
// USO
//   const r = seleccionarPlan({ tareas, metas, pagos, capacidad, hoy });
//   r.principal · r.secundarias · r.mantenimiento · r.avisos · r.descartables
// ============================================================================

import type { Meta, Tarea } from "@/lib/types";
import type { Pago } from "@/lib/pagos/types";

// ============================================================================
// Tipos públicos
// ============================================================================

/** Capacidad del usuario para hoy. Mapea 1:1 con el semáforo emocional
 *  que ya existe (`planes_diarios.semaforo`: verde | amarillo | rojo).
 *
 *  La carga real la decide `nivelDeCapacidad()`, que es más fino que el
 *  semáforo (ver la nota de allí). Este tipo sigue siendo la entrada: lo
 *  que llega de la app es el semáforo. */
export type Capacidad = "verde" | "amarillo" | "rojo";

/** Categoría de la regla que selecciona una tarea. El orden IMPORTA: es el orden
 *  de decisión. Cada categoría lleva su etiqueta en texto plano. */
export type ReglaSeleccion =
  | "riesgo_financiero"
  | "compromiso_inamovible"
  | "riesgo_operativo"
  | "ingresos"
  | "bienestar"
  | "importante_no_urgente"
  | "mantenimiento"
  | "mejora_no_urgente";

/** Por qué entra esta tarea. `motivo` es texto plano y se muestra al usuario. */
export type MotivoSeleccion = {
  regla: ReglaSeleccion;
  /** Frase lista para pintar: "Vence mañana" / "Hay un pago vencido relacionado". */
  motivo: string;
  /** Días hasta vencer (negativo = vencida). null si no tiene fecha. */
  diasHastaVencer: number | null;
  /** Datos extra para pintar (importe de pago, id del pago, tag de ingresos). */
  detalle?: string;
  /** id del pago relacionado, si lo hay. */
  pagoId?: string;
  /** Importe pendiente del pago relacionado (si lo hay). Permite ordenar
   *  las tareas de riesgo financiero: primero la más cara. */
  importePendiente?: number;
};

/** Una tarea del plan, con su motivo. */
export type TareaSeleccionada = {
  tarea: Tarea;
  motivo: MotivoSeleccion;
  /** El tiempo estimado en minutos (de subtareas). null si no se sabe. */
  minutosEstimados: number | null;
};

/** Aviso que se muestra en la pantalla aunque no entre en el plan (riesgo
 *  que la capacidad no puede silenciar). */
export type AvisoRiesgo = {
  tipo: "pago_vencido" | "pago_proximo" | "tarea_vencida";
  texto: string;
  pagoId?: string;
  tareaId?: string;
  /** Urgencia: 0 = vencida, 1 = ≤7 días, 2 = ≤30 días / agrupado. */
  nivel: 0 | 1 | 2;
  /**
   * Desglose de un aviso AGRUPADO (una línea por pago). El aviso agrupado
   * es un resumen ("12 pagos · 4.523 €"), pero al desplegarlo salen TODOS
   * los pagos uno a uno: son obligaciones distintas y hay que ver cuántas
   * son y cuánto pesan.
   */
  detalle?: string[];
};

/** Tarea que NO entra hoy y sobre la que la revisión semanal debería actuar. */
export type CandidataDescartable = {
  tarea: Tarea;
  motivo: string;
  regla: ReglaSeleccion;
};

export type ResultadoSeleccion = {
  /** La tarea principal del día. null si no hay nada que hacer. */
  principal: TareaSeleccionada | null;
  /** Hasta 2 tareas secundarias. */
  secundarias: TareaSeleccionada[];
  /** Tarea pequeña de mantenimiento (opcional). */
  mantenimiento: TareaSeleccionada | null;
  /** Tiempo personal protegido (caminar, familia, descanso). No compite con
   *  el trabajo: va a su propia sección. */
  bienestar: TareaSeleccionada | null;
  /** Riesgos que se muestran siempre, aunque la capacidad esté baja. */
  avisos: AvisoRiesgo[];
  /** Candidatas a aplazar/descartar/delegar (para la revisión semanal). */
  descartables: CandidataDescartable[];
  /** Todas las tareas del plan, en orden de ejecución. */
  plan: TareaSeleccionada[];
};

// ============================================================================
// Configuración (constantes, para que los tests sean deterministas)
// ============================================================================

/** Días hasta la fecha = "compromiso inamovible". */
export const DIAS_COMMITO_INAMOVIBLE = 2;

/** Días hasta la fecha = "riesgo operativo" (importante + vence pronto). */
export const DIAS_RIESGO_OPERATIVO = 7;

/** Días hasta la fecha = "pago próximo" (aviso, no bloquea). */
export const DIAS_PAGO_PROXIMO = 7;

/**
 * Días hasta la fecha = "pago en el horizonte" (aviso informativo).
 *
 * A PARTIR DE AQUÍ el aviso se agrupa: un pago vencido hace 3 meses es real
 * (NO se descarta ni se fusiona con otro), pero no puede gritar igual que
 * uno que vence mañana. El aviso agrupado SÍ lista cada uno por separado
 * cuando se despliega: son obligaciones distintas y el usuario tiene que ver
 * cuántas son. Lo que se agrupa es el RUIDO, no los datos.
 */
export const DIAS_PAGO_HORIZONTE = 30;

/**
 * Antigüedad máxima (en días) de un pago vencido para que siga apareciendo
 * como aviso INDIVIDUAL. Pasado esto, se cuenta en el resumen de acumulado
 * (que también lo lista al desplegarlo).
 */
export const DIAS_AVISO_INDIVIDUAL = 30;

/**
 * Capacidad: niveles de carga. El corte es deliberadamente menos severo
 * que el semáforo emocional:
 *
 *   · "Agotado" / "Totalmente sobrepasado" → ROJO (carga mínima: 1 principal)
 *   · "Sí, todo me arrastra" / "Cansado pero estable" / "Ansioso" → AMARILLO
 *     (1 principal + 1 secundaria). "Todo me arrastra" NO es "no puedo hacer
 *     nada": es "hagamos menos cosas". El rojo se reserva para la fatiga real.
 *   · "Con energía" → VERDE (1 principal + 2 secundarias)
 */
export type NivelCapacidad = "alta" | "media" | "minima";

/** Cuántas secundarias caben por nivel de carga. */
export const MAX_SECUNDARIAS_POR_NIVEL: Record<NivelCapacidad, number> = {
  alta: 2,
  media: 1,
  minima: 0,
};

/**
 * Traduce el semáforo emocional a un NIVEL DE CARGA.
 *
 * POR QUÉ NO ES 1:1 CON EL SEMÁFORO. El semáforo tiene tres valores, pero
 * la carga que se puede sostener es una escala más fina, y sobre todo el
 * corte tiene que ser menos severo:
 *
 *   · "Todo me arrastra" NO es lo mismo que "Agotado". Una es saturación
 *     (hagamos menos cosas); la otra es fatiga (no puedo más). Con el corte
 *     1:1, "todo me arrastra" quitaba las secundarias y el sistema se
 *     quedaba con UNA tarea, que es demasiado severo y además inútil: el
 *     usuario ve que el sistema no propone nada y deja de mirar.
 *   · El rojo se reserva para "Agotado" / "Totalmente sobrepasado" y para
 *     un semáforo rojo ya guardado.
 */
export function nivelDeCapacidad(args: {
  /** Semáforo del plan guardado (si existe). */
  semaforo?: string | null;
  /** Estado emocional de hoy. */
  despertar?: string | null;
  rueda?: string | null;
  necesidad?: string | null;
}): NivelCapacidad {
  const sem = args.semaforo;
  if (sem === "rojo") return "minima";
  if (sem === "verde") return "alta";
  if (sem === "amarillo") return "media";

  const despertar = (args.despertar ?? "").trim();
  const rueda = (args.rueda ?? "").trim();
  const necesidad = (args.necesidad ?? "").trim();

  if (despertar === "Agotado" || rueda === "Totalmente sobrepasado") {
    return "minima";
  }
  if (
    despertar === "Cansado pero estable" ||
    despertar === "Ansioso" ||
    rueda === "Sí, todo me arrastra" ||
    necesidad === "Contención"
  ) {
    return "media";
  }
  if (despertar === "Con energía") return "alta";

  // Sin información: carga media. Asumir "alta" llenaría el día sin que
  // nadie lo haya pedido.
  return "media";
}

/**
 * Días hasta la fecha a partir de los cuales una tarea se considera
 * "programada" (trabajo con fecha, no una gestión "de paso").
 *
 * 60 días = el horizonte con el que trabaja la app (una semana + un mes de
 * planificación). Por debajo, casi todo lo que tiene fecha es trabajo real y
 * no una gestión de pasillo.
 */
export const DIAS_PROGRAMADO = 60;

/** Etiqueta explícita que marca una tarea como generadora de ingresos.
 *  Sin este tag NO se prioriza por ingresos: no se inventan ingresos. */
export const TAG_INGRESOS = "ingresos";

/**
 * Umbral de minutos para considerar una tarea "mantenimiento" (corta).
 */
export const MINUTOS_MANTENIMIENTO = 15;

/**
 * Mínimo de minutos para que un número suelto en `esfuerzo` se considere un
 * tiempo. `esfuerzo` es TEXTO LIBRE y a veces contiene un "1" que no son
 * minutos (un nº de factura, "1 factura", "1 pago"). Por debajo de este
 * umbral, y sin el texto "min"/"h", NO se interpreta como tiempo: es
 * preferible decir "sin estimar" que mentir diciendo "1 min".
 */
export const MINUTOS_MINIMOS_ESTIMACION = 5;

/**
 * Umbral de minutos para considerar una tarea "mantenimiento" aunque tenga
 * meta. Por encima de 15 min, una tarea acotada sigue siendo una gestión
 * operativa (revisar facturas = 30 min), no un avance en el objetivo.
 */
export const MINUTOS_GESTION = 45;

/** Cuántas secundarias caben por nivel de carga (ver `nivelDeCapacidad`). */
export const MAX_SECUNDARIAS: Record<NivelCapacidad, number> = {
  alta: 2,
  media: 1,
  minima: 0,
};

// ============================================================================
// Utilidades de fecha (local, sin toISOString — mismo criterio que el repo)
// ============================================================================

/** Días enteros entre hoy (local, medianoche) y la fecha ISO (YYYY-MM-DD).
 *  Negativo = ya vencida. 0 = hoy. */
export function diasHasta(fechaIso: string | null, hoyIso: string): number | null {
  if (!fechaIso) return null;
  const [y, m, d] = fechaIso.split("-").map(Number);
  const [hy, hm, hd] = hoyIso.split("-").map(Number);
  if (!y || !m || !d || !hy || !hm || !hd) return null;
  const target = new Date(y, m - 1, d);
  const hoy = new Date(hy, hm - 1, hd);
  return Math.round((target.getTime() - hoy.getTime()) / 86400000);
}

/** La fecha más restrictiva de la tarea: `fecha_fin` (dura) manda sobre
 *  `deadline`. Mismo criterio que `clasificarMatriz` en `tareas/matriz.ts`. */
export function fechaLimite(tarea: Pick<Tarea, "fecha_fin" | "deadline">): string | null {
  return tarea.fecha_fin ?? tarea.deadline ?? null;
}

/** Texto de vencimiento legible: "vence mañana", "vence hoy", "lleva 3 días vencida". */
export function textoVencimiento(dias: number | null): string {
  if (dias == null) return "sin fecha";
  if (dias < -1) return `lleva ${Math.abs(dias)} días vencida`;
  if (dias === -1) return "venció ayer";
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias <= 7) return `vence en ${dias} días`;
  return `vence en ${dias} días`;
}

// ============================================================================
// Estimación de tiempo
// ============================================================================

/** Minutos estimados de una tarea, derivados de sus subtareas.
 *
 *  Por qué desde las subtareas y no desde `tareas.esfuerzo`:
 *  `esfuerzo` es TEXTO LIBRE (sin validación) → no es un dato fiable.
 *  `tareas_subtareas.tiempo_estimado_min` es numérico y ya está persistido.
 *
 *  Regla: la primera subtarea PENDIENTE es la próxima acción → su tiempo es
 *  el tiempo de trabajo real (no la suma de todo el proyecto). Si no hay
 *  subtareas, se cae a `esfuerzo` SOLO si parece un tiempo.
 *
 *  CUIDADO con `esfuerzo`: es TEXTO LIBRE y no siempre son minutos. En los
 *  datos reales aparecía "1" en tareas como "He recibido una factura... que
 *  tengo que programar el pago", y el motor lo leía como "1 minuto" — un
 *  tiempo absurdo que además era MENTIRA. Por eso el fallback sólo acepta:
 *   · un número ≥ MINUTOS_MINIMOS_ESTIMACION (5), o
 *   · un texto que mencione explícitamente la unidad ("30 min", "2h").
 *  En cualquier otro caso se devuelve null: es preferible decir "sin
 *  estimar" que inventar un número.
 */
export function minutosEstimados(tarea: Tarea): number | null {
  const subtareas = tarea.subtareas ?? [];
  const pendiente = subtareas.find((s) => !s.hecho && s.tiempo_estimado_min);
  if (pendiente?.tiempo_estimado_min) return pendiente.tiempo_estimado_min;
  const suma = subtareas
    .filter((s) => !s.hecho && s.tiempo_estimado_min)
    .reduce((acc, s) => acc + (s.tiempo_estimado_min ?? 0), 0);
  if (suma > 0) return suma;

  const crud = (tarea.esfuerzo ?? "").trim().toLowerCase();
  if (!crud) return null;

  const num = parseInt(crud.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num > 480) return null;

  // ¿El texto habla de HORAS o de MINUTOS? Se busca la unidad más
  // específica y se normaliza a minutos. "2h", "2 horas" → horas.
  const horas = /\d\s*(h|hs|hora|horas)\b/.test(crud) || /\b\d+\s*h\b/.test(crud);
  const minutos = /\d\s*(min|mins|minuto|minutos)\b/.test(crud);

  if (horas) {
    // "1h30" / "1 h 30" → 90 min, no 130. Se separa la parte de horas de
    // la de minutos.
    const mHoras = crud.match(/(\d+)\s*(h|hs|hora|horas)\s*(\d+)?/);
    if (mHoras) {
      const h = parseInt(mHoras[1], 10);
      const m = mHoras[3] ? parseInt(mHoras[3], 10) : 0;
      return h * 60 + m;
    }
    return num * 60;
  }
  if (minutos) return num;

  // Sin unidad explícita: sólo se acepta un número grande. "1", "2", "3" o
  // "4" sueltos NO son minutos (en los datos reales eran nº de factura o
  // similar): es preferible devolver null (sin estimar) antes que mentir.
  if (num < MINUTOS_MINIMOS_ESTIMACION) return null;
  return num;
}

// ============================================================================
// Normalización de texto (para el matching pago ↔ tarea)
// ============================================================================

/** Minúsculas, sin acentos, sin signos de puntuación, espacios colapsados. */
export function normalizar(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9áéíóúñ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Formatea un importe como "1.234,56 €" (formato español).
 *  Nota: `Intl` en es-ES no agrupa millares ("1234,56 €"), así que el
 *  separador de millares se añade a mano para que el número se lea bien. */
export function formatearImporte(importe: number): string {
  const n = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(importe);
  const [entero, decimal] = n.split(",");
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos},${decimal ?? "00"} €`;
}

/**
 * Detecta el importe dentro de un texto libre.
 * Acepta "1.234,56", "1234,56", "1234.56", "1234€".
 * Devuelve el PRIMER importe encontrado, o null si no hay ninguno.
 */
export function detectarImporte(texto: string): number | null {
  return detectarImportes(texto)[0] ?? null;
}

/**
 * Detecta TODOS los importes de un texto libre.
 * Necesario porque un texto puede traer otros números antes del importe
 * real (nº de factura, fechas, horas...). Para el matching pago↔tarea
 * comparamos contra todos, no solo el primero.
 */
export function detectarImportes(texto: string): number[] {
  const out: number[] = [];
  const re = /\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;
  for (const match of texto.matchAll(re)) {
    const bruto = match[0];
    let num: number;
    if (bruto.includes(",") && bruto.includes(".")) {
      // Formato español: 1.234,56 → 1234.56
      num = Number(bruto.replace(/\./g, "").replace(",", "."));
    } else if (bruto.includes(",")) {
      // 1234,56 → 1234.56
      num = Number(bruto.replace(",", "."));
    } else if (/\.\d{1,2}$/.test(bruto)) {
      // 1234.56 → decimal
      num = Number(bruto);
    } else {
      // "1234" o "1.234" (miles) → 1234
      num = Number(bruto.replace(/\./g, ""));
    }
    if (Number.isFinite(num)) out.push(num);
  }
  return out;
}

// ============================================================================
// Motor financiero
// ============================================================================

export type RiesgoFinanciero = {
  pago: Pago;
  dias: number;
  nivel: 0 | 1 | 2;
  texto: string;
  /**
   * Antigüedad en días del vencimiento (solo si ya venció). 0 si aún no ha
   * vencido. Sirve para separar "vence esta semana" de "lleva 3 meses
   * vencido".
   */
  antiguedad: number;
};

/**
 * Detecta riesgos financieros a partir de `pagos`.
 *
 * Sólo mira obligaciones ACTIVAS con saldo pendiente > 0. NO inventa
 * importes ni fechas: usa los de la BD.
 *
 * IMPORTANTE — el estado que se mira es `estado_efectivo` (calculado por la
 * vista `pagos.v_pagos`), NO `estado` (crudo). La diferencia importa: un
 * pago con `estado = 'pendiente'` cuya fecha ya pasó se ve como VENCIDO en
 * la app (es lo que hace `/pagos`), y el motor tiene que verlo igual. Si se
 * usara el estado crudo, los pagos vencidos hace meses aparecerían como
 * "pendientes" y no se detectarían como riesgo.
 *
 * Niveles:
 *   0 = vencido
 *   1 = vence en ≤7 días
 *   2 = vence en ≤30 días
 */
export function detectarRiesgosFinancieros(
  pagos: Pago[],
  hoyIso: string,
): RiesgoFinanciero[] {
  const out: RiesgoFinanciero[] = [];
  for (const pago of pagos) {
    // `estado_efectivo` es el que ve el usuario en /pagos. Si el pago viene
    // de la vista, es el calculado; si viene de la tabla cruda, lo derivamos.
    const estado = (pago as { estado_efectivo?: string }).estado_efectivo ?? pago.estado;
    if (estado === "pagado" || estado === "anulado") continue;
    const pendiente = (pago.importe_total ?? 0) - (pago.importe_pagado ?? 0);
    if (pendiente <= 0.005) continue;

    const dias = diasHasta(pago.fecha_vencimiento, hoyIso);
    if (dias == null) continue;

    let nivel: 0 | 1 | 2;
    // `dias === 0` significa que vence HOY: aún no está vencido, pero es el
    // último día para actuar → nivel 1 (próximo), no nivel 0 (vencido).
    if (dias < 0) nivel = 0;
    else if (dias <= DIAS_PAGO_PROXIMO) nivel = 1;
    else if (dias <= DIAS_PAGO_HORIZONTE) nivel = 2;
    else continue;

    const etiqueta = pago.proveedor || pago.concepto || "obligación";
    const texto =
      nivel === 0
        ? `${etiqueta}: ${formatearImporte(pendiente)} vencido hace ${Math.abs(dias)} día(s)`
        : nivel === 1
          ? `${etiqueta}: ${formatearImporte(pendiente)} vence en ${dias} día(s)`
          : `${etiqueta}: ${formatearImporte(pendiente)} vence en ${dias} días`;

    out.push({ pago, dias, nivel, texto, antiguedad: dias < 0 ? Math.abs(dias) : 0 });
  }
  // Primero lo más urgente.
  out.sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel - b.nivel;
    return a.dias - b.dias;
  });
  return out;
}

// ============================================================================
// Matching pago ↔ tarea (no hay FK: `pagos` y `tareas` son tablas aparte)
// ============================================================================

/**
 * Relaciona un pago con una tarea.
 *
 * POR QUÉ NO HAY FK: `pagos.pagos` y `public.tareas` viven en schemas
 * distintos y no comparten clave. La única forma de enlazarlos hoy es por
 * texto. Se hace con DOS señales, para no generar falsos positivos:
 *
 *   1. IMPORTE: el importe pendiente del pago aparece en el título o la
 *      descripción de la tarea (tolerancia de ±1 céntimo).
 *   2. PROVEEDOR/CONCEPTO: una palabra significativa (≥4 letras) del
 *      proveedor o del concepto aparece en el texto de la tarea.
 *
 * Se exige **al menos una** señal. Dos señales → match "fuerte".
 */
export function relacionarPagoConTarea(
  pago: Pago,
  tarea: Tarea,
): { fuerte: boolean;senal: "importe" | "proveedor" | null } {
  const textoOriginal = `${tarea.titulo} ${tarea.descripcion ?? ""}`;
  const texto = normalizar(textoOriginal);
  const pendiente = (pago.importe_total ?? 0) - (pago.importe_pagado ?? 0);

  let señalImporte = false;
  if (pendiente > 0) {
    // OJO: los importes se extraen del texto ORIGINAL, no del normalizado.
    // `normalizar()` convierte la coma decimal en espacio ("1234,56" →
    // "1234 56"), lo que rompería la detección de importes.
    // Se comparan TODOS los importes del texto (no solo el primero): puede
    // haber otros números antes (nº de factura, fechas, horas...).
    for (const detectado of detectarImportes(textoOriginal)) {
      if (Math.abs(detectado - pendiente) < 0.01) {
        señalImporte = true;
        break;
      }
    }
  }

  let señalProveedor = false;
  const palabras = normalizar(`${pago.proveedor} ${pago.concepto}`)
    .split(" ")
    .filter((p) => p.length >= 4);
  for (const p of palabras) {
    if (texto.includes(p)) {
      señalProveedor = true;
      break;
    }
  }

  if (señalImporte && señalProveedor) return { fuerte: true, senal: "importe" };
  if (señalImporte) return { fuerte: false, senal: "importe" };
  if (señalProveedor) return { fuerte: false, senal: "proveedor" };
  return { fuerte: false, senal: null };
}

/**
 * Construye el índice pago ↔ tarea para un conjunto de tareas y pagos.
 * Devuelve solo los matches con al menos una señal.
 */
export function indexarPagosPorTarea(
  pagos: Pago[],
  tareas: Tarea[],
  hoy: string,
): Map<string, { pago: Pago; fuerte: boolean; senal: "importe" | "proveedor" }> {
  const idx = new Map<
    string,
    { pago: Pago; fuerte: boolean; senal: "importe" | "proveedor" }
  >();
  for (const pago of pagos) {
    for (const tarea of tareas) {
      const r = relacionarPagoConTarea(pago, tarea);
      if (!r.senal) continue;
      const pendiente = (pago.importe_total ?? 0) - (pago.importe_pagado ?? 0);
      const previo = idx.get(tarea.id);
      // Desempate (en este orden):
      //   1. El match fuerte (importe + proveedor) gana al débil.
      //   2. Entre iguales, gana el de MAYOR IMPORTE PENDIENTE: si una
      //      tarea enlaza con un pago de 700 € y otro de 1.000 €, el
      //      sistema debe señalar el de 1.000 €.
      //   3. A igualdad, el más urgente.
      if (!previo) {
        idx.set(tarea.id, { pago, fuerte: r.fuerte, senal: r.senal });
        continue;
      }
      const pendientePrevio =
        (previo.pago.importe_total ?? 0) - (previo.pago.importe_pagado ?? 0);
      const urgentePrevio = diasHasta(previo.pago.fecha_vencimiento, hoy);
      const urgente = diasHasta(pago.fecha_vencimiento, hoy);

      const ganaElNuevo =
        (r.fuerte && !previo.fuerte) ||
        (r.fuerte === previo.fuerte &&
          (pendiente > pendientePrevio ||
            (pendiente === pendientePrevio &&
              urgente != null &&
              urgentePrevio != null &&
              urgente < urgentePrevio)));

      if (ganaElNuevo) {
        idx.set(tarea.id, { pago, fuerte: r.fuerte, senal: r.senal });
      }
    }
  }
  return idx;
}

// ============================================================================
// Importancia (reutiliza el criterio ya existente en `tareas/matriz.ts`)
// ============================================================================

/** ¿Es la tarea "importante" según el modelo ya vigente en la app?
 *  Mismo orden que `clasificarImportancia`: WIG-tarea > WIG-meta > meta
 *  activa > huérfana. */
export function esImportante(tarea: Tarea, meta: Meta | undefined): boolean {
  if (tarea.es_wig) return true;
  if (meta?.es_wig) return true;
  if (meta && meta.estado !== "archivada" && meta.estado !== "completada") return true;
  return false;
}

// ============================================================================
// Motor principal
// ============================================================================

export type SeleccionarPlanArgs = {
  /** Tareas candidatas (el motor filtra las que no apliquen). */
  tareas: Tarea[];
  /** Metas indexadas por id. */
  metas: Map<string, Meta>;
  /** Pagos activos (para el motor financiero y el matching). */
  pagos: Pago[];
  /** Capacidad del usuario hoy (semáforo). */
  capacidad: Capacidad;
  /**
   * Nivel de carga efectivo. Si se omite, se deriva del semáforo con
   * `nivelDeCapacidad()` (que es MÁS FINO que el semáforo: "todo me
   * arrastra" → media, no mínima). Pasarlo explícitamente permite que quien
   * llama (el modo sombra) lo calcule con el estado emocional.
   */
  nivel?: NivelCapacidad;
  /** Fecha de hoy en formato YYYY-MM-DD (local). */
  hoy: string;
  /**
   * Tareas que el usuario ha apartado: `{ ids: Set<string> }`.
   *
   * Es el resultado del feedback (Fase 6): si el usuario dijo "hoy no" y la
   * pospuso hasta el 12, el motor no debe volver a proponerla antes del 12.
   * Se pasa como dato (no se consulta la BD dentro del motor) para que el
   * motor siga siendo PURO y determinista.
   */
  apartadas?: {
    /** Ids de tareas que no se pueden proponer (bloqueadas). */
    ids?: Set<string>;
    /** Tarea → fecha hasta la que está pospuesta. */
    hasta?: Map<string, string>;
  };
};

/** Estados en los que una tarea NO es candidata a entrar en el plan. */
function esExcluible(tarea: Tarea): boolean {
  if (["hecha", "descartada", "archivada", "bloqueada"].includes(tarea.estado)) {
    return true;
  }
  // Esperando a alguien: no está en nuestra mano hoy.
  if (tarea.pendiente_respuesta) return true;
  // Las recurrentes son hábitos, no "tareas del día".
  if (tarea.recurrencia_tipo) return true;
  return false;
}

/** Calcula el plan del día de forma determinista y explicable. */
export function seleccionarPlan(args: SeleccionarPlanArgs): ResultadoSeleccion {
  const { tareas, metas, pagos, capacidad, hoy } = args;
  // El nivel efectivo manda sobre el semáforo bruto: el corte se hace por
  // carga real, no por la etiqueta del semáforo.
  const nivel: NivelCapacidad =
    args.nivel ??
    nivelDeCapacidad({
      semaforo: capacidad,
      despertar: undefined,
      rueda: undefined,
      necesidad: undefined,
    });

  // ── 0. Filtro de candidatas ────────────────────────────────────────────
  const apartadas = args.apartadas ?? {};
  const candidatas = tareas.filter((t) => {
    if (esExcluible(t)) return false;
    // Apartada explícitamente por el usuario (feedback de la Fase 6).
    if (apartadas.ids?.has(t.id)) return false;
    // Pospuesta hasta una fecha: si aún no ha llegado, no se propone.
    const hasta = apartadas.hasta?.get(t.id);
    if (hasta && hasta > hoy) return false;
    return true;
  });

  // ── Motor financiero ───────────────────────────────────────────────────
  const riesgos = detectarRiesgosFinancieros(pagos, hoy);
  const pagosActivos = riesgos.map((r) => r.pago);
  const pagosPorTarea = indexarPagosPorTarea(pagosActivos, candidatas, hoy);

  // ── Avisos (riesgos que la capacidad NO puede silenciar) ──────────────
  // Un pago vencido hace 3 meses sigue siendo real y NO se fusiona con
  // otro: cada línea es una obligación distinta (tres TGSS de 480 € son tres
  // pagos). Lo que se agrupa es el RUIDO, no los datos: los vencidos hace
  // más de 30 días se muestran como un resumen con el total, y al
  // desplegarlo salen uno a uno.
  const avisos: AvisoRiesgo[] = [];
  const vencidosAntiguos: RiesgoFinanciero[] = [];
  for (const r of riesgos) {
    if (r.nivel === 2) continue; // el horizonte de 30 días es informativo
    if (r.nivel === 0 && r.antiguedad > DIAS_AVISO_INDIVIDUAL) {
      vencidosAntiguos.push(r);
      continue;
    }
    avisos.push({
      tipo: r.nivel === 0 ? "pago_vencido" : "pago_proximo",
      texto: r.texto,
      pagoId: r.pago.id,
      nivel: r.nivel,
    });
  }

  // El resumen del acumulado: un aviso, con el total y el desglose al
  // desplegarlo. Sin esto, 12 pagos de hace meses ahogan los 2 que vencen
  // esta semana.
  if (vencidosAntiguos.length > 0) {
    const total = vencidosAntiguos.reduce(
      (acc, r) => acc + (r.pago.importe_total ?? 0) - (r.pago.importe_pagado ?? 0),
      0,
    );
    avisos.push({
      tipo: "pago_vencido",
      texto: `${vencidosAntiguos.length} pago(s) vencidos hace más de ${DIAS_AVISO_INDIVIDUAL} días · ${formatearImporte(total)} pendientes en total`,
      nivel: 2,
      detalle: vencidosAntiguos.map(
        (r) =>
          `${r.pago.proveedor || r.pago.concepto}: ${formatearImporte(
            (r.pago.importe_total ?? 0) - (r.pago.importe_pagado ?? 0),
          )} · vencido hace ${r.antiguedad} días`,
      ),
    });
  }

  // ── Clasificación de cada candidata ───────────────────────────────────
  type Candidata = {
    tarea: Tarea;
    minutos: number | null;
    dias: number | null;
    importante: boolean;
    pagoVinculado?: { pago: Pago; fuerte: boolean; senal: "importe" | "proveedor" };
  };

  const evaluadas: Candidata[] = candidatas.map((t) => {
    const dias = diasHasta(fechaLimite(t), hoy);
    return {
      tarea: t,
      minutos: minutosEstimados(t),
      dias,
      importante: esImportante(t, t.meta_id ? metas.get(t.meta_id) : undefined),
      pagoVinculado: pagosPorTarea.get(t.id),
    };
  });

  // Tareas vencidas → aviso (aunque no entren en el plan).
  for (const c of evaluadas) {
    if (c.dias != null && c.dias < 0 && c.importante) {
      avisos.push({
        tipo: "tarea_vencida",
        texto: `"${c.tarea.titulo}" ${textoVencimiento(c.dias)}`,
        tareaId: c.tarea.id,
        nivel: 0,
      });
    }
  }

  // ── Selección por regla (primero que encaja gana) ─────────────────────
  const descartables: CandidataDescartable[] = [];
  const seleccionadas: TareaSeleccionada[] = [];

  const esIngreso = (t: Tarea) =>
    (t.tags ?? []).some((tag) => normalizar(tag) === TAG_INGRESOS);

  /** Aplica las reglas en orden y devuelve la primera que encaje. */
  function reglaDe(c: Candidata): MotivoSeleccion | null {
    const t = c.tarea;

    // 1. Riesgo financiero: la tarea está vinculada a un pago en riesgo.
    //    Va POR DELANTE del compromiso inamovible a propósito: una deuda
    //    vencida o a punto de vencer tiene consecuencias más graves que
    //    cualquier otro compromiso, aunque la otra tarea tenga fecha más
    //    restrictiva. La regla 1 del brief lo dice así: "No asumir que una
    //    tarea urgente es necesariamente más importante que una que puede
    //    evitar un problema financiero grave".
    if (c.pagoVinculado) {
      const { pago, senal } = c.pagoVinculado;
      const pendiente = (pago.importe_total ?? 0) - (pago.importe_pagado ?? 0);
      const diasPago = diasHasta(pago.fecha_vencimiento, hoy);
      // La etiqueta dice QUÉ-SE-COINCIDIÓ de verdad. Antes decía siempre
      // "concepto coincidente" aunque lo que hubiera coincidido fuera el
      // importe (que es la señal más fuerte).
      //   "importe"    → el importe pendiente aparece en el texto.
      //   "proveedor"  → coincide una palabra del proveedor/conCEPTO.
      // En ambos casos se añade el estado del pago, que es lo que de verdad
      // importa: un pago VENCIDO de 700 € no es lo mismo que uno que vence
      // en 30 días, aunque el importe sea el mismo.
      const senalTexto =
        senal === "importe" ? "importe coincidente" : "proveedor o concepto coincidente";
      // El estado del pago va DENTRO del texto: decir "pago vencido" cuando
      // en realidad vence en 20 días es mentir, y el usuario ya avisó de
      // que no quiere que el sistema le alerte de algo que no está en
      // riesgo. Con `estado_efectivo` = pagado/anulado el pago ni siquiera
      // llega aqui.
      const estadoPago =
        diasPago == null
          ? "sin fecha de vencimiento"
          : diasPago < 0
            ? `vencido hace ${Math.abs(diasPago)} día(s)`
            : diasPago === 0
              ? "vence hoy"
              : `vence en ${diasPago} día(s)`;
      const detalle = `${formatearImporte(pendiente)} · ${senalTexto} · ${estadoPago}`;
      return {
        regla: "riesgo_financiero",
        motivo:
          diasPago != null && diasPago < 0
            ? `Hay un pago vencido relacionado (${formatearImporte(pendiente)})`
            : diasPago != null && diasPago <= DIAS_PAGO_HORIZONTE
              ? `Hay un pago que vence pronto relacionado (${formatearImporte(pendiente)})`
              : `Hay un pago pendiente relacionado (${formatearImporte(pendiente)})`,
        diasHastaVencer: c.dias,
        detalle,
        pagoId: pago.id,
        /** Importe pendiente del pago: sirve para ORDENAR las tareas de
         *  riesgo financiero (la más cara va primero). */
        importePendiente: pendiente,
      };
    }

    // 2. Compromiso inamovible: fecha dura + señal de peso (WIG/meta/capa).
    const tienePeso = t.es_wig || !!t.meta_id || !!t.capa;
    if (c.dias != null && c.dias <= DIAS_COMMITO_INAMOVIBLE && tienePeso) {
      return {
        regla: "compromiso_inamovible",
        motivo:
          c.dias < 0
            ? `Es un compromiso con fecha y ${textoVencimiento(c.dias)}`
            : `Es un compromiso con fecha que ${textoVencimiento(c.dias)}`,
        diasHastaVencer: c.dias,
      };
    }

    // 3. Riesgo operativo: importante y vence pronto (o ya venció).
    //    Una tarea IMPORTANTE que ya venció entra SIEMPRE: si el sistema
    //    detecta que está vencida y a la vez la aparta del plan, se
    //    contradice (avisar de algo que no vas a hacer). Estar vencida es
    //    la razón de más para hacerla hoy, no menos.
    if (c.importante && c.dias != null && c.dias <= DIAS_RIESGO_OPERATIVO) {
      return {
        regla: "riesgo_operativo",
        motivo:
          c.dias < 0
            ? `Es importante y ${textoVencimiento(c.dias)}`
            : `Es importante y ${textoVencimiento(c.dias)}`,
        diasHastaVencer: c.dias,
      };
    }

    // 4. Ingresos: SOLO con el tag explícito. Nunca se infieren.
    if (esIngreso(t)) {
      return {
        regla: "ingresos",
        motivo: "Está marcada como generadora de ingresos",
        diasHastaVencer: c.dias,
        detalle: t.importe != null ? formatearImporte(t.importe) : undefined,
      };
    }

    // 4b. BIENESTAR: ámbito personal. No es "descartable": es tiempo
    //     protegido (caminar, estar con la familia, descansar). El brief es
    //     explícito: ese tiempo no debe contar automáticamente como
    //     improductivo. Va DESPUÉS de todo lo profesional para no robarle
    //     el sitio a un compromiso, pero ANTES del descarte: si no lo
    //     metemos en el plan, se pierde.
    if (t.ambito === "personal") {
      return {
        regla: "bienestar",
        motivo: "Cuidado personal: merece un hueco protegido en el día",
        diasHastaVencer: c.dias,
      };
    }

    // 5. Mantenimiento: gestión acotada SIN urgencia de fecha. Va ANTES que
    //    "importante no urgente": una gestión de 30 min con meta sigue
    //    siendo mantenimiento (es una gestión, no un avance en el
    //    objetivo), y ocuparía el sitio de una tarea grande con el mismo
    //    valor operativo.
    //
    //    El criterio NO es solo "es corta" (≤15 min) sino "es corta Y no
    //    aprieta". Una tarea de 10 min que vence HOY es un compromiso, no
    //    mantenimiento — de eso ya se han ocupado las reglas 1-3.
    //
    //    Y además: si la tarea tiene una fecha PRÓXIMA (<=30 días), es
    //    trabajo programado, no una gestión "de paso" — aunque sea corta.
    //    "Contactar con un cliente" con fecha la semana que viene es
    //    trabajo de verdad; "revisar una factura" sin fecha es una gestión.
    const sinUrgencia = c.dias == null || c.dias > DIAS_RIESGO_OPERATIVO;
    const sinFechaProgramada = c.dias == null || c.dias > DIAS_PROGRAMADO;
    const esCorta =
      c.minutos != null && c.minutos <= MINUTOS_MANTENIMIENTO;
    const esGestion =
      c.minutos != null &&
      c.minutos > MINUTOS_MANTENIMIENTO &&
      c.minutos <= MINUTOS_GESTION;
    if ((esCorta || esGestion) && sinUrgencia && sinFechaProgramada) {
      return {
        regla: "mantenimiento",
        motivo: esCorta
          ? `Tarea pequeña (${c.minutos} min) que puede hacerse de paso`
          : `Gestión operativa acotada (${c.minutos} min) que puede hacerse de paso`,
        diasHastaVencer: c.dias,
      };
    }

    // 6. Importante no urgente: meta activa o WIG, sin urgencia de fecha.
    if (c.importante) {
      return {
        regla: "importante_no_urgente",
        motivo: "Está asociada a un objetivo activo y no vence hoy",
        diasHastaVencer: c.dias,
      };
    }

    // 7. Mejora no urgente: no entra hoy.
    return null;
  }

  // Orden estable dentro de cada regla: por urgencia (fecha) y luego por
  // peso (WIG > meta > suelta) y, a igualdad, por orden de creación.
  const peso = (t: Tarea) => (t.es_wig ? 0 : t.meta_id ? 1 : 2);

  for (const c of evaluadas) {
    const motivo = reglaDe(c);
    if (!motivo) {
      descartables.push({
        tarea: c.tarea,
        motivo: "No es urgente ni está asociada a un objetivo activo",
        regla: "mejora_no_urgente",
      });
      continue;
    }
    seleccionadas.push({ tarea: c.tarea, motivo, minutosEstimados: c.minutos });
  }

  // Orden del plan: por peso de regla, luego por urgencia, luego por peso.
  const ordenRegla: Record<ReglaSeleccion, number> = {
    riesgo_financiero: 0,
    compromiso_inamovible: 1,
    riesgo_operativo: 2,
    ingresos: 3,
    importante_no_urgente: 4,
    mantenimiento: 5,
    bienestar: 6,
    mejora_no_urgente: 7,
  };
  seleccionadas.sort((a, b) => {
    const ra = ordenRegla[a.motivo.regla];
    const rb = ordenRegla[b.motivo.regla];
    if (ra !== rb) return ra - rb;
    // Dentro del riesgo financiero, la más CARA va primero: entre un pago
    // de 350 € y otro de 700 € vencidos, el que más duele es el de 700 €.
    const ia = a.motivo.importePendiente ?? 0;
    const ib = b.motivo.importePendiente ?? 0;
    if (ia !== ib) return ib - ia;
    const da = a.motivo.diasHastaVencer ?? 9999;
    const db = b.motivo.diasHastaVencer ?? 9999;
    if (da !== db) return da - db;
    const pa = peso(a.tarea);
    const pb = peso(b.tarea);
    if (pa !== pb) return pa - pb;
    return (a.tarea.created_at ?? "").localeCompare(b.tarea.created_at ?? "");
  });

  // ── Reparto por rol ────────────────────────────────────────────────────
  // Cada tarea entra en UN SOLO sitio. El reparto es por prioridad de rol y
  // las que pierden su sitio NO se descartan (se quedan de reserva para la
  // revisión semanal), pero no se pintan dos veces.
  //
  // 1. El BIENESTAR se aparta del plan de trabajo: va a su propia sección
  //    para que no compita por el sitio de la tarea principal ni se lea como
  //    otra tarea más. No es una "secundaria" que se pueda posponer sin más.
  const candidatasBienestar = seleccionadas.filter(
    (s) => s.motivo.regla === "bienestar",
  );
  const bienestar = candidatasBienestar[0] ?? null;

  // 2. El MANTENIMIENTO se aparta igualmente: es un hueco propio de la
  //    pantalla ("una gestión pequeña"), no una secundaria más. Solo entra si
  //    la carga no es mínima.
  const candidatasMantenimiento = seleccionadas.filter(
    (s) => s.motivo.regla === "mantenimiento",
  );
  const mantenimiento =
    nivel !== "minima" ? (candidatasMantenimiento[0] ?? null) : null;

  // 3. Las que quedan son candidatas a principal/secundarias. Se EXCLUYEN
  //    las ya asignadas a mantenimiento para que ninguna tarea aparezca dos
  //    veces en la misma pantalla.
  const idMantenimiento = mantenimiento?.tarea.id;
  const deTrabajo = seleccionadas.filter(
    (s) =>
      s.motivo.regla !== "bienestar" &&
      s.motivo.regla !== "mantenimiento" &&
      s.tarea.id !== idMantenimiento,
  );

  const principal = deTrabajo[0] ?? null;
  const maxSec = MAX_SECUNDARIAS[nivel];

  // INVARIANTE: una misma obligacion (pago) no puede ocupar dos huecos
  // del plan. Si la principal y la secundaria apuntan al mismo pago
  // vencido, la pantalla diria dos veces "este es el riesgo que debes
  // atender" — y encima la secundaria no seria una segunda cosa que
  // hacer, sino la MISMA otra vez. Cuando pasa, la segunda se busca entre
  // las candidatas que NO comparten pago con la principal.
  const pagoDePrincipal = principal?.motivo.pagoId;
  const secundariasSinRepetir: TareaSeleccionada[] = [];
  for (const s of deTrabajo.slice(1)) {
    if (secundariasSinRepetir.length >= maxSec) break;
    const pagoId = s.motivo.pagoId;
    if (pagoId && pagoId === pagoDePrincipal) continue;
    if (
      pagoId &&
      secundariasSinRepetir.some((x) => x.motivo.pagoId === pagoId)
    ) {
      continue;
    }
    secundariasSinRepetir.push(s);
  }
  const secundarias = secundariasSinRepetir;

  // ── Plan final ─────────────────────────────────────────────────────────
  const plan = [
    ...(principal ? [principal] : []),
    ...secundarias,
    ...(mantenimiento ? [mantenimiento] : []),
  ];

  // Los avisos más urgentes primero.
  avisos.sort((a, b) => a.nivel - b.nivel);

  return {
    principal,
    secundarias,
    mantenimiento,
    bienestar,
    avisos,
    descartables,
    plan,
  };
}
