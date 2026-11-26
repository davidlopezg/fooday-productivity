"use client";

// ============================================================================
// PasoWigMetas — paso 3 del ritual semanal (issue #88).
// ----------------------------------------------------------------------------
// QUÉ HACE
//   Elige las 3 WIGs de META: las metas que mandan en el ciclo.
//
// REGLA DEL RITUAL
//   · Máximo 3 (lo impone la BD: índice único parcial, migration 0018).
//   · El ORDEN es la prioridad (1-2-3): la hereda el paso 4.
//   · Se pueden repetir las de la semana pasada: por eso el botón
//     “Continuar igual”, que es un clic.
//
// POR QUÉ NO ES UN <select>
//   Elegir 3 de 15 metas con un desplegable es una decisión a ciegas. Aquí
//   se ve de cada meta su situación y su proyecto, y se puede abrir.
// ============================================================================

import Link from "next/link";
import type { DraftRitual } from "@/lib/ritual/draft";
import { CAP_WIGS } from "@/lib/ritual/draft";
import type { Meta, Proyecto } from "@/lib/types";

export function PasoWigMetas({
  metas,
  proyectosPorId,
  draft,
  onChange,
  wigsSemanaPasada,
}: {
  metas: Meta[];
  proyectosPorId: Map<string, Proyecto>;
  draft: DraftRitual;
  onChange: (d: DraftRitual) => void;
  /** Las WIGs de la semana pasada (bitácora), si las hay. */
  wigsSemanaPasada: string[];
}) {
  const elegidas = draft.wigsMeta;
  const completas = elegidas.length >= CAP_WIGS;

  function alternar(id: string) {
    if (elegidas.includes(id)) {
      onChange({
        ...draft,
        wigsMeta: elegidas.filter((x) => x !== id),
      });
      return;
    }
    if (elegidas.length >= CAP_WIGS) return;
    onChange({ ...draft, wigsMeta: [...elegidas, id] });
  }

  function mover(id: string, delta: number) {
    const i = elegidas.indexOf(id);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= elegidas.length) return;
    const copia = [...elegidas];
    copia[i] = copia[j];
    copia[j] = elegidas[i];
    onChange({ ...draft, wigsMeta: copia });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">{elegidas.length}/3</strong> elegidas.
          El orden es la prioridad: la 1 manda sobre la 2, y así.
        </p>
        {wigsSemanaPasada.length > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...draft, wigsMeta: [...wigsSemanaPasada] })}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-accent"
          >
            ↺ Continuar igual (las de la semana pasada)
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {metas.map((m) => {
          const posicion = elegidas.indexOf(m.id);
          const elegida = posicion >= 0;
          const proyecto = m.proyecto_id
            ? proyectosPorId.get(m.proyecto_id)
            : undefined;
          const situacion = draft.metas[m.id]?.situacion ?? m.situacion_actual ?? "";

          return (
            <li
              key={m.id}
              className={`rounded-xl border p-3 ${
                elegida
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {elegida && (
                      <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
                        {posicion + 1}
                      </span>
                    )}
                    {m.codigo ? `${m.codigo} · ` : ""}
                    {m.titulo}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {proyecto ? `Proyecto: ${proyecto.nombre} · ` : "Sin proyecto · "}
                    {m.fase ? `Fase: ${m.fase}` : "Sin fase"}
                  </p>
                  {situacion && (
                    <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground">
                      {situacion}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {elegida && (
                    <>
                      <button
                        type="button"
                        onClick={() => mover(m.id, -1)}
                        aria-label={`Subir ${m.titulo}`}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(m.id, 1)}
                        aria-label={`Bajar ${m.titulo}`}
                        className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-accent"
                      >
                        ↓
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => alternar(m.id)}
                    disabled={!elegida && completas}
                    className={`rounded-md border px-3 py-1 text-[11px] font-medium disabled:opacity-40 ${
                      elegida
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {elegida ? "Quitar" : "Elegir"}
                  </button>
                </div>
              </div>

              <Link
                href={`/metas/detalle/${m.id}`}
                className="mt-1.5 inline-block text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Abrir meta
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
