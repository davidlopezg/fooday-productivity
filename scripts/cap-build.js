#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Build para Capacitor (Android / iOS).
 *
 * 1) Hace `next build` (export estático → ./out) SIN basePath.
 *    En Capacitor el WebView carga desde archivo local, no hay
 *    subruta de repo como en GitHub Pages.
 * 2) Ejecuta `npx cap sync <platform>` para copiar ./out al
 *    proyecto nativo y actualizar plugins.
 * 3) Abre el IDE correspondiente (`npx cap open <platform>`).
 *
 * Uso:
 *   node scripts/cap-build.js android
 *   node scripts/cap-build.js ios
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const platform = (process.argv[2] || "").toLowerCase();
if (!["android", "ios"].includes(platform)) {
  console.error("❌ Plataforma inválida. Uso: node scripts/cap-build.js <android|ios>");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

function run(cmd, args, env) {
  console.log(`\n› ${cmd} ${args.join(" ")}\n`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env, NEXT_PUBLIC_BASE_PATH: "" },
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(`\n❌ Falló: ${cmd} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

// 1) Build
run("npx", ["next", "build"]);

// 2) Sanity check: debe existir ./out/index.html
const indexHtml = path.join(root, "out", "index.html");
if (!fs.existsSync(indexHtml)) {
  console.error("❌ No se generó ./out/index.html. Revisa la build.");
  process.exit(1);
}

// 3) cap sync
run("npx", ["cap", "sync", platform]);

// 4) cap open (solo si el usuario quiere abrir el IDE)
const shouldOpen = process.argv.includes("--open");
if (shouldOpen) {
  run("npx", ["cap", "open", platform]);
} else {
  console.log(`\n✅ Listo. Ahora puedes abrir el proyecto:`);
  console.log(`   npx cap open ${platform}`);
  if (platform === "android") {
    console.log(`   O compilar APK directo: cd android && ./gradlew assembleDebug`);
  }
}
