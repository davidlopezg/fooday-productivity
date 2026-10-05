// ============================================================================
// Plan diario v3 — generación con IA (estructura simple: A+B+C)
// ============================================================================
// Una sola llamada consolidada a la IA que devuelve:
//
//   • Sección A — análisis emocional + tendencia + recomendación + contexto
//   • Sección B — timeblocking: nº bloques activos (1-4) + tareas asignadas
//   • Sección C — una sugerencia gastronómica
//
// El input emocional es ESTRUCTURADO (5 selects que coinciden con el
// Dashboard emocional: despertar, mente, cuerpo, rueda, necesidad), más
// una reflexión libre opcional. Las tareas sueltas se persisten antes
// de generar (ver upsertTareaPorTitulo en mutations).
//
// No toca plan.ts (informe rico viejo) — convive con él para no romper
// la página de detalle que lee planes antiguos.
// ============================================================================

import type {
  BloqueTareaPlan,
  PlanDiario,
  PlanGeneradoSimple,
  Tarea,
} from "@/lib/types";
import type { EstadoEmocional } from "@/lib/plan";

export type GenerarPlanSimpleOpts = {
  /** Estado emocional estructurado (los 5 selects que coinciden con Dashboard emocional). */
  estado: EstadoEmocional;
  /** Reflexión libre opcional del usuario. */
  reflexion?: string;
  /** Fecha YYYY-MM-DD */
  fecha: string;
  /** Tareas pendientes de BD (backlog; se usan como 3ª prioridad). */
  tareas: Tarea[];
  /** Tareas programadas en /semana para el día de HOY (PRIORIDAD 1). */
  tareasProgramadasHoy: Tarea[];
  /** Tareas sueltas recién añadidas en esta sesión (PRIORIDAD 2). */
  tareasLibres: Tarea[];
  /** Últimos N planes del usuario (para que la IA calcule tendencia) */
  historial: PlanDiario[];
};

export type LlamadaIA = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function fechaToLarga(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------

function buildPrompt(opts: GenerarPlanSimpleOpts): string {
  const { estado, reflexion, fecha, tareas, tareasProgramadasHoy, tareasLibres, historial } = opts;
  const fechaLarga = fechaToLarga(fecha);

  // Tres fuentes de tareas, se muestran al LLM como tres listas separadas
  // con prioridad explícita. Las listas de prioridades altas se eliminan de
  // la lista de backlog para no presentarlas dos veces.
  const programadasIds = new Set(tareasProgramadasHoy.map((t) => t.id));
  const libresIds = new Set(tareasLibres.map((t) => t.id));
  const backlog = tareas.filter(
    (t) => !programadasIds.has(t.id) && !libresIds.has(t.id),
  );

  const fmt = (arr: Tarea[]) =>
    arr
      .slice(0, 25)
      .map(
        (t, i) =>
          `${i + 1}. [${t.prioridad ?? "media"}${t.codigo ? ` · ${t.codigo}` : ""}] ${t.titulo}${t.deadline ? ` (deadline: ${t.deadline})` : ""}`,
      )
      .join("\n") || "(ninguna)";

  const listaProgramadas = fmt(tareasProgramadasHoy);
  const listaLibres = fmt(tareasLibres);
  const listaBacklog = fmt(backlog);

  const hist = historial.length
    ? historial
        .slice(-5)
        .map(
          (p) =>
            `- ${p.fecha} | sem=${p.semaforo ?? "?"} | despertar=${p.despertar ?? "?"} | mente=${p.mente ?? "?"} | cuerpo=${p.cuerpo ?? "?"} | rueda=${p.rueda ?? "?"} | resumen=${(p.resumen ?? "").slice(0, 100)}`,
        )
        .join("\n")
    : "(sin histórico)";

  return `Eres el planificador diario de David. Analizas su estado emocional, decides qué puede asumir hoy y le propones un plan ejecutable.

PERFIL DE DAVID:
- Familia: María y Abril (5 años).
- Restricciones alimentarias: 🚫 SIN avena, SIN cilantro, SIN quinoa, SIN tofu.
- Prioridades: familia > negocio > sí-mismo.
- Tiene base de datos de tareas pendientes. Las candidatas están listadas abajo.

============================================================
FECHA: ${fecha} → ${fechaLarga}
============================================================

============================================================
ESTADO EMOCIONAL (5 dimensiones, escala 1-4; 4=mejor, 1=peor)
============================================================
- 🌅 Despertar: ${estado.despertar}
- 🧠 Mente: ${estado.mente}
- 💪 Cuerpo: ${estado.cuerpo}
- 🌀 Rueda del ratón: ${estado.rueda}
- 🆘 Necesita: ${estado.necesidad}
${
  reflexion && reflexion.trim()
    ? `
Reflexión libre del usuario:
"""
${reflexion.trim()}
"""`
    : ""
}

============================================================
HISTÓRICO RECIENTE (últimos ${historial.length} planes)
============================================================
${hist}

============================================================
TAREAS PROGRAMADAS PARA HOY (vienen de /semana, drag&drop)
PRIORIDAD 1 — David se ha comprometido a hacerlas hoy. Asígnalas primero.
============================================================
${listaProgramadas}

============================================================
OTRAS TAREAS AÑADIDAS EN ESTA SESIÓN (quick-add del formulario)
PRIORIDAD 2 — Úsalas si las programadas no cubren los bloques activos.
============================================================
${listaLibres}

============================================================
RESTO DEL BACKLOG (todas las pendientes NO listadas arriba)
PRIORIDAD 3 — Solo si las 2 anteriores no cubren los bloques activos.
============================================================
${listaBacklog}

============================================================
REGLAS DEL PLAN (6 secciones finales)
============================================================

A) RESUMEN (sección 1):
   - Síntesis en 2-3 frases del estado emocional + a dónde apunta el día.
   - Tono cercano, en primera persona del plan hacia él.
   - Incluye un guiño al día de la semana si aporta (ej: lunes → pagos; viernes → cierre).

B) RECOMENDACIÓN (sección 2):
   - 2-4 acciones concretas para hoy. Empiezan con verbo en imperativo.
   - Ej: "Sal a caminar 20 min antes del primer bloque."

C) LECTURA PSICOLÓGICA (sección 3) — 2 subcampos:
   - lo_del_dia: análisis del estado emocional de HOY (2-4 frases). Tono neutro, no juzgar.
   - analisis_historico: compara con los últimos planes. ⬆️/=/⬇️. Si hay patrón repetido (>3 días), nómbralo.

D) TU DÍA OPTIMIZADO (sección 4):
   - 4 bloques de 60 min: 1-2 mañana, 3-4 tarde.
   - num_bloques_activos: 1-4 según el semáforo.
     🟢 VERDE → 3-4 bloques · 🟡 AMARILLO → 2-3 bloques · 🔴 ROJO → 1 bloque
   - Prioridad de asignación:
     1º Tareas PROGRAMADAS PARA HOY (compromiso explícito de David).
     2º Tareas AÑADIDAS EN ESTA SESIÓN.
     3º Resto del BACKLOG (último recurso).
   - Orden: (1) prioridad de fuente, (2) estado emocional (ligeras si rojo), (3) prioridad de la tarea, (4) tipo (profunda antes que rápida salvo que el cuerpo pida pausa).
   - Si un bloque se queda sin tarea, propón una abstracta ("Paseo consciente de 60 min").

E) PROPUESTA DE COMIDA (sección 5):
   - UNA sola sugerencia gastronómica para la comida principal de hoy.
   - Título corto (2-5 palabras). Descripción: 1-2 frases. Motivo: 1 frase.

F) NOTAS DEL DÍA (sección 6):
   - NO se rellena por ti. Lo escribe David al final del día.
   - Ignóralo en tu respuesta.

============================================================
FORMATO DE SALIDA — JSON ESTRICTO
============================================================
Devuelve SOLO este JSON, sin texto fuera, sin markdown. No uses saltos de línea literales dentro de strings; usa \\n si los necesitas.

{
  "semaforo": "verde|amarillo|rojo",
  "resumen": "<2-3 frases incluyendo guiño al día de la semana si aplica>",
  "recomendacion": "<2-4 acciones separadas por ; o en una sola frase con guiones>",
  "lectura_psicologica": {
    "lo_del_dia": "<2-4 frases>",
    "analisis_historico": "<2-3 frases con flecha ⬆️|=|⬇️>"
  },
  "tu_dia_optimizado": {
    "num_bloques_activos": <1|2|3|4>,
    "bloques": [
      {
        "bloque_num": 1,
        "tipo": "profunda|rapida",
        "titulo_libre": "<título de la tarea asignada al bloque>",
        "tiempo_min": 60
      }
    ]
  },
  "propuesta_comida": {
    "titulo": "<2-5 palabras>",
    "descripcion": "<1-2 frases>",
    "motivo": "<1 frase>"
  }
}

Notas:
- "tu_dia_optimizado.bloques" contiene exactamente num_bloques_activos elementos, con bloque_num 1..num_bloques_activos en orden.
- "tiempo_min" siempre 60.
- Tono: profesional pero cercano, en español de España.`;
}

// ----------------------------------------------------------------------------
// Llamada al LLM
// ----------------------------------------------------------------------------

async function llamarLLM<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  userPrompt: string,
  /** Señal para abortar la petición (timeout, etc.) */
  signal?: AbortSignal,
  /** Algunas APIs (Ollama, LM Studio, etc.) rechazan este campo. Solo se envía
   *  si la baseUrl parece de un proveedor OpenAI-compatible conocido. */
): Promise<T> {
  const knownJsonFormat = /openai|minimax|groq|deepseek|together|anthropic/i.test(baseUrl);
  const body: Record<string, unknown> = {
    model: model || "Minimax-M3",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente que responde SOLO con JSON válido, sin texto fuera.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  };
  if (knownJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  // Timeout de 45s para no colgarse si la API no responde
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(endpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: signal ?? controller.signal,
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
      // fallback: extraer primer bloque {...} válido
      const json = extractFirstJSON(content);
      return JSON.parse(saneadorComun(json));
    }
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
// Saneamiento y normalización
// ----------------------------------------------------------------------------

const SEMAFOROS = ["verde", "amarillo", "rojo"] as const;
const TIPOS = ["profunda", "rapida"] as const;
const BLOQUES_VALIDOS = [1, 2, 3, 4] as const;

export function sanearPlanSimple(raw: unknown, candidatas: Tarea[]): PlanGeneradoSimple {
  const r = (raw ?? {}) as Record<string, unknown>;

  const semaforo = (SEMAFOROS as readonly string[]).includes(String(r.semaforo))
    ? (r.semaforo as PlanGeneradoSimple["semaforo"])
    : "amarillo";

  // Tu día optimizado: la IA devuelve tu_dia_optimizado.{num_bloques_activos, bloques}
  // pero aceptamos el shape antiguo {num_bloques_activos, bloques} por compat.
  const diaOpt =
    (r.tu_dia_optimizado as Record<string, unknown> | undefined) ?? r;
  const numBloquesRaw = Number(diaOpt.num_bloques_activos);
  const numBloques: 1 | 2 | 3 | 4 = ([1, 2, 3, 4] as const).includes(
    numBloquesRaw as 1 | 2 | 3 | 4,
  )
    ? (numBloquesRaw as 1 | 2 | 3 | 4)
    : semaforo === "rojo"
      ? 1
      : semaforo === "amarillo"
        ? 2
        : 3;

  const bloquesRaw = Array.isArray(diaOpt.bloques)
    ? (diaOpt.bloques as Array<Record<string, unknown>>)
    : [];
  const candidatasPorTitulo = new Map(
    candidatas.map((t) => [normalizarTitulo(t.titulo), t] as const),
  );

  const bloques: BloqueTareaPlan[] = [];
  for (let i = 0; i < numBloques; i++) {
    const b = bloquesRaw[i] ?? {};
    const tituloLibre = String(b.titulo_libre ?? "").trim().slice(0, 200) || `Tarea del bloque ${i + 1}`;
    const tipo = (TIPOS as readonly string[]).includes(String(b.tipo))
      ? (b.tipo as BloqueTareaPlan["tipo"])
      : "profunda";
    const match = candidatasPorTitulo.get(normalizarTitulo(tituloLibre));
    bloques.push({
      bloque_num: (i + 1) as 1 | 2 | 3 | 4,
      tipo,
      tarea_id: match?.id ?? null,
      titulo_libre: tituloLibre,
      tiempo_min: 60,
    });
  }

  // Propuesta de comida: la IA devuelve propuesta_comida.* pero aceptamos
  // el shape antiguo {comida.*} por compat.
  const comidaRaw =
    (r.propuesta_comida as Record<string, unknown> | undefined) ??
    ((r.comida as Record<string, unknown> | undefined) ?? {});
  const propuestaComida: PlanGeneradoSimple["propuesta_comida"] = {
    titulo: String(comidaRaw.titulo ?? "—").slice(0, 100),
    descripcion: String(comidaRaw.descripcion ?? "").slice(0, 500),
    motivo: String(comidaRaw.motivo ?? "").slice(0, 300),
  };

  // Lectura psicológica: la IA devuelve lectura_psicologica.{lo_del_dia, analisis_historico}
  // pero aceptamos los campos antiguos {analisis_emocional, tendencia} por compat.
  const lectura =
    (r.lectura_psicologica as Record<string, unknown> | undefined) ?? {};
  const loDelDia = String(lectura.lo_del_dia ?? r.analisis_emocional ?? "").slice(0, 1500);
  const analisisHist = String(
    lectura.analisis_historico ?? r.tendencia ?? "",
  ).slice(0, 1000);

  return {
    semaforo,
    resumen: String(r.resumen ?? "").slice(0, 1000),
    recomendacion: String(r.recomendacion ?? r.recomendacion_psicologica ?? "").slice(0, 1500),
    lectura_psicologica: {
      lo_del_dia: loDelDia,
      analisis_historico: analisisHist,
    },
    tu_dia_optimizado: {
      num_bloques_activos: numBloques,
      bloques,
    },
    propuesta_comida: propuestaComida,
  };
}

function normalizarTitulo(s: string): string {
  return s.trim().toLowerCase();
}

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

export async function generarPlanSimple(
  ia: LlamadaIA,
  opts: GenerarPlanSimpleOpts,
): Promise<PlanGeneradoSimple> {
  const prompt = buildPrompt(opts);
  const parsed = await llamarLLM<unknown>(ia.baseUrl, ia.apiKey, ia.model, prompt);

  // Para sanear, la IA puede haber referido cualquier tarea de las 3 listas.
  // Le damos las 3 al matcher para que matchee por título contra cualquiera.
  const candidatas = [
    ...opts.tareasProgramadasHoy,
    ...opts.tareasLibres,
    ...opts.tareas,
  ];
  return sanearPlanSimple(parsed, candidatas);
}
