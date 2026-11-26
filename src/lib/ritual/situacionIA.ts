// ============================================================================
// situacionIA.ts — "✍️ redactar mi situación con IA" (issue #88).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un borrador de la SITUACIÓN ACTUAL de un proyecto o de una meta, hecho
//   con lo que la app ya sabe medir: tareas hechas/abiertas/bloqueadas,
//   KRs con su valor actual frente al objetivo, y la situación que ya
//   habías escrito.
//
// QUÉ NO HACE
//   No escribe nada en la BD y no inventa datos: devuelve texto para que
//   lo edites. Si no has configurado la clave de IA, no hay botón (el
//   wizard lo oculta). La IA redacta; la persona decide.
// ============================================================================

import { llamarLLM } from "@/lib/llm";

export type TareaMedida = {
  total: number;
  hechas: number;
  abiertas: number;
  bloqueadas: number;
  vencidas: number;
  avance: number;
};

export type KrMedido = {
  titulo: string;
  valor_actual: number | null;
  valor_objetivo: number | null;
  periodo: string | null;
};

export type ContextoSituacion = {
  tipo: "proyecto" | "meta";
  nombre: string;
  descripcion?: string | null;
  situacionActual?: string | null;
  tareas: TareaMedida;
  krs?: KrMedido[];
  /** Días desde el último avance (si se sabe). */
  diasSinAvance?: number | null;
};

/**
 * Limpia lo que devuelve la IA: quita markdown, comillas envolventes,
 * espacios de más y recorta a un tamaño legible.
 */
export function sanearSituacion(texto: string, max = 700): string {
  let t = (texto ?? "").trim();
  // Envoltura en ``` o comillas.
  t = t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "");
  t = t.replace(/^["'“”]([\s\S]*)["'“”]$/, "$1");
  // Markdown de inicio de línea (listas, títulos, negritas).
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/^\s*#{1,6}\s+/gm, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > max) t = t.slice(0, max).trimEnd() + "…";
  return t;
}

function buildPrompt(ctx: ContextoSituacion): string {
  const t = ctx.tareas;
  const krs = (ctx.krs ?? [])
    .map(
      (k) =>
        `  - ${k.titulo}: ${k.valor_actual ?? "?"} de ${k.valor_objetivo ?? "?"}${
          k.periodo ? ` (entrega: ${k.periodo})` : ""
        }`,
    )
    .join("\n");

  return `Redacta la SITUACIÓN ACTUAL de ${ctx.tipo === "proyecto" ? "un proyecto" : "una meta"} para David.

DATOS
=====
Nombre: ${ctx.nombre}
${ctx.descripcion ? `Descripción: ${ctx.descripcion}` : ""}
Tareas: ${t.total} en total · ${t.hechas} hechas · ${t.abiertas} abiertas · ${t.bloqueadas} bloqueadas · ${t.vencidas} vencidas · avance ${t.avance}%
${ctx.diasSinAvance != null ? `Días sin avance: ${ctx.diasSinAvance}` : ""}
${krs ? `Resultados clave:\n${krs || "  (sin KRs)"}` : ""}
Situación que ya había escrito (puedes ampliarla, no la repitas literal):
${ctx.situacionActual ?? "(no había ninguna)"}

CÓMO REDACTAR
=============
- 2 o 3 frases en plano. Como si lo escribiera él, no un informe.
- Di DÓNDE ESTÁ y QUÉ LO FRENA. Concreto: nombres, cifras, plazos.
- Si algo está bloqueado, di por qué. Si va bien, dilo sin inventar.
- NO inventes datos que no estén arriba. NO des consejos. NO uses listas.
- Devuelve SOLO el texto de la situación, sin comillas ni etiquetas.`;
}

/** Pide a la IA un borrador de situación (texto plano, listo para editar). */
export async function redactarSituacionIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  ctx: ContextoSituacion,
): Promise<string> {
  const salida = await llamarLLM(
    baseUrl,
    apiKey,
    model,
    "Escribes resúmenes de estado en español claro y directo. Devuelves SOLO el texto.",
    buildPrompt(ctx),
    { temperature: 0.4 },
  );
  return sanearSituacion(salida);
}
