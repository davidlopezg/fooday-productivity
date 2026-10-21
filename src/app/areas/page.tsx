"use client";

import Link from "next/link";
import { useState } from "react";
import { useData } from "@/lib/useData";
import { fetchAreas, fetchProyectosConConteo } from "@/lib/queries";
import {
  crearArea,
  eliminarArea,
} from "@/lib/mutations";
import type { Area, Proyecto } from "@/lib/types";
import { IconFolder, IconPencil, IconPlus, IconTrash, IconX } from "@/components/icons";

type ProyectoConConteo = Proyecto & {
  total_tareas: number;
  tareas_hechas: number;
};

/**
 * Página de Áreas de responsabilidad.
 *
 * Una "área" representa un ámbito de la vida o del trabajo sobre el que
 * el usuario tiene un compromiso continuo (Salud, fooday, Finanzas,
 * Familia...). A diferencia de las metas, las áreas NO tienen fecha de
 * cierre: se mantienen activas indefinidamente y dentro de ellas viven
 * proyectos (con fecha de inicio/fin) y, por debajo, metas/KRs/tareas.
 *
 * Estructura visual copiada de /proyectos a propósito: el usuario reconoce
 * el patrón (lista de cards en grid 2-col + formulario de creación +
 * acciones archivar/eliminar). La diferencia es el color de acento y que
 * cada card de área muestra los proyectos hijos dentro.
 */
export default function AreasPage() {
  const { data: areas, loading, error, reload } = useData<Area[]>(
    fetchAreas,
    [],
  );
  // Proyectos con conteo de tareas — los agrupamos por area_id abajo.
  // Si un proyecto no tiene area_id (migration 0024: nullable), lo
  // mostramos en una sección aparte "Sin área" para que David no los pierda.
  const { data: proyectos } = useData<ProyectoConConteo[]>(
    fetchProyectosConConteo,
    [],
  );

  // Estado del formulario de creación
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#64748b");
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState<string | null>(null);

  // Edición inline del nombre
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editColor, setEditColor] = useState("#64748b");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  async function crear() {
    if (!nombre.trim()) {
      setErrForm("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErrForm(null);
    try {
      await crearArea({ nombre, color });
      setNombre("");
      setColor("#64748b");
      setMostrarForm(false);
      await reload();
    } catch (e) {
      setErrForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  function empezarEditar(a: Area) {
    setEditId(a.id);
    setEditNombre(a.nombre);
    setEditColor(a.color ?? "#64748b");
  }

  async function guardarEdit() {
    if (!editId) return;
    if (!editNombre.trim()) return;
    setGuardandoEdit(true);
    try {
      // Actualizamos el área con un update RLS vía supabase. Usamos el
      // cliente dinámico para no añadir más imports a este componente.
      const { createClient } = await import("@/lib/supabase/client");
      const { error } = await createClient()
        .from("areas")
        .update({ nombre: editNombre.trim(), color: editColor })
        .eq("id", editId);
      if (error) throw new Error(error.message);
      setEditId(null);
      await reload();
    } catch (e) {
      alert(`No se pudo guardar: ${(e as Error).message}`);
    } finally {
      setGuardandoEdit(false);
    }
  }

  async function eliminar(a: Area) {
    const hijos = (proyectos ?? []).filter((p) => p.area_id === a.id);
    let msg = `¿Eliminar el área "${a.nombre}"?`;
    if (hijos.length > 0) {
      msg += `\n\nEsta acción NO borra proyectos ni tareas. Los ${hijos.length} proyecto${hijos.length === 1 ? "" : "s"} pasarán a estar "Sin área" (quedan vivos en /proyectos, solo pierden la asociación).`;
    }
    if (!confirm(msg)) return;
    try {
      await eliminarArea(a.id);
      await reload();
    } catch (e) {
      alert(`No se pudo eliminar: ${(e as Error).message}`);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="font-medium text-red-600 dark:text-red-400">Error al cargar áreas</p>
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

  // Agrupar proyectos por area_id. Los huérfanos viven en `null` y los
  // mostramos en una sección aparte al final (el usuario los ve y puede
  // moverlos reasignando el area_id desde /proyectos).
  const proyectosPorArea = new Map<string, ProyectoConConteo[]>();
  const huerfanos: ProyectoConConteo[] = [];
  for (const p of proyectos ?? []) {
    if (p.area_id) {
      const arr = proyectosPorArea.get(p.area_id) ?? [];
      arr.push(p);
      proyectosPorArea.set(p.area_id, arr);
    } else {
      huerfanos.push(p);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Áreas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ámbitos de responsabilidad continuos (sin fecha de cierre). Cada
            área agrupa proyectos, que a su vez contienen metas, KRs y tareas.{" "}
            {loading ? "…" : `${areas.length} áreas.`}
          </p>
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {mostrarForm ? <IconX className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
          {mostrarForm ? "Cancelar" : "Nueva área"}
        </button>
      </header>

      {mostrarForm && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nueva área
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="p.ej. fooday, Salud, Familia, Finanzas"
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

      {areas.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Aún no tienes áreas. Crea la primera con el botón de arriba — cada
          área es un ámbito continuo (Salud, fooday, Familia…) bajo el que
          viven tus proyectos.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {areas.map((a) => {
            const hijos = proyectosPorArea.get(a.id) ?? [];
            return (
              <li
                key={a.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {editId === a.id ? (
                      <div className="space-y-2">
                        <input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-8 w-16 rounded-md border border-input bg-background px-1 outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button
                            onClick={guardarEdit}
                            disabled={guardandoEdit}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                          >
                            {guardandoEdit ? "Guardando…" : "Guardar"}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: a.color ?? "#64748b" }}
                          aria-hidden
                        />
                        <h3 className="truncate font-semibold tracking-tight">
                          {a.nombre}
                        </h3>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{hijos.length} proyecto{hijos.length === 1 ? "" : "s"}</span>
                    </div>
                    {hijos.length > 0 && (
                      <div className="mt-3 border-t border-border pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Proyectos ({hijos.length})
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {hijos.map((p) => {
                            const activas = p.total_tareas - p.tareas_hechas;
                            return (
                              <li key={p.id} className="flex items-center gap-2 text-xs">
                                <span
                                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-sm"
                                  style={{
                                    backgroundColor: p.color ?? "#64748b",
                                  }}
                                  aria-hidden
                                />
                                <Link
                                  href={`/proyectos`}
                                  className="min-w-0 flex-1 truncate text-foreground hover:underline"
                                  title={p.nombre}
                                >
                                  {p.nombre}
                                </Link>
                                <span className="shrink-0 text-muted-foreground/80">
                                  {activas > 0 ? `${activas} activas` : "vacío"}
                                </span>
                                {p.archivado && (
                                  <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    archivado
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  {editId !== a.id && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => empezarEditar(a)}
                        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Editar nombre y color"
                      >
                        <IconPencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(a)}
                        className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-red-500"
                        title="Eliminar área (los proyectos pasan a 'Sin área')"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {huerfanos.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ⚠️ {huerfanos.length} proyecto{huerfanos.length === 1 ? "" : "s"} sin área
          </h2>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
            Estos proyectos no tienen área asignada. Para moverlos a un área,
            edítalos desde{" "}
            <Link href="/proyectos" className="underline">
              /proyectos
            </Link>
            .
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {huerfanos.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-background px-2 py-1 text-xs"
              >
                <IconFolder className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                {p.nombre}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}