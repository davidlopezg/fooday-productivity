"use client";

// ============================================================================
// agente/chatIA.ts — la llamada al LLM del chat global.
//
// POR QUÉ UN SOLO JSON Y NO UN `refs` ESTRUCTURADO
//   El modelo tiene que responder Y, opcionalmente, señalar qué entidades
//   menciona. Pedirle las dos cosas en un JSON anidado es una fuente
//   clásica de respuestas malformadas (y de ids inventados). En vez de eso:
//   · el modelo responde en texto plano y, cuando menciona una entidad
//     concreta, escribe su id entre corchetes (lo tiene en el snapshot);
//   · aquí extraemos esos ids con una regex, los validamos contra el
//     catálogo real y los convertimos en chips con enlace.
//   Resultado: el modelo hace un trabajo (contar la verdad) y el código
//   hace el trabajo mecánico (enlazar).
//
// DEGRADACIÓN
//   `llamarLLM` fuerza `response_format: json_object` en endpoints
//   OpenAI-compatible. Si el modelo no devuelve JSON válido, usamos el
//   texto crudo tal cual (no se pierde la respuesta).
// ============================================================================

import { llamarLLM } from "@/lib/llm";
import { parsearYValidar } from "@/lib/llm-parser";
import { bloquePerfil } from "@/lib/perfilIA";
import type { PerfilIA } from "@/lib/perfilIA";
// El manual se importa ESTÁTICO a propósito (ver `systemPrompt`): con
// `import()` diferido, el chunk hay que descargarlo por la red en el
// primer mensaje, y si esa descarga falla (móvil con mala conexión) el
// chat peta con un "Failed to fetch" sin llegar a llamar a la IA.
import { manualMetodo } from "@/lib/agente/manual";
import type { RefEntidad } from "@/lib/agente/chatStore";
import type { EntidadSnapshot } from "@/lib/agente/contexto";

export type ConfigIA = {
  base_url: string;
  minimax_api_key: string;
  model: string;
};

export type Turno = { rol: "user" | "assistant"; contenido: string };

export type ResultadoChat = {
  /** Texto de la respuesta (sin los marcadores [id]). */
  respuesta: string;
  /** Entidades citadas, ya validadas contra el catálogo. */
  refs: RefEntidad[];
};

const SYSTEM_PROMPT_BASE = `Eres el agente de productividad del usuario. Tienes acceso a dos cosas:
  1) el SNAPSHOT: el estado REAL de su sistema (metas, KRs, proyectos, tareas, plan de hoy, foco semanal).
  2) el MANUAL DEL MÉTODO: la base filosófica y operativa de la app (5 pilares, glosario, rituales, arquitectura WIG/GTD/Próxima Acción, índice de pantallas).

REGLAS
1. Responde SIEMPRE en español y en 2ª persona ("tienes", "puedes").
2. Los hechos concretos SOLO pueden salir del SNAPSHOT. Si un dato no está ahí, dilo explícitamente ("no tengo eso registrado en el sistema") en vez de inventarlo.
3. Aplica el MANUAL: cuando recomiendes algo, hazlo con el criterio de la app (orden de selección del criterio de selección, cap de 3 WIGs, el KR de la semana, los rituales, los anti-patrones) y NO con el criterio genérico de la IA. Si la pregunta es "¿qué hago hoy?", la respuesta sigue el ritual diario y el criterio de selección, con los datos del SNAPSHOT.
4. Cita la regla que aplicas cuando aporta ("esto es el Pilar 2, KR de la semana", "criterio de selección nº1: riesgo financiero"). No lo hagas en cada frase: solo cuando la regla sea la clave de la respuesta.
5. Si te preguntan cómo funciona la app (qué es un WIG, qué es el KR de la semana, qué se hace el lunes, dónde se ve X), responde con el MANUAL y con el índice de pantallas (indica la ruta).
6. Sé directo y útil. Por defecto, máximo ~120 palabras. Si piden detalle o un plan, da steps concretos y accionables.
7. Cuando menciones una entidad concreta (una meta, un KR, un proyecto o una tarea), escribe su id completo entre corchetes justo detrás: Facturar 20k/mes [8f3c2a1b-...]. NO inventes ids: usa solo los que aparecen en el SNAPSHOT.
8. Si la pregunta es ambigua, responde con lo más útil que puedas deducir del snapshot y aclara al final qué información adicional te daría una respuesta exacta.
9. No des órdenes de la app ni prometas acciones: solo consultas y propones.`;

/**
 * System prompt completo: las reglas + el manual del método.
 *
 * El manual son ~36 KB de texto. Va SIEMPRE en el system prompt (es el
 * conocimiento que el agente necesita para no recomendar con el criterio
 * genérico de la IA) y se cachea en memoria: se calcula una vez por
 * sesión, no en cada mensaje.
 */
let systemPromptCache: string | null = null;
export function systemPrompt(): string {
  if (systemPromptCache === null) {
    systemPromptCache = `${SYSTEM_PROMPT_BASE}\n\n${manualMetodo()}`;
  }
  return systemPromptCache;
}

const ESQUEMA_RESPUESTA = {
  type: "object" as const,
  fields: {
    respuesta: { type: "string" as const },
  },
};

/** Regex de un uuid (version 4 con guiones) entre corchetes. */
const RE_UUID = /\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/gi;

/**
 * Construye el prompt del usuario: snapshot + historial + pregunta.
 * Se exporta para poder depurar (ver el botón "ver prompt" del chat).
 */
export function construirPrompt(opts: {
  snapshot: string;
  historial: Turno[];
  pregunta: string;
  perfil?: PerfilIA | null;
}): string {
  const partes: string[] = [];

  const perfil = bloquePerfil(opts.perfil);
  if (perfil) partes.push(perfil + "\n");

  partes.push("SNAPSHOT DEL SISTEMA:\n" + opts.snapshot);

  if (opts.historial.length > 0) {
    partes.push(
      "HISTORIAL:\n" +
        opts.historial
          .slice(-10)
          .map((t) => `${t.rol === "user" ? "Usuario" : "Agente"}: ${t.contenido}`)
          .join("\n"),
    );
  }

  partes.push(
    "Responde a esta pregunta usando el SNAPSHOT. Devuelve un JSON con la clave \"respuesta\" (texto plano, con los ids entre corchetes cuando menciones una entidad):\n\n" +
      opts.pregunta,
  );

  return partes.join("\n\n");
}

/**
 * Llama al LLM y devuelve la respuesta con sus referencias.
 */
export async function responderAgente(
  cfg: ConfigIA,
  opts: {
    snapshot: string;
    catalogo: EntidadSnapshot[];
    historial: Turno[];
    pregunta: string;
    perfil?: PerfilIA | null;
  },
): Promise<ResultadoChat> {
  const prompt = construirPrompt({
    snapshot: opts.snapshot,
    historial: opts.historial,
    pregunta: opts.pregunta,
    perfil: opts.perfil,
  });

  const crudo = await llamarLLM(
    cfg.base_url,
    cfg.minimax_api_key,
    cfg.model,
    systemPrompt(),
    prompt,
    { temperature: 0.3 },
  );

  // El modelo debe devolver {"respuesta": "..."}. Si no es JSON válido,
  // nos quedamos con el texto crudo (nunca se pierde la respuesta).
  let texto: string;
  try {
    const obj = parsearYValidar<{ respuesta: string }>(crudo, ESQUEMA_RESPUESTA);
    texto = obj.respuesta;
  } catch (e) {
    console.warn("[agente/chatIA] respuesta no-JSON, se usa el texto crudo:", e);
    texto = crudo;
  }

  return extraerRefs(texto, opts.catalogo);
}

/**
 * Quita los marcadores [uuid] del texto y devuelve las referencias
 * correspondientes (solo las que existen de verdad en el catálogo).
 */
export function extraerRefs(
  texto: string,
  catalogo: EntidadSnapshot[],
): ResultadoChat {
  const porId = new Map<string, EntidadSnapshot>();
  for (const e of catalogo) porId.set(e.id, e);

  const refs: RefEntidad[] = [];
  const vistos = new Set<string>();

  const limpio = texto.replace(RE_UUID, (match, id: string) => {
    const entidad = porId.get(id.toLowerCase());
    if (!entidad) return match; // id desconocido: se deja el texto tal cual
    const clave = `${entidad.tipo}:${entidad.id}`;
    if (!vistos.has(clave)) {
      vistos.add(clave);
      refs.push({
        tipo: entidad.tipo,
        id: entidad.id,
        etiqueta: entidad.etiqueta,
        meta_id: entidad.meta_id ?? null,
      });
    }
    return "";
  });

  return { respuesta: limpio.trim(), refs };
}
