"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tarea, Subtarea } from "@/lib/types";
import {
  actualizarTarea,
  archivarTarea,
  crearTarea,
  desarchivarTarea,
  desgranarTarea,
  eliminarTarea,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  IconArchive,
  IconCheck,
  IconPencil,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@/components/icons";
import { useConfig } from "@/lib/configStore";
import { createClient } from "@/lib/supabase/client";

const PRIORIDADES = ["critica", "urgente", "alta", "media", "baja"];
const ESTADOS = ["pendiente", "en_progreso", "bloqueada", "hecha", "archivada"];
const CAPAS = ["CAPA 1", "CAPA 2", "CAPA 3"];

const TONO_PRIORIDAD: Record<string, string> = {
  critica: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  urgente:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  alta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  media: "bg-muted text-muted-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
};

const TONO_ESTADO: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  en_progreso:
    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  hecha:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {children}
    </span>
  );
}

const inputCls =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function TasksTable({
  tareas,
  onChanged,
}: {
  tareas: Tarea[];
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("activas");
  const [prioridad, setPrioridad] = useState("todas");
  const [capa, setCapa] = useState("todas");
  const [editando, setEditando] = useState<Tarea | null>(null);
  const [creando, setCreando] = useState(false);

  const filtradas = useMemo(() => {
    return tareas.filter((t) => {
      if (estado === "activas" && !["pendiente", "en_progreso", "bloqueada"].includes(t.estado))
        return false;
      if (estado !== "activas" && estado !== "todas" && t.estado !== estado)
        return false;
      if (prioridad !== "todas" && t.prioridad !== prioridad) return false;
      if (capa !== "todas" && t.capa !== capa) return false;
      if (q) {
        const s = `${t.titulo} ${t.codigo ?? ""} ${t.descripcion ?? ""}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [tareas, estado, prioridad, capa, q]);

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      onChanged();
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tarea…"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={inputCls}>
          <option value="activas">Activas</option>
          <option value="todas">Todas</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace("_", " ")}
            </option>
          ))}
        </select>
        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputCls}>
          <option value="todas">Prioridad</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={capa} onChange={(e) => setCapa(e.target.value)} className={inputCls}>
          <option value="todas">Capa</option>
          {CAPAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtradas.length} / {tareas.length}
        </span>
        <button
          onClick={() => setCreando(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Nueva tarea
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-3 font-medium">Tarea</th>
              <th className="px-3 py-3 font-medium">Prioridad</th>
              <th className="px-3 py-3 font-medium">Capa</th>
              <th className="px-3 py-3 font-medium">Deadline</th>
              <th className="px-3 py-3 font-medium">Pts</th>
              <th className="px-3 py-3 font-medium">Estado</th>
              <th className="px-3 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/60 last:border-0 hover:bg-accent/40"
              >
                <td className="max-w-[380px] px-3 py-3">
                  <div className="flex items-start gap-2">
                    {t.estado === "hecha" ? (
                      <span className="mt-0.5 text-emerald-500">
                        <IconCheck className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div className="min-w-0">
                      <div className={t.estado === "hecha" ? "line-through opacity-60" : ""}>
                        {t.titulo}
                      </div>
                      {t.codigo && (
                        <div className="text-xs text-muted-foreground">{t.codigo}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {t.prioridad ? (
                    <Badge tone={TONO_PRIORIDAD[t.prioridad] ?? TONO_PRIORIDAD.media}>
                      {t.prioridad.toUpperCase()}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{t.capa ?? "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{t.deadline ?? "—"}</td>
                <td className="px-3 py-3 text-muted-foreground">{t.pts ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge tone={TONO_ESTADO[t.estado] ?? TONO_ESTADO.pendiente}>
                    {t.estado.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {t.estado === "hecha" ? (
                      <button
                        title="Reabrir"
                        onClick={() => run(() => reabrirTarea(t.id))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        title="Marcar como hecha"
                        onClick={() => run(() => marcarHecha(t.id))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-emerald-500"
                      >
                        <IconCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      title="Editar"
                      onClick={() => setEditando(t)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    {t.estado === "archivada" ? (
                      <button
                        title="Desarchivar"
                        onClick={() => run(() => desarchivarTarea(t.id))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <IconArchive className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        title="Archivar"
                        onClick={() => run(() => archivarTarea(t.id))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <IconArchive className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      title="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar "${t.titulo}"? No se puede deshacer.`))
                          run(() => eliminarTarea(t.id));
                      }}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  No hay tareas que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pending && <p className="text-xs text-muted-foreground">Guardando…</p>}

      {editando && (
        <EditarModal
          tarea={editando}
          onClose={() => setEditando(null)}
          onChanged={onChanged}
        />
      )}
      {creando && (
        <CrearModal onClose={() => setCreando(false)} onChanged={onChanged} />
      )}
    </div>
  );
}

function EditarModal({
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
  }>({
    titulo: tarea.titulo,
    descripcion: tarea.descripcion ?? "",
    prioridad: tarea.prioridad ?? "media",
    estado: tarea.estado,
    deadline: tarea.deadline ?? "",
    capa: tarea.capa ?? "",
    pts: tarea.pts != null ? String(tarea.pts) : "",
    esfuerzo: tarea.esfuerzo ?? "",
  });
  const [subtareas, setSubtareas] = useState<Subtarea[]>(
    Array.isArray(tarea.subtareas) ? tarea.subtareas : [],
  );
  const [desgranando, setDesgranando] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function desgranar() {
    setIaError(null);
    setDesgranando(true);
    try {
      const nuevas = await desgranarTarea(tarea.id, cfg);
      setSubtareas(nuevas);
      // No cerramos el modal: el usuario revisará y guardará (o no)
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

  function guardar() {
    startTransition(async () => {
      // 1) Guarda los campos del formulario
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
      });
      // 2) Guarda las subtareas (pueden venir de la IA o editadas a mano)
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
      await createClient().from("tareas").update({ subtareas: limpias.length > 0 ? limpias : null }).eq("id", tarea.id);
      onChanged();
      onClose();
    });
  }

  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-lg">
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
          <div className="grid grid-cols-2 gap-3">
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

          {/* Subtareas (desglose al máximo) */}
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

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
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

function CrearModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media",
    estado: "pendiente",
    deadline: "",
    capa: "",
    pts: "",
    esfuerzo: "",
  });
  const [pending, startTransition] = useTransition();

  function guardar() {
    if (!form.titulo.trim()) return;
    startTransition(async () => {
      await crearTarea({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion || null,
        prioridad: form.prioridad,
        estado: form.estado,
        deadline: form.deadline || null,
        capa: form.capa || null,
        pts: form.pts ? Number(form.pts) : null,
        esfuerzo: form.esfuerzo || null,
      });
      onChanged();
      onClose();
    });
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-lg">
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
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={pending || !form.titulo.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear tarea"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Editor de subtareas (desglose al máximo)
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
