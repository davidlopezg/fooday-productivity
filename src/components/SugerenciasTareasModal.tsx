"use client";

// ============================================================================
// SugerenciasTareasModal — modal genérico para revisar y confirmar
// sugerencias de tareas generadas por la IA.
//
// Reutilizado por dos pantallas:
//   · /tareas/inbox (botón "Sugerir tareas con IA" desde email/contexto)
//   · /tareas       (botón "Sugerir 3 siguientes acciones")
//
// Filosofía: la IA SOLO SUGIERE. El usuario edita, descarta y confirma.
// Las sugerencias nunca se escriben solas en la BD.
//
// Cada fila de sugerencia:
//   · checkbox para descartar (incluida por defecto).
//   · input editable (título).
//   · textarea editable (descripción) colapsada por defecto si vacía.
//   · select de prioridad.
//   · razón de la IA en cursiva (si existe) — no editable.
// ============================================================================

import { useState } from "react";
import { IconSparkles, IconX } from "@/components/icons";
import type { SugerenciaTarea } from "@/lib/iaSugerencias";

const PRIORIDADES: Array<{ id: "critica" | "alta" | "media" | "baja"; label: string }> = [
  { id: "critica", label: "Crítica" },
  { id: "alta", label: "Alta" },
  { id: "media", label: "Media" },
  { id: "baja", label: "Baja" },
];

export type SugerenciaEditada = {
  /** false si el usuario la ha descartado con el checkbox. */
  incluida: boolean;
  titulo: string;
  descripcion: string;
  prioridad: "critica" | "alta" | "media" | "baja" | null;
  por_que: string | null;
};

export function SugerenciasTareasModal({
  titulo,
  subtitulo,
  sugerencias,
  busy,
  error,
  onCancel,
  onConfirmar,
  textoBotonConfirmar,
}: {
  titulo: string;
  /** Línea auxiliar bajo el título (e.g. "3 siguientes acciones mirando toda tu lista abierta"). */
  subtitulo?: string;
  sugerencias: SugerenciaTarea[] | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirmar: (seleccionadas: SugerenciaEditada[]) => Promise<void>;
  /** Texto del botón inferior (e.g. "Añadir 4 tareas" o "Crear 3 acciones"). */
  textoBotonConfirmar: string;
}) {
  // Trabajamos sobre una copia editable. Inicializamos desde las
  // sugerencias de la IA una sola vez (cuando llegan).
  const [edits, setEdits] = useState<SugerenciaEditada[]>(() =>
    (sugerencias ?? []).map((s) => ({
      incluida: true,
      titulo: s.titulo,
      descripcion: s.descripcion ?? "",
      prioridad: s.prioridad ?? "media",
      por_que: s.por_que,
    })),
  );

  // Si las sugerencias cambian (p.ej. nueva llamada con otro email),
  // reseteamos las ediciones.
  const srcKey = (sugerencias ?? [])
    .map((s) => s.titulo)
    .join("|");
  const [lastKey, setLastKey] = useState(srcKey);
  if (srcKey !== lastKey) {
    setLastKey(srcKey);
    setEdits(
      (sugerencias ?? []).map((s) => ({
        incluida: true,
        titulo: s.titulo,
        descripcion: s.descripcion ?? "",
        prioridad: s.prioridad ?? "media",
        por_que: s.por_que,
      })),
    );
  }

  function update(idx: number, patch: Partial<SugerenciaEditada>) {
    setEdits((cur) => cur.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  const seleccionadas = edits.filter(
    (e) => e.incluida && e.titulo.trim().length > 0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onCancel}
      />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-violet-500" />
            {titulo}
          </h2>
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1.5 hover:bg-accent disabled:opacity-50"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {busy && !sugerencias && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p>La IA está pensando…</p>
              <p className="text-[11px]">
                {subtitulo ?? "Mira el contexto y propone tareas accionables."}
              </p>
            </div>
          )}

          {sugerencias && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                <strong>Solo sugiero</strong>; tú decides si aplicarlas. La
                IA no escribe en tu BD sin tu confirmación. Edita los textos,
                marca las que no quieras y pulsa el botón de abajo.
              </p>

              {sugerencias.length === 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
                  La IA no devolvió ninguna sugerencia. Prueba con un texto
                  más concreto o, si es la lista de tareas, revisa que
                  tengas tareas abiertas con suficiente contexto.
                </div>
              ) : (
                <ul className="space-y-3">
                  {edits.map((e, idx) => {
                    const sug = sugerencias[idx];
                    return (
                      <li
                        key={idx}
                        className={`rounded-lg border p-3 transition-colors ${
                          e.incluida
                            ? "border-border bg-muted/20"
                            : "border-dashed border-border/60 bg-muted/10 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={e.incluida}
                            onChange={(ev) =>
                              update(idx, { incluida: ev.target.checked })
                            }
                            disabled={busy}
                            className="mt-1 h-4 w-4 shrink-0"
                            aria-label="Incluir esta tarea"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <input
                              type="text"
                              value={e.titulo}
                              onChange={(ev) =>
                                update(idx, { titulo: ev.target.value })
                              }
                              disabled={busy || !e.incluida}
                              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                              placeholder="Título de la tarea"
                            />
                            <textarea
                              value={e.descripcion}
                              onChange={(ev) =>
                                update(idx, { descripcion: ev.target.value })
                              }
                              disabled={busy || !e.incluida}
                              rows={2}
                              placeholder="Descripción (opcional)"
                              className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                Prioridad:
                                <select
                                  value={e.prioridad ?? "media"}
                                  onChange={(ev) =>
                                    update(idx, {
                                      prioridad: ev.target.value as SugerenciaEditada["prioridad"],
                                    })
                                  }
                                  disabled={busy || !e.incluida}
                                  className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                                >
                                  {PRIORIDADES.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {e.por_que && (
                                <span className="ml-auto max-w-[60%] rounded-md border-l-2 border-violet-500/40 bg-violet-500/5 px-2 py-1 text-[11px] italic text-foreground/80">
                                  {e.por_que}
                                </span>
                              )}
                            </div>
                            {/* Mostrar también el por_que si la IA no lo metió
                                en el estado (p.ej. si vino null pero el objeto
                                sí lo trae). Defensivo. */}
                            {!e.por_que && sug?.por_que && (
                              <p className="rounded-md border-l-2 border-violet-500/40 bg-violet-500/5 px-2 py-1 text-[11px] italic text-foreground/80">
                                {sug.por_que}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <span className="mr-auto text-xs text-muted-foreground">
            {seleccionadas.length} de {edits.length} seleccionada
            {edits.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(seleccionadas)}
            disabled={busy || sugerencias === null || seleccionadas.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            <IconSparkles className="h-4 w-4" />
            {busy ? "Creando…" : textoBotonConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}