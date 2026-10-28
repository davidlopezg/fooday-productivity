// ============================================================================
// Plan diario v3 — generación con IA (informe rico)
// ============================================================================
// • Una sola llamada consolidada (no cascada de sub-agentes).
// • El prompt hace de tres voces: análisis psicológico, metabolismo,
//   nutrición familiar (como el agente original pero en un solo round).
// • Devuelve un objeto InformePlan con TODAS las secciones:
//   cabecera, estado_hoy, tendencia, lectura_psicologica, conexion_tareas,
//   dia_optimizado, clasificacion_tareas, recomendacion_estrategica,
//   notas, comida.
// • `informeToMarkdown()` convierte el JSON en markdown estilo agente local.
// • `redactarBorrador()`: Parte 2 — la IA REDACTA (no envía).
// ============================================================================

import type { InformePlan, PlanDiario, Tarea, Subtarea } from "@/lib/types";
import { calcularTimeoutIA, mensajeTimeoutIA } from "@/lib/ai-timeout";
import { bloquePerfil, type PerfilIA } from "./perfilIA";
import { extraerJSON } from "./llm-parser";

export type EstadoEmocional = {
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesidad: string;
};

export type SubtareaGenerada = {
  descripcion: string;
  tiempo_estimado_min?: number;
};

export type TareaPlan = {
  tipo: "imprescindible" | "autocuidado" | "micro" | "extra";
  titulo_libre: string;
  bloque_energia: "regular" | "estrategia" | "ejecucion" | "mecanica" | null;
  bloque_cognitivo: "foco" | "operativa" | "distribuida" | null;
  es_ia: boolean;
  subtareas: SubtareaGenerada[];
};

/** Tipos "ligeros" que la web usa para feedback inmediato (resumen+recomendación+tareas)
 *  se derivan del informe completo en el cliente. */
export type PlanGeneradoLigero = {
  semaforo: "verde" | "amarillo" | "rojo";
  resumen: string;
  recomendacion: string;
  tareas: TareaPlan[];
  informe: InformePlan;
};

export type GenerarPlanOpts = {
  estado: EstadoEmocional;
  tareas: Tarea[];
  tareasLibres?: string[];
  reflexion?: string;
  contextoExtra?: string;
  historial?: PlanDiario[];
  /** Fecha en formato YYYY-MM-DD */
  fecha: string;
  /**
   * Perfil del usuario para el bloque de contexto del prompt (migration
   * 0032). Si se omite, `bloquePerfil` usa DEFAULT_PERFIL_IA — los mismos
   * textos que estaban hardcodeados antes de sacarlos de aquí.
   */
  perfil?: PerfilIA | null;
};

export type RedactarOpts = {
  tarea: { titulo_libre: string | null; tipo: string };
  tipo: "email" | "whatsapp" | "documento" | "otro";
  contextoUsuario: string;
  destinatario?: string;
};

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

// ----------------------------------------------------------------------------
// Mapeo de etiquetas emocionales → días seguidos (heurística simple)
// ----------------------------------------------------------------------------

function diasSeguidosSemaforo(historial: PlanDiario[], semaforo: string): number {
  let n = 0;
  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i].semaforo === semaforo) n++;
    else break;
  }
  return n;
}

// ----------------------------------------------------------------------------
// Prompt — Generación del informe rico
// ----------------------------------------------------------------------------

function buildPrompt(opts: GenerarPlanOpts): string {
  const { estado, tareas, tareasLibres, reflexion, contextoExtra, historial, fecha } = opts;

  const listaBd = tareas
    .slice(0, 30)
    .map(
      (t, i) =>
        `${i + 1}. [${t.prioridad ?? "media"}${t.capa ? ` · ${t.capa}` : ""}${t.codigo ? ` · ${t.codigo}` : ""}] ${t.titulo}${t.deadline ? ` (deadline: ${t.deadline})` : ""}`,
    )
    .join("\n");

  const listaLibres = (tareasLibres ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => `${i + 1}. (libre) ${t}`)
    .join("\n");

  const hist = (historial ?? [])
    .slice(-5)
    .map(
      (p) =>
        `- ${p.fecha} | sem=${p.semaforo ?? "?"} | despertar=${p.despertar ?? "?"} | mente=${p.mente ?? "?"} | cuerpo=${p.cuerpo ?? "?"} | rueda=${p.rueda ?? "?"}`,
    )
    .join("\n");

  const fechaLarga = fechaToLarga(fecha);

  return `Eres el planificador diario emocional de David. Una sola llamada consolidada (no hay sub-agentes en cascada), pero actúas con TRES VOCES dentro del JSON de salida:
  1. 🧠 ANÁLISIS PSICOLÓGICO (estado emocional, tendencia, lectura profunda)
  2. ⚙️ PLANIFICADOR OPERATIVO (clasificación de tareas, día optimizado, recomendación estratégica)
  3. 🥗 NUTRICIÓN (plato base + menú familiar + lista compra)

${bloquePerfil(opts.perfil)}
- Cocina batch los domingos con hardware: Mambo > Vaporera > Freidora aire > Plancha > Roner.
- Prioridades estratégicas: familia > negocio > sí-mismo.

============================================================
FECHA
============================================================
${fecha} → ${fechaLarga}

============================================================
ESTADO EMOCIONAL DE HOY
============================================================
- Despertar: ${estado.despertar}
- Mente: ${estado.mente}
- Cuerpo: ${estado.cuerpo}
- Rueda del ratón: ${estado.rueda}
- Necesita hoy: ${estado.necesidad}

============================================================
HISTÓRICO (últimos ${(historial ?? []).length} planes)
============================================================
${hist || "(sin histórico todavía)"}

============================================================
TAREAS PENDIENTES DE BD (elige de aquí primero)
============================================================
${listaBd || "(sin tareas en BD)"}

============================================================
TAREAS LIBRES DEL FORMULARIO
============================================================
${listaLibres || "(ninguna)"}

============================================================
REFLEXIÓN / DESAHOGO DEL USUARIO
============================================================
${reflexion?.trim() || "(no facilitada)"}

============================================================
CONTEXTO EXTRA DEL USUARIO
============================================================
${contextoExtra?.trim() || "(no facilitado)"}

============================================================
BLOQUES FIJOS DEL DÍA (referencia)
============================================================
• 🌅 07:30–10:30 — Mañana autocuidado (NO trabajo, móvil OFF)
• ☀️ 11:00–13:00 — Primer bloque TRABAJO (foco)
• 🍽️ 13:00–15:00 — Comida
• 🌇 15:00–20:30 — Segundo bloque TRABAJO (ejecución)
• 🌙 21:00–23:00 — Noche (móvil OFF)

============================================================
REGLAS DE SELECCIÓN (ya las conoces)
============================================================

SEMÁFORO:
- 🟢 VERDE → 3 tareas balanceadas
- 🟡 AMARILLO → 1 imprescindible + 1 micro + 1 autocuidado (máx 3)
- 🔴 ROJO → 1 imprescindible + 1 autocuidado

MÁXIMO 3 TAREAS DEL DÍA. Prioriza por deadline + consecuencias. Si sobran, déjalas en "pendientes_criticas".

DESGRANAR cada tarea en 2-5 subtareas de ≤15 min.
CLASIFICAR bloque_cognitivo (foco|operativa|distribuida) y bloque_energia (regular|estrategia|ejecucion|mecanica).
MARCAR es_ia=true si la subtarea la puede ayudar la IA (buscar/resumir/redactar).

============================================================
FORMATO DE SALIDA — JSON ESTRICTO
============================================================

Devuelve SOLO este JSON (sin texto fuera). El JSON debe tener TODAS estas claves aunque algunas estén vacías. Las cadenas no deben contener saltos de línea literales; usa "\\n" para representar saltos en su contenido.

{
  "cabecera": "Planificación Diaria — ${fechaLarga}\\n\\n<2-3 frases con semáforo + tendencia + decisión crítica del día (ej: tareas del VC, fuegos críticos, decisiones)>",

  "estado_hoy": {
    "semaforo": "verde|amarillo|rojo",
    "dias_seguidos": <nº días seguidos en este semáforo, ej: 21>,
    "tabla": [
      { "campo": "Despertar", "valor": "<texto>", "emoji": "<emoji>" },
      { "campo": "Mente", "valor": "<texto>", "emoji": "<emoji>" },
      { "campo": "Cuerpo", "valor": "<texto>", "emoji": "<emoji>" },
      { "campo": "Rueda del ratón", "valor": "<texto>", "emoji": "<emoji>" },
      { "campo": "Necesitás", "valor": "<texto>", "emoji": "<emoji>" }
    ],
    "conexion_emocional": "<3-5 frases: conecta lo que pidió (ej: claridad) con la realidad del día, sin juzgar>"
  },

  "tendencia": {
    "registros": [
      { "fecha": "DD/MM", "despertar": "<texto>", "mente": "<texto>", "cuerpo": "<texto>", "rueda": "<texto>", "necesita": "<texto>", "semaforo": "🟢|🟡|🔴", "tendencia_despertar": "<⬆️|⬇️|=|🔄>" }
    ],
    "lectura": "<3-6 frases: identifica patrón repetido, dirección del cambio, alerta si >7 días en la misma firma>"
  },

  "lectura_psicologica": {
    "estado_actual": "<4-6 frases: lectura psicológica profunda del estado de hoy>",
    "analisis_emocional": "<4-6 frases: dinámica identificada, patrón vs días anteriores, lo que no se ve>",
    "recomendaciones_hoy": ["<orden numerado de 3-5 acciones concretas para hoy>"],
    "si_sobrepasado": ["<2-4 frases: qué hacer si te sentís sobrepasado>"],
    "si_cuerpo_empeora": ["<2-4 frases: qué hacer si el cuerpo empeora antes de las 17:00>"],
    "para_esta_semana": ["<2-4 frases: aprendizajes / recordatorios para esta semana>"]
  },

  "conexion_tareas": {
    "analisis_realismo": [
      { "tarea": "<título>", "origen": "<TXX o VC>", "realista_hoy": "si|si_condiciones|no", "por_que": "<1 frase>", "accion": "<Tarea N del día | Esta semana | NO hoy>" }
    ],
    "justificacion_3_tareas": "<3-5 frases: por qué solo 3 y no 8-15. Recuerda la matemática del agente: 3 × 5 × 52 = 780 tareas/año.>"
  },

  "dia_optimizado": {
    "energia_disponible": "<1 frase con emoji del semáforo + adjetivo>",
    "principio_hoy": "<1 frase: principio rector del día, ej: 'Mecánica primero, foco después, cero extras'>",
    "horario": [
      { "horario": "07:30–10:30", "bloque": "🌅 Mañana autocuidado", "tarea": "<acción concreta>", "por_que": "<1 frase>" }
    ],
    "delegacion_ia": [
      { "que": "<qué puede hacer la IA>", "cuando_listo": "<cuando me lo pidas (X min)>" }
    ],
    "patron_detectado": "<opcional, 2-3 frases: patrón detectado vs último registro>"
  },

  "clasificacion_tareas": {
    "del_dia": [
      { "id": "T1", "titulo": "<emoji + título>", "origen": "<TXX>", "tipo": "<Operativa|Foco|Distribuida>", "bloque_energia": "<Mecánica|Ejecución|Regular|Estrategia>", "tiempo_min": <minutos> }
    ],
    "pendientes_criticas": [
      { "titulo": "<emoji + título>", "deadline": "<esta semana|mañana|...>", "notas": "<esfuerzo o contexto>" }
    ],
    "programables": [
      { "titulo": "<emoji + título>", "esfuerzo": "<5 min|30 min|...>" }
    ],
    "backlog": [
      { "titulo": "<texto corto>" }
    ]
  },

  "recomendacion_estrategica": {
    "vs_plan_largo": [
      { "tarea": "T1 <título>", "meta": "<meta estratégica>", "conexion": "<por qué conecta con el plan largo>" }
    ],
    "si_estancas": "<3-5 frases: qué hacer si te atascás en cada tarea>",
    "cierre_dia": ["<3-5 frases de cierre, una por bullet>"]
  },

  "notas": [
    { "titulo": "<tema>", "texto": "<3-8 frases: insight o criterio>" }
  ],

  "comida": {
    "plato_base_desayuno": {
      "estructura": "<estructura del plato base, ej: [verdura] + [proteína] + [carbs]>",
      "tiempo": "<tiempo de preparación>",
      "variaciones": ["<variación 1>", "<variación 2>"],
      "base_metabolica": "<1-2 frases: por qué esta estructura funciona metabólicamente>"
    },
    "plato_base_comida": {
      "estructura": "<estructura>",
      "tiempo": "<tiempo>",
      "variaciones": ["<v1>", "<v2>"],
      "base_metabolica": "<1-2 frases>"
    },
    "cambio_20_80": {
      "propuesto": "<1 frase: el cambio propuesto>",
      "impacto": "<1-2 frases: por qué explica el 80% del cambio>",
      "implementacion": "<1 frase: cuándo/cómo arrancar>"
    },
    "merienda": "<1-2 frases: merienda pre-foco>",
    "cena": "<1-2 frases: cena ligera>",
    "menu_familiar": [
      { "dia": "<Mar 22/09>", "comida": "<plato>", "cena": "<plato>" }
    ],
    "lista_compra": [
      { "categoria": "🥩 Proteína", "items": "<items separados por coma>" }
    ],
    "plan_domingo": "<3-5 frases: plan de batch cooking del domingo>"
  }
}

============================================================
RECUERDA
============================================================
- Nada de "Sure", "Here is", markdown fuera del JSON, ni explicaciones.
- Tono: profesional pero cercano, en español de España. Empático pero sin culpabilizar.
- Sin saltos de línea literales; usa \\n dentro de los strings.
- ESCAPE comillas dentro de los strings (\\\\" para representar \\").
- Devuelve SOLO el JSON, sin nada más.`;
}

// ----------------------------------------------------------------------------
// Prompt — Redacción (Parte 2)
// ----------------------------------------------------------------------------

function buildPromptRedactar(opts: RedactarOpts): string {
  const { tarea, tipo, contextoUsuario, destinatario } = opts;
  const dest = destinatario ? `\nDestinatario: ${destinatario}` : "";
  const tipoLabel = {
    email: "email profesional",
    whatsapp: "mensaje de WhatsApp",
    documento: "documento / sección de documento",
    otro: "texto",
  }[tipo];
  return `Eres el redactor personal de David. Debes DRAFTAR un ${tipoLabel} basado en la tarea y el contexto. NO envíes nada, NO llames a APIs externas, solo devuelve el TEXTO del borrador listo para que David lo revise y lo envíe él mismo.

Tarea: ${tarea.titulo_libre ?? "(sin título)"}
Tipo de tarea: ${tarea.tipo}${dest}

Contexto / instrucciones del usuario:
${contextoUsuario}

REGLAS:
- Tono profesional pero cercano, en español de España.
- Si es email: asunto + cuerpo (sin "[Insertar aquí]").
- Si es whatsapp: corto, claro, sin formalidades excesivas.
- Si es documento: estructura clara con encabezados si tiene más de 5 líneas.
- NO inventes datos sensibles (DNIs, importes, direcciones).
- Si falta información crítica, pregunta al final del borrador en una línea "Falta: ...".

FORMATO — JSON estricto:
{ "asunto": "<solo si es email, si no vacío>", "cuerpo": "<texto del borrador>" }`;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function fechaToLarga(fecha: string): string {
  // fecha = "YYYY-MM-DD"
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function llamarLLM<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  parseJSON: boolean,
  /** Esquema opcional para validar la respuesta. Si se pasa y la
   *  validación falla, lanza LLMSchemaError (en vez de devolver un
   *  objeto incompleto que el caller tendría que defenderse). */
  schema?: import("./llm-parser").FieldSchema,
): Promise<T> {
  // Timeout adaptativo (migration 0025). Cálculo centralizado en
  // /lib/ai-timeout.ts para no duplicarlo en los 3 callers LLM.
  // Razón del cambio: el prompt del planificador creció al soportar
  // meses + hard constraint + fechas reales, y se acercaba al límite
  // de 45s en cold start / redes lentas.
  // Le pasamos un Error como `reason` para que el AbortError resultante
  // lleve un mensaje útil en lugar del genérico
  // "signal is aborted without reason" que mostraba la UI tal cual.
  const promptLen = (systemPrompt?.length ?? 0) + (userPrompt?.length ?? 0);
  const timeoutMs = calcularTimeoutIA(promptLen);

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () =>
      controller.abort(new Error(mensajeTimeoutIA(promptLen))),
    timeoutMs,
  );
  try {
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "Minimax-M3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: parseJSON ? { type: "json_object" } : undefined,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!parseJSON) return content as T;

    // === Pipeline de parseo en cascada ===
    // 1) Intento directo: si la IA respetó response_format, esto basta.
    // 2) extractFirstJSON: limpia `` / ```json``` / razonamiento
    //    y devuelve un bloque JSON balanceado.
    // 3) sanearJSONComun: parchea trailing commas / comillas simples /
    //    undefined / NaN. Esto es "best effort" — si falla, NO
    //    seguimos parcheando, lanzamos error claro.
    const errors: string[] = [];
    const tryParse = (raw: string, label: string): unknown | null => {
      try {
        return JSON.parse(raw);
      } catch (e) {
        errors.push(`${label}: ${(e as Error).message}`);
        return null;
      }
    };

    let parsed: unknown = tryParse(content, "JSON.parse directo");
    if (parsed === null) {
      // FALLBACK ESPERADO: el LLM de reasoning (<think>) no respeta
      // `response_format: json_object`, así que la respuesta llega con
      // razonamiento antes del JSON. `extraerJSON` lo limpia. Esto NO
      // es un error: lo logueamos como `info` y seguimos.
      if (typeof window !== "undefined") {
        console.info(
          "[plan] JSON.parse directo falló (esperado con LLMs de razonamiento), usando extraerJSON. Causa:",
          errors[0],
        );
      }
      let json: string;
      try {
        json = extraerJSON(content);
      } catch (e) {
        if (typeof window !== "undefined") {
          console.error(
            "[plan] extraerJSON también falló — respuesta NO recuperable. Mensaje:",
            (e as Error).message,
          );
        }
        throw new Error(
          `La IA no devolvió JSON válido. Primeros 200 chars: ${content.slice(0, 200).replace(/\n/g, " ")}`,
        );
      }
      parsed = tryParse(json, "JSON.parse(extraído)");
      if (parsed === null) {
        const saneado = sanearJSONComun(json);
        parsed = tryParse(saneado, "JSON.parse(saneado)");
      }
      if (parsed === null) {
        if (typeof window !== "undefined") {
          console.error(
            "[plan] Los 3 intentos de parseo fallaron. Errores:",
            errors,
            "Primeros 200 chars:",
            content.slice(0, 200).replace(/\n/g, " "),
          );
        }
        throw new Error(
          `La IA no devolvió JSON válido tras 3 intentos. Errores: ${errors.join(" | ")}. Primeros 200 chars: ${content.slice(0, 200).replace(/\n/g, " ")}`,
        );
      } else if (typeof window !== "undefined") {
        console.info("[plan] Respuesta recuperada por fallback (ok).");
      }
    }

    // Validación de esquema opcional.
    if (schema) {
      const { validarEsquema, LLMSchemaError } = await import("./llm-parser");
      try {
        validarEsquema(parsed, schema);
      } catch (e) {
        if (e instanceof LLMSchemaError) {
          if (typeof window !== "undefined") {
            console.warn(
              "[plan] validación de esquema falló:",
              e.message,
              e.issues,
            );
          }
          throw e;
        }
        throw e;
      }
    }

    return parsed as T;
  } catch (e) {
    // AbortError puede venir de dos sitios:
    //   1) Nuestro timeout de 45s: el `abort(reason)` de arriba le inyecta
    //      un Error con mensaje útil → lo re-lanzamos tal cual.
    //   2) Abort externo (componente desmontado, navegación, regenerar
    //      rápido): `reason` es undefined → mostramos mensaje amable en
    //      lugar del críptico "signal is aborted without reason".
    if (e instanceof Error && e.name === "AbortError") {
      const reason = (e as Error & { cause?: unknown }).cause;
      if (reason instanceof Error && reason.message) throw reason;
      throw new Error(
        "La petición a la IA fue cancelada (navegación o regeneración). Reintenta.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Repara problemas típicos de LLMs: trailing commas, comillas simples, undefined, NaN. */
function sanearJSONComun(s: string): string {
  return s
    // Trailing commas antes de } o ]
    .replace(/,\s*([}\]])/g, "$1")
    // undefined → null
    .replace(/:\s*undefined\b/g, ": null")
    // NaN → null (no es JSON válido)
    .replace(/:\s*NaN\b/g, ": null")
    // Comillas simples en keys/values: "key": 'value' → "key": "value"
    .replace(/'([^'\n]+?)'\s*:/g, '"$1":')
    .replace(/:\s*'([^'\n]*?)'/g, ': "$1"');
}

function extractFirstJSON(content: string): string {
  let s = content.trim();

  // 1) Quitar fences ```json ... ``` o ``` ... ``` al inicio/final.
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();

  // 2) Quitar bloques de razonamiento del modelo (<think> ... </think>).
  //    MiniMax-M3 y otros modelos con "chain of thought" pueden anteponer
  //    bloques con texto en lenguaje natural antes del JSON. Esos bloques
  //    contienen llaves que confundirían al extractor ingenuo.
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Variantes: <|reasoning|>...<|/reasoning|>, <reasoning>...</reasoning>.
  s = s.replace(/<\|?\s*reasoning\s*\|?>[\s\S]*?<\|?\s*\/?\s*reasoning\s*\|?>/gi, "").trim();
  s = s.replace(/<\s*reasoning\s*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, "").trim();

  // 3) Si después de limpiar fences y razonamiento siguen quedando fences
  //    ```json ... ``` (porque la IA los metió alrededor del JSON), los
  //    respetamos una segunda vez.
  const fence2 = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence2) s = fence2[1].trim();

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

// ----------------------------------------------------------------------------
// Saneamiento y normalización del JSON
// ----------------------------------------------------------------------------

function sanearInforme(raw: unknown, fecha: string, historial: PlanDiario[]): InformePlan {
  const r = (raw ?? {}) as Record<string, unknown>;
  const fechaLarga = fechaToLarga(fecha);
  const semaforoRaw = String((r.estado_hoy as Record<string, unknown>)?.semaforo ?? "amarillo");
  const semaforo = (["verde", "amarillo", "rojo"] as const).includes(semaforoRaw as never)
    ? (semaforoRaw as "verde" | "amarillo" | "rojo")
    : "amarillo";
  const dias = diasSeguidosSemaforo(historial, semaforo);

  // Helper para crear array seguro
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const eh = (r.estado_hoy as Record<string, unknown>) ?? {};
  const cab = String(r.cabecera ?? `Planificación Diaria — ${fechaLarga}`);
  const tablaRaw = arr<Record<string, unknown>>(eh.tabla);
  const tabla = tablaRaw.length > 0
    ? tablaRaw.map((x) => ({
        campo: String(x.campo ?? "").slice(0, 60),
        valor: String(x.valor ?? "").slice(0, 200),
        emoji: String(x.emoji ?? "").slice(0, 4),
      }))
    : [
        { campo: "Despertar", valor: "—", emoji: "🌅" },
        { campo: "Mente", valor: "—", emoji: "🧠" },
        { campo: "Cuerpo", valor: "—", emoji: "💪" },
        { campo: "Rueda del ratón", valor: "—", emoji: "🌀" },
        { campo: "Necesitás", valor: "—", emoji: "✨" },
      ];

  const tend = (r.tendencia as Record<string, unknown>) ?? {};
  const lp = (r.lectura_psicologica as Record<string, unknown>) ?? {};
  const ct = (r.conexion_tareas as Record<string, unknown>) ?? {};
  const doo = (r.dia_optimizado as Record<string, unknown>) ?? {};
  const cl = (r.clasificacion_tareas as Record<string, unknown>) ?? {};
  const re = (r.recomendacion_estrategica as Record<string, unknown>) ?? {};
  const com = (r.comida as Record<string, unknown>) ?? {};

  return {
    cabecera: cab.slice(0, 1500),
    estado_hoy: {
      semaforo,
      dias_seguidos: dias,
      tabla,
      conexion_emocional: String(eh.conexion_emocional ?? "").slice(0, 800),
    },
    tendencia: {
      registros: arr<Record<string, unknown>>(tend.registros).map((x) => ({
        fecha: String(x.fecha ?? "").slice(0, 10),
        despertar: String(x.despertar ?? "—").slice(0, 60),
        mente: String(x.mente ?? "—").slice(0, 60),
        cuerpo: String(x.cuerpo ?? "—").slice(0, 60),
        rueda: String(x.rueda ?? "—").slice(0, 60),
        necesita: String(x.necesita ?? "—").slice(0, 60),
        semaforo: String(x.semaforo ?? "—").slice(0, 4),
        tendencia_despertar: x.tendencia_despertar
          ? String(x.tendencia_despertar).slice(0, 10)
          : undefined,
      })),
      lectura: String(tend.lectura ?? "").slice(0, 1000),
    },
    lectura_psicologica: {
      estado_actual: String(lp.estado_actual ?? "").slice(0, 1200),
      analisis_emocional: String(lp.analisis_emocional ?? "").slice(0, 1200),
      recomendaciones_hoy: arr<string>(lp.recomendaciones_hoy).map((s) => String(s).slice(0, 400)),
      si_sobrepasado: arr<string>(lp.si_sobrepasado).map((s) => String(s).slice(0, 400)),
      si_cuerpo_empeora: arr<string>(lp.si_cuerpo_empeora).map((s) => String(s).slice(0, 400)),
      para_esta_semana: arr<string>(lp.para_esta_semana).map((s) => String(s).slice(0, 400)),
    },
    conexion_tareas: {
      analisis_realismo: arr<Record<string, unknown>>(ct.analisis_realismo).map((x) => ({
        tarea: String(x.tarea ?? "—").slice(0, 200),
        origen: x.origen ? String(x.origen).slice(0, 30) : undefined,
        realista_hoy: (["si", "si_condiciones", "no"] as const).includes(
          x.realista_hoy as never,
        )
          ? (x.realista_hoy as "si" | "si_condiciones" | "no")
          : "si",
        por_que: String(x.por_que ?? "").slice(0, 300),
        accion: String(x.accion ?? "—").slice(0, 200),
      })),
      justificacion_3_tareas: String(ct.justificacion_3_tareas ?? "").slice(0, 800),
    },
    dia_optimizado: {
      energia_disponible: String(doo.energia_disponible ?? "").slice(0, 200),
      principio_hoy: String(doo.principio_hoy ?? "").slice(0, 200),
      horario: arr<Record<string, unknown>>(doo.horario).map((x) => ({
        horario: String(x.horario ?? "").slice(0, 30),
        bloque: String(x.bloque ?? "").slice(0, 60),
        tarea: String(x.tarea ?? "").slice(0, 200),
        por_que: String(x.por_que ?? "").slice(0, 300),
      })),
      delegacion_ia: arr<Record<string, unknown>>(doo.delegacion_ia).map((x) => ({
        que: String(x.que ?? "").slice(0, 200),
        cuando_listo: String(x.cuando_listo ?? "").slice(0, 200),
      })),
      patron_detectado: doo.patron_detectado
        ? String(doo.patron_detectado).slice(0, 500)
        : undefined,
    },
    clasificacion_tareas: {
      del_dia: arr<Record<string, unknown>>(cl.del_dia).map((x) => ({
        id: x.id ? String(x.id).slice(0, 10) : undefined,
        titulo: String(x.titulo ?? "—").slice(0, 200),
        origen: x.origen ? String(x.origen).slice(0, 30) : undefined,
        tipo: x.tipo ? String(x.tipo).slice(0, 40) : undefined,
        bloque_energia: x.bloque_energia ? String(x.bloque_energia).slice(0, 30) : undefined,
        tiempo_min: typeof x.tiempo_min === "number" ? x.tiempo_min : undefined,
      })),
      pendientes_criticas: arr<Record<string, unknown>>(cl.pendientes_criticas).map((x) => ({
        titulo: String(x.titulo ?? "—").slice(0, 200),
        deadline: x.deadline ? String(x.deadline).slice(0, 40) : undefined,
        notas: x.notas ? String(x.notas).slice(0, 200) : undefined,
      })),
      programables: arr<Record<string, unknown>>(cl.programables).map((x) => ({
        titulo: String(x.titulo ?? "—").slice(0, 200),
        esfuerzo: x.esfuerzo ? String(x.esfuerzo).slice(0, 30) : undefined,
      })),
      backlog: arr<Record<string, unknown>>(cl.backlog).map((x) => ({
        titulo: String(x.titulo ?? "—").slice(0, 200),
      })),
    },
    recomendacion_estrategica: {
      vs_plan_largo: arr<Record<string, unknown>>(re.vs_plan_largo).map((x) => ({
        tarea: String(x.tarea ?? "—").slice(0, 200),
        meta: String(x.meta ?? "—").slice(0, 200),
        conexion: String(x.conexion ?? "").slice(0, 300),
      })),
      si_estancas: String(re.si_estancas ?? "").slice(0, 800),
      cierre_dia: arr<string>(re.cierre_dia).map((s) => String(s).slice(0, 400)),
    },
    notas: arr<Record<string, unknown>>(r.notas).map((x) => ({
      titulo: String(x.titulo ?? "—").slice(0, 200),
      texto: String(x.texto ?? "").slice(0, 1500),
    })),
    comida: {
      plato_base_desayuno: platoBaseDe(com.plato_base_desayuno),
      plato_base_comida: platoBaseDe(com.plato_base_comida),
      cambio_20_80: {
        propuesto: String((com.cambio_20_80 as Record<string, unknown>)?.propuesto ?? "").slice(0, 300),
        impacto: String((com.cambio_20_80 as Record<string, unknown>)?.impacto ?? "").slice(0, 300),
        implementacion: String((com.cambio_20_80 as Record<string, unknown>)?.implementacion ?? "").slice(0, 300),
      },
      merienda: String(com.merienda ?? "").slice(0, 400),
      cena: String(com.cena ?? "").slice(0, 400),
      menu_familiar: arr<Record<string, unknown>>(com.menu_familiar).map((x) => ({
        dia: String(x.dia ?? "—").slice(0, 30),
        comida: String(x.comida ?? "—").slice(0, 200),
        cena: String(x.cena ?? "—").slice(0, 200),
      })),
      lista_compra: arr<Record<string, unknown>>(com.lista_compra).map((x) => ({
        categoria: String(x.categoria ?? "—").slice(0, 60),
        items: String(x.items ?? "—").slice(0, 1000),
      })),
      plan_domingo: String(com.plan_domingo ?? "").slice(0, 1000),
    },
  };
}

function platoBaseDe(v: unknown) {
  const x = (v ?? {}) as Record<string, unknown>;
  return {
    estructura: String(x.estructura ?? "").slice(0, 400),
    tiempo: String(x.tiempo ?? "").slice(0, 60),
    variaciones: Array.isArray(x.variaciones)
      ? (x.variaciones as unknown[]).map((s) => String(s).slice(0, 200))
      : [],
    base_metabolica: String(x.base_metabolica ?? "").slice(0, 600),
  };
}

// ----------------------------------------------------------------------------
// Conversión InformePlan → Markdown (estilo agente local)
// ----------------------------------------------------------------------------

export function informeToMarkdown(
  fecha: string,
  fechaLarga: string,
  informe: InformePlan,
  semaforo: string,
  despertar: string | null,
  mente: string | null,
  cuerpo: string | null,
  rueda: string | null,
  necesidad: string | null,
  resumen: string | null,
  recomendacion: string | null,
  notasUsuario: string | null,
  reflexionUsuario: string | null,
): string {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(`# 📅 Planificación Diaria — ${fechaLarga}`);
  push();
  push(`> ${informe.cabecera.replace(/\\n/g, " ").trim()}`);
  push();

  push(`## 🌡️ Tu Estado Hoy`);
  push();
  push(`**Semáforo:** ${semaforoEmoji(semaforo)} **${semaforo.toUpperCase()}**${informe.estado_hoy.dias_seguidos ? ` (sostenido desde — ${informe.estado_hoy.dias_seguidos} días)` : ""}`);
  push();
  push(`| Campo | Valor |`);
  push(`|:------|:------|`);
  for (const f of informe.estado_hoy.tabla) {
    push(`| **${f.campo}** | ${f.emoji} ${f.valor} |`);
  }
  push();
  if (informe.estado_hoy.conexion_emocional) {
    push(`**Conexión emocional:** ${informe.estado_hoy.conexion_emocional}`);
    push();
  }

  if (informe.tendencia.registros.length > 0) {
    push(`## 📈 Tendencia vs últimos registros`);
    push();
    push(`| Indicador | ${informe.tendencia.registros.map((r) => r.fecha).join(" | ")} | Tendencia |`);
    push(`|:----------|${informe.tendencia.registros.map(() => ":-----:").join("|")}|:---------:|`);
    const campos = ["despertar", "mente", "cuerpo", "rueda", "necesita"] as const;
    for (const c of campos) {
      const vals = informe.tendencia.registros.map((r) => {
        const rec = r as unknown as Record<string, unknown>;
        return String(rec[c] ?? "—");
      });
      const tend = informe.tendencia.registros[informe.tendencia.registros.length - 1]?.tendencia_despertar ?? "—";
      push(`| ${capitalizar(c)} | ${vals.join(" | ")} | ${tend} |`);
    }
    const sems = informe.tendencia.registros.map((r) => r.semaforo);
    push(`| Semáforo | ${sems.join(" | ")} | |`);
    push();
    if (informe.tendencia.lectura) {
      push(`**Lectura:** ${informe.tendencia.lectura}`);
      push();
    }
  }

  push(`## 🧠 Lectura Psicológica`);
  push();
  if (informe.lectura_psicologica.estado_actual) {
    push(`### Estado actual`);
    push();
    push(informe.lectura_psicologica.estado_actual);
    push();
  }
  if (informe.lectura_psicologica.analisis_emocional) {
    push(`### Análisis emocional`);
    push();
    push(informe.lectura_psicologica.analisis_emocional);
    push();
  }
  if (informe.lectura_psicologica.recomendaciones_hoy.length > 0) {
    push(`### Recomendación psicológica`);
    push();
    informe.lectura_psicologica.recomendaciones_hoy.forEach((r, i) => push(`${i + 1}. ${r}`));
    push();
  }
  if (informe.lectura_psicologica.si_sobrepasado.length > 0) {
    push(`**Si te sentís sobrepasado en cualquier momento del día:**`);
    informe.lectura_psicologica.si_sobrepasado.forEach((r) => push(`- ${r}`));
    push();
  }
  if (informe.lectura_psicologica.si_cuerpo_empeora.length > 0) {
    push(`**Si el cuerpo empeora antes de las 17:00:**`);
    informe.lectura_psicologica.si_cuerpo_empeora.forEach((r) => push(`- ${r}`));
    push();
  }
  if (informe.lectura_psicologica.para_esta_semana.length > 0) {
    push(`**Para tener en cuenta (esta semana):**`);
    informe.lectura_psicologica.para_esta_semana.forEach((r) => push(`- ${r}`));
    push();
  }

  if (informe.conexion_tareas.analisis_realismo.length > 0) {
    push(`## 🎯 Cómo afecta a tus tareas`);
    push();
    push(`### Análisis de realismo (${semaforoEmoji(semaforo)} ${semaforo.toUpperCase()})`);
    push();
    push(`| Tarea reportada | ¿Realista hoy? | Por qué | Acción |`);
    push(`|:----------------|:--------------:|:--------|:-------|`);
    for (const x of informe.conexion_tareas.analisis_realismo) {
      push(`| ${x.tarea}${x.origen ? ` (${x.origen})` : ""} | ${x.realista_hoy === "si" ? "✅ Sí" : x.realista_hoy === "si_condiciones" ? "⚠️ Con condiciones" : "❌ No"} | ${x.por_que} | ${x.accion} |`);
    }
    push();
    if (informe.conexion_tareas.justificacion_3_tareas) {
      push(informe.conexion_tareas.justificacion_3_tareas);
      push();
    }
  }

  push(`## 📋 Tu Día Optimizado`);
  push();
  if (informe.dia_optimizado.energia_disponible) {
    push(`**ENERGÍA DISPONIBLE:** ${informe.dia_optimizado.energia_disponible}`);
    push();
  }
  if (informe.dia_optimizado.principio_hoy) {
    push(`**Principio hoy:** *${informe.dia_optimizado.principio_hoy}*`);
    push();
  }
  if (informe.dia_optimizado.horario.length > 0) {
    push(`| Horario | Bloque | Tarea | Por qué |`);
    push(`|:--------|:-------|:------|:--------|`);
    for (const h of informe.dia_optimizado.horario) {
      push(`| ${h.horario} | ${h.bloque} | ${h.tarea} | ${h.por_que} |`);
    }
    push();
  }
  if (informe.dia_optimizado.delegacion_ia.length > 0) {
    push(`**Delegación IA (lo que puedo hacer yo):**`);
    informe.dia_optimizado.delegacion_ia.forEach((d) => push(`- 🔧 ${d.que} — ${d.cuando_listo}`));
    push();
  }

  if (informe.clasificacion_tareas.del_dia.length > 0) {
    push(`## 📊 Clasificación de Todas las Tareas`);
    push();
    push(`### 🔴 Tareas del día (${informe.clasificacion_tareas.del_dia.length})`);
    push();
    push(`| # | Tarea | Origen | Tipo | Bloque Energía | Tiempo |`);
    push(`|:-:|:------|:-------|:-----|:---------------|:------:|`);
    informe.clasificacion_tareas.del_dia.forEach((t, i) => {
      push(`| **${t.id ?? `T${i + 1}`}** | ${t.titulo} | ${t.origen ?? "—"} | ${t.tipo ?? "—"} | ${t.bloque_energia ?? "—"} | ${t.tiempo_min ? `${t.tiempo_min} min` : "—"} |`);
    });
    push();
  }
  if (informe.clasificacion_tareas.pendientes_criticas.length > 0) {
    push(`### 🟠 Pendientes críticas (próximos 7 días)`);
    push();
    push(`| Tarea | Deadline | Notas |`);
    push(`|:------|:---------|:------|`);
    informe.clasificacion_tareas.pendientes_criticas.forEach((t) => {
      push(`| ${t.titulo} | ${t.deadline ?? "—"} | ${t.notas ?? "—"} |`);
    });
    push();
  }
  if (informe.clasificacion_tareas.programables.length > 0) {
    push(`### 🟡 Programables (próxima semana)`);
    push();
    push(`| Tarea | Esfuerzo |`);
    push(`|:------|:--------:|`);
    informe.clasificacion_tareas.programables.forEach((t) => push(`| ${t.titulo} | ${t.esfuerzo ?? "—"} |`));
    push();
  }
  if (informe.clasificacion_tareas.backlog.length > 0) {
    push(`### ⚪ Backlog`);
    informe.clasificacion_tareas.backlog.forEach((t) => push(`- ${t.titulo}`));
    push();
  }

  if (informe.recomendacion_estrategica.vs_plan_largo.length > 0) {
    push(`## 🎯 Recomendación Estratégica del Día`);
    push();
    push(`### vs Plan a largo plazo`);
    push();
    push(`| Tarea de hoy | Meta estratégica | Conexión |`);
    push(`|:------------|:-----------------|:---------|`);
    informe.recomendacion_estrategica.vs_plan_largo.forEach((r) => {
      push(`| ${r.tarea} | ${r.meta} | ${r.conexion} |`);
    });
    push();
  }
  if (informe.recomendacion_estrategica.si_estancas) {
    push(`### Si te estancás`);
    push();
    push(informe.recomendacion_estrategica.si_estancas);
    push();
  }
  if (informe.recomendacion_estrategica.cierre_dia.length > 0) {
    push(`### Cierre del día`);
    informe.recomendacion_estrategica.cierre_dia.forEach((c) => push(`- [ ] ${c}`));
    push();
  }

  if (informe.notas.length > 0) {
    push(`## 📝 Notas`);
    push();
    informe.notas.forEach((n, i) => {
      push(`### ${i + 1}. ${n.titulo}`);
      push();
      push(n.texto);
      push();
    });
  }

  if (reflexionUsuario?.trim()) {
    push(`## 💭 Reflexión del usuario (input)`);
    push();
    push(reflexionUsuario.trim());
    push();
  }

  push(`## 🍽️ Propuesta de Comida`);
  push();
  push(`### 🥗 Plato Base 1 — Desayuno`);
  push(`- **Estructura:** ${informe.comida.plato_base_desayuno.estructura}`);
  push(`- **Tiempo:** ${informe.comida.plato_base_desayuno.tiempo}`);
  push(`- **Variaciones:**`);
  informe.comida.plato_base_desayuno.variaciones.forEach((v) => push(`  - ${v}`));
  push(`- **Base metabólica:** ${informe.comida.plato_base_desayuno.base_metabolica}`);
  push();
  push(`### 🥗 Plato Base 2 — Comida`);
  push(`- **Estructura:** ${informe.comida.plato_base_comida.estructura}`);
  push(`- **Tiempo:** ${informe.comida.plato_base_comida.tiempo}`);
  push(`- **Variaciones:**`);
  informe.comida.plato_base_comida.variaciones.forEach((v) => push(`  - ${v}`));
  push(`- **Base metabólica:** ${informe.comida.plato_base_comida.base_metabolica}`);
  push();
  if (informe.comida.cambio_20_80.propuesto) {
    push(`### 🎯 Cambio 20/80`);
    push(`- **Propuesto:** ${informe.comida.cambio_20_80.propuesto}`);
    push(`- **Impacto:** ${informe.comida.cambio_20_80.impacto}`);
    push(`- **Implementación:** ${informe.comida.cambio_20_80.implementacion}`);
    push();
  }
  if (informe.comida.merienda) {
    push(`### 🥜 Merienda`);
    push(informe.comida.merienda);
    push();
  }
  if (informe.comida.cena) {
    push(`### 🍲 Cena`);
    push(informe.comida.cena);
    push();
  }

  if (informe.comida.menu_familiar.length > 0) {
    push(`### 🍴 Menú Familiar (MAÑANA y resto de semana)`);
    push();
    push(`| Día | Comida | Cena |`);
    push(`|:----|:-------|:-----|`);
    informe.comida.menu_familiar.forEach((m) => push(`| **${m.dia}** | ${m.comida} | ${m.cena} |`));
    push();
  }

  if (informe.comida.lista_compra.length > 0) {
    push(`### 🛒 Lista de la Compra`);
    push();
    informe.comida.lista_compra.forEach((l) => {
      push(`**${l.categoria}**`);
      push(l.items);
      push();
    });
  }

  if (informe.comida.plan_domingo) {
    push(`### 📋 Plan Domingo (batch cooking)`);
    push();
    push(informe.comida.plan_domingo);
    push();
  }

  if (resumen || recomendacion) {
    push(`---`);
    push();
    push(`## 📋 Resumen ejecutivo (vista rápida)`);
    push();
    if (resumen) {
      push(`**Resumen:** ${resumen}`);
      push();
    }
    if (recomendacion) {
      push(`**Recomendación:** ${recomendacion}`);
      push();
    }
  }

  if (notasUsuario?.trim()) {
    push(`---`);
    push();
    push(`## 📓 Notas del día (escritas al final)`);
    push();
    push(notasUsuario.trim());
    push();
  }

  push(`---`);
  push();
  push(`*Planificación generada con perfil ${semaforoEmoji(semaforo)} ${semaforo.toUpperCase()}.*`);
  push(`*Sub-agentes simulados (1 llamada consolidada): análisis-psicológico, metabolismo, nutricion-familiar.*`);
  push(`*Fecha generación: ${fecha}.*`);
  push();

  return lines.join("\n");
}

function semaforoEmoji(s: string): string {
  if (s === "verde") return "🟢";
  if (s === "amarillo") return "🟡";
  return "🔴";
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

export async function generarPlan(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: GenerarPlanOpts,
): Promise<PlanGeneradoLigero> {
  const prompt = buildPrompt(opts);

  const parsed = await llamarLLM<unknown>(
    baseUrl,
    apiKey,
    model,
    "Eres un asistente que responde SOLO con JSON válido, sin texto fuera.",
    prompt,
    true,
  );

  const informe = sanearInforme(parsed, opts.fecha, opts.historial ?? []);

  // Construye la "versión ligera" que usa la UI para feedback inmediato
  const semaforo = informe.estado_hoy.semaforo;
  const tareas: TareaPlan[] = informe.clasificacion_tareas.del_dia.slice(0, 3).map((t) => ({
    tipo: "imprescindible" as const,
    titulo_libre: t.titulo,
    bloque_energia: (["regular", "estrategia", "ejecucion", "mecanica"] as const).includes(
      (t.bloque_energia ?? "").toLowerCase() as never,
    )
      ? ((t.bloque_energia ?? "").toLowerCase() as TareaPlan["bloque_energia"])
      : null,
    bloque_cognitivo: null,
    es_ia: false,
    subtareas: [],
  }));

  const resumen =
    informe.estado_hoy.conexion_emocional ||
    informe.lectura_psicologica.estado_actual ||
    "Plan generado.";
  const recomendacion =
    informe.dia_optimizado.principio_hoy ||
    informe.lectura_psicologica.recomendaciones_hoy[0] ||
    "Mantén el plan y revisa al final del día.";

  return {
    semaforo,
    resumen: resumen.slice(0, 1000),
    recomendacion: recomendacion.slice(0, 1000),
    tareas,
    informe,
  };
}

export async function redactarBorrador(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: RedactarOpts,
): Promise<{asunto: string; cuerpo: string; prompt_usado: string}> {
  const prompt = buildPromptRedactar(opts);
  const parsed = await llamarLLM<{asunto?: string; cuerpo?: string}>(
    baseUrl,
    apiKey,
    model,
    "Eres un redactor. Respondes SOLO con JSON válido.",
    prompt,
    true,
  );
  return {
    asunto: String(parsed.asunto ?? "").slice(0, 200),
    cuerpo: String(parsed.cuerpo ?? "").slice(0, 4000),
    prompt_usado: prompt,
  };
}

export async function probarConexion(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<void> {
  const res = await fetch(endpoint(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "Minimax-M3",
      messages: [{ role: "user", content: "Responde SOLO con el JSON: {\"ok\":true}" }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${t.slice(0, 160)}`);
  }
}


// ============================================================================
// Desgranar tarea al máximo (IA) — restaurado para no romper TasksTable
// ============================================================================

export type DesgranarOpts = {
  titulo: string;
  descripcion?: string | null;
  notas?: string | null;
  subtareasPrevias?: Subtarea[] | null;
  minPasos?: number;
  maxPasos?: number;
};

export type DesgranarResultado = {
  subtareas: Subtarea[];
  prompt_usado: string;
};

function buildPromptDesgranar(opts: DesgranarOpts): string {
  const min = opts.minPasos ?? 5;
  const max = opts.maxPasos ?? 15;
  const desc = opts.descripcion?.trim();
  const notas = opts.notas?.trim();
  const previas = (opts.subtareasPrevias ?? []).filter(
    (s) => s.descripcion && !s.hecho,
  );

  return `Eres el asistente operativo de David. Tu trabajo es DESGRANAR UNA TAREA al MÁXIMO POSIBLE en micro-pasos accionables.

TAREA:
Titulo: ${opts.titulo}
${desc ? `Descripcion: ${desc}` : ""}
${notas ? `Notas: ${notas}` : ""}
${previas.length > 0 ? `Subtareas previas (mejoralas o reemplazalas):\n${previas.map((p, i) => `  ${i + 1}. ${p.descripcion}`).join("\n")}` : ""}

REGLAS:
1. ENTRE ${min} Y ${max} micro-pasos.
2. Cada paso = UNA accion fisica o cognitiva concreta y verificable.
3. Cada paso <= 5 minutos.
4. PRIMERA PERSONA, imperativo: "Abrir...", "Escribir...", "Llamar...".
5. ORDEN DE EJECUCION real.
6. PRIMER paso = preparar material/contexto si aplica.
7. ULTIMO paso = cierre ("Marcar tarea como hecha").

FORMATO — JSON ESTRICTO sin texto fuera:
{
  "subtareas": [
    { "descripcion": "<verbo + objeto concreto>", "tiempo_estimado_min": <entero 1-5> }
  ]
}`;
}

export async function desgranarTareaIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: DesgranarOpts,
): Promise<DesgranarResultado> {
  const prompt = buildPromptDesgranar(opts);
  const parsed = await llamarLLM<{ subtareas?: Array<{ descripcion?: unknown; tiempo_estimado_min?: unknown }> }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON valido.",
    prompt,
    true,
  );

  const min = opts.minPasos ?? 5;
  const max = opts.maxPasos ?? 15;
  const raw = Array.isArray(parsed?.subtareas) ? parsed.subtareas : [];
  const subtareas: Subtarea[] = [];
  for (const s of raw) {
    const desc = typeof s?.descripcion === "string" ? s.descripcion.trim() : "";
    if (!desc) continue;
    const t = Number(s?.tiempo_estimado_min);
    const tiempo = Number.isFinite(t) && t >= 1 && t <= 5 ? Math.round(t) : 5;
    subtareas.push({
      descripcion: desc.slice(0, 280),
      tiempo_estimado_min: tiempo,
      hecho: false,
    });
  }

  const capped = subtareas.slice(0, max);
  if (capped.length < min && subtareas.length >= min) {
    return { subtareas, prompt_usado: prompt };
  }
  return { subtareas: capped, prompt_usado: prompt };
}


// ============================================================================
// Criterio de terminación — "Esta tarea está HECHA cuando..."
// ============================================================================
// Es una sola línea. Ataca el problema de "se me quedan a medias":
// si no puedes escribirla, no es una tarea — es un proyecto.

export type CriterioTerminacionOpts = {
  titulo: string;
  descripcion?: string | null;
  notas?: string | null;
  /** Lo que ya haya escrito el usuario, si lo hay. Se pasa para mantenerlo o mejorarlo, nunca para "machacarlo". */
  criterioPrevio?: string | null;
};

export type CriterioTerminacionResultado = {
  criterio_terminacion: string | null;
  prompt_usado: string;
};

function buildPromptCriterio(opts: CriterioTerminacionOpts): string {
  const desc = opts.descripcion?.trim();
  const notas = opts.notas?.trim();
  const previo = opts.criterioPrevio?.trim();

  return `Eres el asistente operativo de David. Tu ÚNICO trabajo aquí es escribir UNA SOLA LÍNEA describiendo cuándo la tarea está TERMINADA.

TAREA:
Titulo: ${opts.titulo}
${desc ? `Descripcion: ${desc}` : ""}
${notas ? `Notas: ${notas}` : ""}

==========
LA REGLA (léela 2 veces)
==========
Esta regla ataca el "se me quedan a medias". Para CADA tarea que sobrevive, escribe una sola línea:

  "Esta tarea está HECHA cuando ______________."

Ejemplos:
  - "Hacer la declaración de la renta" → "Tarea hecha cuando haya enviado el borrador al gestor por WhatsApp"
  - "Resolver tema facturas" → "Hecha cuando haya subido las 3 facturas pendientes al banco online y hecho la captura de pantalla"
  - "Llamar al gestor" → "Hecha cuando haya colgado y anotado lo que me ha dicho en 2 líneas"

REGLAS DE ORO:
1. UNA SOLA línea. Sin puntos suspensivos. Sin "etc."
2. COMIENZA exactamente con "Esta tarea está HECHA cuando " (o "Hecha cuando " si es muy corta).
3. EXPRÉSALO en hechos observables (qué queda hecho, dónde, qué prueba de que se hizo).
4. Si el título es un PROYECTO grande ("montar la web", "reformar la cocina"), NO lo conviertas en un proyecto a medias. Devuelve EXACTAMENTE el string: "__ES_PROYECTO__" (esto permitirá que David lo parta en trozos).
5. Sé concreto: incluye el "dónde", "a quién", "con qué herramienta" si aplica.
${previo ? `6. Ya hay un borrador previo. MEJÓRALO si es vago, o devuélvelo tal cual si ya cumple la regla. Previo: "${previo}"` : ""}

FORMATO — JSON ESTRICTO sin texto fuera:
{
  "criterio_terminacion": "<la frase, o '__ES_PROYECTO__' si es un proyecto>"
}`;
}

export async function generarCriterioTerminacionIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: CriterioTerminacionOpts,
): Promise<CriterioTerminacionResultado> {
  const prompt = buildPromptCriterio(opts);
  const parsed = await llamarLLM<{ criterio_terminacion?: unknown }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON valido.",
    prompt,
    true,
  );

  let criterio: string | null = null;
  const raw = typeof parsed?.criterio_terminacion === "string" ? parsed.criterio_terminacion.trim() : "";
  if (raw && raw !== "__ES_PROYECTO__") {
    criterio = raw.slice(0, 400);
  }

  return { criterio_terminacion: criterio, prompt_usado: prompt };
}


// ============================================================================
// Generador de plan trimestral completo para una META nueva
// ----------------------------------------------------------------------------
// Dada la descripción de una meta (título, descripción, plazo, ámbito),
// devuelve KRs por trimestre + tareas concretas para cada KR. Pensado para
// el botón "✨ Generar plan con IA" en /metas/nueva.
// ============================================================================

export type KrGenerado = {
  /** Unidad temporal del KR (`trimestre` 1..4 o `mes` 1..12). A partir
   *  de la migration 0025, una meta puede planificar por meses cuando su
   *  rango es menor que un trimestre o no encaja en 4 casillas. */
  unidad_tiempo: "trimestre" | "mes";
  /** Trimestre al que pertenece el KR (1..4). Solo si `unidad_tiempo === 'trimestre'`. */
  trimestre?: 1 | 2 | 3 | 4;
  /** Mes al que pertenece el KR (1..12). Solo si `unidad_tiempo === 'mes'`. */
  mes?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  titulo: string;
  descripcion: string;
  metrica: string;
  valor_objetivo: number;
  unidad: string;
  peso: number;
  tareas: TareaGenerada[];
};

export type TareaGenerada = {
  titulo: string;
  descripcion?: string | null;
  prioridad: "critica" | "alta" | "media" | "baja";
  /** Si es hábito: "diaria", "semanal" o "mensual". Si es puntual: null. */
  recurrencia_tipo: "diaria" | "semanal" | "mensual" | null;
  /** Días de la semana cuando es 'semanal' (0=Dom..6=Sáb). */
  recurrencia_dias_semana: number[] | null;
  /** Día del mes (1..28) cuando es 'mensual'. */
  recurrencia_dia_mes: number | null;
  /** Frase corta "Esta tarea está HECHA cuando ___". Opcional. */
  criterio_terminacion: string | null;
};

export type PlanMetaGenerado = {
  /** Lista de unidades temporales usadas (ordenadas). Tri mestres (1..4)
   *  y/o meses (1..12) según cómo se planificó la meta. */
  unidades_usadas: Array<{ unidad: "trimestre" | "mes"; numero: number }>;
  krs: KrGenerado[];
  prompt_usado: string;
};

/** Mes calendario con fechas reales y nombre legible. La migración 0025
 *  deja que el planificador trabaje con meses sueltos dentro del rango de
 *  la meta — no fuerza los 4 trimestres gregorianos. */
export type MesDisponible = {
  unidad: "mes";
  numero: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  nombre: string; // p.ej. "Mayo 2026"
  fecha_inicio: string; // YYYY-MM-DD (primer día del mes)
  fecha_fin: string; // YYYY-MM-DD (último día del mes)
};

export type TrimestreDisponible = {
  unidad: "trimestre";
  numero: 1 | 2 | 3 | 4;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
};

export type UnidadDisponible = MesDisponible | TrimestreDisponible;

export type GenerarPlanMetaOpts = {
  meta_titulo: string;
  meta_descripcion?: string | null;
  meta_ambito?: "personal" | "profesional" | null;
  meta_plazo?: string | null;
  /** Trimestres disponibles (1..4) con nombre legible. Se mantiene por
   *  compatibilidad: si no se pasa `unidades_disponibles`, se usa este.
   *  @deprecated desde migration 0025 — usar `unidades_disponibles`. */
  trimestres_disponibles?: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>;
  /** Lista de unidades (trimestres o meses) en las que la meta puede
   *  planificar. Si se omite, se construye a partir de `unidades_objetivo`
   *  o `trimestres_objetivo` (compat). */
  unidades_disponibles?: UnidadDisponible[];
  /** Trimestres objetivo derivados del campo `plazo` (compat). Si se
   *  omite y no hay `unidades_objetivo`, se usan TODOS los disponibles. */
  trimestres_objetivo?: Array<1 | 2 | 3 | 4>;
  /** Meses objetivo (1..12) — alternative moderna a `trimestres_objetivo`.
   *  Lo calcula `parsearMesesDeRango()` en el caller a partir de
   *  `fecha_inicio_meta` y `fecha_objetivo`. */
  unidades_objetivo?: Array<{ unidad: "trimestre" | "mes"; numero: number }>;
  /** Migration 0025: fecha en que David puede empezar (default = hoy). */
  fecha_inicio_meta?: string | null;
  /** Migration 0025: fecha dura de finalización (reusamos fecha_objetivo). */
  fecha_objetivo?: string | null;
  /** Migration 0025: si true, el prompt trata fecha_objetivo como HARD
   *  constraint — nada se planifica después. */
  fecha_fin_bloqueada?: boolean;
  anio: number;
  /** Cuántos KRs por unidad (defecto 3). */
  krs_por_trimestre?: number;
  /** Contexto del proyecto padre (si la meta está dentro de un proyecto).
   *  Permite que la IA entienda el negocio y no malinterprete palabras
   *  ambiguas. Ej: "Mapear 3 alternativas al local actual" en un proyecto
   *  de pizzería → busca locales comerciales para pizzería, no bares
   *  genéricos. */
  contexto_proyecto?: string | null;
};

/** Variante del agente: parte de un contexto libre y la IA propone el nombre
 *  y descripción de la meta además del plan. La diferencia con
 *  `generarPlanMetaIA` es que aquí NO se asume meta pre-existente. */
export type GenerarMetaYPlanOpts = {
  /** Contexto libre en primera persona: lo que David quiere conseguir. */
  contexto: string;
  /** Restricciones duras que David mencionó (TDAH, ansiedad, lesiones, etc.). */
  restricciones?: string[];
  meta_ambito?: "personal" | "profesional" | null;
  meta_plazo?: string | null;
  /** @deprecated desde migration 0025 — usar `unidades_disponibles`. */
  trimestres_disponibles: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>;
  /** Lista moderna de unidades (trimestres o meses). Si se omite, se
   *  construye a partir de `trimestres_disponibles` (compat). */
  unidades_disponibles?: UnidadDisponible[];
  /** Meses objetivo (1..12) — alternative moderna a `trimestres_objetivo`.
   *  Lo calcula `parsearMesesDeRango()` en el caller a partir de
   *  `fecha_inicio_meta` y `fecha_objetivo`. */
  unidades_objetivo?: Array<{ unidad: "trimestre" | "mes"; numero: number }>;
  /** Migration 0025: fechas reales para que la IA deduzca plazo concreto. */
  fecha_inicio_meta?: string | null;
  fecha_objetivo?: string | null;
  fecha_fin_bloqueada?: boolean;
  anio: number;
  krs_por_trimestre?: number;
};

// ============================================================================
// parsearTrimestresDePlazo
// ----------------------------------------------------------------------------
// Interpreta el campo libre `plazo` ("Q3 2026", "Q1-Q3", "fin de 2026",
// "trimestre 3", "12 meses", etc.) y devuelve el conjunto de trimestres
// (1..4) a los que aplica.
//
// Formatos soportados:
//   · "Q3", "Q3 2026", "2026-Q3", "T3"           → [3]
//   · "trimestre 3"                              → [3]
//   · "Q1-Q3", "Q1 a Q3", "Q1 al Q3", "Q1→Q3"    → [1, 2, 3]
//   · "Q1+Q3", "Q1, Q3", "Q1 y Q3"               → [1, 3]
//   · "primer trimestre", "principio de 2026"    → [1]
//   · "último trimestre", "fin de 2026"          → [4]
//   · "medio de 2026"                            → [2, 3]
//   · "12 meses", "2026", texto libre sin Q/T   → [1, 2, 3, 4] (fallback)
//
// Si la entrada es null/undefined/espacios, devuelve los 4 trimestres
// (compatibilidad con el comportamiento previo: si no hay plazo, se
// cubren los 4 trimestres por defecto).
// ============================================================================
export function parsearTrimestresDePlazo(
  plazo: string | null | undefined,
): Array<1 | 2 | 3 | 4> {
  if (!plazo || !plazo.trim()) return [1, 2, 3, 4];
  // Quitamos diacríticos para que el flag `i` no se confunda con "ú" vs "u".
  // "último" → "ultimo", "año" → "ano".
  const t = sinAcentos(plazo.trim());

  // Frases hechas (heurísticas). Orden importa: las más específicas primero.
  // Importante: NO incluir "1 trimestre" como frase hecha — eso es solo
  // una mención de Q1 (lo captura el recolector general más abajo).
  if (/\b(primer|primero|primera)\s+trimestre\b/.test(t)) return [1];
  if (/\b(ultimo|ultima)\s+trimestre\b/.test(t)) return [4];
  if (/\b(segundo|segunda)\s+trimestre\b/.test(t)) return [2];
  if (/\b(tercer|tercera)\s+trimestre\b/.test(t)) return [3];
  if (/\b(principio|inicio|arranque)\s+de\s+(ano|2\d{3})/.test(t)) return [1];
  if (/\bfin\s+de\s+(ano|2\d{3})/.test(t)) return [4];
  if (/\bmedio\s+(de|del)\s+(ano|2\d{3})/.test(t)) return [2, 3];
  // Ordinales explícitos: "1º trimestre", "1o trimestre", "2º y 3º trimestre".
  // Se ACUMULAN todos en vez de devolver en el primero: antes el early-return
  // cogía solo "3º trimestre" y "2º y 3º trimestre" devolvía [3], perdiendo el
  // Q2 entero de los KRs que genera /metas/nueva.
  const individuos = new Set<number>();
  let mm: RegExpExecArray | null;
  if (/trimestre/.test(t)) {
    const reOrd = /(\d+)\s*[º°o](?=\s|$)/g;
    while ((mm = reOrd.exec(t)) !== null) {
      const n = Number(mm[1]);
      if (n >= 1 && n <= 4) individuos.add(n);
    }
  }

  // Recolectar menciones individuales: Q1..Q4, T1..T4, "trimestre N".
  const reQt = /[qt]([1-4])/gi;
  while ((mm = reQt.exec(t)) !== null) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= 4) individuos.add(n);
  }
  // "trimestre 3", "trimestres 2 y 3", "trimestre 2 al 4": el plural y las
  // listas importan — "trimestres 2 y 3" antes no casaba con `trimestre\s*`
  // (la "s" de golpeaba el regex) y caía al fallback de los 4 trimestres.
  const reTrim = /trimestres?\s*([1-4](?:\s*(?:,|y|e|a|al|-)\s*[1-4])*)/gi;
  while ((mm = reTrim.exec(t)) !== null) {
    for (const dig of mm[1].match(/[1-4]/g) ?? []) {
      const n = Number(dig);
      if (n >= 1 && n <= 4) individuos.add(n);
    }
  }

  if (individuos.size === 0) return [1, 2, 3, 4];

  // Detectar rangos explícitos: "Q1-Q3", "Q1 a Q3", "Q1 al Q3", "Q1→Q3".
  // Para trimestre: "trimestre 1 al 4", etc.
  const rangos: Array<[number, number]> = [];
  const reRangoQt =
    /[qt]([1-4])\s*(?:-|a\s+|al\s+|→\s*)[qt]?([1-4])/gi;
  while ((mm = reRangoQt.exec(t)) !== null) {
    const a = Number(mm[1]);
    const b = Number(mm[2]);
    if (a >= 1 && a <= 4 && b >= 1 && b <= 4) rangos.push([a, b]);
  }
  const reRangoTrim =
    /trimestre\s*([1-4])\s*(?:-|a\s+|al\s+)(?:trimestre\s*)?([1-4])/gi;
  while ((mm = reRangoTrim.exec(t)) !== null) {
    const a = Number(mm[1]);
    const b = Number(mm[2]);
    if (a >= 1 && a <= 4 && b >= 1 && b <= 4) rangos.push([a, b]);
  }
  // Heurística final: si hay 2+ individuos y NO hay separador explícito
  // (+, ,, " y ", " e ") entre los dígitos, interpretamos como rango
  // continuo. Ej: "trimestre 1 trimestre 4", "Q3 Q4 2026".
  const tieneSeparador = /[,+]/.test(t) || /\s+[ye]\s+/.test(t);
  if (rangos.length === 0 && individuos.size >= 2 && !tieneSeparador) {
    const sorted = Array.from(individuos).sort((a, b) => a - b);
    rangos.push([sorted[0], sorted[sorted.length - 1]]);
  }

  // Combinar: expandimos rangos a {min..max} y añadimos individuos que
  // no caen dentro de ningún rango.
  const resultado = new Set<number>();
  for (const [a, b] of rangos) {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    for (let i = min; i <= max; i++) resultado.add(i);
  }
  for (const x of individuos) {
    let enRango = false;
    for (const [a, b] of rangos) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      if (x >= min && x <= max) {
        enRango = true;
        break;
      }
    }
    if (!enRango) resultado.add(x);
  }

  if (resultado.size === 0) return [1, 2, 3, 4];
  return Array.from(resultado).sort((a, b) => a - b) as Array<
    1 | 2 | 3 | 4
  >;
}

/** Quita diacríticos para que el flag `i` no se confunda entre
 *  "último" / "ultimo" o "año" / "ano". Se aplica sobre la copia
 *  local, no toca el input original. */
function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Migration 0025: devuelve el trimestre natural (1..4) del mes actual.
 *  ene-mar=1, abr-jun=2, jul-sep=3, oct-dic=4. Se usa como default
 *  cuando la IA no devuelve `kr_inicial.trimestre`. */
function trimestrePorNumeroDefault(): 1 | 2 | 3 | 4 {
  const m = new Date().getMonth() + 1; // 1..12
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

// ============================================================================
// parsearMesesDeRango — migration 0025
// ----------------------------------------------------------------------------
// Dado (fecha_inicio, fecha_objetivo, anio) devuelve el array de meses
// calendario en los que la meta puede planificar. Es la versión moderna
// de `parsearTrimestresDePlazo`: en lugar de trimestres sueltos, devuelve
// meses sueltos dentro del rango real de la meta.
//
// Reglas:
//   · Si fecha_inicio es null → usa hoy.
//   · Si fecha_objetivo es null → asume fin del año (`anio`-12-31) Y marca
//     la salida con `fin_abierto: true` para que el caller avise a la UI.
//   · Solo devuelve meses del calendario GREGORIANO. Si el rango cruza
//     años (ej. fecha_inicio=nov 2026, fecha_objetivo=feb 2027), devuelve
//     los meses de los dos años (nov-dic del anio y ene-feb del anio+1).
//   · Si el rango cabe en un solo mes, devuelve 1 mes. Si cabe en dos
//     semanas que cruzan dos meses, devuelve 2 meses. NO fuerza 4 ni 12.
//   · `meses` siempre viene ordenado por fecha ascendente.
// ============================================================================
export type MesDeRango = {
  unidad: "mes";
  numero: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  anio: number;
  nombre: string;
  fecha_inicio: string; // primer día del mes (YYYY-MM-DD)
  fecha_fin: string; // último día del mes (YYYY-MM-DD)
};

export type ParsearMesesResultado = {
  meses: MesDeRango[];
  /** True si la IA tuvo que proponer fecha_objetivo porque venía null. */
  fin_abierto: boolean;
  /** La fecha_inicio resuelta (puede diferir del input si era null). */
  fecha_inicio_efectiva: string;
  /** La fecha_fin resuelta (puede diferir del input si era null). */
  fecha_fin_efectiva: string;
};

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Devuelve el último día (28-31) de un mes del calendario gregoriano. */
function ultimoDiaDelMes(anio: number, mes: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12): number {
  // Truco: día 0 del mes siguiente = último día del mes pedido.
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYMD(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mo - 1, d));
}

export function parsearMesesDeRango(opts: {
  fecha_inicio: string | null | undefined;
  fecha_objetivo: string | null | undefined;
  anio: number;
  /** Fecha "hoy" en formato YYYY-MM-DD, hora local. Si no se pasa,
   *  `parsearMesesDeRango` usará la fecha del sistema. Pasarla es util
   *  en tests y para que la UI no dependa del reloj del cliente. */
  hoy?: string;
}): ParsearMesesResultado {
  const hoyLocal = opts.hoy ?? ymd(new Date());
  const fin_abierto = !opts.fecha_objetivo;

  // 1) Resolver fecha_inicio.
  const inicioInput = opts.fecha_inicio?.trim() || hoyLocal;
  let inicio = parseYMD(inicioInput);
  if (!inicio) inicio = parseYMD(hoyLocal) ?? new Date();

  // 2) Resolver fecha_fin.
  let finInput = opts.fecha_objetivo?.trim();
  let fin: Date | null = finInput ? parseYMD(finInput) : null;
  if (!fin) {
    // Fallback elegante: fin del anio actual.
    fin = new Date(Date.UTC(opts.anio, 11, 31));
    finInput = fin.toISOString().slice(0, 10);
  }

  // 3) Si el rango es inválido (fin < inicio), devolvemos solo el mes de inicio.
  if (fin.getTime() < inicio.getTime()) fin = new Date(inicio.getTime());

  // 4) Iterar mes a mes desde inicio hasta fin (inclusive).
  const meses: MesDeRango[] = [];
  const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  while (cursor.getTime() <= fin.getTime()) {
    const anioMes = cursor.getUTCFullYear();
    const num = (cursor.getUTCMonth() + 1) as MesDeRango["numero"];
    const inicioMes = new Date(Date.UTC(anioMes, num - 1, 1));
    const finMes = new Date(Date.UTC(anioMes, num - 1, ultimoDiaDelMes(anioMes, num)));
    meses.push({
      unidad: "mes",
      numero: num,
      anio: anioMes,
      nombre: `${NOMBRES_MES[num - 1]} ${anioMes}`,
      fecha_inicio: ymd(inicioMes),
      fecha_fin: ymd(finMes),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    // Salvaguarda: si por lo que sea el cursor no avanza (cambio de año
    // extremo), rompemos para no entrar en bucle infinito.
    if (meses.length > 24) break;
  }

  return {
    meses,
    fin_abierto,
    fecha_inicio_efectiva: ymd(inicio),
    fecha_fin_efectiva: ymd(fin),
  };
}

/** Resuelve la lista de unidades disponibles para una meta.
 *  - Si hay fechas (inicio + objetivo): meses del rango.
 *  - Si no: fallback a los 4 trimestres del año.
 *
 *  Es la ÚNICA fuente de verdad para `unidades_disponibles`: tanto
 *  `/agente` como `/metas/detalle` deben llamar a esta función.
 *  Hacerlo desde los dos sitios por separado era exactamente el bug
 *  que dejó la página de detalle descartando todos los KRs mensuales
 *  (`raw_krs=9, saneados=0, unidades_disponibles: undefined`).
 */
export function construirUnidadesParaPlan(opts: {
  fecha_inicio_meta?: string | null;
  fecha_objetivo?: string | null;
  anio: number;
  /** Si true, devuelve solo trimestres aunque haya fechas. Útil
   *  para metas personales sin plazo definido. Por defecto false. */
  forzarTrimestres?: boolean;
}): UnidadDisponible[] {
  const { fecha_inicio_meta, fecha_objetivo, anio, forzarTrimestres } = opts;

  if (!forzarTrimestres && fecha_inicio_meta && fecha_objetivo) {
    const rango = parsearMesesDeRango({
      fecha_inicio: fecha_inicio_meta,
      fecha_objetivo,
      anio,
    });
    if (rango.meses.length > 0) {
      return rango.meses.map<UnidadDisponible>((ms) => ({
        unidad: "mes",
        numero: ms.numero,
        nombre: ms.nombre,
        fecha_inicio: ms.fecha_inicio,
        fecha_fin: ms.fecha_fin,
      }));
    }
  }

  // Fallback: 4 trimestres del año.
  return [
    { unidad: "trimestre", numero: 1, nombre: `Q1 ${anio}`, fecha_inicio: "", fecha_fin: "" },
    { unidad: "trimestre", numero: 2, nombre: `Q2 ${anio}`, fecha_inicio: "", fecha_fin: "" },
    { unidad: "trimestre", numero: 3, nombre: `Q3 ${anio}`, fecha_inicio: "", fecha_fin: "" },
    { unidad: "trimestre", numero: 4, nombre: `Q4 ${anio}`, fecha_inicio: "", fecha_fin: "" },
  ];
}

export type MetaYPlanGenerado = {
  meta_titulo: string;
  meta_descripcion: string;
  meta_ambito: "personal" | "profesional" | null;
  meta_plazo: string | null;
  plan: PlanMetaGenerado;
  prompt_usado: string;
};

function buildPromptPlanMeta(opts: GenerarPlanMetaOpts): string {
  const krsXTrim = opts.krs_por_trimestre ?? 3;
  const desc = opts.meta_descripcion?.trim() || "(sin descripción)";
  const ambito = opts.meta_ambito || "(sin clasificar)";
  const plazo = opts.meta_plazo?.trim() || "(sin plazo concreto)";

  // —— (1) Resolver `unidadesVisibles` (meses o trimestres) ——
  // Migration 0025: el planificador puede recibir meses sueltos dentro del
  // rango real de la meta, no 4 trimestres a fuerza.
  let unidadesVisibles: UnidadDisponible[];
  if (opts.unidades_disponibles && opts.unidades_disponibles.length > 0) {
    unidadesVisibles = opts.unidades_disponibles;
    if (opts.unidades_objetivo && opts.unidades_objetivo.length > 0) {
      const set = new Set(
        opts.unidades_objetivo.map((u) => `${u.unidad}:${u.numero}`),
      );
      unidadesVisibles = unidadesVisibles.filter(
        (u) => set.has(`${u.unidad}:${u.numero}`),
      );
    }
  } else {
    // Compat: trimestres_disponibles / trimestres_objetivo (lo viejo).
    const trimestresBase = opts.trimestres_disponibles ?? [];
    let visibles = trimestresBase;
    if (opts.trimestres_objetivo && opts.trimestres_objetivo.length > 0) {
      const nums = new Set<number>(opts.trimestres_objetivo);
      visibles = trimestresBase.filter((t) => nums.has(t.numero));
    }
    unidadesVisibles = visibles.map<TrimestreDisponible>((t) => ({
      unidad: "trimestre",
      numero: t.numero as 1 | 2 | 3 | 4,
      nombre: t.nombre,
      fecha_inicio: "",
      fecha_fin: "",
    }));
  }

  const unidadesStr =
    unidadesVisibles.length > 0
      ? unidadesVisibles
          .map((u) =>
            u.unidad === "trimestre"
              ? `  - Q${u.numero} (${u.nombre})`
              : `  - ${u.nombre} (mes ${u.numero})`,
          )
          .join("\n")
      : "  (ninguna — revisa fechas de inicio/fin o el campo 'plazo')";

  const hayFiltro =
    unidadesVisibles.length > 0 &&
    (unidadesVisibles.length <
      (opts.unidades_disponibles?.length ??
        opts.trimestres_disponibles?.length ??
        4));

  // —— (2) Cabecera con fechas y bloqueo duro (migration 0025) ——
  const fechaInicioTxt = opts.fecha_inicio_meta?.trim()
    ? opts.fecha_inicio_meta
    : "hoy (no indicada)";
  const fechaFinTxt = opts.fecha_objetivo?.trim()
    ? opts.fecha_objetivo
    : "sin fecha dura — propón una mirando el alcance";
  const hardBlock = !!opts.fecha_fin_bloqueada;

  const todasSonMeses = unidadesVisibles.every((u) => u.unidad === "mes");
  const todasSonTrimestres = unidadesVisibles.every(
    (u) => u.unidad === "trimestre",
  );

  return `Eres un coach de OKR para David López. Tu trabajo: dado el contexto de una meta, generar el plan COMPLETO: KRs por unidad temporal + tareas/hábitos dentro de cada KR.

META DE DAVID:
  Título: ${opts.meta_titulo}
  Descripción: ${desc}
  Ámbito: ${ambito}
  Plazo: ${plazo}
  Año: ${opts.anio}
${opts.contexto_proyecto?.trim() ? `\nCONTEXTO DEL PROYECTO PADRE (si la meta está dentro de un proyecto, esto te dice QUÉ NEGOCIO y QUÉ SECTOR es — úsalo para interpretar correctamente palabras ambiguas de la meta. Ej: 'local' en un proyecto de pizzería = local comercial para pizzería, no un bar genérico):\n  ${opts.contexto_proyecto.trim().replace(/\n/g, "\n  ")}\n` : ""}

FECHAS REALES DE LA META (migration 0025):
  Fecha de inicio (David puede empezar): ${fechaInicioTxt}
  Fecha límite (deadline): ${fechaFinTxt}
  ${hardBlock ? "⚠️ FECHA LÍMITE DURA / BLOQUEADA — no planificar NADA después de esta fecha." : "Fecha límite orientativa (orientativa, no dura)."}

${
  todasSonMeses
    ? `MESES OBJETIVO${
        hayFiltro
          ? " (los únicos donde esta meta aplica — derivan del rango [inicio, fin]; NO generes nada fuera de esta lista):"
          : " (todos los del rango):"
      }`
    : todasSonTrimestres
      ? `TRIMESTRES OBJETIVO${
          hayFiltro
            ? " (los únicos donde esta meta aplica — derivan del campo 'plazo' arriba; NO generes nada fuera de esta lista):"
            : " (todos los del año actual):"
        }`
      : `UNIDADES OBJETIVO${
          hayFiltro
            ? " (mezcla de trimestres y meses — solo dentro de esta lista):"
            : " (todas las del rango):"
        }`
}
${unidadesStr}

==========
REGLAS (lelas 2 veces antes de generar)
==========
0. ${hayFiltro ? "REGLA DE PLAZO (CRÍTICA): SOLO puedes crear KRs dentro de las unidades listadas arriba. Si la fecha límite es Q3 2026, NO generes KRs fuera de esos meses/trimestres. Las demás unidades quedan vacías." : "Por defecto se cubre todo el rango de la meta (de inicio a fin). Si esto no encaja (meta muy pequeña), el caller habrá recortado la lista de arriba."}
${hardBlock ? "0b. HARD CONSTRAINT: NINGÚN KR puede planificar trabajo después de la fecha límite indicada. Si sobra alcance, indícalo en la sección 'notas' y muévelo a 'backlog' o 'no entra en plazo'." : ""}
1. Cada KR = un HITO MEDIBLE que, si se cumple, demuestra que la meta avanza / se alcanza. Redacta los KRs como "lo que tiene que ocurrir para considerar esta meta lograda".
2. Genera EXACTAMENTE ${krsXTrim} KRs por unidad listada. Más satura, menos es vago.
3. DENTRO de cada KR, añade 2-4 tareas concretas. Una tarea = una acción que se hace en ≤2 minutos de leerla sin ambigüedad. Si no se puede, es un proyecto, no una tarea.
5. Mezcla ~30% HABITOS (recurrencia_tipo no nulo) y ~70% tareas PUNTUALES (null). Los hábitos son cosas que David repite (meditar, caminar, registrar, tomar pastillas, etc.).
6. Para cada tarea incluye:
   - titulo: imperativo, ≤80 caracteres. Empieza con verbo.
   - prioridad: una de "critica" | "alta" | "media" | "baja".
   - recurrencia_tipo: "diaria" si se hace todos los días, "semanal" si se hace ciertos días, "mensual" si se hace una vez al mes, null si es puntual.
   - Si es semanal: recurrencia_dias_semana = array de enteros 0..6 (0=Dom, 1=Lun, ..., 6=Sáb). Si no se repite, null.
   - Si es mensual: recurrencia_dia_mes = entero 1..28. Si no se repite, null.
   - criterio_terminacion: una frase corta estilo "Esta tarea está HECHA cuando ___". O null.
7. KR:
   - titulo: ≤100 chars, específico y medible.
   - descripcion: 1-2 frases aclarando qué significa el KR.
   - metrica: nombre corto de la métrica (p.ej. "minutos de movimiento", "despertares por noche").
   - valor_objetivo: número realista para la unidad (p.ej. 15, 2, 80).
   - unidad: unidad de la métrica (p.ej. "min/día", "desp/noche", "% noches").
   - peso: 1 (por defecto). Puede ser 1.5-2 si el KR es más crítico.
8. Responde SOLO con JSON válido con esta estructura EXACTA:

{
  "unidades_usadas": [{"unidad": "trimestre", "numero": 2}, {"unidad": "mes", "numero": 5}],
  "krs": [
    {
      "unidad_tiempo": "trimestre",
      "trimestre": 2,
      "titulo": "...",
      "descripcion": "...",
      "metrica": "...",
      "valor_objetivo": 15,
      "unidad": "min/día",
      "peso": 1,
      "tareas": [
        {
          "titulo": "...",
          "descripcion": null,
          "prioridad": "alta",
          "recurrencia_tipo": "diaria",
          "recurrencia_dias_semana": null,
          "recurrencia_dia_mes": null,
          "criterio_terminacion": "..."
        }
      ]
    }
  ]
}

Notas de schema:
   · \`unidad_tiempo\` debe ser exactamente \`"trimestre"\` o \`"mes"\` (en minúsculas). Si es \`"trimestre"\`, el campo obligatorio es \`trimestre\` (1..4). Si es \`"mes"\`, el campo obligatorio es \`mes\` (1..12). NO mezcles.
   · \`unidades_usadas\` es un array con TODAS las unidades en las que generes al menos un KR.

Usa conocimiento común del dominio (salud, finanzas, negocios) si la meta es genérica. Si David mencionó restricciones en la descripción (TDAH, cervicales, ansiedad, etc.), respétalas ABSOLUTAMENTE.
`;
}

export async function generarPlanMetaIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: GenerarPlanMetaOpts,
): Promise<PlanMetaGenerado> {
  // Single source of truth: si el caller no pasó `unidades_disponibles`,
  // las derivamos aquí mismo. Esto garantiza que el prompt y el
  // saneador usen EXACTAMENTE la misma lista. Sin esto, un caller
  // que olvide pasar las unidades acaba con `saneados=0` aunque la
  // IA haya devuelto KRs válidos.
  const unidadesEfectivas: UnidadDisponible[] =
    opts.unidades_disponibles && opts.unidades_disponibles.length > 0
      ? opts.unidades_disponibles
      : construirUnidadesParaPlan({
          fecha_inicio_meta: opts.fecha_inicio_meta ?? null,
          fecha_objetivo: opts.fecha_objetivo ?? null,
          anio: opts.anio,
        });
  const prompt = buildPromptPlanMeta({
    ...opts,
    unidades_disponibles: unidadesEfectivas,
  });
  const { ESQUEMA_PLAN_META } = await import("./llm-parser");
  const parsed = await llamarLLM<{
    unidades_usadas?: unknown;
    krs?: unknown;
  }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
    ESQUEMA_PLAN_META,
  );

  const krs = saneKrsFromParsed(
    parsed?.krs,
    unidadesEfectivas,
    opts.trimestres_disponibles,
  );
  // Log brutal para diagnosticar: qué entró del LLM y qué salió saneado.
  if (typeof console !== "undefined") {
    const rawKrs = Array.isArray(parsed?.krs) ? parsed.krs : [];
    console.log(
      `[generarPlanMetaIA] "${opts.meta_titulo}": raw_krs=${rawKrs.length}, saneados=${krs.length}`,
    );
    if (rawKrs.length > 0 && krs.length === 0) {
      // Diagnóstico claro: qué unidades pidió la IA y cuáles aceptamos.
      const unidadesPedidas = new Set<string>();
      for (const k of rawKrs) {
        const ku = k as Record<string, unknown>;
        const ut = String(ku.unidad_tiempo ?? "").toLowerCase();
        if (ut === "mes" && typeof ku.mes === "number") {
          unidadesPedidas.add(`mes:${ku.mes}`);
        } else if (
          (ut === "trimestre" || ut === "trimestral") &&
          typeof ku.trimestre === "number"
        ) {
          unidadesPedidas.add(`trimestre:${ku.trimestre}`);
        }
      }
      const unidadesAceptadas = unidadesEfectivas.map(
        (u) => `${u.unidad}:${u.numero}`,
      );
      console.warn(
        `[generarPlanMetaIA] ⚠️ LA IA DEVOLVIÓ KRS PERO saneKrsFromParsed LOS RECHAZÓ TODOS.`,
      );
      console.warn(
        `[generarPlanMetaIA]   unidades que pidió la IA:`,
        JSON.stringify(Array.from(unidadesPedidas)),
      );
      console.warn(
        `[generarPlanMetaIA]   unidades aceptadas por el saneador:`,
        JSON.stringify(unidadesAceptadas),
      );
      console.warn(
        `[generarPlanMetaIA]   discrepancia: las unidades de la IA no están en las aceptadas. Causa probable: las fechas de la meta no abarcan esos meses, o la IA ignoró el prompt de unidades. Primer raw:`,
        JSON.stringify(rawKrs[0]).slice(0, 300),
      );
    }
  }
  const unidadesSet = new Set<string>();
  for (const k of krs) {
    if (k.unidad_tiempo === "mes" && typeof k.mes === "number") {
      unidadesSet.add(`mes:${k.mes}`);
    } else if (k.unidad_tiempo === "trimestre" && typeof k.trimestre === "number") {
      unidadesSet.add(`trimestre:${k.trimestre}`);
    }
  }
  const unidades_usadas = Array.from(unidadesSet)
    .map((s) => {
      const [u, n] = s.split(":");
      return { unidad: u as "trimestre" | "mes", numero: Number(n) };
    })
    .sort((a, b) => {
      // Orden estable: por unidad (trimestre primero si están mezclados) y luego por numero.
      if (a.unidad !== b.unidad) return a.unidad === "trimestre" ? -1 : 1;
      return a.numero - b.numero;
    });
  // Si la IA no devolvió ningún KR válido, lanzamos error claro
  // para que el caller NO presente un plan vacío como éxito.
  // Antes esto se silenciaba: `krs=[]` se devolvía y `aplicarKrsYTareasEnMeta`
  // mostraba "0 KRs + 0 tareas" como si todo hubiera ido bien.
  if (krs.length === 0) {
    const aceptadas = unidadesEfectivas
      .map((u) => `${u.unidad}:${u.numero}`)
      .join(", ");
    const pedidasRaw = Array.isArray(parsed?.krs) ? (parsed.krs as unknown[]) : [];
    const pedidasSample = pedidasRaw
      .slice(0, 3)
      .map((k) => {
        const ku = k as Record<string, unknown>;
        return `${ku.unidad_tiempo ?? "?"}:${ku.mes ?? ku.trimestre ?? "?"}`;
      })
      .join(", ");
    throw new Error(
      `La IA no generó KRs válidos. Causa probable: las unidades que pidió la IA (${pedidasSample || "ninguna"}) no están en las unidades aceptadas (${aceptadas || "ninguna"}). Revisa las fechas de la meta y vuelve a intentarlo.`,
    );
  }
  return { unidades_usadas, krs, prompt_usado: prompt };
}

/** Resultado de generar tareas para UN KR. */
export type TareasParaKr = {
  tareas: TareaGenerada[];
  prompt_usado: string;
};

/** Genera SOLO las tareas (no el plan entero) para un Key Result
 *  concreto. Usado por el botón "✨ Generar tareas con IA" dentro de
 *  cada tarjeta de KR en /metas/detalle. Caso de uso: David ya tiene
 *  KRs creados pero un KR específico no tiene tareas (o quiere
 *  ampliarlo) y no quiere regenerar todo el plan.
 *
 *  Reutiliza `llamarLLM` + `extraerJSON` + `saneKrsFromParsed` para
 *  mantener el mismo pipeline robusto. El prompt es reducido: solo
 *  la meta, el KR, el proyecto padre (si hay) y el número de tareas
 *  deseado. Devuelve 2-4 tareas, igual que el prompt del plan completo.
 *
 *  Aplica deduplicación por título normalizado contra las tareas
 *  ya existentes de la meta (no se devuelven duplicados).
 */
export async function generarTareasParaKrIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: {
    meta: {
      titulo: string;
      descripcion?: string | null;
      ambito?: "personal" | "profesional" | null;
    };
    kr: {
      titulo: string;
      descripcion?: string | null;
      metrica?: string | null;
      valor_objetivo?: number | null;
      unidad?: string | null;
      /** Nombre legible de la unidad (ej: "Octubre 2026", "Q3 2026"). */
      periodo_nombre: string;
    };
    contexto_proyecto?: string | null;
    /** Títulos ya creados en esta meta, para deduplicar. */
    titulosExistentes: string[];
    /** Número objetivo de tareas a generar. Por defecto 3. */
    nTareas?: number;
  },
): Promise<TareasParaKr> {
  const nTareas = opts.nTareas ?? 3;
  const prompt = `Eres un coach de OKR para David López. Tu trabajo: dado un Key Result existente dentro de una meta, proponer las tareas/hábitos concretos que lo harán realidad.

META DE DAVID:
  Título: ${opts.meta.titulo}
  Descripción: ${opts.meta.descripcion ?? "(sin descripción)"}
  Ámbito: ${opts.meta.ambito ?? "(no especificado)"}

KEY RESULT AL QUE DEBES DARLE TAREAS:
  Unidad temporal: ${opts.kr.periodo_nombre}
  Título del KR: ${opts.kr.titulo}
  Descripción: ${opts.kr.descripcion ?? "(sin descripción)"}
  Métrica: ${opts.kr.metrica ?? "(sin métrica)"}${
    opts.kr.valor_objetivo != null
      ? ` (objetivo: ${opts.kr.valor_objetivo}${opts.kr.unidad ?? ""})`
      : ""
  }

${
  opts.contexto_proyecto?.trim()
    ? `CONTEXTO DEL PROYECTO PADRE (úsalo para interpretar correctamente palabras ambiguas de la meta o del KR — ej: 'local' en un proyecto de pizzería = local comercial para pizzería, no un bar genérico):\n  ${opts.contexto_proyecto
        .trim()
        .replace(/\n/g, "\n  ")}\n`
    : ""
}
TAREAS YA EXISTENTES EN ESTA META (NO las repitas):
${
  opts.titulosExistentes.length === 0
    ? "  (ninguna todavía)"
    : opts.titulosExistentes
        .slice(0, 50)
        .map((t) => `  - ${t}`)
        .join("\n")
}

==========
REGLAS
==========
1. Genera EXACTAMENTE ${nTareas} tareas para este KR (ni más ni menos).
2. Cada tarea = una acción concreta, accionable hoy, que se entiende en ≤2 minutos sin ambigüedad. Si no se puede, es un proyecto, no una tarea.
3. NO repitas ninguna tarea de la lista de existentes. Si el KR ya tiene alguna tarea, propón VARIANTES nuevas, no duplicados.
4. Las tareas pueden ser one-shot (se hacen una vez) o recurrentes (hábitos: recurrencia_tipo: "diaria" | "semanal" | "mensual"). Para un KR, mezcla ambos tipos si tiene sentido.
5. Prioridad: usa "alta" si la tarea es bloqueante para el KR, "media" para el resto, "baja" para nice-to-have. "critica" solo si el KR depende al 100% de esa tarea.

Responde SOLO con JSON válido con esta estructura EXACTA:
{
  "tareas": [
    {
      "titulo": "...",
      "descripcion": null,
      "prioridad": "alta",
      "recurrencia_tipo": "diaria" | "semanal" | "mensual" | null,
      "recurrencia_dias_semana": [1, 3, 5] | null,
      "recurrencia_dia_mes": 15 | null,
      "criterio_terminacion": "..."
    }
  ]
}
`;
  const { ESQUEMA_TAREAS_KR } = await import("./llm-parser");
  const parsed = await llamarLLM<{ tareas?: unknown }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
    ESQUEMA_TAREAS_KR,
  );
  // Saneamos usando el mismo filtro que aplicarKrsYTareasEnMeta: KR fake
  // con la unidad del periodo, y tareas normalizadas.
  const krFalso = {
    unidad_tiempo: "trimestre" as const,
    trimestre: 1 as 1 | 2 | 3 | 4,
    titulo: opts.kr.titulo,
    descripcion: opts.kr.descripcion ?? null,
    metrica: opts.kr.metrica ?? null,
    valor_objetivo: opts.kr.valor_objetivo ?? 0,
    unidad: opts.kr.unidad ?? null,
    peso: 1,
    tareas: Array.isArray(parsed?.tareas) ? (parsed.tareas as unknown[]) : [],
  };
  const saneado = saneKrsFromParsed([krFalso]);
  // saneKrsFromParsed espera 4 trimestres por defecto; como el KR falso
  // usa trimestre=1 y está en el set por defecto, pasa. Extraemos las
  // tareas saneadas.
  const tareas = saneado[0]?.tareas ?? [];
  // Deduplicar contra titulos existentes (mismo criterio que el apply).
  const norm = (s: string) => s.trim().toLowerCase();
  const setExistentes = new Set(opts.titulosExistentes.map(norm));
  const filtradas: typeof tareas = [];
  for (const t of tareas) {
    const clave = norm(t.titulo);
    if (setExistentes.has(clave)) continue;
    setExistentes.add(clave);
    filtradas.push(t);
  }
  return { tareas: filtradas, prompt_usado: prompt };
}

// ============================================================================
// aplicarKrsYTareasEnMeta — motor compartido para materializar un
// `PlanMetaGenerado` en una meta (existente o recién creada).
//
// Lo usan dos flujos:
//   · /metas/nueva  → crea la meta y llama a este helper con su id.
//   · EditarMetaModal (botón IA en /metas y /metas/detalle) → usa el id
//     de la meta ya existente; salta los KRs que ya tenga ese trimestre
//     para no chocar con el UNIQUE (meta_id, periodo_id).
//
// IMPORTANTE: este helper NO toca el `estado` de la meta. El caller decide.
// ============================================================================

export type AplicarKrsResultado = {
  /** KRs nuevos creados en resultados_periodo. */
  krsCreados: number;
  /** KRs saltados porque ya existía un KR en esa unidad. */
  krsExistentes: number;
  /** Tareas (subtareas cuentan aparte) creadas y asignadas al KR. */
  tareasCreadas: number;
  /** Tareas saltadas porque ya existía una con el mismo título en esta meta. */
  tareasSaltadasDuplicadas: number;
  /** Tareas cuya recurrencia NO se pudo asignar tras crearse (no rompe). */
  tareasSinRecurrencia: number;
};

/** Map de periodos por unidad. La clave es `"trimestre:N"` (1..4) o
 *  `"mes:N"` (1..12). Migration 0025 sustituye al viejo
 *  `periodosByNumero` (trimestre 1..4) sin romper callers viejos
 *  durante la migración. */
export type PeriodosPorUnidad = Map<string, { id: string; tipo: "trimestre" | "mes" }>;

export async function aplicarKrsYTareasEnMeta(
  metaId: string,
  plan: PlanMetaGenerado,
  periodosByUnidad: PeriodosPorUnidad,
  cfg: {
    base_url: string;
    minimax_api_key: string | null;
    model: string;
  },
  opts: {
    /** Si true, KRs ya existentes (detectados por título normalizado en
     *  esta meta) se REUTILIZAN en lugar de crear uno nuevo. Sus tareas
     *  se siguen creando (dedup por título de tarea). Si false, los
     *  duplicados por título lanzan error. */
    saltarExistentes?: boolean;
    /** Callback por KR procesado, útil para mostrar progreso en UI. */
    onProgress?: (msg: string) => void;
  } = {},
): Promise<AplicarKrsResultado> {
  const { crearResultadoPeriodo, crearTareaConIA, setRecurrencia, asignarKrAPeriodos } =
    await import("@/lib/mutations");
  const supabase = (await import("@/lib/supabase/client")).createClient();

  // 1) Traemos los KRs ya existentes de esta meta (id + titulo) para
  //    detectar duplicados por TÍTULO (no por periodo — migration 0028).
  const { data: krsPrevios } = await supabase
    .from("resultados_periodo")
    .select("id,titulo")
    .eq("meta_id", metaId);
  // Mapa: título normalizado -> id del KR existente en esta meta.
  const krPorTitulo = new Map<string, string>();
  for (const r of krsPrevios ?? []) {
    const tit = String((r as { titulo: string }).titulo).trim().toLowerCase();
    if (tit) krPorTitulo.set(tit, (r as { id: string }).id);
  }

  // 1b) Traemos los títulos de tareas ya creadas en esta meta para
  //    deduplicar. Idempotencia ante reintentos del LLM.
  const { data: tareasExistentes } = await supabase
    .from("tareas")
    .select("titulo")
    .eq("meta_id", metaId);
  const titulosTareas = new Set<string>();
  for (const t of tareasExistentes ?? []) {
    const tit = String((t as { titulo: string }).titulo).trim().toLowerCase();
    if (tit) titulosTareas.add(tit);
  }

  const saltarExistentes = opts.saltarExistentes ?? true;
  let krsCreados = 0;
  let krsExistentes = 0;
  let tareasCreadas = 0;
  let tareasSaltadasDuplicadas = 0;
  let tareasSinRecurrencia = 0;

  for (const kr of plan.krs) {
    // Resolver la unidad (trimestre o mes) del KR.
    const clave =
      kr.unidad_tiempo === "mes" && typeof kr.mes === "number"
        ? `mes:${kr.mes}`
        : `trimestre:${kr.trimestre ?? 0}`;
    const periodo = periodosByUnidad.get(clave);
    if (!periodo) {
      opts.onProgress?.(
        `${clave}: sin periodo en BD (se omiten los KRs de esa unidad)`,
      );
      continue;
    }

    let resultadoId: string;
    const titNorm = kr.titulo.trim().toLowerCase();
    const krPrevioId = krPorTitulo.get(titNorm);
    if (krPrevioId) {
      if (!saltarExistentes) {
        throw new Error(
          `Ya existe un KR con título "${kr.titulo}" en esta meta. ` +
            `Quítalo primero o regenera con saltarExistentes=true.`,
        );
      }
      resultadoId = krPrevioId;
      krsExistentes++;
      // Si el KR existente no tiene este periodo aún, lo añadimos.
      try {
        await asignarKrAPeriodos(resultadoId, [periodo.id]);
      } catch (e) {
        console.warn(
          "[aplicarKrsYTareasEnMeta] no se pudo añadir el periodo al KR existente:",
          e,
        );
      }
      opts.onProgress?.(
        `KR existente "${kr.titulo}" — añadiendo tareas al KR actual.`,
      );
    } else {
      const r = await crearResultadoPeriodo({
        meta_id: metaId,
        periodo_ids: [periodo.id],
        titulo: kr.titulo,
        descripcion: kr.descripcion || null,
        metrica: kr.metrica || null,
        valor_objetivo: kr.valor_objetivo,
        unidad: kr.unidad || null,
        peso: kr.peso,
        estado: "pendiente",
      });
      resultadoId = r.id;
      krsCreados++;
      krPorTitulo.set(titNorm, resultadoId); // para que dos KRs del LLM
      // con el mismo título en la misma meta se agrupen en uno solo.
      opts.onProgress?.(
        `${clave}: KR nuevo "${kr.titulo}" creado.`,
      );
    }

    for (const t of kr.tareas) {
      // Dedupe por título exacto (normalizado) en esta meta.
      const titNormTarea = t.titulo.trim().toLowerCase();
      if (titulosTareas.has(titNormTarea)) {
        tareasSaltadasDuplicadas++;
        continue;
      }
      titulosTareas.add(titNormTarea);
      const creada = await crearTareaConIA(
        {
          titulo: t.titulo,
          descripcion: t.descripcion || null,
          prioridad: t.prioridad,
          estado: "pendiente",
          criterio_terminacion_manual: t.criterio_terminacion || null,
          meta_id: metaId,
          resultado_periodo_id: resultadoId,
        },
        {
          base_url: cfg.base_url,
          minimax_api_key: cfg.minimax_api_key,
          model: cfg.model,
        },
      );
      tareasCreadas++;
      if (t.recurrencia_tipo) {
        try {
          await setRecurrencia(creada.id, {
            tipo: t.recurrencia_tipo,
            dias_semana:
              t.recurrencia_tipo === "semanal"
                ? t.recurrencia_dias_semana
                : null,
            dia_mes:
              t.recurrencia_tipo === "mensual" ? t.recurrencia_dia_mes : null,
          });
        } catch (e) {
          console.warn("[aplicarKrsYTareasEnMeta] setRecurrencia falló:", e);
          tareasSinRecurrencia++;
        }
      }
    }
  }

  return { krsCreados, krsExistentes, tareasCreadas, tareasSaltadasDuplicadas, tareasSinRecurrencia };
}

/** Sanea el array `krs` devuelto por la IA: filtra por unidad válida
 *  (trimestre o mes), limpia textos, sanea prioridades y recurrencias.
 *  Reutilizado por `generarPlanMetaIA` y `generarMetaYPlanIA` (mismo
 *  formato de respuesta). */
export function saneKrsFromParsed(
  raw: unknown,
  unidadesDisponibles?: UnidadDisponible[],
  trimestresDisponibles?: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>,
): KrGenerado[] {
  const krsRaw = Array.isArray(raw) ? raw : [];
  const unidadesValidas = new Set<string>();
  if (unidadesDisponibles && unidadesDisponibles.length > 0) {
    for (const u of unidadesDisponibles) unidadesValidas.add(`${u.unidad}:${u.numero}`);
  } else if (trimestresDisponibles) {
    for (const t of trimestresDisponibles) unidadesValidas.add(`trimestre:${t.numero}`);
  } else {
    // Sin unidades explícitas, aceptamos 4 trimestres por defecto.
    for (let i = 1; i <= 4; i++) unidadesValidas.add(`trimestre:${i}`);
  }
  const krs: KrGenerado[] = [];
  for (const k of krsRaw) {
    const u = k as Record<string, unknown>;
    const unidadTiempoRaw = String(u.unidad_tiempo ?? "").toLowerCase().trim();
    const unidad_tiempo: "trimestre" | "mes" | null =
      unidadTiempoRaw === "trimestre" || unidadTiempoRaw === "trimestral"
        ? "trimestre"
        : unidadTiempoRaw === "mes" || unidadTiempoRaw === "mensual"
          ? "mes"
          : null;

    // Si no se rellenó unidad_tiempo, deducimos: si viene trimestre o mes.
    const unidad_final: "trimestre" | "mes" = unidad_tiempo ?? "trimestre";
    let trimestre: 1 | 2 | 3 | 4 | undefined;
    let mes: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | undefined;
    if (unidad_final === "trimestre") {
      const tNum = Number(u.trimestre);
      if (!Number.isInteger(tNum) || tNum < 1 || tNum > 4) continue;
      if (!unidadesValidas.has(`trimestre:${tNum}`)) continue;
      trimestre = tNum as 1 | 2 | 3 | 4;
    } else {
      const mNum = Number(u.mes);
      if (!Number.isInteger(mNum) || mNum < 1 || mNum > 12) continue;
      if (!unidadesValidas.has(`mes:${mNum}`)) continue;
      mes = mNum as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    }

    const titulo = String(u.titulo ?? "").trim().slice(0, 200);
    if (!titulo) continue;
    const descripcion = String(u.descripcion ?? "").trim().slice(0, 400);
    const metrica = String(u.metrica ?? "").trim().slice(0, 80);
    const valor_objetivo = Number(u.valor_objetivo);
    const unidad = String(u.unidad ?? "").trim().slice(0, 40);
    const pesoNum = Number(u.peso);
    const peso = Number.isFinite(pesoNum) && pesoNum > 0 ? pesoNum : 1;

    const tareasRaw = Array.isArray(u.tareas) ? (u.tareas as unknown[]) : [];
    const tareas: TareaGenerada[] = [];
    for (const t of tareasRaw) {
      const tTitulo = String((t as { titulo?: unknown })?.titulo ?? "").trim().slice(0, 200);
      if (!tTitulo) continue;
      const prio = String((t as { prioridad?: unknown })?.prioridad ?? "media").toLowerCase();
      const prioridadValida = (["critica", "alta", "media", "baja"] as const).includes(
        prio as "critica" | "alta" | "media" | "baja",
      )
        ? (prio as "critica" | "alta" | "media" | "baja")
        : "media";
      const recTipoRaw = String((t as { recurrencia_tipo?: unknown })?.recurrencia_tipo ?? "")
        .toLowerCase()
        .trim();
      const recurrencia_tipo =
        recTipoRaw === "diaria" || recTipoRaw === "semanal" || recTipoRaw === "mensual"
          ? (recTipoRaw as "diaria" | "semanal" | "mensual")
          : null;
      let dias_sem: number[] | null = null;
      let dia_mes: number | null = null;
      if (recurrencia_tipo === "semanal") {
        const ds = (t as { recurrencia_dias_semana?: unknown })?.recurrencia_dias_semana;
        if (Array.isArray(ds)) {
          dias_sem = ds.filter((d): d is number => typeof d === "number" && d >= 0 && d <= 6).slice(0, 7);
          if (dias_sem.length === 0) dias_sem = null;
        }
      } else if (recurrencia_tipo === "mensual") {
        const dm = Number((t as { recurrencia_dia_mes?: unknown })?.recurrencia_dia_mes);
        if (Number.isInteger(dm) && dm >= 1 && dm <= 28) dia_mes = dm;
      }
      const criterio = String((t as { criterio_terminacion?: unknown })?.criterio_terminacion ?? "")
        .trim()
        .slice(0, 200);
      const descT = String((t as { descripcion?: unknown })?.descripcion ?? "").trim().slice(0, 400);
      tareas.push({
        titulo: tTitulo,
        descripcion: descT || null,
        prioridad: prioridadValida,
        recurrencia_tipo,
        recurrencia_dias_semana: dias_sem,
        recurrencia_dia_mes: dia_mes,
        criterio_terminacion: criterio || null,
      });
      if (tareas.length >= 6) break;
    }
    krs.push({
      unidad_tiempo: unidad_final,
      trimestre,
      mes,
      titulo,
      descripcion,
      metrica,
      valor_objetivo: Number.isFinite(valor_objetivo) ? valor_objetivo : 1,
      unidad,
      peso,
      tareas,
    });
    if (krs.length >= 24) break;
  }
  return krs;
}


// ============================================================================
// Agente: genera META + PLAN completo a partir de un contexto libre.
// Pensado para /metas/agente — David pega lo que le ronda por la cabeza y la
// IA le devuelve una meta bien titulada + descripción + KRs + tareas.
//
// Esta función es una evolución de `generarPlanMetaIA`: en lugar de recibir
// meta_titulo + meta_descripcion como input, los devuelve como output.
// Internamente hace DOS llamadas LLM encadenadas (o una sola con prompt
// doble — aquí usamos una sola por economía).
// ============================================================================

function buildPromptAgente(opts: GenerarMetaYPlanOpts): string {
  const krsXTrim = opts.krs_por_trimestre ?? 3;
  const restricciones = (opts.restricciones ?? []).join("; ") || "(ninguna explícita)";
  const trimestres = opts.trimestres_disponibles
    .map((t) => `  - Q${t.numero} (${t.nombre})`)
    .join("\n");

  return `Eres un coach de OKR para David López. Tu trabajo: a partir de un contexto libre que David te cuenta en primera persona, proponer UNA meta bien definida + el plan trimestral completo (KRs por trimestre + tareas concretas).

==========
LO QUE DAVID CUENTA (en sus palabras)
==========
${opts.contexto}

==========
RESTRICCIONES DURAS (respétalas ABSOLUTAMENTE)
==========
${restricciones}

==========
CONTEXTO ADICIONAL
==========
Ámbito sugerido: ${opts.meta_ambito || "(personal o profesional — deduce del texto)"}
Plazo: ${opts.meta_plazo || "(deduce del texto o pon '12 meses' como default)"}
Año actual: ${opts.anio}

Trimestres disponibles (úsalos, NO inventes otros):
${trimestres}

==========
CÓMO DEBES TRABAJAR (lelo 2 veces antes de escribir)
==========
1. PRIMERO: identifica QUÉ quiere David. Si el texto menciona varias cosas (ej. "salud, dinero, familia"), propón LA meta más concreta y accionable que cubra el área mencionada. Si hay varias áreas, devuelve solo la primera — David podrá repetir el agente para las demás.
2. SEGUNDO: redacta un título de meta CORTO (≤80 chars), en imperativo o infinitivo, que David pueda usar tal cual. Ej: "Mejorar el sueño y la energía matutina".
3. TERCERO: redacta una descripción (≤500 chars) que mencione el "por qué" — qué le importa, qué quiere sentir/medir al final.
4. CUARTO: elige un ámbito ("personal" o "profesional") coherente con el texto.
5. QUINTO: deduce un PLAZO concreto (ej. "Q3 2026", "Q1-Q3 2026", "fin de 2026") y devuélvelo en \`meta_plazo\`. La app FILTRA automáticamente los KRs para que sólo vivan en esos trimestres.
6. SEXTO: genera el plan con EXACTAMENTE ${krsXTrim} KRs SOLO en los trimestres que implica tu \`meta_plazo\`. NO rellenes los demás trimestres aunque estén en la lista de disponibles. Cada KR con 2-4 tareas concretas.
7. Las tareas: ~30% hábitos (recurrencia_tipo no nulo) y ~70% puntuales (null).
8. Respeta las restricciones duras: si David dice "no puedo correr por la espalda", las tareas NO incluyen correr.
9. Idioma: SIEMPRE español de España (tuteo).

Responde SOLO con JSON válido con esta forma EXACTA:

{
  "meta_titulo": "Título de la meta propuesto",
  "meta_descripcion": "Descripción de 2-3 frases",
  "meta_ambito": "personal" | "profesional",
  "meta_plazo": "plazo libre (ej. '12 meses', 'Q2 2026')",
  "trimestres_usados": [2, 3, 4],
  "krs": [
    {
      "trimestre": 2,
      "titulo": "...",
      "descripcion": "...",
      "metrica": "...",
      "valor_objetivo": 15,
      "unidad": "min/día",
      "peso": 1,
      "tareas": [
        {
          "titulo": "...",
          "descripcion": null,
          "prioridad": "alta",
          "recurrencia_tipo": "diaria",
          "recurrencia_dias_semana": null,
          "recurrencia_dia_mes": null,
          "criterio_terminacion": "..."
        }
      ]
    }
  ]
}
`;
}

export async function generarMetaYPlanIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: GenerarMetaYPlanOpts,
): Promise<MetaYPlanGenerado> {
  const prompt = buildPromptAgente(opts);
  const parsed = await llamarLLM<{
    meta_titulo?: unknown;
    meta_descripcion?: unknown;
    meta_ambito?: unknown;
    meta_plazo?: unknown;
    unidades_usadas?: unknown;
    krs?: unknown;
  }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
  );

  // Mismo single-source-of-truth que generarPlanMetaIA: si el caller
  // no pasó `unidades_disponibles`, las derivamos aquí con el helper.
  // Sin esto, un caller que olvide pasarlas acaba con `saneados=0`.
  const unidadesEfectivasAg: UnidadDisponible[] =
    opts.unidades_disponibles && opts.unidades_disponibles.length > 0
      ? opts.unidades_disponibles
      : construirUnidadesParaPlan({
          fecha_inicio_meta: opts.fecha_inicio_meta ?? null,
          fecha_objetivo: opts.fecha_objetivo ?? null,
          anio: opts.anio,
        });

  const meta_titulo = String(parsed?.meta_titulo ?? "").trim().slice(0, 200);
  const meta_descripcion = String(parsed?.meta_descripcion ?? "").trim().slice(0, 600);
  const ambitoRaw = String(parsed?.meta_ambito ?? "").toLowerCase().trim();
  const meta_ambito: "personal" | "profesional" | null =
    ambitoRaw === "personal" || ambitoRaw === "profesional" ? (ambitoRaw as "personal" | "profesional") : null;
  const meta_plazo = String(parsed?.meta_plazo ?? "").trim().slice(0, 80) || null;

  if (!meta_titulo) {
    throw new Error("La IA no pudo proponer un título para la meta. Prueba a ser más específico en el contexto.");
  }

  // Saneamos los KRs en UNA llamada (sin pasar otra vez por la IA).
  const krs = saneKrsFromParsed(
    parsed?.krs,
    unidadesEfectivasAg,
    opts.trimestres_disponibles,
  );

  // Regla de plazo: la IA propone meta_plazo en su respuesta. Aplicamos
  // el parser de trimestres por compat. Si el caller pasó `unidades_objetivo`
  // (meses), ese filtro tiene prioridad.
  const setUnidades = new Set<string>();
  if (opts.unidades_objetivo && opts.unidades_objetivo.length > 0) {
    for (const u of opts.unidades_objetivo)
      setUnidades.add(`${u.unidad}:${u.numero}`);
  }
  const krsFiltrados = krs.filter((k) => {
    if (setUnidades.size > 0) {
      if (k.unidad_tiempo === "mes" && typeof k.mes === "number") {
        return setUnidades.has(`mes:${k.mes}`);
      }
      if (k.unidad_tiempo === "trimestre" && typeof k.trimestre === "number") {
        return setUnidades.has(`trimestre:${k.trimestre}`);
      }
      return false;
    }
    // Fallback al parser viejo (trimestres).
    const trimestresObjetivo = parsearTrimestresDePlazo(meta_plazo);
    const setNumeros = new Set<number>(trimestresObjetivo);
    return typeof k.trimestre === "number" && setNumeros.has(k.trimestre);
  });

  const unidadesSet = new Set<string>();
  for (const k of krsFiltrados) {
    if (k.unidad_tiempo === "mes" && typeof k.mes === "number") {
      unidadesSet.add(`mes:${k.mes}`);
    } else if (k.unidad_tiempo === "trimestre" && typeof k.trimestre === "number") {
      unidadesSet.add(`trimestre:${k.trimestre}`);
    }
  }
  const unidades_usadas = Array.from(unidadesSet)
    .map((s) => {
      const [u, n] = s.split(":");
      return { unidad: u as "trimestre" | "mes", numero: Number(n) };
    })
    .sort((a, b) => {
      if (a.unidad !== b.unidad) return a.unidad === "trimestre" ? -1 : 1;
      return a.numero - b.numero;
    });

  // Si la IA no devolvió ningún KR válido tras el filtrado, lanzamos
  // error claro en vez de presentar meta sin plan como éxito.
  if (krsFiltrados.length === 0) {
    const aceptadas = unidadesEfectivasAg
      .map((u) => `${u.unidad}:${u.numero}`)
      .join(", ");
    throw new Error(
      `La IA no generó KRs válidos. Causa probable: las unidades que pidió la IA no están en las unidades aceptadas (${aceptadas || "ninguna"}). Revisa el contexto y vuelve a intentarlo.`,
    );
  }

  return {
    meta_titulo,
    meta_descripcion,
    meta_ambito,
    meta_plazo,
    plan: { unidades_usadas, krs: krsFiltrados, prompt_usado: prompt },
    prompt_usado: prompt,
  };
}


// ============================================================================
// Sugeridor de WIGs (Wildly Important Goals)
// ----------------------------------------------------------------------------
// Dada la lista de metas activas del usuario, sugiere 3 WIGs con una razón
// corta para cada uno. Pensado para el botón "✨ Sugerir 3 WIGs" en /metas.
// ============================================================================

export type WigSugerido = {
  meta_id: string;
  razon: string;
};

export type SugerirWigsOpts = {
  metas: Array<{
    id: string;
    codigo?: string | null;
    titulo: string;
    descripcion?: string | null;
    ambito?: "personal" | "profesional" | null;
    estado: string;
    prioridad?: string | null;
    plazo?: string | null;
    tags?: string[];
    num_krs: number;
    num_tareas: number;
    num_tareas_hechas: number;
  }>;
  wigs_ya_marcados: string[];
};

export type SugerirWigsResultado = {
  sugerencias: WigSugerido[];
  prompt_usado: string;
};

function buildPromptSugerirWigs(opts: SugerirWigsOpts): string {
  const resumenMetas = opts.metas
    .map((m) => {
      const w = opts.wigs_ya_marcados.includes(m.id) ? " [YA WIG]" : "";
      const pct = m.num_tareas > 0 ? Math.round((100 * m.num_tareas_hechas) / m.num_tareas) : 0;
      // IMPORTANTE: listamos el `codigo` como identificador que la IA
      // puede copiar (es corto y legible). NO exponemos el UUID: la IA
      // no puede reproducirlo y siempre acabaría inventándolo, dejando
      // 0 sugerencias. La app resuelve `meta_codigo` → `meta_id` al
      // recibir la respuesta.
      const idLabel = m.codigo ? `[codigo=${m.codigo}]` : `[id=${m.id}]`;
      return `- ${idLabel} · ${m.titulo}${w}
  estado=${m.estado}, prioridad=${m.prioridad ?? "—"}, plazo=${m.plazo ?? "—"}, ambito=${m.ambito ?? "—"}
  KRs=${m.num_krs}, tareas=${m.num_tareas_hechas}/${m.num_tareas} (${pct}%), tags=[${(m.tags ?? []).join(", ")}]`;
    })
    .join("\n");

  return `Eres un coach de productividad para David López (TDAH, trabaja solo, dirige un restaurante + proyectos tech). Tu trabajo: ayudarlo a elegir sus 3 WIGs (Wildly Important Goals) para el trimestre actual.

==========
QUÉ ES UN WIG
==========
Un WIG es la meta a la que David dedica ENERGÍA DESPROPORCIONADA este trimestre. No es "la más importante en abstracto" — es la que, si la empuja con fuerza, hace irrelevantes a las otras o desbloquea las demás.

REGLA: máximo 3. Si hay 5 candidatas, pregunta: ¿cuál, si la logra, hace irrelevantes a las otras 4?

==========
METAS ACTIVAS DE DAVID
==========
${resumenMetas}

==========
LO QUE DEBES DEVOLVER
==========
Una lista de EXACTAMENTE 3 sugerencias (o menos si David tiene menos de 3 metas activas). Para cada una:
  - meta_codigo: el IDENTIFICADOR EXACTO de la meta tal y como aparece entre corchetes arriba (p.ej. "M-12", "M-7"). COPIALO TAL CUAL, sin inventar.
  - razon: UNA frase de máximo 140 caracteres justificando por qué esta meta debería ser WIG AHORA.

CRITERIOS para elegir (en orden de importancia):
1. URGENCIA: ¿algo se rompe si no avanza esta meta? (deudas, salud crítica, deadlines duros)
2. LEVERAGE: ¿avanzar esta meta desbloquea otras? (sueño reparador → energía → todo lo demás)
3. ESTADO: ¿está en rojo y necesita impulso? (estado=bloqueada o sin_empezar con prioridad alta)
4. ENERGÍA DISPONIBLE: si David está quemado, una meta de bajo esfuerzo que ya tiene momentum puede ser mejor WIG que una ambiciosa que requiera empuje heroico.

Si una meta ya está marcada como WIG, no la vuelvas a sugerir (a no ser que la respuesta sea corta y te sobre espacio).

NO sugieras metas en estado "archivada" o "completada".

Responde SOLO con JSON válido con esta forma EXACTA:
{
  "sugerencias": [
    { "meta_codigo": "M-1", "razon": "frase corta justificando" }
  ]
}
`;
}

export async function sugerirWigsIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: SugerirWigsOpts,
): Promise<SugerirWigsResultado> {
  const prompt = buildPromptSugerirWigs(opts);
  const parsed = await llamarLLM<{ sugerencias?: unknown }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
  );

  // La IA devuelve `meta_codigo` (corto, fácil de copiar). Resolvemos al
  // id real en JS. Si la meta no tiene codigo (m.codigo === null),
  // caemos al id como último recurso.
  const porCodigo = new Map<string, string>(); // codigo → id
  const porId = new Set<string>();              // ids válidos
  for (const m of opts.metas) {
    porId.add(m.id);
    if (m.codigo) porCodigo.set(m.codigo.trim(), m.id);
  }
  const raw = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
  const sugerencias: WigSugerido[] = [];
  const rechazadas: string[] = [];
  for (const s of raw) {
    // Aceptamos `meta_codigo` (preferido) o `meta_id` (compat hacia atrás).
    const codigo = String(
      (s as { meta_codigo?: unknown })?.meta_codigo ??
        (s as { meta_id?: unknown })?.meta_id ??
        "",
    ).trim();
    if (!codigo) continue;
    let id: string | null = porCodigo.get(codigo) ?? null;
    if (!id && porId.has(codigo)) id = codigo;
    if (!id) {
      rechazadas.push(codigo);
      continue;
    }
    const razon = String((s as { razon?: unknown })?.razon ?? "").trim().slice(0, 200);
    if (!razon) continue;
    sugerencias.push({ meta_id: id, razon });
    if (sugerencias.length >= 3) break;
  }

  // Si la IA devolvió 3 sugerencias pero ninguna matchea (lo más habitual
  // cuando se rompe esto), avisamos en consola para depurar.
  if (sugerencias.length === 0 && raw.length > 0 && typeof window !== "undefined") {
    console.warn("[sugerirWigs] La IA devolvió sugerencias pero ninguna matchea con los codigos de meta. codigos_devueltos=", rechazadas);
  }

  return { sugerencias, prompt_usado: prompt };
}

// ============================================================================
// Clasificador + generador de PROYECTO a partir de un contexto libre.
// ----------------------------------------------------------------------------
// El usuario pega en lenguaje natural lo que tiene en la cabeza. La IA
// decide si es un PROYECTO (agrupa varias metas) o una META aislada, y
// propone el nombre + descripción + área + 2-4 metas hijas con su KR
// inicial cada una y la fecha objetivo que sugiere.
//
// Pensado para /agente — el flujo unificado que sustituye a /metas/agente.
// El humano revisa, ajusta y aplica. El estado de la meta NO se modifica.
// ============================================================================

export type Clasificacion = "proyecto" | "meta" | "captura";

export type MetaHijaGenerada = {
  meta_titulo: string;
  meta_descripcion: string;
  meta_ambito: "personal" | "profesional" | null;
  meta_plazo: string | null;
  fecha_objetivo: string | null;       // YYYY-MM-DD
  contexto: string | null;
  kr_inicial: {
    trimestre: 1 | 2 | 3 | 4;
    titulo: string;
    metrica: string | null;
    valor_objetivo: number | null;
    unidad: string | null;
  } | null;
  /**
   * Migration 0025: trimestre sugerido por la IA en formato
   * "mes" (1..12) o "trimestre" (1..4). Si se omite, se asume trimestre.
   * Solo se usa cuando el caller pasa `unidades_disponibles` con meses
   * (rango real con meses sueltos).
   */
  unidad_tiempo?: "trimestre" | "mes";
  mes?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
};

export type ResultadoClasificador = {
  clasificacion: Clasificacion;
  razon_clasificacion: string;
  /** Área sugerida por nombre (la resuelve el cliente contra fetchAreas). */
  area_nombre: string | null;
  /** Si clasificacion === "proyecto" */
  proyecto?: {
    nombre: string;
    descripcion: string;
    color: string;
  };
  /** Metas hijas (1 si era meta aislada, 2-4 si era proyecto). */
  metas: MetaHijaGenerada[];
  prompt_usado: string;
};

export type ClasificarOpts = {
  contexto: string;
  restricciones?: string[];
  areasExistentes?: string[]; // nombres de áreas ya creadas (para sugerir la correcta)
  /** Migration 0025: rango opcional. Si está, la IA debe respetarlo
   *  tanto en el prompt como al proponer fecha_objetivo de cada meta. */
  fecha_inicio_meta?: string | null;
  fecha_objetivo?: string | null;
  fecha_fin_bloqueada?: boolean;
  /** Lista de meses (1..12) en los que puede planificar. Si está, la IA
   *  prefiere `unidad_tiempo: "mes"` + `mes` en cada meta hija. */
  unidades_objetivo?: Array<{ unidad: "trimestre" | "mes"; numero: number }>;
};

function buildPromptClasificador(opts: ClasificarOpts): string {
  const restricciones = (opts.restricciones ?? []).join("; ") || "(ninguna explícita)";
  const areas = (opts.areasExistentes ?? []).join(", ") || "(ninguna creada todavía)";
  // —— Migration 0025: bloque de rango ——
  const fechaInicio = opts.fecha_inicio_meta?.trim();
  const fechaObjetivo = opts.fecha_objetivo?.trim();
  const hardBlock = !!opts.fecha_fin_bloqueada;
  const mesesHabilitados = (opts.unidades_objetivo ?? [])
    .filter((u) => u.unidad === "mes")
    .map((u) => u.numero);
  const usarMeses = mesesHabilitados.length > 0;
  const hoyYMDLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const rangoBloque = usarMeses
    ? `
==========
RANGO REAL QUE DAVID HA FIJADO EN EL FORMULARIO (migration 0025)
==========
- Fecha de inicio: ${fechaInicio || "no indicada (asume hoy ${new Date().toISOString().slice(0, 10)})"}
- Fecha límite: ${fechaObjetivo || "no indicada — propón una realista"}
${hardBlock ? "⚠️ HARD CONSTRAINT: la fecha límite es DURA. NINGUNA meta/kr puede planificar nada después. Si sobra alcance, muévelo al contexto o a la sección 'fuera_de_rango' (no la metas hijas)." : "- La fecha límite es orientativa."}

UNIDADES HABILITADAS (usa SOLO estas): meses [${mesesHabilitados.join(", ")}].
Para cada meta hija, en lugar de trimestre: 1..4, devuelve unidad_tiempo: "mes" y mes: N (1..12) indicando en qué mes concreto cae.

⚠️ REGLA CRÍTICA — NUNCA RECORTES ALCANCE A 1 META ⚠️
Aunque el rango sea corto (3 meses), NO recortes a 1 sola meta. Una iniciativa tipo proyecto suele tener 3-4 fases lógicas independientes:
- Fase 1: PREPARACIÓN (mes 1)
- Fase 2: INVESTIGACIÓN/ALTERNATIVAS (mes 1-2)
- Fase 3: CONSTRUCCIÓN/REDACCIÓN (mes 2)
- Fase 4: ENSAYO/SIMULACRO (mes 3)
Esas 4 fases son METAS HIJAS DISTINTAS. Deben caer en los 3 meses del rango comprimiéndose (2 en mes 1, 1 en mes 2, 1 en mes 3), no en 1 sola. Si después de comprimir siguen siendo demasiadas, propón las más críticas y enumera el resto en la sección "fuera_de_rango" del JSON (NO en "metas").
Ejemplo CORRECTO para "renegociar alquiler" con rango Oct-Dic:
  metas: [
    { titulo: "Preparar dossier financiero", kr_inicial: { unidad_tiempo: "mes", mes: 10 } },
    { titulo: "Mapear 3 alternativas", kr_inicial: { unidad_tiempo: "mes", mes: 10 } },
    { titulo: "Redactar propuesta de valor", kr_inicial: { unidad_tiempo: "mes", mes: 11 } },
    { titulo: "Simulacro de reunión", kr_inicial: { unidad_tiempo: "mes", mes: 12 } }
  ]
Ejemplo INCORRECTO (recorte de alcance):
  metas: [{ titulo: "Preparar dossier financiero", kr_inicial: { unidad_tiempo: "mes", mes: 12 } }]
`
    : fechaInicio || fechaObjetivo
      ? `
==========
RANGO REAL QUE DAVID HA FIJADO EN EL FORMULARIO (migration 0025)
==========
- Fecha de inicio: ${fechaInicio || "no indicada"}
- Fecha límite: ${fechaObjetivo || "no indicada — propón una"}
${hardBlock ? "⚠️ HARD CONSTRAINT: la fecha límite es DURA. NINGUNA meta/kr puede planificar nada después." : "- La fecha límite es orientativa."}

RESPETA el rango: fecha_objetivo de cada meta hija debe caer dentro de [${fechaInicio || "hoy"}, ${fechaObjetivo || "propón"}].
`
      : "";

  return `Eres un coach de productividad para David López. Tu trabajo: leer un texto libre en primera persona y decidir si lo que David cuenta es:${rangoBloque}

  (a) PROYECTO  → una iniciativa que agrupa 2-4 metas relacionadas dentro de un área.
                   Ej: "Quiero lanzar la v1 de Sol de Nit" → proyecto con metas de producto, marketing, contratación.
  (b) META      → un resultado concreto con plazo, sin necesidad de descomponerlo.
                   Ej: "Quiero dormir mejor y levantarme con energía" → una sola meta, no varias.
  (c) CAPTURA   → una idea suelta, un vago deseo, un disparate. NO es accionable.
                   Ej: "Algún día quiero viajar a Japón" → captura.

Después de clasificar, devuelves la propuesta estructurada.

==========
LO QUE DAVID CUENTA (en sus palabras)
==========
${opts.contexto}

==========
RESTRICCIONES DURAS (respétalas ABSOLUTAMENTE)
==========
${restricciones}

==========
ÁREAS QUE DAVID YA TIENE CREADAS
==========
${areas}
(usa el nombre EXACTO de una de estas si encaja; si no, propón un nombre corto nuevo)

==========
CÓMO DEBES TRABAJAR (lelo 2 veces antes de escribir)
==========
1. Clasifica PRIMERO entre las 3 opciones. Justifica en UNA frase corta.
2. Si es PROYECTO: propón nombre del proyecto + 2-4 metas hijas. Cada meta hija con su KR inicial (un único KR medible, no varios) y su fecha objetivo estimada.
3. Si es META: devuelve UNA sola meta con su KR inicial y su fecha objetivo.
4. Si es CAPTURA: no propongas nada (metas = []).
5. Para fecha_objetivo: razona en función del plazo implícito. Si David dice "antes de septiembre 2026" y estamos en Q1 2026, pon "2026-09-30" o "2026-08-31". Si dice "en 6 meses", calcula desde hoy.
6. Las metas hijas deben ser ACCIÓN CONCRETA, no etiquetas. "Marketing" NO es meta; "Publicar en 3 medios especializados antes del lanzamiento" SÍ.
7. Idioma: SIEMPRE español de España (tuteo).

Responde SOLO con JSON válido con esta forma EXACTA:

{
  "clasificacion": "proyecto" | "meta" | "captura",
  "razon_clasificacion": "Una frase de menos de 200 chars justificando",
  "area_nombre": "Nombre del área sugerida (o null si captura)",
  "proyecto": {  // solo si clasificacion === "proyecto"
    "nombre": "≤80 chars, imperativo o infinitivo",
    "descripcion": "≤400 chars, el por qué",
    "color": "#hex color (uno de la paleta: #64748b #6366f1 #8b5cf6 #ec4899 #f59e0b #10b981 #ef4444)"
  },
  "metas": [
    {
      "meta_titulo": "≤80 chars",
      "meta_descripcion": "≤400 chars",
      "meta_ambito": "personal" | "profesional",
      "meta_plazo": "Q3 2026 / fin de 2026 / etc. (texto libre)",
      "fecha_objetivo": "YYYY-MM-DD — ${usarMeses ? "DEBE caer dentro del rango [inicio, fin_bloqueada]. KR inicial va en el mismo mes." : "debe caer dentro del rango del usuario"}",
      "contexto": "≤400 chars (qué rodea a esta meta)",
      "kr_inicial": {
        "unidad_tiempo": "${usarMeses ? '"mes"' : '"trimestre"'}",
        ${usarMeses ? '"mes": <1..12 — elige uno de la lista de meses habilitados>",' : '"trimestre": <1..4>,"'}
        "titulo": "KR medible, ≤100 chars",
        "metrica": "nombre corto de la métrica o null",
        "valor_objetivo": 0,
        "unidad": "unidad o null"
      }
    }
  ]
}
`;
}

export async function clasificarYGenerarIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: ClasificarOpts,
): Promise<ResultadoClasificador> {
  const prompt = buildPromptClasificador(opts);
  const { ESQUEMA_CLASIFICADOR } = await import("./llm-parser");
  const parsed = await llamarLLM<{
    clasificacion?: unknown;
    razon_clasificacion?: unknown;
    area_nombre?: unknown;
    proyecto?: { nombre?: unknown; descripcion?: unknown; color?: unknown };
    metas?: Array<{
      meta_titulo?: unknown;
      meta_descripcion?: unknown;
      meta_ambito?: unknown;
      meta_plazo?: unknown;
      fecha_objetivo?: unknown;
      contexto?: unknown;
      kr_inicial?: {
        trimestre?: unknown;
        unidad_tiempo?: unknown;
        mes?: unknown;
        titulo?: unknown;
        metrica?: unknown;
        valor_objetivo?: unknown;
        unidad?: unknown;
      };
    }>;
  }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
    ESQUEMA_CLASIFICADOR,
  );

  const clasRaw = String(parsed?.clasificacion ?? "").toLowerCase().trim();
  const clasificacion: Clasificacion =
    clasRaw === "proyecto" || clasRaw === "meta" || clasRaw === "captura"
      ? (clasRaw as Clasificacion)
      : "captura";

  const razon_clasificacion = String(parsed?.razon_clasificacion ?? "").trim().slice(0, 240);
  const area_nombre = String(parsed?.area_nombre ?? "").trim().slice(0, 80) || null;

  let proyecto: ResultadoClasificador["proyecto"];
  if (clasificacion === "proyecto" && parsed?.proyecto) {
    const p = parsed.proyecto;
    proyecto = {
      nombre: String(p.nombre ?? "").trim().slice(0, 120) || "(sin nombre)",
      descripcion: String(p.descripcion ?? "").trim().slice(0, 600),
      color: String(p.color ?? "#6366f1").trim() || "#6366f1",
    };
  }

  const metas: MetaHijaGenerada[] = (Array.isArray(parsed?.metas) ? parsed.metas : [])
    .map((m) => {
      const meta_titulo = String(m?.meta_titulo ?? "").trim().slice(0, 200);
      if (!meta_titulo) return null;
      const ambRaw = String(m?.meta_ambito ?? "").toLowerCase().trim();
      const meta_ambito: "personal" | "profesional" | null =
        ambRaw === "personal" || ambRaw === "profesional"
          ? (ambRaw as "personal" | "profesional")
          : null;
      const kr = m?.kr_inicial;

      // —— Migration 0025: aceptar trimestre o mes según lo que devuelva
      // la IA. Si el caller pasó `unidades_objetivo` con meses, preferimos
      // mes; si no, trimestre.
      let unidad_tiempo: "trimestre" | "mes" = "trimestre";
      let trimestre: 1 | 2 | 3 | 4 = 1;
      let mes: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | undefined;

      if (kr) {
        const utRaw = String(kr.unidad_tiempo ?? "").toLowerCase().trim();
        if (utRaw === "mes") {
          const mNum = Number(kr.mes);
          if (mNum >= 1 && mNum <= 12) {
            unidad_tiempo = "mes";
            mes = Math.floor(mNum) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
            // Para mapear periodo_id también necesitamos el trimestre del mes.
            // Aproximamos por mes calendario (ene-mar=Q1, abr-jun=Q2, jul-sep=Q3, oct-dic=Q4).
            trimestre = (mes <= 3 ? 1 : mes <= 6 ? 2 : mes <= 9 ? 3 : 4) as 1 | 2 | 3 | 4;
          } else {
            // La IA dijo "mes" pero el número no es válido — fallback al trimestre.
            const tNum = Number(kr.trimestre);
            trimestre = (tNum >= 1 && tNum <= 4 ? Math.floor(tNum) : 1) as 1 | 2 | 3 | 4;
          }
        } else {
          const tNum = Number(kr.trimestre ?? 1);
          trimestre = (tNum >= 1 && tNum <= 4 ? Math.floor(tNum) : 1) as 1 | 2 | 3 | 4;
        }
      } else {
        // Sin kr_inicial: trimestre por defecto al activo en la fecha.
        trimestre = trimestrePorNumeroDefault();
      }

      // —— Validación de fecha_objetivo contra el rango (migration 0025).
      // No fallamos: marcamos y se mostrará warning al aplicar.
      let fecha_objetivo: string | null = null;
      const fObjRaw = String(m?.fecha_objetivo ?? "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(fObjRaw)) {
        fecha_objetivo = fObjRaw;
        if (
          (opts.fecha_inicio_meta && fecha_objetivo < opts.fecha_inicio_meta) ||
          (opts.fecha_objetivo && fecha_objetivo > opts.fecha_objetivo)
        ) {
          (m as Record<string, unknown>).__fueraDeRango = true;
        }
      }

      return {
        meta_titulo,
        meta_descripcion: String(m?.meta_descripcion ?? "").trim().slice(0, 600),
        meta_ambito,
        meta_plazo: String(m?.meta_plazo ?? "").trim().slice(0, 80) || null,
        fecha_objetivo,
        contexto: String(m?.contexto ?? "").trim().slice(0, 600) || null,
        unidad_tiempo,
        mes,
        kr_inicial: kr
          ? {
              trimestre,
              titulo: String(kr.titulo ?? "").trim().slice(0, 200) || "(KR sin título)",
              metrica: String(kr.metrica ?? "").trim().slice(0, 80) || null,
              valor_objetivo:
                typeof kr.valor_objetivo === "number" ? kr.valor_objetivo : null,
              unidad: String(kr.unidad ?? "").trim().slice(0, 30) || null,
            }
          : null,
      } as MetaHijaGenerada;
    })
    .filter((m): m is MetaHijaGenerada => m !== null);

  // Invariantes: si es proyecto, al menos 2 metas; si es meta, 1; si es captura, 0.
  if (clasificacion === "proyecto" && metas.length < 2) {
    throw new Error(
      "La IA clasificó esto como proyecto pero devolvió menos de 2 metas. Reformula el contexto con más detalle.",
    );
  }
  if (clasificacion === "meta" && metas.length === 0) {
    throw new Error(
      "La IA clasificó esto como meta pero no devolvió ninguna. Reformula el contexto.",
    );
  }

  return {
    clasificacion,
    razon_clasificacion,
    area_nombre,
    proyecto,
    metas,
    prompt_usado: prompt,
  };
}
