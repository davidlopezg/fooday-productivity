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
  const body = construirBody(baseUrl, model, system, user, opts);
  const { res, cancelar } = await ejecutarLlamada(
    body,
    endpoint(baseUrl),
    apiKey,
    opts,
    promptLen(system, user),
  );
  try {
    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("La IA devolvió una respuesta vacía.");
    return content;
  } finally {
    cancelar();
  }
}

/** Cuerpo de la petición (compartido por la llamada normal y la stream). */
function construirBody(
  baseUrl: string,
  model: string,
  system: string,
  user: string,
  opts: LlamadaLLMOpts,
): Record<string, unknown> {
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
  return body;
}

/** Longitud del prompt (para calcular el timeout). */
function promptLen(system: string, user: string): number {
  return (system?.length ?? 0) + (user?.length ?? 0);
}

/** Fetch + timeout + errores (compartido).
 *
 *  Devuelve la respuesta y un `cancelar()` que hay que llamar cuando se
 *  haya terminado de leer el cuerpo. En streaming el timeout debe seguir
 *  vivo durante la lectura (si no, un stream colgado se queda colgado
 *  para siempre), así que NO se limpia dentro de la función. */
async function ejecutarLlamada(
  body: Record<string, unknown>,
  url: string,
  apiKey: string,
  opts: LlamadaLLMOpts,
  len: number,
): Promise<{ res: Response; cancelar: () => void }> {
  const timeoutMs = opts.timeoutMs ?? calcularTimeoutIA(len);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(mensajeTimeoutIA(len))),
    timeoutMs,
  );
  const cancelar = () => clearTimeout(timeoutId);

  try {
    const res = await fetch(url, {
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
      cancelar();
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }
    return { res, cancelar };
  } catch (e) {
    cancelar();
    if (e instanceof Error && e.name === "AbortError") {
      const cause = (e as Error & { cause?: unknown }).cause;
      if (cause instanceof Error && cause.message) throw cause;
      throw new Error(
        "La petición a la IA fue cancelada (navegación o regeneración). Reintenta.",
      );
    }
    throw e;
  }
}

// ============================================================================
// Streaming
// ============================================================================
// Por qué: con el prompt grande del chat, la IA tarda (es un modelo de
// razonamiento). Sin streaming, el usuario mira un spinner y no ve nada
// hasta que llega la respuesta entera. Con streaming, el texto APARECE
// poco a poco: la espera se convierte en lectura.
//
// Compatible con cualquier endpoint OpenAI-compatible: si el servidor
// ignora `stream: true` y devuelve un JSON normal, se detecta por el
// content-type y se usa tal cual (mismo resultado, sin stream).

export type LlamadaLLMStreamOpts = LlamadaLLMOpts & {
  /**
   * Se llama con CADA fragmento nuevo de texto (no acumulado). El que
   * quiera el acumulado lo lleva él (o usa `acumulado`).
   */
  onToken?: (fragmento: string) => void;
  /** Se llama con el razonamiento del modelo, si lo expone. */
  onThinking?: (texto: string) => void;
};

/**
 * Llama al chat completions en streaming y devuelve el contenido completo.
 * Si el servidor no soporta streaming, cae al formato normal.
 */
export async function llamarLLMStream(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  opts: LlamadaLLMStreamOpts = {},
): Promise<string> {
  const body = construirBody(baseUrl, model, system, user, opts);
  body.stream = true;
  // `stream_options` no es universal (MiniMax puede ignorarlo o rechazarlo),
  // así que NO lo mandamos: el usage no lo necesitamos.

  const { res, cancelar } = await ejecutarLlamada(
    body,
    endpoint(baseUrl),
    apiKey,
    opts,
    promptLen(system, user),
  );

  try {
    const tipo = res.headers.get("content-type") || "";
    if (!tipo.includes("text/event-stream")) {
      // El servidor no streamea: respuesta JSON normal.
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("La IA devolvió una respuesta vacía.");
      opts.onToken?.(content);
      return content;
    }

    const lector = res.body?.getReader();
    if (!lector) throw new Error("El navegador no permite leer el stream.");

    const decodificador = new TextDecoder();
    let buffer = "";
    let acumulado = "";
    let pensar = "";

    const procesarLinea = (linea: string) => {
      const l = linea.trim();
      if (!l.startsWith("data:")) return;
      const datos = l.slice(5).trim();
      if (!datos || datos === "[DONE]") return;
      let obj: {
        choices?: Array<{
          delta?: { content?: string; reasoning_content?: string };
        }>;
      };
      try {
        obj = JSON.parse(datos);
      } catch {
        return; // fragmento incompleto o formato raro: se ignora
      }
      const delta = obj.choices?.[0]?.delta;
      const razonamiento = delta?.reasoning_content;
      if (razonamiento) {
        pensar += razonamiento;
        opts.onThinking?.(pensar);
      }
      const contenido = delta?.content;
      if (contenido) {
        acumulado += contenido;
        opts.onToken?.(contenido);
      }
    };

    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });
      // Los eventos SSE vienen separados por \n\n; cada línea `data: ...`
      // se procesa por separado.
      let corte = buffer.indexOf("\n");
      while (corte !== -1) {
        const linea = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 1);
        procesarLinea(linea);
        corte = buffer.indexOf("\n");
      }
    }
    if (buffer.trim()) procesarLinea(buffer);

    if (!acumulado) throw new Error("La IA devolvió una respuesta vacía.");
    return acumulado;
  } finally {
    cancelar();
  }
}
