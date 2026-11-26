"use client";

// ============================================================================
// ListaOrdenable — lista con orden de ejecución MANUAL (issue #105)
// ----------------------------------------------------------------------------
// Componente reutilizable para los tres niveles del árbol:
//
//   proyecto ──▶ meta ──▶ KR ──▶ tarea
//
// Interacción (lo que hay que hacer en CADA lista):
//   · Arrastrar con el asa (drag & drop con @dnd-kit/sortable) — rápido
//     con ratón.
//   · Botones ↑ / ↓ — funcionan con teclado, con lector de pantalla y en
//     móvil, donde arrastrar es incómodo. Son el camino principal: el
//     drag & drop es el atajo.
//
// El componente NO sabe de BD: llama a `onReordenado(idsEnOrden)` con la
// lista de ids ya en el orden nuevo y el caller la persiste. La UI es
// optimista (reordena al instante) y vuelve al estado real si el caller
// avisa de un fallo con `onReordenado` devolviendo `false`.
//
// El orden guardado es 1..N (la posición en el array). `0` ("sin posición")
// se reserva para lo que no está en ninguna lista.
// ============================================================================

import { useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moverEnLista } from "@/lib/orden";

export type ItemOrdenable = { id: string };

export function ListaOrdenable<T extends ItemOrdenable>({
  items,
  onReordenado,
  renderItem,
  etiquetaLista,
  disabled = false,
  className = "",
}: {
  /** Elementos YA en el orden que se quiere mostrar. */
  items: T[];
  /** Persiste el nuevo orden. Recibe los ids en el orden nuevo (1..N).
   *  Devuelve `false` si NO se ha guardado (el componente vuelve al
   *  orden anterior). */
  onReordenado: (
    idsEnOrden: string[],
  ) => void | boolean | Promise<void | boolean>;
  /** Dibuja el contenido de cada fila. `posicion` es 1..N. */
  renderItem: (item: T, posicion: number) => ReactNode;
  /** Nombre de la lista, para lectores de pantalla ("Metas del proyecto"). */
  etiquetaLista: string;
  /** Desactiva la interacción (mientras se guarda, por ejemplo). */
  disabled?: boolean;
  /** Clases extra para la lista (`<ol>`). */
  className?: string;
}) {
  const [ids, setIds] = useState<string[]>(() => items.map((i) => i.id));
  const [guardando, setGuardando] = useState(false);

  // Si el caller cambia los items (recarga desde BD), se resincroniza la
  // lista local. Se compara por la secuencia de ids: si el contenido es el
  // mismo, no se toca (así no se pierde un arrastre en curso).
  //
  // Patrón de React "ajustar el estado cuando cambia una prop": se
  // compara durante el render (no en un efecto), que es lo que recomienda
  // React y evita el render en cascada.
  const firma = items.map((i) => i.id).join("|");
  const [firmaPrevia, setFirmaPrevia] = useState(firma);
  if (firma !== firmaPrevia) {
    setFirmaPrevia(firma);
    setIds(firma.split("|").filter(Boolean));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function persistir(nuevosIds: string[]) {
    setIds(nuevosIds);
    setGuardando(true);
    try {
      const r = await onReordenado(nuevosIds);
      // Si el caller devuelve `false`, no se ha guardado: se vuelve al
      // orden que tenía la lista antes del cambio.
      if (r === false) {
        setIds(items.map((i) => i.id));
      }
    } catch {
      setIds(items.map((i) => i.id));
    } finally {
      setGuardando(false);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const viejo = ids.indexOf(String(active.id));
    const nuevo = ids.indexOf(String(over.id));
    if (viejo < 0 || nuevo < 0) return;
    void persistir(arrayMove(ids, viejo, nuevo));
  }

  function mover(id: string, delta: number) {
    const nuevos = moverEnLista(ids, id, delta);
    if (nuevos.join("|") === ids.join("|")) return;
    void persistir(nuevos);
  }

  const porId = new Map(items.map((i) => [i.id, i]));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol aria-label={etiquetaLista} className={`space-y-1 ${className}`}>
          {ids.map((id, i) => {
            const item = porId.get(id);
            if (!item) return null;
            return (
              <FilaOrdenable
                key={id}
                id={id}
                posicion={i + 1}
                total={ids.length}
                deshabilitado={disabled || guardando}
                onMover={mover}
              >
                {renderItem(item, i + 1)}
              </FilaOrdenable>
            );
          })}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Fila: asa de arrastre + número + botones ↑/↓.
// ---------------------------------------------------------------------------
function FilaOrdenable({
  id,
  posicion,
  total,
  deshabilitado,
  onMover,
  children,
}: {
  id: string;
  posicion: number;
  total: number;
  deshabilitado: boolean;
  onMover: (id: string, delta: number) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const estilo = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={`flex items-start gap-1 ${isDragging ? "opacity-70" : ""}`}
    >
      <span
        aria-hidden
        className="mt-1 w-5 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground"
      >
        {posicion}
      </span>
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={deshabilitado}
        aria-label={`Mover (arrastrar). Posición ${posicion} de ${total}`}
        title="Arrastrar para cambiar el orden"
        className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 active:cursor-grabbing"
      >
        <svg viewBox="0 0 10 16" className="h-3.5 w-2.5" fill="currentColor" aria-hidden>
          <circle cx="2.5" cy="3" r="1.4" />
          <circle cx="7.5" cy="3" r="1.4" />
          <circle cx="2.5" cy="8" r="1.4" />
          <circle cx="7.5" cy="8" r="1.4" />
          <circle cx="2.5" cy="13" r="1.4" />
          <circle cx="7.5" cy="13" r="1.4" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">{children}</div>
      <span className="mt-0.5 flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMover(id, -1)}
          disabled={deshabilitado || posicion <= 1}
          aria-label={`Subir (posición ${posicion} de ${total})`}
          title="Subir"
          className="rounded p-0.5 text-[10px] leading-none text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => onMover(id, 1)}
          disabled={deshabilitado || posicion >= total}
          aria-label={`Bajar (posición ${posicion} de ${total})`}
          title="Bajar"
          className="rounded p-0.5 text-[10px] leading-none text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
        >
          ▼
        </button>
      </span>
    </li>
  );
}
