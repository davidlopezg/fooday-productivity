"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/lib/configStore";
import { probarConexion } from "@/lib/plan";
import { useTheme, type Theme } from "@/lib/themeStore";
import { IconMoon, IconSun } from "@/components/icons";

const TEMAS: { value: Theme; label: string; descripcion: string }[] = [
  { value: "system", label: "Sistema", descripcion: "Sigue el ajuste del sistema operativo." },
  { value: "light", label: "Claro", descripcion: "Fondo claro siempre." },
  { value: "dark", label: "Oscuro", descripcion: "Fondo oscuro siempre." },
];

export default function ConfiguracionPage() {
  const { data, loading, save, diagnostic } = useConfig();
  const { theme, setTheme } = useTheme();

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(data.base_url);
  const [model, setModel] = useState(data.model);
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tieneKey = !!data.minimax_api_key;

  // Sincroniza los campos cuando se recargan los datos remotos
  useEffect(() => {
    setBaseUrl(data.base_url);
    setModel(data.model);
    if (!apiKey && data.minimax_api_key) {
      // No machacamos la key que el usuario está escribiendo
    }
  }, [data.base_url, data.model]);

  async function guardar() {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    const saved = {
      base_url: baseUrl.trim() || data.base_url,
      minimax_api_key: apiKey.trim() || data.minimax_api_key,
      model: model.trim() || "Minimax-M3",
    };
    try {
      await save(saved);
      setMensaje("Configuración guardada. El campo de la key se vacía por seguridad.");
      setApiKey("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  async function probar() {
    const key = apiKey.trim() || data.minimax_api_key;
    const url = baseUrl.trim() || data.base_url;
    if (!key) {
      setError("Introduce o guarda primero una API key.");
      return;
    }
    setProbando(true);
    setError(null);
    setMensaje(null);
    try {
      await probarConexion(url, key, model || "Minimax-M3");
      setMensaje("Conexión OK ✅");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProbando(false);
    }
  }

  const field =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecta tu cuenta de MiniMax para generar planes diarios con IA.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          {theme === "dark" ? (
            <IconMoon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <IconSun className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-base font-semibold">Tema</h2>
            <p className="text-xs text-muted-foreground">
              Elige cómo se ve la aplicación.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TEMAS.map((t) => {
            const activo = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                aria-pressed={activo}
                className={`flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                  activo
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-[11px] leading-snug">{t.descripcion}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">MiniMax API key</span>
            {tieneKey && !loading && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                configurada
              </span>
            )}
          </div>
          <div className="relative mt-2">
            <input
              type={mostrar ? "text" : "password"}
              autoComplete="off"
              placeholder={tieneKey ? "(guardada — pega una nueva para cambiarla)" : "sk-…"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={`${field} pr-20`}
            />
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              {mostrar ? "ocultar" : "mostrar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Se guarda cifrada por RLS en tu fila de <code>configuracion</code> (solo tú la ves).
            Se envía a MiniMax desde el navegador; <strong>nunca</strong> pasa por un servidor.
          </p>
        </div>

        <div>
          <span className="text-sm font-medium">Base URL</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={`${field} mt-2`}
            placeholder="https://api.minimax.io/v1"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Por defecto <code>https://api.minimax.io/v1</code>. Cámbialo si usas otro proveedor o endpoint.
          </p>
        </div>

        <div>
          <span className="text-sm font-medium">Modelo</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={`${field} mt-2`}
            placeholder="Minimax-M3"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Por defecto <code>Minimax-M3</code>. Cámbialo si usas otro.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
            {mensaje}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={probar}
            disabled={probando}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {probando ? "Probando…" : "Probar conexión"}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Diagnóstico</p>
        <p>
          Supabase URL:{" "}
          <code className="rounded bg-background px-1 py-0.5">
            {diagnostic.supabaseUrl.replace(/^https?:\/\//, "").replace(/\.co$/, ".co")}
          </code>
        </p>
        <p>
          User ID:{" "}
          <code className="rounded bg-background px-1 py-0.5">
            {loading ? (
              <span className="text-muted-foreground">cargando…</span>
            ) : diagnostic.userId ? (
              diagnostic.userId.slice(0, 12) + "…"
            ) : (
              <span className="text-red-500">(sin sesión)</span>
            )}
          </code>
        </p>
        {diagnostic.lastError ? (
          <p className="text-red-600 dark:text-red-400">
            Último error de sincronización con Supabase: {diagnostic.lastError}
          </p>
        ) : (
          <p className="text-emerald-600 dark:text-emerald-400">
            Sincronización con Supabase OK ✓ (la key también está en este navegador).
          </p>
        )}
        <p className="pt-1">
          Si ves error de &quot;relation does not exist&quot; o similar, aplica{" "}
          <code>supabase/migrations/0002_configuracion.sql</code> en el SQL Editor de Supabase.
        </p>
      </section>
    </div>
  );
}
