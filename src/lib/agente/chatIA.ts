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

import { llamarLLMStream } from "@/lib/llm";
import { parsearYValidar } from "@/lib/llm-parser";
import { bloquePerfil } from "@/lib/perfilIA";
import type { PerfilIA } from "@/lib/perfilIA";
// El manual se importa ESTÁTICO a propósito (ver `systemPrompt`): con
// `import()` diferido, el chunk hay que descargarlo por la red en el
// primer mensaje, y si esa descarga falla (móvil con mala conexión) el
// chat peta con un "Failed to fetch" sin llegar a llamar a la IA.
import { esPreguntaDeMetodo, manualCompacto, manualMetodo } from "@/lib/agente/manual";
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
  /** Milisegundos que tardó la llamada a la IA (para diagnóstico y UI). */
  ms: number;
  /** Qué manual se mandó (completo = pregunta de método). */
  nivelManual: "completo" | "compacto";
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
/**
 * System prompt completo: las reglas + el manual del método.
 *
 * El manual va SIEMPRE (es el conocimiento que el agente necesita para no
 * recomendar con el criterio genérico de la IA), pero en dos niveles:
 *   · preguntas de MÉTODO → manual completo (~36 KB),
 *   · preguntas de DATOS → manual compacto (~13 KB).
 * Mandar los 36 KB en cada mensaje convertía el chat en una llamada de
 * ~15k tokens (y la IA tarda: es un modelo de razonamiento).
 */
export function systemPrompt(nivel: "completo" | "compacto"): string {
  const base = nivel === "completo" ? manualMetodo() : manualCompacto();
  return `${SYSTEM_PROMPT_BASE}\n\n${base}`;
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
    /** Se llama con el texto de la respuesta mientras llega (streaming). */
    onToken?: (texto: string) => void;
  },
): Promise<ResultadoChat> {
  const prompt = construirPrompt({
    snapshot: opts.snapshot,
    historial: opts.historial,
    pregunta: opts.pregunta,
    perfil: opts.perfil,
  });

  const nivel = esPreguntaDeMetodo(opts.pregunta) ? "completo" : "compacto";
  const t0 = Date.now();
  // Streaming: el texto llega a trozos y se muestra al momento. La IA es
  // lenta (es un modelo de razonamiento) y sin esto el usuario solo ve un
  // spinner durante medio minuto.
  const extractor = extractorDeRespuesta();
  const crudo = await llamarLLMStream(
    cfg.base_url,
    cfg.minimax_api_key,
    cfg.model,
    systemPrompt(nivel),
    prompt,
    {
      temperature: 0.3,
      onToken: (fragmento) => {
        opts.onToken?.(extractor.push(fragmento));
      },
    },
  );
  const ms = Date.now() - t0;
  console.info(
    `[agente/chatIA] ${ms}ms · manual:${nivel} · prompt:${systemPrompt(nivel).length + prompt.length} chars`,
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

  return { ...extraerRefs(texto, opts.catalogo), ms, nivelManual: nivel };
}

/**
 * Extrae el valor de la clave "respuesta" de un JSON que llega A TROZOS
 * (streaming). El modelo devuelve {"respuesta": "..."} y en streaming
 * llegan pedazos: hay que ir sacando el texto interior para poderlo
 * pintar mientras se genera.
 *
 * Devuelve el texto interior acumulado hasta ahora.
 */
export function extractorDeRespuesta() {
  let buf = "";
  let out = "";
  let i = 0;
  let enClave = false;
  let terminado = false;

  return {
    push(fragmento: string): string {
      if (terminado) return out;
      buf += fragmento;

      if (!enClave) {
        const m = /"respuesta"\s*:\s*"/.exec(buf);
        if (!m) return out;
        i = m.index + m[0].length;
        enClave = true;
      }

      while (i < buf.length) {
        const ch = buf[i];
        if (ch === "\\") {
          const nxt = buf[i + 1];
          if (nxt === undefined) break; // escape partido: esperamos más
          if (nxt === "u") {
            if (buf.length < i + 6) break; // \uXXXX incompleto
            out += String.fromCharCode(parseInt(buf.slice(i + 2, i + 6), 16));
            i += 6;
            continue;
          }
          out +=
            nxt === "n" ? "\n"
            : nxt === "t" ? "\t"
            : nxt === "r" ? "\r"
            : nxt === "b" ? "\b"
            : nxt === "f" ? "\f"
            : nxt;
          i += 2;
          continue;
        }
        if (ch === '"') {
          terminado = true;
          break;
        }
        out += ch;
        i++;
      }
      return out;
    },
    get texto(): string {
      return out;
    },
  };
}

/**
 * Quita los marcadores [uuid] del texto y devuelve las referencias
 * correspondientes (solo las que existen de verdad en el catálogo).
 */
export function extraerRefs(
  texto: string,
  catalogo: EntidadSnapshot[],
): { respuesta: string; refs: RefEntidad[] } {
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
