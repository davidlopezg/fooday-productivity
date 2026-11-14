// ============================================================================
// agente/manual.ts — el MÉTODO de la app en texto plano, para el prompt.
//
// QUÉ ES
//   Traduce `src/lib/metodologia/conocimiento.ts` (los 5 pilares, el
//   glosario, los rituales, la arquitectura WIG/GTD y el índice de
//   pantallas) a un MANUAL en texto que se mete en el system prompt del
//   chat.
//
// POR QUÉ ESTO Y NO UN `.md` SUELTO
//   El contenido sale de los MISMOS datos que pintan /docs y /metodologia.
//   Así el agente no puede advicear con un método distinto del que
//   documenta la app: si mañana cambias un pilar, el manual cambia solo.
//
// DOS NIVELES (por qué, y esto es lo importante)
//   El manual completo son ~36 KB. Mandarlo en CADA mensaje convertía el
//   chat en una llamada de ~15k tokens: la IA tarda (es un modelo de
//   razonamiento) y el usuario se queda mirando el spinner.
//
//   · NIVEL COMPLETO (36 KB): el manual entero. Se usa cuando la pregunta
//     es sobre el MÉTODO ("¿qué es el KR de la semana?", "¿por qué solo
//     3 WIGs?"). Son preguntas raras.
//   · NIVEL COMPACTO (~13 KB): el mismo método resumido (reglas operativas
//     + rituales + el orden de selección + el índice de pantallas). Se usa
//     en el resto de preguntas, que son de DATOS.
//
//   Ambos se construyen desde los mismos datos: el compacto recorta los
//   cuerpos de los puntos, no los inventa. La detección de "pregunta de
//   método" es una heurística de palabras clave (sin llamada extra a la
//   IA: una llamada más duplicaría la latencia).
// ============================================================================

import {
  ANTIPATRONES,
  CRITERIO_SELECCION,
  FEATURES,
  GLOSARIO,
  GTD_PUNTOS,
  HABITOS_RECURRENTES,
  INBOXES,
  LAG_VS_LEAD,
  NEXT_ACTION_PUNTOS,
  PARA_QUE,
  PENDIENTES_RESPUESTA,
  PILARES,
  PROBLEMA,
  RITUALES,
  WIG_PUNTOS,
  type Punto,
} from "@/lib/metodologia/conocimiento";

/** Recorta un texto a N caracteres con puntos suspensivos. */
function recortar(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** "Título: cuerpo" de una lista de puntos. */
function puntos(lista: Punto[], sangria = "  "): string[] {
  return lista.map(
    (p) => `${sangria}· ${p.titulo}: ${p.cuerpo}`,
  );
}

/** El manual completo, como texto. */
export function construirManual(): string {
  const L: string[] = [];

  L.push(
    "MANUAL DEL MÉTODO DE LA APP (la base sobre la que advises). " +
      "Úsalo para dos cosas: (1) explicar cómo funciona el sistema y sus reglas; " +
      "(2) RECOMENDAR con el criterio de la app, no con el criterio genérico de la IA. " +
      "Cuando una respuesta se base en una regla de aquí, cita la regla " +
      '(p. ej. "esto es el Pilar 2, KR de la semana" o "criterio de selección nº1: riesgo financiero").',
  );
  L.push("");

  // ── 0. El para qué ──
  L.push("=== 0. EL PARA QUÉ (el criterio del usuario) ===");
  L.push(...puntos(PARA_QUE, "  "));
  L.push(
    "  Úsalo para encuadrar: cuando el usuario pregunta por una meta, una " +
      "tarea o un plan, contrasta la respuesta con esto (¿esto construye " +
      "negocios o activos que producen sin su tiempo?).",
  );
  L.push("");

  // ── 1. Los 5 pilares ──
  L.push("=== 1. LOS 5 PILARES (base filosófica) ===");
  for (const p of PILARES) {
    L.push(`PILAR ${p.num} · ${p.emoji} ${p.titulo}`);
    L.push(`  ${p.resumen}`);
    L.push(...puntos(p.puntos, "  "));
    L.push("");
  }

  // ── 2. Glosario ──
  L.push("=== 2. GLOSARIO (las 4 capas: proyecto → meta → KR → tarea) ===");
  for (const g of GLOSARIO) {
    L.push(`· ${g.titulo}: ${g.cuerpo}`);
  }
  L.push("");

  // ── 3. Arquitectura ──
  L.push("=== 3. ARQUITECTURA (WIGs / GTD / Próxima Acción) ===");
  L.push("-- El problema --");
  L.push(...puntos(PROBLEMA, "  "));
  L.push("-- Lag vs Lead (4DX) --");
  for (const r of LAG_VS_LEAD) {
    L.push(`  · ${r.dimension} → LAG: ${r.lag}`);
    L.push(`    ${" ".repeat(r.dimension.length)}  LEAD: ${r.lead}`);
  }
  L.push("-- WIGs (Wildly Important Goals) --");
  L.push(...puntos(WIG_PUNTOS, "  "));
  L.push("-- GTD (repositorio externo) --");
  L.push(...puntos(GTD_PUNTOS, "  "));
  L.push("-- Próxima Acción física --");
  L.push(...puntos(NEXT_ACTION_PUNTOS, "  "));
  L.push("-- Los dos inboxes --");
  for (const ib of INBOXES) {
    L.push(`  · ${ib.nombre} (${ib.ruta}): ${ib.que}`);
    L.push(`    Cuándo: ${ib.cuando} ${ib.rama}`);
  }
  L.push("-- Anti-patrones (lo que NO hay que hacer) --");
  for (const a of ANTIPATRONES) {
    L.push(`  · ${a.titulo}`);
    L.push(`    Por qué: ${a.por_que}`);
    L.push(`    Qué hacer: ${a.que_hacer}`);
  }
  L.push("-- Pendientes de respuesta (lo que NO depende de ti) --");
  L.push(...puntos(PENDIENTES_RESPUESTA, "  "));
  L.push("-- Criterio de selección (qué entra HOY y por qué) --");
  L.push(...puntos(CRITERIO_SELECCION, "  "));
  L.push("");

  // ── 4. Rituales ──
  L.push("=== 4. RITUALES (qué abrir, cuándo y por qué) ===");
  const bloque = (titulo: string, filas: typeof RITUALES.diario) => {
    L.push(`-- ${titulo} --`);
    for (const f of filas) {
      const pantallas = f.pantallas.map((p) => p.texto).join(" + ");
      L.push(`  · ${f.cuando}${pantallas ? ` → ${pantallas}` : ""}: ${f.que}`);
      if (f.nota) L.push(`      nota: ${f.nota}`);
    }
  };
  bloque("DIARIO", RITUALES.diario);
  bloque("SEMANAL", RITUALES.semanal);
  bloque("MENSUAL", RITUALES.mensual);
  L.push("-- Las 3 reglas que no se rompen --");
  HABITOS_RECURRENTES.forEach((h, i) => {
    L.push(`  ${i + 1}. ${h.titulo}: ${h.cuerpo}`);
  });
  L.push("");

  // ── 5. Índice de pantallas ──
  L.push("=== 5. ÍNDICE DE PANTALLAS (qué hace cada ruta) ===");
  for (const f of FEATURES) {
    L.push(`  · ${f.ruta} — ${recortar(f.proposito, 150)}`);
  }

  return L.join("\n");
}

/** El manual, en cache (es estático: se calcula una vez por sesión). */
let cache: string | null = null;
export function manualMetodo(): string {
  if (cache === null) cache = construirManual();
  return cache;
}

// ============================================================================
// NIVEL COMPACTO
// ============================================================================

/** Recorta a N caracteres (para el nivel compacto). */
function resumen(s: string, max = 190): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * El mismo método, resumido: lo que el agente necesita para RECOMENDAR
 * (orden de selección, rituales, caps, capas) sin el texto completo de
 * cada punto.
 */
export function construirManualCompacto(): string {
  const L: string[] = [];
  L.push(
    "MÉTODO DE LA APP (resumen operativo). Son las reglas con las que " +
      "recomiendas: úsalas en vez del criterio genérico de la IA y cita la " +
      "regla que apliques.",
  );
  L.push("");

  L.push("-- PARA QUÉ (el criterio del usuario) --");
  L.push(`  · ${PARA_QUE[0].titulo}: ${PARA_QUE[0].cuerpo}`);
  L.push("    Úsalo para encuadrar: ¿esto construye negocios o activos que producen sin su tiempo?");
  L.push("");

  L.push("-- PILARES (por qué) --");
  for (const p of PILARES) {
    L.push(`  · ${p.num}. ${p.titulo}: ${resumen(p.resumen, 160)}`);
    L.push(`     puntos: ${p.puntos.map((x) => x.titulo).join(" | ")}`);
  }
  L.push("");

  L.push("-- LAS 4 CAPAS (la casa) --");
  for (const g of GLOSARIO) {
    L.push(`  · ${g.titulo}: ${resumen(g.cuerpo, 170)}`);
  }
  L.push("");

  L.push("-- RITUALES (qué abrir, cuándo) --");
  const bloque = (titulo: string, filas: typeof RITUALES.diario) => {
    L.push(`  ${titulo}:`);
    for (const f of filas) {
      const pantallas = f.pantallas.map((p) => p.texto).join(" + ");
      L.push(`    · ${f.cuando}${pantallas ? ` → ${pantallas}` : ""}: ${resumen(f.que, 200)}`);
    }
  };
  bloque("DIARIO", RITUALES.diario);
  bloque("SEMANAL", RITUALES.semanal);
  bloque("MENSUAL", RITUALES.mensual);
  L.push("  Reglas que no se rompen:");
  for (const h of HABITOS_RECURRENTES) {
    L.push(`    · ${h.titulo}: ${resumen(h.cuerpo, 200)}`);
  }
  L.push("");

  L.push("-- ARQUITECTURA (WIGs / GTD / Próxima Acción) --");
  L.push("  · El problema: " + resumen(PROBLEMA[0].cuerpo, 200));
  for (const r of LAG_VS_LEAD.slice(0, 3)) {
    L.push(`  · ${r.dimension} → LAG: ${resumen(r.lag, 120)} | LEAD: ${resumen(r.lead, 120)}`);
  }
  for (const w of WIG_PUNTOS) {
    L.push(`  · ${w.titulo}: ${resumen(w.cuerpo, 200)}`);
  }
  for (const g of GTD_PUNTOS) {
    L.push(`  · ${g.titulo}: ${resumen(g.cuerpo, 200)}`);
  }
  for (const n of NEXT_ACTION_PUNTOS) {
    L.push(`  · ${n.titulo}: ${resumen(n.cuerpo, 200)}`);
  }
  for (const ib of INBOXES) {
    L.push(`  · ${ib.nombre} (${ib.ruta}): ${resumen(ib.que, 150)} ${resumen(ib.cuando, 150)}`);
  }
  for (const a of ANTIPATRONES) {
    L.push(`  · ANTIPATRÓN: ${a.titulo} → ${resumen(a.que_hacer, 180)}`);
  }
  for (const pr of PENDIENTES_RESPUESTA) {
    L.push(`  · ${pr.titulo}: ${resumen(pr.cuerpo, 180)}`);
  }
  L.push("");

  L.push("-- CRITERIO DE SELECCIÓN (qué entra HOY y por qué) --");
  // El PRIMER punto es el orden de decisión completo: es lo que más se
  // usa al recomendar, así que va entero.
  L.push(`  · ${CRITERIO_SELECCION[0].titulo}: ${CRITERIO_SELECCION[0].cuerpo}`);
  for (const c of CRITERIO_SELECCION.slice(1)) {
    L.push(`  · ${c.titulo}: ${resumen(c.cuerpo, 180)}`);
  }
  L.push("");

  L.push("-- ÍNDICE DE PANTALLAS --");
  for (const f of FEATURES) {
    L.push(`  · ${f.ruta} — ${resumen(f.proposito, 70)}`);
  }

  return L.join("\n");
}

let cacheCompacto: string | null = null;
export function manualCompacto(): string {
  if (cacheCompacto === null) cacheCompacto = construirManualCompacto();
  return cacheCompacto;
}

// ============================================================================
// DETECCIÓN: ¿esta pregunta es sobre el MÉTODO?
// ============================================================================

/** Palabras que delatan una pregunta sobre el método / la app. */
const RE_METODO = [
  /pilar/i,
  /ritual/i,
  /metodolog/i,
  /método/i,
  /por qué|porque|para qué sirve|para qué es/i,
  /cómo funciona|como funciona|cómo se usa|como se usa|cómo debo|cómo puedo/i,
  /explica|explícame|explicar|qué significa|significa/i,
  /regla|reglas|criterio|criterios/i,
  /\bwigs?\b|kr de la semana|próxima acción|proxima accion|next action|\bgtd\b/i,
  /zeigarnik|20\/80|time.?blocking|deep work|shutdown|cierre cognitivo/i,
  /inbox|captura\b|bandeja de entrada/i,
  /foco semanal|trimestre|trimestral/i,
  /documenta|doc\b|ayuda|guía|guia/i,
];

/** true si la pregunta pide el MÉTODO (y merece el manual completo). */
export function esPreguntaDeMetodo(pregunta: string): boolean {
  return RE_METODO.some((re) => re.test(pregunta));
}

/** El manual que toca para esta pregunta. */
export function manualPara(pregunta: string): { texto: string; nivel: "completo" | "compacto" } {
  if (esPreguntaDeMetodo(pregunta)) {
    return { texto: manualMetodo(), nivel: "completo" };
  }
  return { texto: manualCompacto(), nivel: "compacto" };
}
