// ============================================================================
// Tests de la lógica de la capa de escenarios.
// ============================================================================
// Ejecuta con: `node src/lib/escenarios/hipotesis.test.mjs`
// No usa framework — sigue el patrón del proyecto (`llm-parser.test.mjs`).
// Consume cero créditos de API: solo funciones puras.
// ============================================================================

import {
  sanearHipotesis,
  estadoDeProyecto,
  haceCuanto,
} from "./hipotesis.ts";

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

function eq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg ?? "desigual"}: ${sa} !== ${sb}`);
}

// ----------------------------------------------------------------------------
// sanearHipotesis
// ----------------------------------------------------------------------------

console.log("\nsanearHipotesis");

test("descarta hipótesis sin título", () => {
  const r = sanearHipotesis([
    { categoria: "riesgo", titulo: "  ", probabilidad: 50, estrategia: "Hacer X" },
  ]);
  eq(r.length, 0);
});

test("descarta hipótesis sin estrategia (no valen nada)", () => {
  const r = sanearHipotesis([
    { categoria: "riesgo", titulo: "Algo pasa", probabilidad: 50, estrategia: "   " },
  ]);
  eq(r.length, 0);
});

test("fuerza una categoría válida", () => {
  const r = sanearHipotesis([
    { categoria: "inventada", titulo: "T", probabilidad: 10, estrategia: "E" },
  ]);
  eq(r[0].categoria, "riesgo");
});

test("clampea la probabilidad a 0-100", () => {
  const r = sanearHipotesis([
    { categoria: "riesgo", titulo: "A", probabilidad: 180, estrategia: "E" },
    { categoria: "riesgo", titulo: "B", probabilidad: -5, estrategia: "E" },
  ]);
  eq(r[0].probabilidad, 100);
  eq(r[1].probabilidad, 0);
});

test("probabilidad no numérica → 50", () => {
  const r = sanearHipotesis([
    { categoria: "riesgo", titulo: "A", probabilidad: "alta", estrategia: "E" },
  ]);
  eq(r[0].probabilidad, 50);
});

test("ordena de más probable a menos probable", () => {
  const r = sanearHipotesis([
    { categoria: "riesgo", titulo: "Baja", probabilidad: 20, estrategia: "E" },
    { categoria: "riesgo", titulo: "Alta", probabilidad: 80, estrategia: "E" },
  ]);
  eq(r[0].titulo, "Alta");
});

test("entrada que no es array → []", () => {
  eq(sanearHipotesis(null), []);
  eq(sanearHipotesis({ titulo: "x" }), []);
});

// ----------------------------------------------------------------------------
// estadoDeProyecto
// ----------------------------------------------------------------------------

console.log("\nestadoDeProyecto");

const HOY = "2026-10-22";

test("cuenta hechas / abiertas / bloqueadas / vencidas", () => {
  const e = estadoDeProyecto(
    [
      { estado: "hecha", deadline: null },
      { estado: "pendiente", deadline: "2026-10-01" }, // vencida
      { estado: "en_progreso", deadline: "2026-11-01" },
      { estado: "bloqueada", deadline: null },
      { estado: "descartada", deadline: null },
    ],
    HOY,
  );
  eq(e.total, 5);
  eq(e.hechas, 1);
  eq(e.abiertas, 3); // pendiente + en_progreso + bloqueada
  eq(e.bloqueadas, 1);
  eq(e.vencidas, 1);
  eq(e.avance, 20); // 1/5
});

test("una tarea hecha y vencida NO cuenta como vencida", () => {
  const e = estadoDeProyecto([{ estado: "hecha", deadline: "2026-01-01" }], HOY);
  eq(e.vencidas, 0);
});

test("próximo vencimiento = la fecha más próxima pendiente", () => {
  const e = estadoDeProjectoSafe();
  eq(e.proximoVencimiento, "2026-10-25");
});

function estadoDeProjectoSafe() {
  return estadoDeProyecto(
    [
      { estado: "pendiente", deadline: "2026-11-30" },
      { estado: "pendiente", deadline: "2026-10-25" },
      { estado: "hecha", deadline: "2026-09-01" },
    ],
    HOY,
  );
}

test("sin tareas → avance 0 y sin vencimiento", () => {
  const e = estadoDeProyecto([], HOY);
  eq(e.total, 0);
  eq(e.avance, 0);
  eq(e.proximoVencimiento, null);
});

// ----------------------------------------------------------------------------
// haceCuanto
// ----------------------------------------------------------------------------

console.log("\nhaceCuanto");

test("hoy / ayer / hace N días", () => {
  eq(haceCuanto("2026-10-22T10:00:00Z", HOY), "hoy");
  eq(haceCuanto("2026-10-21T10:00:00Z", HOY), "ayer");
  eq(haceCuanto("2026-10-19T10:00:00Z", HOY), "hace 3 días");
});

test("más de un mes → meses (redondeo a 30 días)", () => {
  // 2026-08-01 → 2026-10-22 = 82 días ≈ 2,7 meses → 3
  eq(haceCuanto("2026-08-01T10:00:00Z", HOY), "hace 3 mes(es)");
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
