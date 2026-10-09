"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAreas, fetchProyectosConConteo, fetchTareas } from "@/lib/queries";
import {
  archivarProyecto,
  crearProyecto,
  eliminarProyecto,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { Area, Proyecto, Tarea } from "@/lib/types";
import { IconArchive, IconTrash, IconX } from "@/components/icons";

type ProyectoConConteo = Proyecto & {
  total_tareas: number;
  tareas_hechas: number;
};

export default function ProyectosPage() {
  const { data, loading, error, reload } = useData<ProyectoConConteo[]>(
    fetchProyectosConConteo,
    [],
  );
  // Tareas para mostrar conteo rápido por proyecto (lo alternativo es
  // un join en el backend, pero ya tenemos esto: hacemos una sola query
  // adicional a /tareas y agrupamos en cliente. Mantenemos la página
  // liviana sin tocar la RPC de proyectos).
  const { data: tareas } = useData<Tarea[]>(() => fetchTareas(), []);
  const { data: areas } = useData<Area[]>(fetchAreas, []);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#64748b");
  const [areaId, setAreaId] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState<string | null>(null);

  async function crear() {
    if (!nombre.trim()) {
      setErrForm("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErrForm(null);
    try {
      await crearProyecto({ nombre, color, descripcion: desc || null, area_id: areaId || null });
      setNombre("");
      setDesc("");
      setColor("#64748b");
      setAreaId("");
      setMostrarForm(false);
      await reload();
    } catch (e) {
      setErrForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="font-medium text-red-600 dark:text-red-400">Error al cargar proyectos</p>
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

  const tareasPorProyecto = new Map<string, Tarea[]>();
  for (const t of tareas) {
    if (t.proyecto_id) {
      const arr = tareasPorProyecto.get(t.proyecto_id) ?? [];
      arr.push(t);
      tareasPorProyecto.set(t.proyecto_id, arr);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupa tareas por proyecto. {loading ? "…" : data.length} proyectos.
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {mostrarForm ? <IconX className="h-4 w-4" /> : <span className="text-base leading-none">+</span>}
          {mostrarForm ? "Cancelar" : "Nuevo proyecto"}
        </button>
      </header>

      {mostrarForm && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nuevo proyecto
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="p.ej. Q4 fooday-launch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-1 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Área</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Sin área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <label className="text-xs font-medium">Descripción (opcional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {errForm && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errForm}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={crear}
              disabled={guardando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Crear"}
            </button>
          </div>
        </section>
      )}

      {data.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Aún no tienes proyectos. Crea el primero con el botón de arriba.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((p) => {
            const tareasDelProyecto = tareasPorProyecto.get(p.id) ?? [];
            const activas = tareasDelProyecto.filter(
              (t) => t.estado !== "hecha" && t.estado !== "archivada",
            );
            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: p.color ?? "#64748b" }}
                        aria-hidden
                      />
                      <h3 className="truncate font-semibold tracking-tight">
                        {p.nombre}
                      </h3>
                      {p.archivado && (
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          archivado
                        </span>
                      )}
                    </div>
                    {p.descripcion && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.descripcion}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {activas.length} activas · {p.tareas_hechas} hechas
                      </span>
                      {p.total_tareas > 0 && (
                        <span className="text-muted-foreground/60">
                          ({p.total_tareas} total)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/tareas?proyecto=${p.id}`}
                      className="rounded-md p-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Ver tareas del proyecto"
                    >
                      ver
                    </Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Archivar "${p.nombre}"?`)) return;
                        await archivarProyecto(p.id, !p.archivado);
                        await reload();
                      }}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title={p.archivado ? "Desarchivar" : "Archivar"}
                    >
                      <IconArchive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            `¿Eliminar "${p.nombre}"? Las tareas NO se borrarán, solo se desvinculan del proyecto.`,
                          )
                        )
                          return;
                        await eliminarProyecto(p.id);
                        await reload();
                      }}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-red-500"
                      title="Eliminar proyecto"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
