"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Subtarea, Tarea, TareaAdjunto } from "@/lib/types";
import {
  MAX_ADJUNTO_BYTES,
  actualizarTarea,
  archivarTarea,
  crearTareaConIA,
  desarchivarTarea,
  desgranarTarea,
  eliminarAdjunto,
  eliminarTarea,
  marcarHecha,
  reabrirTarea,
  signedUrlAdjunto,
  subirAdjuntos,
} from "@/lib/mutations";
import { fetchAdjuntosTarea } from "@/lib/queries";
import { generarCriterioTerminacionIA } from "@/lib/plan";
import {
  IconArchive,
  IconCheck,
  IconDownload,
  IconFile,
  IconPaperclip,
  IconPencil,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/icons";
import { useConfig } from "@/lib/configStore";
import { createClient } from "@/lib/supabase/client";

type PendingFile = { file: File; status: "pendiente" };

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
  adjuntosCount,
  onChanged,
}: {
  tareas: Tarea[];
  adjuntosCount?: Map<string, number>;
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.codigo && <span>{t.codigo}</span>}
                        {(() => {
                          const n = adjuntosCount?.get(t.id) ?? 0;
                          return n > 0 ? (
                            <button
                              type="button"
                              title={`${n} adjunto(s)`}
                              onClick={() => setEditando(t)}
                              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] hover:bg-accent hover:text-foreground"
                            >
                              <IconPaperclip className="h-3 w-3" />
                              {n}
                            </button>
                          ) : null;
                        })()}
                      </div>
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
        criterio_terminacion: form.criterio_terminacion.trim() || null,
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

          {/* Criterio de terminación — "Esta tarea está HECHA cuando..." */}
          <CriterioTerminacionEditor
            value={form.criterio_terminacion}
            onChange={(v) => setForm({ ...form, criterio_terminacion: v })}
            titulo={form.titulo}
            descripcion={form.descripcion}
            cfg={cfg}
            tieneKey={!!cfg.minimax_api_key}
          />
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

          {/* Adjuntos */}
          <AdjuntosEditor tareaId={tarea.id} cola={[]} setCola={() => {}} onUpload={() => {}} />

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
  const { data: cfg } = useConfig();
  const [form, setForm] = useState({
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

  /**
   * Auto-IA al guardar:
   *  - subtareas vacías  → IA las genera tras crear la tarea.
   *  - criterio_terminacion vacío → IA lo genera tras crear la tarea.
   * Solo si hay API key. Si falla, la tarea ya quedó guardada igualmente.
   *
   * Adjuntos en cola → se suben DESPUÉS de crear la tarea
   * (necesitamos el id de la tarea para construir el path del Storage).
   */
  const quiereSubtareas = subtareas.filter((s) => s.descripcion.trim()).length === 0;
  const quiereCriterio = !form.criterio_terminacion.trim();
  const usaraIA = (quiereSubtareas || quiereCriterio) && !!cfg.minimax_api_key;
  const tieneAdjuntos = adjuntosCola.length > 0;

  function guardar() {
    if (!form.titulo.trim()) return;
    setIaMsg(null);
    setAdjMsg(null);
    startTransition(async () => {
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

      // Paso 1: crear tarea (manual + IA en background si aplica).
      // crearTareaConIA se queda esperando a la IA cuando aplica.
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

      // Paso 2: subir los adjuntos pendientes con el id recién creado.
      if (tieneAdjuntos) {
        setAdjMsg(`⏳ Subiendo ${adjuntosCola.length} adjunto(s)…`);
        const files = adjuntosCola.map((p) => p.file);
        const subidos = await subirAdjuntos(creada.id, files, (_i, _f, estado, errMsg) => {
          if (estado === "error" && errMsg) {
            console.warn("[crearTarea] adjunto falló:", errMsg);
          }
        });
        const fallaron = files.length - subidos.length;
        setAdjMsg(
          fallaron === 0
            ? `✓ ${subidos.length} adjunto(s) subido(s)`
            : `⚠️ ${subidos.length} subido(s), ${fallaron} fallaron`,
        );
      }

      onChanged();
      onClose();
    });
  }

  const field =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-lg">
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

          {/* Criterio de terminación — "Esta tarea está HECHA cuando..." */}
          <CriterioTerminacionEditor
            value={form.criterio_terminacion}
            onChange={(v) => setForm({ ...form, criterio_terminacion: v })}
            titulo={form.titulo}
            descripcion={form.descripcion}
            cfg={cfg}
            tieneKey={!!cfg.minimax_api_key}
          />

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

          {/* Subtareas — plegado por defecto; se autocompleta con IA al guardar si está vacío */}
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

          {/* Adjuntos — cola local; se suben al guardar */}
          <AdjuntosEditor
            tareaId={null}
            cola={adjuntosCola}
            setCola={setAdjuntosCola}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <span className="text-[11px] text-muted-foreground">
            {adjMsg ?? iaMsg ?? (usaraIA ? "🪄 Se enriquecerá con IA al guardar." : "")}
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
              {pending ? "Creando…" : usaraIA || tieneAdjuntos ? "✨ Crear tarea" : "Crear tarea"}
            </button>
          </div>
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

// ============================================================================
// Editor "lite" de subtareas — para CrearModal.
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
// Modos:
//   - tareaId definido  → modo "editar": los archivos ya subidos se listan
//     desde Supabase y se pueden borrar.
//   - tareaId null      → modo "crear": los archivos se acumulan localmente
//     en `cola` y se subirán DESPUÉS de crear la fila en `tareas`.
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
  setCola?: (next: PendingFile[]) => void;
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
    setCola?.([...cola, ...aceptados]);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);

    if (tareaId) {
      // Modo editar: subo directamente, sin cola local
      setError(null);
      setSubiendo(true);
      const progreso = new Map<number, "subiendo" | "ok" | "error">();
      await subirAdjuntos(
        tareaId,
        fileArr,
        (_idx, _file, estado) => {
          // Sólo para feedback visual simplificado (no exponemos índice).
          progreso.set(fileArr.indexOf(_file), estado);
        },
      );
      setSubiendo(false);
      // Recarga lista
      const rows = await fetchAdjuntosTarea(tareaId);
      setExistentes(rows);
      onUpload?.();
    } else {
      // Modo crear: a la cola local
      addFiles(fileArr);
    }
  }

  async function quitarCola(idx: number) {
    const next = cola.slice();
    next.splice(idx, 1);
    setCola?.(next);
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

      {/* Lista de archivos ya subidos (modo editar) */}
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

      {/* Cola local (modo crear, mientras la tarea aún no existe) */}
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

      {/* Drop zone / file picker */}
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
