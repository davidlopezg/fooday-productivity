/**
 * Versión de la app, inyectada en build-time desde next.config.ts.
 * Sirve para saber qué build está ejecutando el navegador y detectar
 * el clásico "estoy viendo código viejo cacheado".
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

/**
 * Desregistra el Service Worker, borra todas las cachés y recarga
 * forzando bypass de caché HTTP. Útil como botón "Actualizar app".
 */
export async function forzarActualizacion(): Promise<void> {
  try {
    // 1) Avisa al SW activo de que limpie cachés
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    for (const reg of regs) {
      reg.active?.postMessage("CLEAR_CACHES");
      await reg.unregister();
    }
    // 2) Borra las Cache Storage
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("[version] fallo al limpiar cachés:", e);
  }
  // 3) Recarga con bypass de caché
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}
