"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePomodoro } from "@/lib/pomodoroStore";
import { ETIQUETAS_FASE, formatTiempo } from "@/lib/pomodoro";
import { IconBolt, IconPause, IconPlay, IconX } from "@/components/icons";
import type { PomodoroFase } from "@/lib/types";

/**
 * Mini-vista flotante del pomodoro. Aparece bottom-right cuando hay un
 * timer activo (corriendo o en pausa) Y no estamos ya en /focus.
 *
 * No se muestra si no hay nada en curso (restante === duracion y fase==focus
 * y no corriendo). Es puramente cosmético/funcional — el Provider mantiene
 * el estado real.
 */
export function PomodoroWidget() {
  const pathname = usePathname();
  const {
    fase,
    restante,
    corriendo,
    objetivo,
    pomodorosHoy,
    pausar,
    reanudar,
    abortar,
  } = usePomodoro();

  // No mostrar si no hay timer activo
  if (fase === "focus" && !corriendo && !objetivo) return null;
  // No mostrar en la propia página /focus (ya está el reloj grande)
  if (pathname === "/focus") return null;
  // No mostrar en /login
  if (pathname === "/login") return null;

  const gradiente: Record<PomodoroFase, string> = {
    focus: "from-violet-600 to-indigo-600",
    descanso_corto: "from-emerald-500 to-teal-500",
    descanso_largo: "from-sky-500 to-cyan-500",
  };

  return (
    <div
      className="pointer-events-auto fixed bottom-4 right-4 z-40 w-[min(20rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200"
      role="status"
      aria-live="polite"
    >
      <div
        className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${gradiente[fase]} text-white shadow-xl`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <IconBolt className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-90">
                {ETIQUETAS_FASE[fase]}
              </span>
              {pomodorosHoy > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">
                  {pomodorosHoy} hoy
                </span>
              )}
            </div>
            <div className="font-mono text-2xl font-bold leading-none tabular-nums">
              {formatTiempo(restante)}
            </div>
            {objetivo && objetivo.tarea_id !== "libre" && (
              <p className="mt-0.5 truncate text-[11px] opacity-90">
                {objetivo.subtarea_descripcion ?? objetivo.tarea_titulo}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-1 border-t border-white/20 bg-black/10 px-2 py-1.5">
          {corriendo ? (
            <button
              onClick={pausar}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-white/10"
              aria-label="Pausar"
            >
              <IconPause className="h-3.5 w-3.5" />
              Pausar
            </button>
          ) : (
            <button
              onClick={reanudar}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium hover:bg-white/10"
              aria-label="Reanudar"
            >
              <IconPlay className="h-3.5 w-3.5" />
              Reanudar
            </button>
          )}
          <Link
            href="/focus"
            className="rounded-md px-2 py-1 text-[11px] font-medium hover:bg-white/10"
          >
            Ver Focus
          </Link>
          <button
            onClick={abortar}
            className="ml-auto rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Abortar"
            title="Abortar"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
