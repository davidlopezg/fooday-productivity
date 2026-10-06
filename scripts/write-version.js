/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// 1) Preferir GITHUB_SHA (CI); si no, git rev-parse; si no, timestamp.
let version = process.env.GITHUB_SHA?.slice(0, 7);
if (!version) {
  try {
    version = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    version = new Date()
      .toISOString()
      .slice(0, 16)
      .replace(/[-:T]/g, "");
  }
}

// 2) Escribir out/version.json
const outDir = path.join(process.cwd(), "out");
if (!fs.existsSync(outDir)) {
  console.error("⚠️  out/ no existe. ¿Corriste `next build` antes?");
  process.exit(0); // no fallar el build
}
const out = path.join(outDir, "version.json");
fs.writeFileSync(out, JSON.stringify({ version, t: Date.now() }));
console.log(`[write-version] ${out}  →  ${version}`);
