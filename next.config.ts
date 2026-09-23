import type { NextConfig } from "next";

/**
 * GitHub Pages sirve SOLO estáticos → export estático (SPA).
 * `NEXT_PUBLIC_BASE_PATH` se rellena en el workflow con "/<repo>".
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
