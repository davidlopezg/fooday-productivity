// ============================================================================
// Test integrado del comportamiento de retry: la IA devuelve 2 veces el
// mismo plan, y el apply NO debe duplicar KRs ni tareas.
// ============================================================================
// No consumimos API real: simulamos la respuesta del LLM.
// ============================================================================

import { construirUnidadesParaPlan, saneKrsFromParsed } from "./plan.ts";

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

console.log("\n=== Reintento no duplica KRs/tareas (lógica del apply) ===");

// Simula el comportamiento de aplicarKrsYTareasEnMeta: dado un Map de
// títulos existentes, descartar duplicados. Esto refleja el código real.
function simularApply(planRaw, titulosExistentes) {
  const titulos = new Set(titulosExistentes);
  let krsCreados = 0;
  let tareasCreadas = 0;
  let tareasSaltadas = 0;
  const titulosResult = new Set(titulosExistentes);

  for (const kr of planRaw.krs) {
    krsCreados++;
    for (const t of kr.tareas) {
      const norm = t.titulo.trim().toLowerCase();
      if (titulosResult.has(norm)) {
        tareasSaltadas++;
        continue;
      }
      titulosResult.add(norm);
      tareasCreadas++;
    }
  }
  return { krsCreados, tareasCreadas, tareasSaltadas };
}

test("Primer apply: 0 duplicados, 3 tareas creadas", () => {
  const plan = {
    krs: [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR1",
        tareas: [
          { titulo: "Llamar a inmobiliario" },
          { titulo: "Visitar local X" },
          { titulo: "Pedir dossier" },
        ],
      },
    ],
  };
  const r = simularApply(plan, []);
  assertEq(r.krsCreados, 1);
  assertEq(r.tareasCreadas, 3);
  assertEq(r.tareasSaltadas, 0);
});

test("Segundo apply con mismo plan: 3 tareas saltadas por dedupe", () => {
  const plan = {
    krs: [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR1",
        tareas: [
          { titulo: "Llamar a inmobiliario" },
          { titulo: "Visitar local X" },
          { titulo: "Pedir dossier" },
        ],
      },
    ],
  };
  const r = simularApply(plan, [
    "llamar a inmobiliario",
    "visitar local x",
    "pedir dossier",
  ]);
  assertEq(r.krsCreados, 1);
  assertEq(r.tareasCreadas, 0);
  assertEq(r.tareasSaltadas, 3);
});

test("Retry: el LLM devuelve 1 KR con 2 tareas (1 repetida, 1 nueva)", () => {
  const plan = {
    krs: [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR1",
        tareas: [
          { titulo: "Llamar a inmobiliario" }, // repetida
          { titulo: "Visitar local Y" }, // nueva
        ],
      },
    ],
  };
  const r = simularApply(plan, ["llamar a inmobiliario"]);
  assertEq(r.tareasCreadas, 1);
  assertEq(r.tareasSaltadas, 1);
});

test("Dedupe es case-insensitive y trim-spaces", () => {
  const plan = {
    krs: [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR1",
        tareas: [
          { titulo: "  LLAMAR A INMOBILIARIO  " }, // misma tarea, formato distinto
          { titulo: "Llamar a inmobiliario" },
        ],
      },
    ],
  };
  const r = simularApply(plan, []);
  assertEq(r.tareasCreadas, 1);
  assertEq(r.tareasSaltadas, 1);
});

console.log("\n=== El parser robusto recupera respuestas con <think> ===");

import { extraerJSON, parsearYValidar, ESQUEMA_PLAN_META } from "./llm-parser.ts";

test("Recupera respuesta con `` y JSON válido", () => {
  const r = `<think>
Déjame pensar en 3 KRs mensuales para esta meta sobre buscar locales
para pizzería en La Selva de Mar.
</think>
{
  "krs": [
    {
      "unidad_tiempo": "mes",
      "mes": 10,
      "titulo": "Definir criterios de búsqueda",
      "tareas": [{"titulo": "Listar requisitos mínimos"}]
    },
    {
      "unidad_tiempo": "mes",
      "mes": 11,
      "titulo": "Mapear canales",
      "tareas": []
    }
  ]
}`;
  const parsed = parsearYValidar(r, ESQUEMA_PLAN_META);
  assertEq(parsed.krs.length, 2);
  // Verificar que pasa el saneador con las unidades correctas.
  const saneados = saneKrsFromParsed(
    parsed.krs,
    construirUnidadesParaPlan({
      fecha_inicio_meta: "2026-10-13",
      fecha_objetivo: "2026-12-17",
      anio: 2026,
    }),
  );
  assertEq(saneados.length, 2);
});

test("JSON truncado lanza error claro", () => {
  const r = `<think>cortar</think>{"krs": [{"unidad_tiempo": "mes", "mes": 10, "t`;
  let thrown = null;
  try {
    parsearYValidar(r, ESQUEMA_PLAN_META);
  } catch (e) {
    thrown = e;
  }
  if (!thrown) throw new Error("esperaba error en JSON truncado");
  if (!/cierre|truncad|Invalid|Unexpected/i.test(thrown.message)) {
    throw new Error(`mensaje no claro: ${thrown.message}`);
  }
});

test("JSON totalmente inválido lanza error", () => {
  const r = `esto no es JSON, solo texto sin estructura`;
  let thrown = null;
  try {
    parsearYValidar(r, ESQUEMA_PLAN_META);
  } catch (e) {
    thrown = e;
  }
  if (!thrown) throw new Error("esperaba error en JSON inválido");
});

test("extraerJSON maneja variantes de razonamiento", () => {
  const variants = [
    `<think>razonar</think>{"a":1}`,
    `<reasoning>r</reasoning>{"a":1}`,
    `<|reasoning|>r</|reasoning|>{"a":1}`,
    `A continuación el JSON: {"a":1}`,
    "```json\n{\"a\":1}\n```",
  ];
  for (const v of variants) {
    const out = extraerJSON(v);
    if (out !== '{"a":1}') {
      throw new Error(`variant no recuperó JSON: ${v.slice(0, 40)}...`);
    }
  }
});

console.log("\n---");
console.log(`Resultado: ${pass} pasaron, ${fail} fallaron.`);
if (fail > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  - ${f.nombre}: ${f.error}`);
  process.exit(1);
}
