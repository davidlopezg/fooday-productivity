"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tarea } from "@/lib/types";
import {
  actualizarTarea,
  archivarTarea,
  crearTarea,
  desarchivarTarea,
  eliminarTarea,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  IconArchive,
  IconCheck,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";

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
  const [pending, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
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
      onChanged();
      onClose();
    });
  }

  const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Editar tarea</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
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
        </div>

        <div className="mt-5 flex justify-end gap-2">
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
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Nueva tarea</h2>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
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

        <div className="mt-5 flex justify-end gap-2">
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
