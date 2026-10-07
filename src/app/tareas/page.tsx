"use client";

import { useMemo, useState } from "react";
import { fetchAdjuntosCount, fetchTareas } from "@/lib/queries";
import { marcarTareaWig } from "@/lib/mutations";
import { useData } from "@/lib/useData";
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

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtra, edita, archiva o elimina. {loading ? "…" : tareas.length} tareas en total.
            </p>
          </div>
          <HelpDrawer title="Tareas" items={AYUDA_POR_RUTA["/tareas"]?.items ?? []} />
        </div>
      </header>

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
    </div>
  );
}
