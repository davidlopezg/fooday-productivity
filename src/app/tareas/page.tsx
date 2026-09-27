"use client";

import { useMemo } from "react";
import { fetchAdjuntosCount, fetchTareas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { TasksTable } from "@/components/TasksTable";
import type { Tarea } from "@/lib/types";

export default function TareasPage() {
  const { data: tareas, loading, error, reload } = useData<Tarea[]>(fetchTareas, []);

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
        <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtra, edita, archiva o elimina. {loading ? "…" : tareas.length} tareas en total.
        </p>
      </header>
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
