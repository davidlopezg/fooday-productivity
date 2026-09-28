"use client";

import { useMemo, useState, useTransition } from "react";
import type { Subtarea, Tarea } from "@/lib/types";
import {
  actualizarTarea,
  archivarTarea,
  desarchivarTarea,
  eliminarTarea,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  IconArchive,
  IconCheck,
  IconPaperclip,
  IconPencil,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@/components/icons";
import { CrearModal, EditarModal } from "./TareaModal";

const CAPAS = ["CAPA 1", "CAPA 2", "CAPA 3"];
const PRIORIDADES = ["critica", "urgente", "alta", "media", "baja"];
const ESTADOS = ["pendiente", "en_progreso", "bloqueada", "hecha", "archivada"];

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

/** Acciones de una tarea. Compartidas por la tabla (escritorio) y las tarjetas (movil). */
function TareaAcciones({
  t,
  run,
  onEditar,
}: {
  t: Tarea;
  run: (fn: () => Promise<void>) => void;
  onEditar: () => void;
}) {
  const btn =
    "rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {t.estado === "hecha" ? (
        <button title="Reabrir" aria-label="Reabrir" onClick={() => run(() => reabrirTarea(t.id))} className={btn}>
          <IconX className="h-4 w-4" />
        </button>
      ) : (
        <button
          title="Marcar como hecha"
          aria-label="Marcar como hecha"
          onClick={() => run(() => marcarHecha(t.id))}
          className={`${btn} hover:text-emerald-500`}
        >
          <IconCheck className="h-4 w-4" />
        </button>
      )}
      <button title="Editar" aria-label="Editar" onClick={onEditar} className={btn}>
        <IconPencil className="h-4 w-4" />
      </button>
      {t.estado === "archivada" ? (
        <button
          title="Desarchivar"
          aria-label="Desarchivar"
          onClick={() => run(() => desarchivarTarea(t.id))}
          className={btn}
        >
          <IconArchive className="h-4 w-4" />
        </button>
      ) : (
        <button
          title="Archivar"
          aria-label="Archivar"
          onClick={() => run(() => archivarTarea(t.id))}
          className={btn}
        >
          <IconArchive className="h-4 w-4" />
        </button>
      )}
      <button
        title="Eliminar"
        aria-label="Eliminar"
        onClick={() => {
          if (confirm(`¿Eliminar "${t.titulo}"? No se puede deshacer.`))
            run(() => eliminarTarea(t.id));
        }}
        className={`${btn} hover:bg-destructive/10 hover:text-destructive`}
      >
        <IconTrash className="h-4 w-4" />
      </button>
    </div>
  );
}

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
      try {
        await fn();
        onChanged();
      } catch (e: unknown) {
        console.error("[TasksTable] run falló:", e instanceof Error ? e.message : String(e));
      }
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

      {/* Lista de tarjetas (movil): la tabla de 760px obliga a scroll lateral */}
      <ul className="space-y-2 md:hidden">
        {filtradas.map((t) => {
          const nAdj = adjuntosCount?.get(t.id) ?? 0;
          return (
            <li key={t.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium ${
                      t.estado === "hecha" ? "line-through opacity-60" : ""
                    }`}
                  >
                    {t.titulo}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={TONO_ESTADO[t.estado] ?? TONO_ESTADO.pendiente}>
                      {t.estado.replace("_", " ")}
                    </Badge>
                    {t.prioridad && (
                      <Badge tone={TONO_PRIORIDAD[t.prioridad] ?? TONO_PRIORIDAD.media}>
                        {t.prioridad.toUpperCase()}
                      </Badge>
                    )}
                    {t.capa && (
                      <span className="text-[11px] text-muted-foreground">{t.capa}</span>
                    )}
                    {t.deadline && (
                      <span className="text-[11px] text-muted-foreground">📅 {t.deadline}</span>
                    )}
                    {t.pts != null && (
                      <span className="text-[11px] text-muted-foreground">{t.pts} pts</span>
                    )}
                    {t.codigo && (
                      <span className="text-[11px] text-muted-foreground">{t.codigo}</span>
                    )}
                    {nAdj > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <IconPaperclip className="h-3 w-3" />
                        {nAdj}
                      </span>
                    )}
                  </div>
                </div>
                <TareaAcciones t={t} run={run} onEditar={() => setEditando(t)} />
              </div>
            </li>
          );
        })}
        {filtradas.length === 0 && (
          <li className="rounded-xl border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground">
            No hay tareas que coincidan con los filtros.
          </li>
        )}
      </ul>

      {/* Tabla (escritorio) */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
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
                  <TareaAcciones
                    t={t}
                    run={run}
                    onEditar={() => setEditando(t)}
                  />
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

