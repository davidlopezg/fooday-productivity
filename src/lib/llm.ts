// ============================================================================
// llm.ts — helper compartido para llamar al LLM (patrón único).
// ----------------------------------------------------------------------------
// Existían 4 copias casi idénticas del bloque fetch → parse (plan.ts,
// planSimple.ts, motorPriorizacion.ts, sugerirMatrizIA.ts, sugerirPagosIA.ts).
// Este módulo NO las refactoriza (fuera de alcance, riesgo de regresión):
// solo ofrece el camino nuevo para que el código que viene ya no nazca
// con una 5ª copia.
//
// Devuelve el CONTENIDO crudo (string). El parseo/validación es del caller
// (usa `parsearYValidar` de src/lib/llm-parser.ts).
// ============================================================================

import { calcularTimeoutIA, mensajeTimeoutIA } from "@/lib/ai-timeout";

/** Modelos "OpenAI-compatible" → podemos pedir `response_format: json_object`. */
function soportaJsonFormat(baseUrl: string): boolean {
  return /openai|minimax|groq|deepseek|together|anthropic/i.test(baseUrl);
}

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

export type LlamadaLLMOpts = {
  /** 0 = determinista. Subimos a 0.4-0.7 cuando queremos diversidad. */
  temperature?: number;
  /** Timeout explícito (ms). Si no, se calcula por tamaño del prompt. */
  timeoutMs?: number;
};

/**
 * Llama al chat completions y devuelve el contenido del primer mensaje.
 * Lanza Error con el status y un trozo de la respuesta si la API falla.
 */
export async function llamarLLM(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  opts: LlamadaLLMOpts = {},
): Promise<string> {
  const body: Record<string, unknown> = {
    model: model || "Minimax-M3",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: opts.temperature ?? 0.4,
  };
  if (soportaJsonFormat(baseUrl)) {
    body.response_format = { type: "json_object" };
  }

  const promptLen = (system?.length ?? 0) + (user?.length ?? 0);
  const timeoutMs = opts.timeoutMs ?? calcularTimeoutIA(promptLen);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(mensajeTimeoutIA(promptLen))),
    timeoutMs,
  );

  try {
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("La IA devolvió una respuesta vacía.");
    return content;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      const cause = (e as Error & { cause?: unknown }).cause;
      if (cause instanceof Error && cause.message) throw cause;
      throw new Error(
        "La petición a la IA fue cancelada (navegación o regeneración). Reintenta.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
