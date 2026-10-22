// ============================================================================
// hipotesis.ts — lógica pura de la capa de escenarios.
// ----------------------------------------------------------------------------
// Sin imports de runtime (solo `import type`, que TypeScript borra al
// compilar) para que se pueda testear con `node` sin bundler:
//
//     node src/lib/escenarios/hipotesis.test.mjs
// ============================================================================

import type {
  CategoriaHipotesis,
  EstadoProyecto,
  Hipotesis,
  Tarea,
} from "@/lib/types";

export const CATEGORIAS: CategoriaHipotesis[] = [
  "riesgo",
  "oportunidad",
  "punto_ciego",
  "wildcard",
];

/** Estados de tarea que cuentan como "abiertas" (no cerradas). */
export const ESTADOS_ACTIVOS = ["pendiente", "en_progreso", "bloqueada"];

/**
 * Normaliza la respuesta de la IA:
 *   · descarta hipótesis sin título o sin estrategia (no valen nada),
 *   · fuerza una categoría válida,
 *   · clampa la probabilidad a 0-100,
 *   · ordena de más probable a menos probable.
 */
export function sanearHipotesis(raw: unknown): Hipotesis[] {
  if (!Array.isArray(raw)) return [];
  const out: Hipotesis[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const titulo = String(r.titulo ?? "").trim();
    const estrategia = String(r.estrategia ?? "").trim();
    if (!titulo || !estrategia) continue;
    const cat = String(r.categoria ?? "") as CategoriaHipotesis;
    const p = Number(r.probabilidad);
    out.push({
      categoria: CATEGORIAS.includes(cat) ? cat : "riesgo",
      titulo,
      probabilidad: Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 50,
      estrategia,
      justificacion: String(r.justificacion ?? "").trim() || undefined,
      indicador: String(r.indicador ?? "").trim() || undefined,
    });
  }
  // Más probable primero (dato secundario, pero así se lee mejor).
  return out.sort((a, b) => b.probabilidad - a.probabilidad);
}

/**
 * ESTADO del proyecto: el presente MEDIDO.
 * Se calcula desde las tareas en cada render — no se persiste, porque una
 * tabla de estado se pudre (y nadie la actualiza).
 */
export function estadoDeProyecto(
  tareas: Pick<Tarea, "estado" | "deadline">[],
  hoy: string,
): EstadoProyecto {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.estado === "hecha").length;
  const abiertas = tareas.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length;
  const bloqueadas = tareas.filter((t) => t.estado === "bloqueada").length;
  const vencidas = tareas.filter(
    (t) => t.estado !== "hecha" && !!t.deadline && t.deadline < hoy,
  ).length;
  const avance = total > 0 ? Math.round((hechas / total) * 100) : 0;
  const vencimientos = tareas
    .filter((t) => t.estado !== "hecha" && !!t.deadline)
    .map((t) => t.deadline as string)
    .sort();
  return {
    total,
    hechas,
    abiertas,
    bloqueadas,
    vencidas,
    avance,
    proximoVencimiento: vencimientos[0] ?? null,
  };
}

/** "hace 3 días" / "hoy" — sin librería de fechas. */
export function haceCuanto(iso: string, hoy: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const h = new Date(`${hoy}T00:00:00`);
  const dias = Math.round((h.getTime() - d.getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return `hace ${Math.round(dias / 30)} mes(es)`;
}
