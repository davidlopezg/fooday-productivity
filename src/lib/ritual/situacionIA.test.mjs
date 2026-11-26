// ============================================================================
// Tests del saneado del borrador de situación (issue #88).
// ============================================================================
// Ejecuta con: `node src/lib/ritual/situacionIA.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import { sanearSituacion } from "./situacionIA.ts";

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

console.log("\nsanearSituacion");

test("quita el markdown de las listas", () => {
  eq(sanearSituacion("- uno\n- dos"), "uno dos");
});

test("quita los títulos", () => {
  eq(sanearSituacion("## Situación\nEl cliente no contesta"), "Situación El cliente no contesta");
});

test("quita las negritas", () => {
  eq(sanearSituacion("**Importante**: esperando"), "Importante: esperando");
});

test("quita la envoltura de comillas", () => {
  eq(sanearSituacion('"texto entrecomillado"'), "texto entrecomillado");
});

test("quita la envoltura de bloque de código", () => {
  eq(sanearSituacion("```\ntexto\n```"), "texto");
});

test("colapsa los espacios y recorta", () => {
  eq(sanearSituacion("  a   b  "), "a b");
});

test("recorta a la longitud máxima", () => {
  const largo = "x".repeat(1000);
  const out = sanearSituacion(largo, 100);
  eq(out.length <= 101, true);
  eq(out.endsWith("…"), true);
});

test("un texto vacío se queda vacío", () => {
  eq(sanearSituacion("   "), "");
});

console.log(`\n${pass} ok, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
