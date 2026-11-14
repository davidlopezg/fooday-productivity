// ============================================================================
// Test del degradado de /krs cuando la BD va por detrás del código.
// ============================================================================
// Ejecuta con: `node src/lib/krsLectura.test.mjs`
// Sin framework (patrón del repo) y sin base de datos.
//
// CONTEXTO (bug real, issue #54):
//   Al fusionar el PR #50 (WIG de KR) la página /krs dejó de cargar con
//   "column resultados_periodo.es_wig does not exist (42703)": la migration
//   0038 estaba en el código pero NO en la base de datos, y un `select` a
//   una columna inexistente tumba la pantalla entera.
//
//   Este test fija el comportamiento correcto: los KRs se leen igual (sin
//   las columnas del WIG) y la app AVISA de lo que falta.
// ============================================================================

import {
  AVISO_MIGRACION_0038,
  COLUMNAS_KR,
  COLUMNAS_KR_CON_WIG,
  leerKrsConRespaldo,
} from "./krsLectura.ts";

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

async function testAsync(nombre, fn) {
  try {
    await fn();
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
// El doble: un `select` que responde con un error si le piden columnas que
// la BD no tiene (como hace PostgREST con un 42703).
// ----------------------------------------------------------------------------

/** @param columnasQueFaltan Columnas que la BD "no conoce". */
function doble(columnasQueFaltan = []) {
  const pedidas = [];
  const seleccionar = async (columnas) => {
    pedidas.push(columnas);
    const falta = columnasQueFaltan.find((c) => columnas.includes(c));
    if (falta) {
      return {
        data: null,
        error: {
          code: "42703",
          message: `column resultados_periodo.${falta} does not exist`,
        },
      };
    }
    return { data: [{ id: "kr-1", titulo: "Un KR" }], error: null };
  };
  return { seleccionar, pedidas };
}

console.log("\nleerKrsConRespaldo");

await testAsync("BD al día: devuelve los KRs y ningún aviso", async () => {
  const { seleccionar, pedidas } = doble();
  const r = await leerKrsConRespaldo(seleccionar);
  eq(r.krs.length, 1, "debe devolver los KRs");
  eq(r.aviso, null, "sin aviso");
  eq(pedidas, [COLUMNAS_KR_CON_WIG], "una sola consulta, con las columnas del WIG");
});

await testAsync("BD sin la migration 0038: relee sin las columnas del WIG y avisa", async () => {
  const { seleccionar, pedidas } = doble(["es_wig"]);
  const r = await leerKrsConRespaldo(seleccionar);
  eq(r.krs.length, 1, "los KRs se leen igual");
  eq(r.aviso, AVISO_MIGRACION_0038, "avisa de la migración que falta");
  eq(pedidas.length, 2, "reintenta una vez");
  eq(pedidas[1], COLUMNAS_KR, "el reintento va SIN las columnas del WIG");
});

await testAsync("error que NO es de esquema: lo lanza (no se degrada en silencio)", async () => {
  const seleccionar = async () => ({
    data: null,
    error: { code: "57014", message: "statement timeout" },
  });
  let fallo = null;
  try {
    await leerKrsConRespaldo(seleccionar);
  } catch (e) {
    fallo = e;
  }
  if (!fallo) throw new Error("debería haber lanzado");
  eq(fallo.code, "57014", "lanza el error original");
});

await testAsync("si el reintento también falla: lo lanza", async () => {
  const seleccionar = async () => ({
    data: null,
    error: { code: "42703", message: "column resultados_periodo.id does not exist" },
  });
  let fallo = null;
  try {
    await leerKrsConRespaldo(seleccionar);
  } catch (e) {
    fallo = e;
  }
  if (!fallo) throw new Error("debería haber lanzado");
  eq(fallo.code, "42703", "lanza el error del reintento");
});

console.log("\ncolumnas");

test("las columnas base NO llevan las del WIG (si no, el degradado no sirve)", () => {
  if (COLUMNAS_KR.includes("es_wig")) {
    throw new Error("COLUMNAS_KR incluye es_wig: el reintento volvería a fallar");
  }
  if (COLUMNAS_KR.includes("wig_orden")) {
    throw new Error("COLUMNAS_KR incluye wig_orden: el reintento volvería a fallar");
  }
});

test("las columnas con WIG llevan las dos", () => {
  if (!COLUMNAS_KR_CON_WIG.includes("es_wig")) {
    throw new Error("COLUMNAS_KR_CON_WIG no incluye es_wig");
  }
  if (!COLUMNAS_KR_CON_WIG.includes("wig_orden")) {
    throw new Error("COLUMNAS_KR_CON_WIG no incluye wig_orden");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n${pass} tests en verde, ${fail} en rojo`);
if (fail > 0) {
  console.log("\nFALLOS:");
  for (const f of failures) console.log(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
