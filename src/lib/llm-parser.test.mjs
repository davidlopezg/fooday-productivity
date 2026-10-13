// ============================================================================
// Tests del parser de respuestas LLM.
// ============================================================================
// Ejecuta con: `node src/lib/llm-parser.test.mjs`
// No usa framework — sigue el patrón del proyecto (`parser-pdf.test.mjs`).
// Consume cero créditos de API: todas las respuestas son strings simulados.
// ============================================================================

import {
  extraerJSON,
  parsearYValidar,
  validarEsquema,
  LLMSchemaError,
  ESQUEMA_PLAN_META,
  ESQUEMA_CLASIFICADOR,
} from "./llm-parser.ts";

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${nombre}`);
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e.message });
    console.log(`  ❌ ${nombre}: ${e.message}`);
  }
}

function assertEq(actual, esperado, label = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  if (a !== e) {
    throw new Error(`${label || "assertEq"}: esperaba ${e}, recibí ${a}`);
  }
}

function assertThrows(fn, matcher, label = "") {
  let thrown = null;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  if (!thrown) {
    throw new Error(`${label || "assertThrows"}: esperaba una excepción`);
  }
  if (matcher instanceof RegExp && !matcher.test(thrown.message)) {
    throw new Error(
      `${label || "assertThrows"}: mensaje "${thrown.message}" no encaja con ${matcher}`,
    );
  }
  if (typeof matcher === "string" && !thrown.message.includes(matcher)) {
    throw new Error(
      `${label || "assertThrows"}: mensaje "${thrown.message}" no contiene "${matcher}"`,
    );
  }
}

console.log("\n=== extraerJSON ===");

test("JSON puro sin prefijos", () => {
  const out = extraerJSON('{"krs": []}');
  assertEq(out, '{"krs": []}');
});

test("JSON envuelto en ```json ... ```", () => {
  const out = extraerJSON('```json\n{"krs": []}\n```');
  assertEq(out, '{"krs": []}');
});

test("JSON envuelto en ``` ... ``` (sin 'json')", () => {
  const out = extraerJSON('```\n{"krs": []}\n```');
  assertEq(out, '{"krs": []}');
});

test("Bloque <think> antes del JSON", () => {
  const r = `<think>Let me analyze this carefully.
The user wants a plan for something. I should output JSON.
</think>
{"krs": [{"titulo": "X", "tareas": []}]}`;
  const out = extraerJSON(r);
  assertEq(out, '{"krs": [{"titulo": "X", "tareas": []}]}');
});

test("Bloque <think> multilínea y JSON multilínea", () => {
  const r = `<think>
Let me think step by step:
1. First, identify the goal.
2. Then plan it.
</think>
{
  "krs": [
    {"titulo": "Goal 1", "tareas": []}
  ]
}`;
  const out = extraerJSON(r);
  const parsed = JSON.parse(out);
  assertEq(parsed.krs.length, 1);
  assertEq(parsed.krs[0].titulo, "Goal 1");
});

test("Variante <reasoning>...</reasoning>", () => {
  const r = `<reasoning>Some reasoning</reasoning>{"krs": []}`;
  const out = extraerJSON(r);
  assertEq(out, '{"krs": []}');
});

test("Variante <|reasoning|>...</|reasoning|>", () => {
  const r = `<|reasoning|>Some reasoning</|reasoning|>{"krs": []}`;
  const out = extraerJSON(r);
  assertEq(out, '{"krs": []}');
});

test("Texto explicativo ANTES del JSON (sin tag)", () => {
  const r = `Aquí está el plan que pediste:
{"krs": [{"titulo": "A", "tareas": []}]}`;
  const out = extraerJSON(r);
  assertEq(out, '{"krs": [{"titulo": "A", "tareas": []}]}');
});

test("JSON con llaves anidadas (objetos dentro)", () => {
  const r = `<think>analyze</think>{"krs": [{"meta": {"id": 1, "data": {"x": 2}}}]}`;
  const out = extraerJSON(r);
  const parsed = JSON.parse(out);
  assertEq(parsed.krs[0].meta.data.x, 2);
});

test("Strings con llaves dentro (no debe confundirlas)", () => {
  const r = `<think>Use {curly} braces carefully</think>{"krs": [{"titulo": "Hacer {x}"}]}`;
  const out = extraerJSON(r);
  const parsed = JSON.parse(out);
  assertEq(parsed.krs[0].titulo, "Hacer {x}");
});

test("Respuesta vacía → lanza LLMParseError", () => {
  assertThrows(() => extraerJSON(""), /vacía/, "vacía");
});

test("Sin JSON → lanza LLMParseError", () => {
  assertThrows(
    () => extraerJSON("Esto no es JSON, solo texto"),
    /'\{'/,
    "sin {",
  );
});

test("JSON truncado (sin cerrar) → lanza LLMParseError", () => {
  assertThrows(
    () => extraerJSON('<think>razonar</think>{"krs": [{"titu'),
    /cierre/,
    "truncado",
  );
});

test("Solo ```json``` vacío → lanza error", () => {
  assertThrows(() => extraerJSON("```json\n```"), /'\{'/, "fence vacío");
});

console.log("\n=== validarEsquema ===");

test("Esquema object básico correcto", () => {
  validarEsquema({ krs: [] }, { type: "object", fields: { krs: { type: "array" } } });
});

test("Falta campo obligatorio", () => {
  assertThrows(
    () => validarEsquema({}, { type: "object", fields: { krs: { type: "array" } } }),
    LLMSchemaError,
    "falta krs",
  );
});

test("Campo optional no falla si falta", () => {
  validarEsquema(
    { krs: [] },
    {
      type: "object",
      fields: {
        krs: { type: "array" },
        meta: { type: "string", optional: true },
      },
    },
  );
});

test("Tipo incorrecto lanza LLMSchemaError", () => {
  assertThrows(
    () => validarEsquema({ krs: "no es array" }, { type: "object", fields: { krs: { type: "array" } } }),
    LLMSchemaError,
    "tipo krs",
  );
});

test("Enum falla si valor no está en lista", () => {
  assertThrows(
    () =>
      validarEsquema(
        { prioridad: "altisima" },
        { type: "object", fields: { prioridad: { type: "string", enum: ["alta", "media", "baja"] } } },
      ),
    LLMSchemaError,
    "enum",
  );
});

test("Enum acepta valor válido", () => {
  validarEsquema(
    { prioridad: "alta" },
    { type: "object", fields: { prioridad: { type: "string", enum: ["alta", "media", "baja"] } } },
  );
});

test("Array de objetos valida todos los items", () => {
  assertThrows(
    () =>
      validarEsquema(
        { krs: [{ titulo: "ok" }, { titulo: 123 }] },
        {
          type: "object",
          fields: {
            krs: { type: "array", items: { type: "object", fields: { titulo: { type: "string" } } } },
          },
        },
      ),
    LLMSchemaError,
    "item 1 inválido",
  );
});

console.log("\n=== parsearYValidar (integración) ===");

test("JSON válido pasa", () => {
  const r = `{"krs": [{"titulo": "X", "tareas": []}]}`;
  const out = parsearYValidar(r, ESQUEMA_PLAN_META);
  assertEq(out.krs.length, 1);
});

test("JSON con <think> prepended y esquema válido", () => {
  const r = `<think>Let me think.
The user wants a plan.
</think>
{
  "krs": [
    {"unidad_tiempo": "trimestre", "trimestre": 1, "titulo": "Plan Q1", "descripcion": null, "metrica": null, "valor_objetivo": 1, "unidad": null, "peso": 1, "tareas": []}
  ]
}`;
  const out = parsearYValidar(r, ESQUEMA_PLAN_META);
  assertEq(out.krs[0].titulo, "Plan Q1");
});

test("JSON con ```json``` fence y esquema válido", () => {
  const r = '```json\n{"krs": []}\n```';
  const out = parsearYValidar(r, ESQUEMA_PLAN_META);
  assertEq(out.krs, []);
});

test("JSON con krs vacíos Y enum inválido en una tarea → LLMSchemaError", () => {
  const r = `{"krs": [{"unidad_tiempo": "trimestre", "trimestre": 1, "titulo": "X", "peso": 1, "tareas": [{"titulo": "t1", "prioridad": "super-mega-alta"}]}]}`;
  assertThrows(() => parsearYValidar(r, ESQUEMA_PLAN_META), LLMSchemaError);
});

test("Clasificador: JSON válido con clasificación proyecto", () => {
  const r = `{"clasificacion": "proyecto", "razon_clasificacion": "es un proyecto", "area_nombre": "Trabajo", "metas": [{"meta_titulo": "M1"}]}`;
  const out = parsearYValidar(r, ESQUEMA_CLASIFICADOR);
  assertEq(out.clasificacion, "proyecto");
  assertEq(out.metas.length, 1);
});

test("Clasificador: clasificación con valor inválido → LLMSchemaError", () => {
  const r = `{"clasificacion": "no-se-que", "metas": []}`;
  assertThrows(() => parsearYValidar(r, ESQUEMA_CLASIFICADOR), LLMSchemaError);
});

test("JSON incompleto (sin metas) → LLMSchemaError", () => {
  const r = `<think>analyze</think>{"clasificacion": "meta"}`;
  assertThrows(() => parsearYValidar(r, ESQUEMA_CLASIFICADOR), LLMSchemaError);
});

test("Truncado real (como podría pasar con timeout) → error", () => {
  const r = `<think>thinking</think>{"krs": [{"unidad_tiempo": "trimestre", "trimestre": 1, "tit`;
  assertThrows(() => parsearYValidar(r, ESQUEMA_PLAN_META), /cierre|truncad/i);
});

test("Solo espacios en blanco → error vacío", () => {
  assertThrows(() => parsearYValidar("   \n  ", ESQUEMA_PLAN_META), /vacía/);
});

test("Dos metas con contextos distintos: el parser no reutiliza estado", () => {
  // Verificamos que llamar parsearYValidar 2 veces seguidas con
  // respuestas distintas no contamina el resultado.
  const r1 = `{"krs": [{"unidad_tiempo": "trimestre", "trimestre": 1, "titulo": "Meta 1", "peso": 1, "tareas": []}]}`;
  const r2 = `{"krs": [{"unidad_tiempo": "trimestre", "trimestre": 1, "titulo": "Meta 2", "peso": 1, "tareas": []}]}`;
  const o1 = parsearYValidar(r1, ESQUEMA_PLAN_META);
  const o2 = parsearYValidar(r2, ESQUEMA_PLAN_META);
  assertEq(o1.krs[0].titulo, "Meta 1");
  assertEq(o2.krs[0].titulo, "Meta 2");
});

console.log("\n---");
console.log(`Resultado: ${pass} pasaron, ${fail} fallaron.`);
if (fail > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  - ${f.nombre}: ${f.error}`);
  process.exit(1);
}
