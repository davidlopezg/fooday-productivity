import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Versión embebida en build-time (GITHUB_SHA o timestamp).
// Se usa en el <script> de auto-actualización de abajo para detectar
// el clásico "estoy viendo código viejo cacheado".
const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  (process.env.GITHUB_SHA?.slice(0, 7) ?? "dev");

// Script inline que rompe la caché cuando hay una versión nueva.
// Ejecuta ANTES de que cargue el JS de la app. Si la versión desplegada
// (leída de /version.json) no coincide con la de este HTML, recarga
// forzando bypass de caché HTTP. Una vez registrado el Service Worker,
// este script es redundante (el SW ya hace network-first), pero es la
// red de seguridad para el primer deploy / instalaciones nuevas.
const VERSION_CHECK_SCRIPT = `
(function(){
  try {
    var v = ${JSON.stringify(APP_VERSION)};
    var bp = ${JSON.stringify(basePath)};

    // Guard anti-bucle: máximo 3 recargas por versión. Si tras 3 sigue
    // habiendo mismatch, paramos para no dejar al usuario encerrado en
    // un loop (defensa por si version.json se publica malformado).
    var key = '_vrc_' + v;
    var n = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (n >= 3) return;

    var u = (bp || '') + '/version.json?_=' + Date.now();
    fetch(u, { cache: 'no-store', credentials: 'omit' })
      .then(function(r){ return r && r.ok ? r.json() : null; })
      .catch(function(){ return null; })
      .then(function(d){
        if (d && d.version && d.version !== v) {
          sessionStorage.setItem(key, String(n + 1));
          var url = new URL(window.location.href);
          url.searchParams.set('_v', Date.now());
          window.location.replace(url.toString());
        }
      });
  } catch (e) { /* noop */ }
})();
`.trim();

export const metadata: Metadata = {
  title: "fooday·productivity",
  description: "Sistema operativo personal: propósito, metas, tareas y planificación",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/icon.svg`,
    apple: `${basePath}/icon.svg`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "fooday",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <head>
        {/* Auto-actualización: detecta versión nueva y recarga con cache-bust */}
        <script dangerouslySetInnerHTML={{ __html: VERSION_CHECK_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
