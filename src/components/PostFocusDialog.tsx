"use client";

// ============================================================================
// PostFocusDialog — diálogo que aparece cuando un pomodoro de subtarea
// termina. Pregunta al usuario qué hacer con la subtarea:
//
//   ✅ Marcar completada  → UPDATE tareas_subtareas (hecho=true) + descanso
//   ➕ Añadir subtareas   → abre el EditarModal de la tarea padre con foco
//                           en el editor; al cerrar → descanso
//   ⏱️ Necesito más tiempo → reactiva el timer con la misma duración
//
// Si el usuario ignora el diálogo puede cerrarlo con "Cerrar" o la X;
// el foco queda pausado en 0 y el reloj grande muestra "Foco terminado".
// ============================================================================

import { useState } from "react";
import { usePomodoro } from "@/lib/pomodoroStore";
import { marcarTareaSubtareaHecha } from "@/lib/mutations";
import { fetchTareaById } from "@/lib/queries";
import { EditarModal } from "@/components/TareaModal";
import {
  IconBolt,
  IconCheck,
  IconClock,
  IconPlus,
  IconX,
} from "@/components/icons";
import { errorMessage } from "@/lib/errors";
import type { Tarea } from "@/lib/types";

export function PostFocusDialog() {
  const { postFocusPendiente, resolverPostFocus } = usePomodoro();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tareaPadre, setTareaPadre] = useState<Tarea | null>(null);

  if (!postFocusPendiente) return null;

  // ---- Handlers -------------------------------------------------------------

  async function handleMarcarHecha() {
    if (!postFocusPendiente || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      await marcarTareaSubtareaHecha(
        postFocusPendiente.tareaId,
        postFocusPendiente.subtareaId,
        postFocusPendiente.subtareaDescripcion,
      );
      resolverPostFocus("descansar");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGuardando(false);
    }
  }

  async function handleAnadir() {
    if (!postFocusPendiente || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      // Cargamos la tarea padre con sus subtareas actuales para abrir
      // el EditarModal con foco en el editor. La subtarea que el usuario
      // estaba trabajando aparece en la lista (marcada o no, según haya
      // elegido antes).
      const t = await fetchTareaById(postFocusPendiente.tareaId);
      if (!t) throw new Error("No se encontró la tarea padre");
      setTareaPadre(t);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGuardando(false);
    }
  }

  function handleMasTiempo() {
    resolverPostFocus("mas");
  }

  function handleCerrar() {
    resolverPostFocus("cerrar");
  }

  function handleCerrarEditor() {
    setTareaPadre(null);
    // Al cerrar el editor de la tarea, saltamos al descanso — la subtarea
    // ya se actualizó/añadió lo que el usuario quiso.
    resolverPostFocus("descansar");
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-focus-title"
      >
        <div
          className="relative w-full max-w-md overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                🎯
              </span>
              <h2 id="post-focus-title" className="text-sm font-semibold">
                Foco terminado
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Cerrar"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Tarea
              </p>
              <p className="mt-0.5 font-medium">{postFocusPendiente.tareaTitulo}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                Subtarea en la que estabas
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                <IconBolt className="h-3.5 w-3.5 text-violet-500" />
                {postFocusPendiente.subtareaDescripcion}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              ¿Qué quieres hacer?
            </p>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="grid gap-2">
              <button
                type="button"
                onClick={handleMarcarHecha}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-500/95 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <IconCheck className="h-4 w-4" />
                {guardando ? "Guardando…" : "Marcar como completada"}
              </button>

              <button
                type="button"
                onClick={handleAnadir}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
              >
                <IconPlus className="h-4 w-4" />
                Añadir nuevas subtareas
              </button>

              <button
                type="button"
                onClick={handleMasTiempo}
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2.5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-500/15 disabled:opacity-50 dark:text-violet-300"
              >
                <IconClock className="h-4 w-4" />
                Necesito más tiempo
              </button>
            </div>

            <button
              type="button"
              onClick={() => resolverPostFocus("descansar")}
              disabled={guardando}
              className="block w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              Descansar ahora (no marco la subtarea)
            </button>
          </div>
        </div>
      </div>

      {tareaPadre && (
        <EditarModal
          tarea={tareaPadre}
          onClose={handleCerrarEditor}
          onChanged={handleCerrarEditor}
        />
      )}
    </>
  );
}
