// Generación del plan diario con MiniMax (llamada directa desde el navegador).
// La API key se lee de la configuración del usuario en Supabase.

import type { Tarea } from "@/lib/types";

export type EstadoEmocional = {
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesidad: string;
};

export type TareaPlan = {
  tipo: "imprescindible" | "autocuidado" | "micro" | "extra";
  titulo_libre: string;
};

export type PlanGenerado = {
  semaforo: "verde" | "amarillo" | "rojo";
  resumen: string;
  recomendacion: string;
  tareas: TareaPlan[];
};

const ENDPOINT = "https://api.minimax.chat/v1/chat/completions";

function buildPrompt(estado: EstadoEmocional, tareas: Tarea[]): string {
  const lista = tareas
    .slice(0, 30)
    .map(
      (t, i) =>
        `${i + 1}. [${t.prioridad ?? "media"}${t.capa ? ` · ${t.capa}` : ""}] ${t.titulo}${t.deadline ? ` (deadline: ${t.deadline})` : ""}`,
    )
    .join("\n");

  return `Eres el planificador diario emocional de David. Tu objetivo es producir el plan del DÍA de hoy con la información emocional y la lista de tareas pendientes.

ESTADO EMOCIONAL (1-5):
- Despertar: ${estado.despertar}
- Mente: ${estado.mente}
- Cuerpo: ${estado.cuerpo}
- Rueda del ratón: ${estado.rueda}
- Necesita hoy: ${estado.necesidad}

TAREAS PENDIENTES (elige de aquí):
${lista || "(sin tareas)"}

REGLAS DE SELECCIÓN DE TAREAS (por semáforo):
- ROJO (ansiedad, cuerpo roto, sobrepasado): máximo 1 tarea "imprescindible" + 1 "autocuidado" (ej. respirar/caminar/ducha). NADA de foco complejo.
- AMARILLO (cansado, acelerado, tenso): 1 "imprescindible" (🎯) + 1 "micro" (5 min) + 1 "autocuidado".
- VERDE (con energía, claro): 3 tareas balanceadas (🎯 foco + ⚙️ operativa + 🧹 distribuida). Máximo 3.

PRIORIZA por deadline y consecuencias de no hacerla. Elige la más crítica si hay duda.

FORMATO DE SALIDA — JSON estricto, sin texto fuera del JSON:
{
  "semaforo": "verde" | "amarillo" | "rojo",
  "resumen": "2-3 frases que interpreten el estado emocional con empatía y sin juicio",
  "recomendacion": "2-4 frases concretas para hoy (qué hacer, qué no hacer, bloque móvil OFF, etc.)",
  "tareas": [
    { "tipo": "imprescindible" | "autocuidado" | "micro" | "extra", "titulo_libre": "<título concreto y accionable>" }
  ]
}

"titulo_libre" puede ser:
- Una tarea de la lista (parafraseada si quieres, indicando código si lo tiene), o
- Una acción de autocuidado ("Caminar 15 min sin móvil", "Respiración 4-7-8 5 min"), o
- Una micro-acción ("Revisar correo 5 min", "Llamar a María").

NO añadas "Sure", "Here is", ni markdown. SOLO el JSON.`;
}

export async function generarPlan(
  apiKey: string,
  model: string,
  estado: EstadoEmocional,
  tareas: Tarea[],
): Promise<PlanGenerado> {
  const prompt = buildPrompt(estado, tareas);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "MiniMax-Text-01",
      messages: [
        { role: "system", content: "Eres un asistente que responde SOLO con JSON válido." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MiniMax ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";

  let parsed: PlanGenerado;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback: extraer el primer {...}
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("La IA no devolvió JSON válido.");
    parsed = JSON.parse(match[0]);
  }

  // Saneamiento mínimo
  const semaforo = (["verde", "amarillo", "rojo"] as const).includes(parsed.semaforo)
    ? parsed.semaforo
    : "amarillo";
  const tareas_limpias: TareaPlan[] = Array.isArray(parsed.tareas)
    ? parsed.tareas.slice(0, 4).map((t) => ({
        tipo: (["imprescindible", "autocuidado", "micro", "extra"] as const).includes(t.tipo)
          ? t.tipo
          : "extra",
        titulo_libre: String(t.titulo_libre ?? "").slice(0, 240),
      }))
    : [];

  return {
    semaforo,
    resumen: String(parsed.resumen ?? "").slice(0, 800),
    recomendacion: String(parsed.recomendacion ?? "").slice(0, 800),
    tareas: tareas_limpias,
  };
}

export async function probarConexion(apiKey: string, model: string): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "MiniMax-Text-01",
      messages: [{ role: "user", content: "Responde SOLO con el JSON: {\"ok\":true}" }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`MiniMax ${res.status}: ${t.slice(0, 160)}`);
  }
}
