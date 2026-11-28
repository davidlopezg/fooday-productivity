// ============================================================================
// Test del informe de IMPRODUCTIVIDAD (issue #65).
//
// QUÉ COMPRUEBA
//   1. La clasificación de un día: principal > secundarias > nada.
//   2. `normalizarDia` separa la principal (la primera por orden) de las
//      secundarias y devuelve null si el plan no tiene filas.
//   3. El resumen cuenta los tres tipos y el % de días con principal.
//   4. La regla del producto: un día sin principal NO es un día bueno, por
//      mucho trabajo que se haya hecho.
//
// ============================================================================

import {
  clasificarDia,
  etiquetaEstado,
  normalizarDia,
  resumenImproductividad,
} from "@/lib/informes/improductividad";

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
    failures.push({ nombre, error: e instanceof Error ? e.message : String(e) });
    console.log(`  ❌ ${nombre}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg ?? ""} esperaba ${b}, obtuvo ${a}`);
}

function tarea(orden, hecho, titulo = `T${orden}`) {
  return { orden, hecho, titulo };
}

// ----------------------------------------------------------------------------

test("un día con la principal hecha es 'principal' (aunque también haya secundarias)", () => {
  const dia = normalizarDia("2026-11-27", [
    tarea(1, true, "Secundaria 1"),
    tarea(0, true, "Principal"),
  ]);
  eq(dia.principal.titulo, "Principal", "la principal es la de orden más bajo:");
  eq(clasificarDia(dia), "principal");
});

test("un día sin principal pero con una secundaria hecha es 'secundarias'", () => {
  const dia = normalizarDia("2026-11-27", [
    tarea(0, false, "Principal"),
    tarea(1, true, "Secundaria 1"),
    tarea(2, false, "Secundaria 2"),
  ]);
  eq(clasificarDia(dia), "secundarias");
});

test("un día sin nada del plan hecho es 'nada'", () => {
  const dia = normalizarDia("2026-11-27", [
    tarea(0, false, "Principal"),
    tarea(1, false, "Secundaria 1"),
  ]);
  eq(clasificarDia(dia), "nada");
});

test("normalizarDia ordena las filas y deja el resto como secundarias", () => {
  const dia = normalizarDia("2026-11-27", [
    tarea(2, false, "C"),
    tarea(0, false, "A"),
    tarea(1, true, "B"),
  ]);
  eq(dia.principal.titulo, "A");
  eq(dia.secundarias.length, 2);
  eq(dia.secundarias[0].titulo, "B");
  eq(dia.secundarias[1].titulo, "C");
});

test("un plan sin filas NO es un día (devuelve null)", () => {
  eq(normalizarDia("2026-11-27", []), null);
});

test("el resumen cuenta los tres tipos y el % de días con principal", () => {
  const dias = [
    normalizarDia("2026-11-25", [tarea(0, true)]),
    normalizarDia("2026-11-26", [tarea(0, false), tarea(1, true)]),
    normalizarDia("2026-11-27", [tarea(0, false)]),
    normalizarDia("2026-11-28", [tarea(0, true)]),
  ].filter((d) => d !== null);
  const r = resumenImproductividad(dias);
  eq(r.diasConPlan, 4);
  eq(r.conPrincipal, 2);
  eq(r.soloSecundarias, 1);
  eq(r.nada, 1);
  eq(r.pctPrincipal, 50);
});

test("sin días con plan el % es 0 (no NaN)", () => {
  const r = resumenImproductividad([]);
  eq(r.diasConPlan, 0);
  eq(r.pctPrincipal, 0);
});

test("cada estado tiene su etiqueta", () => {
  eq(etiquetaEstado("principal"), "Con principal");
  eq(etiquetaEstado("secundarias"), "Solo secundarias");
  eq(etiquetaEstado("nada"), "Nada");
});

// ----------------------------------------------------------------------------

if (fail > 0) {
  console.log(`\n❌ ${fail} fallo(s) de ${pass + fail}`);
  for (const f of failures) console.log(`   · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log(`\n✅ ${pass} tests OK`);
