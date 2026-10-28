// ============================================================================
// Test de regresión: QUERIES vs COLUMNAS ELIMINADAS.
//
// CONTEXTO (bug real, 2026-10-28):
// La migration 0028 eliminó la columna `resultados_periodo.periodo_id` y la
// movió a la tabla puente `kr_periodos`. La función `fetchMetasConProgreso()`
// (la que carga la página /metas) SE QUEDÓ pidiendo `periodo_id` en su
// `.select()`. PostgREST devolvía 400 ("column does not exist"), la función
// lanzaba, y la página se quedaba con `metas = []` → listado vacío sin
// explicación.
//
// El patrón es perverso: TypeScript no lo detecta (el `.select()` es un
// string), y el comentario de la función decía LO CONTRARIO ("la tabla ya
// no tiene `periodo_id`") mientras el código la pedía. Por eso este test
// existe: no confiamos en que nos demos cuenta a ojo.
//
// QUÉ HACE:
//   1. Lee TODAS las migraciones y extrae las columnas eliminadas
//      (`drop column if exists X`) junto con la tabla afectada.
//   2. Escanea el código fuente buscando queries a esa tabla que pidan la
//      columna eliminada.
//
// La tabla afectada se deduce del `drop column` mirando el `create table`
// más cercano por encima; si no se puede, se marca como `?` y la tabla se
// ignora (para no dar falsos positivos).
// ============================================================================

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIG_DIR = path.join(RAIZ, "supabase", "migrations");
const SRC_DIR = path.join(RAIZ, "src");

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

// ----------------------------------------------------------------------------
// 1) Extraer columnas eliminadas de las migraciones.
// ----------------------------------------------------------------------------

/** @returns {Array<{tabla: string, columna: string, fichero: string}>} */
function columnasEliminadas() {
  const out = [];
  const ficheros = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const fichero of ficheros) {
    const sql = readFileSync(path.join(MIG_DIR, fichero), "utf8");
    // Tabla "activa": la última `create table` / `alter table` vista por
    // encima del `drop column`.
    let tablaActual = "?";
    const lineas = sql.split("\n");
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const create = l.match(
        /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/i,
      );
      if (create) tablaActual = create[1];

      const alter = l.match(
        /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/i,
      );
      if (alter) tablaActual = alter[1];

      const drop = l.match(/drop\s+column\s+(?:if\s+exists\s+)?(\w+)/i);
      if (drop) {
        out.push({
          tabla: tablaActual,
          columna: drop[1],
          fichero,
          linea: i + 1,
        });
      }
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// 2) Recorrer los .ts/.tsx del src.
// ----------------------------------------------------------------------------

function*ficherosSrc(dir) {
  for (const entrada of readdirSync(dir)) {
    const p = path.join(dir, entrada);
    const st = statSync(p);
    if (st.isDirectory()) {
      yield* ficherosSrc(p);
    } else if (/\.(ts|tsx)$/.test(entrada)) {
      yield p;
    }
  }
}

/**
 * Busca queries a `tabla` que pidan `columna`.
 * Regex intentionally conservadora: solo marca como query válida la que
 * encadena `.from("tabla")` … `.select("…columna…")` en un bloque corto.
 */
function buscaQueryQuePideColumna(codigo, tabla, columna) {
  const lineas = codigo.split("\n");
  const hits = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (!l.includes(`.from("${tabla}")`) && !l.includes(`.from('${tabla}')`)) {
      continue;
    }
    // Miramos hacia delante hasta 6 líneas (el `.select()` suele ir justo
    // después, a veces partido en varias).
    const ventana = lineas.slice(i, i + 7).join(" ");
    if (!/\.select\s*\(/.test(ventana)) continue;
    // ¿aparece la columna dentro de la lista de campos?
    const selectMatch = ventana.match(/\.select\s*\(\s*["'`]([^"'`]*)["'`]/);
    if (!selectMatch) continue;
    const campos = selectMatch[1];
    // `*` no es problema: el `select *` trae lo que exista en la tabla.
    if (campos.trim() === "*") continue;
    const lista = campos.split(",").map((c) => c.trim());
    if (lista.includes(columna)) {
      hits.push(i + 1);
    }
  }
  return hits;
}

// ============================================================================
console.log("\n=== Queries vs columnas eliminadas por migraciones ===");

const eliminadas = columnasEliminadas();

// Solo las que tienen tabla identificable (las demás no se pueden verificar
// de forma fiable y darían falsos positivos).
const verificables = eliminadas.filter((e) => e.tabla !== "?");

console.log(
  `  (columnas eliminadas detectadas: ${eliminadas.length}, verificables: ${verificables.length})`,
);

test("se detectan columnas eliminadas en las migraciones", () => {
  if (eliminadas.length === 0) {
    throw new Error("No se detectó ninguna columna eliminada — el parser falló");
  }
  // Sanity: la 0028 es la que causó este bug.
  const p = eliminadas.find(
    (e) => e.columna === "periodo_id" && e.fichero.includes("0028"),
  );
  if (!p) {
    throw new Error(
      "No se detectó `periodo_id` en la migration 0028 — el parser no funciona",
    );
  }
  if (p.tabla !== "resultados_periodo") {
    throw new Error(
      `Esperaba tabla 'resultados_periodo', obtuve '${p.tabla}'`,
    );
  }
});

// El test principal: para cada columna eliminada, ninguna query debe pedirla.
for (const e of verificables) {
  test(
    `ninguna query pide '${e.columna}' en '${e.tabla}' (eliminada en ${e.fichero})`,
    () => {
      const ofensores = [];
      for (const f of ficherosSrc(SRC_DIR)) {
        const codigo = readFileSync(f, "utf8");
        const hits = buscaQueryQuePideColumna(codigo, e.tabla, e.columna);
        for (const h of hits) {
          ofensores.push(
            `${path.relative(RAIZ, f)}:${h}`,
          );
        }
      }
      if (ofensores.length > 0) {
        throw new Error(
          `${ofensores.length} query(s) piden la columna eliminada ` +
            `'${e.columna}' de '${e.tabla}':\n      ` +
            ofensores.join("\n      "),
        );
      }
    },
  );
}

// ----------------------------------------------------------------------------
// 3) Test extra: la función que fallaba debe seguir sin pedir `periodo_id`.
// ----------------------------------------------------------------------------

console.log("\n=== fetchMetasConProgreso (el caso concreto que se rompió) ===");

test("fetchMetasConProgreso no pide periodo_id", () => {
  const codigo = readFileSync(
    path.join(SRC_DIR, "lib", "queries.ts"),
    "utf8",
  );
  const inicio = codigo.indexOf("export async function fetchMetasConProgreso");
  if (inicio === -1) throw new Error("No se encontró fetchMetasConProgreso");
  // Solo el cuerpo de la función (hasta la siguiente declaración a nivel de
  // módulo), para no capturar código de la función siguiente.
  const resto = codigo.slice(inicio + 40);
  const fin = resto.search(/\nexport (async )?function/);
  const cuerpo = resto.slice(0, fin === -1 ? 1200 : fin);
  // Miramos SOLO las listas de campos de los `.select()` — un `periodo_id`
  // en un comentario o en `resultado_periodo_id` no es el bug.
  const selects = [...cuerpo.matchAll(/\.select\s*\(\s*["'`]([^"'`]*)["'`]/g)].map(
    (m) => m[1],
  );
  for (const campos of selects) {
    const lista = campos.split(",").map((c) => c.trim());
    if (lista.includes("periodo_id")) {
      throw new Error(
        "fetchMetasConProgreso vuelve a pedir `periodo_id` — PostgREST devolverá 400 " +
          "y /metas se quedará vacía",
      );
    }
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ Ninguna query pide una columna eliminada por una migración");
