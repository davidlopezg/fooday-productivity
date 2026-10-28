// ============================================================================
// Sugerir pagos del próximo mes con IA
// ============================================================================
// Recibe la lista de pagos activos (pendiente / programado / vencido /
// pagado_parcial) + el prompt editable del usuario desde /configuracion +
// el contexto temporal (hoy, próximos 6 lunes) y devuelve una lista de
// sugerencias: para cada pago, una fecha_pago_programada propuesta (que
// SIEMPRE será lunes, el día que David trabaja los pagos) y un motivo
// corto.
//
// Sigue el patrón de motorPriorizacion.ts:
//   - Llamada directa cliente → proveedor (mismo baseUrl/apiKey/model
//     del store de configuración).
//   - Pide JSON estricto y sanea la salida.
//   - Timeout adaptativo (mismo helper que el resto de la app).
//
// La IA NUNCA escribe en la BD. Sugiere; el usuario revisa y decide qué
// aplicar en el modal (patrón idéntico a SugerirWigsModal).
// ============================================================================

import { calcularTimeoutIA, mensajeTimeoutIA } from "@/lib/ai-timeout";
import { bloquePerfil, type PerfilIA } from "@/lib/perfilIA";
import type { PagoConUrgencia } from "@/lib/pagos/types";

// ============================================================================
// Tipos públicos
// ============================================================================

export type SugerirPagosOpts = {
  /** Pagos activos sobre los que decidir. El caller ya los filtra por
   *  estado (normalmente: pendiente, programado, vencido, pagado_parcial). */
  pagos: PagoConUrgencia[];
  /** Prompt editable del usuario (definido en /configuracion, columna
   *  `prompt_pagos` de la tabla `configuracion`). Si está vacío, usamos
   *  el DEFAULT_PROMPT_PAGOS de configStore. */
  promptUsuario: string | null;
  /** Fecha YYYY-MM-DD (local del usuario). */
  fecha: string;
  /** Día de la semana en español (ej: "lunes"). */
  diaSemana: string;
  /** Lista de los próximos 6 lunes como YYYY-MM-DD. Lo calcula el caller
   *  con la misma helper que /pagos usa para `proximoLunesISO`. */
  proximosLunes: string[];
  /** Perfil del usuario (migration 0032). Si se omite, DEFAULT_PERFIL_IA. */
  perfil?: PerfilIA | null;
};

export type SugerirPagoItem = {
  /** UUID del pago (debe matchear uno de `pagos`). */
  pago_id: string;
  /** Fecha ISO YYYY-MM-DD (siempre será uno de `proximosLunes`). */
  fecha_pago_programada: string;
  /** Importe a pagar. null = el total pendiente
   *  (importe_total - importe_pagado). Un número = pago parcial. */
  importe_a_pagar: number | null;
  /** 1 frase corta explicando por qué este pago este lunes. */
  motivo: string;
};

export type SugerirPagosResultado = {
  sugerencias: SugerirPagoItem[];
  /** Prompt completo que se envió a la IA (útil para depurar / mostrar
   *  al usuario qué se le ha pedido al modelo). */
  prompt_usado: string;
};

// ============================================================================
// Llamada LLM (mismo patrón que motorPriorizacion.ts)
// ============================================================================

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

async function llamarLLM<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  userPrompt: string,
): Promise<T> {
  const knownJsonFormat = /openai|minimax|groq|deepseek|together|anthropic/i.test(baseUrl);
  const body: Record<string, unknown> = {
    model: model || "Minimax-M3",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente financiero que responde SOLO con JSON válido, sin texto fuera, sin markdown, sin encabezados.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  };
  if (knownJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  const promptLen = userPrompt?.length ?? 0;
  const timeoutMs = calcularTimeoutIA(promptLen);

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

    try {
      return JSON.parse(content);
    } catch {
      const first = extractFirstJSON(content);
      return JSON.parse(saneadorComun(first));
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      const cause = (e as Error & { cause?: unknown }).cause;
      if (cause instanceof Error && cause.message) {
        throw cause;
      }
      throw new Error(
        "La petición a la IA fue cancelada (navegación o regeneración). Reintenta.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractFirstJSON(content: string): string {
  const s = content.trim();
  const start = s.indexOf("{");
  if (start < 0) throw new Error("No se encontró '{' en la respuesta.");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error("No se encontró el cierre del JSON.");
}

function saneadorComun(s: string): string {
  return s
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*undefined\b/g, ": null")
    .replace(/:\s*NaN\b/g, ": null")
    .replace(/'([^'\n]+?)'\s*:/g, '"$1":')
    .replace(/:\s*'([^'\n]*?)'/g, ': "$1"');
}

// ============================================================================
// Prompt
// ============================================================================

/** Prompt por defecto — el que se muestra si el usuario todavía no ha
 *  personalizado `prompt_pagos` en /configuracion. Se exporta para que
 *  la UI pueda ofrecer "Restaurar ejemplo por defecto". */
export const DEFAULT_PROMPT_PAGOS = `Eres el asistente financiero del usuario. Tu trabajo es mirar sus pagos activos y proponer cuáles transferir esta semana y cuáles programar para las siguientes.

CONTEXTO DEL NEGOCIO:
- Factura el viernes y sábado por la noche.
- Los ingresos llegan al banco el sábado y el domingo.
- El lunes es el día natural para hacer pagos porque la caja está fresca.
- Si la fecha de vencimiento cae en festivo o fin de semana, anticipa al lunes anterior.

REGLAS DE PRIORIDAD:
1. Primero las deudas más pequeñas (snowball). Empieza por la más barata que esté pendiente para cancelarla y liberar lastre mental cuanto antes.
2. Intenta pagar un poco más del mínimo en todas las que recomiendes — no dejes ninguna a 0 € salvo que no haya caja.
3. Si un pago tiene fecha_vencimiento esta semana, tiene prioridad absoluta.
4. Si vence el día 15 del mes, programa la transferencia el lunes anterior (o el lunes del propio día 15 si cae en lunes).
5. Agrupa pagos del mismo proveedor si los hay, en un único movimiento.
6. NUNCA propongas más pagos de los que la caja razonable permita: es preferible 2 hechos que 5 a medias.

SALIDA — JSON estricto con un item por pago que recomiendas Mover de fecha:
{
  "sugerencias": [
    {
      "pago_id": "<uuid exacto de la lista de pagos>",
      "fecha_pago_programada": "<YYYY-MM-DD — debe ser uno de los próximos lunes que te paso>",
      "importe_a_pagar": <número o null si recomiendas pagar el total restante>,
      "motivo": "<1 frase corta explicando por qué este lunes>"
    }
  ]
}

Si no hay nada que mover (todo ya está bien programado), devuelve { "sugerencias": [] }.`;

function buildPrompt(opts: SugerirPagosOpts): string {
  const { pagos, fecha, diaSemana, proximosLunes, promptUsuario } = opts;

  // Cap defensivo: si David tiene 80+ pagos, no abrumamos al prompt.
  // Ordenamos por urgencia calculada (vencidos primero, después por días).
  const pagosOrdenados = pagos
    .slice()
    .sort((a, b) => (b.urgencia_calculada ?? 0) - (a.urgencia_calculada ?? 0))
    .slice(0, 60);

  const listaPagos = pagosOrdenados.length
    ? pagosOrdenados
        .map((p, i) => {
          const pendiente = p.importe_total - p.importe_pagado;
          return `${i + 1}. [id=${p.id}] [prov="${p.proveedor}" — "${p.concepto}"] [cat=${p.categoria}] [prio=${p.prioridad}] [estado=${p.estado_efectivo}] [vence=${p.fecha_vencimiento} — ${p.dias_hasta_vencer}d] [total=${p.importe_total.toFixed(2)}€ ya_pagado=${p.importe_pagado.toFixed(2)}€ pendiente=${pendiente.toFixed(2)}€] [programada=${p.fecha_pago_programada ?? "—"}] [método=${p.metodo_pago}]`;
        })
        .join("\n")
    : "(sin pagos activos)";

  const lunesTxt =
    proximosLunes.length > 0
      ? proximosLunes.map((l, i) => `  · lunes +${i + 1}: ${l}`).join("\n")
      : "  (no hay próximos lunes calculados)";

  const promptBase = (promptUsuario ?? "").trim() || DEFAULT_PROMPT_PAGOS;
  // Si el usuario NO tiene prompt propio, le anteponemos su perfil para que
  // la IA sepa a qué se refiere (negocio, restricciones). Si trae prompt
  // propio, se respeta tal cual y no se le inyecta nada.
  const promptFinal = (promptUsuario ?? "").trim()
    ? promptBase
    : `${bloquePerfil(opts.perfil)}\n\n${promptBase}`.trim();

  return `${promptFinal}

============================================================
CONTEXTO TEMPORAL
============================================================
Fecha actual: ${fecha} (${diaSemana})

Próximos lunes disponibles para programar (USA SOLO ESTAS FECHAS, en formato YYYY-MM-DD):
${lunesTxt}

============================================================
PAGOS ACTIVOS (${pagosOrdenados.length}) — ordenados por urgencia
============================================================
${listaPagos}

============================================================
FORMATO DE SALIDA — JSON ESTRICTO
============================================================
Devuelve SOLO este JSON, sin texto fuera, sin markdown, sin encabezados.

{
  "sugerencias": [
    {
      "pago_id": "<uuid exacto de un pago de la lista>",
      "fecha_pago_programada": "<YYYY-MM-DD — uno de los próximos lunes>",
      "importe_a_pagar": <número o null>,
      "motivo": "<1 frase corta>"
    }
  ]
}`;
}

// ============================================================================
// Saneamiento y validación de la respuesta
// ============================================================================

function validarFecha(fecha: string, lunesValidos: Set<string>): string | null {
  // Acepta solo YYYY-MM-DD que esté en la lista de próximos lunes.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return lunesValidos.has(fecha) ? fecha : null;
}

export function sanearSugerenciasPagos(
  raw: unknown,
  pagosCandidatos: PagoConUrgencia[],
  lunesValidos: string[],
): SugerirPagosResultado {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sugerenciasRaw = Array.isArray(r.sugerencias) ? r.sugerencias : [];
  const idsValidos = new Set(pagosCandidatos.map((p) => p.id));
  const lunesSet = new Set(lunesValidos);

  const sugerencias: SugerirPagoItem[] = [];
  const rechazadas: string[] = [];

  for (const item of sugerenciasRaw) {
    const it = (item ?? {}) as Record<string, unknown>;
    const pagoId = String(it.pago_id ?? "").trim();
    if (!idsValidos.has(pagoId)) {
      rechazadas.push(pagoId || "(sin id)");
      continue;
    }
    const fechaRaw = String(it.fecha_pago_programada ?? "").trim();
    const fechaOk = validarFecha(fechaRaw, lunesSet);
    if (!fechaOk) {
      rechazadas.push(`${pagoId} (fecha inválida: ${fechaRaw})`);
      continue;
    }

    // importe_a_pagar: número positivo o null.
    let importe: number | null = null;
    if (it.importe_a_pagar != null) {
      const n = Number(it.importe_a_pagar);
      if (Number.isFinite(n) && n > 0) {
        // No dejamos que proponga más que el pendiente (la BD lo rechaza).
        const pago = pagosCandidatos.find((p) => p.id === pagoId);
        const pendiente = pago ? pago.importe_total - pago.importe_pagado : n;
        importe = Math.min(n, pendiente);
        // Redondeo a 2 decimales para evitar floats.
        importe = Math.round(importe * 100) / 100;
      }
    }

    const motivo = String(it.motivo ?? "").trim().slice(0, 240) || "Sin motivo especificado.";

    sugerencias.push({
      pago_id: pagoId,
      fecha_pago_programada: fechaOk,
      importe_a_pagar: importe,
      motivo,
    });
  }

  if (typeof window !== "undefined" && rechazadas.length > 0) {
    console.warn(
      "[sugerirPagos] La IA devolvió sugerencias no válidas que se descartaron:",
      rechazadas,
    );
  }

  return {
    sugerencias,
    prompt_usado: "", // se rellena en el caller con el prompt real
  };
}

// ============================================================================
// API pública
// ============================================================================

export async function sugerirPagosIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirPagosOpts,
): Promise<SugerirPagosResultado> {
  const prompt = buildPrompt(opts);
  const parsed = await llamarLLM<unknown>(baseUrl, apiKey, model, prompt);
  const saneado = sanearSugerenciasPagos(parsed, opts.pagos, opts.proximosLunes);
  return { ...saneado, prompt_usado: prompt };
}