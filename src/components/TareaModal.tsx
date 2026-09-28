"use client";

// ============================================================================
// Modales reutilizables de TAREA (Crear + Editar) + sus sub-editores.
// Originalmente vivían dentro de TasksTable.tsx; se extraen aquí para que
// también los pueda abrir la página /semana (planificación semanal).
//
// API expuesta:
//   <EditarModal tarea={t} onClose={...} onChanged={...} />
//   <CrearModal  onClose={...} onChanged={...} />
// ============================================================================

import { useEffect, useRef, useState, useTransition } from "react";
import {
  IconDownload,
  IconFile,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/icons";
import {
  actualizarTarea,
  crearTareaConIA,
  desgranarTarea,
  eliminarAdjunto,
  MAX_ADJUNTO_BYTES,
  reemplazarSubtareasTarea,
  signedUrlAdjunto,
  subirAdjuntos,
} from "@/lib/mutations";
import { fetchAdjuntosTarea } from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { generarCriterioTerminacionIA } from "@/lib/plan";
import type { Subtarea, Tarea, TareaAdjunto } from "@/lib/types";

export type PendingFile = { file: File; status: "pendiente" };

const PRIORIDADES = ["critica", "urgente", "alta", "media", "baja"];
const ESTADOS = ["pendiente", "en_progreso", "bloqueada", "hecha", "archivada"];

// ============================================================================
// Editor de subtareas (desglose al máximo) — usado por EditarModal
// ============================================================================
function SubtareasEditor({
  subtareas,
  onChange,
  desgranando,
  iaError,
  onDesgranar,
  onLimpiar,
  onMover,
  tieneKey,
}: {
  subtareas: Subtarea[];
  onChange: (next: Subtarea[]) => void;
  desgranando: boolean;
  iaError: string | null;
  onDesgranar: () => void;
  onLimpiar: () => void;
  onMover: (idx: number, dir: -1 | 1) => void;
  tieneKey: boolean;
}) {
  function actualizar(idx: number, patch: Partial<Subtarea>) {
    onChange(subtareas.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function eliminar(idx: number) {
    onChange(subtareas.filter((_, i) => i !== idx));
  }
  function anadir() {
    onChange([
      ...subtareas,
      { descripcion: "", tiempo_estimado_min: 5, hecho: false },
    ]);
  }

  const hechas = subtareas.filter((s) => s.hecho).length;
  const total = subtareas.length;
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subtareas (desglose)
            </span>
            {total > 0 && (
              <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {hechas}/{total} · {pct}%
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Micro-pasos accionables (≤5 min, primera persona, imperativo).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {total > 0 && (
            <button
              type="button"
              onClick={onLimpiar}
              className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent"
              title="Vaciar la lista"
            >
              Limpiar
            </button>
          )}
          <button
            type="button"
            onClick={onDesgranar}
            disabled={desgranando}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
            title={tieneKey ? "Descomponer la tarea en micro-pazos con IA" : "Configura primero la API key"}
          >
            <IconSparkles className="h-3.5 w-3.5" />
            {desgranando ? "Desgranando…" : total > 0 ? "Regenerar" : "Desgranar al máximo posible"}
          </button>
        </div>
      </div>

      {!tieneKey && (
        <p className="mb-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          No hay API key de MiniMax configurada. Ve a{" "}
          <a href="/configuracion" className="underline">
            Configuración
          </a>{" "}
          para añadir una. Puedes seguir editando las subtareas a mano.
        </p>
      )}
      {iaError && (
        <p className="mb-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          {iaError}
        </p>
      )}

      {total > 0 && (
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <ul className="space-y-1.5">
        {subtareas.map((s, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5"
          >
            <input
              type="checkbox"
              checked={!!s.hecho}
              onChange={(e) => actualizar(idx, { hecho: e.target.checked })}
              className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
              aria-label="Marcar como hecha"
            />
            <input
              type="text"
              value={s.descripcion}
              onChange={(e) => actualizar(idx, { descripcion: e.target.value })}
              placeholder="Micro-paso (verbo + objeto concreto)…"
              className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-input focus:bg-background ${
                s.hecho ? "text-muted-foreground line-through" : ""
              }`}
            />
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={s.tiempo_estimado_min ?? ""}
                onChange={(e) =>
                  actualizar(idx, {
                    tiempo_estimado_min:
                      e.target.value === "" ? null : Math.max(1, Math.min(5, Number(e.target.value))),
                  })
                }
                className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center text-xs outline-none focus:ring-1 focus:ring-ring"
                title="Minutos estimados (1–5)"
                aria-label="Minutos estimados"
              />
              <span className="text-[10px] text-muted-foreground">min</span>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => onMover(idx, -1)}
                  disabled={idx === 0}
                  className="rounded px-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30"
                  title="Subir"
                  aria-label="Subir"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onMover(idx, 1)}
                  disabled={idx === subtareas.length - 1}
                  className="rounded px-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30"
                  title="Bajar"
                  aria-label="Bajar"
                >
                  ▼
                </button>
              </div>
              <button
                type="button"
                onClick={() => eliminar(idx)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar"
                aria-label="Eliminar"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={anadir}
        className="mt-2 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
      >
        + Añadir subtarea a mano
      </button>
    </section>
  );
}

// ============================================================================
// Editor "lite" de subtareas — usado por CrearModal.
// Sin botón de IA (la IA se ejecuta automáticamente al guardar si está vacío).
// ============================================================================
function SubtareasEditorLite({
  subtareas,
  onChange,
}: {
  subtareas: Subtarea[];
  onChange: (next: Subtarea[]) => void;
}) {
  function actualizar(idx: number, patch: Partial<Subtarea>) {
    onChange(subtareas.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function eliminar(idx: number) {
    onChange(subtareas.filter((_, i) => i !== idx));
  }
  function anadir() {
    onChange([...subtareas, { descripcion: "", tiempo_estimado_min: 5, hecho: false }]);
  }
  return (
    <div>
      {subtareas.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Aún no hay subtareas. Si guardas así, la IA las generará automáticamente.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {subtareas.map((s, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5"
            >
              <input
                type="text"
                value={s.descripcion}
                onChange={(e) => actualizar(idx, { descripcion: e.target.value })}
                placeholder="Micro-paso (verbo + objeto concreto)…"
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm outline-none focus:border-input focus:bg-background"
              />
              <input
                type="number"
                min={1}
                max={5}
                step={1}
                value={s.tiempo_estimado_min ?? ""}
                onChange={(e) =>
                  actualizar(idx, {
                    tiempo_estimado_min:
                      e.target.value === "" ? null : Math.max(1, Math.min(5, Number(e.target.value))),
                  })
                }
                className="w-12 rounded border border-input bg-background px-1 py-0.5 text-center text-xs outline-none focus:ring-1 focus:ring-ring"
                title="Minutos estimados (1–5)"
                aria-label="Minutos estimados"
              />
              <span className="text-[10px] text-muted-foreground">min</span>
              <button
                type="button"
                onClick={() => eliminar(idx)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar"
                aria-label="Eliminar"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={anadir}
        className="mt-2 w-full rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
      >
        + Añadir subtarea a mano
      </button>
    </div>
  );
}

// ============================================================================
// Editor de criterio de terminación — "Esta tarea está HECHA cuando..."
// ============================================================================
function CriterioTerminacionEditor({
  value,
  onChange,
  titulo,
  descripcion,
  cfg,
  tieneKey,
}: {
  value: string;
  onChange: (next: string) => void;
  titulo: string;
  descripcion: string;
  cfg: { base_url: string; minimax_api_key: string | null; model: string };
  tieneKey: boolean;
}) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    if (!titulo.trim()) {
      setError("Escribe primero un título para la tarea.");
      return;
    }
    setError(null);
    setGenerando(true);
    try {
      const { criterio_terminacion } = await generarCriterioTerminacionIA(
        cfg.base_url,
        cfg.minimax_api_key ?? "",
        cfg.model,
        {
          titulo,
          descripcion: descripcion || null,
          notas: null,
          criterioPrevio: value || null,
        },
      );
      if (criterio_terminacion) {
        onChange(criterio_terminacion);
      } else {
        setError(
          "La IA devolvió null. Probablemente el título describe un PROYECTO grande — pártelo en trozos pequeños antes de guardar.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerando(false);
    }
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            🎯 Criterio de terminación
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Regla que ataca el «se me quedan a medias». Si no puedes escribirla, es un proyecto, no una tarea — pártelo.
          </p>
        </div>
        <button
          type="button"
          onClick={generar}
          disabled={generando || !tieneKey}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          title={tieneKey ? "Generar la frase con IA" : "Configura primero la API key"}
        >
          <IconSparkles className="h-3.5 w-3.5" />
          {generando ? "Generando…" : value ? "Regenerar" : "Generar con IA"}
        </button>
      </div>

      {!tieneKey && (
        <p className="mb-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          No hay API key de MiniMax configurada. Ve a{" "}
          <a href="/configuracion" className="underline">
            Configuración
          </a>{" "}
          para añadir una. Puedes escribirla a mano igualmente.
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Esta tarea está HECHA cuando __________."
        className={field}
      />
      {value && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Pulsa <kbd className="rounded border border-border bg-background px-1">Regenerar</kbd> para que la IA proponga una mejora.
        </p>
      )}
    </section>
  );
}

// ============================================================================
// Editor de adjuntos — drag&drop + lista + descargar/borrar
// ============================================================================
function AdjuntosEditor({
  tareaId,
  cola,
  setCola,
  onUpload,
}: {
  /** null = aún no existe la tarea (estamos en CrearModal) */
  tareaId: string | null;
  /** Cola de archivos pendientes de subir (modo crear) */
  cola: PendingFile[];
  setCola?: (next: PendingFile[] | ((prev: PendingFile[]) => PendingFile[])) => void;
  /** Callback tras crear/borrar (modo editar) — para recargar */
  onUpload?: () => void;
}) {
  const [existentes, setExistentes] = useState<TareaAdjunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Carga inicial al tener tareaId
  useEffect(() => {
    if (!tareaId) return;
    let alive = true;
    fetchAdjuntosTarea(tareaId)
      .then((rows) => {
        if (alive) setExistentes(rows);
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tareaId]);

  function addFiles(files: FileList | File[]) {
    setError(null);
    const aceptados: PendingFile[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_ADJUNTO_BYTES) {
        setError(`"${f.name}" supera el límite de 10 MB.`);
        continue;
      }
      aceptados.push({ file: f, status: "pendiente" });
    }
    if (aceptados.length === 0) return;
    setCola?.((prev) => [...prev, ...aceptados]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);

    if (tareaId) {
      setError(null);
      setSubiendo(true);
      try {
        await subirAdjuntos(tareaId, fileArr, () => {});
        const rows = await fetchAdjuntosTarea(tareaId);
        setExistentes(rows);
        onUpload?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir adjuntos");
      } finally {
        setSubiendo(false);
      }
    } else {
      addFiles(fileArr);
    }
  }

  async function quitarCola(idx: number) {
    setCola?.((prev) => prev.filter((_, i) => i !== idx));
  }

  async function borrarExistente(adj: TareaAdjunto) {
    if (!confirm(`¿Borrar "${adj.filename}"?`)) return;
    setError(null);
    try {
      await eliminarAdjunto(adj);
      const rows = await fetchAdjuntosTarea(adj.tarea_id);
      setExistentes(rows);
      onUpload?.();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function descargar(adj: TareaAdjunto) {
    try {
      const url = await signedUrlAdjunto(adj, 3600);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const total = (tareaId ? existentes.length : 0) + cola.length;

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              📎 Adjuntos
            </span>
            {total > 0 && (
              <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {total}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Máx 10 MB por archivo. Se guardan en tu Storage privado.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {tareaId && loading && (
        <p className="text-[11px] text-muted-foreground">Cargando adjuntos…</p>
      )}
      {tareaId && !loading && existentes.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {existentes.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <IconFile className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate">
                <div className="truncate">{a.filename}</div>
                <div className="text-[10px] text-muted-foreground">
                  {a.mime ? `${a.mime} · ` : ""}
                  {a.size_bytes != null ? formatBytes(a.size_bytes) : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => descargar(a)}
                title="Descargar"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconDownload className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => borrarExistente(a)}
                title="Borrar"
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!tareaId && cola.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {cola.map((p, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <IconFile className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate">
                <div className="truncate">{p.file.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatBytes(p.file.size)} · se subirá al guardar
                </div>
              </div>
              <button
                type="button"
                onClick={() => quitarCola(idx)}
                title="Quitar de la cola"
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <IconX className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-4 text-center text-xs transition-colors ${
          dragOver
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground"
        }`}
      >
        <IconUpload className="mb-1 h-5 w-5 opacity-60" />
        <p>
          Arrastra archivos aquí o{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            elige desde tu dispositivo
          </button>
        </p>
        <p className="mt-0.5 text-[10px]">Uno o varios a la vez.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {subiendo && (
        <p className="mt-2 text-[11px] text-muted-foreground">⏳ Subiendo…</p>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================================================
// EditarModal — abre una tarea existente y guarda cambios.
// ============================================================================
export function EditarModal({
  tarea,
  onClose,
  onChanged,
}: {
  tarea: Tarea;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: cfg } = useConfig();
  const [form, setForm] = useState<{
    titulo: string;
    descripcion: string;
    prioridad: string;
    estado: string;
    deadline: string;
    capa: string;
    pts: string;
    esfuerzo: string;
    criterio_terminacion: string;
  }>({
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? "",
    prioridad: tarea.prioridad ?? "media",
    estado: tarea.estado,
    deadline: tarea.deadline ?? "",
    capa: tarea.capa ?? "",
    pts: tarea.pts != null ? String(tarea.pts) : "",
    esfuerzo: tarea.esfuerzo ?? "",
    criterio_terminacion: tarea.criterio_terminacion ?? "",
  });
  const [subtareas, setSubtareas] = useState<Subtarea[]>(
    Array.isArray(tarea.subtareas) ? (tarea.subtareas as unknown as Subtarea[]) : [],
  );
  const [desgranando, setDesgranando] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function desgranar() {
    setIaError(null);
    setDesgranando(true);
    try {
      const nuevas = await desgranarTarea(tarea.id, cfg);
      setSubtareas(nuevas as unknown as Subtarea[]);
    } catch (e) {
      setIaError((e as Error).message);
    } finally {
      setDesgranando(false);
    }
  }

  function limpiarSubtareas() {
    if (subtareas.length === 0) return;
    if (!confirm("¿Vaciar la lista de subtareas?")) return;
    setSubtareas([]);
  }

  function moverSubtarea(idx: number, dir: -1 | 1) {
    setSubtareas((arr) => {
      const next = arr.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  const [guardarError, setGuardarError] = useState<string | null>(null);

  function guardar() {
    setGuardarError(null);
    startTransition(async () => {
      try {
        await actualizarTarea({
          id: tarea.id,
          titulo: form.titulo,
          descripcion: form.descripcion || null,
          prioridad: form.prioridad,
          estado: form.estado,
          deadline: form.deadline || null,
          capa: form.capa || null,
          pts: form.pts ? Number(form.pts) : null,
          esfuerzo: form.esfuerzo || null,
          criterio_terminacion: form.criterio_terminacion.trim() || null,
        });
        const limpias = subtareas
          .map((s) => ({
            descripcion: s.descripcion.trim(),
            tiempo_estimado_min:
              s.tiempo_estimado_min && s.tiempo_estimado_min > 0
                ? Math.min(5, Math.round(s.tiempo_estimado_min))
                : null,
            hecho: !!s.hecho,
          }))
          .filter((s) => s.descripcion.length > 0);
        await reemplazarSubtareasTarea(tarea.id, limpias);
        onChanged();
        onClose();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e ?? "Error desconocido");
        console.error("[editarTarea] falló:", msg);
        setGuardarError(msg);
      }
    });
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Editar tarea</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Título</span>
            <input className={field} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Descripción</span>
            <textarea rows={3} className={field} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </label>

          <CriterioTerminacionEditor
            value={form.criterio_terminacion}
            onChange={(v) => setForm({ ...form, criterio_terminacion: v })}
            titulo={form.titulo}
            descripcion={form.descripcion}
            cfg={cfg}
            tieneKey={!!cfg.minimax_api_key}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Prioridad</span>
              <select className={field} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
              <select className={field} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e.replace("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Capa</span>
              <input className={field} value={form.capa} onChange={(e) => setForm({ ...form, capa: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Deadline</span>
              <input className={field} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Pts</span>
              <input type="number" step="0.5" className={field} value={form.pts} onChange={(e) => setForm({ ...form, pts: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Esfuerzo</span>
              <input className={field} value={form.esfuerzo} onChange={(e) => setForm({ ...form, esfuerzo: e.target.value })} />
            </label>
          </div>

          <AdjuntosEditor tareaId={tarea.id} cola={[]} setCola={() => {}} onUpload={() => {}} />

          <SubtareasEditor
            subtareas={subtareas}
            onChange={setSubtareas}
            desgranando={desgranando}
            iaError={iaError}
            onDesgranar={desgranar}
            onLimpiar={limpiarSubtareas}
            onMover={moverSubtarea}
            tieneKey={!!cfg.minimax_api_key}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-red-600 dark:text-red-400">{guardarError}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? (guardarError ? "Error — reintentar" : "Guardando…") : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CrearModal — formulario vacío que crea una tarea nueva (con IA opcional).
// Si se pasa `onCreated`, se llama con el id de la tarea recién creada
// después de subir los adjuntos (antes de cerrar). Útil para auto-asignar
// la tarea al día correspondiente cuando se abre desde la página /semana.
// ============================================================================
export function CrearModal({
  onClose,
  onChanged,
  onCreated,
}: {
  onClose: () => void;
  onChanged: () => void;
  onCreated?: (tareaId: string) => void | Promise<void>;
}) {
  const { data: cfg } = useConfig();
  const [form, setForm] = useState<{
    titulo: string;
    descripcion: string;
    prioridad: string;
    estado: string;
    deadline: string;
    capa: string;
    pts: string;
    esfuerzo: string;
    criterio_terminacion: string;
  }>({
    titulo: "",
    descripcion: "",
    prioridad: "media",
    estado: "pendiente",
    deadline: "",
    capa: "",
    pts: "",
    esfuerzo: "",
    criterio_terminacion: "",
  });
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
  const [subtareasAbierto, setSubtareasAbierto] = useState(false);
  const [adjuntosCola, setAdjuntosCola] = useState<PendingFile[]>([]);
  const [iaMsg, setIaMsg] = useState<string | null>(null);
  const [adjMsg, setAdjMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [guardarError, setGuardarError] = useState<string | null>(null);

  const quiereSubtareas = subtareas.filter((s) => s.descripcion.trim()).length === 0;
  const quiereCriterio = !form.criterio_terminacion.trim();
  const usaraIA = (quiereSubtareas || quiereCriterio) && !!cfg.minimax_api_key;
  const tieneAdjuntos = adjuntosCola.length > 0;

  function guardar() {
    if (!form.titulo.trim()) return;
    setIaMsg(null);
    setAdjMsg(null);
    setGuardarError(null);
    startTransition(async () => {
      try {
        const subtareasLimpias = subtareas
          .map((s) => ({
            descripcion: s.descripcion.trim(),
            tiempo_estimado_min:
              s.tiempo_estimado_min && s.tiempo_estimado_min > 0
                ? Math.min(5, Math.round(s.tiempo_estimado_min))
                : null,
            hecho: !!s.hecho,
          }))
          .filter((s) => s.descripcion.length > 0);

        const creada = await crearTareaConIA(
          {
            titulo: form.titulo.trim(),
            descripcion: form.descripcion || null,
            prioridad: form.prioridad,
            estado: form.estado,
            deadline: form.deadline || null,
            capa: form.capa || null,
            pts: form.pts ? Number(form.pts) : null,
            esfuerzo: form.esfuerzo || null,
            criterio_terminacion_manual: form.criterio_terminacion.trim() || null,
            subtareas_manuales:
              subtareasLimpias.length > 0 ? subtareasLimpias : null,
          },
          {
            base_url: cfg.base_url,
            minimax_api_key: cfg.minimax_api_key,
            model: cfg.model,
            onProgress: (m) => setIaMsg(m),
          },
        );

        if (tieneAdjuntos) {
          setAdjMsg(`⏳ Subiendo ${adjuntosCola.length} adjunto(s)…`);
          const files = adjuntosCola.map((p) => p.file);
          const subidos = await subirAdjuntos(creada.id, files, () => {});
          const fallaron = files.length - subidos.length;
          setAdjMsg(
            fallaron === 0
              ? `✓ ${subidos.length} adjunto(s) subido(s)`
              : `⚠️ ${subidos.length} subido(s), ${fallaron} fallaron`,
          );
        }

        // Hook para la página que abrió el modal (ej: auto-asignar al día).
        if (onCreated) {
          try {
            await onCreated(creada.id);
          } catch (e) {
            console.warn("[CrearModal] onCreated lanzó:", e);
          }
        }

        onChanged();
        onClose();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e ?? "Error desconocido");
        console.error("[crearTarea] falló:", msg);
        setGuardarError(msg);
      }
    });
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Nueva tarea</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Título *</span>
            <input
              autoFocus
              className={field}
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Descripción</span>
            <textarea
              rows={3}
              className={field}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </label>

          <CriterioTerminacionEditor
            value={form.criterio_terminacion}
            onChange={(v) => setForm({ ...form, criterio_terminacion: v })}
            titulo={form.titulo}
            descripcion={form.descripcion}
            cfg={cfg}
            tieneKey={!!cfg.minimax_api_key}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Prioridad</span>
              <select className={field} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                {PRIORIDADES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
              <select className={field} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{e.replace("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Capa</span>
              <input className={field} value={form.capa} onChange={(e) => setForm({ ...form, capa: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Deadline</span>
              <input className={field} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Pts</span>
              <input type="number" step="0.5" className={field} value={form.pts} onChange={(e) => setForm({ ...form, pts: e.target.value })} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Esfuerzo</span>
              <input className={field} value={form.esfuerzo} onChange={(e) => setForm({ ...form, esfuerzo: e.target.value })} />
            </label>
          </div>

          <section className="rounded-lg border border-border bg-muted/30 p-3">
            <button
              type="button"
              onClick={() => setSubtareasAbierto((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subtareas (desglose)
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {usaraIA
                    ? "🪄 Si lo dejas vacío, la IA las generará automáticamente al guardar."
                    : "Opcional. Puedes añadirlas a mano o dejarlo para la edición."}
                </p>
              </div>
              <span className="ml-2 text-xs text-muted-foreground">
                {subtareasAbierto ? "▾" : "▸"}
              </span>
            </button>
            {subtareasAbierto && (
              <div className="mt-2">
                <SubtareasEditorLite
                  subtareas={subtareas}
                  onChange={setSubtareas}
                />
              </div>
            )}
          </section>

          <AdjuntosEditor
            tareaId={null}
            cola={adjuntosCola}
            setCola={setAdjuntosCola}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-red-600 dark:text-red-400">
            {guardarError ?? adjMsg ?? iaMsg ?? (usaraIA ? "🪄 Se enriquecerá con IA al guardar." : "")}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={pending || !form.titulo.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? (guardarError ? "Error — reintentar" : "Creando…") : usaraIA || tieneAdjuntos ? "✨ Crear tarea" : "Crear tarea"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}