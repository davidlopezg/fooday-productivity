// ============================================================================
// Tests del aviso de "la BD va por detrás del código" (migration 0034).
// ============================================================================
// Ejecuta con: `node src/lib/recuperacion/feedback.test.mjs`
// Sin framework (patrón del repo) y sin API.
//
// CONTEXTO (bug real, issue #34):
//   La página /Hoy pintaba "No se pudo calcular la propuesta: No se pudieron
//   leer los apartamientos: column tareas.pospuesta_hasta does not exist"
//   porque la migración 0034 no estaba aplicada en el proyecto de Supabase.
//   Este test fija la detección de ese tipo de error para que la app pueda
//   degradar en vez de romperse.
// ============================================================================

import { esEsquemaAusente } from "../supabase/esquema.ts";

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

console.log("\nesEsquemaAusente");

test("columna inexistente (42703) → true", () => {
  eq(
    esEsquemaAusente({
      code: "42703",
      message: "column tareas.pospuesta_hasta does not exist",
    }),
    true,
  );
});

test("tabla inexistente (PGRST205) → true", () => {
  eq(
    esEsquemaAusente({
      code: "PGRST205",
      message:
        "Could not find the table 'public.recuperacion_feedback' in the schema cache",
    }),
    true,
  );
});

test("tabla inexistente en Postgres (42P01) → true", () => {
  eq(
    esEsquemaAusente({
      code: "42P01",
      message: 'relation "public.recuperacion_feedback" does not exist',
    }),
    true,
  );
});

test("sin código pero con el mensaje típico → true", () => {
  eq(esEsquemaAusente({ message: "column tareas.pospuesta_hasta does not exist" }), true);
});

test("error de red o de RLS → false", () => {
  eq(esEsquemaAusente({ code: "42501", message: "permission denied for table tareas" }), false);
  eq(esEsquemaAusente({ message: "Failed to fetch" }), false);
});

test("null / undefined / string → false", () => {
  eq(esEsquemaAusente(null), false);
  eq(esEsquemaAusente(undefined), false);
  eq(esEsquemaAusente("column does not exist"), false);
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} pasado(s), ${fail} fallo(s)`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
