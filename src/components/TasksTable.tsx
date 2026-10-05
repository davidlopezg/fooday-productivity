"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { Subtarea, Tarea } from "@/lib/types";
import {
  actualizarTarea,
  archivarTarea,
  desarchivarTarea,
  eliminarTarea,
  marcarHecha,
  marcarTareaWig,
  reabrirTarea,
} from "@/lib/mutations";
import { fetchProyectos } from "@/lib/queries";
import { useData } from "@/lib/useData";
import {
  IconArchive,
  IconCheck,
  IconPaperclip,
  IconPencil,
  IconSearch,
  IconSparkles,
  IconTarget,
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

const TONO_AMBITO: Record<string, string> = {
  personal:
    "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
  profesional:
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
};

const AMBITO_LABEL: Record<string, string> = {
  personal: "👤 Personal",
  profesional: "💼 Profesional",
};

type FiltroAmbit = "todas" | "personal" | "profesional";

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

/** Pinta la fecha_fin con color segun su estado vs hoy.
 *  Devuelve null si no hay fecha_fin (en ese caso, el caller hace fallback a `deadline` texto). */
function FechaFinCell({ fecha_fin }: { fecha_fin: string | null }) {
  if (!fecha_fin) return null;
  const d = new Date(fecha_fin + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - hoy.getTime()) / 86400000);
  const lbl = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  if (diff < 0) {
    return (
      <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
        ⚠️ {lbl}
      </span>
    );
  }
  if (diff === 0) {
    return (
      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
        📍 {lbl} (hoy)
      </span>
    );
  }
  return <span className="text-[11px] text-muted-foreground">📅 {lbl}</span>;
}

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
  const searchParams = useSearchParams();
  const proyectoFiltroQS = searchParams.get("proyecto");
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("activas");
  const [prioridad, setPrioridad] = useState("todas");
  const [capa, setCapa] = useState("todas");
  const [ambito, setAmbito] = useState<FiltroAmbit>("todas");
  const [tagsSel, setTagsSel] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Tarea | null>(null);
  const [creando, setCreando] = useState(false);
  const [guardandoWigId, setGuardandoWigId] = useState<string | null>(null);
  const [errorWig, setErrorWig] = useState<string | null>(null);
  const { data: proyectos } = useData(() => fetchProyectos(), []);
  const proyectoById = useMemo(
    () => new Map(proyectos.map((p) => [p.id, p])),
    [proyectos],
  );

  /** Todos los tags únicos de las tareas del usuario, ordenados alfabéticamente. */
  const todosLosTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of tareas) {
      for (const tg of t.tags ?? []) s.add(tg);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es"));
  }, [tareas]);

  const filtradas = useMemo(() => {
    return tareas.filter((t) => {
      if (estado === "activas" && !["pendiente", "en_progreso", "bloqueada"].includes(t.estado))
        return false;
      if (estado !== "activas" && estado !== "todas" && t.estado !== estado)
        return false;
      if (prioridad !== "todas" && t.prioridad !== prioridad) return false;
      if (capa !== "todas" && t.capa !== capa) return false;
      if (proyectoFiltroQS && t.proyecto_id !== proyectoFiltroQS) return false;
      if (ambito !== "todas" && t.ambito !== ambito) return false;
      if (
        tagsSel.size > 0 &&
        !(t.tags ?? []).some((tg) => tagsSel.has(tg))
      )
        return false;
      if (q) {
        const s = `${t.titulo} ${t.codigo ?? ""} ${t.descripcion ?? ""}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [tareas, estado, prioridad, capa, q, proyectoFiltroQS, ambito, tagsSel]);

  function toggleTag(t: string) {
    setTagsSel((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function toggleWig(t: Tarea) {
    setErrorWig(null);
    setGuardandoWigId(t.id);
    try {
      const ok = await marcarTareaWig(t.id, !t.es_wig);
      if (!ok) {
        setErrorWig(
          "Ya tienes 3 tareas marcadas como WIG. Quita una antes de añadir otra.",
        );
      } else {
        onChanged();
      }
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoWigId(null);
    }
  }

  const proyectoFiltro = proyectoFiltroQS ? proyectoById.get(proyectoFiltroQS) : null;

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
        <select value={ambito} onChange={(e) => setAmbito(e.target.value as FiltroAmbit)} className={inputCls}>
          <option value="todas">Ámbito</option>
          <option value="personal">👤 Personal</option>
          <option value="profesional">💼 Profesional</option>
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

      {/* Filtro por tags (chips) */}
      {todosLosTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-2 text-xs">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          {todosLosTags.map((tg) => {
            const activo = tagsSel.has(tg);
            return (
              <button
                key={tg}
                type="button"
                onClick={() => toggleTag(tg)}
                aria-pressed={activo}
                className={`rounded-full border px-2.5 py-1 transition-colors ${
                  activo
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                #{tg}
                {activo && <span className="ml-1">×</span>}
              </button>
            );
          })}
          {tagsSel.size > 0 && (
            <button
              type="button"
              onClick={() => setTagsSel(new Set())}
              className="ml-auto text-[11px] text-muted-foreground underline-offset-4 hover:underline"
            >
              limpiar ({tagsSel.size})
            </button>
          )}
        </div>
      )}

      {errorWig && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {errorWig}
        </p>
      )}

      {proyectoFiltro && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: proyectoFiltro.color ?? "#64748b" }}
            aria-hidden
          />
          <span>
            Filtrando por proyecto: <strong>{proyectoFiltro.nombre}</strong>
          </span>
          <a
            href="/tareas"
            className="ml-auto rounded px-2 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            quitar filtro
          </a>
        </div>
      )}

      {/* Lista de tarjetas (movil): la tabla de 760px obliga a scroll lateral */}
      <ul className="space-y-2 md:hidden">
        {filtradas.map((t) => {
          const nAdj = adjuntosCount?.get(t.id) ?? 0;
          return (
            <li
              key={t.id}
              className={`rounded-xl border bg-card p-3 ${
                t.es_wig ? "border-violet-500/40" : "border-border"
              }`}
            >
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div
                      className={`min-w-0 flex-1 text-sm font-medium ${
                        t.estado === "hecha" ? "line-through opacity-60" : ""
                      }`}
                    >
                      {t.titulo}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWig(t)}
                      disabled={guardandoWigId === t.id}
                      className={`shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${
                        t.es_wig
                          ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                          : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                      }`}
                      title={t.es_wig ? `WIG #${t.wig_orden ?? "?"} — quitar` : "Marcar como WIG"}
                      aria-label={t.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                      aria-pressed={t.es_wig}
                    >
                      {guardandoWigId === t.id ? (
                        <span className="block text-center text-[10px]">…</span>
                      ) : (
                        <IconTarget className="h-3.5 w-3.5" />
                      )}
                    </button>
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
                    {t.ambito && (
                      <Badge tone={TONO_AMBITO[t.ambito]}>
                        {AMBITO_LABEL[t.ambito]}
                      </Badge>
                    )}
                    {t.es_wig && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                        🎯 WIG #{t.wig_orden ?? "?"}
                      </span>
                    )}
                    {t.proyecto_id && proyectoById.get(t.proyecto_id) && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: `${proyectoById.get(t.proyecto_id)?.color ?? "#64748b"}1A`,
                          color: proyectoById.get(t.proyecto_id)?.color ?? undefined,
                        }}
                      >
                        📁 {proyectoById.get(t.proyecto_id)?.nombre}
                      </span>
                    )}
                    {t.recurrencia_tipo && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        🔁 {t.recurrencia_tipo}
                      </span>
                    )}
                    {t.capa && (
                      <span className="text-[11px] text-muted-foreground">{t.capa}</span>
                    )}
                    <FechaFinCell fecha_fin={t.fecha_fin} />
                    {!t.fecha_fin && t.deadline && (
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
                    {(t.tags ?? []).map((tg) => (
                      <span
                        key={tg}
                        className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        #{tg}
                      </span>
                    ))}
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
                className={`border-b border-border/60 last:border-0 hover:bg-accent/40 ${
                  t.es_wig ? "bg-violet-500/[0.03]" : ""
                }`}
              >
                <td className="max-w-[380px] px-3 py-3">
                  <div className="flex items-start gap-2">
                    {t.estado === "hecha" ? (
                      <span className="mt-0.5 text-emerald-500">
                        <IconCheck className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className={`min-w-0 flex-1 ${t.estado === "hecha" ? "line-through opacity-60" : ""}`}>
                          {t.titulo}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleWig(t)}
                          disabled={guardandoWigId === t.id}
                          className={`shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${
                            t.es_wig
                              ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                              : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                          }`}
                          title={t.es_wig ? `WIG #${t.wig_orden ?? "?"} — quitar` : "Marcar como WIG"}
                          aria-label={t.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                          aria-pressed={t.es_wig}
                        >
                          {guardandoWigId === t.id ? (
                            <span className="block text-center text-[10px]">…</span>
                          ) : (
                            <IconTarget className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {t.codigo && <span>{t.codigo}</span>}
                        {t.ambito && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                              TONO_AMBITO[t.ambito]
                            }`}
                          >
                            {AMBITO_LABEL[t.ambito]}
                          </span>
                        )}
                        {t.es_wig && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                            🎯 WIG #{t.wig_orden ?? "?"}
                          </span>
                        )}
                        {(t.tags ?? []).map((tg) => (
                          <span
                            key={tg}
                            className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px]"
                          >
                            #{tg}
                          </span>
                        ))}
                        {t.proyecto_id && proyectoById.get(t.proyecto_id) && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${proyectoById.get(t.proyecto_id)?.color ?? "#64748b"}1A`,
                              color: proyectoById.get(t.proyecto_id)?.color ?? undefined,
                            }}
                          >
                            📁 {proyectoById.get(t.proyecto_id)?.nombre}
                          </span>
                        )}
                        {t.recurrencia_tipo && (
                          <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px]">
                            🔁 {t.recurrencia_tipo}
                          </span>
                        )}
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
                <td className="px-3 py-3">
                  <FechaFinCell fecha_fin={t.fecha_fin} />
                  {!t.fecha_fin && t.deadline && (
                    <span className="text-muted-foreground">{t.deadline}</span>
                  )}
                  {!t.fecha_fin && !t.deadline && (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
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

