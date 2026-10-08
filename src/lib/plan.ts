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

PERFIL DEL USUARIO:
- David. Familia: María y Abril (5 años).
- Restricciones alimentarias activas: 🚫 SIN avena, SIN cilantro, SIN quinoa, SIN tofu.
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
): Promise<T> {
  // Timeout de 45s para no colgarse si la API no responde.
  // Le pasamos un Error como `reason` para que el AbortError resultante
  // lleve un mensaje útil en lugar del genérico
  // "signal is aborted without reason" que mostraba la UI tal cual.
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () =>
      controller.abort(
        new Error(
          "La IA no respondió a tiempo (más de 45s). Vuelve a intentarlo.",
        ),
      ),
    45_000,
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

    try {
      return JSON.parse(content);
    } catch (e1) {
      if (typeof window !== "undefined") {
        console.warn("[plan] JSON.parse directo falló:", (e1 as Error).message);
        console.warn("[plan] Content (primeros 600 chars):", content.slice(0, 600));
        console.warn("[plan] Alrededor de pos 322:", content.slice(280, 380));
      }
    }

    try {
      const json = extractFirstJSON(content);
      return JSON.parse(json);
    } catch (e2) {
      if (typeof window !== "undefined") {
        console.warn("[plan] extractFirstJSON falló:", (e2 as Error).message);
      }
    }

    // Último intento: sanea problemas comunes de LLMs
    try {
      const json = extractFirstJSON(content);
      const saneado = sanearJSONComun(json);
      return JSON.parse(saneado);
    } catch (e3) {
      if (typeof window !== "undefined") {
        console.warn("[plan] sanearJSONComun falló:", (e3 as Error).message);
      }
    }

    throw new Error(
      `La IA no devolvió JSON válido. Primeros 200 chars: ${content.slice(0, 200).replace(/\n/g, " ")}`,
    );
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
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();

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
  /** Trimestre al que pertenece el KR (1..4). */
  trimestre: 1 | 2 | 3 | 4;
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
  trimestres_usados: Array<1 | 2 | 3 | 4>;
  krs: KrGenerado[];
  prompt_usado: string;
};

export type GenerarPlanMetaOpts = {
  meta_titulo: string;
  meta_descripcion?: string | null;
  meta_ambito?: "personal" | "profesional" | null;
  meta_plazo?: string | null;
  /** Trimestres disponibles (1..4) con nombre legible, p.ej. ["Q1 2026", "Q2 2026", ...] */
  trimestres_disponibles: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>;
  /** Trimestres objetivo derivados del campo `plazo`. Si se omite, se
   *  usan TODOS los disponibles. Si se pasa, la IA generará KRs SOLO en
   *  estos trimestres (los demás no se mencionan ni aparecen en el plan).
   *  El caller (página /metas/nueva o EditarMetaModal) lo calcula con
   *  `parsearTrimestresDePlazo()`. */
  trimestres_objetivo?: Array<1 | 2 | 3 | 4>;
  anio: number;
  /** Cuántos KRs por trimestre (defecto 3). */
  krs_por_trimestre?: number;
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
  trimestres_disponibles: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>;
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
  // Ordinales explícitos: "1º trimestre", "1er trimestre", "4º trimestre".
  // Solo se matchean si el dígito lleva un marcador ordinal detrás.
  const ordinalMatch = t.match(/(\d+)\s*[º°o]\s*trimestre/);
  if (ordinalMatch) {
    const n = Number(ordinalMatch[1]);
    if (n >= 1 && n <= 4) return [n] as Array<1 | 2 | 3 | 4>;
  }
  if (/\b(principio|inicio|arranque)\s+de\s+(ano|2\d{3})/.test(t)) return [1];
  if (/\bfin\s+de\s+(ano|2\d{3})/.test(t)) return [4];
  if (/\bmedio\s+(de|del)\s+(ano|2\d{3})/.test(t)) return [2, 3];

  // Recolectar menciones individuales: Q1..Q4, T1..T4, "trimestre N"
  const individuos = new Set<number>();
  let mm: RegExpExecArray | null;
  const reQt = /[qt]([1-4])/gi;
  while ((mm = reQt.exec(t)) !== null) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= 4) individuos.add(n);
  }
  const reTrim = /trimestre\s*([1-4])/gi;
  while ((mm = reTrim.exec(t)) !== null) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= 4) individuos.add(n);
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

  // Regla de plazo: si el caller pasó `trimestres_objetivo`, FILTRAMOS los
  // trimestres disponibles a ese subconjunto. La IA sólo verá y deberá
  // rellenar estos. Si el caller no pasó nada (plazo vacío/no interpretable),
  // se mantienen los 4 trimestres como antes.
  let trimestresVisibles = opts.trimestres_disponibles;
  if (opts.trimestres_objetivo && opts.trimestres_objetivo.length > 0) {
    const nums = new Set<number>(opts.trimestres_objetivo);
    trimestresVisibles = opts.trimestres_disponibles.filter((t) =>
      nums.has(t.numero),
    );
  }
  const trimestresStr =
    trimestresVisibles.length > 0
      ? trimestresVisibles
          .map((t) => `  - Q${t.numero} (${t.nombre})`)
          .join("\n")
      : "  (ninguno — revisa el formato del campo 'plazo')";

  const hayFiltro =
    !!opts.trimestres_objetivo && opts.trimestres_objetivo.length > 0;

  return `Eres un coach de OKR para David López. Tu trabajo: dado el contexto de una meta, generar el plan trimestral COMPLETO: KRs por trimestre + tareas/hábitos dentro de cada KR.

META DE DAVID:
  Título: ${opts.meta_titulo}
  Descripción: ${desc}
  Ámbito: ${ambito}
  Plazo: ${plazo}
  Año: ${opts.anio}

TRIMESTRES OBJETIVO${
    hayFiltro
      ? " (los únicos donde esta meta aplica — derivan del campo 'plazo' arriba; NO generes nada fuera de esta lista)"
      : " (todos los del año actual)"
  }:
${trimestresStr}

==========
REGLAS (lelas 2 veces antes de generar)
==========
0. ${hayFiltro ? "REGLA DE PLAZO (CRÍTICA): SOLO puedes crear KRs dentro de los trimestres listados arriba. Si el plazo es 'Q3 2026', NO generes KRs en Q1/Q2/Q4. Los demás trimestres quedan vacíos." : "Por defecto se generan los 4 trimestres del año. Si esto no encaja con la meta (ej: meta de un solo trimestre), el caller habrá recortado la lista de arriba."}
1. Cada KR = un HITO MEDIBLE que, si se cumple, demuestra que la meta avanza / se alcanza. Redacta los KRs como "lo que tiene que ocurrir para considerar esta meta lograda".
2. Genera EXACTAMENTE ${krsXTrim} KRs por trimestre listado. Más satura, menos es vago.
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
   - valor_objetivo: número realista para el trimestre (p.ej. 15, 2, 80).
   - unidad: unidad de la métrica (p.ej. "min/día", "desp/noche", "% noches").
   - peso: 1 (por defecto). Puede ser 1.5-2 si el KR es más crítico.
8. Responde SOLO con JSON válido con esta estructura EXACTA:

{
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

Usa conocimiento común del dominio (salud, finanzas, negocios) si la meta es genérica. Si David mencionó restricciones en la descripción (TDAH, cervicales, ansiedad, etc.), respétalas ABSOLUTAMENTE.
`;
}

export async function generarPlanMetaIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: GenerarPlanMetaOpts,
): Promise<PlanMetaGenerado> {
  const prompt = buildPromptPlanMeta(opts);
  const parsed = await llamarLLM<{
    trimestres_usados?: unknown;
    krs?: unknown;
  }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
  );

  const krs = saneKrsFromParsed(parsed?.krs, opts.trimestres_disponibles);
  const trimestres_usados: Array<1 | 2 | 3 | 4> = Array.from(
    new Set(krs.map((k) => k.trimestre)),
  ).sort((a, b) => a - b) as Array<1 | 2 | 3 | 4>;
  return { trimestres_usados, krs, prompt_usado: prompt };
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
  /** Trimestres del plan que se saltaron porque ya existía un KR. */
  krsExistentes: number;
  /** Tareas (subtareas cuentan aparte) creadas y asignadas al KR. */
  tareasCreadas: number;
  /** Tareas cuya recurrencia NO se pudo asignar tras crearse (no rompe). */
  tareasSinRecurrencia: number;
};

export async function aplicarKrsYTareasEnMeta(
  metaId: string,
  plan: PlanMetaGenerado,
  periodosByNumero: Map<1 | 2 | 3 | 4, { id: string }>,
  cfg: {
    base_url: string;
    minimax_api_key: string | null;
    model: string;
  },
  opts: {
    /** Si true, trimestres que ya tengan KR en esta meta se saltan en
     *  silencio (no crean KR nuevo pero siguen creando tareas en el
     *  KR existente). Si false, el UNIQUE violation lanza error. */
    saltarExistentes?: boolean;
    /** Callback por KR procesado, útil para mostrar progreso en UI. */
    onProgress?: (msg: string) => void;
  } = {},
): Promise<AplicarKrsResultado> {
  const { crearResultadoPeriodo, crearTareaConIA, setRecurrencia } = await import(
    "@/lib/mutations"
  );
  const supabase = (await import("@/lib/supabase/client")).createClient();

  // 1) Traemos los KRs ya existentes de esta meta (solo id + periodo_id
  //    — lo justo para detectar duplicados por trimestre sin cargar más).
  const { data: krsPrevios } = await supabase
    .from("resultados_periodo")
    .select("id,periodo_id")
    .eq("meta_id", metaId);
  const krPorPeriodo = new Map<string, string>();
  for (const r of krsPrevios ?? []) krPorPeriodo.set(r.periodo_id, r.id);

  const saltarExistentes = opts.saltarExistentes ?? true;
  let krsCreados = 0;
  let krsExistentes = 0;
  let tareasCreadas = 0;
  let tareasSinRecurrencia = 0;

  for (const kr of plan.krs) {
    const periodo = periodosByNumero.get(kr.trimestre);
    if (!periodo) continue;

    let resultadoId: string;
    const krPrevioId = krPorPeriodo.get(periodo.id);
    if (krPrevioId) {
      if (!saltarExistentes) {
        throw new Error(
          `Ya existe un KR para Q${kr.trimestre} en esta meta. ` +
            `Quítalo primero o regenera con saltarExistentes=true.`,
        );
      }
      resultadoId = krPrevioId;
      krsExistentes++;
      opts.onProgress?.(
        `Q${kr.trimestre}: KR existente — añadiendo tareas al KR actual.`,
      );
    } else {
      const r = await crearResultadoPeriodo({
        meta_id: metaId,
        periodo_id: periodo.id,
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
      opts.onProgress?.(`Q${kr.trimestre}: KR nuevo creado.`);
    }

    for (const t of kr.tareas) {
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

  return { krsCreados, krsExistentes, tareasCreadas, tareasSinRecurrencia };
}

/** Sanea el array `krs` devuelto por la IA: filtra por trimestre válido,
 *  limpia textos, sanea prioridades y recurrencias. Reutilizado por
 *  `generarPlanMetaIA` y `generarMetaYPlanIA` (mismo formato de respuesta). */
function saneKrsFromParsed(
  raw: unknown,
  trimestresDisponibles: Array<{ numero: 1 | 2 | 3 | 4; nombre: string }>,
): KrGenerado[] {
  const krsRaw = Array.isArray(raw) ? raw : [];
  const trimestresValidos = new Set<number>(trimestresDisponibles.map((t) => t.numero));
  const krs: KrGenerado[] = [];
  for (const k of krsRaw) {
    const tNum = Number((k as { trimestre?: unknown })?.trimestre);
    if (!Number.isInteger(tNum) || !trimestresValidos.has(tNum)) continue;
    const titulo = String((k as { titulo?: unknown })?.titulo ?? "").trim().slice(0, 200);
    if (!titulo) continue;
    const descripcion = String((k as { descripcion?: unknown })?.descripcion ?? "").trim().slice(0, 400);
    const metrica = String((k as { metrica?: unknown })?.metrica ?? "").trim().slice(0, 80);
    const valor_objetivo = Number((k as { valor_objetivo?: unknown })?.valor_objetivo);
    const unidad = String((k as { unidad?: unknown })?.unidad ?? "").trim().slice(0, 40);
    const pesoNum = Number((k as { peso?: unknown })?.peso);
    const peso = Number.isFinite(pesoNum) && pesoNum > 0 ? pesoNum : 1;

    const tareasRaw = Array.isArray((k as { tareas?: unknown })?.tareas)
      ? ((k as { tareas: unknown[] }).tareas)
      : [];
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
      trimestre: tNum as 1 | 2 | 3 | 4,
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
    trimestres_usados?: unknown;
    krs?: unknown;
  }>(
    baseUrl,
    apiKey,
    model,
    "Respondes SOLO con JSON válido, sin texto adicional.",
    prompt,
    true,
  );

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
  const krs = saneKrsFromParsed(parsed?.krs, opts.trimestres_disponibles);

  // Regla de plazo: la IA propone meta_plazo en su respuesta. Aplicamos
  // el mismo parser que en /metas/nueva para FILTRAR los KRs a los
  // trimestres que el propio agente declara como objetivo. Si el agente
  // no puso plazo, mantenemos los 4 trimestres.
  const trimestresObjetivo = parsearTrimestresDePlazo(meta_plazo);
  const setNumeros = new Set<number>(trimestresObjetivo);
  const krsFiltrados = krs.filter((k) => setNumeros.has(k.trimestre));

  const trimestres_usados: Array<1 | 2 | 3 | 4> = Array.from(
    new Set(krsFiltrados.map((k) => k.trimestre)),
  ).sort((a, b) => a - b) as Array<1 | 2 | 3 | 4>;

  return {
    meta_titulo,
    meta_descripcion,
    meta_ambito,
    meta_plazo,
    plan: { trimestres_usados, krs: krsFiltrados, prompt_usado: prompt },
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
      return `- ${m.codigo ?? "—"} · ${m.titulo}${w}
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
  - meta_id: el id de la meta que sugieres como WIG
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
    { "meta_id": "uuid-aqui", "razon": "frase corta justificando" }
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

  const metaIdsValidos = new Set(opts.metas.map((m) => m.id));
  const raw = Array.isArray(parsed?.sugerencias) ? parsed.sugerencias : [];
  const sugerencias: WigSugerido[] = [];
  for (const s of raw) {
    const id = String((s as { meta_id?: unknown })?.meta_id ?? "").trim();
    if (!id || !metaIdsValidos.has(id)) continue;
    const razon = String((s as { razon?: unknown })?.razon ?? "").trim().slice(0, 200);
    if (!razon) continue;
    sugerencias.push({ meta_id: id, razon });
    if (sugerencias.length >= 3) break;
  }

  return { sugerencias, prompt_usado: prompt };
}
