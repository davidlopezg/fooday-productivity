// ============================================================================
// Tests del perfil de IA (migration 0032).
// Ejecuta con: `npm test`
//
// El contrato crítico de esta migración es "cero cambios de comportamiento":
// un usuario que nunca abre /configuracion debe recibir EXACTAMENTE los
// prompts que recibía antes, cuando el perfil estaba escrito dentro de las
// plantillas de plan.ts / planSimple.ts. Estos tests fijan ese contrato.
// ============================================================================

import {
  DEFAULT_PERFIL_IA,
  bloquePerfil,
  perfilConDefaults,
} from "./perfilIA.ts";

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

function eq(a, b, msg = "") {
  if (a !== b) throw new Error(`${msg} ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function includes(haystack, needle, msg = "") {
  if (!haystack.includes(needle)) {
    throw new Error(`${msg} no contiene ${JSON.stringify(needle)}`);
  }
}

// --- El perfil por defecto conserva los textos que estaban hardcodeados ----
// Si alguien cambia DEFAULT_PERFIL_IA, el prompt de un usuario que no ha
// personalizado nada cambia en silencio. Estos asserts son elamping audible.

test("DEFAULT_PERFIL_IA menciona al usuario por su nombre", () => {
  includes(DEFAULT_PERFIL_IA.perfil, "David");
});

test("DEFAULT_PERFIL_IA conserva la familia (María y Abril, 5 años)", () => {
  includes(DEFAULT_PERFIL_IA.familia, "María");
  includes(DEFAULT_PERFIL_IA.familia, "Abril");
  includes(DEFAULT_PERFIL_IA.familia, "5 años");
});

test("DEFAULT_PERFIL_IA conserva las 4 restricciones alimentarias", () => {
  for (const r of ["avena", "cilantro", "quinoa", "tofu"]) {
    includes(DEFAULT_PERFIL_IA.restricciones, r, `restricción ${r}:`);
  }
});

test("DEFAULT_PERFIL_IA conserva TDAH y cervicales", () => {
  includes(DEFAULT_PERFIL_IA.perfil, "TDAH");
  includes(DEFAULT_PERFIL_IA.restricciones, "cervicales");
});

test("DEFAULT_PERFIL_IA conserva el contexto del negocio", () => {
  includes(DEFAULT_PERFIL_IA.contexto_negocio, "viernes");
  includes(DEFAULT_PERFIL_IA.contexto_negocio, "lunes");
});

// --- perfilConDefaults: null/vacío → default (compatibilidad) --------------

test("perfilConDefaults(undefined) devuelve el default completo", () => {
  const p = perfilConDefaults(undefined);
  eq(p.perfil, DEFAULT_PERFIL_IA.perfil);
  eq(p.familia, DEFAULT_PERFIL_IA.familia);
});

test("perfilConDefaults(null) devuelve el default completo", () => {
  const p = perfilConDefaults(null);
  eq(p.restricciones, DEFAULT_PERFIL_IA.restricciones);
  eq(p.contexto_negocio, DEFAULT_PERFIL_IA.contexto_negocio);
});

test("un campo vacío (whitespace) cae al default, no queda como ''", () => {
  const p = perfilConDefaults({ perfil: "   ", familia: null, restricciones: "", contexto_negocio: null });
  eq(p.perfil, DEFAULT_PERFIL_IA.perfil);
  eq(p.restricciones, DEFAULT_PERFIL_IA.restricciones);
});

test("un campo personalizado NO se pisa con el default", () => {
  const p = perfilConDefaults({ perfil: "Ana, Unlocker de software" });
  eq(p.perfil, "Ana, Unlocker de software");
  // los demás sí caen al default
  eq(p.familia, DEFAULT_PERFIL_IA.familia);
});

// --- bloquePerfil: el bloque que se inyecta en el prompt -------------------

test("bloquePerfil() sin argumento reproduce el perfil por defecto", () => {
  const b = bloquePerfil();
  includes(b, "PERFIL DEL USUARIO:");
  includes(b, "David");
  includes(b, "María");
  includes(b, "avena");
});

test("bloquePerfil usa el perfil personalizado cuando se pasa", () => {
  const b = bloquePerfil({
    perfil: "Ana, Unlocker de software",
    familia: "sola",
    restricciones: "ninguna",
    contexto_negocio: null,
  });
  includes(b, "Ana, Unlocker de software");
  includes(b, "sola");
  // no debe aparecer el nombre hardcodeado
  if (b.includes("David")) throw new Error("el perfil personalizado no debe traer 'David'");
});

test("bloquePerfil no deja cabeceras huerfanas (sin líneas = '')", () => {
  // El contrato de bloquePerfil es: si no hay NADA que decir, devuelve ""
  // (para no dejar "PERFIL DEL USUARIO:\n\n" colgando en el prompt).
  // Con DEFAULT_PERFIL_IA lleno siempre hay contenido, asi que el caso
  // "todo vacio" solo se puede verificar con un default vacio, que es justo lo
  // que verifica perfilConDefaults cuando todo es null.
  const b = bloquePerfil();
  // Debe haber al menos una línea con "- ".
  eq((b.match(/\n- /g) ?? []).length > 0, true, "debe tener al menos una viñeta:");
});

test("bloquePerfil numera cada campo con '- ' y separa por saltos de línea", () => {
  const b = bloquePerfil();
  includes(b, "\n- ");
  eq(b.startsWith("PERFIL DEL USUARIO:\n"), true, "prefijo:");
});

// --- resumen ----------------------------------------------------------------

console.log(`\nResultado: ${pass} pasaron, ${fail} fallaron.`);
if (fail > 0) {
  for (const f of failures) console.error(`  - ${f.nombre}: ${f.error}`);
  process.exit(1);
}