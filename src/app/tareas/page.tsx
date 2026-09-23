"use client";

import { fetchTareas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { TasksTable } from "@/components/TasksTable";
import type { Tarea } from "@/lib/types";

export default function TareasPage() {
  const { data, loading, reload } = useData<Tarea[]>(fetchTareas, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtra, edita, archiva o elimina. {loading ? "…" : data.length} tareas en total.
        </p>
      </header>
      <TasksTable tareas={data} onChanged={reload} />
    </div>
  );
}
