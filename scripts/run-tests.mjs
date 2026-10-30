// ============================================================================
// run-tests.mjs — runner de los tests del repo.
//
// Los tests usan un harness propio (sin framework): cada `.test.mjs` imprime
// su propio resumen y sale con código 1 si algo falla. Este script los
// ejecuta TODOS y agrega un único veredicto, para que `npm test` y el CI
// tengan un solo exit code que interpretar.
//
// No descubre tests por patrón a propósito: la lista es explícita para que
// añadir un test sea una decisión visible (y para no arrastrar ficheros que
// no sean tests).
// ============================================================================

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TESTS = [
  "src/lib/llm-parser.test.mjs",
  "src/lib/plan-unidades.test.mjs",
  "src/lib/llm-retry.test.mjs",
  "src/lib/proyectos.test.mjs",
  "src/lib/configStore.test.mjs",
  "src/lib/perfilIA.test.mjs",
  "src/lib/schema-queries.test.mjs",
  "src/lib/escenarios/hipotesis.test.mjs",
  "src/lib/pagos/parser-pdf.test.mjs",
  "src/lib/recuperacion/seleccion.test.mjs",
];

// Los tests importan código .ts de la app → necesita type-stripping nativo.
// `scripts/test-alias.mjs` aporta además la resolución de `@/` y de rutas
// relativas sin extensión.
const NODE_ARGS = [
  "--no-warnings=MODULE_TYPELESS_PACKAGE_JSON",
  "--import",
  "./scripts/test-alias.mjs",
];

let fallos = 0;

for (const t of TESTS) {
  const nombre = path.basename(t);
  process.stdout.write(`\n▶ ${nombre}\n`);

  const r = spawnSync(process.execPath, [...NODE_ARGS, t], {
    cwd: RAIZ,
    encoding: "utf8",
  });

  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  process.stdout.write(salida);

  if (r.status !== 0) {
    fallos++;
    console.error(`\n❌ ${nombre} falló (exit ${r.status})`);
  }
}

console.log(
  `\n${"=".repeat(60)}\n${
    fallos === 0
      ? `✅ ${TESTS.length} ficheros de test, todos en verde`
      : `❌ ${fallos} de ${TESTS.length} ficheros de test fallaron`
  }\n${"=".repeat(60)}`,
);

process.exit(fallos === 0 ? 0 : 1);