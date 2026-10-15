// ============================================================================
// iaSugerencias.ts — Sugerencias de tareas "puntuales" desde la IA.
//
// Dos casos cubiertos:
//   1) Pegar un email / contexto libre y dejar que la IA extraiga tareas
//      (botón en /tareas/inbox).
//   2) Mirar TODA la lista abierta (no completadas) y sugerir 3 siguientes
//      acciones concretas (botón en /tareas).
//
// Diseño:
//   · Sin estado, sin dependencias externas (usa el parser robusto de
//     llm-parser.ts).
//   · Endpoint y auth: misma convención que el resto de la app — el cliente
//     lee `useConfig()` (base_url, minimax_api_key, model) y habla directo
//     con la API externa. La key nunca sale del navegador del usuario.
//   · Esquemas validados con `validarEsquema()` de llm-parser.ts (sin Zod
//     para no añadir 50KB al bundle).
//   · `parsearYValidar()` extrae el JSON, lo parsea y valida el esquema
//     en un solo paso. Si la IA devuelve cualquier cosa rara, falla con
//     `LLMParseError` / `LLMSchemaError` y el caller muestra un error
//     accionable.
//
// Por qué NO está en plan.ts: plan.ts ya tiene 3200+ líneas y mezcla
// planificación diaria (estado emocional) con planes trimestrales. Las
// sugerencias puntuales de inbox/tareas viven mejor en su propio módulo
// para no seguir inflando ese fichero.
// ============================================================================

import {
  parsearYValidar,
  type FieldSchema,
} from "./llm-parser";

// ----------------------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------------------

export type SugerenciaTarea = {
  titulo: string;
  descripcion: string | null;
  /** "critica" | "alta" | "media" | "baja" */
  prioridad: "critica" | "alta" | "media" | "baja" | null;
  /** Frase corta de la IA justificando por qué esta tarea entra en la
   *  lista. Máximo ~280 chars. Vacío si la IA no lo justificó. */
  por_que: string | null;
  /** id del proyecto al que la IA sugiere asociarla (opcional). Solo se
   *  aplica cuando se pasan proyectos existentes. Si la IA no encuentra
   *  coincidencia clara, devuelve null. */
  proyecto_id: string | null;
};

export type SugerirTareasDesdeContextoOpts = {
  /** Texto libre pegado por el usuario (email, contexto, notas…). */
  contexto: string;
  /** Proyectos activos del usuario (id + nombre). Se le pasan a la IA
   *  para que pueda asociar tareas nuevas a un proyecto existente si
   *  tiene sentido. Si está vacío, la IA no sugerirá asociación. */
  proyectos?: Array<{ id: string; nombre: string }>;
  /** Máximo de sugerencias a pedir a la IA. Por defecto 8. */
  maxSugerencias?: number;
};

export type SugerirTareasDesdeContextoResultado = {
  sugerencias: SugerenciaTarea[];
  prompt_usado: string;
};

export type SugerirProximasAccionesOpts = {
  /** TODAS las tareas no completadas del usuario (sin filtrar por meta
   *  ni por inbox — la IA mira toda la lista). La IA decide cuáles
   *  importan más según los argumentos de cada una (título, meta, KR,
   *  prioridad, deadline, ámbito, tags, WIG). */
  tareasAbiertas: Array<{
    id: string;
    titulo: string;
    meta_codigo?: string | null;
    meta_titulo?: string | null;
    kr_titulo?: string | null;
    prioridad: string | null;
    deadline: string | null;
    ambito: string | null;
    tags: string[];
    es_wig: boolean;
    dias_abierta: number;
  }>;
  /** WIGs activos (meta + título) — la IA los usa para anclar las
   *  sugerencias al foco del ciclo. */
  wigs: Array<{ meta_id: string; meta_titulo: string }>;
  /** Proyectos activos (id + nombre). La IA puede sugerir tareas
   *  asociadas si tiene sentido. */
  proyectos?: Array<{ id: string; nombre: string }>;
  /** Número de sugerencias a pedir. Por defecto 3 (es el contrato del
   *  botón "Sugerir 3 siguientes acciones"). */
  n?: number;
};

export type SugerirProximasAccionesResultado = {
  sugerencias: SugerenciaTarea[];
  prompt_usado: string;
};

// ----------------------------------------------------------------------------
// Esquemas de validación (mismo formato que ESQUEMA_* en llm-parser.ts).
// Solo lo necesario para que la IA no nos mande `{ tareas: "algo" }` o
// un objeto vacío.
// ----------------------------------------------------------------------------

const ESQUEMA_SUGERENCIAS_TAREAS: FieldSchema = {
  type: "object",
  fields: {
    sugerencias: {
      type: "array",
      items: {
        type: "object",
        fields: {
          titulo: { type: "string" },
          descripcion: { type: "string", optional: true },
          prioridad: {
            type: "string",
            enum: ["critica", "alta", "media", "baja"],
            optional: true,
          },
          por_que: { type: "string", optional: true },
          proyecto_id: { type: "string", optional: true },
        },
      },
    },
  },
};

// ----------------------------------------------------------------------------
// Cliente HTTP — replicamos el patrón de plan.ts pero inline para no
// importar `llamarLLM` (es interno de plan.ts y devuelve T, lo que
// obligaría a hacer cast doble).
//
// Decisiones:
//   · Endpoint: `${baseUrl}/chat/completions` (mismo que plan.ts).
//   · Temperatura 0.3: más bajo que plan.ts (0.4) porque aquí queremos
//     extracción estructurada, no creatividad narrativa.
//   · Timeout: usamos `calcularTimeoutIA()` del módulo ai-timeout.ts, igual
//     que el resto de la app — coherencia y respeto del límite adaptativo.
//   · Sin response_format: forzoso — algunos modelos lo ignoran y el
//     parser de llm-parser.ts ya está preparado para limpiar fences y
//     razonamiento.
// ----------------------------------------------------------------------------

async function llamarLLMInline<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  // Import dinámico para no arrastrar dependencias si el caller no usa IA
  // (e.g. tests).
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
    if (!content) {
      throw new Error("La IA no devolvió contenido.");
    }
    return content as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normaliza la respuesta cruda del LLM a `SugerenciaTarea[]`.
 *  · Acepta que la IA devuelva `null` en `proyecto_id` cuando no hay
 *    coincidencia clara.
 *  · Recorta `por_que` a 280 chars para no llenar la UI.
 *  · Si prioridad viene vacía o no es del enum válido, la deja en null.
 *  · Filtra sugerencias con título vacío.
 */
function normalizarSugerencias(
  raw: unknown,
  proyectosPorId: Set<string>,
  max: number,
): SugerenciaTarea[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: SugerenciaTarea[] = [];
  const prioridades = new Set(["critica", "alta", "media", "baja"]);
  for (const s of arr) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const titulo = typeof o.titulo === "string" ? o.titulo.trim() : "";
    if (!titulo) continue;
    const descripcion =
      typeof o.descripcion === "string" && o.descripcion.trim().length > 0
        ? o.descripcion.trim().slice(0, 500)
        : null;
    const prio =
      typeof o.prioridad === "string" && prioridades.has(o.prioridad)
        ? (o.prioridad as SugerenciaTarea["prioridad"])
        : null;
    const porQue =
      typeof o.por_que === "string" && o.por_que.trim().length > 0
        ? o.por_que.trim().slice(0, 280)
        : null;
    const proyectoId =
      typeof o.proyecto_id === "string" &&
      o.proyecto_id.trim().length > 0 &&
      proyectosPorId.has(o.proyecto_id)
        ? o.proyecto_id
        : null;
    out.push({ titulo, descripcion, prioridad: prio, por_que: porQue, proyecto_id: proyectoId });
    if (out.length >= max) break;
  }
  return out;
}

// ============================================================================
// 1) Sugerir tareas a partir de un email / contexto libre (botón /tareas/inbox)
// ============================================================================

function buildPromptSugerirTareasDesdeContexto(
  opts: SugerirTareasDesdeContextoOpts,
): string {
  const proyectos = (opts.proyectos ?? [])
    .map((p) => `  - [proyecto_id=${p.id}] ${p.nombre}`)
    .join("\n");

  const bloqueProyectos = proyectos
    ? `
==========
PROYECTOS ACTIVOS DE DAVID (puedes asociar tareas nuevas a uno si encaja)
==========
${proyectos}

Si asocias una tarea a un proyecto, devuelve \`proyecto_id\` con el id EXACTO de la lista. Si no hay coincidencia clara, devuelve \`null\`.
`
    : "";

  const max = opts.maxSugerencias ?? 8;

  return `Eres un asistente de productividad para David López (TDAH, trabaja solo, dirige un restaurante + proyectos tech). David te pega texto en bruto: un email, un mensaje, una nota mental… Tu trabajo es extraer de ahí las TAREAS ACCIONABLES que necesita apuntar en su bandeja de entrada.

==========
REGLAS DE EXTRACCIÓN (lélelas 2 veces antes de escribir)
==========
1. EXTRAE SÓLO lo que implique una ACCIÓN CONCRETA que David tenga que hacer. NO conviertas observaciones, contexto o información pasiva en tareas.
   - SÍ: "llamar a Teresa el martes", "revisar el contrato antes del 15", "preparar el dossier de la hipoteca", "responder al email de Pablo sobre las llaves"
   - NO: "el restaurante abre a las 13h", "ayer llovió", "el contrato dice que…"
2. SIEMPRE 1 tarea por acción distinta. Si el email menciona 4 cosas pendientes, devuelve 4 tareas separadas.
3. PRIORIDAD:
   - "critica": algo se rompe o hay deadline duro esta semana (pagos, salud crítica, bloqueos para terceros).
   - "alta": deadline esta quincena o impacto alto.
   - "baja": cosas de "algún día", sin deadline.
   - "media": el resto. Si dudas, "media".
4. TÍTULOS imperativos y concretos: "Llamar a Teresa para confirmar el lunes", NO "Teresa" o "sobre el local".
5. DESCRIPCIÓN: solo si el email da contexto útil que no cabe en el título (fecha concreta, número, persona concreta). Si no, déjala vacía.
6. IDIOMA: SIEMPRE español de España (tuteo).
7. Devuelve entre 1 y ${max} tareas. Si el texto no tiene ninguna acción, devuelve [].
${bloqueProyectos}
==========
TEXTO QUE HA PEGADO DAVID
==========
${opts.contexto}

Responde SOLO con JSON válido con esta forma EXACTA:
{
  "sugerencias": [
    {
      "titulo": "≤120 chars, imperativo y concreto",
      "descripcion": "≤500 chars (o vacía si no aporta)",
      "prioridad": "critica" | "alta" | "media" | "baja",
      "por_que": "≤200 chars: por qué esta tarea sale del texto (opcional, ponla si el texto no es obvio)",
      "proyecto_id": "id EXACTO de la lista de proyectos arriba, o null"
    }
  ]
}`;
}

export async function sugerirTareasDesdeContextoIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirTareasDesdeContextoOpts,
): Promise<SugerirTareasDesdeContextoResultado> {
  const prompt = buildPromptSugerirTareasDesdeContexto(opts);
  const parsed = await parsearYValidar<{ sugerencias?: unknown }>(
    await llamarLLMInline<string>(baseUrl, apiKey, model,
      "Respondes SOLO con JSON válido, sin texto adicional.",
      prompt,
    ),
    ESQUEMA_SUGERENCIAS_TAREAS,
  );

  const proyectosPorId = new Set((opts.proyectos ?? []).map((p) => p.id));
  const max = opts.maxSugerencias ?? 8;
  const sugerencias = normalizarSugerencias(parsed?.sugerencias, proyectosPorId, max);

  // Diagnóstico en consola si la IA devolvió sugerencias pero ninguna
  // pasó la normalización (útil para debug, no rompe nada).
  const raw = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
  if (sugerencias.length === 0 && raw.length > 0 && typeof window !== "undefined") {
    console.warn(
      "[iaSugerencias] La IA devolvió sugerencias pero ninguna pasó la normalización. raw=",
      raw,
    );
  }

  return { sugerencias, prompt_usado: prompt };
}

// ============================================================================
// 2) Sugerir 3 siguientes acciones mirando TODA la lista abierta (botón /tareas)
// ============================================================================

function buildPromptSugerirProximasAcciones(
  opts: SugerirProximasAccionesOpts,
): string {
  const n = opts.n ?? 3;

  const wigs = opts.wigs
    .map((w) => `  - [meta_id=${w.meta_id}] ${w.meta_titulo}`)
    .join("\n");

  const proyectos = (opts.proyectos ?? [])
    .map((p) => `  - [proyecto_id=${p.id}] ${p.nombre}`)
    .join("\n");

  // Listado compacto de TODAS las tareas no completadas. La IA decide
  // cuáles importan — NO filtramos en cliente porque perderíamos señal.
  const tareas = opts.tareasAbiertas
    .map((t) => {
      const wig = t.es_wig ? " [ES WIG]" : "";
      const prio = t.prioridad ?? "—";
      const dl = t.deadline ?? "—";
      const amb = t.ambito ?? "—";
      const tags = t.tags?.length ? `[${t.tags.join(", ")}]` : "—";
      const meta = t.meta_codigo ? `${t.meta_codigo} · ${t.meta_titulo ?? ""}` : "—";
      const kr = t.kr_titulo ?? "—";
      return `  - [tarea_id=${t.id}]${wig} ${t.titulo}
    meta=${meta} | kr=${kr} | prio=${prio} | deadline=${dl} | ambito=${amb} | tags=${tags} | abierta=${t.dias_abierta}d`;
    })
    .join("\n");

  return `Eres un coach de productividad para David López (TDAH, trabaja solo, dirige un restaurante + proyectos tech). David tiene ${opts.tareasAbiertas.length} tareas abiertas y quiere saber CUÁLES SON LAS ${n} SIGUIENTES ACCIONES CONCRETAS que debería ejecutar.

==========
FILOSOFÍA
==========
- David NO quiere más tareas. Quiere saber qué hacer MAÑANA. Las sugerencias que devuelvas deben ser ACCIONES EJECUTABLES HOY O MAÑANA (no planes a 3 meses vista).
- Pueden ser tareas NUEVAS (que faltan y se derivan de las existentes — p.ej. si tiene "Renegociar alquiler" sin subtareas, sugerir "Buscar 3 locales alternativos") O acciones derivadas (p.ej. "Bloquear 2h en el calendario para llamar a 3 inmobiliarias" si la tarea padre es difícil de empezar).
- Cada sugerencia debe llevar una RAZÓN de UNA frase mirando los argumentos de las tareas existentes (prioridad, deadline, WIG al que apunta, meta/KR al que sirve, días que lleva abierta, etc.).
- Si hay WIGs activos, ANCLA las sugerencias a esos WIGs. Si no, prioriza por urgencia (deadline más cercano) y luego por días abierta (las que llevan más tiempo paradas suelen ser las más difíciles — y por tanto más valiosas de atacar).
- NO devuelvas tareas que ya existen literalmente. Tu trabajo es proponer lo que FALTA o lo derivado, no duplicar.

==========
TAREAS NO COMPLETADAS DE DAVID (${opts.tareasAbiertas.length} en total)
==========
${tareas || "(David no tiene tareas abiertas)"}

==========
WIGs ACTIVOS (foco del ciclo)
==========
${wigs || "(sin WIGs marcados)"}

==========
PROYECTOS ACTIVOS (puedes asociar sugerencias a uno si tiene sentido)
==========
${proyectos || "(sin proyectos activos)"}

Responde SOLO con JSON válido con esta forma EXACTA:
{
  "sugerencias": [
    {
      "titulo": "≤120 chars, imperativo y concreto (esto es lo que David va a hacer, no el nombre de la tarea padre)",
      "descripcion": "≤400 chars, contexto si aporta (o vacía)",
      "prioridad": "critica" | "alta" | "media" | "baja",
      "por_que": "≤200 chars: por qué ESTA tarea sale ahora (mirando WIG/deadline/días abierta/argumentos)",
      "proyecto_id": "id EXACTO de la lista de proyectos o null"
    }
  ]
}

Devuelve EXACTAMENTE ${n} sugerencias (o menos si David tiene 0 tareas y no hay nada que sugerir). Si la lista está vacía o no hay nada accionable, devuelve [] sin inventar.`;
}

export async function sugerirProximasAccionesIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirProximasAccionesOpts,
): Promise<SugerirProximasAccionesResultado> {
  const prompt = buildPromptSugerirProximasAcciones(opts);
  const parsed = await parsearYValidar<{ sugerencias?: unknown }>(
    await llamarLLMInline<string>(baseUrl, apiKey, model,
      "Respondes SOLO con JSON válido, sin texto adicional.",
      prompt,
    ),
    ESQUEMA_SUGERENCIAS_TAREAS,
  );

  const proyectosPorId = new Set((opts.proyectos ?? []).map((p) => p.id));
  const n = opts.n ?? 3;
  const sugerencias = normalizarSugerencias(parsed?.sugerencias, proyectosPorId, n);

  const raw = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
  if (sugerencias.length === 0 && raw.length > 0 && typeof window !== "undefined") {
    console.warn(
      "[iaSugerencias] La IA devolvió sugerencias pero ninguna pasó la normalización. raw=",
      raw,
    );
  }

  return { sugerencias, prompt_usado: prompt };
}