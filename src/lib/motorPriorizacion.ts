// ============================================================================
// Motor de Priorización Ejecutable
// ============================================================================
// Recibe la lista activa de tareas + metas y devuelve UNA única tarea concreta
// que tiene sentido ejecutar AHORA, con su motivo, tiempo asignado y primer
// micro-paso. No devuelve listas, no devuelve top-3.
//
// Sigue el patrón de planSimple.ts:
//  - Llamada directa cliente → proveedor (mismo baseUrl/apiKey/model del
//    store de configuración).
//  - Pide JSON estricto y sanea la salida.
// ============================================================================

import type { Meta, Tarea } from "@/lib/types";

export type LlamadaIA = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type GenerarPriorizacionOpts = {
  /** Tareas activas (pendiente, en_progreso, bloqueada) */
  tareas: Tarea[];
  /** Metas activas (para detectar proyectos disfrazados y evaluar impacto) */
  metas: Meta[];
  /** Fecha YYYY-MM-DD */
  fecha: string;
  /** Hora actual HH:MM (local del usuario). Se pasa como contexto, no como regla. */
  horaLocal: string;
  /** Día de la semana en español (ej: "lunes"). */
  diaSemana: string;
};

export type PriorizacionInmediata = {
  tarea_inmediata: string;
  motivo: string;
  tiempo_min: number; // <= 45
  primer_paso: string;
  /**
   * Si la IA eligió una tarea existente (por título exacto), devolvemos el id
   * para que la UI pueda pintarla y enlazar acciones (p. ej. marcarla como
   * "en_progreso"). `null` si recomienda una tarea nueva / proyecto / abstracta.
   */
  tarea_id_sugerida: string | null;
  /** Título original de la tarea sugerida (para mostrar link / match). */
  tarea_titulo_match: string | null;
};

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

// ----------------------------------------------------------------------------
// Prompt
// ----------------------------------------------------------------------------

function buildPrompt(opts: GenerarPriorizacionOpts): string {
  const { tareas, metas, fecha, horaLocal, diaSemana } = opts;

  // Cap defensivo: si David tiene miles de tareas, no abrumamos al prompt.
  // Ordenamos por prioridad y deadline para que las más relevantes estén
  // siempre presentes.
  const tareasActivas = tareas
    .filter((t) =>
      ["pendiente", "en_progreso", "bloqueada"].includes(t.estado),
    )
    .slice()
    .sort((a, b) => {
      const rank: Record<string, number> = {
        critica: 0,
        urgente: 1,
        alta: 2,
        media: 3,
        baja: 4,
      };
      const ra = rank[a.prioridad ?? "media"] ?? 3;
      const rb = rank[b.prioridad ?? "media"] ?? 3;
      if (ra !== rb) return ra - rb;
      // Deadline ascendente; nulls al final.
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline)
        return a.deadline.localeCompare(b.deadline);
      return 0;
    })
    .slice(0, 60);

  const metasActivas = metas
    .filter((m) => !["completada", "archivada"].includes(m.estado))
    .slice(0, 30);

  const listaTareas = tareasActivas.length
    ? tareasActivas
        .map(
          (t, i) =>
            `${i + 1}. [id=${t.id}] [prio=${t.prioridad ?? "media"}] [estado=${t.estado}] [deadline=${t.deadline ?? "—"}] [esfuerzo=${t.esfuerzo ?? "—"}] ${t.titulo}${t.descripcion ? ` — ${t.descripcion.slice(0, 120)}` : ""}${t.capa ? ` (capo=${t.capa})` : ""}`,
        )
        .join("\n")
    : "(sin tareas activas)";

  const listaMetas = metasActivas.length
    ? metasActivas
        .map(
          (m, i) =>
            `${i + 1}. [codigo=${m.codigo ?? "—"}] [estado=${m.estado}] [plazo=${m.plazo ?? "—"}] ${m.titulo}${m.descripcion ? ` — ${m.descripcion.slice(0, 120)}` : ""}`,
        )
        .join("\n")
    : "(sin metas activas)";

  return `# MOTOR DE PRIORIZACIÓN EJECUTABLE

Tu función es actuar como un filtro de decisión, no como un gestor de listas.

Recibirás una lista de tareas, proyectos, obligaciones y objetivos. Tu trabajo es analizarla completa y devolver ÚNICAMENTE la acción que tiene mayor sentido ejecutar AHORA.

No devuelvas una lista priorizada.
No devuelvas un top 3.
No preguntes al usuario qué prefiere hacer salvo que exista una ambigüedad que impida tomar una decisión razonable.

## 1. ANALIZA TODA LA ENTRADA

Para cada elemento evalúa internamente:

* Impacto: cuánto contribuye a los objetivos principales.
* Coste de retraso: qué ocurre si no se hace hoy.
* Urgencia real: si existe una fecha límite, dependencia o consecuencia concreta.
* Fricción: dificultad para empezar y carga cognitiva.
* Energía requerida: baja, media o alta.
* Duración: tiempo razonable para completar el siguiente resultado tangible.
* Dependencias: si desbloquea otras tareas o está bloqueada por ellas.
* Disponibilidad: si puede ejecutarse ahora con los recursos existentes.

No muestres estas puntuaciones salvo que se solicite expresamente.

## 2. DETECTA PROYECTOS DISFRAZADOS DE TAREAS

Si una entrada es demasiado abstracta para ejecutarse inmediatamente, no la selecciones como tarea.

Ejemplos:

"Mejorar tesorería" → proyecto.
"Trabajar en Fooday Productivity" → proyecto.
"Resolver problema de la web" → posiblemente proyecto.

Transforma mentalmente el proyecto en el siguiente paso concreto que produzca un resultado verificable.

El objetivo no es terminar el proyecto.
El objetivo es identificar el siguiente movimiento que hace avanzar el proyecto.

## 3. APLICA LA RESTRICCIÓN TEMPORAL

La acción seleccionada debe poder producir un resultado tangible dentro de un bloque máximo de 45 minutos.

Si la tarea completa requiere más tiempo, NO la descartes.

Descompónla únicamente hasta encontrar el siguiente bloque ejecutable de ≤45 minutos.

No hagas microdivisión innecesaria.

## 4. CONSIDERA EL MOMENTO ACTUAL

Utiliza la hora actual y el contexto disponible.

Por la mañana, prioriza especialmente:

* decisiones importantes;
* trabajo estratégico;
* problemas complejos;
* creación;
* programación;
* análisis;
* tareas con alta carga cognitiva.

Cuando la energía previsiblemente sea menor, favorece:

* ejecución;
* administración;
* llamadas;
* seguimiento;
* tareas mecánicas;
* operaciones previamente definidas.

Pero no uses la hora del día como una regla absoluta.

Una tarea crítica puede superar esta preferencia.

## 5. PRINCIPIO DE COSTE DE NO ACCIÓN

No confundas "importante" con "interesante".

Prioriza especialmente aquello que, si no se hace ahora:

* bloquea dinero;
* bloquea a otra persona;
* provoca una pérdida;
* acerca un incumplimiento;
* genera una consecuencia difícil de revertir;
* impide avanzar otras tareas importantes.

Una tarea con alto coste de retraso puede superar a otra con mayor impacto potencial.

## 6. PRINCIPIO ANTI-PROCRASTINACIÓN

No selecciones automáticamente la tarea más fácil.

Tampoco selecciones automáticamente la más importante.

Busca la acción que produzca el mayor avance relevante teniendo en cuenta:

IMPACTO + COSTE DE RETRASO + URGENCIA + CONTEXTO ACTUAL

y penaliza:

FRICCIÓN + FALTA DE CLARIDAD + DEPENDENCIAS BLOQUEANTES

## 7. REGLA DE DESEMPATE

Si dos tareas son similares, elige la que:

1. desbloquee más cosas;
2. tenga mayor coste de retraso;
3. genere un resultado verificable antes;
4. reduzca más incertidumbre.

## 8. SALIDA

Devuelve ÚNICAMENTE:

**Tarea Inmediata:** [una única acción concreta y ejecutable]

**Motivo de Selección:** [explicación breve y directa de por qué esta acción supera a las demás ahora mismo]

**Tiempo Asignado:** [máximo de 45 minutos]

**Primer Micro-paso:** [acción que debe realizarse durante el primer minuto]

## 9. REGLA DE EJECUCIÓN

La respuesta debe permitir que la persona empiece inmediatamente sin tener que volver a pensar qué hacer.

Si el usuario puede empezar en menos de 60 segundos después de leer la respuesta, el resultado es correcto.

Si necesita volver a analizar la situación, el resultado es incorrecto: simplifica todavía más la acción.

No añadas consejos adicionales, listas de tareas pendientes, explicaciones del algoritmo ni alternativas.

============================================================
CONTEXTO TEMPORAL
============================================================
Fecha: ${fecha}
Día de la semana: ${diaSemana}
Hora local: ${horaLocal}

============================================================
METAS / OBJETIVOS ACTIVOS (para evaluar impacto y detectar proyectos)
============================================================
${listaMetas}

============================================================
TAREAS ACTIVAS (pendiente, en_progreso, bloqueada) — ordenadas por prioridad y deadline
============================================================
${listaTareas}

============================================================
FORMATO DE SALIDA — JSON ESTRICTO
============================================================
Devuelve SOLO este JSON, sin texto fuera, sin markdown, sin encabezados.

{
  "tarea_inmediata": "<una única acción concreta y ejecutable, redactada en imperativo y específica>",
  "motivo": "<explicación breve y directa (máx 3 frases) de por qué esta acción supera a las demás ahora>",
  "tiempo_min": <entero entre 1 y 45>,
  "primer_paso": "<acción concreta que debe realizarse durante el primer minuto>",
  "tarea_titulo_match": "<TÍTULO EXACTO de la tarea de la lista que estás recomendando (copia y pega de la lista), o null si recomiendas una tarea nueva / descompuesta>"
}`;
}

// ----------------------------------------------------------------------------
// Saneamiento y validación de la respuesta
// ----------------------------------------------------------------------------

const MAX_TIEMPO = 45;
const MIN_TIEMPO = 1;

export function sanearPriorizacion(
  raw: unknown,
  tareasCandidatas: Tarea[],
): PriorizacionInmediata {
  const r = (raw ?? {}) as Record<string, unknown>;

  const tarea_inmediata = String(r.tarea_inmediata ?? "").trim().slice(0, 400);
  const motivo = String(r.motivo ?? "").trim().slice(0, 600);
  const primer_paso = String(r.primer_paso ?? "").trim().slice(0, 300);

  let tiempo = Number(r.tiempo_min);
  if (!Number.isFinite(tiempo)) tiempo = 25;
  tiempo = Math.max(MIN_TIEMPO, Math.min(MAX_TIEMPO, Math.round(tiempo)));

  // Si no hay texto de tarea, devolvemos un fallback seguro (la persona
  // igualmente verá el mensaje y sabrá que regenerar).
  if (!tarea_inmediata) {
    return {
      tarea_inmediata: "Revisar y actualizar la lista de tareas pendientes",
      motivo: "La IA no devolvió una acción clara. Regenera el análisis.",
      tiempo_min: 10,
      primer_paso: "Abre /tareas y revisa qué sigue pendiente.",
      tarea_id_sugerida: null,
      tarea_titulo_match: null,
    };
  }

  // Intento de match por título (case/espacios insensibles).
  const tituloMatch = String(r.tarea_titulo_match ?? "").trim();
  let matchId: string | null = null;
  let matchTitulo: string | null = null;
  if (tituloMatch) {
    const norm = (s: string) => s.trim().toLowerCase();
    const found = tareasCandidatas.find((t) => norm(t.titulo) === norm(tituloMatch));
    if (found) {
      matchId = found.id;
      matchTitulo = found.titulo;
    }
  }

  return {
    tarea_inmediata: tarea_inmediata || tituloMatch || "Sin acción definida",
    motivo: motivo || "Sin motivo explícito.",
    tiempo_min: tiempo,
    primer_paso: primer_paso || "Empieza por la propia tarea inmediata.",
    tarea_id_sugerida: matchId,
    tarea_titulo_match: matchTitulo,
  };
}

// ----------------------------------------------------------------------------
// Llamada al LLM (mismo patrón que planSimple.ts)
// ----------------------------------------------------------------------------

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
          "Eres un asistente que responde SOLO con JSON válido, sin texto fuera.",
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  };
  if (knownJsonFormat) {
    body.response_format = { type: "json_object" };
  }

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
    // El `reason` del AbortController llega al catch como `cause` del error.
    //
    // Caso 1 — timeout nuestro: el `abort()` de arriba le pasa un Error con
    //   mensaje útil. Si lo machacamos aquí, el usuario nunca ve el mensaje
    //   específico. Dejamos pasar el `cause` tal cual.
    //
    // Caso 2 — abort externo (componente desmontado, regenerar rápido,
    //   navegación): el `cause` es undefined o un DOMException genérico
    //   ("signal is aborted without reason"). Mostramos un mensaje amable.
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

// ----------------------------------------------------------------------------
// API pública
// ----------------------------------------------------------------------------

export async function generarPriorizacion(
  ia: LlamadaIA,
  opts: GenerarPriorizacionOpts,
): Promise<PriorizacionInmediata> {
  const prompt = buildPrompt(opts);
  const parsed = await llamarLLM<unknown>(ia.baseUrl, ia.apiKey, ia.model, prompt);
  return sanearPriorizacion(parsed, opts.tareas);
}