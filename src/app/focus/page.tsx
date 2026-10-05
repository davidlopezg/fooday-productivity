"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchPomodoroHoy } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { usePomodoro } from "@/lib/pomodoroStore";
import {
  DURACIONES_SEG,
  ETIQUETAS_FASE,
  formatTiempo,
} from "@/lib/pomodoro";
import {
  IconBolt,
  IconCheck,
  IconPause,
  IconPlay,
  IconShield,
  IconX,
} from "@/components/icons";
import type { PomodoroFase, PomodoroSesion, PreFlightCheck } from "@/lib/types";
import { PreFlightChecklist } from "@/components/PreFlightChecklist";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";

// ----------------------------------------------------------------------------
// Helpers de UI locales
// ----------------------------------------------------------------------------
const COLORES_FASE: Record<PomodoroFase, string> = {
  focus: "from-violet-600 to-indigo-600",
  descanso_corto: "from-emerald-500 to-teal-500",
  descanso_largo: "from-sky-500 to-cyan-500",
};

const ETIQUETAS_BOTON_FASE: Record<PomodoroFase, string> = {
  focus: "Iniciar foco",
  descanso_corto: "Descanso corto (5 min)",
  descanso_largo: "Descanso largo (15 min)",
};

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatDuracion(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

// ----------------------------------------------------------------------------
// Página
// ----------------------------------------------------------------------------
export default function FocusPage() {
  const {
    fase,
    restante,
    corriendo,
    objetivo,
    preFlight,
    pomodorosHoy,
    iniciar,
    descansar,
    pausar,
    reanudar,
    abortar,
    saltar,
  } = usePomodoro();

  // Duración personalizada del foco (en minutos). Se persiste vía el store.
  const [duracionFocoMin, setDuracionFocoMinLocal] = useState<number>(25);
  const { setDuracionFocoMin } = usePomodoro();

  // Estado del pre-flight: cuando hay un objetivo pendiente de confirmar,
  // mostramos el checklist antes de arrancar el timer.
  const [preflightPendiente, setPreflightPendiente] = useState<{
    titulo: string;
    subtarea: string | null;
  } | null>(null);

  const sesionesQ = useData<PomodoroSesion[]>(fetchPomodoroHoy, []);
  const sesiones = sesionesQ.data;
  const totalSegHoy = sesiones.reduce((acc, s) => acc + s.duracion_seg, 0);
  const totalMinHoy = Math.round(totalSegHoy / 60);

  // ---- Handlers ----------------------------------------------------------
  function handleIniciarFoco() {
    // Si ya hay un timer corriendo o en pausa, no abrimos pre-flight.
    if (corriendo || restante < DURACIONES_SEG.focus) return;
    setPreflightPendiente({
      titulo: "Foco libre",
      subtarea: null,
    });
  }

  function handleConfirmarPreflight(check: PreFlightCheck) {
    if (!preflightPendiente) return;
    iniciar(
      {
        tarea_id: "libre",
        tarea_titulo: preflightPendiente.titulo,
        subtarea_id: null,
        subtarea_descripcion: preflightPendiente.subtarea,
      },
      check,
    );
    setPreflightPendiente(null);
  }

  function handleSaltarPreflight() {
    if (!preflightPendiente) return;
    iniciar({
      tarea_id: "libre",
      tarea_titulo: preflightPendiente.titulo,
      subtarea_id: null,
      subtarea_descripcion: preflightPendiente.subtarea,
    });
    setPreflightPendiente(null);
  }

  function handleDuracionFoco(min: number) {
    setDuracionFocoMinLocal(min);
    setDuracionFocoMin(min);
  }

  // ---- Render ------------------------------------------------------------
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <IconBolt className="h-6 w-6 text-violet-500" />
              Focus
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Temporizador pomodoro. Empieza un foco desde una subtarea o en modo libre.
            </p>
          </div>
          <HelpDrawer title="Focus" items={AYUDA_POR_RUTA["/focus"]?.items ?? []} />
        </div>
      </header>

      {/* ------------------ Pre-flight check (cuando se va a iniciar foco) ------------------ */}
      {preflightPendiente && (
        <PreFlightChecklist
          tareaTitulo={preflightPendiente.titulo}
          subtareaDescripcion={preflightPendiente.subtarea}
          onConfirm={handleConfirmarPreflight}
          onSkip={handleSaltarPreflight}
        />
      )}

      {/* ------------------ Indicador de pre-flight completado (timer en curso) ------------------ */}
      {preFlight && corriendo && fase === "focus" && objetivo?.tarea_id === "libre" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <IconShield className="h-4 w-4" />
          <span className="font-medium">Pre-vuelo confirmado</span>
          {preFlight.criterioExito && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Criterio: {preFlight.criterioExito}
              </span>
            </>
          )}
        </div>
      )}

      {/* ------------------ Reloj grande ------------------ */}
      <section
        className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${COLORES_FASE[fase]} p-8 text-white shadow-lg`}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            {ETIQUETAS_FASE[fase]}
          </span>
          <div
            className="font-mono text-7xl font-bold leading-none tabular-nums tracking-tight sm:text-8xl"
            aria-live="polite"
          >
            {formatTiempo(restante)}
          </div>
          {objetivo && objetivo.tarea_id !== "libre" ? (
            <div className="max-w-md text-balance">
              <p className="text-sm font-medium opacity-90">{objetivo.tarea_titulo}</p>
              {objetivo.subtarea_descripcion && (
                <p className="mt-0.5 text-xs opacity-75">
                  🎯 {objetivo.subtarea_descripcion}
                </p>
              )}
            </div>
          ) : objetivo?.tarea_id === "libre" ? (
            <p className="text-sm opacity-90">Foco libre — sin tarea asignada</p>
          ) : (
            <p className="text-sm opacity-80">Listo para empezar</p>
          )}

          {/* Controles */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {fase === "focus" && !corriendo && restante === DURACIONES_SEG.focus && !preflightPendiente ? (
              <button
                onClick={handleIniciarFoco}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-violet-700 shadow-md transition-transform hover:scale-105 active:scale-100"
              >
                <IconShield className="h-4 w-4" />
                Preparar foco
              </button>
            ) : corriendo ? (
              <button
                onClick={pausar}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-violet-700 shadow-md transition-transform hover:scale-105 active:scale-100"
              >
                <IconPause className="h-4 w-4" />
                Pausar
              </button>
            ) : (
              <button
                onClick={reanudar}
                className="inline-flex items-center gap-2 rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-violet-700 shadow-md transition-transform hover:scale-105 active:scale-100"
              >
                <IconPlay className="h-4 w-4" />
                Reanudar
              </button>
            )}
            {(corriendo || restante < DURACIONES_SEG[fase]) && (
              <>
                <button
                  onClick={saltar}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur transition-colors hover:bg-white/20"
                  title="Saltar a la siguiente fase"
                >
                  Saltar ▶
                </button>
                <button
                  onClick={abortar}
                  className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-xs font-medium backdrop-blur transition-colors hover:bg-white/20"
                  title="Abortar sin guardar"
                >
                  <span className="inline-flex items-center gap-1">
                    <IconX className="h-3.5 w-3.5" />
                    Abortar
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ------------------ Atajos ------------------ */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={handleIniciarFoco}
          disabled={corriendo}
          className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-violet-500/40 hover:bg-accent disabled:opacity-50"
        >
          <span className="text-2xl">🎯</span>
          <div>
            <div className="text-sm font-semibold">Foco libre</div>
            <p className="text-[11px] text-muted-foreground">
              {duracionFocoMin} min sin objetivo concreto
            </p>
          </div>
        </button>
        <button
          onClick={() => descansar(false)}
          disabled={corriendo}
          className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-emerald-500/40 hover:bg-accent disabled:opacity-50"
        >
          <span className="text-2xl">☕</span>
          <div>
            <div className="text-sm font-semibold">Descanso corto</div>
            <p className="text-[11px] text-muted-foreground">5 min entre pomodoros</p>
          </div>
        </button>
        <button
          onClick={() => descansar(true)}
          disabled={corriendo}
          className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-sky-500/40 hover:bg-accent disabled:opacity-50"
        >
          <span className="text-2xl">🌿</span>
          <div>
            <div className="text-sm font-semibold">Descanso largo</div>
            <p className="text-[11px] text-muted-foreground">15 min cada 4 pomodoros</p>
          </div>
        </button>
      </section>

      {/* ------------------ Configuración del foco ------------------ */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Duración del foco</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Por defecto 25 min. Ajusta a tu ritmo (1-60 min).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[15, 20, 25, 30, 45, 50].map((m) => (
            <button
              key={m}
              onClick={() => handleDuracionFoco(m)}
              disabled={corriendo && fase === "focus"}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                duracionFocoMin === m
                  ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "border-border hover:bg-accent"
              } disabled:opacity-50`}
            >
              {m} min
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={60}
            value={duracionFocoMin}
            onChange={(e) => {
              const v = Math.max(1, Math.min(60, Number(e.target.value) || 25));
              handleDuracionFoco(v);
            }}
            disabled={corriendo && fase === "focus"}
            className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            aria-label="Duración personalizada (min)"
          />
        </div>
      </section>

      {/* ------------------ Resumen del día ------------------ */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Hoy</h2>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div>
            <span className="text-3xl font-bold tabular-nums">{pomodorosHoy}</span>
            <span className="ml-1.5 text-sm text-muted-foreground">
              pomodoro{pomodorosHoy === 1 ? "" : "s"}
            </span>
          </div>
          <div>
            <span className="text-3xl font-bold tabular-nums">{totalMinHoy}</span>
            <span className="ml-1.5 text-sm text-muted-foreground">min de foco</span>
          </div>
        </div>
      </section>

      {/* ------------------ Histórico de hoy ------------------ */}
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Sesiones de hoy</h2>
        </header>
        {sesionesQ.loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : sesiones.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Aún no has completado ningún pomodoro hoy.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {sesiones.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <IconCheck className="h-4 w-4 text-emerald-500" />
                  <span className="font-mono tabular-nums text-xs text-muted-foreground">
                    {formatHora(s.ended_at)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium">{formatDuracion(s.duracion_seg)}</span>
                </div>
                {s.subtarea_id ? (
                  <span className="text-[11px] text-muted-foreground">con subtarea</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">foco libre</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------ Tip ------------------ */}
      <p className="text-center text-xs text-muted-foreground">
        💡 Tip: cuando un pomodoro termina, se graba automáticamente. ¿Listo para empezar?{" "}
        <Link href="/tareas" className="font-medium text-foreground underline-offset-4 hover:underline">
          Ve a tus tareas
        </Link>{" "}
        y lanza un foco desde una subtarea.
      </p>
    </div>
  );
}
