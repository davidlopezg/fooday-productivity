"use client";

import { useMemo, useState } from "react";
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
import { fetchMetas, fetchTareas } from "@/lib/queries";
import { actualizarTarea } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { EstadoTarea, Meta, Prioridad, Tarea } from "@/lib/types";
import { useConfig } from "@/lib/configStore";
import { IconBolt, IconSparkles } from "@/components/icons";
import {
  generarPriorizacion,
  type PriorizacionInmediata,
} from "@/lib/motorPriorizacion";

type ColId = Prioridad | "sin_prioridad";

const COLUMNAS: { id: ColId; label: string; acento: string }[] = [
  { id: "critica", label: "Crítica", acento: "border-t-red-500" },
  { id: "urgente", label: "Urgente", acento: "border-t-orange-500" },
  { id: "alta", label: "Alta", acento: "border-t-amber-500" },
  { id: "media", label: "Media", acento: "border-t-sky-500" },
  { id: "baja", label: "Baja", acento: "border-t-border" },
  { id: "sin_prioridad", label: "Sin prioridad", acento: "border-t-border" },
];

const ACTIVAS: EstadoTarea[] = ["pendiente", "en_progreso", "bloqueada"];

const TONO_ESTADO: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  en_progreso:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  hecha:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const prioridadDe = (t: Tarea): ColId => t.prioridad ?? "sin_prioridad";

/** Solo el contenido de la tarjeta: se reutiliza en el DragOverlay. */
function TarjetaContenido({ t }: { t: Tarea }) {
  return (
    <>
      <p
        className={`text-sm font-medium leading-snug ${
          t.estado === "hecha" ? "line-through opacity-60" : ""
        }`}
      >
        {t.titulo}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            TONO_ESTADO[t.estado] ?? TONO_ESTADO.pendiente
          }`}
        >
          {t.estado.replace("_", " ")}
        </span>
        {t.deadline && (
          <span className="text-[11px] text-muted-foreground">
            📅 {t.deadline}
          </span>
        )}
        {t.pts != null && (
          <span className="text-[11px] text-muted-foreground">{t.pts} pts</span>
        )}
        {t.capa && (
          <span className="text-[11px] text-muted-foreground">{t.capa}</span>
        )}
      </div>
    </>
  );
}

function Tarjeta({ t }: { t: Tarea }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: t.id,
  });
  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // touch-manipulation: evita el zoom por doble toque sin bloquear el
      // scroll vertical. El TouchSensor usa delay 200ms, así que desplazar
      // con el dedo sigue haciendo scroll en vez de arrastrar la tarjeta.
      className={`cursor-grab touch-manipulation select-none rounded-lg border border-border bg-card p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:shadow-md"
      }`}
    >
      <TarjetaContenido t={t} />
    </article>
  );
}

function Columna({
  id,
  label,
  acento,
  n,
  children,
}: {
  id: ColId;
  label: string;
  acento: string;
  n: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`flex max-h-[70dvh] w-[80vw] shrink-0 snap-start flex-col rounded-xl border border-t-4 bg-muted/20 ${acento} ${
        isOver ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""
      } sm:w-72 md:w-auto md:min-w-0 md:flex-1`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
          {n}
        </span>
      </header>
      <div className="min-h-[80px] flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {children}
      </div>
    </section>
  );
}

export default function PipelinePage() {
  const {
    data: tareas,
    loading,
    error,
    reload,
    setData,
  } = useData<Tarea[]>(fetchTareas, []);
  const metasQ = useData<Meta[]>(fetchMetas, []);
  const cfg = useConfig();
  const [verTodas, setVerTodas] = useState(false);
  const [arrastrada, setArrastrada] = useState<Tarea | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorMover, setErrorMover] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const [prioridadIA, setPrioridadIA] = useState<PriorizacionInmediata | null>(
    null,
  );

  // MouseSensor = ratón en escritorio. TouchSensor con delay = en móvil hay
  // que MANTENER pulsado para arrastrar; si deslizas antes, hace scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  const visibles = useMemo(
    () =>
      verTodas ? tareas : tareas.filter((t) => ACTIVAS.includes(t.estado)),
    [tareas, verTodas],
  );

  const porColumna = useMemo(() => {
    const m = new Map<ColId, Tarea[]>();
    for (const c of COLUMNAS) m.set(c.id, []);
    for (const t of visibles) m.get(prioridadDe(t))?.push(t);
    return m;
  }, [visibles]);

  function onDragStart(e: DragStartEvent) {
    setErrorMover(null);
    setArrastrada(tareas.find((t) => t.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setArrastrada(null);
    const destino = e.over?.id as ColId | undefined;
    const t = tareas.find((x) => x.id === e.active.id);
    if (!t || !destino || prioridadDe(t) === destino) return;

    const nueva = destino === "sin_prioridad" ? null : destino;
    const antes = tareas;
    // Optimista: la tarjeta cambia de columna al instante, sin esperar a la red.
    setData((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, prioridad: nueva } : x)),
    );
    setGuardando(true);
    try {
      await actualizarTarea({ id: t.id, prioridad: nueva });
    } catch (err) {
      setData(antes); // rollback si Supabase dice que no
      setErrorMover(
        err instanceof Error ? err.message : "No se pudo mover la tarea",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function analizarConIA() {
    if (analizando) return null;
    if (!cfg.data.minimax_api_key) {
      setErrorIA(
        "Configura primero tu API key. Ve a /configuracion para añadirla.",
      );
      return null;
    }
    setAnalizando(true);
    setErrorIA(null);
    try {
      const tareasActivas = tareas.filter((t) =>
        ACTIVAS.includes(t.estado),
      );
      if (tareasActivas.length === 0) {
        setErrorIA(
          "No hay tareas activas para analizar. Añade o reabre alguna tarea primero.",
        );
        return null;
      }
      const ahora = new Date();
      const fecha = ahora.toISOString().slice(0, 10);
      const horaLocal = ahora.toTimeString().slice(0, 5);
      const diaSemana = ahora.toLocaleDateString("es-ES", {
        weekday: "long",
      });
      const resultado = await generarPriorizacion(
        {
          baseUrl: cfg.data.base_url,
          apiKey: cfg.data.minimax_api_key,
          model: cfg.data.model,
        },
        {
          tareas: tareasActivas,
          metas: metasQ.data,
          fecha,
          horaLocal,
          diaSemana,
        },
      );
      setPrioridadIA(resultado);
      return resultado;
    } catch (e) {
      setErrorIA(e instanceof Error ? e.message : "Error desconocido.");
      return null;
    } finally {
      setAnalizando(false);
    }
  }

  async function empezarTareaSugerida() {
    if (!prioridadIA?.tarea_id_sugerida) return;
    const t = tareas.find((x) => x.id === prioridadIA.tarea_id_sugerida);
    if (!t) return;
    const antes = tareas;
    // Optimista
    setData((prev) =>
      prev.map((x) =>
        x.id === t.id ? { ...x, estado: "en_progreso" } : x,
      ),
    );
    try {
      await actualizarTarea({ id: t.id, estado: "en_progreso" });
    } catch (err) {
      setData(antes);
      setErrorMover(
        err instanceof Error
          ? err.message
          : "No se pudo marcar la tarea como 'en progreso'",
      );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Cargando…"
              : "Arrastra una tarjeta a otra columna para cambiar su prioridad." +
                (guardando ? " Guardando…" : "")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={verTodas}
              onChange={(e) => setVerTodas(e.target.checked)}
              className="h-4 w-4"
            />
            Ver hechas y archivadas
          </label>
          <button
            onClick={reload}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            Recargar
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          Error al cargar tareas: {error}
        </p>
      )}
      {errorMover && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorMover}
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setArrastrada(null)}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
          {COLUMNAS.map((c) => (
            <Columna
              key={c.id}
              id={c.id}
              label={c.label}
              acento={c.acento}
              n={porColumna.get(c.id)?.length ?? 0}
            >
              {porColumna.get(c.id)?.map((t) => (
                <Tarjeta key={t.id} t={t} />
              ))}
            </Columna>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {arrastrada ? (
            <article className="w-64 rotate-2 cursor-grabbing rounded-lg border border-border bg-card p-3 shadow-xl">
              <TarjetaContenido t={arrastrada} />
            </article>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* =========================================================================
              IA — Motor de Priorización Ejecutable
          Aparece debajo del tablero. Un solo botón → un único resultado
          accionable (tarea + motivo + tiempo + primer paso).
          ========================================================================= */}
      <section
        aria-label="Motor de priorización con IA"
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <IconSparkles className="h-4 w-4 text-primary" aria-hidden />
              Motor de priorización — IA
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Analiza todas tus tareas activas y tus metas y devuelve UNA sola
              acción concreta para hacer en menos de 45 minutos.
            </p>
          </div>
          <button
            type="button"
            onClick={analizarConIA}
            disabled={analizando || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50"
          >
            <IconBolt className="h-4 w-4" aria-hidden />
            {analizando
              ? "Analizando…"
              : prioridadIA
                  ? "Regenerar análisis"
                  : "¿Qué hago ahora?"}
          </button>
        </div>

        {!cfg.data.minimax_api_key && !cfg.loading && (
          <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            Aún no has configurado tu API key.{" "}
            <a href="/configuracion" className="underline underline-offset-4">
              Ir a Configuración
            </a>
            .
          </div>
        )}

        {errorIA && (
          <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {errorIA}
          </p>
        )}

        {prioridadIA && (
          <div className="mt-5 space-y-4 rounded-lg border border-border bg-background/50 p-4">
            {/* Tarea inmediata — la pieza más visible */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tarea inmediata
              </p>
              <p className="mt-1 text-xl font-semibold leading-snug tracking-tight">
                {prioridadIA.tarea_inmediata}
              </p>
              {prioridadIA.tarea_id_sugerida && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={empezarTareaSugerida}
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent"
                  >
                    Marcar “{prioridadIA.tarea_titulo_match}” como en progreso
                  </button>
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Motivo */}
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Motivo de selección
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  {prioridadIA.motivo}
                </p>
              </div>
              {/* Tiempo + micro-paso */}
              <div className="space-y-3">
                <div className="rounded-md border border-border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tiempo asignado
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    ⏱ {prioridadIA.tiempo_min} min (máx 45)
                  </p>
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Primer micro-paso (primer minuto)
                  </p>
                  <p className="mt-1 text-sm font-medium leading-relaxed">
                    {prioridadIA.primer_paso}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
