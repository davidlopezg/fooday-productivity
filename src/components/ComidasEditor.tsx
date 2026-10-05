"use client";

import { useState } from "react";
import { IconPlus, IconTrash } from "@/components/icons";
import type { ComidaInput } from "@/lib/types";

/** Editor de lista de comidas (1 fila por comida con hora + descripción). */
export function ComidasEditor({
  value,
  onChange,
}: {
  value: ComidaInput[];
  onChange: (v: ComidaInput[]) => void;
}) {
  function update(i: number, patch: Partial<ComidaInput>) {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { hora: "", descripcion: "" }]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          Sin comidas registradas.
        </p>
      )}
      {value.map((c, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md border border-border bg-background p-2"
        >
          <input
            type="time"
            value={c.hora ?? ""}
            onChange={(e) => update(i, { hora: e.target.value })}
            className="w-24 rounded border border-input bg-card px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Hora"
          />
          <input
            type="text"
            value={c.descripcion}
            onChange={(e) => update(i, { descripcion: e.target.value })}
            placeholder="Ej: Desayuno — café con leche + tostada con AOVE"
            className="min-w-0 flex-1 rounded border border-input bg-card px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Descripción"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
            aria-label="Eliminar comida"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <IconPlus className="h-3.5 w-3.5" />
        Añadir comida
      </button>
    </div>
  );
}

/** Convierte filas persistidas (con hora "HH:MM:SS") a la forma del editor. */
export function comidasDeEstatus(
  comidas: Array<{ hora: string | null; descripcion: string }>,
): ComidaInput[] {
  return comidas.map((c) => ({
    hora: c.hora ? c.hora.slice(0, 5) : "",
    descripcion: c.descripcion,
  }));
}

/** Lista read-only para mostrar en el detalle. */
export function ComidasList({
  comidas,
}: {
  comidas: Array<{ hora: string | null; descripcion: string }>;
}) {
  if (comidas.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin comidas registradas.</p>
    );
  }
  return (
    <ul className="space-y-1.5 text-sm">
      {comidas.map((c, i) => (
        <li key={i} className="flex gap-3">
          {c.hora ? (
            <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {c.hora.slice(0, 5)}
            </span>
          ) : (
            <span className="w-12 shrink-0 text-xs text-muted-foreground">—</span>
          )}
          <span className="leading-relaxed">{c.descripcion}</span>
        </li>
      ))}
    </ul>
  );
}
