"use client";

import { useTheme, type Theme } from "@/lib/themeStore";
import { IconMoon, IconSun } from "@/components/icons";

const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

/** Botón compacto que cicla entre Sistema → Claro → Oscuro. */
export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button
      onClick={() => setTheme(next)}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
      title={`Tema actual: ${LABEL[theme]} (resuelto: ${resolved}). Click → ${LABEL[next]}`}
    >
      <span className="flex items-center gap-3">
        {resolved === "dark" ? (
          <IconMoon className="h-4 w-4" />
        ) : (
          <IconSun className="h-4 w-4" />
        )}
        Tema
      </span>
      <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
        {LABEL[theme]}
      </span>
    </button>
  );
}
