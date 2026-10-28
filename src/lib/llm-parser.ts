// ============================================================================
// llm-parser.ts — extracción y validación robusta de respuestas del LLM.
// ============================================================================
// Encapsula tres problemas que el parser inline de plan.ts tenía:
//   1) Confiar en JSON.parse directo: falla con `` prepending.
//   2) `sanearJSONComun` arreglaba trailing commas y comillas simples — útil
//      pero enmascaraba JSON inválido de raíz (objetos cortados, comillas
//      sin cerrar).
//   3) No validaba esquema: si la IA devolvía `{krs: []}` o `{tareas: []}`
//      sin las propiedades esperadas, el caller recibía un objeto
//      estructuralmente incompleto y lo trataba como éxito.
//
// Estrategia:
//   · Extraer: limpiar `` / ```json``` / razonamiento, luego
//     encontrar el primer bloque JSON balanceado por conteo de llaves
//     (sin regex frágiles).
//   · Parsear: JSON.parse estricto. Si falla, NO reintentar parchar —
//     lanzar un error tipado con la causa exacta.
//   · Validar: aplicar `schema.parse(obj)` que es un validador manual
//     (sin dependencias) que comprueba que el objeto tiene la forma
//     esperada. Si falla, lanza `LLMSchemaError` con qué campo falló.
//
// Diseño sin dependencias (Zod añade 50KB+ al bundle). El validador
// es deliberadamente limitado: comprueba tipos básicos y presencia
// de campos. No es un JSON Schema completo.
// ============================================================================

// NOTA: los campos se declaran explícitamente (en vez de usar parameter
// properties `public readonly x` en el constructor) para que el fichero se
// pueda ejecutar con el type-stripping nativo de Node (`node --experimental-
// strip-types` / por defecto en Node 22.6+). El modo strip-only no soporta
// parameter properties. Comportamiento idéntico.
export class LLMParseError extends Error {
  readonly content: string;
  override readonly cause?: unknown;

  constructor(message: string, content: string, cause?: unknown) {
    super(message);
    this.content = content;
    this.cause = cause;
    this.name = "LLMParseError";
  }
}

export class LLMSchemaError extends Error {
  readonly issues: Array<{ path: string; expected: string; got: string }>;

  constructor(
    message: string,
    issues: Array<{ path: string; expected: string; got: string }>,
  ) {
    super(message);
    this.issues = issues;
    this.name = "LLMSchemaError";
  }
}

// ----------------------------------------------------------------------------
// Extracción: limpia la respuesta y devuelve un string con un único JSON
// balanceado. NO parchea trailing commas ni comillas sueltas — si el JSON
// está malformado, falla rápido con LLMParseError.
// ----------------------------------------------------------------------------

export function extraerJSON(content: string): string {
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new LLMParseError("Respuesta vacía del LLM.", content ?? "");
  }
  let s = content.trim();

  // 1) Quitar fences ```json ... ``` o ``` ... ```.
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();

  // 2) Quitar bloques de razonamiento del modelo.
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  s = s.replace(/<\|?\s*reasoning\s*\|?>[\s\S]*?<\|?\s*\/?\s*reasoning\s*\|?>/gi, "").trim();
  s = s.replace(/<\s*reasoning\s*>[\s\S]*?<\s*\/\s*reasoning\s*>/gi, "").trim();

  // 3) Quitar fences que hayan quedado tras el strip (algunos modelos los
  //    ponen alrededor del JSON real, dentro de un bloque de razonamiento).
  const fence2 = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence2) s = fence2[1].trim();

  // 4) Encontrar el primer bloque JSON balanceado por conteo de llaves.
  //    Esto es robusto frente a que la IA anteponga texto en lenguaje
  //    natural antes del JSON real: el primer '{' podría estar dentro
  //    de una frase ("la idea es { tal }"), pero el primer '{' que
  //    cierra correctamente es el inicio del JSON.
  const start = s.indexOf("{");
  if (start < 0) {
    throw new LLMParseError(
      "No se encontró '{' en la respuesta del LLM (puede ser texto sin JSON).",
      s.slice(0, 200),
    );
  }

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
  throw new LLMParseError(
    "No se encontró el cierre del JSON (llaves desbalanceadas o respuesta truncada).",
    s.slice(start, start + 200),
  );
}

// ----------------------------------------------------------------------------
// Validación de esquema mínima. Soporta:
//   · type: "string" | "number" | "boolean" | "array" | "object" | "any"
//   · optional: true → no falla si falta
//   · fields: { [key]: sub-schema } (solo para type "object")
//   · items: sub-schema (solo para type "array")
//   · enum: ["a", "b"] → restringe los valores válidos
//
// NO soporta: oneOf, anyOf, allOf, refs. Si necesitamos eso, añadimos
// Zod o ajv. Por ahora cubre los 3 esquemas que usa la app: el del
// clasificador, el del plan meta, y el del WIGs.
// ----------------------------------------------------------------------------

export type FieldSchema = {
  type: "string" | "number" | "boolean" | "array" | "object" | "any";
  optional?: boolean;
  fields?: Record<string, FieldSchema>;
  items?: FieldSchema;
  enum?: ReadonlyArray<string | number | boolean>;
};

export function validarEsquema(
  obj: unknown,
  schema: FieldSchema,
  path = "$",
): void {
  if (obj === undefined || obj === null) {
    if (schema.optional) return;
    throw new LLMSchemaError(`Falta campo obligatorio en ${path}`, [
      { path, expected: schema.type, got: "null/undefined" },
    ]);
  }
  if (schema.type === "any") return;

  const got = Array.isArray(obj)
    ? "array"
    : obj === null
      ? "null"
      : typeof obj;

  if (schema.type === "object") {
    if (got !== "object") {
      throw new LLMSchemaError(`${path} esperaba object, recibí ${got}`, [
        { path, expected: "object", got },
      ]);
    }
    if (schema.fields) {
      const issues: Array<{ path: string; expected: string; got: string }> = [];
      for (const [k, sub] of Object.entries(schema.fields)) {
        const v = (obj as Record<string, unknown>)[k];
        try {
          validarEsquema(v, sub, `${path}.${k}`);
        } catch (e) {
          if (e instanceof LLMSchemaError) {
            issues.push(...e.issues);
          } else {
            throw e;
          }
        }
      }
      if (issues.length > 0) {
        throw new LLMSchemaError(
          `Esquema inválido en ${path}: ${issues.length} campo(s) con problemas.`,
          issues,
        );
      }
    }
    return;
  }

  if (schema.type === "array") {
    if (got !== "array") {
      throw new LLMSchemaError(`${path} esperaba array, recibí ${got}`, [
        { path, expected: "array", got },
      ]);
    }
    if (schema.items) {
      const arr = obj as unknown[];
      for (let i = 0; i < arr.length; i++) {
        try {
          validarEsquema(arr[i], schema.items, `${path}[${i}]`);
        } catch (e) {
          if (e instanceof LLMSchemaError) throw e;
          throw e;
        }
      }
    }
    return;
  }

  // Tipos primitivos
  const expectedMap: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
  };
  const expected = expectedMap[schema.type];
  if (got !== expected) {
    throw new LLMSchemaError(
      `${path} esperaba ${expected}, recibí ${got}`,
      [{ path, expected, got }],
    );
  }
  if (schema.enum) {
    if (!schema.enum.includes(obj as never)) {
      throw new LLMSchemaError(
        `${path} = ${JSON.stringify(obj)} no está en enum [${schema.enum.join(", ")}]`,
        [{ path, expected: `enum[${schema.enum.join(", ")}]`, got: String(obj) }],
      );
    }
  }
}

// ----------------------------------------------------------------------------
// Helper de alto nivel: extrae + parsea + valida en un solo paso.
// Si la validación falla, lanza LLMSchemaError con detalles para que el
// caller pueda decidir si reintentar.
// ----------------------------------------------------------------------------

export function parsearYValidar<T = unknown>(
  content: string,
  schema: FieldSchema,
): T {
  const json = extraerJSON(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new LLMParseError(
      `JSON inválido tras extracción: ${(e as Error).message}`,
      json.slice(0, 200),
      e,
    );
  }
  validarEsquema(parsed, schema);
  return parsed as T;
}

// ----------------------------------------------------------------------------
// Esquemas reutilizables para los 3 lugares donde llamamos al LLM.
// Definidos aquí para que cualquier caller los importe y no duplique
// la definición del JSON esperado.
// ----------------------------------------------------------------------------

/** Esquema de la respuesta de `generarPlanMetaIA`. */
export const ESQUEMA_PLAN_META: FieldSchema = {
  type: "object",
  fields: {
    unidades_usadas: { type: "array", optional: true },
    krs: {
      type: "array",
      items: {
        type: "object",
        fields: {
          unidad_tiempo: {
            type: "string",
            enum: ["trimestre", "mes"],
            optional: true,
          },
          trimestre: { type: "number", optional: true },
          mes: { type: "number", optional: true },
          titulo: { type: "string" },
          descripcion: { type: "string", optional: true },
          metrica: { type: "string", optional: true },
          valor_objetivo: { type: "number", optional: true },
          unidad: { type: "string", optional: true },
          peso: { type: "number", optional: true },
          tareas: {
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
                recurrencia_tipo: {
                  type: "string",
                  enum: ["diaria", "semanal", "mensual"],
                  optional: true,
                },
                recurrencia_dias_semana: { type: "array", optional: true },
                recurrencia_dia_mes: { type: "number", optional: true },
                criterio_terminacion: { type: "string", optional: true },
              },
            },
          },
        },
      },
    },
  },
};

/** Esquema de la respuesta de `clasificarYGenerarIA`. */
export const ESQUEMA_CLASIFICADOR: FieldSchema = {
  type: "object",
  fields: {
    clasificacion: {
      type: "string",
      enum: ["proyecto", "meta", "captura"],
    },
    razon_clasificacion: { type: "string", optional: true },
    area_nombre: { type: "string", optional: true },
    proyecto: {
      type: "object",
      optional: true,
      fields: {
        nombre: { type: "string" },
        descripcion: { type: "string", optional: true },
        color: { type: "string", optional: true },
      },
    },
    metas: {
      type: "array",
      items: {
        type: "object",
        fields: {
          meta_titulo: { type: "string" },
          meta_descripcion: { type: "string", optional: true },
          meta_ambito: {
            type: "string",
            enum: ["personal", "profesional"],
            optional: true,
          },
          meta_plazo: { type: "string", optional: true },
          fecha_objetivo: { type: "string", optional: true },
          contexto: { type: "string", optional: true },
          unidad_tiempo: {
            type: "string",
            enum: ["trimestre", "mes"],
            optional: true,
          },
          mes: { type: "number", optional: true },
          trimestre: { type: "number", optional: true },
          kr_inicial: {
            type: "object",
            optional: true,
            fields: {
              unidad_tiempo: {
                type: "string",
                enum: ["trimestre", "mes"],
                optional: true,
              },
              mes: { type: "number", optional: true },
              trimestre: { type: "number", optional: true },
              titulo: { type: "string" },
              metrica: { type: "string", optional: true },
              valor_objetivo: { type: "number", optional: true },
              unidad: { type: "string", optional: true },
            },
          },
        },
      },
    },
  },
};

/** Esquema para la respuesta de `generarTareasParaKrIA`: solo
 *  devuelve un array de tareas, no un plan completo. Cada tarea tiene
 *  título, prioridad, recurrencia opcional y criterio de terminación. */
export const ESQUEMA_TAREAS_KR: FieldSchema = {
  type: "object",
  fields: {
    tareas: {
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
          recurrencia_tipo: {
            type: "string",
            enum: ["diaria", "semanal", "mensual"],
            optional: true,
          },
          recurrencia_dias_semana: { type: "array", optional: true },
          recurrencia_dia_mes: { type: "number", optional: true },
          criterio_terminacion: { type: "string", optional: true },
        },
      },
    },
  },
};
