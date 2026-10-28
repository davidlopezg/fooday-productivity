"use client";

// ============================================================================// /matriz — vista 2D Eisenhower de las tareas activas.
// ----------------------------------------------------------------------------
// Página complementaria a /pipeline (que es 1D = Kanban por prioridad).
// Aquí cada tarea está en un cuadrante calculado a partir de:
//   · Urgencia  ← fecha_fin / deadline (objetiva)
//   · Importancia ← WIG-tarea / WIG-meta / meta activa / huérfana
//
// Features:
//   · Toggle IA "✨ Sugerir redistribución" — modal de revisión (estilo
//     SugerirWigs / SugerirPagos) que aplica cambios de `prioridad` en
//     batch derivado del cuadrante sugerido.
//   · Drag & drop entre cuadrantes (dnd-kit/core, ya instalado). Cada
//     drop actualiza la `prioridad` de la tarea al valor del cuadrante
//     destino, vía `aplicarPrioridadesTareas`.
//   · Filtros: solo WIGs-meta / solo con fecha.
//
// NO usa nueva columna — `prioridad` se reasigna al soltar/ aplicar, y la
// clasificación se recalcula en cada render desde `fecha_fin + meta.es_wig`.
// ============================================================================

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { MatrizEisenhower } from "@/components/tareas/MatrizEisenhower";
import { SugerirMatrizModal } from "@/components/tareas/SugerirMatrizModal";
import { IconSparkles } from "@/components/icons";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import { fetchMetas, fetchTareas } from "@/lib/queries";
import { aplicarPrioridadesTareas } from "@/lib/mutations";
import {
  CUADRANTES,
  clasificarMatriz,
  comparadorMatriz,
  cuadranteAPrioridad,
  type ClasificacionMatriz,
  type Cuadrante,
} from "@/lib/tareas/matriz";
import {
  sugerirMatrizIA,
  type SugerirMatrizResultado,
} from "@/lib/tareas/sugerirMatrizIA";
import type { Meta, Prioridad, Tarea } from "@/lib/types";
import { errorMessage } from "@/lib/errors";
import { localYMD } from "@/lib/semana";

function diaSemanaES(d: Date): string {
  const nombres = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  return nombres[d.getDay()];
}

const TODOS_CUADRANTES: Cuadrante[] = ["Q1", "Q2", "Q3", "Q4"];

export default function MatrizPage() {
  const { data: cfg } = useConfig();
  // Cargamos TODAS las tareas (sin filtro de estado) — la UI las filtra
  // a activas localmente. Más simple que manejar varios fetches.
  const { data: tareas, loading, error, reload } = useData<Tarea[]>(
    () => fetchTareas(),
    [],
  );
  const { data: metas } = useData<Meta[]>(() => fetchMetas(), []);

  // Filtros de la cabecera
  const [soloWigsMeta, setSoloWigsMeta] = useState(false);
  const [soloConFecha, setSoloConFecha] = useState(false);

  // Modal IA
  const [modalIA, setModalIA] = useState(false);
  const [sugBusy, setSugBusy] = useState(false);
  const [sugError, setSugError] = useState<string | null>(null);
  const [sugResultado, setSugResultado] = useState<SugerirMatrizResultado | null>(null);
  const [sugApplyingId, setSugApplyingId] = useState<string | null>(null);
  const [sugAppliedOk, setSugAppliedOk] = useState<string | null>(null);
  const [sugAppliedFail, setSugAppliedFail] = useState<string[]>([]);
  // Tras el apply, marcamos estas tareas como "recién movidas" durante
  // 3 segundos para que se vea el puntito violeta "desalineado" antes
  // de que la UI se estabilice.
  const [recienMovidas, setRecienMovidas] = useState<Set<string>>(new Set());

  // Mapas memoizados
  const metaById = useMemo<Map<string, Meta | undefined>>(
    () => new Map((metas ?? []).map((m) => [m.id, m])),
    [metas],
  );

  const metaByTareaId = useMemo(() => {
    const m = new Map<
      string,
      { meta: Meta | undefined; titulo: string | null; codigo: string | null }
    >();
    for (const t of tareas ?? []) {
      const meta = t.meta_id ? metaById.get(t.meta_id) : undefined;
      m.set(t.id, {
        meta,
        titulo: meta?.titulo ?? null,
        codigo: meta?.codigo ?? null,
      });
    }
    return m;
  }, [tareas, metaById]);

  // 1) Filtrar
  const tareasActivas = useMemo(() => {
    const estadosActivos = new Set(["pendiente", "en_progreso", "bloqueada"]);
    return (tareas ?? []).filter((t) => {
      if (!estadosActivos.has(t.estado)) return false;
      if (soloWigsMeta) {
        const meta = t.meta_id ? metaById.get(t.meta_id) : undefined;
        if (!(t.es_wig || meta?.es_wig)) return false;
      }
      if (soloConFecha) {
        if (!t.fecha_fin && !t.deadline) return false;
      }
      return true;
    });
  }, [tareas, soloWigsMeta, soloConFecha, metaById]);

  // 2) Clasificar
  const clasifByTareaId = useMemo(() => {
    const m = new Map<string, ClasificacionMatriz>();
    for (const t of tareasActivas) {
      m.set(t.id, clasificarMatriz(t, t.meta_id ? metaById.get(t.meta_id) : undefined));
    }
    return m;
  }, [tareasActivas, metaById]);

  // 3) Bucketing
  const bucketed = useMemo<Record<Cuadrante, Tarea[]>>(() => {
    const cmp = comparadorMatriz(metaById);
    const out: Record<Cuadrante, Tarea[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const t of tareasActivas) {
      const c = clasifByTareaId.get(t.id)?.cuadrante ?? "Q4";
      out[c].push(t);
    }
    for (const c of TODOS_CUADRANTES) out[c].sort(cmp);
    return out;
  }, [tareasActivas, clasifByTareaId, metaById]);

  const total = tareasActivas.length;

  // -------- dnd-kit sensors --------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  );

  const onDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const overId = over.id as Cuadrante;
      if (!TODOS_CUADRANTES.includes(overId)) return;
      const data = active.data.current as { tipo?: string; origenCuadrante?: Cuadrante } | undefined;
      if (data?.tipo !== "tarea") return;
      const tareaId = String(active.id);
      const origen = data.origenCuadrante;
      if (!origen || origen === overId) return;
      const tarea = (tareas ?? []).find((t) => t.id === tareaId);
      if (!tarea) return;
      const nuevaPrioridad = cuadranteAPrioridad(overId);
      // Optimistic UI: marcamos como recién movida y refrescamos al final.
      setRecienMovidas((prev) => new Set(prev).add(tareaId));
      const res = await aplicarPrioridadesTareas([
        { tareaId, prioridad: nuevaPrioridad },
      ]);
      if (res.aplicadas > 0) {
        setRecienMovidas((prev) => {
          const next = new Set(prev);
          // Lo mantenemos marcado 3s para que se vea el cambio.
          setTimeout(() => {
            setRecienMovidas((cur) => {
              const n2 = new Set(cur);
              n2.delete(tareaId);
              return n2;
            });
          }, 3000);
          return next;
        });
        await reload();
      } else if (res.fallidas[0]) {
        console.error("[matriz] drag falló:", res.fallidas[0].error);
        setRecienMovidas((prev) => {
          const next = new Set(prev);
          next.delete(tareaId);
          return next;
        });
      }
    },
    [tareas, reload],
  );

  // -------- Modal IA handlers --------
  function abrirModalIA() {
    setSugResultado(null);
    setSugError(null);
    setSugAppliedOk(null);
    setSugAppliedFail([]);
    setRecienMovidas(new Set());
    setModalIA(true);
    void generarSugerencias();
  }

  async function generarSugerencias() {
    if (!cfg?.minimax_api_key) {
      setSugError(
        "No hay API key de MiniMax configurada. Ve a /configuracion para añadir una.",
      );
      return;
    }
    setSugBusy(true);
    setSugError(null);
    setSugResultado(null);
    try {
      const hoy = new Date();
      const tareasParaIA = tareasActivas.map((t) => {
        const meta = t.meta_id ? metaById.get(t.meta_id) : undefined;
        return {
          id: t.id,
          titulo: t.titulo,
          metaCodigo: meta?.codigo ?? null,
          metaTitulo: meta?.titulo ?? null,
          clasificacion: clasifByTareaId.get(t.id)!,
          diasHastaVencer: clasifByTareaId.get(t.id)?.diasHastaVencer ?? null,
          prioridadActual: t.prioridad ?? "—",
          esWigTarea: !!t.es_wig,
          tags: t.tags ?? [],
        };
      });
      const res = await sugerirMatrizIA(
        cfg.base_url,
        cfg.minimax_api_key,
        cfg.model,
        {
          tareas: tareasParaIA,
          fecha: localYMD(hoy),
          diaSemana: diaSemanaES(hoy),
          // Migration 0032: perfil desde `configuracion`.
          perfil: cfg,
        },
      );
      setSugResultado(res);
    } catch (e) {
      setSugError(errorMessage(e));
    } finally {
      setSugBusy(false);
    }
  }

  async function aplicarUna(
    tareaId: string,
    prioridad: Prioridad,
  ): Promise<boolean> {
    setSugApplyingId(tareaId);
    setSugAppliedOk(null);
    try {
      const r = await aplicarPrioridadesTareas([{ tareaId, prioridad }]);
      if (r.aplicadas === 1) {
        setSugAppliedOk("Prioridad actualizada.");
        setSugAppliedFail((prev) => prev.filter((x) => x !== tareaId));
        setRecienMovidas((prev) => new Set(prev).add(tareaId));
        setTimeout(() => {
          setRecienMovidas((prev) => {
            const n = new Set(prev);
            n.delete(tareaId);
            return n;
          });
        }, 3000);
        await reload();
        return true;
      }
      setSugError(r.fallidas[0]?.error ?? "No se pudo aplicar.");
      setSugAppliedFail((prev) =>
        prev.includes(tareaId) ? prev : [...prev, tareaId],
      );
      return false;
    } catch (e) {
      setSugError(errorMessage(e));
      setSugAppliedFail((prev) =>
        prev.includes(tareaId) ? prev : [...prev, tareaId],
      );
      return false;
    } finally {
      setSugApplyingId(null);
    }
  }

  async function aplicarTodas(
    items: Array<{ tareaId: string; prioridad: Prioridad }>,
  ) {
    setSugBusy(true);
    setSugError(null);
    setSugAppliedOk(null);
    setSugAppliedFail([]);
    try {
      const r = await aplicarPrioridadesTareas(items);
      const ok = r.aplicadas;
      const fail = r.fallidas;
      setSugAppliedOk(
        fail.length === 0
          ? `${ok} ${ok === 1 ? "prioridad actualizada" : "prioridades actualizadas"}.`
          : `${ok} aplicadas, ${fail.length} fallaron (revisa la conexión o RLS).`,
      );
      setSugAppliedFail(fail.map((f) => f.tareaId));
      // Marcamos todas las aplicadas como recién movidas (3s)
      const movidos = new Set(items.map((i) => i.tareaId));
      setRecienMovidas(movidos);
      setTimeout(() => {
        setRecienMovidas(new Set());
      }, 3000);
      await reload();
    } catch (e) {
      setSugError(errorMessage(e));
    } finally {
      setSugBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            🧭 Matriz Eisenhower
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Distribución 2D de tus tareas activas.{" "}
            <strong className="text-foreground">Urgencia</strong> ×{" "}
            <strong className="text-foreground">Importancia</strong>. Arrastra
            tarjetas entre cuadrantes o usa la IA para que te sugiera la
            redistribución.
          </p>
        </div>
        <HelpDrawer
          title="Matriz Eisenhower"
          items={AYUDA_POR_RUTA["/matriz"]?.items ?? []}
        />
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={soloWigsMeta}
              onChange={(e) => setSoloWigsMeta(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            <span>Solo WIGs-meta</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={soloConFecha}
              onChange={(e) => setSoloConFecha(e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            <span>Solo con fecha</span>
          </label>
          <span className="text-[11px] text-muted-foreground">
            {total} {total === 1 ? "tarea activa" : "tareas activas"}
          </span>
        </div>
        <button
          type="button"
          onClick={abrirModalIA}
          disabled={sugBusy || total === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          title="La IA revisa cada tarea activa y propone redistribuirla al cuadrante correcto"
        >
          <IconSparkles className="h-4 w-4" />
          {sugBusy ? "Pensando…" : "Sugerir redistribución"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="font-medium text-red-600 dark:text-red-400">
            Error al cargar tareas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={reload}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && (
        loading && tareas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Cargando tareas…
          </p>
        ) : total === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay tareas activas que mostrar en la matriz.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Marca como pendientes, en progreso o bloqueadas para que aparezcan aquí.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <MatrizEisenhower
              bucketed={bucketed}
              metaByTareaId={metaByTareaId}
              clasifByTareaId={clasifByTareaId}
              recienMovidas={recienMovidas}
            />
          </DndContext>
        )
      )}

      <footer className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          💡 La prioridad de la app se reasigna al soltar o aplicar la IA:
          Q1 → <code className="rounded bg-background px-1 py-0.5">critica</code>,
          Q2 → <code className="rounded bg-background px-1 py-0.5">alta</code>,
          Q3 → <code className="rounded bg-background px-1 py-0.5">media</code>,
          Q4 → <code className="rounded bg-background px-1 py-0.5">baja</code>.
          Si la prioridad manual no coincide con el cuadrante calculado,
          verás un puntito violeta junto al título de la tarea.
        </p>
      </footer>

      {modalIA && (
        <SugerirMatrizModal
          key={sugResultado?.sugerencias.length ?? 0}
          resultado={sugResultado}
          tareas={tareasActivas}
          busy={sugBusy}
          error={sugError}
          applyingId={sugApplyingId}
          appliedOk={sugAppliedOk}
          appliedFail={sugAppliedFail}
          onCancel={() => setModalIA(false)}
          onAplicarUna={aplicarUna}
          onAplicarTodas={aplicarTodas}
        />
      )}
    </div>
  );
}