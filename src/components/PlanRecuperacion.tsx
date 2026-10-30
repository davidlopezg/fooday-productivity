"use client";

// ============================================================================
// PlanRecuperacion.tsx — Fases 4, 5 y 6 del Modo Recuperación.
// ----------------------------------------------------------------------------
// QUÉ ES
//   La tarjeta que convierte la propuesta determinista en algo EJECUTABLE:
//     · Fase 4 → la pantalla: principal + secundarias + mantenimiento +
//       bienestar, con su motivo y su primer paso.
//     · Fase 5 → el botón de Pomodoro por tarea, REUSANDO el store global
//       (`usePomodoro()`). No hay un segundo timer: el `PomodoroWidget` que
//       ya vive en `AppShell` sigue siendo el único control.
//     · Fase 6 → el feedback: "hoy no", "no es prioritaria", "bloqueada".
//       Es lo que hace que el sistema no repita mañana lo que el usuario ya
//       dijo que hoy no.
//
// LO QUE NO HACE
//   · No crea un motor de IA que decida: la selección ya viene hecha y
//     determinista (`seleccion.ts`).
//   · No borra ni reordena tareas.
//   · No manda correos, no notifica, no toca nada fuera del usuario.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import {
  ETIQUETA_REGLA,
  TONO_REGLA,
  agruparDescartables,
  type PropuestaShadow,
} from "@/lib/recuperacion/shadow";
import type { TareaSeleccionada } from "@/lib/recuperacion/seleccion";
import { iniciarTarea, registrarFeedback } from "@/lib/recuperacion/feedback";
import { usePomodoro } from "@/lib/pomodoroStore";
import { IconAlertTriangle, IconSparkles } from "@/components/icons";

// ============================================================================
// Tipos
// ============================================================================

export type PlanRecuperacionProps = {
  propuesta: PropuestaShadow | null;
  cargando?: boolean;
  error?: string | null;
  /** Se llama cuando el usuario acepta o descarta la propuesta entera. */
  onCambio?: () => void;
};

// ============================================================================
// Botón de Pomodoro (Fase 5)
// ============================================================================

/**
 * Botón que arranca un pomodoro para una tarea concreta.
 *
 * REUSA el store global: no crea un timer, no añade estado, no duplica la
 * lógica de fases. El `PomodoroWidget` de `AppShell` es el que sigue
 * mostrando el contador; este botón solo llama a `iniciar()`.
 */
function BotonPomodoro({
  tarea,
  className,
}: {
  tarea: TareaSeleccionada;
  className?: string;
}) {
  const { iniciar, fase, objetivo, corriendo } = usePomodoro();

  const esEsta = objetivo?.tarea_id === tarea.tarea.id;
  // `fase` nunca es "idle": si hay objetivo, hay fase. El store mantiene
  // `objetivo` a null cuando no hay pomodoro.
  const activa = esEsta && (corriendo || fase === "focus" || fase === "descanso_corto" || fase === "descanso_largo");

  function arrancar() {
    if (activa) return;
    iniciar({
      tarea_id: tarea.tarea.id,
      tarea_titulo: tarea.tarea.titulo,
      subtarea_id: null,
      subtarea_descripcion: null,
      // Si el motor sabe cuánto tiempo lleva, el pomodoro se ajusta a ese
      // tamaño. Si no, el store usa la duración por defecto.
      ...(tarea.minutosEstimados
        ? { duracionSeg: Math.max(60, Math.min(tarea.minutosEstimados * 60, 3600)) }
        : {}),
    });
  }

  return (
    <button
      type="button"
      onClick={arrancar}
      disabled={activa}
      title={
        activa
          ? "Esta tarea ya tiene un pomodoro en marcha"
          : `Iniciar un pomodoro para: ${tarea.tarea.titulo}`
      }
      className={
        className ??
        "shrink-0 rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-sky-500/50 hover:text-sky-700 disabled:opacity-60 dark:hover:text-sky-300"
      }
    >
      {activa ? "⏱ en curso" : "⏱ pomodoro"}
    </button>
  );
}

// ============================================================================
// Tarjeta de una tarea propuesta
// ============================================================================

function TarjetaTarea({
  sel,
  color,
  icono,
  onAccion,
}: {
  sel: TareaSeleccionada;
  /** Color del borde: principal = rojo, secundaria = ámbar, etc. */
  color: string;
  icono: string;
  onAccion: (accion: "aceptada" | "pospuesta" | "bloqueada" | "no_prioritaria") => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regla = sel.motivo.regla;

  async function enviar(accion: "pospuesta" | "bloqueada" | "no_prioritaria") {
    setEnviando(true);
    setError(null);
    try {
      await registrarFeedback({
        tareaId: sel.tarea.id,
        reglaPropuesta: regla,
        accion,
        motivo: motivo.trim(),
      });
      setAbierto(false);
      setMotivo("");
      onAccion(accion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className={`rounded-lg border-l-4 ${color} border border-border bg-background/70 p-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-base">{icono}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{sel.tarea.titulo}</p>

          {/* El chip de la regla: por qué entra aquí. */}
          <span
            className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONO_REGLA[regla] ?? ""}`}
          >
            {ETIQUETA_REGLA[regla] ?? regla}
          </span>

          {/* El motivo: la explicación de POR QUÉ. */}
          {sel.motivo.motivo && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {sel.motivo.motivo}
            </p>
          )}
          {sel.motivo.detalle && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground/80">
              {sel.motivo.detalle}
            </p>
          )}

          {/* Acciones */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                void iniciarTarea(sel.tarea.id);
                onAccion("aceptada");
              }}
              title={`Empezar: ${sel.tarea.titulo}`}
              className="shrink-0 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              ▶ Empezar
            </button>
            <BotonPomodoro tarea={sel} />
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="shrink-0 rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300"
            >
              {abierto ? "Cancelar" : "Hoy no"}
            </button>
          </div>

          {/* Panel de feedback (Fase 6). */}
          {abierto && (
            <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
              <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                ¿Por qué no hoy? El motivo es lo que evita que el sistema te
                vuelva a proponer lo mismo mañana.
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder="Espera una respuesta de la gestoría / no es mi turno / lo delego…"
                className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-amber-500/60"
              />
              {error && (
                <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={enviando || !motivo.trim()}
                  onClick={() => void enviar("pospuesta")}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                >
                  📅 Posponer
                </button>
                <button
                  type="button"
                  disabled={enviando || !motivo.trim()}
                  onClick={() => void enviar("no_prioritaria")}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                >
                  🔽 No es prioritaria
                </button>
                <button
                  type="button"
                  disabled={enviando || !motivo.trim()}
                  onClick={() => void enviar("bloqueada")}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium disabled:opacity-50"
                >
                  🚫 Bloquear
                </button>
              </div>
            </div>
          )}
        </div>

        {sel.minutosEstimados != null && (
          <span className="shrink-0 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {sel.minutosEstimados} min
          </span>
        )}
      </div>
    </li>
  );
}

// ============================================================================
// Componente principal
// ============================================================================

export function PlanRecuperacion({
  propuesta,
  cargando = false,
  error = null,
  onCambio,
}: PlanRecuperacionProps) {
  const grupos = agruparDescartables(propuesta?.resultado.descartables ?? []);

  if (cargando) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconSparkles className="h-4 w-4 animate-pulse" />
          Calculando la propuesta…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm text-red-700 dark:text-red-300">
          No se pudo calcular la propuesta: {error}
        </p>
      </section>
    );
  }

  if (!propuesta) return null;

  const { resultado, nivel, resumen, origenCapacidad } = propuesta;

  return (
    <section className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-500/5 to-cyan-500/5 p-5 sm:p-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold tracking-tight">
            <IconSparkles className="h-5 w-5 text-sky-500" />
            Modo Recuperación
          </h2>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            {nivel === "alta"
              ? "carga completa"
              : nivel === "media"
                ? "carga media"
                : "carga mínima"}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">{resumen}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          El criterio es determinista: mismas tareas → misma propuesta, siempre.
          {origenCapacidad === "estimado" &&
            " La carga está estimada a partir de tu estado emocional de hoy."}
        </p>
      </header>

      {/* ── Riesgos: no se silencian nunca ── */}
      {resultado.avisos.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <IconAlertTriangle className="h-4 w-4 text-amber-500" />
            Riesgos que el sistema no silencia
          </h3>
          <ul className="space-y-2">
            {resultado.avisos.map((a, i) => (
              <li
                key={`${a.tipo}-${i}`}
                className={`rounded-lg border p-3 text-sm ${
                  a.nivel === 0
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <span className="leading-relaxed">{a.texto}</span>
                {a.detalle && a.detalle.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Ver los {a.detalle.length} pagos uno a uno
                    </summary>
                    <ul className="mt-1.5 space-y-1">
                      {a.detalle.map((d, j) => (
                        <li key={j} className="text-xs leading-relaxed text-muted-foreground">
                          · {d}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── La tarea principal ── */}
      {resultado.principal && (
        <div className="mb-3">
          <h3 className="mb-1.5 text-sm font-semibold">🔴 Tarea principal</h3>
          <ul className="space-y-2">
            <TarjetaTarea
              sel={resultado.principal}
              color="border-l-red-500"
              icono="🔴"
              onAccion={() => onCambio?.()}
            />
          </ul>
        </div>
      )}

      {/* ── Secundarias ── */}
      {resultado.secundarias.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-1.5 text-sm font-semibold">
            🟡 Tareas secundarias ({resultado.secundarias.length})
          </h3>
          <ul className="space-y-2">
            {resultado.secundarias.map((s) => (
              <TarjetaTarea
                key={s.tarea.id}
                sel={s}
                color="border-l-amber-500"
                icono="🟡"
                onAccion={() => onCambio?.()}
              />
            ))}
          </ul>
        </div>
      )}

      {/* ── Mantenimiento ── */}
      {resultado.mantenimiento && (
        <div className="mb-3">
          <h3 className="mb-1.5 text-sm font-semibold">🔧 Mantenimiento</h3>
          <ul className="space-y-2">
            <TarjetaTarea
              sel={resultado.mantenimiento}
              color="border-l-violet-500"
              icono="🔧"
              onAccion={() => onCambio?.()}
            />
          </ul>
        </div>
      )}

      {/* ── Bienestar: hueco propio, no compite con el trabajo ── */}
      {resultado.bienestar && (
        <div className="mb-3">
          <h3 className="mb-1.5 text-sm font-semibold">🌿 Bienestar</h3>
          <ul className="space-y-2">
            <TarjetaTarea
              sel={resultado.bienestar}
              color="border-l-teal-500"
              icono="🌿"
              onAccion={() => onCambio?.()}
            />
          </ul>
        </div>
      )}

      {/* ── Lo que NO entra hoy ── */}
      {grupos.length > 0 && (
        <details className="rounded-lg border border-border bg-background/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            💤 {resultado.descartables.length} tarea
            {resultado.descartables.length === 1 ? "" : "s"} que hoy no entrarían
          </summary>
          <div className="mt-2 space-y-3">
            {grupos.map((g) => (
              <div key={g.clave}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.titulo} · {g.tareas.length}
                </p>
                <ul className="mt-1 space-y-1">
                  {g.tareas.map((d) => (
                    <li key={d.tarea.id} className="text-xs leading-relaxed text-muted-foreground">
                      · <span className="font-medium text-foreground">{d.tarea.titulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            No se descartan: solo se apartan del día.{" "}
            <Link href="/semana" className="underline underline-offset-4">
              La revisión semanal
            </Link>{" "}
            propondrá qué hacer con ellas.
          </p>
        </details>
      )}

      {resultado.plan.length === 0 && resultado.avisos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Con estos datos no hay nada que proponer hoy. Si esperabas algo,
          revisa las tareas pendientes en{" "}
          <Link href="/tareas" className="underline underline-offset-4">
            /tareas
          </Link>
          .
        </p>
      )}
    </section>
  );
}
