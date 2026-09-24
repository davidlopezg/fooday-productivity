import type { CapacitorConfig } from "@capacitor/cli";

/**
 * fooday·productivity — Capacitor (Android / iOS)
 *
 * - webDir: "out"  → coincide con `next.config.ts` (`output: "export"`)
 * - Para builds nativos NO se define NEXT_PUBLIC_BASE_PATH (el WebView sirve
 *   desde archivo local, no hay subruta de repo como en GitHub Pages).
 * - server.androidScheme: "https" → mejor compatibilidad con Supabase Auth
 *   (cookies seguras, sameSite) que el esquema "http" por defecto.
 */
const config: CapacitorConfig = {
  appId: "com.fooday.productivity",
  appName: "fooday·productivity",
  webDir: "out",
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: "automatic",
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
