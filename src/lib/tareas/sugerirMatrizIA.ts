// ============================================================================// Sugerir redistribución Eisenhower con IA
// ----------------------------------------------------------------------------
// Recibe la lista de tareas activas (con su clasificación ya computada
// por `src/lib/tareas/matriz.ts`) + el contexto temporal y devuelve para
// cada tarea un cuadrante sugerido. La IA NO escribe en la BD; el modal
// de revisión deja al usuario editar el cuadrante antes de aplicar.
//
// Sigue el patrón de motorPriorizacion.ts y sugerirPagosIA.ts:
//   - Llamada directa cliente → proveedor (mismo baseUrl/apiKey/model).
//   - JSON estricto, timeout adaptativo.
//   - Saneador que valida que el cuadrante sugerido sea uno de Q1..Q4.
//
// El apply NO toca urgencia/importancia (son derivadas). Solo escribe
// `prioridad` mapeando el cuadrante sugerido.
// ============================================================================

import { calcularTimeoutIA, mensajeTimeoutIA } from "@/lib/ai-timeout";
import { bloquePerfil, type PerfilIA } from "@/lib/perfilIA";
import type { Cuadrante, ClasificacionMatriz } from "@/lib/tareas/matriz";

// ----------------------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------------------

export type SugerirMatrizOpts = {
  /** Tareas activas (la página matriz las filtra por estado). */
  tareas: Array<{
    id: string;
    titulo: string;
    metaCodigo: string | null;
    metaTitulo: string | null;
    clasificacion: ClasificacionMatriz;
    /** Días hasta vencer (null si no hay fecha). */
    diasHastaVencer: number | null;
    /** Prioridad manual actual (la IA puede discrepar). */
    prioridadActual: string;
    /** ¿La tarea es WIG-tarea? */
    esWigTarea: boolean;
    /** Tags libres (por si la IA quiere usarlos). */
    tags: string[];
  }>;
  /** Fecha YYYY-MM-DD (local). */
  fecha: string;
  /** Día de la semana en español. */
  diaSemana: string;
  /** Perfil del usuario (migration 0032). Si se omite, DEFAULT_PERFIL_IA. */
  perfil?: PerfilIA | null;
};

export type SugerirMatrizItem = {
  /** UUID de la tarea. */
  tarea_id: string;
  /** Cuadrante actual (derivado de la clasificación computada). */
  cuadrante_actual: Cuadrante;
  /** Cuadrante que la IA propone. */
  cuadrante_sugerido: Cuadrante;
  /** 1 frase corta explicando por qué este cuadrante. */
  motivo: string;
};

export type SugerirMatrizResultado = {
  sugerencias: SugerirMatrizItem[];
  /** Prompt completo enviado a la IA (útil para depurar). */
  prompt_usado: string;
};

// ----------------------------------------------------------------------------
// Llamada LLM (mismo patrón que motorPriorizacion.ts y sugerirPagosIA.ts)
// ----------------------------------------------------------------------------

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
          "Eres un asistente que responde SOLO con JSON válido, sin texto fuera, sin markdown, sin encabezados.",
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

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------

function buildPrompt(opts: SugerirMatrizOpts): string {
  const { tareas, fecha, diaSemana } = opts;

  // Cap defensivo: si David tiene 80+ tareas activas, no abrumamos al prompt.
  // Ordenamos por Q1 → Q4 (las más críticas primero, donde la IA tiene que
  // pensar más fino), y limitamos a 60.
  const orden: Record<Cuadrante, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };
  const tareasOrdenadas = tareas
    .slice()
    .sort((a, b) => {
      const oa = orden[a.clasificacion.cuadrante];
      const ob = orden[b.clasificacion.cuadrante];
      if (oa !== ob) return oa - ob;
      // Dentro del mismo cuadrante, vencidas primero.
      const da = a.diasHastaVencer ?? 9999;
      const db = b.diasHastaVencer ?? 9999;
      return da - db;
    })
    .slice(0, 60);

  const listaTareas = tareasOrdenadas.length
    ? tareasOrdenadas
        .map((t, i) => {
          const dias =
            t.diasHastaVencer == null
              ? "sin fecha"
              : t.diasHastaVencer < 0
                ? `vencida hace ${Math.abs(t.diasHastaVencer)}d`
                : t.diasHastaVencer === 0
                  ? "hoy"
                  : `en ${t.diasHastaVencer}d`;
          const wig = t.esWigTarea ? " [WIG-TAREA]" : "";
          const meta = t.metaTitulo
            ? ` [meta: ${t.metaCodigo ? t.metaCodigo + " · " : ""}${t.metaTitulo}]`
            : " [huérfana]";
          return `${i + 1}. [id=${t.id}] "${t.titulo}"${meta}${wig} [prio actual=${t.prioridadActual}] [clasif actual=${t.clasificacion.cuadrante} — ${t.clasificacion.urgenciaLabel} × ${t.clasificacion.importanciaLabel}] [vence: ${dias}]${t.tags.length ? " [tags=" + t.tags.join(",") + "]" : ""}`;
        })
        .join("\n")
    : "(sin tareas activas)";

  return `Eres el asistente de productividad. ${bloquePerfil(opts.perfil)}
Tu trabajo es revisar la lista de sus tareas activas y proponer para cada una el cuadrante correcto de la matriz de Eisenhower.

MATRIZ DE EISENHOWER:
- Q1 — Hacer YA:    urgente (vencida/hoy) + importante (WIG-meta, WIG-tarea, meta activa)
- Q2 — Planificar: no urgente + importante
- Q3 — Delegar:    urgente + no importante (huérfana)
- Q4 — Eliminar:   no urgente + no importante

IMPORTANTE — Las dos dimensiones son INDEPENDIENTES:
- Urgencia viene de la fecha (vencida, hoy, semana, mes, lejos, sin_fecha). Es objetiva.
- Importancia viene del WIG/meta al que sirve la tarea. Una tarea de WIG-1 es más importante que una de WIG-3. Una tarea huérfana (sin meta) suele ser menos importante.
- Pipeline/prioridad manual es solo una PISTA, no la verdad. Si la prioridad manual no coincide con el cuadrante derivado de los datos, la IA puede discrepar y proponer un cambio.

REGLAS DE DECISIÓN:
1. Si vence HOY o está vencida Y apoya un WIG → Q1 sin dudar.
2. Si apoya un WIG-meta (aunque sea lejos) → al menos Q2.
3. Si es WIG-tarea → Q1 o Q2 (nunca Q3/Q4).
4. Si es huérfana (sin meta) y vence pronto → Q3 (delegar).
5. Si es huérfana y sin fecha concreta → Q4 (candidata a eliminar o archivar).
6. Si el usuario marcó prioridad 'critica' pero no tiene fecha ni meta WIG, baja a Q3 (era ruido manual).
7. Si el usuario marcó 'baja' pero vence hoy y es de WIG, sube a Q1 (subestimaba la urgencia).

SALIDA — JSON estricto con UN item por tarea que quieras MOVER de cuadrante. Si una tarea ya está en su cuadrante correcto, NO la incluyas (ahorra apply).

{
  "sugerencias": [
    {
      "tarea_id": "<uuid exacto de la lista>",
      "cuadrante_actual": "Q3",
      "cuadrante_sugerido": "Q1",
      "motivo": "<1 frase explicando el desplazamiento>"
    }
  ]
}

============================================================
CONTEXTO TEMPORAL
============================================================
Fecha: ${fecha} (${diaSemana})

============================================================
TAREAS ACTIVAS (${tareasOrdenadas.length}) — ordenadas por cuadrante actual y urgencia
============================================================
${listaTareas}
`;
}

// ----------------------------------------------------------------------------
// Saneamiento
// ----------------------------------------------------------------------------

const CUADRANTES_VALIDOS: Cuadrante[] = ["Q1", "Q2", "Q3", "Q4"];

export function sanearSugerenciasMatriz(
  raw: unknown,
  tareasCandidatas: Array<{ id: string; clasificacion: ClasificacionMatriz }>,
): SugerirMatrizResultado {
  const r = (raw ?? {}) as Record<string, unknown>;
  const sugerenciasRaw = Array.isArray(r.sugerencias) ? r.sugerencias : [];
  const idsValidos = new Set(tareasCandidatas.map((t) => t.id));
  const cuMap = new Map(tareasCandidatas.map((t) => [t.id, t.clasificacion.cuadrante]));

  const sugerencias: SugerirMatrizItem[] = [];
  const rechazadas: string[] = [];

  for (const item of sugerenciasRaw) {
    const it = (item ?? {}) as Record<string, unknown>;
    const id = String(it.tarea_id ?? "").trim();
    if (!idsValidos.has(id)) {
      rechazadas.push(id || "(sin id)");
      continue;
    }
    const sug = String(it.cuadrante_sugerido ?? "").trim().toUpperCase() as Cuadrante;
    if (!CUADRANTES_VALIDOS.includes(sug)) {
      rechazadas.push(`${id} (cuadrante inválido: ${sug})`);
      continue;
    }
    const actual = (cuMap.get(id) ?? "Q4") as Cuadrante;
    const motivo = String(it.motivo ?? "").trim().slice(0, 240) || "Sin motivo especificado.";
    sugerencias.push({
      tarea_id: id,
      cuadrante_actual: actual,
      cuadrante_sugerido: sug,
      motivo,
    });
  }

  if (typeof window !== "undefined" && rechazadas.length > 0) {
    console.warn(
      "[sugerirMatriz] La IA devolvió sugerencias no válidas que se descartaron:",
      rechazadas,
    );
  }

  return { sugerencias, prompt_usado: "" };
}

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

export async function sugerirMatrizIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirMatrizOpts,
): Promise<SugerirMatrizResultado> {
  const prompt = buildPrompt(opts);
  const parsed = await llamarLLM<unknown>(baseUrl, apiKey, model, prompt);
  const saneado = sanearSugerenciasMatriz(
    parsed,
    opts.tareas.map((t) => ({ id: t.id, clasificacion: t.clasificacion })),
  );
  return { ...saneado, prompt_usado: prompt };
}