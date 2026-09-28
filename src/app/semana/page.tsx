"use client";

// ============================================================================
// /semana — Planificación semanal tipo pipeline.
// Cada columna = un día de la semana (L..D ISO). Las tarjetas son tareas de
// `tareas` vinculadas a un día de la semana actual en `plan_semanal_tareas`.
// Las reglas no negociables (pagos, Sol de Nit, descanso, planificación,
// María, comida) se pintan como BLOQUES FIJOS dentro de cada columna.
//
// Interacciones:
//   • Drag entre columnas (sólo en días no bloqueados) → UPDATE en BD.
//   • Click en tarjeta → EditarModal (todos los campos + adjuntos + IA).
//   • Botón "+ Añadir" por columna → popover "Buscar existente" o "Crear nueva".
//   • Botón IA al pie → propuesta de 3 críticas/día para L, M, X, V.
//
// Datos:
//   • plan_semanal_tareas  (esta semana)
//   • tareas               (catálogo completo)
//   • tareas críticas      (pool para IA y backlog)
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  IconCheck,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@/components/icons";
import { useData } from "@/lib/useData";
import {
  fetchPlanSemanal,
  fetchTareas,
  fetchTareasCriticasActivas,
} from "@/lib/queries";
import {
  aplicarPropuestaIA,
  asignarTareaADia,
  quitarTareaDeSemana,
} from "@/lib/mutations";
import { CrearModal, EditarModal } from "@/components/TareaModal";
import {
  BLOQUES_FIJOS,
  DIAS_IA,
  DIAS_SEMANA,
  TAREAS_POR_DIA_IA,
  bloquesFijosDe,
  esDiaBloqueado,
  formatISOWeek,
  getCurrentISOWeek,
  nombreDia,
  shiftISOWeek,
  type BloqueFijo,
  type DiaSemana,
} from "@/lib/semana";
import type { PlanSemanalTarea, Prioridad, Tarea } from "@/lib/types";

const ACTIVAS: ReadonlyArray<Tarea["estado"]> = [
  "pendiente",
  "en_progreso",
  "bloqueada",
];

const TONO_PRIORIDAD: Record<string, string> = {
  critica:
    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  urgente:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  alta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  media: "bg-muted text-muted-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
};

const ORDEN_PRIORIDAD: Prioridad[] = [
  "critica",
  "urgente",
  "alta",
  "media",
  "baja",
];

// ============================================================================
// Tarjeta de TAREA — arrastrable + clicable (click abre EditarModal).
// ============================================================================
function TarjetaTarea({
  tarea,
  onEditar,
  onQuitar,
}: {
  tarea: Tarea;
  onEditar: (t: Tarea) => void;
  onQuitar: (t: Tarea) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarea.id,
  });
  const estadoTono =
    tarea.estado === "hecha"
      ? "line-through opacity-60"
      : tarea.estado === "en_progreso"
        ? ""
        : "";
  return (
    <article
      ref={setNodeRef}
      className={`group rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <div className="flex items-stretch">
        {/* Drag handle — toda la franja izquierda sirve para arrastrar */}
        <button
          {...attributes}
          {...listeners}
          aria-label="Arrastrar"
          title="Arrastrar para mover de día"
          className="touch-manipulation flex w-6 shrink-0 cursor-grab items-center justify-center border-r border-border/60 text-muted-foreground hover:bg-accent active:cursor-grabbing"
        >
          <span className="select-none text-xs">≡</span>
        </button>

        {/* Contenido clicable → abre EditarModal */}
        <button
          type="button"
          onClick={() => onEditar(tarea)}
          className="min-w-0 flex-1 p-2.5 text-left"
        >
          <p
            className={`text-sm font-medium leading-snug ${estadoTono}`}
          >
            {tarea.titulo}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tarea.prioridad && (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                  TONO_PRIORIDAD[tarea.prioridad] ?? TONO_PRIORIDAD.media
                }`}
              >
                {tarea.prioridad}
              </span>
            )}
            {tarea.deadline && (
              <span className="text-[11px] text-muted-foreground">
                📅 {tarea.deadline}
              </span>
            )}
            {tarea.pts != null && (
              <span className="text-[11px] text-muted-foreground">
                {tarea.pts} pts
              </span>
            )}
          </div>
        </button>

        {/* Quitar de la semana */}
        <button
          type="button"
          onClick={() => onQuitar(tarea)}
          aria-label="Quitar de esta semana"
          title="Quitar de la semana"
          className="flex w-7 shrink-0 items-start justify-center p-1 text-muted-foreground hover:text-destructive"
        >
          <IconX className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

// ============================================================================
// Bloque FIJO — no se puede mover, no es tarea de BD, es contexto.
// ============================================================================
function BloqueFijoCard({ fijo }: { fijo: BloqueFijo }) {
  return (
    <div
      className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5"
      title="Bloque fijo (no se puede mover ni eliminar)"
    >
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">{fijo.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug">{fijo.titulo}</p>
          {fijo.nota && (
            <p className="mt-0.5 text-[11px] italic text-muted-foreground">
              {fijo.nota}
            </p>
          )}
        </div>
        <span
          className="rounded-full border border-primary/30 bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary"
          title="Fijo"
        >
          🔒
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Columna de un DÍA — droppable (si no está bloqueado).
// ============================================================================
function ColumnaDia({
  dia,
  tarjetas,
  onEditar,
  onQuitar,
  onAbrirAnadir,
  bloqueada,
}: {
  dia: DiaSemana;
  tarjetas: Tarea[];
  onEditar: (t: Tarea) => void;
  onQuitar: (t: Tarea) => void;
  onAbrirAnadir: (dia: DiaSemana) => void;
  bloqueada: boolean;
}) {
  // En días bloqueados no usamos useDroppable para que no acepten drops.
  const droppable = useDroppable({
    id: `dia-${dia}`,
    disabled: bloqueada,
  });
  const { setNodeRef, isOver } = droppable;

  const fijas = bloquesFijosDe(dia);

  return (
    <section
      ref={bloqueada ? undefined : setNodeRef}
      className={`relative flex max-h-[70dvh] w-[80vw] shrink-0 snap-start flex-col rounded-xl border border-t-4 bg-muted/20 ${
        bloqueada
          ? "border-t-amber-500/60 opacity-95"
          : "border-t-primary/60"
      } ${isOver ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""} sm:w-72 md:w-auto md:min-w-0 md:flex-1`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="text-sm font-semibold tracking-tight">
          {nombreDia(dia)}
        </h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {tarjetas.length}
        </span>
      </header>

      <div className="min-h-[80px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {/* Bloques fijos arriba */}
        {fijas.map((f, idx) => (
          <BloqueFijoCard key={`fijo-${idx}`} fijo={f} />
        ))}

        {/* Tarjetas de tareas */}
        {tarjetas.map((t) => (
          <TarjetaTarea
            key={t.id}
            tarea={t}
            onEditar={onEditar}
            onQuitar={onQuitar}
          />
        ))}

        {/* Si está bloqueada y no hay tarjetas, mensaje suave */}
        {bloqueada && tarjetas.length === 0 && fijas.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-2 py-3 text-center text-[11px] text-muted-foreground">
            Día bloqueado.
          </p>
        )}
      </div>

      {/* Botón "+ Añadir" — abajo del todo */}
      <div className="shrink-0 border-t border-border/60 px-2 pb-2 pt-2">
        <button
          type="button"
          onClick={() => onAbrirAnadir(dia)}
          disabled={bloqueada}
          title={
            bloqueada
              ? "Este día está bloqueado — no se pueden añadir tareas."
              : "Añadir una tarea a este día"
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <span className="text-base leading-none">+</span>
          Añadir tarea
        </button>
      </div>
    </section>
  );
}

// ============================================================================
// Modal "Añadir tarea" — buscador de tareas + atajo a CrearModal.
// Se pinta como overlay centrado (no como popover) porque el contenedor del
// pipeline tiene overflow-x-auto y un popover quedaría clipado verticalmente.
// ============================================================================
function ModalAnadir({
  abierto,
  dia,
  semana,
  candidatos,
  onAsignarExistente,
  onCrearNueva,
  onCerrar,
}: {
  abierto: boolean;
  dia: DiaSemana | null;
  semana: { anio: number; semana_iso: number };
  candidatos: Tarea[];
  onAsignarExistente: (tareaId: string, dia: DiaSemana) => Promise<void> | void;
  onCrearNueva: () => void;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"buscar" | "crear">("buscar");
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const lista = candidatos.filter((c) => {
      if (!ACTIVAS.includes(c.estado)) return false;
      if (!t) return true;
      return c.titulo.toLowerCase().includes(t);
    });
    return lista.sort((a, b) => {
      const pa = ORDEN_PRIORIDAD.indexOf(a.prioridad ?? "media");
      const pb = ORDEN_PRIORIDAD.indexOf(b.prioridad ?? "media");
      if (pa !== pb) return pa - pb;
      return a.titulo.localeCompare(b.titulo);
    });
  }, [q, candidatos]);

  if (!abierto || dia === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCerrar} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Añadir a {nombreDia(dia)}</h2>
          <button onClick={onCerrar} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border px-5 py-2">
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setTab("buscar")}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                tab === "buscar" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Buscar existente
            </button>
            <button
              type="button"
              onClick={() => setTab("crear")}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                tab === "crear" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              + Crear nueva
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "buscar" && (
            <div>
              <div className="relative mb-3">
                <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar tarea…"
                  className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {filtrados.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  {q
                    ? "Sin resultados."
                    : "No hay tareas activas sin asignar esta semana."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filtrados.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onAsignarExistente(c.id, dia)}
                        className="flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm hover:border-border hover:bg-accent"
                      >
                        {c.prioridad && (
                          <span
                            className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                              TONO_PRIORIDAD[c.prioridad] ?? TONO_PRIORIDAD.media
                            }`}
                          >
                            {c.prioridad}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">{c.titulo}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "crear" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Crea una tarea completa (título, prioridad, descripción…). Al
                guardar, se asignará automáticamente a{" "}
                <strong>{nombreDia(dia)}</strong> (semana {semana.semana_iso}/{semana.anio}).
              </p>
              <button
                type="button"
                onClick={onCrearNueva}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Abrir formulario de nueva tarea
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Modal de PROPUESTA IA — muestra el reparto antes de aplicar.
// ============================================================================
function ModalIdea({
  abierto,
  onClose,
  propuesta,
  tareasById,
  resumen,
  loading,
  error,
  onAplicar,
  aplicando,
}: {
  abierto: boolean;
  onClose: () => void;
  propuesta: Partial<Record<DiaSemana, string[]>> | null;
  tareasById: Map<string, Tarea>;
  resumen: string | null;
  loading: boolean;
  error: string | null;
  onAplicar: () => void;
  aplicando: boolean;
}) {
  if (!abierto) return null;
  const totalPropuesto = propuesta
    ? Object.values(propuesta).reduce((acc, arr) => acc + (arr?.length ?? 0), 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">✨ Propuesta IA para la semana</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {loading && (
            <p className="text-sm text-muted-foreground">
              Pensando el reparto con IA…
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {resumen && !loading && !error && (
            <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-sm">
              <p className="font-medium">Justificación</p>
              <p className="mt-1 text-muted-foreground">{resumen}</p>
            </div>
          )}
          {propuesta && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DIAS_IA.map((d) => {
                const ids = propuesta[d] ?? [];
                return (
                  <div
                    key={d}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {nombreDia(d)}
                    </h3>
                    {ids.length === 0 ? (
                      <p className="text-[11px] italic text-muted-foreground">
                        (vacío)
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {ids.map((id, i) => {
                          const t = tareasById.get(id);
                          if (!t) return null;
                          return (
                            <li
                              key={id}
                              className="flex items-start gap-1.5 text-xs"
                            >
                              <span className="mt-0.5 shrink-0 font-medium text-muted-foreground">
                                {i + 1}.
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                  {t.titulo}
                                </span>
                                {t.deadline && (
                                  <span className="text-[10px] text-muted-foreground">
                                    📅 {t.deadline}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-muted-foreground">
            {totalPropuesto > 0
              ? `Se añadirán ${totalPropuesto} tareas (no reemplaza lo ya planificado).`
              : "No hay tareas críticas para proponer."}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              onClick={onAplicar}
              disabled={loading || aplicando || totalPropuesto === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {aplicando ? "Aplicando…" : "Aplicar a la semana"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Backlog: tareas activas NO asignadas a esta semana.
// (Por defecto solo críticas + urgentes; el resto se queda en /tareas.)
// ============================================================================
function BacklogTareas({
  candidatas,
  semana,
  onAsignar,
}: {
  candidatas: Tarea[];
  semana: { anio: number; semana_iso: number };
  onAsignar: (tareaId: string, dia: DiaSemana) => Promise<void> | void;
}) {
  const [abierto, setAbierto] = useState(true);
  const [q, setQ] = useState("");
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return candidatas
      .filter((c) => {
        if (!ACTIVAS.includes(c.estado)) return false;
        if (!t) return true;
        return c.titulo.toLowerCase().includes(t);
      })
      .sort((a, b) => {
        const pa = ORDEN_PRIORIDAD.indexOf(a.prioridad ?? "media");
        const pb = ORDEN_PRIORIDAD.indexOf(b.prioridad ?? "media");
        if (pa !== pb) return pa - pb;
        return a.titulo.localeCompare(b.titulo);
      })
      .slice(0, 30); // cap para no renderizar 500 filas
  }, [candidatas, q]);

  if (candidatas.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">
            Backlog · tareas activas no asignadas esta semana
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {candidatas.length} tarea(s) disponibles. Mostrando críticas y
            urgentes primero.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {abierto ? "▾" : "▸"}
        </span>
      </button>

      {abierto && (
        <div className="border-t border-border px-4 pb-3 pt-3">
          <div className="relative mb-2">
            <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar…"
              className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {filtradas.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
              Nada que mostrar.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtradas.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-xs"
                >
                  {t.prioridad && (
                    <span
                      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                        TONO_PRIORIDAD[t.prioridad] ?? TONO_PRIORIDAD.media
                      }`}
                    >
                      {t.prioridad}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {t.titulo}
                  </span>
                  {t.deadline && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      📅 {t.deadline}
                    </span>
                  )}
                  <div className="flex shrink-0 gap-1">
                    {DIAS_IA.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onAsignar(t.id, d)}
                        title={`Asignar a ${nombreDia(d)}`}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent"
                      >
                        → {nombreDia(d).slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Página principal
// ============================================================================
export default function SemanaPage() {
  const [semana, setSemana] = useState<{ anio: number; semana_iso: number }>(() => {
    const w = getCurrentISOWeek();
    return { anio: w.anio, semana_iso: w.semana_iso };
  });

  // Plan semanal de la semana seleccionada
  const {
    data: plan,
    loading: planLoading,
    error: planError,
    reload: reloadPlan,
    setData: setPlan,
  } = useData<PlanSemanalTarea[]>(
    () => fetchPlanSemanal({ anio: semana.anio, semana_iso: semana.semana_iso }),
    [],
    [semana.anio, semana.semana_iso],
  );

  // Catálogo completo de tareas (para resolver títulos y para los buscadores)
  const { data: tareas, reload: reloadTareas } = useData<Tarea[]>(
    fetchTareas,
    [],
  );

  // Críticas activas (pool para IA)
  const { data: criticas } = useData<Tarea[]>(
    fetchTareasCriticasActivas,
    [],
  );

  // Modales y popovers
  const [editando, setEditando] = useState<Tarea | null>(null);
  const [creandoParaDia, setCreandoParaDia] = useState<DiaSemana | null>(null);
  const [anadirParaDia, setAnadirParaDia] = useState<DiaSemana | null>(null);

  // IA
  const [propuesta, setPropuesta] = useState<Partial<Record<DiaSemana, string[]>> | null>(null);
  const [propuestaResumen, setPropuestaResumen] = useState<string | null>(null);
  const [propuestaLoading, setPropuestaLoading] = useState(false);
  const [propuestaError, setPropuestaError] = useState<string | null>(null);
  const [propuestaAbierta, setPropuestaAbierta] = useState(false);
  const [aplicandoPropuesta, startAplicandoTransition] = useTransition();

  // dnd-kit
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);
  const [errorMover, setErrorMover] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  // ---- Datos derivados ----
  const tareasById = useMemo(() => {
    const m = new Map<string, Tarea>();
    for (const t of tareas ?? []) m.set(t.id, t);
    return m;
  }, [tareas]);

  const tareasAsignadasIds = useMemo(() => {
    const s = new Set<string>();
    for (const a of plan ?? []) s.add(a.tarea_id);
    return s;
  }, [plan]);

  const porDia = useMemo(() => {
    const m = new Map<DiaSemana, Tarea[]>();
    for (const d of DIAS_SEMANA) m.set(d.id, []);
    for (const a of plan ?? []) {
      const t = tareasById.get(a.tarea_id);
      if (!t) continue;
      m.get(a.dia_semana as DiaSemana)?.push(t);
    }
    // Orden estable: por prioridad y luego por título
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        const pa = ORDEN_PRIORIDAD.indexOf(a.prioridad ?? "media");
        const pb = ORDEN_PRIORIDAD.indexOf(b.prioridad ?? "media");
        if (pa !== pb) return pa - pb;
        return a.titulo.localeCompare(b.titulo);
      });
    }
    return m;
  }, [plan, tareasById]);

  // Pool para el buscador del popover y para el backlog
  const tareasNoAsignadas = useMemo(() => {
    return (tareas ?? []).filter((t) => !tareasAsignadasIds.has(t.id));
  }, [tareas, tareasAsignadasIds]);

  const backlogCandidatas = useMemo(() => {
    return tareasNoAsignadas.filter((t) => {
      const p = t.prioridad ?? "media";
      return p === "critica" || p === "urgente";
    });
  }, [tareasNoAsignadas]);

  // ---- Handlers ----
  function recargarTodo() {
    reloadPlan();
    reloadTareas();
  }

  function onDragStart(e: DragStartEvent) {
    setErrorMover(null);
    setArrastrada(tareasById.get(String(e.active.id)) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setArrastrada(null);
    const destino = e.over?.id ? String(e.over.id) : null;
    const tId = String(e.active.id);
    if (!destino || !destino.startsWith("dia-")) return;
    const nuevoDia = Number(destino.slice(4)) as DiaSemana;
    if (!Number.isFinite(nuevoDia) || nuevoDia < 1 || nuevoDia > 7) return;
    if (esDiaBloqueado(nuevoDia)) return;
    const t = tareasById.get(tId);
    if (!t) return;

    // Buscar asignación actual
    const actual = (plan ?? []).find((a) => a.tarea_id === tId);
    if (actual && actual.dia_semana === nuevoDia) return;

    // Optimista
    const antes = plan ?? [];
    setPlan(
      actual
        ? antes.map((x) =>
            x.tarea_id === tId ? { ...x, dia_semana: nuevoDia } : x,
          )
        : [
            ...antes,
            {
              id: `tmp-${tId}`,
              owner_id: "",
              anio: semana.anio,
              semana_iso: semana.semana_iso,
              tarea_id: tId,
              dia_semana: nuevoDia,
              orden: 0,
              created_at: "",
              updated_at: "",
            },
          ],
    );

    try {
      await asignarTareaADia({
        anio: semana.anio,
        semana_iso: semana.semana_iso,
        tarea_id: tId,
        dia_semana: nuevoDia,
      });
      // No recargamos para no parpadear; el upsert ya está hecho.
    } catch (err) {
      setPlan(antes);
      setErrorMover(
        err instanceof Error ? err.message : "No se pudo mover la tarea",
      );
    }
  }

  async function quitar(t: Tarea) {
    const antes = plan ?? [];
    setPlan(antes.filter((a) => a.tarea_id !== t.id));
    try {
      await quitarTareaDeSemana({
        anio: semana.anio,
        semana_iso: semana.semana_iso,
        tarea_id: t.id,
      });
    } catch (err) {
      setPlan(antes);
      setErrorMover(
        err instanceof Error ? err.message : "No se pudo quitar la tarea",
      );
    }
  }

  async function asignarExistente(tareaId: string, dia: DiaSemana) {
    setAnadirParaDia(null);
    try {
      await asignarTareaADia({
        anio: semana.anio,
        semana_iso: semana.semana_iso,
        tarea_id: tareaId,
        dia_semana: dia,
      });
      await reloadPlan();
    } catch (err) {
      setErrorMover(
        err instanceof Error ? err.message : "No se pudo asignar la tarea",
      );
    }
  }

  async function generarPropuesta() {
    setPropuestaAbierta(true);
    setPropuestaLoading(true);
    setPropuestaError(null);
    setPropuesta(null);
    setPropuestaResumen(null);

    try {
      // 1) Pool = críticas activas no asignadas aún a esta semana.
      const pool = (criticas ?? []).filter(
        (t) => !tareasAsignadasIds.has(t.id),
      );

      // 2) Huecos por día (3 - ya asignadas en días IA)
      const huecosPorDia = new Map<DiaSemana, number>();
      for (const d of DIAS_IA) {
        const ya = porDia.get(d)?.length ?? 0;
        huecosPorDia.set(d, Math.max(0, TAREAS_POR_DIA_IA - ya));
      }

      // 3) Construimos la propuesta: round-robin por día hasta llenar huecos,
      //    tomando del pool en orden de deadline ascendente.
      const sorted = pool.slice().sort((a, b) => {
        const da = a.deadline ?? "";
        const db = b.deadline ?? "";
        if (da && !db) return -1;
        if (!da && db) return 1;
        return da.localeCompare(db);
      });

      const prop: Partial<Record<DiaSemana, string[]>> = {};
      for (const d of DIAS_IA) prop[d] = [];

      // Llenado round-robin: lunes, martes, miércoles, viernes, lunes, …
      let i = 0;
      let quedan = sorted.length > 0;
      while (quedan) {
        const d = DIAS_IA[i % DIAS_IA.length];
        const huecos = huecosPorDia.get(d) ?? 0;
        const actual = prop[d]?.length ?? 0;
        if (actual < huecos && sorted.length > 0) {
          const t = sorted.shift()!;
          prop[d]!.push(t.id);
        }
        i++;
        // Paramos cuando todos los días están llenos o el pool está vacío.
        quedan = DIAS_IA.some((d) => (prop[d]?.length ?? 0) < (huecosPorDia.get(d) ?? 0)) && sorted.length > 0;
      }

      const total = Object.values(prop).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);

      // 4) Resumen humano (sin LLM por ahora — fácil y determinista).
      let resumen: string;
      if (total === 0) {
        resumen =
          pool.length === 0
            ? "No hay tareas críticas activas pendientes."
            : "Todas las críticas ya están asignadas a esta semana.";
      } else {
        const conDeadline = sorted
          .slice(0, total)
          .map((t) => t.deadline)
          .filter(Boolean);
        resumen = `He repartido ${total} tarea(s) crítica(s) en ${DIAS_IA.map(nombreDia).join(", ")} priorizando por deadline${conDeadline.length > 0 ? " (la más próxima: " + conDeadline[0] + ")" : ""}. Esta propuesta AÑADE a lo que ya hay; no pisa nada.`;
      }

      setPropuesta(prop);
      setPropuestaResumen(resumen);
    } catch (e) {
      setPropuestaError(e instanceof Error ? e.message : "Error generando la propuesta");
    } finally {
      setPropuestaLoading(false);
    }
  }

  function aplicarPropuesta() {
    if (!propuesta) return;
    startAplicandoTransition(async () => {
      try {
        await aplicarPropuestaIA({
          anio: semana.anio,
          semana_iso: semana.semana_iso,
          propuesta: propuesta as Record<number, string[]>,
        });
        await reloadPlan();
        setPropuestaAbierta(false);
        setErrorMover(null);
        setPropuesta(null);
      } catch (err) {
        setPropuestaError(
          err instanceof Error ? err.message : "No se pudo aplicar la propuesta",
        );
      }
    });
  }

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Semana</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {planLoading
              ? "Cargando…"
              : "Planifica tu semana arrastrando tareas entre días. Los días con fondo gris están protegidos por reglas fijas."}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setSemana((s) => shiftISOWeek(s.anio, s.semana_iso, -1))}
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
            aria-label="Semana anterior"
          >
            ←
          </button>
          <span className="px-2 py-1 text-sm font-medium">
            {formatISOWeek(semana.anio, semana.semana_iso)}
          </span>
          <button
            type="button"
            onClick={() => setSemana((s) => shiftISOWeek(s.anio, s.semana_iso, 1))}
            className="rounded-md px-2 py-1 text-sm hover:bg-accent"
            aria-label="Semana siguiente"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setSemana(getCurrentISOWeek())}
            className="ml-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
            title="Volver a la semana actual"
          >
            Hoy
          </button>
        </div>
      </header>

      {/* Errores */}
      {planError && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          Error al cargar la planificación: {planError}
        </p>
      )}
      {errorMover && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorMover}
        </p>
      )}

      {/* Pipeline */}
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setArrastrada(null)}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
          {DIAS_SEMANA.map((d) => (
            <ColumnaDia
              key={d.id}
              dia={d.id}
              tarjetas={porDia.get(d.id) ?? []}
              onEditar={setEditando}
              onQuitar={quitar}
              onAbrirAnadir={(dia) => setAnadirParaDia(dia)}
              bloqueada={esDiaBloqueado(d.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {arrastrada ? (
            <article className="w-64 rotate-2 cursor-grabbing rounded-lg border border-border bg-card p-2.5 shadow-xl">
              <p className="text-sm font-medium">{arrastrada.titulo}</p>
              {arrastrada.prioridad && (
                <span
                  className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                    TONO_PRIORIDAD[arrastrada.prioridad] ?? TONO_PRIORIDAD.media
                  }`}
                >
                  {arrastrada.prioridad}
                </span>
              )}
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Backlog */}
      <BacklogTareas
        candidatas={backlogCandidatas}
        semana={semana}
        onAsignar={asignarExistente}
      />

      {/* Botón IA */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-violet-500/10 p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Propuesta IA</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reparte las tareas críticas activas en lunes, martes, miércoles y
            viernes (3 por día). AÑADE a lo ya planificado; no pisa nada.
          </p>
        </div>
        <button
          type="button"
          onClick={generarPropuesta}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          <IconSparkles className="h-4 w-4" />
          ✨ Proponer semana con críticas
        </button>
      </div>

      {/* Modal "+ Añadir" (se monta en cuanto hay un día seleccionado) */}
      <ModalAnadir
        abierto={anadirParaDia !== null}
        dia={anadirParaDia}
        semana={semana}
        candidatos={tareasNoAsignadas}
        onAsignarExistente={asignarExistente}
        onCrearNueva={() => {
          const d = anadirParaDia;
          setAnadirParaDia(null);
          if (d !== null) setCreandoParaDia(d);
        }}
        onCerrar={() => setAnadirParaDia(null)}
      />

      {/* Modal de IA */}
      <ModalIdea
        abierto={propuestaAbierta}
        onClose={() => setPropuestaAbierta(false)}
        propuesta={propuesta}
        tareasById={tareasById}
        resumen={propuestaResumen}
        loading={propuestaLoading}
        error={propuestaError}
        onAplicar={aplicarPropuesta}
        aplicando={aplicandoPropuesta}
      />

      {/* Modal editar */}
      {editando && (
        <EditarModal
          tarea={editando}
          onClose={() => setEditando(null)}
          onChanged={recargarTodo}
        />
      )}

      {/* Modal crear (cuando se pulsa "+ Crear nueva" en una columna) */}
      {creandoParaDia !== null && (
        <CrearModal
          onClose={() => setCreandoParaDia(null)}
          onChanged={recargarTodo}
          onCreated={async (tareaId) => {
            await asignarTareaADia({
              anio: semana.anio,
              semana_iso: semana.semana_iso,
              tarea_id: tareaId,
              dia_semana: creandoParaDia,
            });
            await reloadPlan();
          }}
        />
      )}
    </div>
  );
}