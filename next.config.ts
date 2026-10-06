import type { NextConfig } from "next";

/**
 * GitHub Pages sirve SOLO estáticos → export estático (SPA).
 * `NEXT_PUBLIC_BASE_PATH` se rellena en el workflow con "/<repo>".
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Identificador de build visible en la UI. En GitHub Actions usamos el SHA
// corto del commit; en local, la fecha. Sirve para detectar versiones viejas
// cacheadas en el móvil (el clásico "no veo mis cambios").
const appVersion =
  process.env.GITHUB_SHA?.slice(0, 7) ??
  new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
