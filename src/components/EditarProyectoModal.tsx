"use client";

import { useState } from "react";
import { actualizarProyecto } from "@/lib/mutations";
import { IconX } from "@/components/icons";
import type { Area, Proyecto } from "@/lib/types";

/**
 * Modal para editar un proyecto existente (nombre, color, descripción,
 * área). Reutiliza el mismo patrón de campos que el formulario de creación
 * en /proyectos — son los mismos datos editables.
 */
export function EditarProyectoModal({
  proyecto,
  areas,
  onClose,
  onSaved,
}: {
  proyecto: Proyecto;
  areas: Area[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(proyecto.nombre ?? "");
  const [color, setColor] = useState(proyecto.color ?? "#64748b");
  const [areaId, setAreaId] = useState<string>(proyecto.area_id ?? "");
  const [desc, setDesc] = useState(proyecto.descripcion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function guardar() {
    if (!nombre.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErr(null);
    try {
      await actualizarProyecto(proyecto.id, {
        nombre: nombre.trim(),
        color,
        descripcion: desc.trim() || null,
        area_id: areaId || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar proyecto ${proyecto.nombre}`}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Editar proyecto</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,120px]">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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
          <div className="space-y-1 sm:col-span-2">
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
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {err && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={guardando}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}