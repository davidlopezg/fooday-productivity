"use client";

// ============================================================================
// /calendario — Vista hora×día para time-blocking (migration 0017).
//
// Cada día tiene 4 bloques fijos (BLOQUE_HORARIO) ya definidos en
// `src/lib/semana.ts`. El usuario asigna UNA tarea a cada bloque
// (o lo deja libre). Esto es la implementación directa del "Bloqueo de
// tiempo" del pilar 3 — protege cada bloque contra el cambio de contexto
// y lo deja listo para entrar a un pomodoro desde la tarea asignada.
//
// Interacciones:
//   • Click en un bloque vacío → popover "Buscar tarea".
//   • Click en un bloque ocupado → menú "Cambiar / Limpiar / Iniciar foco".
//   • Navegación de semana (◀ ▶ hoy).
//
// Datos:
//   • `calendario_bloques` (migration 0017) + tareas activas via JOIN.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchCalendarioSemana,
  fetchTareas,
  upsertBloque,
  limpiarBloque,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import {
  BLOQUE_HORARIO,
  BLOQUES_FIJOS,
  bloqueFijoDe,
  bloquesFijosDe,
  DIAS_SEMANA,
  formatISOWeek,
  getCurrentISOWeek,
  isoWeekToMonday,
  localYMD,
  shiftISOWeek,
  type BloqueFijo,
  type DiaSemana,
} from "@/lib/semana";
import {
  IconArrowLeft,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconFlag,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from "@/components/icons";
import type { CalendarioBloqueConTarea, Tarea } from "@/lib/types";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";

const BLOQUES: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

const TONO_PRIORIDAD: Record<string, string> = {
  critica: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  urgente: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  alta: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  media: "border-border bg-muted/40 text-foreground",
  baja: "border-border bg-muted/40 text-muted-foreground",
};

const ESTADOS_ACTIVOS: ReadonlyArray<Tarea["estado"]> = [
  "pendiente",
  "en_progreso",
  "bloqueada",
];

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function CalendarioPage() {
  const [anio, setAnio] = useState(() => getCurrentISOWeek().anio);
  const [semanaIso, setSemanaIso] = useState(
    () => getCurrentISOWeek().semana_iso,
  );

  const lunes = useMemo(() => isoWeekToMonday(anio, semanaIso), [anio, semanaIso]);
  const domingo = useMemo(() => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + 6);
    return d;
  }, [lunes]);
  const desde = localYMD(lunes);
  const hasta = localYMD(domingo);

  const bloquesQ = useData<CalendarioBloqueConTarea[]>(
    () => fetchCalendarioSemana({ desde, hasta }),
    [],
    [desde, hasta],
  );

  const tareasQ = useData<Tarea[]>(
    () => fetchTareas(), // TODAS las tareas (también hechas: el usuario podría querer re-bloquear)
    [],
  );

  const tareasActivas = useMemo(
    () => (tareasQ.data ?? []).filter((t) => ESTADOS_ACTIVOS.includes(t.estado)),
    [tareasQ.data],
  );

  // Mapa (fecha, bloque) → fila
  const mapaBloques = useMemo(() => {
    const m = new Map<string, CalendarioBloqueConTarea>();
    for (const b of bloquesQ.data) {
      m.set(`${b.fecha}-${b.numero_bloque}`, b);
    }
    return m;
  }, [bloquesQ.data]);

  // Días de la semana (lunes a domingo) como YYYY-MM-DD local.
  // Usamos localYMD (no toISOString) para evitar el bug de zona horaria:
  // en CEST el toISOString() de un Date a 00:00 local cae al día anterior UTC.
  const dias = useMemo(() => {
    const hoyLocal = localYMD(new Date());
    return DIAS_SEMANA.map((d, i) => {
      const f = new Date(lunes);
      f.setDate(lunes.getDate() + i);
      return {
        ...d,
        fecha: localYMD(f),
        esHoy: localYMD(f) === hoyLocal,
      };
    });
  }, [lunes]);

  // Estado del popover "asignar"
  const [popover, setPopover] = useState<
    | { fecha: string; numeroBloque: 1 | 2 | 3 | 4 }
    | null
  >(null);

  async function asignar(tareaId: string | null) {
    if (!popover) return;
    await upsertBloque({
      fecha: popover.fecha,
      numeroBloque: popover.numeroBloque,
      tareaId,
    });
    setPopover(null);
    bloquesQ.reload();
  }

  async function limpiar() {
    if (!popover) return;
    await limpiarBloque({
      fecha: popover.fecha,
      numeroBloque: popover.numeroBloque,
    });
    setPopover(null);
    bloquesQ.reload();
  }

  function irHoy() {
    const c = getCurrentISOWeek();
    setAnio(c.anio);
    setSemanaIso(c.semana_iso);
  }

  function ir(delta: number) {
    const s = shiftISOWeek(anio, semanaIso, delta);
    setAnio(s.anio);
    setSemanaIso(s.semana_iso);
  }

  // Métricas semanales: cuántos bloques asignados / tareas críticas en calendario
  const stats = useMemo(() => {
    const total = BLOQUES.length * 7;
    let asignados = 0;
    let criticos = 0;
    for (const b of bloquesQ.data) {
      if (b.tarea) {
        asignados++;
        if (b.tarea.prioridad === "critica") criticos++;
      }
    }
    return { total, asignados, criticos };
  }, [bloquesQ.data]);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a Hoy
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <IconCalendar className="h-6 w-6 text-primary" />
            Calendario · Time-blocking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asigna tareas a bloques fijos de tiempo. Esto protege tu foco
            contra el cambio de contexto (pilar 3) y te dice qué hacer a qué hora.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Calendario" items={AYUDA_POR_RUTA["/calendario"]?.items ?? []} />
          <button
            onClick={() => ir(-1)}
            className="rounded-md border border-border bg-card p-2 text-sm hover:bg-accent"
            aria-label="Semana anterior"
          >
            <IconArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={irHoy}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Hoy
          </button>
          <button
            onClick={() => ir(1)}
            className="rounded-md border border-border bg-card p-2 text-sm hover:bg-accent"
            aria-label="Semana siguiente"
          >
            <IconArrowLeft className="h-4 w-4 rotate-180" />
          </button>
          <span className="ml-2 text-sm font-medium tabular-nums">
            {formatISOWeek(anio, semanaIso)}
          </span>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Bloques asignados" value={`${stats.asignados} / ${stats.total}`} sub="esta semana" />
        <Kpi label="Críticas en calendario" value={String(stats.criticos)} sub="máx 3-4 / día" />
        <Kpi label="Capacidad" value={`${Math.round((stats.asignados / stats.total) * 100)}%`} sub="de 4h/día sostenibles" />
        <Kpi label="Hoy" value={hoyCorto()} sub="día ISO actual" />
      </section>

      {/* Grid */}
      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <div
          className="grid min-w-[800px]"
          style={{ gridTemplateColumns: "100px repeat(7, minmax(0, 1fr))" }}
        >
          {/* Cabecera de días */}
          <div className="border-b border-r border-border bg-muted/40" />
          {dias.map((d) => (
            <div
              key={d.id}
              className={`border-b border-border px-3 py-2 text-center text-xs font-semibold ${
                d.esHoy ? "bg-violet-500/10 text-violet-700 dark:text-violet-300" : ""
              }`}
            >
              <div className="font-bold">{d.corto}</div>
              <div className="text-[10px] font-normal text-muted-foreground tabular-nums">
                {d.fecha.slice(5)}
              </div>
            </div>
          ))}

          {/* Filas por bloque */}
          {BLOQUES.map((numBloque) => (
            <FilaBloque
              key={numBloque}
              numBloque={numBloque}
              dias={dias}
              mapaBloques={mapaBloques}
              onClick={(fecha) => setPopover({ fecha, numeroBloque: numBloque })}
            />
          ))}
        </div>
      </section>

      {/* Popover de asignación */}
      {popover && (
        <PopoverAsignar
          fecha={popover.fecha}
          numBloque={popover.numeroBloque}
          bloqueActual={mapaBloques.get(`${popover.fecha}-${popover.numeroBloque}`) ?? null}
          fijo={bloqueFijoDe(
            (dias.find((d) => d.fecha === popover.fecha)?.id ?? 1) as DiaSemana,
            popover.numeroBloque,
          )}
          tareas={tareasActivas}
          onAsignar={asignar}
          onLimpiar={limpiar}
          onCerrar={() => setPopover(null)}
        />
      )}

      {/* Resumen de bloques fijos de la semana */}
      <ResumenBloquesFijos />

      {/* Ayuda */}
      <p className="text-center text-xs text-muted-foreground">
        💡 Tip: limita cada día a 3-4 bloques asignados. Más de 4h de foco
        profundo no es sostenible (pilar 5).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResumenBloquesFijos — lista compacta de los bloques fijos del sistema.
// Muestra qué celdas están reservadas esta semana, agrupadas por día,
// para que el usuario vea de un vistazo qué huecos quedan libres.
// ---------------------------------------------------------------------------
function ResumenBloquesFijos() {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          🔒 Bloques fijos de la semana
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {BLOQUES_FIJOS.length} reservas globales
        </span>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DIAS_SEMANA.map((d) => {
          const fijos = bloquesFijosDe(d.id);
          if (fijos.length === 0) {
            return (
              <li
                key={d.id}
                className="rounded-lg border border-dashed border-border bg-muted/20 p-2.5 text-[11px] text-muted-foreground"
              >
                <strong className="text-foreground">{d.nombre}</strong>
                <span className="ml-1.5">— sin reservas</span>
              </li>
            );
          }
          return (
            <li
              key={d.id}
              className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5"
            >
              <strong className="text-sm">{d.nombre}</strong>
              <ul className="mt-1.5 space-y-1">
                {fijos.map((f, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[11px] leading-tight"
                  >
                    <span className="shrink-0 leading-none">{f.emoji}</span>
                    <span className="min-w-0 flex-1">
                      {f.numeroBloque && (
                        <span className="rounded bg-background px-1 py-px font-mono text-[10px] text-muted-foreground">
                          B{f.numeroBloque}
                        </span>
                      )}
                      <span className="ml-1">{f.titulo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function hoyCorto(): string {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function FilaBloque({
  numBloque,
  dias,
  mapaBloques,
  onClick,
}: {
  numBloque: 1 | 2 | 3 | 4;
  dias: Array<{ id: number; corto: string; nombre: string; fecha: string; esHoy: boolean }>;
  mapaBloques: Map<string, CalendarioBloqueConTarea>;
  onClick: (fecha: string) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-border bg-muted/20 px-2 py-3 text-xs">
        <div className="font-semibold">Bloque {numBloque}</div>
        <div className="text-[10px] text-muted-foreground">{BLOQUE_HORARIO[numBloque]}</div>
      </div>
      {dias.map((d) => {
        const b = mapaBloques.get(`${d.fecha}-${numBloque}`);
        const fijo = bloqueFijoDe(d.id as DiaSemana, numBloque);
        return (
          <BloqueCell
            key={d.id}
            fecha={d.fecha}
            numBloque={numBloque}
            bloque={b ?? null}
            fijo={fijo}
            esHoy={d.esHoy}
            onClick={() => onClick(d.fecha)}
          />
        );
      })}
    </>
  );
}

function BloqueCell({
  fecha,
  numBloque,
  bloque,
  fijo,
  esHoy,
  onClick,
}: {
  fecha: string;
  numBloque: 1 | 2 | 3 | 4;
  bloque: CalendarioBloqueConTarea | null;
  fijo: BloqueFijo | null;
  esHoy: boolean;
  onClick: () => void;
}) {
  const tarea = bloque?.tarea ?? null;
  const tono = tarea ? (TONO_PRIORIDAD[tarea.prioridad ?? "media"] ?? TONO_PRIORIDAD.media) : "";

  // 1) Bloque fijo del sistema (no editable) → manda sobre la tarea.
  if (fijo) {
    return (
      <button
        onClick={onClick}
        className={`group relative min-h-[90px] border-b border-r border-border p-2 text-left transition-colors last:border-r-0 ${
          esHoy ? "bg-violet-500/5" : ""
        }`}
        aria-label={`Bloque ${numBloque} del ${fecha}: fijo · ${fijo.titulo}`}
        title={`Bloque fijo (no editable): ${fijo.titulo}`}
      >
        <div className="flex h-full flex-col gap-1 rounded-md border border-dashed border-primary/40 bg-primary/5 p-2">
          <div className="flex items-start gap-1">
            <span className="text-sm leading-none">{fijo.emoji}</span>
            <div className="line-clamp-2 text-[11px] font-medium leading-tight">
              {fijo.titulo}
            </div>
          </div>
          {fijo.nota && (
            <p className="text-[10px] italic text-muted-foreground">{fijo.nota}</p>
          )}
          <span className="mt-auto self-start rounded-full border border-primary/30 bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
            🔒 fijo
          </span>
        </div>
      </button>
    );
  }

  // 2) Celda normal: tarea asignada o libre.
  return (
    <button
      onClick={onClick}
      className={`group relative min-h-[90px] border-b border-r border-border p-2 text-left transition-colors last:border-r-0 ${
        esHoy ? "bg-violet-500/5" : ""
      } ${tarea ? "" : "hover:bg-accent/40"}`}
      aria-label={`Bloque ${numBloque} del ${fecha}${tarea ? `: ${tarea.titulo}` : " (libre)"}`}
    >
      {tarea ? (
        <div className={`flex h-full flex-col gap-1 rounded-md border p-2 ${tono}`}>
          <div className="flex items-start gap-1">
            {tarea.prioridad === "critica" && <IconFlag className="h-3 w-3 shrink-0" />}
            <div className="line-clamp-2 text-[11px] font-medium leading-tight">
              {tarea.titulo}
            </div>
          </div>
          {tarea.subtareas && tarea.subtareas.length > 0 && (
            <div className="text-[10px] opacity-75">
              {tarea.subtareas.filter((s) => s.hecho).length}/{tarea.subtareas.length} sub
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground/40 transition-colors group-hover:text-muted-foreground">
          <IconPlus className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

function PopoverAsignar({
  fecha,
  numBloque,
  bloqueActual,
  fijo,
  tareas,
  onAsignar,
  onLimpiar,
  onCerrar,
}: {
  fecha: string;
  numBloque: 1 | 2 | 3 | 4;
  bloqueActual: CalendarioBloqueConTarea | null;
  fijo: BloqueFijo | null;
  tareas: Tarea[];
  onAsignar: (tareaId: string | null) => void;
  onLimpiar: () => void;
  onCerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const fechaFmt = new Date(fecha).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return tareas.slice(0, 20);
    return tareas
      .filter((t) => t.titulo.toLowerCase().includes(q))
      .slice(0, 20);
  }, [tareas, busqueda]);

  // Si la celda es un bloque fijo, solo mostramos el aviso (no se puede asignar/limpiar).
  if (fijo) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popover-titulo"
        onClick={onCerrar}
      >
        <div
          className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="mb-3 flex items-start justify-between">
            <div>
              <h2
                id="popover-titulo"
                className="flex items-center gap-2 text-base font-semibold tracking-tight"
              >
                <span>{fijo.emoji}</span>
                Bloque {numBloque} · {BLOQUE_HORARIO[numBloque]}
              </h2>
              <p className="text-xs text-muted-foreground">{fechaFmt}</p>
            </div>
            <button
              onClick={onCerrar}
              className="rounded-md p-1 hover:bg-accent"
              aria-label="Cerrar"
            >
              <IconX className="h-4 w-4" />
            </button>
          </header>

          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              🔒 Bloque fijo
            </p>
            <p className="mt-2 text-sm font-medium">{fijo.titulo}</p>
            {fijo.nota && (
              <p className="mt-1 text-xs italic text-muted-foreground">{fijo.nota}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Este bloque está reservado en el sistema y no se puede sobrescribir
              desde el calendario semanal. Si necesitas modificarlo, edita{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-[11px]">
                BLOQUES_FIJOS
              </code>{" "}
              en <code className="rounded bg-background px-1.5 py-0.5 text-[11px]">src/lib/semana.ts</code>.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onCerrar}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="popover-titulo"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-start justify-between">
          <div>
            <h2
              id="popover-titulo"
              className="text-base font-semibold tracking-tight"
            >
              Bloque {numBloque} · {BLOQUE_HORARIO[numBloque]}
            </h2>
            <p className="text-xs text-muted-foreground">{fechaFmt}</p>
          </div>
          <button
            onClick={onCerrar}
            className="rounded-md p-1 hover:bg-accent"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </header>

        {bloqueActual?.tarea && (
          <div className="mb-3 rounded-md border border-violet-500/30 bg-violet-500/5 p-2 text-xs">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Asignada actualmente
            </div>
            <div className="mt-1 font-medium">{bloqueActual.tarea.titulo}</div>
            <div className="mt-2 flex gap-2">
              <Link
                href={`/tareas`}
                className="text-[11px] text-primary underline-offset-4 hover:underline"
              >
                Abrir tarea
              </Link>
              <button
                onClick={onLimpiar}
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-red-600 underline-offset-4 hover:underline"
              >
                <IconTrash className="h-3 w-3" />
                Limpiar bloque
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            placeholder="Buscar tarea…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <ul className="mt-2 max-h-72 overflow-y-auto">
          {filtradas.length === 0 ? (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">
              {busqueda ? "Sin coincidencias." : "No hay tareas activas."}
            </li>
          ) : (
            filtradas.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onAsignar(t.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  {t.prioridad === "critica" && (
                    <IconFlag className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  {bloqueActual?.tarea_id === t.id && (
                    <IconCheck className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <Link
            href={`/focus`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <IconBolt className="h-3 w-3" />
            Ir a Focus
          </Link>
          <button
            onClick={() => onAsignar(null)}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Dejar libre
          </button>
        </div>
      </div>
    </div>
  );
}