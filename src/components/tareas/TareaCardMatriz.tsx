"use client";

// ============================================================================
// TareaCardMatriz — card compacta para mostrar tareas dentro de un
// cuadrante de la matriz Eisenhower. Diseñada para ser DRAGGABLE.
//
// Aspecto:
//   · Borde fino + fondo claro del cuadrante
//   · Título truncado a 1 línea
//   · Badges: meta (o "WIG" si es WIG-tarea, o "huérfana")
//   · Deadline con código de color (rojo si vencida, ámbar si hoy)
//   · Indicador de "desalineado" si la prioridad manual no coincide con
//     el cuadrante computado (se ve como un puntito al lado del título)
//
// NO incluye el dropdown de prioridad (eso lo cubre el modal de IA).
// El cambio manual de prioridad se hace vía EditarModal (existente).
// ============================================================================

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Cuadrante, ClasificacionMatriz } from "@/lib/tareas/matriz";
import type { Prioridad, Tarea } from "@/lib/types";

interface Props {
  tarea: Tarea;
  clasificacion: ClasificacionMatriz;
  /** Cuadrante del que viene (para el data-attribute de dnd-kit). */
  cuadranteOrigen: Cuadrante;
  /** Meta asociada, si existe (para mostrar el título). */
  metaTitulo: string | null;
  metaCodigo: string | null;
  /** Si true, fuerza mostrar el indicador "prioridad no coincide". */
  forceDesalineado?: boolean;
}

const TONO_PRIORIDAD: Record<Prioridad, string> = {
  critica: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  urgente: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  alta: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  media: "bg-muted text-muted-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
};

const CUADRANTE_PRIORIDAD: Record<Cuadrante, Prioridad> = {
  Q1: "critica",
  Q2: "alta",
  Q3: "media",
  Q4: "baja",
};

function fmtDias(dias: number | null): { texto: string; clase: string } {
  if (dias == null) return { texto: "—", clase: "text-muted-foreground" };
  if (dias < 0)
    return {
      texto: `${Math.abs(dias)}d atrasada`,
      clase: "text-red-600 dark:text-red-400 font-semibold",
    };
  if (dias === 0)
    return {
      texto: "vence HOY",
      clase: "text-red-600 dark:text-red-400 font-semibold",
    };
  if (dias <= 3)
    return {
      texto: `en ${dias}d`,
      clase: "text-orange-600 dark:text-orange-400",
    };
  if (dias <= 7)
    return {
      texto: `en ${dias}d`,
      clase: "text-amber-600 dark:text-amber-400",
    };
  return { texto: `en ${dias}d`, clase: "text-muted-foreground" };
}

export function TareaCardMatriz({
  tarea,
  clasificacion,
  cuadranteOrigen,
  metaTitulo,
  metaCodigo,
  forceDesalineado,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tarea.id,
      data: { tipo: "tarea", origenCuadrante: cuadranteOrigen },
    });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const dias = fmtDias(clasificacion.diasHastaVencer);
  const esperado = CUADRANTE_PRIORIDAD[cuadranteOrigen];
  const desalineado = forceDesalineado || (tarea.prioridad && tarea.prioridad !== esperado);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="group cursor-grab touch-none rounded-lg border border-border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
      aria-label={`Tarea ${tarea.titulo} — arrastra a otro cuadrante`}
    >
      <div className="flex items-start gap-1.5">
        {desalineado && (
          <span
            title="La prioridad manual no coincide con el cuadrante calculado por fecha + WIG"
            className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"
          />
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/tareas?tarea=${tarea.id}`}
            className="block truncate text-xs font-medium leading-snug text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {tarea.titulo}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {tarea.es_wig ? (
              <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-700 dark:text-fuchsia-300">
                🎯 WIG
              </span>
            ) : metaTitulo ? (
              <span
                className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title={metaTitulo}
              >
                {metaCodigo ? metaCodigo : metaTitulo.slice(0, 14)}
              </span>
            ) : (
              <span className="rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                huérfana
              </span>
            )}
            <span className={`text-[10px] tabular-nums ${dias.clase}`}>
              {dias.texto}
            </span>
            {tarea.prioridad && (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${TONO_PRIORIDAD[tarea.prioridad]}`}
              >
                {tarea.prioridad}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}