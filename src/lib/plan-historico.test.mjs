// ============================================================================
// Test de regresión del HISTÓRICO del plan diario (issue #73).
// Ejecuta con: `node src/lib/plan-historico.test.mjs`
// Sin framework (patrón del repo) y sin base de datos.
//
// CONTEXTO (issue #73):
//   "El otro día generé un plan y no está en el historial". El plan SÍ se
//   guardaba, pero el histórico no lo enseñaba bien:
//
//   1. El selector de rango (7/30/90/365/todo) NO recargaba: `useData` se
//      llamaba sin `deps`, así que pulsar un rango no cambiaba los datos.
//   2. `fetchPlanes` no pedía `analisis_emocional_ia` ni `reflexion`, así que
//      la "lectura psicológica" y la reflexión del plan salían siempre como
//      "—" (pintar una columna que no viene en el `select` = dato perdido).
//
//   Este test mira el CÓDIGO (como el de schema-queries) porque no hay base
//   de datos en el entorno de tests: fija que las columnas que se pintan se
//   piden, y que el filtro de rango recarga.
// ============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

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

function leer(rel) {
  return readFileSync(path.join(RAIZ, rel), "utf8");
}

/** Cuerpo de una función exportada del código (sin contar las siguientes). */
function cuerpoDe(codigo, nombre) {
  const i = codigo.indexOf(nombre);
  if (i === -1) throw new Error(`No se encontró ${nombre}`);
  const resto = codigo.slice(i);
  const fin = resto.search(/\nexport (async )?function|\n}\n/);
  return resto.slice(0, fin === -1 ? resto.length : fin);
}

// ----------------------------------------------------------------------------
// 1) fetchPlanes pide las columnas que el histórico pinta
// ----------------------------------------------------------------------------

console.log("\n=== El histórico pide los datos que pinta ===");

const queries = leer("src/lib/queries.ts");
const fetchPlanes = cuerpoDe(queries, "export async function fetchPlanes");

/** Columnas que el histórico pinta en la fila desplegada. */
const COLUMNAS = [
  "fecha",
  "semaforo",
  "resumen",
  "recomendacion",
  "num_generacion",
  "despertar",
  "mente",
  "cuerpo",
  "rueda",
  "necesidad",
  "notas",
  "reflexion",
  "analisis_emocional_ia",
  "tendencia_ia",
  "num_bloques_activos",
  "comida_titulo",
  "comida_descripcion",
  "comida_motivo",
];

test("fetchPlanes pide todas las columnas que el histórico pinta", () => {
  const select = fetchPlanes.match(/\.select\(`([^`]*)`\)/);
  if (!select) throw new Error("No se encontró el .select() de fetchPlanes");
  const pedidas = select[1]
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const faltan = COLUMNAS.filter((c) => !pedidas.includes(c));
  if (faltan.length > 0) {
    throw new Error(
      `El histórico pinta columnas que fetchPlanes NO pide: ${faltan.join(", ")} ` +
        `(saldrán vacías). Pedidas: ${pedidas.join(", ")}`,
    );
  }
});

test("fetchPlanes ordena por fecha y generación (lo más reciente primero)", () => {
  if (!fetchPlanes.includes('order("fecha"')) {
    throw new Error("fetchPlanes no ordena por fecha");
  }
  if (!fetchPlanes.includes('order("num_generacion"')) {
    throw new Error("fetchPlanes no ordena por num_generacion");
  }
});

// ----------------------------------------------------------------------------
// 2) El selector de rango recarga de verdad
// ----------------------------------------------------------------------------

console.log("\n=== El selector de rango recarga ===");

const historico = leer("src/app/plan-diario/historico/page.tsx");

test("el histórico declara `deps` en el useData de fetchPlanes", () => {
  const llamada = historico.match(
    /useData<[^>]*>\(\s*\(\)\s*=>\s*fetchPlanes\(filtros\)\s*,\s*\[\]\s*(,\s*\[[^\]]*\])?\s*\)/,
  );
  if (!llamada) {
    throw new Error(
      "No se encontró el useData(() => fetchPlanes(filtros), ...) del histórico",
    );
  }
  if (!llamada[1]) {
    throw new Error(
      "El useData del histórico no declara deps: cambiar el rango NO recarga " +
        "los datos (issue #73)",
    );
  }
  if (!llamada[1].includes("rango")) {
    throw new Error(
      `Los deps del useData del histórico no dependen de "rango": ${llamada[1]}`,
    );
  }
});

test("el histórico avisa cuando no hay planes", () => {
  if (!historico.includes("Aún no hay planes generados")) {
    throw new Error("El histórico perdió el estado vacío");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ El histórico del plan diario pide y muestra todos sus datos");
