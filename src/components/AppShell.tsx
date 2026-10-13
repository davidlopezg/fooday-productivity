"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getClockSkewStore } from "@/lib/clockSkew";
import { Sidebar } from "@/components/Sidebar";
import { ConfigProvider } from "@/lib/configStore";
import { PomodoroProvider } from "@/lib/pomodoroStore";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { PostFocusDialog } from "@/components/PostFocusDialog";
import { ThemeProvider } from "@/lib/themeStore";

/**
 * Shell de la SPA: comprueba sesión (cliente) y muestra el sidebar.
 * En GitHub Pages no hay middleware, así que la protección es en cliente.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname.replace(/\/$/, "") === "/login";
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  /** Banner global: reloj del dispositivo desincronizado con el servidor
   *  Supabase (PGRST303 / JWT issued at future). Lo dispara useData
   *  cuando una query falla con ese error. Mientras esté activo, casi
   *  todo fallará — la única solución es arreglar el reloj. */
  const [clockSkew, setClockSkew] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Registro del Service Worker (network-first para HTML). Evita que el
  // móvil se quede ejecutando una versión vieja cacheada tras un deploy.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    navigator.serviceWorker
      .register(`${basePath}/sw.js`, {
        scope: `${basePath}/`,
        // No usar la caché HTTP para el propio sw.js: así detectamos
        // versiones nuevas del SW en cada carga.
        updateViaCache: "none",
      })
      .then((reg) => {
        // Busca actualizaciones cada vez que se abre la app.
        reg.update().catch(() => {});
        // Si hay una versión nueva del SW esperando, actívala ya.
        reg.addEventListener("updatefound", () => {
          const nuevo = reg.installing;
          nuevo?.addEventListener("statechange", () => {
            if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
              nuevo.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch((e) => console.warn("[sw] registro falló:", e));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (typeof window !== "undefined" && window.location.search.includes("debug=1")) return;
    if (!authed && !isLogin) router.replace("/login");
    if (authed && isLogin) router.replace("/");
  }, [ready, authed, isLogin, router]);

  // Suscripción al store de reloj desincronizado. Mientras esté
  // desincronizado, mostramos un banner persistente arriba de todo
  // explicando qué hacer. No forzamos signOut aquí porque destruye
  // la sesión y David tiene que arreglar el reloj de todas formas.
  useEffect(() => {
    const store = getClockSkewStore();
    setClockSkew(store.isDesincronizado());
    return store.subscribe((v) => setClockSkew(v));
  }, []);

  if (isLogin) return <>{children}</>;

  if (!ready || !authed) {
    if (typeof window !== "undefined" && window.location.search.includes("debug=1")) {
      return (
        <ConfigProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold tracking-tight">DEBUG</h1>
                  <div className="rounded-xl border border-border bg-card p-4">Card 1</div>
                  <div className="rounded-xl border border-border bg-card p-4">Card 2</div>
                </div>
              </div>
            </main>
          </div>
        </ConfigProvider>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <ThemeProvider>
    <ConfigProvider>
      <PomodoroProvider>
        {/*
          Móvil: columna → [barra superior] encima de [main].
          Escritorio: fila → [sidebar] a la izquierda de [main].
          Sin el `flex-col` la barra superior se convertía en un item flex
          y empujaba todo el contenido a la derecha (bug real en móvil).
        */}
        <div className="flex min-h-screen flex-col md:flex-row">
          {clockSkew && (
            <div className="sticky top-0 z-50 w-full border-b-2 border-amber-500/60 bg-amber-500/20 px-4 py-2.5 text-amber-900 backdrop-blur dark:text-amber-100">
              <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-2 text-xs">
                <span className="text-base leading-none">⏰</span>
                <div className="flex-1">
                  <p className="font-semibold">
                    Reloj de tu dispositivo desincronizado
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Supabase rechaza las peticiones (<code className="rounded bg-amber-500/30 px-1 py-0.5 text-[10px]">PGRST303</code>).
                    Solución: <strong>ajustes → fecha y hora → automático</strong>{" "}
                    (o desactívalo 10s y vuelve a activarlo). Después
                    cierra sesión y vuelve a entrar para que se firme un
                    JWT nuevo con el reloj correcto. Hasta entonces,
                    casi nada funcionará.
                  </p>
                </div>
              </div>
            </div>
          )}
          <Sidebar />
          <main className="safe-b min-w-0 flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
              {children}
            </div>
          </main>
        </div>
        <PomodoroWidget />
        <PostFocusDialog />
      </PomodoroProvider>
    </ConfigProvider>
    </ThemeProvider>
  );
}
