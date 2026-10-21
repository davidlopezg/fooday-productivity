"use client";

import { useMemo, useState } from "react";
import {
  fetchAdjuntosCount,
  fetchMetasConProgreso,
  fetchProyectos,
  fetchTareas,
} from "@/lib/queries";
import { crearTarea, marcarTareaWig } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import {
  sugerirProximasAccionesIA,
  type SugerenciaTarea,
} from "@/lib/iaSugerencias";
import { TasksTable } from "@/components/TasksTable";
import { PanelWigTareas } from "@/components/PanelWigTareas";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import type { Tarea } from "@/lib/types";

export default function TareasPage() {
  const { data: tareas, loading, error, reload } = useData<Tarea[]>(fetchTareas, []);

  // Estado del panel WIG — separado del de TasksTable a propósito:
  // ambos llaman a la misma RPC, y `reload()` tras cada toggle sincroniza
  // los dos. Así no toco la API interna de TasksTable.
  const [guardandoWigId, setGuardandoWigId] = useState<string | null>(null);
  const [errorWig, setErrorWig] = useState<string | null>(null);

  // Tareas marcadas como WIG (4DX), ordenadas por wig_orden (1, 2, 3).
  const wigTareas = useMemo(
    () =>
      tareas
        .filter((t) => t.es_wig)
        .sort((a, b) => (a.wig_orden ?? 9) - (b.wig_orden ?? 9)),
    [tareas],
  );

  async function quitarWig(id: string) {
    setErrorWig(null);
    setGuardandoWigId(id);
    try {
      const ok = await marcarTareaWig(id, false);
      if (!ok) {
        // No debería pasar al quitar (no aplica el límite de 3), pero por
        // si acaso: si la RPC devuelve false, mostramos genérico.
        setErrorWig("No se pudo quitar el WIG de la tarea.");
      } else {
        await reload();
      }
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoWigId(null);
    }
  }

  // Carga un mapa de adjuntos (id -> count) para mostrar "📎 N" en la tabla.
  const ids = useMemo(() => tareas.map((t) => t.id), [tareas]);
  const { data: adjuntosCount, error: adjError } = useData<Map<string, number>>(
    () => fetchAdjuntosCount(ids),
    new Map(),
    [ids],
  );

  // ------------------------------------------------------------------------
  // Sugerir 3 siguientes acciones con IA
  // ------------------------------------------------------------------------
  async function pedirSugerenciasIA() {
    if (!cfg.data.minimax_api_key) {
      setErrorSugIA("Configura la clave de IA en /configuracion primero.");
      setSugerenciasIA([]);
      return;
    }
    setSugiriendoIA(true);
    setErrorSugIA(null);
    setSugerenciasIA(null);
    try {
      // Tareas NO completadas: ni hechas ni archivadas. Esto incluye el
      // inbox + las tareas con meta asignada. La IA decide qué importa
      // mirando los argumentos (meta/KR/prioridad/deadline/ámbito/tags).
      const abiertas = tareas.filter(
        (t) => t.estado !== "hecha" && t.estado !== "archivada",
      );
      if (abiertas.length === 0) {
        setErrorSugIA(
          "No tienes tareas abiertas. Crea o reabre alguna antes de pedirle sugerencias.",
        );
        setSugerenciasIA([]);
        setSugiriendoIA(false);
        return;
      }

      // Mapas auxiliares que cruzan tarea → meta → KR. La IA recibe texto
      // plano (no UUIDs) para que pueda razonar sin inventarse IDs.
      const metaById = new Map((metasQ.data ?? []).map((m) => [m.meta.id, m]));

      // Construimos los items para la IA: una línea por tarea con los
      // argumentos relevantes. `dias_abierta` se calcula desde
      // `created_at` (fallback 0 si no viene).
      const ahora = Date.now();
      const tareasParaInput = abiertas.map((t) => {
        const mp = t.meta_id ? metaById.get(t.meta_id) : undefined;
        const kr = mp?.resultados.find((r) => r.id === t.resultado_periodo_id);
        const createdAt = t.created_at ? new Date(t.created_at).getTime() : ahora;
        const diasAbierta = Math.max(0, Math.floor((ahora - createdAt) / 86_400_000));
        return {
          id: t.id,
          titulo: t.titulo,
          meta_codigo: mp?.meta.codigo ?? null,
          meta_titulo: mp?.meta.titulo ?? null,
          kr_titulo: kr?.titulo ?? null,
          prioridad: t.prioridad ?? null,
          deadline: t.deadline ?? null,
          ambito: t.ambito ?? null,
          tags: t.tags ?? [],
          es_wig: !!t.es_wig,
          dias_abierta: diasAbierta,
        };
      });

      const wigsActuales = wigTareas
        .map((t) => t.meta_id)
        .filter((id): id is string => !!id)
        .map((metaId) => {
          const mp = metaById.get(metaId);
          return {
            meta_id: metaId,
            meta_titulo: mp?.meta.titulo ?? "(sin título)",
          };
        });

      const proyectosActivos = (proyectosQ.data ?? []).filter(
        (p) => !p.archivado,
      );

      const res = await sugerirProximasAccionesIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        {
          tareasAbiertas: tareasParaInput,
          wigs: wigsActuales,
          proyectos: proyectosActivos.map((p) => ({ id: p.id, nombre: p.nombre })),
          n: 3,
        },
      );
      setSugerenciasIA(res.sugerencias);
    } catch (e) {
      setErrorSugIA(
        e instanceof Error
          ? e.message
          : "La IA no pudo sugerir siguientes acciones.",
      );
      setSugerenciasIA([]);
    } finally {
      setSugiriendoIA(false);
    }
  }

  async function aplicarSugerenciasIA(seleccionadas: SugerenciaEditada[]) {
    if (seleccionadas.length === 0) {
      setSugerenciasIA(null);
      return;
    }
    setAplicandoSugIA(true);
    setErrorSugIA(null);
    let creadas = 0;
    const fallidas: string[] = [];
    for (const s of seleccionadas) {
      try {
        await crearTarea({
          titulo: s.titulo.trim(),
          descripcion: s.descripcion.trim() || null,
          prioridad: s.prioridad ?? "media",
        });
        creadas++;
      } catch (e) {
        fallidas.push(s.titulo);
        console.error("[Tareas] fallo creando tarea IA:", s.titulo, e);
      }
    }
    setAplicandoSugIA(false);
    if (creadas > 0) {
      if (fallidas.length === 0) {
        setSugerenciasIA(null);
        await reload();
      } else {
        setErrorSugIA(
          `Se crearon ${creadas}, pero fallaron: ${fallidas.join(", ")}.`,
        );
        await reload();
      }
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-medium">Error al cargar tareas</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={reload}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const abiertasCount = tareas.filter(
    (t) => t.estado !== "hecha" && t.estado !== "archivada",
  ).length;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtra, edita, archiva o elimina. {loading ? "…" : tareas.length} tareas en total
              {abiertasCount > 0 && !loading && ` (${abiertasCount} abiertas)`}.
            </p>
          </div>
          <HelpDrawer title="Tareas" items={AYUDA_POR_RUTA["/tareas"]?.items ?? []} />
        </div>
      </header>

      {dedupeAbierto && (
        <DedupeModal
          tareas={tareas}
          onClose={() => setDedupeAbierto(false)}
          onChanged={reload}
        />
      )}

      {/* Panel WIG — siempre arriba, antes de la tabla. Mismo patrón que
          el PanelWig de /metas: lista las 1-3 tareas foco del ciclo. */}
      <PanelWigTareas
        wigs={wigTareas}
        onQuitar={quitarWig}
        guardandoId={guardandoWigId}
      />

      {errorWig && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorWig}
        </p>
      )}

      {adjError && (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          No se pudieron cargar los adjuntos: {adjError}
        </p>
      )}
      <TasksTable
        tareas={tareas}
        adjuntosCount={adjuntosCount ?? new Map()}
        onChanged={reload}
      />

      {sugerenciasIA !== null && (
        <SugerenciasTareasModal
          titulo="3 siguientes acciones con IA"
          subtitulo={`Mira toda tu lista abierta (${abiertasCount} tareas no completadas) y propone qué hacer mañana.`}
          sugerencias={sugerenciasIA}
          busy={aplicandoSugIA}
          error={errorSugIA}
          textoBotonConfirmar={
            `Crear ${sugerenciasIA.length} tarea${sugerenciasIA.length === 1 ? "" : "s"}`
          }
          onCancel={() => {
            setSugerenciasIA(null);
            setErrorSugIA(null);
          }}
          onConfirmar={aplicarSugerenciasIA}
        />
      )}
    </div>
  );
}