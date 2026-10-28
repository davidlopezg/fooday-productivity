// ============================================================================
// test-alias-hooks.mjs — hooks de resolución que resuelve `@/` → `src/`.
//
// Lo registra `scripts/test-alias.mjs`; ver el comentario de ese fichero.
//
// Nota sobre extensiones: el código de la app importa SIN extensión
// (`@/lib/ai-timeout`), algo que resuelve Webpack/tsconfig. Node no lo hace,
// así que este hook prueba las extensiones del proyecto en orden (.ts, .tsx,
// .mjs, .js) y devuelve el primer fichero que exista en disco.
// ============================================================================

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
);

const EXTENSIONES = [".ts", ".tsx", ".mjs", ".js"];

/** Devuelve la ruta absoluta con extensión, o null si no existe. */
function resolverConExtension(absoluto) {
  if (path.extname(absoluto) && existsSync(absoluto)) return absoluto;
  for (const ext of EXTENSIONES) {
    const candidato = absoluto + ext;
    if (existsSync(candidato)) return candidato;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  // 1) Alias del proyecto: "@/lib/x" → "<repo>/src/lib/x".
  if (specifier.startsWith("@/")) {
    const conExt = resolverConExtension(path.join(SRC, specifier.slice(2)));
    if (conExt) return nextResolve(pathToFileURL(conExt).href, context);
    throw new Error(
      `[test-alias] No se encuentra "@/${specifier.slice(2)}" bajo ${SRC}`,
    );
  }

  // 2) Imports RELATIVOS sin extensión ("./llm-parser" → "./llm-parser.ts").
  //    El código de la app los escribe así y Webpack los resuelve; Node no.
  //    Solo los tocamos si vienen de un fichero dentro de src/.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith("file:")
  ) {
    const base = path.dirname(fileURLToPath(context.parentURL));
    const conExt = resolverConExtension(path.resolve(base, specifier));
    if (conExt) return nextResolve(pathToFileURL(conExt).href, context);
  }

  return nextResolve(specifier, context);
}