// ============================================================================
// Helpers para la página /semana (planificación semanal).
// Toda la matemática de semanas ISO vive aquí para que sea trivial testearla
// y para que la página solo piense en pintar.
// ============================================================================

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DiaSemanaInfo {
  id: DiaSemana;
  nombre: string;
  corto: string;
}

export const DIAS_SEMANA: readonly DiaSemanaInfo[] = [
  { id: 1, nombre: "Lunes", corto: "L" },
  { id: 2, nombre: "Martes", corto: "M" },
  { id: 3, nombre: "Miércoles", corto: "X" },
  { id: 4, nombre: "Jueves", corto: "J" },
  { id: 5, nombre: "Viernes", corto: "V" },
  { id: 6, nombre: "Sábado", corto: "S" },
  { id: 7, nombre: "Domingo", corto: "D" },
] as const;

/** Devuelve el nombre legible para un día ISO (1=lunes .. 7=domingo). */
export function nombreDia(dia: number): string {
  return DIAS_SEMANA.find((d) => d.id === dia)?.nombre ?? `Día ${dia}`;
}

/** Devuelve el lunes (Date en zona local, hora 00:00) de una semana ISO. */
export function isoWeekToMonday(anio: number, semana_iso: number): Date {
  // Semana 1 = lunes de la semana que contiene el 4 de enero.
  // (Esto sigue la definición ISO 8601.)
  const jan4 = new Date(anio, 0, 4);
  const jan4Day = jan4.getDay() || 7; // 1=lun .. 7=dom
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day + 1);
  week1Monday.setHours(0, 0, 0, 0);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (semana_iso - 1) * 7);
  return monday;
}

/**
 * Calcula el año + nº de semana ISO (y fechas lunes-domingo en hora local)
 * para la fecha dada. Semana 1 = la que contiene el primer jueves del año.
 */
export function getISOWeek(date: Date): {
  anio: number;
  semana_iso: number;
  fecha_inicio: Date;
  fecha_fin: Date;
} {
  // Truco ISO: el jueves determina el año-semana. Copiamos a UTC para no
  // liarnos con DST al cruzar la medianoche.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1=lun .. 7=dom
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const anio = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(anio, 0, 1));
  const semana_iso = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  // En zona local: lunes a domingo de la semana de `date`.
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { anio, semana_iso, fecha_inicio: monday, fecha_fin: sunday };
}

/** Devuelve la semana ISO actual (la que contiene hoy). */
export function getCurrentISOWeek() {
  return getISOWeek(new Date());
}

/** Navega N semanas desde (anio, semana_iso). delta=+1 → siguiente, -1 → anterior. */
export function shiftISOWeek(
  anio: number,
  semana_iso: number,
  delta: number,
): { anio: number; semana_iso: number } {
  const monday = isoWeekToMonday(anio, semana_iso);
  monday.setDate(monday.getDate() + delta * 7);
  return getISOWeek(monday);
}

/** Texto legible: "Semana 42 (13 oct – 19 oct)". */
export function formatISOWeek(anio: number, semana_iso: number): string {
  const monday = isoWeekToMonday(anio, semana_iso);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `Semana ${semana_iso} · ${fmt(monday)} – ${fmt(sunday)}`;
}

// ============================================================================
// Bloques fijos (reglas no negociables de la semana).
// Definidos en código (no en BD) porque "no cambian nunca". Si en el futuro
// se quieren editar, se migran a `rituales` o a una tabla propia.
// ============================================================================

export interface BloqueFijo {
  dia: DiaSemana;
  emoji: string;
  titulo: string;
  nota?: string;
  /** Si true, esa columna queda "reservada" y no admite tareas críticas de la IA. */
  bloquea: boolean;
}

export const BLOQUES_FIJOS: readonly BloqueFijo[] = [
  // Lunes a primera hora: pagos, y yo primero.
  {
    dia: 1,
    emoji: "💸",
    titulo: "Pagos de la semana",
    nota: "¡yo primero!",
    bloquea: false,
  },
  // Jueves todo el día: Sol de Nit.
  {
    dia: 4,
    emoji: "🎨",
    titulo: "Producción y creatividad · Sol de Nit",
    bloquea: true,
  },
  // Sábado: descanso + inventario/lista de la compra de Sol de Nit por la noche.
  {
    dia: 6,
    emoji: "🌿",
    titulo: "Descanso",
    bloquea: true,
  },
  {
    dia: 6,
    emoji: "📦",
    titulo: "Inventario y lista de la compra · Sol de Nit",
    bloquea: true,
  },
  // Domingo: planificación + María + comida.
  {
    dia: 7,
    emoji: "📅",
    titulo: "Planificación semanal",
    bloquea: true,
  },
  {
    dia: 7,
    emoji: "🤝",
    titulo: "Reunión con María",
    bloquea: true,
  },
  {
    dia: 7,
    emoji: "🍽️",
    titulo: "Comida de la semana",
    bloquea: true,
  },
] as const;

/** Bloques fijos para un día concreto (orden estable). */
export function bloquesFijosDe(dia: DiaSemana): BloqueFijo[] {
  return BLOQUES_FIJOS.filter((b) => b.dia === dia);
}

/** Días elegibles para la propuesta IA (los NO bloqueados, sin contar S-D). */
export const DIAS_IA: readonly DiaSemana[] = [1, 2, 3, 5] as const; // L, M, X, V

/** Tareas críticas por día que propone la IA. */
export const TAREAS_POR_DIA_IA = 3;