"use client";

import { useMemo } from "react";
import { fetchAdjuntosCount, fetchTareas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { TasksTable } from "@/components/TasksTable";
import type { Tarea } from "@/lib/types";

export default function TareasPage() {
  const { data: tareas, loading, reload } = useData<Tarea[]>(fetchTareas, []);

  // Carga un mapa de adjuntos (id -> count) para mostrar "📎 N" en la tabla.
  const ids = useMemo(() => tareas.map((t) => t.id), [tareas]);
  const { data: adjuntosCount } = useData<Map<string, number>>(
    () => fetchAdjuntosCount(ids),
    new Map(),
    [ids],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtra, edita, archiva o elimina. {loading ? "…" : tareas.length} tareas en total.
        </p>
      </header>
      <TasksTable
        tareas={tareas}
        adjuntosCount={adjuntosCount ?? new Map()}
        onChanged={reload}
      />
    </div>
  );
}
