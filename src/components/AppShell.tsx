"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { ConfigProvider } from "@/lib/configStore";

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

  useEffect(() => {
    if (!ready) return;
    if (!authed && !isLogin) router.replace("/login");
    if (authed && isLogin) router.replace("/");
  }, [ready, authed, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (!ready || !authed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <ConfigProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </ConfigProvider>
  );
}
