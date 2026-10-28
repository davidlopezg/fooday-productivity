// ============================================================================
// analizarEscenariosIA.ts — análisis de escenarios de un proyecto.
// ----------------------------------------------------------------------------
// Qué hace: lee la CRONOLOGÍA del proyecto (lo que ya pasó), el ESTADO
// medido (tareas) y las METAS del proyecto, y devuelve los ESCENARIOS
// posibles con su estrategia.
//
// De dónde viene el criterio: el prompt está adaptation de
// `fooday-intelligence-core/agents/agente-generador-hipotesis.md` (que David
// ya usa en el core) + el rediseño por categorías de la conversación de
// diseño (riesgos / oportunidades / puntos ciegos / wildcard).
//
// Por qué NO "las 5 hipótesis más probables": esa lista devuelve lo que ya
// sabes y pre-carga hacia la primera. Aquí la probabilidad es un dato
// secundario y lo que manda es la estrategia. Aun así, la hipótesis más
// probable se muestra destacada en la UI (es lo que David pidió: "no
// quiero dejarme la que vaya a suceder").
//
// La IA NO escribe en la BD: devuelve datos y la UI decide qué guardar.
// ============================================================================

import { llamarLLM } from "@/lib/llm";
import { parsearYValidar, type FieldSchema } from "@/lib/llm-parser";
import { sanearHipotesis } from "./hipotesis";
import { bloquePerfil, type PerfilIA } from "@/lib/perfilIA";
import type { EstadoProyecto, Hipotesis } from "@/lib/types";

// ----------------------------------------------------------------------------
// Tipos públicos
// ----------------------------------------------------------------------------

export type EventoCronologia = {
  tipo: "contexto" | "estado" | "situacion";
  texto: string;
  ocurrido_en: string;
};

export type MetaProyectoIA = {
  titulo: string;
  contexto?: string | null;
  situacion_actual?: string | null;
  fecha_objetivo?: string | null;
  avance?: number | null;
};

export type TareaProyectoIA = {
  titulo: string;
  estado: string;
  prioridad?: string | null;
  deadline?: string | null;
};

export type AnalizarEscenariosOpts = {
  proyecto: {
    nombre: string;
    descripcion?: string | null;
    area?: string | null;
  };
  /** Cronología: la más antigua primero. */
  eventos: EventoCronologia[];
  /** Estado medido (se calcula en la UI desde `tareas`). */
  estado: EstadoProyecto;
  metas: MetaProyectoIA[];
  /** Perfil del usuario (migration 0032). Si se omite, DEFAULT_PERFIL_IA. */
  perfil?: PerfilIA | null;
  /** Tareas abiertas relevantes (ya recortadas por la UI). */
  tareas: TareaProyectoIA[];
  /** YYYY-MM-DD */
  hoy: string;
};

export type AnalizarEscenariosResultado = {
  /** Lectura de la situación (el presente interpretado). */
  situacion: string;
  hipotesis: Hipotesis[];
  /** Prompt enviado (útil para depurar). */
  prompt_usado: string;
};

// ----------------------------------------------------------------------------
// Esquema de la respuesta
// ----------------------------------------------------------------------------

export const ESQUEMA_ESCENARIOS: FieldSchema = {
  type: "object",
  fields: {
    situacion: { type: "string" },
    hipotesis: {
      type: "array",
      items: {
        type: "object",
        fields: {
          categoria: {
            type: "string",
            enum: ["riesgo", "oportunidad", "punto_ciego", "wildcard"],
          },
          titulo: { type: "string" },
          probabilidad: { type: "number" },
          estrategia: { type: "string" },
          justificacion: { type: "string", optional: true },
          indicador: { type: "string", optional: true },
        },
      },
    },
  },
};

// ----------------------------------------------------------------------------
// Saneado — vive en ./hipotesis.ts (lógica pura, testeable con node).
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------

const SYSTEM = `Eres el analista de escenarios. Lees la cronología de un
proyecto, entiendes su situación actual y devuelves los escenarios que puede
tomar, cada uno con la estrategia concreta a seguir.

REGLA DE ORO: no te limites a devolver lo obvio. El valor de este análisis NO es
acertar el futuro: es obligar a David a ver los caminos que no estaba viendo.
Si todas las hipótesis son "sigo igual" o "el proveedor sube precios", el
análisis ha fallado y es mejor decir que los datos son insuficientes.

CATEGORÍAS (usa solo estas):
- "riesgo": lo que puede salir mal y no se está viendo.
- "oportunidad": lo que puede salir mejor y no se está viendo.
- "punto_ciego": una variable que se está ignorando y podría importar.
- "wildcard": improbable pero de alto impacto (como máximo 1).

REGLAS:
1. Máximo 3 riesgos, 2 oportunidades, 1 punto ciego y 1 wildcard.
2. Cada hipótesis lleva SIEMPRE una "estrategia" accionable: qué hace David
   si eso ocurre. Sin estrategia, la hipótesis no vale nada.
3. "probabilidad" es 0-100 y es un dato SECUNDARIO. No el protagonista.
4. No inventes datos. Si la cronología está floja, dilo en "situacion".
5. Tono directo, español de España, frases cortas. Sin relleno.
6. No seas alarmista: los riesgos son reales, pero no todo es urgencia.
7. Las hipótesis no son excluyentes: las probabilidades pueden sumar >100.
8. "indicador": qué hecho concreto confirmaría o refutaría la hipótesis.`;

function lineaEvento(e: EventoCronologia): string {
  const etiqueta =
    e.tipo === "contexto"
      ? "contexto"
      : e.tipo === "estado"
        ? "estado"
        : "situación";
  return `[${e.ocurrido_en}] (${etiqueta}) ${e.texto}`;
}

export function buildPrompt(opts: AnalizarEscenariosOpts): string {
  const { proyecto, eventos, estado, metas, tareas, hoy } = opts;

  const cronologia = eventos.length
    ? eventos.map(lineaEvento).join("\n")
    : "(vacía — este proyecto todavía no tiene hechos registrados)";

  const metasTxt = metas.length
    ? metas
        .map((m) => {
          const trozos = [`- ${m.titulo}`];
          if (m.fecha_objetivo) trozos.push(`objetivo: ${m.fecha_objetivo}`);
          if (m.avance != null) trozos.push(`avance: ${m.avance}%`);
          if (m.contexto) trozos.push(`contexto: ${m.contexto}`);
          if (m.situacion_actual) trozos.push(`situación: ${m.situacion_actual}`);
          return trozos.join(" · ");
        })
        .join("\n")
    : "(sin metas asociadas)";

  const tareasTxt = tareas.length
    ? tareas
        .map((t) => {
          const p = t.prioridad ? `[${t.prioridad}] ` : "";
          const d = t.deadline ? ` (vence ${t.deadline})` : "";
          return `- ${p}${t.titulo} — ${t.estado}${d}`;
        })
        .join("\n")
    : "(sin tareas relevantes)";

  return `${bloquePerfil(opts.perfil)}

PROYECTO: ${proyecto.nombre}
ÁREA: ${proyecto.area ?? "(sin área)"}
DESCRIPCIÓN: ${proyecto.descripcion ?? "(sin descripción)"}
HOY: ${hoy}

CRONOLOGÍA (lo que ya pasó; la más reciente al final):
${cronologia}

ESTADO ACTUAL (medido sobre las tareas del proyecto):
- Total de tareas: ${estado.total}
- Hechas: ${estado.hechas}
- Abiertas: ${estado.abiertas}
- Bloqueadas: ${estado.bloqueadas}
- Vencidas: ${estado.vencidas}
- Avance: ${estado.avance}%
- Próximo vencimiento: ${estado.proximoVencimiento ?? "sin fechas"}

METAS DEL PROYECTO:
${metasTxt}

TAREAS RELEVANTES:
${tareasTxt}

PREGUNTA CENTRAL: ¿Qué puede pasar en este proyecto y qué hago en cada caso?

Responde SOLO con JSON válido (sin markdown, sin texto fuera):
{
  "situacion": "2-4 frases: dónde está el proyecto ahora y qué es lo que más pesa",
  "hipotesis": [
    {
      "categoria": "riesgo | oportunidad | punto_ciego | wildcard",
      "titulo": "1 frase con qué puede pasar",
      "probabilidad": 0,
      "estrategia": "qué hago si esto ocurre (acción concreta)",
      "justificacion": "1 frase: por qué esa probabilidad",
      "indicador": "qué hecho lo confirmaría o refutaría"
    }
  ]
}`;
}

// ----------------------------------------------------------------------------
// Llamada
// ----------------------------------------------------------------------------

export async function analizarEscenariosIA(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: AnalizarEscenariosOpts,
): Promise<AnalizarEscenariosResultado> {
  const prompt = buildPrompt(opts);

  const content = await llamarLLM(
    baseUrl,
    apiKey,
    model,
    SYSTEM,
    prompt,
    { temperature: 0.5 },
  );

  const parsed = parsearYValidar<{
    situacion: string;
    hipotesis: unknown[];
  }>(content, ESQUEMA_ESCENARIOS);

  const hipotesis = sanearHipotesis(parsed.hipotesis);

  return {
    situacion: String(parsed.situacion ?? "").trim(),
    hipotesis,
    prompt_usado: prompt,
  };
}
