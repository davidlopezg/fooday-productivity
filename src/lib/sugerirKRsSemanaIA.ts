// ============================================================================
// sugerirKRsSemanaIA.ts — "✨ Sugerir 3 KRs" (foco semanal, migration 0033).
//
// Por qué un módulo aparte y no en iaSugerencias.ts: aquel fichero es
// exclusivamente de SUGERENCIAS DE TAREAS (crear tareas nuevas). Esto es
// otro cosa: elegir 3 KRs YA EXISTENTES que pasan a ser el foco de la
// semana. La IA no crea nada — solo propone y el humano confirma.
//
// La IA NO decide sola: la RPC `toggle_kr_foco_semanal` aplica el cap de 3
// y la regla de contención (el KR debe tener un periodo que cubra la
// semana). Este módulo solo:
//   1. Monta el prompt con el scorecard de cada candidato.
//   2. Valida que la IA devuelve ids que existen en el pool.
//   3. Devuelve las sugerencias con su razón.
//
// Criterio de selección (esto es lo importante):
//   · Los candidatos YA vienen filtrados: son KRs de metas WIG cuyo
//     periodo contiene la semana actual.
//   · La IA ordena por RIESGO REAL: los que van por debajo del ritmo
//     esperado y tienen menos días restantes son los urgentes.
//   · Restricción blanda de cobertura: no más de 2 KRs de la misma meta
//     (para que las 3 metas WIG se muevan), pero si no hay candidatos
//     suficientes, se relaja.
//
// Patrón: mismo que `sugerirWigsIA` en plan.ts (IA sugiere, el humano
// aplica) y mismo cliente HTTP que iaSugerencias.ts.
// ============================================================================

import { parsearYValidar, type FieldSchema } from "./llm-parser";
import { bloquePerfil, type PerfilIA } from "./perfilIA";
import type { KrCandidatoSemana } from "./types";

// ----------------------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------------------

export type KrSugerido = {
  /** id del KR (`resultados_periodo.id`). */
  kr_id: string;
  /** Razón de UNA frase: por qué este KR entra en el foco esta semana. */
  razon: string;
};

export type SugerirKRsSemanaOpts = {
  /** Candidatos: KRs de metas WIG con periodo que cubre la semana. */
  candidatos: KrCandidatoSemana[];
  /** Máximo de KRs a proponer. Por defecto 3 (el cap de la semana). */
  n?: number;
  /** Descripción de la semana ("Semana ISO 23 · 2–8 jun"). */
  contextoSemana?: string;
  /** Perfil del usuario (migration 0032). Si se omite, DEFAULT_PERFIL_IA. */
  perfil?: PerfilIA | null;
};

export type SugerirKRsSemanaResultado = {
  sugerencias: KrSugerido[];
  prompt_usado: string;
};

// ----------------------------------------------------------------------------
// Esquema de validación
// ----------------------------------------------------------------------------

const ESQUEMA_SUGERENCIAS_KRS: FieldSchema = {
  type: "object",
  fields: {
    sugerencias: {
      type: "array",
      items: {
        type: "object",
        fields: {
          kr_id: { type: "string" },
          razon: { type: "string" },
        },
      },
    },
  },
};

// ----------------------------------------------------------------------------
// Cliente HTTP (mismo patrón que iaSugerencias.ts — inline para no
// arrastrar `llamarLLM` de llm.ts, que devuelve string y obligaría a
// castear dos veces).
// ----------------------------------------------------------------------------

async function llamarLLMInline<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const { calcularTimeoutIA, mensajeTimeoutIA } = await import("./ai-timeout");
  const promptLen = (systemPrompt?.length ?? 0) + (userPrompt?.length ?? 0);
  const timeoutMs = calcularTimeoutIA(promptLen);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error(mensajeTimeoutIA(promptLen))),
    timeoutMs,
  );

  try {
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "minimax-M3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("La IA no devolvió contenido.");
    return JSON.parse(content) as T;
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

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------

function buildPrompt(opts: SugerirKRsSemanaOpts): string {
  const n = opts.n ?? 3;

  const candidatos = opts.candidatos
    .map((c) => {
      const periodo = c.periodos[0];
      return `  - [kr_id=${c.kr.id}] ${c.kr.titulo}
    meta=${c.meta.codigo ?? "—"} · ${c.meta.titulo}
    periodo=${periodo?.nombre ?? "—"} (termina ${periodo?.fecha_fin ?? "—"}, quedan ${c.dias_restantes} días)
    progreso=${Math.round(c.progreso * 100)}% | esperado=${Math.round(c.progreso_esperado * 100)}% | diferencia=${c.diferencia > 0 ? "+" : ""}${c.diferencia}pp | estado=${c.estado}
    tareas=${c.tareas.length} (${c.tareas.filter((t) => t.estado === "hecha").length} hechas)`;
    })
    .join("\n");

  return `Eres un coach de productividad que decide el FOCO DE LA SEMANA de David. ${bloquePerfil(opts.perfil)}

CONTEXTO
==========
David tiene 3 metas WIG (las más importantes del ciclo). Cada una tiene KRs
(resultados medibles). Los KRs tienen un TRIMESTRE o MES de entrega (su
compromiso). AHORA NECESITAS ELEGIR 3 KRs: los en los que va a poner horas
ESTA SEMANA${opts.contextoSemana ? ` (${opts.contextoSemana})` : ""}.

ESTOS SON LOS ÚNICOS CANDIDATOS
=================================
Ya están filtrados: son KRs de sus metas WIG cuya fecha de entrega cae
dentro de esta semana o más adelante (nada caducado, nada prematuro).
${candidatos || "(no hay candidatos)"}

CÓMO ELEGIR
==========
- ORDENA POR RIESGO REAL, no por-lo-que-suena-más-importante:
  1. Primero los que van POR DEBAJO DEL RITMO esperado (estado=por_debajo).
  2. Entre ellos, los que tienen MENOS días restantes (el plazo aprieta).
  3. Después, los que están "en_linea" pero tienen muchas tareas sin hacer.
  4. Los "por_encima" son candidatos, pero solo si no hay nada en riesgo.
- COBERTURA: como máximo 2 KRs de la MISMA meta. Si hay 3 metas WIG con
  candidatos, reparte para que las tres se muevan. Si no hay candidatos
  suficientes, relaja la regla antes que inventar.
- Devuelve EXACTAMENTE ${n} sugerencias (o menos si no hay candidatos).
- Cada razón es UNA frase corta y CONCRETA, citando el dato que lo
  justifica (diferencia de ritmo, días restantes, tareas sin hacer).
  Nada de frases vacías como "es importante para sus metas".

Responde SOLO con JSON válido con esta forma EXACTA:
{
  "sugerencias": [
    {
      "kr_id": "id EXACTO de la lista de candidatos arriba",
      "razon": "≤180 chars: una frase con el dato concreto"
    }
  ]
}`;
}

// ----------------------------------------------------------------------------
// Función pública
// ----------------------------------------------------------------------------

export async function sugerirKRsSemanaIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirKRsSemanaOpts,
): Promise<SugerirKRsSemanaResultado> {
  const prompt = buildPrompt(opts);
  const parsed = await parsearYValidar<{ sugerencias?: unknown }>(
    await llamarLLMInline<string>(
      baseUrl,
      apiKey,
      model,
      "Respondes SOLO con JSON válido, sin texto adicional.",
      prompt,
    ),
    ESQUEMA_SUGERENCIAS_KRS,
  );

  // Solo aceptamos ids que existen en el pool de candidatos.
  const validos = new Set(opts.candidatos.map((c) => c.kr.id));
  const raw = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
  const max = opts.n ?? 3;

  const sugerencias: KrSugerido[] = [];
  const vistas = new Set<string>();
  for (const s of raw) {
    const krId = String((s as { kr_id?: unknown })?.kr_id ?? "").trim();
    if (!krId || !validos.has(krId) || vistas.has(krId)) continue;
    const razon = String((s as { razon?: unknown })?.razon ?? "").trim().slice(0, 220);
    if (!razon) continue;
    vistas.add(krId);
    sugerencias.push({ kr_id: krId, razon });
    if (sugerencias.length >= max) break;
  }

  if (sugerencias.length === 0 && raw.length > 0 && typeof window !== "undefined") {
    console.warn(
      "[sugerirKRsSemana] La IA devolvió sugerencias pero ninguna matchea con los candidatos. raw=",
      raw,
    );
  }

  return { sugerencias, prompt_usado: prompt };
}
