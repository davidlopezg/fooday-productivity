// ============================================================================
// test-alias.mjs — resuelve el alias `@/` para poder ejecutar los tests con
// `node` puro, sin dependencias extra (ni tsx, ni tsconfig-paths, ni vitest).
//
// POR QUÉ:
//   El código de `src/` importa con el alias `@/...` y con rutas relativas
//   SIN extensión (`./llm-parser`), que resuelve Webpack vía tsconfig.json.
//   `node` no conoce ninguna de las dos cosas, así que un test que importe
//   `plan.ts` falla con ERR_MODULE_NOT_FOUND. Estos hooks traduzen ambas
//   formas a rutas reales con extensión, de modo que los tests ejercitan los
//   MISMOS ficheros que usa la app (sin copias ni build previo).
//
// REQUISITOS:
//   · Node >= 22.6 para el type-stripping nativo de `.ts` (los tests
//     importan el código de la app tal cual, sin transpilar).
//   · `module.registerHooks`, disponible desde Node 22.15 / 23.5.
//
// USO:
//   node --import ./scripts/test-alias.mjs src/lib/plan-unidades.test.mjs
//   npm test                      ← ejecuta los 7 ficheros de test
// ============================================================================

import { registerHooks } from "node:module";
import { resolve } from "./test-alias-hooks.mjs";

registerHooks({ resolve });