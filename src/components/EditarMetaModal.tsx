"use client";

// ============================================================================
// EditarMetaModal — edición rápida de una meta desde la tarjeta en /metas.
// Es el "atajo" para no tener que entrar a /metas/detalle cuando solo quieres
// cambiar título, descripción, ámbito, tags, estado, prioridad o plazo.
//
// Lo que NO edita este modal (por diseño):
//   · codigo: lo gestiona el ETL/seed; cambiarlo a mano es fuente de errores.
//   · es_wig / wig_orden: se gestiona con la diana 🎯 en la propia tarjeta.
//   · RICE: se calcula en otro flujo (motor de priorización).
//   · resultados_periodo / trimestres: eso vive en /metas/detalle.
//
// Si necesitas editar algo fuera del alcance de este modal, el pie del
// diálogo tiene un enlace a /metas/detalle.
// ============================================================================

import { useState, useTransition } from "react";
import Link from "next/link";
import { actualizarMeta } from "@/lib/mutations";
import { fetchAreas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { AmbitoMeta, Area, Meta, Prioridad } from "@/lib/types";
import { IconPencil, IconX } from "@/components/icons";

const ESTADOS = [
  "sin_empezar",
  "en_progreso",
  "bloqueada",
  "completada",
  "archivada",
] as const;

const PRIORIDADES: Prioridad[] = ["critica", "alta", "media", "baja"];

const AMBITOS: Array<{ id: AmbitoMeta | ""; label: string }> = [
  { id: "", label: "— Sin clasificar —" },
  { id: "personal", label: "👤 Personal" },
  { id: "profesional", label: "💼 Profesional" },
];

export function EditarMetaModal({
  meta,
  onClose,
  onChanged,
}: {
  meta: Meta;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: areas } = useData<Area[]>(fetchAreas, []);

  const [titulo, setTitulo] = useState(meta.titulo);
  const [descripcion, setDescripcion] = useState(meta.descripcion ?? "");
  const [estado, setEstado] = useState<Meta["estado"]>(meta.estado);
  const [prioridad, setPrioridad] = useState<Prioridad | "">(
    meta.prioridad ?? "",
  );
  const [areaId, setAreaId] = useState<string>(meta.area_id ?? "");
  const [plazo, setPlazo] = useState(meta.plazo ?? "");
  const [ambito, setAmbito] = useState<AmbitoMeta | "">(meta.ambito ?? "");
  const [tagsInput, setTagsInput] = useState<string>((meta.tags ?? []).join(", "));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const tagsLimpios = tagsInput
          .split(",")
          .map((s) => s.trim().replace(/^#/, "").toLowerCase())
          .filter((s) => s.length > 0);
        await actualizarMeta(meta.id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          estado,
          prioridad: prioridad || null,
          area_id: areaId || null,
          plazo: plazo.trim() || null,
          ambito: ambito || null,
          tags: tagsLimpios,
        });
        onChanged();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  const field =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const fieldTextarea =
    "w-full rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconPencil className="h-4 w-4" />
            Editar meta
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {/* Código (solo lectura): el modal NO lo edita */}
          {meta.codigo && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">Código:</span>{" "}
              <span className="font-mono">{meta.codigo}</span>
              <span className="ml-2">(gestionado por el ETL; no editable)</span>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Título *</span>
            <input
              autoFocus
              className={field}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Descripción</span>
            <textarea
              rows={3}
              className={fieldTextarea}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
              <select
                className={field}
                value={estado}
                onChange={(e) => setEstado(e.target.value as Meta["estado"])}
              >
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Prioridad</span>
              <select
                className={field}
                value={prioridad}
                onChange={(e) =>
                  setPrioridad(e.target.value as Prioridad | "")
                }
              >
                <option value="">—</option>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Área</span>
              <select
                className={field}
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
              >
                <option value="">— Sin área —</option>
                {(areas ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Plazo</span>
              <input
                className={field}
                value={plazo}
                onChange={(e) => setPlazo(e.target.value)}
                placeholder="p.ej. 2026-Q3"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Ámbito</span>
              <select
                className={field}
                value={ambito}
                onChange={(e) => setAmbito(e.target.value as AmbitoMeta | "")}
              >
                {AMBITOS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Tags (separadas por coma)
              </span>
              <input
                className={field}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="salud, familia, app…"
              />
            </label>
          </div>

          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            💡 Para editar los resultados por trimestre o los key results,
            ve a{" "}
            <Link
              href={`/metas/detalle?id=${meta.id}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              /metas/detalle
            </Link>
            .
          </p>
        </div>

        {error && (
          <p className="mx-5 mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}