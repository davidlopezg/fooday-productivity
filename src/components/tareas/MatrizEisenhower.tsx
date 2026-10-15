"use client";

// ============================================================================
// MatrizEisenhower — grid 2×2 con los 4 cuadrantes Eisenhower.
//
// Implementa drag & drop con @dnd-kit/core (ya instalado):
//   · Cada `TareaCardMatriz` es `useDraggable`.
//   · Cada cuadrante es `useDroppable` con id = "Q1" | "Q2" | "Q3" | "Q4".
//   · Al soltar, el padre (`/matriz/page.tsx`) recibe el evento y llama a
//     `aplicarPrioridadesTareas` con la nueva prioridad derivada.
//
// El grid es responsive:
//   · Móvil (<sm): 1 columna con los cuadrantes apilados (drag sigue
//     funcionando, solo cambia el layout).
//   · Tablet/desktop: 2×2.
//
// El highlight del dropzone activo se ve con un ring + bg del color del
// cuadrante. Usa `useDroppable.isOver` (sin over复杂 animation libs).
// ============================================================================

import { useDroppable } from "@dnd-kit/core";
import {
  CUADRANTES,
  type Cuadrante,
  type ClasificacionMatriz,
} from "@/lib/tareas/matriz";
import type { Meta, Tarea } from "@/lib/types";
import { TareaCardMatriz } from "./TareaCardMatriz";

interface Props {
  /** Tareas a pintar, agrupadas por cuadrante. */
  bucketed: Record<Cuadrante, Tarea[]>;
  /** Mapa id → meta (para mostrar título/código en las cards). */
  metaByTareaId: Map<string, { meta: Meta | undefined; titulo: string | null; codigo: string | null }>;
  /** Mapa id → clasificación (para que las cards saquen días hasta vencer). */
  clasifByTareaId: Map<string, ClasificacionMatriz>;
  /** Set de tareas que la IA acaba de mover (las marcamos como "desalineadas"
   *  para que se vea el cambio vs. la prioridad manual anterior). */
  recienMovidas?: Set<string>;
}

function CuadranteDroppable({
  id,
  children,
}: {
  id: Cuadrante;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const cfg = CUADRANTES[id];
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[180px] flex-col rounded-xl border-2 ${cfg.borde} ${cfg.bg} p-2 transition-all ${
        isOver ? "scale-[1.01] ring-2 ring-primary/40" : ""
      }`}
      data-testid={`cuadrante-${id}`}
    >
      {children}
    </div>
  );
}

export function MatrizEisenhower({
  bucketed,
  metaByTareaId,
  clasifByTareaId,
  recienMovidas,
}: Props) {
  // Orden de pintado en el grid:
  //   Fila 1: [Q2 (arriba-izq) | Q1 (arriba-der)]
  //   Fila 2: [Q4 (abajo-izq) | Q3 (abajo-der)]
  // Así el visual coincide con un plano cartesiano de Y=importancia(subX).
  const orden: Cuadrante[] = ["Q2", "Q1", "Q4", "Q3"];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {orden.map((c) => {
        const cfg = CUADRANTES[c];
        const tareas = bucketed[c];
        return (
          <CuadranteDroppable key={c} id={c}>
            <header className="mb-2 flex items-center justify-between gap-2 px-1">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <span aria-hidden>{cfg.emoji}</span>
                <span>{cfg.titulo}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({tareas.length})
                </span>
              </h3>
              <span className="rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {cfg.prioridad}
              </span>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
              {tareas.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-background/40 p-3 text-center text-[11px] italic text-muted-foreground">
                  Sin tareas aquí. Arrastra una tarjeta a este slot.
                </p>
              ) : (
                tareas.map((t) => {
                  const meta = metaByTareaId.get(t.id);
                  const clasif = clasifByTareaId.get(t.id);
                  if (!clasif) return null;
                  return (
                    <TareaCardMatriz
                      key={t.id}
                      tarea={t}
                      clasificacion={clasif}
                      cuadranteOrigen={c}
                      metaTitulo={meta?.titulo ?? null}
                      metaCodigo={meta?.codigo ?? null}
                      forceDesalineado={recienMovidas?.has(t.id) ?? false}
                    />
                  );
                })
              )}
            </div>
          </CuadranteDroppable>
        );
      })}
    </div>
  );
}