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
// TAMAÑO (importa: va en CADA mensaje)
//   El manual completo son ~40 KB. Se recorta lo que no aporta:
//     · el índice de pantallas va con el propósito recortado (la idea se
//       conserva, los párrafos largos no);
//     · nada más se toca: los pilares y las reglas son el conocimiento
//       que el agente necesita para recomendar con criterio.
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
