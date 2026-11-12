#!/usr/bin/env node
/**
 * lint-diff.mjs — comprueba que este cambio NO introduce errores nuevos de
 * ESLint.
 *
 * El repo ya tiene errores de lint preexistentes (no son un bloqueo: están
 * ahí desde antes y arreglarlos todos es otro trabajo). La regla que se
 * aplica es simple y honesta:
 *
 *     errores(HEAD)  ≤  errores(base)
 *
 * Para comprobarlo se ejecuta ESLint sobre los ficheros cambiados dos veces:
 * una con el código del PR y otra con el código de la rama base, y se
 * comparan los números.
 *
 * Uso (en CI):
 *   BASE_SHA=<sha de la base> node .github/scripts/lint-diff.mjs
 *
 * Sin BASE_SHA compara contra el commit anterior (HEAD~1).
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const BASE =
  process.env.BASE_SHA ||
  process.env.GITHUB_BASE_REF ||
  execFileSync("git", ["rev-parse", "HEAD~1"], { encoding: "utf-8" }).trim();

const EXT = /\.(ts|tsx|mjs|js)$/;

function git(args) {
  return execFileSync("git", args, { encoding: "utf-8" }).trim();
}

/** Ficheros que este PR toca (solo los que existen en HEAD). */
const changed = git(["diff", "--name-only", "--diff-filter=ACMR", BASE, "HEAD"])
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => f && EXT.test(f) && existsSync(f));

if (!changed.length) {
  console.log("· No hay ficheros JS/TS modificados: nada que comprobar.");
  process.exit(0);
}

console.log(`· Ficheros comprobados: ${changed.length}`);
console.log(`· Base: ${BASE}`);

/** Ejecuta ESLint y devuelve { errores, avisos, mensajes }. */
function lint(files) {
  if (!files.length) return { errors: 0, warnings: 0, messages: [] };
  let salida;
  try {
    salida = execFileSync("npx", ["eslint", ...files, "-f", "json"], {
      encoding: "utf-8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    // ESLint sale con código 1 si hay errores, pero la salida JSON sigue siendo válida.
    salida = e.stdout || "";
    if (!salida.trim()) {
      console.error("✗ ESLint no se pudo ejecutar:", (e.stderr || e.message).toString().slice(0, 400));
      process.exit(2);
    }
  }
  const resultados = JSON.parse(salida);
  const errores = resultados.reduce((a, r) => a + r.errorCount, 0);
  const avisos = resultados.reduce((a, r) => a + r.warningCount, 0);
  const mensajes = resultados.flatMap((r) =>
    r.messages
      .filter((m) => m.severity === 2)
      .map((m) => `${r.filePath}:${m.line} ${m.ruleId} — ${m.message}`)
  );
  return { errors: errores, warnings: avisos, mensajes };
}

/* 1 · con el código del PR */
const conCambios = lint(changed);

/* 2 · con el código de la base (para los ficheros que ya existían) */
const enBase = changed.filter((f) => {
  try {
    execFileSync("git", ["cat-file", "-e", `${BASE}:${f}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
});
const restaurados = [];
for (const f of enBase) {
  try {
    git(["checkout", BASE, "--", f]);
    restaurados.push(f);
  } catch {
    /* si no se puede restaurar, se queda como está */
  }
}
const sinCambios = lint(enBase);
for (const f of restaurados) {
  try {
    git(["checkout", "HEAD", "--", f]);
  } catch {
    /* nada */
  }
}

/* 3 · comparar */
console.log(`· Errores en base:   ${sinCambios.errors}`);
console.log(`· Errores en HEAD:   ${conCambios.errors}`);

if (conCambios.errors <= sinCambios.errors) {
  console.log("✓ No se introducen errores nuevos de lint.");
  process.exit(0);
}

console.error(`\n✗ Este cambio introduce ${conCambios.errors - sinCambios.errors} error(es) de lint nuevos:\n`);
for (const m of conCambios.mensajes.slice(0, 40)) console.error(`  ${m}`);
if (conCambios.mensajes.length > 40) {
  console.error(`  … y ${conCambios.mensajes.length - 40} más`);
}
process.exit(1);
