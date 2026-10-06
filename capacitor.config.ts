import type { CapacitorConfig } from "@capacitor/cli";

/**
 * fooday·productivity — Capacitor (Android / iOS)
 *
 * IMPORTANTE — `server.url`:
 *   Está apuntando a la PWA desplegada en GitHub Pages. Esto convierte el
 *   APK en un "thin wrapper" (WebView) alrededor de la webapp en vivo.
 *
 *   VENTAJAS:
 *     · El APK SIEMPRE muestra la última versión (el Service Worker de la
 *       PWA gestiona las actualizaciones dentro de la sesión).
 *     · No hay que recompilar el APK en cada cambio: editas código → push
 *       → GitHub Actions redespliega → reabres el APK y listo.
 *     · Arregla definitivamente el problema de "APK con código viejo
 *       cacheado en el `out/` empaquetado".
 *
 *   REQUISITO: conexión a internet (el app ya depende de Supabase, así que
 *   no es una regresión real).
 *
 *   Si algún día quieres volver al modo "assets locales empaquetados"
 *   (funciona offline, pero hay que recompilar el APK para actualizar):
 *     1) Comenta o borra la línea `url:` de `server`.
 *     2) `npm run cap:build:android` para regenerar el APK con `out/`.
 *
 * - webDir: "out"  → coincide con `next.config.ts` (`output: "export"`)
 * - server.androidScheme: "https" → misma política de cookies seguras
 *   que el sitio remoto (Supabase Auth, sameSite).
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
    url: "https://davidlopezg.github.io/fooday-productivity/",
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
