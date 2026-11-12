"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchKrsOverview } from "@/lib/queries";
import { actualizarResultadoPeriodo, marcarWig } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { KrOverview, MetaConPlan, Periodo, ResultadoConTareas } from "@/lib/types";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { PanelWigMetas } from "@/components/PanelWigMetas";
import { IconArrowLeft, IconSearch } from "@/components/icons";

// ---------------------------------------------------------------------------
// /krs — Vista global de Key Results.
//
// Una fila por KR de TODAS las metas, con la META a la que pertenece y el
// PROYECTO resueltos. Es el "todo de un vistazo" que faltaba: /metas/plan
// se lee por trimestres (columnas) y /metas/detalle obliga a abrir meta
// por meta; aquí se ve el inventario completo en una tabla filtrable.
//
// NO cambia la arquitectura: solo lee (resultados_periodo + metas +
// proyectos + kr_periodos + periodos + tareas) y permite actualizar el
// valor actual del KR (una sola columna escribible).
// ---------------------------------------------------------------------------

const ESTADO_RESULTADO: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  completado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  descartado: "bg-muted text-muted-foreground border-border",
};

const ESTADO_META: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const SIN_PROYECTO = "__sin_proyecto__";

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function MiniBar({ value }: { value: number }) {
  const p = Math.max(0, Math.min(1, value));
  const color = p < 0.3 ? "bg-red-500" : p < 0.7 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p * 100}%` }} />
    </div>
  );
}

export default function KrsPage() {
  const krsQ = useData<KrOverview[]>(fetchKrsOverview, []);

  const [q, setQ] = useState("");
  const [filtroProyecto, setFiltroProyecto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  /** Id de la meta cuyo WIG se está quitando (deshabilita el botón). */
  const [guardandoWigMetaId, setGuardandoWigMetaId] = useState<string | null>(null);
  const [errorWig, setErrorWig] = useState<string | null>(null);

  const filas = useMemo(() => krsQ.data ?? [], [krsQ.data]);

  /** Proyectos presentes en los KRs (para el desplegable de filtro). */
  const proyectos = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; color: string | null }>();
    for (const f of filas) {
      if (f.proyecto) map.set(f.proyecto.id, f.proyecto);
    }
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [filas]);

  const hayProyectosSinMeta = useMemo(
    () => filas.some((f) => !f.proyecto),
    [filas],
  );

  /** Quita una META del panel de WIGs (mismo toggle que en /metas y /tareas). */
  async function quitarWigMeta(metaId: string) {
    setErrorWig(null);
    setGuardandoWigMetaId(metaId);
    try {
      const ok = await marcarWig(metaId, false);
      if (!ok) setErrorWig("No se pudo quitar el WIG de la meta.");
      else await krsQ.reload();
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoWigMetaId(null);
    }
  }

  /* ---------------------------------------------------------------------
   * WIGs (issue #37).
   * Arriba de la tabla salen las metas marcadas como WIG que tienen KRs,
   * con sus KRs y su entrega. Es el MISMO panel que /metas y /tareas
   * (PanelWigMetas): aquí lo alimentamos desde `fetchKrsOverview`, que
   * ya trae el KR con su meta, su proyecto y sus periodos.
   * ------------------------------------------------------------------- */
  const wigs = useMemo<MetaConPlan[]>(() => {
    const porMeta = new Map<string, MetaConPlan>();
    for (const f of filas) {
      if (!f.meta?.es_wig) continue;
      let plan = porMeta.get(f.meta.id);
      if (!plan) {
        plan = {
          meta: f.meta,
          resultados: [],
          total_tareas: 0,
          tareas_hechas: 0,
          progreso: 0,
        };
        porMeta.set(f.meta.id, plan);
      }
      const periodos = f.periodos ?? [];
      const res: ResultadoConTareas = {
        ...f.kr,
        periodos,
        periodo: periodos[0] ?? ({} as Periodo),
        tareas: [],
      };
      plan.resultados.push(res);
      plan.total_tareas += f.total_tareas ?? 0;
      plan.tareas_hechas += f.tareas_hechas ?? 0;
    }
    const planes = Array.from(porMeta.values());
    for (const p of planes) {
      p.progreso = p.total_tareas > 0 ? p.tareas_hechas / p.total_tareas : 0;
    }
    return planes.sort(
      (a, b) => (a.meta.wig_orden ?? 9) - (b.meta.wig_orden ?? 9),
    );
  }, [filas]);

  /** Filtro por texto: busca en el KR, en su meta y en su proyecto. */
  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas.filter((f) => {
      if (filtroProyecto === SIN_PROYECTO) {
        if (f.proyecto) return false;
      } else if (filtroProyecto) {
        if (f.proyecto?.id !== filtroProyecto) return false;
      }
      if (filtroEstado && f.kr.estado !== filtroEstado) return false;
      if (!t) return true;
      return (
        f.kr.titulo.toLowerCase().includes(t) ||
        (f.kr.metrica ?? "").toLowerCase().includes(t) ||
        (f.meta?.titulo ?? "").toLowerCase().includes(t) ||
        (f.meta?.codigo ?? "").toLowerCase().includes(t) ||
        (f.proyecto?.nombre ?? "").toLowerCase().includes(t)
      );
    });
  }, [filas, q, filtroProyecto, filtroEstado]);

  return (
    <div className="space-y-6">
      <Link
        href="/metas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Todas las metas
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Todos los KRs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {krsQ.loading ? "…" : filas.length} KR{filas.length === 1 ? "" : "s"} ·{" "}
            {filtradas.length === filas.length
              ? "inventario completo"
              : `${filtradas.length} en el filtro`}{" "}
            — cada fila con su meta, su proyecto y su entrega.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="KRs" items={AYUDA_POR_RUTA["/krs"]?.items ?? []} />
          <Link
            href="/metas/plan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Plan trimestral
          </Link>
        </div>
      </header>

      {/* WIGs (metas con foco) de KR — mismo panel que /metas y /tareas. */}
      {wigs.length > 0 && (
        <PanelWigMetas
          wigs={wigs}
          onQuitar={quitarWigMeta}
          guardandoId={guardandoWigMetaId}
        />
      )}
      {errorWig && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorWig}</p>
      )}

      {krsQ.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <p className="font-medium">No se pudieron cargar los KRs.</p>
          <p className="mt-1 break-words text-xs opacity-90">{krsQ.error}</p>
          <button
            type="button"
            onClick={krsQ.reload}
            className="inline-flex items-center justify-center min-h-10 mt-2 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar KR, meta o proyecto…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filtroProyecto}
          onChange={(e) => setFiltroProyecto(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
          {hayProyectosSinMeta && (
            <option value={SIN_PROYECTO}>Sin proyecto</option>
          )}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">pendiente</option>
          <option value="en_progreso">en progreso</option>
          <option value="completado">completado</option>
          <option value="descartado">descartado</option>
        </select>
        {(q || filtroProyecto || filtroEstado) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setFiltroProyecto("");
              setFiltroEstado("");
            }}
            className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {filtradas.length > 0 && (
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5 font-semibold">KR</th>
                <th className="px-3 py-2.5 font-semibold">Meta</th>
                <th className="px-3 py-2.5 font-semibold">Proyecto</th>
                <th className="px-3 py-2.5 font-semibold">Entrega</th>
                <th className="px-3 py-2.5 font-semibold">Estado</th>
                <th className="px-3 py-2.5 font-semibold">Actual / objetivo</th>
                <th className="px-3 py-2.5 font-semibold">Progreso tareas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtradas.map((f) => (
                <KRTableRow
                  key={f.kr.id}
                  fila={f}
                  onGuardado={krsQ.reload}
                />
              ))}
            </tbody>
          </table>
        )}

        {krsQ.loading && filas.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>
        )}
        {!krsQ.loading && filas.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No hay ningún KR todavía. Los KRs se crean{" "}
            <Link href="/metas" className="font-medium underline underline-offset-4">
              desde el detalle de una meta
            </Link>
            .
          </p>
        )}
        {!krsQ.loading && filas.length > 0 && filtradas.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Ningún KR cumple los filtros.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fila de la tabla: un KR + su meta + su proyecto + su entrega.
// ---------------------------------------------------------------------------
function KRTableRow({
  fila,
  onGuardado,
}: {
  fila: KrOverview;
  onGuardado: () => void;
}) {
  const { kr, meta, proyecto, periodos } = fila;
  const [editando, setEditando] = useState(false);

  const prog = fila.total_tareas === 0 ? 0 : fila.tareas_hechas / fila.total_tareas;

  return (
    <tr className="align-top hover:bg-muted/30">
      {/* KR */}
      <td className="max-w-[320px] px-3 py-2.5">
        {meta ? (
          <Link
            href={`/metas/detalle?id=${meta.id}`}
            className="font-medium leading-snug hover:underline"
          >
            {kr.titulo}
          </Link>
        ) : (
          <span className="font-medium leading-snug">{kr.titulo}</span>
        )}
        {kr.descripcion && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {kr.descripcion}
          </p>
        )}
        {kr.metrica && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">📏 {kr.metrica}</p>
        )}
      </td>

      {/* Meta */}
      <td className="max-w-[220px] px-3 py-2.5">
        {meta ? (
          <>
            <Link
              href={`/metas/detalle?id=${meta.id}`}
              className="text-xs font-medium hover:underline"
            >
              {meta.codigo ?? "—"} · {meta.titulo}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                  ESTADO_META[meta.estado] ?? ESTADO_META.sin_empezar
                }`}
              >
                {meta.estado.replace("_", " ")}
              </span>
              {meta.es_wig && (
                <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                  🎯 WIG
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">sin meta (huérfano)</span>
        )}
      </td>

      {/* Proyecto */}
      <td className="max-w-[180px] px-3 py-2.5">
        {proyecto ? (
          <span
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium"
            title="Proyecto al que pertenece la meta de este KR"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: proyecto.color ?? "#64748b" }}
            />
            <span className="truncate">{proyecto.nombre}</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/70">sin proyecto</span>
        )}
      </td>

      {/* Entrega (periodos) */}
      <td className="px-3 py-2.5">
        {periodos.length === 0 ? (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            sin entrega
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {periodos.map((p) => (
              <span
                key={p.id}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                title={`${p.fecha_inicio} → ${p.fecha_fin}`}
              >
                {p.nombre}
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Estado */}
      <td className="px-3 py-2.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
            ESTADO_RESULTADO[kr.estado] ?? ESTADO_RESULTADO.pendiente
          }`}
        >
          {kr.estado.replace("_", " ")}
        </span>
      </td>

      {/* Actual / objetivo (editable el actual) */}
      <td className="px-3 py-2.5">
        {editando ? (
          <ValorEditor
            krId={kr.id}
            valorActual={kr.valor_actual}
            onCancel={() => setEditando(false)}
            onGuardado={() => {
              setEditando(false);
              onGuardado();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded px-1 py-0.5 text-left text-xs tabular-nums hover:bg-accent"
            title="Actualizar el valor actual del KR"
          >
            <span className="font-semibold">
              {kr.valor_actual == null ? "—" : kr.valor_actual}
              {kr.unidad ?? ""}
            </span>
            {kr.valor_objetivo != null && (
              <span className="text-muted-foreground">
                {" / "}
                {kr.valor_objetivo}
                {kr.unidad ?? ""}
              </span>
            )}
          </button>
        )}
      </td>

      {/* Progreso de tareas */}
      <td className="w-[140px] px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {fila.tareas_hechas}/{fila.total_tareas}
          </span>
          <span className="tabular-nums">{pct(prog)}</span>
        </div>
        <div className="mt-1">
          <MiniBar value={prog} />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Editor del valor actual — se monta solo mientras se edita, así el estado
// local nace del valor real del KR (sin efectos ni sincronizaciones).
// ---------------------------------------------------------------------------
function ValorEditor({
  krId,
  valorActual,
  onCancel,
  onGuardado,
}: {
  krId: string;
  valorActual: number | null;
  onCancel: () => void;
  onGuardado: () => void;
}) {
  const [texto, setTexto] = useState(valorActual == null ? "" : String(valorActual));
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    const n = texto.trim() === "" ? null : Number(texto);
    if (n !== null && !Number.isFinite(n)) {
      onCancel();
      return;
    }
    setGuardando(true);
    try {
      await actualizarResultadoPeriodo(krId, { valor_actual: n });
      onGuardado();
    } catch (e) {
      alert(
        `No se pudo actualizar el valor: ${e instanceof Error ? e.message : "error desconocido"}`,
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <span className="flex items-center gap-1">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => {
          if (e.key === "Enter") guardar();
          if (e.key === "Escape") onCancel();
        }}
        inputMode="decimal"
        className="h-7 w-20 rounded-md border border-input bg-background px-1.5 text-xs tabular-nums outline-none focus:ring-2 focus:ring-ring"
      />
      {guardando && <span className="text-[10px] text-muted-foreground">…</span>}
    </span>
  );
}
