"use client";

// ============================================================================
// Theme store (modo oscuro manual)
// ---------------------------------------------------------------------------
// El CSS ya tiene variables HSL para light/dark (prefers-color-scheme).
// Para que el usuario PUEDA forzarlo, este store añade la clase `.dark`
// al <html>, y globals.css la usa en lugar de @media.
// ============================================================================

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeCtx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Lo que realmente se aplica (resuelve "system"). */
  resolved: "light" | "dark";
};

const STORAGE_KEY = "fooday.theme";

const ThemeContext = createContext<ThemeCtx | null>(null);

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const sysDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const isDark = t === "dark" || (t === "system" && sysDark);
  root.classList.toggle("dark", isDark);
  // ponytail: data-theme es más explícito que solo .dark y permite override
  // futuro sin reescribir todos los selectores. El coste es 1 atributo.
  root.dataset.theme = isDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Lee de localStorage al montar (cliente)
  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setThemeState(stored);
  }, []);

  // Aplica el tema al <html> y escucha cambios del sistema
  useEffect(() => {
    applyTheme(theme);
    const sysDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    setResolved(theme === "dark" || (theme === "system" && sysDark) ? "dark" : "light");
    if (theme === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        applyTheme("system");
        setResolved(mq.matches ? "dark" : "light");
      };
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // localStorage puede no estar disponible (modo privado) — no pasa nada,
      // simplemente el tema no sobrevive a un reload.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // ponytail: si se usa fuera del provider, no rompemos — devolvemos system
    // por defecto (es lo que se vería de todos modos sin override).
    return { theme: "system", setTheme: () => {}, resolved: "light" };
  }
  return ctx;
}
