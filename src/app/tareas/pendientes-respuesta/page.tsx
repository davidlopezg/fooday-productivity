"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useData } from "@/lib/useData";
import { fetchTareasPendientesRespuesta } from "@/lib/queries";
import { reabrirTarea, setPendienteRespuesta } from "@/lib/mutations";
import type { Prioridad, Tarea } from "@/lib/types";
import { IconArrowLeft, IconCheck, IconClock } from "@/components/icons";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { errorMessage } from "@/lib/errors";

// ============================================================================
// /tareas/pendientes-respuesta
//
// Migration 0026. Panel dedicado a las tareas con el flag
// `pendiente_respuesta = true`. Son tareas de las que estás esperando
// una respuesta externa (un email que mandaste, una confirmación, una
// llamada pendiente…). El panel las muestra ordenadas por antigüedad
// del flag (lo que más tiempo lleva esperando primero) para atacar
// primero lo que más probablemente se te ha "caído" del radar.
//
// El toggle del flag está en /tareas (icono ⏳ en cada fila), como el
// resto de marcas (WIG, archivado, hecha).
// ============================================================================

const TONO_PRIORIDAD: Record<Prioridad, string> = {
  critica: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  urgente: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  alta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  media: "bg-muted text-muted-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
};

function Badge({
  tone,
  children,
}: {
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {children}
    </span>
  );
}

/** Etiqueta humana de la antigüedad: "Hoy", "Ayer", "Hace N días", o fecha. */
function antiguedadLbl(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(+d)) return "—";
  const ms = Date.now() - d.getTime();
  const dias = Math.floor(ms / 86400000);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function PendientesRespuestaPage() {
  const { data: tareas, loading, error, reload } = useData<Tarea[]>(
    fetchTareasPendientesRespuesta,
    [],
  );

  // Métricas rápidas para el header: total, más antigua, hechas pero
  // con el flag activo (= probablemente ya respondieron y hay que destildar).
  const stats = useMemo(() => {
    const total = tareas.length;
    let hechas = 0;
    let masAntiguaIso: string | null = null;
    for (const t of tareas) {
      if (t.estado === "hecha") hechas++;
      const at = t.pendiente_respuesta_at;
      if (at && (!masAntiguaIso || at < masAntiguaIso)) masAntiguaIso = at;
    }
    return { total, hechas, masAntiguaIso };
  }, [tareas]);

  async function quitarFlag(id: string) {
    try {
      await setPendienteRespuesta(id, false);
      await reload();
    } catch (e) {
      console.error("[PendientesRespuesta] quitar flag falló:", errorMessage(e));
    }
  }

  async function reabrir(id: string) {
    try {
      await reabrirTarea(id);
      await reload();
    } catch (e) {
      console.error("[PendientesRespuesta] reabrir falló:", errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/tareas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Todas las tareas
      </Link>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <IconClock className="h-5 w-5" />
              Pendientes de respuesta
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tareas de las que estás esperando que alguien te responda (un email
              mandado, una confirmación, un OK pendiente…). Ordenadas por
              antigüedad: lo que más tiempo lleva esperando primero.
            </p>
          </div>
          <HelpDrawer
            title="Pendientes de respuesta"
            items={AYUDA_POR_RUTA["/tareas/pendientes-respuesta"]?.items ?? []}
          />
        </div>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Esperando
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {loading ? "…" : stats.total}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Ya hechas (probable respuesta recibida)
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {loading ? "…" : stats.hechas}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:col-span-1 col-span-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Más antigua esperando
          </p>
          <p className="mt-1 text-sm font-semibold">
            {loading || !stats.masAntiguaIso
              ? "—"
              : antiguedadLbl(stats.masAntiguaIso)}
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error al cargar
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={reload}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && (
        <section>
          {loading && tareas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Cargando…
            </p>
          ) : tareas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay tareas pendientes de respuesta. 🎉
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Marca el icono ⏳ en cualquier tarea de /tareas cuando estés
                esperando que alguien te conteste.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {tareas.map((t) => (
                <li
                  key={t.id}
                  className={`rounded-xl border bg-card p-3 transition-colors ${
                    t.estado === "hecha"
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-amber-500/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.estado === "hecha" ? (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            title="Ya hecha"
                          >
                            <IconCheck className="h-3 w-3" />
                          </span>
                        ) : (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            title="Activa, esperando respuesta"
                          >
                            <IconClock className="h-3 w-3" />
                          </span>
                        )}
                        <span
                          className={`min-w-0 flex-1 text-sm font-medium ${
                            t.estado === "hecha" ? "line-through opacity-70" : ""
                          }`}
                        >
                          {t.titulo}
                        </span>
                        {t.prioridad && (
                          <Badge tone={TONO_PRIORIDAD[t.prioridad]}>
                            {t.prioridad}
                          </Badge>
                        )}
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                          title="Lleva esperando"
                        >
                          ⏳ {antiguedadLbl(t.pendiente_respuesta_at)}
                        </span>
                      </div>
                      {(t.tags ?? []).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {(t.tags ?? []).map((tg) => (
                            <span
                              key={tg}
                              className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {t.estado === "hecha" && (
                        <button
                          type="button"
                          onClick={() => reabrir(t.id)}
                          className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Reabrir la tarea"
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => quitarFlag(t.id)}
                        className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                        title="Quitar el flag de pendiente de respuesta (la respuesta llegó o se resolvió)"
                      >
                        ✓ Respuesta recibida
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
