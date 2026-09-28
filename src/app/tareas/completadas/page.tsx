"use client";

import { useMemo, useState } from "react";
import { fetchTareasCompletadas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { Area, Prioridad, TareaSubtarea, Tarea } from "@/lib/types";
import { IconCheck } from "@/components/icons";

type TareaConArea = Tarea & { area: Area | null };

type Rango = "7" | "30" | "90" | "365" | "todo";

type Grupo = {
  /** Clave estable para React (YYYY-MM-DD). */
  key: string;
  /** Título humano ("Hoy", "Ayer", "Lunes 27 sept"). */
  titulo: string;
  /** Lista de tareas, ya ordenadas de más reciente a más antigua. */
  tareas: TareaConArea[];
};

// ---------------------------------------------------------------------------
// Helpers de fecha
// ---------------------------------------------------------------------------

const MS_DIA = 24 * 60 * 60 * 1000;
const LOCALE = "es-ES";

function inicioDeDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatoFechaLarga(d: Date): string {
  return d.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatoHora(d: Date): string {
  return d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

/** Convierte un ISO timestamp a Date local. Devuelve null si no es válido. */
function parseCompletadaAt(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(+d) ? null : d;
}

/**
 * Etiqueta humana del grupo, en función del día al que pertenece la fecha.
 * - Hoy / Ayer si caen en el día actual o anterior.
 * - "Hace N días" si está en los últimos 6 días.
 * - Nombre del día + día del mes para esta/otras semanas recientes.
 * - Fecha completa para lo más antiguo.
 */
function etiquetaGrupo(d: Date, hoy: Date): string {
  const d0 = inicioDeDia(d);
  const h0 = inicioDeDia(hoy);
  const diffDias = Math.round((+h0 - +d0) / MS_DIA);
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias > 1 && diffDias < 7) return `Hace ${diffDias} días`;
  // Misma semana (lunes a domingo) que hoy
  const inicioSemana = new Date(h0);
  inicioSemana.setDate(h0.getDate() - ((h0.getDay() + 6) % 7)); // lunes
  if (d0 >= inicioSemana) {
    return d.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "short" });
  }
  // Mes actual (pero no esta semana)
  if (d0.getFullYear() === h0.getFullYear() && d0.getMonth() === h0.getMonth()) {
    return d.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "short" });
  }
  return formatoFechaLarga(d);
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const TONO_PRIORIDAD: Record<Prioridad, string> = {
  critica: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  urgente: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  alta: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  media: "bg-muted text-muted-foreground border-border",
  baja: "bg-muted text-muted-foreground border-border",
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

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------

export default function TareasCompletadasPage() {
  const [rango, setRango] = useState<Rango>("30");

  const { data: tareas, loading, error, reload } = useData<TareaConArea[]>(
    () => fetchTareasCompletadas(),
    [],
  );

  // Filtrado por rango: si la tarea no tiene completada_at o está fuera
  // del rango, la descartamos.
  const filtradas = useMemo(() => {
    if (rango === "todo") return tareas;
    const limiteDias = parseInt(rango, 10);
    const corte = new Date();
    corte.setDate(corte.getDate() - limiteDias);
    return tareas.filter((t) => {
      const d = parseCompletadaAt(t.completada_at);
      return d !== null && d >= corte;
    });
  }, [tareas, rango]);

  // Agrupa por día (YYYY-MM-DD), preservando el orden descendente.
  const grupos = useMemo<Grupo[]>(() => {
    const hoy = new Date();
    const map = new Map<string, TareaConArea[]>();
    for (const t of filtradas) {
      const d = parseCompletadaAt(t.completada_at);
      if (!d) continue;
      const key = ymd(d);
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    const result: Grupo[] = [];
    for (const [key, list] of map.entries()) {
      const d = parseCompletadaAt(list[0].completada_at);
      if (!d) continue;
      result.push({ key, titulo: etiquetaGrupo(d, hoy), tareas: list });
    }
    // map respeta orden de inserción (que ya viene ordenado por completada_at desc)
    return result;
  }, [filtradas]);

  // Métricas rápidas
  const stats = useMemo(() => {
    const total = filtradas.length;
    let subtareasHechas = 0;
    let subtareasTotales = 0;
    let conCriterio = 0;
    for (const t of filtradas) {
      const subs = (t.subtareas ?? []) as TareaSubtarea[];
      if (subs.length > 0) {
        subtareasTotales += subs.length;
        subtareasHechas += subs.filter((s) => s.hecho).length;
      }
      if (t.criterio_terminacion) conCriterio++;
    }
    return { total, subtareasHechas, subtareasTotales, conCriterio };
  }, [filtradas]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tareas completadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico de tareas hechas, ordenadas por fecha de completación.
          </p>
        </div>
        <button
          onClick={reload}
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Recargar
        </button>
      </header>

      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tareas hechas" value={stats.total} loading={loading} />
        <Stat
          label="Subtareas hechas"
          value={`${stats.subtareasHechas} / ${stats.subtareasTotales}`}
          loading={loading}
        />
        <Stat
          label="Con criterio de terminación"
          value={`${stats.conCriterio} / ${stats.total}`}
          loading={loading}
        />
        <Stat
          label="Última completada"
          value={
            filtradas[0]?.completada_at
              ? formatoHora(new Date(filtradas[0].completada_at))
              : "—"
          }
          loading={loading}
        />
      </section>

      {/* Filtros */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Rango:</span>
          {(["7", "30", "90", "365", "todo"] as Rango[]).map((r) => {
            const active = rango === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRango(r)}
                aria-pressed={active}
                className={`cursor-pointer rounded-md border px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {r === "todo" ? "Todo" : `Últimos ${r} días`}
              </button>
            );
          })}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {loading
              ? "Cargando…"
              : rango === "todo"
                ? `${filtradas.length} tareas en total`
                : `${filtradas.length} de ${tareas.length} tareas`}
          </span>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">Error al cargar tareas</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={reload}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Lista */}
      {!error && (
        <section className="space-y-6">
          {loading && grupos.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Cargando…
            </div>
          )}

          {!loading && grupos.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay tareas completadas en este rango.
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Marca tareas como hechas desde la página de Tareas para verlas aquí.
              </p>
            </div>
          )}

          {grupos.map((g) => (
            <div key={g.key} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-semibold capitalize text-muted-foreground">
                <span>{g.titulo}</span>
                <span className="text-[11px] font-normal text-muted-foreground/70">
                  ({g.tareas.length})
                </span>
              </h2>
              <div className="space-y-2">
                {g.tareas.map((t) => (
                  <TareaCompletadaRow key={t.id} t={t} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {loading ? "…" : value}
      </p>
    </div>
  );
}

function TareaCompletadaRow({ t }: { t: TareaConArea }) {
  const completada = parseCompletadaAt(t.completada_at);
  const subs = (t.subtareas ?? []) as TareaSubtarea[];
  const subsHechas = subs.filter((s) => s.hecho);
  const subsPendientes = subs.filter((s) => !s.hecho);

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-card/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <IconCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <h3 className="text-sm font-medium text-foreground line-through decoration-muted-foreground/40">
              {t.titulo}
            </h3>
            {t.codigo && (
              <span className="font-mono text-[11px] text-muted-foreground">{t.codigo}</span>
            )}
            {t.prioridad && (
              <Badge tone={TONO_PRIORIDAD[t.prioridad]}>{t.prioridad}</Badge>
            )}
            {t.area && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {t.area.color && (
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: t.area.color }}
                  />
                )}
                {t.area.nombre}
              </span>
            )}
          </div>

          {t.criterio_terminacion && (
            <p className="mt-1.5 text-xs italic text-muted-foreground">
              “{t.criterio_terminacion}”
            </p>
          )}

          {/* Subtareas */}
          {subs.length > 0 && (
            <ul className="mt-2.5 space-y-1 text-xs">
              {subsHechas.map((s, i) => (
                <li key={`h-${i}`} className="flex items-start gap-2 text-muted-foreground">
                  <IconCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="line-through decoration-muted-foreground/40">{s.descripcion}</span>
                  {s.tiempo_estimado_min != null && (
                    <span className="text-[10px] text-muted-foreground/70">
                      ~{s.tiempo_estimado_min}min
                    </span>
                  )}
                </li>
              ))}
              {subsPendientes.length > 0 && (
                <li className="mt-1 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                  <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full border border-amber-500/40" />
                  <span>
                    {subsPendientes.length} subtarea{subsPendientes.length === 1 ? "" : "s"} pendiente
                    {subsPendientes.length === 1 ? "" : "s"} (no se cerró al marcar la tarea como hecha)
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Fecha/hora de completado */}
        <div className="shrink-0 text-right text-[11px] text-muted-foreground">
          {completada && (
            <>
              <p className="font-medium tabular-nums text-foreground/80">{formatoHora(completada)}</p>
              <p className="text-[10px]">{completada.toLocaleDateString(LOCALE)}</p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
