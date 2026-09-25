// ============================================================================
// Plan diario v3 — generación con IA (estructura simple: A+B+C)
// ============================================================================
// Una sola llamada consolidada a la IA que devuelve:
//
//   • Sección A — análisis emocional + tendencia + recomendación + contexto
//   • Sección B — timeblocking: nº bloques activos (1-4) + tareas asignadas
//   • Sección C — una sugerencia gastronómica
//
// El input emocional es libre (texto), no múltiples selects. Las tareas
// sueltas se persisten antes de generar (ver upsertTareaPorTitulo en mutations).
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

export type GenerarPlanSimpleOpts = {
  /** Texto libre del estado emocional (Parte 1) */
  estadoTexto: string;
  /** Fecha YYYY-MM-DD */
  fecha: string;
  /** Tareas pendientes de BD (se ofrecen como candidatas a los bloques) */
  tareas: Tarea[];
  /** Tareas sueltas recién creadas/asignadas a este plan (referencias a `tareas`) */
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
  const { estadoTexto, fecha, tareas, tareasLibres, historial } = opts;
  const fechaLarga = fechaToLarga(fecha);
  const fechaCorta = fecha.slice(5); // MM-DD

  // Candidatas: BD + libres recién creadas. Cap a 25 para no abrumar al prompt.
  const candidatas = [...tareas, ...tareasLibres]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, 25);

  const listaCandidatas = candidatas.length
    ? candidatas
        .map(
          (t, i) =>
            `${i + 1}. [${t.prioridad ?? "media"}${t.codigo ? ` · ${t.codigo}` : ""}] ${t.titulo}${t.deadline ? ` (deadline: ${t.deadline})` : ""}`,
        )
        .join("\n")
    : "(sin tareas disponibles)";

  const hist = historial.length
    ? historial
        .slice(-5)
        .map(
          (p) =>
            `- ${p.fecha} | sem=${p.semaforo ?? "?"} | despertar=${p.despertar ?? "?"} | mente=${p.mente ?? "?"} | cuerpo=${p.cuerpo ?? "?"} | resumen=${(p.resumen ?? "").slice(0, 100)}`,
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
ESTADO EMOCIONAL (texto libre del usuario)
============================================================
${estadoTexto.trim() || "(no facilitado)"}

============================================================
HISTÓRICO RECIENTE (últimos ${historial.length} planes)
============================================================
${hist}

============================================================
TAREAS CANDIDATAS (mezcla de BD + recién creadas)
============================================================
${listaCandidatas}

============================================================
REGLAS DEL PLAN
============================================================

A) ANÁLISIS EMOCIONAL (Sección A):
   - Lee el texto del usuario. NO juzgues, NO psicologices de más.
   - Extrae: tono (positivo/negativo/neutro), carga (baja/media/alta), foco (claro/borroso).
   - Máx 4 frases.

B) TENDENCIA (Sección A):
   - Compara el estado de hoy con el histórico (los últimos registros).
   - Indica si va a mejor ⬆️, se mantiene =, o va a peor ⬇️.
   - Si hay patrón repetido (mismo síntoma >3 días), nómbralo en 1 frase.
   - Máx 3 frases.

C) RECOMENDACIÓN ACCIONABLE (Sección A):
   - 2-4 acciones concretas para hoy. Empiezan con verbo en imperativo.
   - Ej: "Sal a caminar 20 min antes del primer bloque de trabajo."

D) CONTEXTO DEL DÍA (Sección A):
   - Lee el día de la semana (${fechaLarga}) y propón un guiño breve.
   - Ej: lunes → "toca revisar pagos/suscripciones"; viernes → "toca cerrar semana y dejar todo listo para el lunes".
   - 1-2 frases. Sin obviedades genéricas.

E) SEMÁFORO: deduce del texto emocional.
   - 🟢 VERDE → energía alta, puede asumir 3-4 bloques
   - 🟡 AMARILLO → energía media, asume 2-3 bloques
   - 🔴 ROJO → energía baja/sobrepasado, asume solo 1 bloque

F) TIMEBLOCKING (Sección B):
   - Tienes exactamente 4 bloques de 60 min cada uno: bloque 1 y 2 son MAÑANA (antes de comer); bloque 3 y 4 son TARDE (después de comer).
   - Num_bloques_activos: 1 a 4 según el semáforo (regla E).
   - Asigna UNA tarea por bloque (las primeras num_bloques_activos ranuras).
   - Una tarea PROFUNDA ocupa el bloque entero (60 min). Tareas RÁPIDAS pueden agruparse: pon UNA sola línea con " + " entre varias (ej: "Revisar correo + llamar gestoría + agendar médico") que ocupe el bloque entero.
   - Ordena por: (1) estado emocional (tareas ligeras si rojo, profundas si verde), (2) prioridad de la tarea, (3) tipo (profunda antes que rápida salvo que el cuerpo pida pausa).
   - Las tareas deben salir de la lista de candidatas. Puedes referenciarlas por el nº de la lista. Si ninguna sirve, propón una tarea abstracta ("Paseo consciente de 60 min") como tarea libre.

G) COMIDA (Sección C):
   - UNA sola sugerencia gastronómica para la comida principal de hoy.
   - Título corto (2-5 palabras).
   - Descripción: 1-2 frases de qué es.
   - Motivo: 1 frase explicando por qué encaja con su estado emocional y/o el día de la semana.

============================================================
FORMATO DE SALIDA — JSON ESTRICTO
============================================================
Devuelve SOLO este JSON, sin texto fuera, sin markdown. No uses saltos de línea literales dentro de strings; usa \\n si los necesitas.

{
  "semaforo": "verde|amarillo|rojo",
  "analisis_emocional": "<2-4 frases>",
  "tendencia": "<2-3 frases con flecha ⬆️|=|⬇️>",
  "recomendacion_psicologica": "<2-4 acciones separadas por ; o en una sola frase con guiones>",
  "contexto_dia": "<1-2 frases con guiño al día de la semana>",
  "num_bloques_activos": <1|2|3|4>,
  "bloques": [
    {
      "bloque_num": 1,
      "tipo": "profunda|rapida",
      "titulo_libre": "<título de la tarea asignada al bloque>",
      "tiempo_min": 60
    }
  ],
  "comida": {
    "titulo": "<2-5 palabras>",
    "descripcion": "<1-2 frases>",
    "motivo": "<1 frase>"
  }
}

Notas:
- "bloques" contiene exactamente num_bloques_activos elementos, con bloque_num 1..num_bloques_activos en orden.
- "tiempo_min" siempre 60 (cada bloque son 60 min estrictos).
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
): Promise<T> {
  const res = await fetch(endpoint(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
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
      response_format: { type: "json_object" },
    }),
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

  const numBloquesRaw = Number(r.num_bloques_activos);
  const numBloques: 1 | 2 | 3 | 4 = ([1, 2, 3, 4] as const).includes(
    numBloquesRaw as 1 | 2 | 3 | 4,
  )
    ? (numBloquesRaw as 1 | 2 | 3 | 4)
    : semaforo === "rojo"
      ? 1
      : semaforo === "amarillo"
        ? 2
        : 3;

  const bloquesRaw = Array.isArray(r.bloques) ? (r.bloques as Array<Record<string, unknown>>) : [];
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

  const comidaRaw = (r.comida ?? {}) as Record<string, unknown>;
  const comida: PlanGeneradoSimple["comida"] = {
    titulo: String(comidaRaw.titulo ?? "—").slice(0, 100),
    descripcion: String(comidaRaw.descripcion ?? "").slice(0, 500),
    motivo: String(comidaRaw.motivo ?? "").slice(0, 300),
  };

  return {
    semaforo,
    analisis_emocional: String(r.analisis_emocional ?? "").slice(0, 1500),
    tendencia: String(r.tendencia ?? "").slice(0, 1000),
    recomendacion_psicologica: String(r.recomendacion_psicologica ?? "").slice(0, 1500),
    contexto_dia: String(r.contexto_dia ?? "").slice(0, 500),
    num_bloques_activos: numBloques,
    bloques,
    comida,
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

  const candidatas = [...opts.tareas, ...opts.tareasLibres];
  return sanearPlanSimple(parsed, candidatas);
}
