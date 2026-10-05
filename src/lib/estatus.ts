// ============================================================================
// Lógica pura del Estatus Diario
// Replica los cálculos deterministas del agente `agente-estatus-diario`
// (score de hábitos, rachas, patrón semanal, micro-acción, auditoría 20/80,
// coherencia del cierre cognitivo). Sin acceso a Supabase — solo funciones
// puras, testeables y reutilizables desde el agente LLM (vía MCP en futuro).
// ============================================================================

import {
  HABITOS_IDS,
  HABITOS_META,
  type EstatusDiario,
  type HabitoEstado,
  type HabitoId,
  type HabitoMeta,
} from "@/lib/types";

// ----------------------------------------------------------------------------
// 1. Estado de un hábito en una fila concreta
// ----------------------------------------------------------------------------

/** Devuelve el estado del hábito en una entrada, o null si no respondido. */
export function estadoHabito(e: EstatusDiario, id: HabitoId): HabitoEstado | null {
  switch (id) {
    case "qigong": return e.habito_qigong;
    case "caminar": return e.habito_caminar;
    case "ducha": return e.habito_ducha;
    case "meditacion": return e.habito_meditacion;
    case "desayuno": return e.habito_desayuno;
    case "vaciado_mental": return e.habito_vaciado_mental;
    case "comida_siesta": return e.habito_comida_siesta;
    case "estatus": return e.habito_estatus;
    case "tres_cosas_buenas": return e.habito_3_cosas_buenas;
  }
}

/** Diccionario {habitoId → estado} para una entrada. */
export function mapaHabitos(e: EstatusDiario): Record<HabitoId, HabitoEstado | null> {
  return {
    qigong: e.habito_qigong,
    caminar: e.habito_caminar,
    ducha: e.habito_ducha,
    meditacion: e.habito_meditacion,
    desayuno: e.habito_desayuno,
    vaciado_mental: e.habito_vaciado_mental,
    comida_siesta: e.habito_comida_siesta,
    estatus: e.habito_estatus,
    tres_cosas_buenas: e.habito_3_cosas_buenas,
  };
}

// ----------------------------------------------------------------------------
// 2. Score de hábitos del día (Paso 4B.B.2 del agente)
//    Los 9 hábitos pesan igual: 100/9 ≈ 11.11% cada uno.
//    ✓ = 100/9 pts  ·  ~ = 50/9 pts  ·  ✗ = 0 pts
//    Redondeo al 5% más cercano.
// ----------------------------------------------------------------------------

const PESO = 100 / HABITOS_IDS.length; // ≈ 11.111...

export interface DetalleHabito {
  id: HabitoId;
  meta: HabitoMeta;
  estado: HabitoEstado | null;
  puntos: number;
  /** Si no se respondió, no suma ni resta. */
  respondido: boolean;
}

export interface ScoreHabitos {
  /** 0-100, redondeado al 5% más cercano. */
  score: number;
  /** 0-100 sin redondear (para mostrar delta exacto). */
  scoreExacto: number;
  detalle: DetalleHabito[];
  respondidos: number; // nº de hábitos con estado != null
}

export function calcularScoreHabitos(e: EstatusDiario): ScoreHabitos {
  const detalle: DetalleHabito[] = HABITOS_META.map((meta) => {
    const estado = estadoHabito(e, meta.id);
    const puntos =
      estado === "hecho" ? PESO : estado === "parcial" ? PESO / 2 : 0;
    return { id: meta.id, meta, estado, puntos, respondido: estado !== null };
  });
  const respondidos = detalle.filter((d) => d.respondido).length;
  // Si ninguno respondido, score = 0
  if (respondidos === 0) {
    return { score: 0, scoreExacto: 0, detalle, respondidos: 0 };
  }
  const scoreExacto = detalle.reduce((acc, d) => acc + d.puntos, 0);
  // Redondeo al 5% más cercano
  const score = Math.round(scoreExacto / 5) * 5;
  return { score, scoreExacto, detalle, respondidos };
}

// ----------------------------------------------------------------------------
// 3. Comparación con últimos 7 días (Paso 4B.B.3)
//    🟢 +5 o más  ·  🟡 ±5  ·  🔴 -5 o menos
// ----------------------------------------------------------------------------

export type SemaforoHabitos = "🟢" | "🟡" | "🔴" | "—";

export function compararCon7Dias(
  hoy: EstatusDiario,
  ultimos7: EstatusDiario[],
): { media: number; delta: number; semaforo: SemaforoHabitos; suficiente: boolean } {
  if (ultimos7.length < 1) {
    return { media: 0, delta: 0, semaforo: "—", suficiente: false };
  }
  const media =
    ultimos7.reduce((acc, e) => acc + calcularScoreHabitos(e).score, 0) /
    ultimos7.length;
  const scoreHoy = calcularScoreHabitos(hoy).score;
  const delta = scoreHoy - media;
  let semaforo: SemaforoHabitos = "🟡";
  if (delta >= 5) semaforo = "🟢";
  else if (delta <= -5) semaforo = "🔴";
  return { media: Math.round(media), delta: Math.round(delta), semaforo, suficiente: true };
}

// ----------------------------------------------------------------------------
// 4. Rachas (Paso 4B.B.4)
//    Para cada hábito: días consecutivos con 'hecho' al cierre de HOY.
//    racha ≥ 3 → 🔥  ·  ayer ✓ y hoy ✗ → 💔  ·  sin histórico → "Primer registro"
// ----------------------------------------------------------------------------

export interface RachaHabito {
  id: HabitoId;
  meta: HabitoMeta;
  racha: number;          // 0 si hoy no fue 'hecho' (o si racha rota)
  rachaTopHistorica: number; // la racha más larga del histórico (para contexto)
  rota: boolean;          // true si ayer 'hecho' y hoy != 'hecho'
}

export function calcularRachas(
  historico: EstatusDiario[], // ordenadas por fecha DESC (más reciente primero)
  hoy: EstatusDiario,
): RachaHabito[] {
  // Construye lista cronológica ASC: [más antigua ... hoy]
  const asc = [...historico].reverse();
  asc.push(hoy);
  // Quita duplicados por fecha (por si hay generaciones repetidas)
  const porFecha = new Map<string, EstatusDiario>();
  for (const e of asc) porFecha.set(e.fecha, e);
  const serie = Array.from(porFecha.values()).sort((a, b) =>
    a.fecha.localeCompare(b.fecha),
  );

  return HABITOS_META.map((meta) => {
    // racha al cierre de HOY (cuenta hacia atrás desde hoy)
    let racha = 0;
    for (let i = serie.length - 1; i >= 0; i--) {
      if (estadoHabito(serie[i], meta.id) === "hecho") racha++;
      else break;
    }
    // racha top histórica (recorre todo)
    let rachaTop = 0;
    let actual = 0;
    for (const e of serie) {
      if (estadoHabito(e, meta.id) === "hecho") {
        actual++;
        rachaTop = Math.max(rachaTop, actual);
      } else {
        actual = 0;
      }
    }
    // ¿rota hoy? (ayer 'hecho' y hoy no)
    const hoyEstado = estadoHabito(hoy, meta.id);
    const ayerIdx = serie.length - 2;
    const ayerEstado = ayerIdx >= 0 ? estadoHabito(serie[ayerIdx], meta.id) : null;
    const rota = hoyEstado !== "hecho" && ayerEstado === "hecho";
    return { id: meta.id, meta, racha, rachaTopHistorica: rachaTop, rota };
  });
}

// ----------------------------------------------------------------------------
// 5. Patrón semanal (Paso 4B.B.5)
//    Agrupa por día de la semana (0=Dom..6=Sáb) y calcula score medio.
// ----------------------------------------------------------------------------

export interface PatronSemanal {
  /** Score medio por día de la semana (0..6, 0=Domingo). */
  medias: Record<number, number>;
  /** Día con peor score (0..6) o null si no hay datos. */
  peorDia: number | null;
  peorDiaScore: number | null;
  /** Nº de semanas cubiertas. */
  semanasCubiertas: number;
  /** true si hay ≥ 4 semanas. */
  suficiente: boolean;
}

const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function nombreDia(idx: number): string {
  return NOMBRES_DIA[idx] ?? `día-${idx}`;
}

export function detectarPatronSemanal(
  historico: EstatusDiario[], // ordenadas DESC
  hoy?: EstatusDiario,
): PatronSemanal {
  const serie = hoy ? [...historico, hoy] : historico;
  if (serie.length < 7) {
    return {
      medias: {},
      peorDia: null,
      peorDiaScore: null,
      semanasCubiertas: Math.floor(serie.length / 7),
      suficiente: false,
    };
  }
  const porDia = new Map<number, number[]>();
  for (const e of serie) {
    const dow = new Date(e.fecha + "T00:00:00").getDay();
    const arr = porDia.get(dow) ?? [];
    arr.push(calcularScoreHabitos(e).score);
    porDia.set(dow, arr);
  }
  const medias: Record<number, number> = {};
  let peorDia: number | null = null;
  let peorDiaScore = Infinity;
  for (const [dow, scores] of porDia.entries()) {
    const m = scores.reduce((a, b) => a + b, 0) / scores.length;
    medias[dow] = Math.round(m);
    if (m < peorDiaScore) {
      peorDiaScore = m;
      peorDia = dow;
    }
  }
  return {
    medias,
    peorDia,
    peorDiaScore: peorDia === null ? null : Math.round(peorDiaScore),
    semanasCubiertas: Math.floor(serie.length / 7),
    suficiente: serie.length >= 28, // 4 semanas
  };
}

// ----------------------------------------------------------------------------
// 6. Micro-acción priorizada para mañana (Paso 4B.B.6)
//    Regla 20/80: SOLO UNA. Criterios en ORDEN.
// ----------------------------------------------------------------------------

export interface MicroAccion {
  accion: string;
  criterio: 1 | 2 | 3 | 4 | 5;
  justificacion: string;
}

export function elegirMicroAccion(
  hoy: EstatusDiario,
  rachas: RachaHabito[],
  patron: PatronSemanal,
  score: number,
): MicroAccion {
  // Criterio 1: racha a punto de romperse (ayer ✓ y hoy ✗, racha previa ≥ 2)
  const rotaConRacha = rachas.find((r) => r.rota && r.racha >= 2);
  if (rotaConRacha) {
    return {
      accion: `Mañana haz ${rotaConRacha.meta.nombre} para reconstruir la racha (${rotaConRacha.racha} días).`,
      criterio: 1,
      justificacion: `Rota la racha de ${rotaConRacha.racha} días en ${rotaConRacha.meta.nombre}.`,
    };
  }

  // Criterio 2: hábito con 0% cumplimiento en histórico
  // (busca el de menor rachaTopHistórica / nº registros)
  const conCero = rachas.find((r) => r.rachaTopHistorica === 0);
  if (conCero) {
    return {
      accion: `Mañana empieza por lo más pequeño: ${conCero.meta.nombre} 1 minuto al despertar.`,
      criterio: 2,
      justificacion: `${conCero.meta.nombre} nunca se ha cumplido en tu histórico. Empieza pequeño.`,
    };
  }

  // Criterio 3: patrón semanal detectado
  if (patron.suficiente && patron.peorDia !== null && patron.peorDiaScore !== null) {
    const peor = nombreDia(patron.peorDia);
    // elige el hábito con menor racha activa del día
    const candidatos = rachas.filter((r) => r.racha <= 1);
    if (candidatos.length > 0) {
      const target = candidatos[0];
      return {
        accion: `Los ${peor.toUpperCase()} tu peor día (score medio ${patron.peorDiaScore}%). Ancla ${target.meta.nombre} a un momento fijo.`,
        criterio: 3,
        justificacion: `Patrón semanal: ${peor} con score ${patron.peorDiaScore}%.`,
      };
    }
  }

  // Criterio 4: score general bajo del día
  if (score < 40) {
    return {
      accion: `Micro-acción base: mañana cierra el día con "3 cosas buenas antes de dormir" (1 min de ritual).`,
      criterio: 4,
      justificacion: `Score de hoy ${score}/100 — ancla el cierre con lo más pequeño.`,
    };
  }

  // Criterio 5: score alto, sostener
  // Elige el hábito con mayor racha para mantener el momentum
  const top = [...rachas].sort((a, b) => b.racha - a.racha)[0];
  if (top && top.racha >= 2) {
    return {
      accion: `Excelente día. Mañana mantén ${top.meta.nombre} (racha activa de ${top.racha} días).`,
      criterio: 5,
      justificacion: `Score alto ${score}/100, sostén el hábito con mejor racha.`,
    };
  }
  // Fallback genérico
  return {
    accion: `Mañana haz ${HABITOS_META[0].nombre} al despertar — ancla el día.`,
    criterio: 5,
    justificacion: `Sin patrón claro todavía, ancla con lo más pequeño.`,
  };
}

// ----------------------------------------------------------------------------
// 7. Auditoría 20/80 (Paso 5 del agente)
// ----------------------------------------------------------------------------

export interface CriterioFocoRuido {
  label: string;
  ok: boolean;
  parcial?: boolean;
}

export interface EvaluacionAuditoria {
  criterios: CriterioFocoRuido[];
  /** "sí" | "parcial" | "no" según los criterios. */
  ganoElDia: "sí" | "parcial" | "no";
  pros: string[];
  contras: string[];
}

export function evaluarAuditoria20_80(e: EstatusDiario): EvaluacionAuditoria {
  const criterios: CriterioFocoRuido[] = [];

  // 1) Respetó límite de 3 tareas
  const tareasC = e.audit_tareas_criticas ?? 0;
  criterios.push({
    label: "Respetó el límite de 3 tareas",
    ok: tareasC > 0 && tareasC <= 3,
    parcial: tareasC > 3,
  });

  // 2) Completó las 3 críticas
  criterios.push({
    label: "Completó las 3 críticas del plan",
    ok: e.audit_termino_3_principales === true,
  });

  // 3) No añadió tareas nuevas
  criterios.push({
    label: "No añadió tareas nuevas sin terminar las anteriores",
    ok: e.audit_anadio_sin_terminar === false,
  });

  // 4) Las tareas eran 20/80 real
  criterios.push({
    label: "Las tareas eran 20/80 real",
    ok: e.audit_eran_20_80 === "si",
    parcial: e.audit_eran_20_80 === "parcial",
  });

  // 5) Trabajó en su futuro ideal
  const tfi = (e.trabajo_futuro_ideal ?? "").trim();
  criterios.push({
    label: "Trabajó en su futuro ideal",
    ok: tfi.length > 0 && !/^no$/i.test(tfi),
    parcial: tfi.length > 0,
  });

  const okCount = criterios.filter((c) => c.ok).length;
  const parcialCount = criterios.filter((c) => c.parcial).length;
  const ganoElDia: "sí" | "parcial" | "no" =
    okCount >= 4 ? "sí" : okCount + parcialCount >= 3 ? "parcial" : "no";

  // Pros y contras desde los campos libres
  const pros: string[] = [];
  if (e.lo_que_hiciste_bien?.trim()) pros.push(e.lo_que_hiciste_bien.trim());
  if (e.agradecimientos?.trim()) pros.push(`Agradeciste: ${e.agradecimientos.trim()}`);
  if (e.ideas_nuevas?.trim()) pros.push(`Idea nueva: ${e.ideas_nuevas.trim()}`);
  if (tfi.length > 0 && !/^no$/i.test(tfi)) pros.push(`Futuro ideal: ${tfi.trim()}`);

  const contras: string[] = [];
  if (e.bloqueos_procrastinacion?.trim()) contras.push(e.bloqueos_procrastinacion.trim());
  if (e.tareas_no_terminadas?.trim()) contras.push(`Quedó pendiente: ${e.tareas_no_terminadas.trim()}`);
  if ((e.uso_movil_min ?? 0) > 90) contras.push(`Móvil: ${e.uso_movil_min} min (> 1h30)`);
  if (e.audit_sintio === "corri") contras.push("Sintió que corrió sin cumplir");
  if (e.audit_sintio === "nada") contras.push("Sintió que no hizo nada");

  return { criterios, ganoElDia, pros, contras };
}

// ----------------------------------------------------------------------------
// 8. Coherencia del cierre cognitivo (regla del agente, ítem 13 del QC)
//    Si la respuesta a "¿primer problema mañana?" no está relacionada con
//    "¿qué queda abierto?", se marca como incoherente.
//    Heurística simple: la respuesta 5 contiene alguna palabra clave de la 2
//    (mínimo 3 caracteres).
// ----------------------------------------------------------------------------

export interface CoherenciaCierre {
  ok: boolean;
  motivo?: string;
}

export function validarCoherenciaCierre(e: EstatusDiario): CoherenciaCierre {
  const p2 = (e.cierre_queda_abierto ?? "").trim();
  const p5 = (e.cierre_primer_problema_manana ?? "").trim();
  if (!p5) return { ok: true }; // no hay nada que validar
  if (!p2) {
    return { ok: false, motivo: "Hay primer problema de mañana pero 'qué queda abierto' está vacío." };
  }
  // Extrae palabras de p2 con longitud >= 4
  const palabras = p2.toLowerCase().match(/[a-záéíóúñü]{4,}/g) ?? [];
  const p5low = p5.toLowerCase();
  const overlap = palabras.some((p) => p5low.includes(p));
  if (!overlap) {
    return {
      ok: false,
      motivo: "El 'primer problema de mañana' no parece relacionado con 'qué queda abierto'.",
    };
  }
  return { ok: true };
}

// ----------------------------------------------------------------------------
// 9. Helpers varios
// ----------------------------------------------------------------------------

/** ¿Cuántos hábitos de los 9 fueron respondidos en esta entrada? */
export function habitosRespondidos(e: EstatusDiario): number {
  return HABITOS_IDS.reduce(
    (acc, id) => acc + (estadoHabito(e, id) !== null ? 1 : 0),
    0,
  );
}

/** Etiqueta legible del estado de un hábito. */
export function etiquetaHabito(estado: HabitoEstado | null): string {
  if (estado === "hecho") return "✓";
  if (estado === "parcial") return "~";
  if (estado === "no") return "✗";
  return "—";
}
