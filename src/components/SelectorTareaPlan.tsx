"use client";

// ============================================================================
// SelectorTareaPlan — elegir una tarea para el plan del día (issue #73).
//
// Dos usos:
//   1. En la PARTE 1 (captura): marcar "esta tarea la quiero hacer hoy" para
//      que la IA la tenga en cuenta al armar los bloques.
//   2. En la PARTE 2 (plan ya generado): meter una tarea en un bloque.
//
// Hace las dos cosas que pedía el issue #73:
//   • escribir una tarea NUEVA (se crea en `tareas` si no existía), y
//   • elegir una tarea que YA está en la base de datos y no está completada.
//
// Todo es táctil: el buscador y los botones tienen 40 px de alto mínimo, y
// el panel es una columna en el móvil (nada de filas apretadas).
// ============================================================================

import { useMemo, useState } from "react";
import {
  candidatasParaElPlan,
  existeTituloEnCandidatas,
  type TareaCandidata,
} from "@/lib/planBloques";

export default function SelectorTareaPlan({
  candidatas,
  yaEnElPlan = [],
  onElegir,
  onNueva,
  onCerrar,
  titulo = "Elegir una tarea",
  textoNueva = "Escribe una tarea nueva",
}: {
  /** Tareas de la base de datos que se pueden elegir. */
  candidatas: TareaCandidata[];
  /** Ids de tareas que ya están en el plan (no se ofrecen de nuevo). */
  yaEnElPlan?: string[];
  /** Elegir una tarea que ya existe. */
  onElegir: (t: TareaCandidata) => void;
  /** Escribir una tarea nueva (la crea el padre). */
  onNueva?: (titulo: string) => void;
  /** Cerrar el panel. */
  onCerrar: () => void;
  titulo?: string;
  textoNueva?: string;
}) {
  const [query, setQuery] = useState("");
  const [nueva, setNueva] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const lista = useMemo(
    () => candidatasParaElPlan(candidatas, { yaEnElPlan, query, limite: 20 }),
    [candidatas, yaEnElPlan, query],
  );

  const yaExiste = useMemo(
    () => existeTituloEnCandidatas(candidatas, nueva),
    [candidatas, nueva],
  );

  function enviarNueva() {
    const t = nueva.trim();
    if (!t || !onNueva) return;
    if (yaExiste) {
      setAviso(`"${t}" ya está en tu base de datos: búscala y elígela.`);
      return;
    }
    setAviso(null);
    setNueva("");
    onNueva(t);
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{titulo}</h4>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el selector de tareas"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted"
        >
          ✕ Cerrar
        </button>
      </div>

      {/* ── Buscar entre las tareas de la base de datos ── */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Busca en tus tareas…"
        aria-label="Buscar tareas"
        className="mb-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      {/* ── Escribir una tarea nueva ── */}
      {onNueva && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enviarNueva();
              }
            }}
            placeholder={textoNueva}
            aria-label={textoNueva}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={enviarNueva}
            disabled={!nueva.trim()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            Crear y añadir
          </button>
        </div>
      )}

      {aviso && (
        <p className="mb-2 text-xs text-amber-700 dark:text-amber-400">{aviso}</p>
      )}

      {/* ── Lista de candidatas ── */}
      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-background/60 px-3 py-3 text-xs text-muted-foreground">
          {query.trim()
            ? "Ninguna tarea pendiente coincide con esa búsqueda."
            : "No hay tareas pendientes que añadir (o ya están todas en el plan)."}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {lista.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-sm">{t.titulo}</span>
                {t.es_wig && (
                  <span className="shrink-0 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700 dark:text-fuchsia-300">
                    🎯 WIG
                  </span>
                )}
                {t.prioridad && (
                  <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {t.prioridad}
                  </span>
                )}
                {t.fecha_fin && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    ⏰ {t.fecha_fin}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onElegir(t)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-background px-3 text-xs font-medium text-primary hover:bg-primary/10"
              >
                Añadir al plan
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
