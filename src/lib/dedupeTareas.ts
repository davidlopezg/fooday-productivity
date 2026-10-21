// ============================================================================
// dedupeTareas.ts — Detección heurística de tareas duplicadas o casi.
//
// Decisiones (ponytail — mínimo que funcione, 100% cliente, sin IA):
//   · Set esperado: cientos, no miles. La heurística es suficiente y mucho
//     más rápida/usable que un embedding semántico.
//   · Normalización: lowercase, sin acentos, sin signos de puntuación,
//     colapsar espacios. Lo que queda son "palabras" que comparar.
//   · Detección de pares por TRES señales combinadas (cualquiera basta):
//       1. Exacto tras normalizar               → mismo grupo
//       2. Levenshtein ≤ UMBRAL_LEVENSHTEIN     → "llamar a Teresa" / "llamar Teresa"
//       3. Jaccard de shingles(3) ≥ UMBRAL_JACCARD → "preparar dossier financiero"
//                                                       vs "preparar dossier financieros"
//   · Agrupación transitiva: si A≈B y B≈C, los tres van al mismo grupo.
//     Implementado con union-find (DisjointSetUnion).
//   · NO mezcla heurísticas con IA en esta v1. Si más adelante quieres
//     embeddings, hazlo en una capa superior (`encontrarDuplicadasSemanticas`).
//
// Coste: O(n²) sobre el nº de tareas. Para 500 tareas son ~125k pares de
// comparaciones, instantáneo en navegador.
// ============================================================================

import type { Tarea } from "@/lib/types";

/** Umbral de distancia Levenshtein (sobre el título NORMALIZADO). */
const UMBRAL_LEVENSHTEIN = 3;

/** Umbral de similitud Jaccard sobre shingles de 3 palabras (0..1). */
export const UMBRAL_JACCARD = 0.8;

/** Tamaño del shingle en palabras (3 = trigrama de palabras). */
const SHINGLE_SIZE = 3;

// ============================================================================
// Normalización
// ============================================================================

/** Normaliza un título para compararlo: minúsculas, sin acentos, sin
 *  signos de puntuación, espacios colapsados. NO recorta stopwords: eso
 *  podría distorsionar títulos cortos ("busco piso"). */
export function normalizarTitulo(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // acentos
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // signos -> espacio
    .replace(/\s+/g, " ")
    .trim();
}

/** Genera el set de shingles de N palabras a partir de un string. Para
 *  "preparar dossier financiero" con N=3 → {"preparar dossier financiero"}
 *  (un único shingle). Para "preparar dossier financiero para reunions"
 *  → {"preparar dossier financiero", "dossier financiero para",
 *     "financiero para reunions"} (3 shingles solapados). */
export function shingles(palabras: string[], n: number = SHINGLE_SIZE): Set<string> {
  const set = new Set<string>();
  if (palabras.length < n) {
    // Título más corto que el shingle: usamos el título entero.
    set.add(palabras.join(" "));
    return set;
  }
  for (let i = 0; i <= palabras.length - n; i++) {
    set.add(palabras.slice(i, i + n).join(" "));
  }
  return set;
}

/** Jaccard = |A ∩ B| / |A ∪ B|. 0 = disjuntos, 1 = idénticos. */
export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1; // dos vacíos = idénticos
  let inter = 0;
  // Iteramos sobre el más pequeño para eficiencia.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ============================================================================
// Levenshtein (clásico, O(len(a)*len(b))). Suficiente porque los strings
// normalizados no superan ~80 chars en títulos de tarea.
// ============================================================================

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;

  // Una sola fila para ahorrar memoria.
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // eliminación
        curr[j - 1] + 1,  // inserción
        prev[j - 1] + cost, // sustitución
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ============================================================================
// Union-Find (DSU) — para agrupación transitiva
// ============================================================================

class DSU {
  private parent: Map<string, string> = new Map();
  private rank: Map<string, number> = new Map();
  add(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }
  find(x: string): string {
    let r = x;
    while (this.parent.get(r) !== r) {
      const p = this.parent.get(r)!;
      this.parent.set(r, this.parent.get(p)!); // path compression
      r = this.parent.get(r)!;
    }
    return r;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra) ?? 0;
    const rankB = this.rank.get(rb) ?? 0;
    if (rankA < rankB) this.parent.set(ra, rb);
    else if (rankA > rankB) this.parent.set(rb, ra);
    else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }
}

// ============================================================================
// API pública
// ============================================================================

export type Dupla<T> = {
  a: T;
  b: T;
  /** 1.0 = idénticos; <1 = similitud. Útil para ordenar y mostrar. */
  similitud: number;
  /** Cómo se detectó. Sirve para la UI (mostrar el motivo). */
  motivo: "exacto" | "levenshtein" | "shingle-jaccard";
};

/** Grupo de tareas que la heurística considera la misma. Cada grupo
 *  contiene las tareas originales (con sus subtareas/comentarios, etc.). */
export type GrupoDuplicado<T> = {
  id: string; // estable entre re-renders para keys de React
  tareas: T[];
  /** Mejor señal que las une: ordenadas de más fuerte a más débil. */
  pares: Dupla<T>[];
};

/** Encuentra pares de tareas sospechosas de duplicarse.
 *  Devuelve GRUPOS (componentes conexos via union-find) para que el
 *  usuario pueda gestionar A≈B≈C en una sola acción. */
export function encontrarDuplicadas<
  T extends { id: string; titulo: string; estado: string },
>(
  tareas: T[],
  opts: {
    /** Si se pasa, se ignoran las tareas cuyo `id` esté en este set
     *  (útil para "no proponer duplicar la que acabo de archivar"). */
    excluirIds?: Set<string>;
    /** Devuelve solo grupos con >=2 tareas (true) o también grupos vacíos
     *  sueltos (false, no deberían salir). Por defecto true. */
    soloGrupos?: boolean;
  } = {},
): GrupoDuplicado<T>[] {
  const excluir = opts.excluirIds ?? new Set<string>();
  const soloGrupos = opts.soloGrupos ?? true;

  // Solo tareas activas (no hechas/archivadas). Las duplicadas en archivo
  // suelen ser ruido (el usuario ya las limpió). Si se quieren archivar
  // específicamente, lo cambia fácil el caller.
  const candidatas = tareas.filter(
    (t) =>
      !excluir.has(t.id) &&
      (t.estado === "pendiente" ||
        t.estado === "en_progreso" ||
        t.estado === "bloqueada") &&
      t.titulo.trim().length > 0,
  );

  if (candidatas.length < 2) return [];

  // Pre-normalizamos + shingles.
  const norm = new Map<string, string>(); // id -> titulo normalizado
  const shing = new Map<string, Set<string>>(); // id -> shingles
  for (const t of candidatas) {
    const n = normalizarTitulo(t.titulo);
    norm.set(t.id, n);
    const palabras = n.split(" ").filter(Boolean);
    shing.set(t.id, shingles(palabras));
  }

  const dsu = new DSU();
  candidatas.forEach((t) => dsu.add(t.id));
  const pares: Dupla<T>[] = [];

  for (let i = 0; i < candidatas.length; i++) {
    const a = candidatas[i];
    const na = norm.get(a.id)!;
    const sa = shing.get(a.id)!;
    for (let j = i + 1; j < candidatas.length; j++) {
      const b = candidatas[j];
      const nb = norm.get(b.id)!;
      const sb = shing.get(b.id)!;

      // 1. Exacto normalizado
      if (na === nb) {
        dsu.union(a.id, b.id);
        pares.push({ a, b, similitud: 1, motivo: "exacto" });
        continue;
      }
      // 2. Levenshtein (solo si no son demasiado largos)
      if (na.length <= 80 && nb.length <= 80) {
        const lev = levenshtein(na, nb);
        if (lev <= UMBRAL_LEVENSHTEIN) {
          dsu.union(a.id, b.id);
          pares.push({
            a,
            b,
            similitud: 1 - lev / Math.max(na.length, nb.length, 1),
            motivo: "levenshtein",
          });
          continue;
        }
      }
      // 3. Shingle Jaccard (palabras largas o muy distintas en Levenshtein)
      const jac = jaccard(sa, sb);
      if (jac >= UMBRAL_JACCARD) {
        dsu.union(a.id, b.id);
        pares.push({ a, b, similitud: jac, motivo: "shingle-jaccard" });
      }
    }
  }

  // Agrupamos por raíz. Para cada raíz, recogemos las tareas y los pares
  // internos (pares cuyo a y b viven en el mismo grupo).
  const tareasPorRaiz = new Map<string, T[]>();
  for (const t of candidatas) {
    const r = dsu.find(t.id);
    const arr = tareasPorRaiz.get(r) ?? [];
    arr.push(t);
    tareasPorRaiz.set(r, arr);
  }

  const grupos: GrupoDuplicado<T>[] = [];
  let gid = 0;
  for (const [raiz, ts] of tareasPorRaiz) {
    if (soloGrupos && ts.length < 2) continue;
    const idsEnGrupo = new Set(ts.map((t) => t.id));
    const paresEnGrupo = pares
      .filter((p) => idsEnGrupo.has(p.a.id) && idsEnGrupo.has(p.b.id))
      // Ordenamos por similitud descendente para mostrar el más fuerte arriba.
      .sort((a, b) => b.similitud - a.similitud);
    if (paresEnGrupo.length === 0) continue; // grupo de 1 sin pares (seguridad)
    grupos.push({
      id: `${raiz}-${gid++}`,
      tareas: ts,
      pares: paresEnGrupo,
    });
  }

  // Ordenamos los grupos por la mejor similitud de sus pares (descendente).
  grupos.sort((a, b) => {
    const sa = Math.max(...a.pares.map((p) => p.similitud));
    const sb = Math.max(...b.pares.map((p) => p.similitud));
    return sb - sa;
  });

  return grupos;
}

// ============================================================================
// Helpers de UI (no se usan aquí pero dejan lista la API para el componente)
// ============================================================================

/** Etiqueta humana del motivo de la detección. */
export function motivoLabel(motivo: Dupla<unknown>["motivo"]): string {
  switch (motivo) {
    case "exacto":
      return "idéntico";
    case "levenshtein":
      return "casi idéntico (typo)";
    case "shingle-jaccard":
      return "muy parecido";
  }
}
