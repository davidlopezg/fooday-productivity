/* ============================================================================
 * fooday·productivity — Service Worker
 *
 * Estrategia para evitar el problema de "versión vieja cacheada en móvil":
 *
 *   · NAVEGACIÓN (HTML): network-first. Siempre intenta traer el HTML nuevo.
 *     Solo si no hay red, sirve el cacheado (modo offline).
 *   · ASSETS HASHEADOS (/_next/static/*): cache-first. Son inmutables
 *     (Next.js les pone un hash en el nombre), así que cachearlos es seguro.
 *   · RESTO: network-first con fallback a caché.
 *
 * En cada activate se BORRAN las cachés de versiones anteriores.
 * `skipWaiting` + `clients.claim` hacen que el SW nuevo tome el control
 * inmediatamente sin esperar a cerrar todas las pestañas.
 *
 * Para forzar una invalidación completa, sube CACHE_VERSION.
 * ========================================================================== */

const CACHE_VERSION = "v1";
const CACHE_STATIC = `fooday-static-${CACHE_VERSION}`;
const CACHE_PAGES = `fooday-pages-${CACHE_VERSION}`;

// ---------------------------------------------------------------------------
// install: activa el SW nuevo sin esperar
// ---------------------------------------------------------------------------
self.addEventListener("install", () => {
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// activate: limpia cachés viejas y toma el control
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_PAGES)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------------------
// fetch: estrategia según tipo de recurso
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // No interceptar peticiones a otros orígenes (Supabase, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isNavigation =
    req.mode === "navigate" || accept.includes("text/html");
  const isHashedAsset = url.pathname.includes("/_next/static/");

  // --- Assets hasheados: cache-first ---
  if (isHashedAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) {
          const cache = await caches.open(CACHE_STATIC);
          cache.put(req, res.clone());
        }
        return res;
      })(),
    );
    return;
  }

  // --- Navegación (HTML): network-first con bypass de caché HTTP ---
  if (isNavigation) {
    event.respondWith(
      (async () => {
        try {
          // `cache: "reload"` fuerza ir a la RED aunque el navegador tenga
          // el HTML en su caché HTTP. Sin esto, GitHub Pages (max-age=600)
          // te serviría la versión vieja aunque el SW quiera "network-first".
          const fresh = new Request(req, { cache: "reload" });
          const res = await fetch(fresh);
          if (res.ok) {
            const cache = await caches.open(CACHE_PAGES);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const cache = await caches.open(CACHE_PAGES);
          const fallback = await cache.match(self.registration.scope);
          return fallback || Response.error();
        }
      })(),
    );
    return;
  }

  // --- Resto: network-first con fallback a caché ---
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cached = await caches.match(req);
        return cached || Response.error();
      }
    })(),
  );
});

// ---------------------------------------------------------------------------
// message: permitir que la página fuerce la activación inmediata
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "CLEAR_CACHES") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))),
    );
  }
});
