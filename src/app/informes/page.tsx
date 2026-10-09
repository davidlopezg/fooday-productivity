"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchMetasConProgreso,
  fetchPomodoroSesiones,
  fetchProyectosConConteo,
  fetchSubtareasHechas,
  fetchTareasCompletadas,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { IconCheck, IconTarget } from "@/components/icons";
import type {
  Meta,
  MetaConPlan,
  PomodoroSesion,
  Proyecto,
  ResultadoConTareas,
  Tarea,
} from "@/lib/types";

const DIAS_OPCIONES = [7, 30, 90, 365];

type TareaConArea = Tarea & { area: { id: string; nombre: string; color: string | null } | null };

type SubtareaHecha = {
  id: string;
  tarea_id: string;
  descripcion: string;
  hecho: boolean;
  updated_at: string;
  tarea: Array<{ id: string; proyecto_id: string | null }> | null;
};

type Dia = {
  fecha: string; // YYYY-MM-DD
  tareas: number;
  subtareas: number;
  foco_min: number;
};

function fmt(iso: string) {
  return iso.slice(0, 10);
}

export default function InformesPage() {
  const [dias, setDias] = useState(30);

  const { data: hechas, loading: l1 } = useData<TareaConArea[]>(
    () => fetchTareasCompletadas({ limit: 5000 }),
    [],
  );
  const { data: pomos, loading: l2 } = useData<PomodoroSesion[]>(
    () => fetchPomodoroSesiones(dias),
    [],
    [dias],
  );
  const { data: proyectos, loading: l3 } = useData(
    fetchProyectosConConteo,
    [],
  );
  const { data: metas, loading: l4 } = useData<MetaConPlan[]>(
    fetchMetasConProgreso,
    [],
  );
  const { data: subtareas, loading: l5 } = useData<SubtareaHecha[]>(
    () => fetchSubtareasHechas(dias),
    [],
    [dias],
  );

  // Filtra tareas hechas a la ventana de tiempo
  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString();
  }, [dias]);
  const hechasEnRango = useMemo(
    () => hechas.filter((t) => (t.completada_at ?? "") >= desde),
    [hechas, desde],
  );

  // Serie diaria (tareas hechas + subtareas hechas + minutos de foco)
  const serie = useMemo<Dia[]>(() => {
    const mapa = new Map<string, Dia>();
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      mapa.set(fmt(d.toISOString()), {
        fecha: fmt(d.toISOString()),
        tareas: 0,
        subtareas: 0,
        foco_min: 0,
      });
    }
    for (const t of hechasEnRango) {
      const k = fmt(t.completada_at ?? "");
      const row = mapa.get(k);
      if (row) row.tareas++;
    }
    for (const s of subtareas) {
      const k = fmt(s.updated_at);
      const row = mapa.get(k);
      if (row) row.subtareas++;
    }
    for (const p of pomos) {
      const k = fmt(p.ended_at);
      const row = mapa.get(k);
      if (row) row.foco_min += Math.round(p.duracion_seg / 60);
    }
    return Array.from(mapa.values());
  }, [hechasEnRango, subtareas, pomos, dias]);

  const totalTareas = hechasEnRango.length;
  const totalSubtareas = subtareas.length;
  const totalFoco = pomos.reduce((acc, p) => acc + p.duracion_seg, 0);
  const totalFocoMin = Math.round(totalFoco / 60);

  // Racha de días consecutivos con al menos 1 tarea O subtarea hecha
  // (si no, los días donde solo se cierran subtareas rompen la racha)
  const racha = useMemo(() => {
    let r = 0;
    for (let i = serie.length - 1; i >= 0; i--) {
      if (serie[i].tareas + serie[i].subtareas > 0) r++;
      else break;
    }
    return r;
  }, [serie]);

  // Distribución por proyecto (solo de las hechas en el rango)
  const porProyecto = useMemo(() => {
    const map = new Map<string | null, number>();
    for (const t of hechasEnRango) {
      const k = t.proyecto_id ?? null;
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([pid, n]) => {
        const p = proyectos.find((pp) => pp.id === pid) as Proyecto | undefined;
        return { id: pid, nombre: p?.nombre ?? "Sin proyecto", color: p?.color ?? "#94a3b8", n };
      })
      .sort((a, b) => b.n - a.n);
  }, [hechasEnRango, proyectos]);

  const loading = l1 || l2 || l3 || l4 || l5;

  // Para el heatmap simple: max tareas/día en la serie
  const maxTareasDia = Math.max(1, ...serie.map((d) => d.tareas));
  const maxFocoDia = Math.max(1, ...serie.map((d) => d.foco_min));

  // ── Metas completadas (filtradas a la ventana usando updated_at como
  // proxy de la fecha en que se cerró la meta: el trigger set_updated_at
  // se dispara al cambiar `estado` a 'completada'). ──
  const metasCompletadas = useMemo<MetaConPlan[]>(() => {
    return metas
      .filter((m) => m.meta.estado === "completada")
      .filter((m) => (m.meta.updated_at ?? "") >= desde)
      .sort((a, b) =>
        (b.meta.updated_at ?? "").localeCompare(a.meta.updated_at ?? ""),
      );
  }, [metas, desde]);

  // ── KRs (resultados_periodo) completados: aplanamos todas las metas y
  // nos quedamos con los que están en estado 'completado'. ──
  const krsCompletados = useMemo<
    Array<{
      meta: Meta;
      kr: ResultadoConTareas;
      metaCodigo: string | null;
      metaTitulo: string;
      updatedAt: string;
    }>
  >(() => {
    const out: Array<{
      meta: Meta;
      kr: ResultadoConTareas;
      metaCodigo: string | null;
      metaTitulo: string;
      updatedAt: string;
    }> = [];
    for (const mp of metas) {
      for (const r of mp.resultados) {
        if (r.estado !== "completado") continue;
        out.push({
          meta: mp.meta,
          kr: r,
          metaCodigo: mp.meta.codigo,
          metaTitulo: mp.meta.titulo,
          updatedAt: r.updated_at ?? "",
        });
      }
    }
    return out
      .filter((k) => k.updatedAt >= desde)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [metas, desde]);

  // ── Metas con plan vs sin plan: una meta "forma parte de un OKR
  // completo" cuando tiene al menos un resultado_periodo (KR). Las que no
  // tienen KRs son declaraciones aspiracionales sin estructura medible. ──
  const metasConPlan = useMemo(
    () => metas.filter((m) => m.resultados.length > 0),
    [metas],
  );
  const metasSinPlan = useMemo(
    () =>
      metas
        .filter((m) => m.resultados.length === 0)
        .sort((a, b) =>
          (a.meta.codigo ?? "zzz").localeCompare(b.meta.codigo ?? "zzz"),
        ),
    [metas],
  );
  const totalMetasNoArchivadas = metas.filter(
    (m) => m.meta.estado !== "archivada",
  ).length;

  // ── Buckets para el chart "Tareas y subtareas por día/semana".
  // Para 7/30/90 días: granularidad diaria (1 columna por día).
  // Para 365 días: granularidad semanal (1 columna por semana, sumando
  // tareas y subtareas hechas en lunes-domingo). ──
  const buckets = useMemo<
    Array<{ etiqueta: string; tareas: number; subtareas: number }>
  >(() => {
    const fmtCorto = (iso: string) => {
      // "2026-01-15" -> "15 ene" (es-ES corto, sin locale switch para
      // evitar inconsistencias SSR/CSR)
      const [, m, d] = iso.split("-");
      const meses = [
        "ene", "feb", "mar", "abr", "may", "jun",
        "jul", "ago", "sep", "oct", "nov", "dic",
      ];
      return `${Number(d)} ${meses[Number(m) - 1] ?? m}`;
    };
    const inicioDeSemana = (iso: string) => {
      // Devuelve el lunes de la semana de `iso` (YYYY-MM-DD).
      const d = new Date(iso + "T00:00:00");
      const dow = d.getDay(); // 0=domingo, 1=lunes, ...
      const delta = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + delta);
      return d.toISOString().slice(0, 10);
    };

    if (dias >= 365) {
      // ── Semanal ──
      const map = new Map<
        string,
        { etiqueta: string; tareas: number; subtareas: number }
      >();
      for (const t of hechasEnRango) {
        const fecha = fmt(t.completada_at ?? "");
        const lunes = inicioDeSemana(fecha);
        const row = map.get(lunes) ?? {
          etiqueta: `${fmtCorto(lunes)}`,
          tareas: 0,
          subtareas: 0,
        };
        row.tareas++;
        map.set(lunes, row);
      }
      for (const s of subtareas) {
        const fecha = fmt(s.updated_at);
        const lunes = inicioDeSemana(fecha);
        const row = map.get(lunes) ?? {
          etiqueta: `${fmtCorto(lunes)}`,
          tareas: 0,
          subtareas: 0,
        };
        row.subtareas++;
        map.set(lunes, row);
      }
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => v);
    }

    // ── Diario (re-uso `serie` que ya tiene el bucket por día) ──
    return serie.map((d) => ({
      etiqueta: fmtCorto(d.fecha),
      tareas: d.tareas,
      subtareas: d.subtareas,
    }));
  }, [dias, hechasEnRango, subtareas, serie]);
  const maxBucket = Math.max(1, ...buckets.map((b) => b.tareas + b.subtareas));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu productividad en números. {loading ? "Cargando…" : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpDrawer title="Informes" items={AYUDA_POR_RUTA["/informes"]?.items ?? []} />
        <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
          {DIAS_OPCIONES.map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`rounded px-3 py-1 font-medium transition-colors ${
                dias === d
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === 365 ? "1 año" : `${d}d`}
            </button>
          ))}
        </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Kpi
          label="Tareas hechas"
          value={loading ? "—" : totalTareas.toString()}
          sub={`últimos ${dias} días`}
        />
        <Kpi
          label="Subtareas hechas"
          value={loading ? "—" : totalSubtareas.toString()}
          sub={`últimos ${dias} días`}
          accent="violet"
        />
        <Kpi
          label="Minutos de foco"
          value={loading ? "—" : totalFocoMin.toString()}
          sub={`≈ ${(totalFocoMin / 60).toFixed(1)} h`}
        />
        <Kpi
          label="Pomodoros"
          value={loading ? "—" : pomos.length.toString()}
          sub="bloques de 25 min"
        />
        <Kpi
          label="Racha"
          value={loading ? "—" : `${racha}d`}
          sub="días con tarea o subtarea"
        />
        <Kpi
          label="Metas cerradas"
          value={loading ? "—" : metasCompletadas.length.toString()}
          sub={`últimos ${dias} días`}
          accent="violet"
        />
        <Kpi
          label="OKRs (KRs) cerrados"
          value={loading ? "—" : krsCompletados.length.toString()}
          sub={`últimos ${dias} días`}
          accent="violet"
        />
      </section>

      {/* Heatmap de tareas (incluye subtareas) */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Actividad por día (tareas + subtareas)
        </h2>
        {serie.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${serie.length}, minmax(8px, 1fr))`,
              }}
            >
              {serie.map((d) => {
                // Intensidad combina tareas y subtareas: una subtarea
                // cuenta como 1/3 de tarea (heurística: la subtarea
                // representa micro-progreso, no cierre de tarea).
                const score = d.tareas + d.subtareas / 3;
                const pct = score / maxTareasDia;
                const intensity = score === 0 ? 0 : 0.2 + pct * 0.8;
                return (
                  <div
                    key={d.fecha}
                    title={`${d.fecha}: ${d.tareas} tareas, ${d.subtareas} subtareas, ${d.foco_min} min foco`}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor:
                        score === 0
                          ? "hsl(var(--muted))"
                          : `rgba(16, 185, 129, ${intensity})`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Verde = tareas + subtareas (subtarea ≈ ⅓ de tarea). La racha de
          días ya está arriba y también cuenta subtareas.
        </p>
      </section>

      {/* Tareas y subtareas por día (o semana si 1 año) */}
      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tareas y subtareas por {dias >= 365 ? "semana" : "día"}
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Tareas
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-violet-500" />
              Subtareas
            </span>
          </div>
        </header>
        {buckets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {buckets.map((b) => {
              const pctT = b.tareas / maxBucket;
              const pctS = b.subtareas / maxBucket;
              return (
                <div
                  key={b.etiqueta}
                  className="group flex flex-1 flex-col items-stretch justify-end gap-px"
                  title={`${b.etiqueta}: ${b.tareas} tareas, ${b.subtareas} subtareas`}
                >
                  <div
                    className="w-full rounded-t bg-emerald-500/70 transition-colors group-hover:bg-emerald-500"
                    style={{ height: `${Math.max(0, pctT * 100)}%`, minHeight: b.tareas > 0 ? "2px" : "0" }}
                  />
                  <div
                    className="w-full rounded-t bg-violet-500/70 transition-colors group-hover:bg-violet-500"
                    style={{ height: `${Math.max(0, pctS * 100)}%`, minHeight: b.subtareas > 0 ? "2px" : "0" }}
                  />
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {dias >= 365
            ? "Para 1 año las barras se agrupan por semana (lunes a domingo)."
            : "Cada columna es un día. Pasa el ratón para ver el desglose."}
        </p>
      </section>

      {/* Foco diario */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Minutos de foco por día
        </h2>
        {serie.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <div className="flex h-32 items-end gap-0.5">
            {serie.map((d) => {
              const pct = d.foco_min / maxFocoDia;
              return (
                <div
                  key={d.fecha}
                  className="flex-1 rounded-t bg-blue-500/60 hover:bg-blue-500/90"
                  style={{ height: `${Math.max(2, pct * 100)}%` }}
                  title={`${d.fecha}: ${d.foco_min} min`}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Por proyecto */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Por proyecto (hechas en el rango)
        </h2>
        {porProyecto.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin tareas hechas en este rango.{" "}
            <Link href="/tareas" className="underline underline-offset-4">
              Ve a Tareas
            </Link>{" "}
            para empezar.
          </p>
        ) : (
          <ul className="space-y-2">
            {porProyecto.map((p) => {
              const pct = Math.round((p.n / totalTareas) * 100);
              return (
                <li key={p.id ?? "none"} className="flex items-center gap-3 text-sm">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  <span className="min-w-[140px] truncate">{p.nombre}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums text-muted-foreground">
                    {p.n} ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Metas completadas */}
      <section className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5">
        <header className="mb-3 flex items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            <IconTarget className="h-4 w-4" />
            Metas completadas
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            últimos {dias} días · {metasCompletadas.length}
          </span>
        </header>
        {metasCompletadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguna meta cerrada en este rango. Las metas pasan a{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              estado = completada
            </code>{" "}
            desde el editor de cada meta (
            <Link href="/metas" className="underline underline-offset-4">
              /metas
            </Link>
            ).
          </p>
        ) : (
          <ul className="space-y-2">
            {metasCompletadas.map((mp) => {
              const m = mp.meta;
              const fecha = m.updated_at?.slice(0, 10) ?? "";
              const ambitoTxt =
                m.ambito === "personal"
                  ? "👤"
                  : m.ambito === "profesional"
                    ? "💼"
                    : "·";
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-background/70 p-3 text-sm"
                >
                  <IconCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {m.codigo ?? "—"}
                  </span>
                  <Link
                    href={`/metas/detalle?id=${m.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {m.titulo}
                  </Link>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">
                    {ambitoTxt} {m.plazo ? `· ${m.plazo}` : ""}
                  </span>
                  {mp.total_tareas > 0 && (
                    <span className="hidden tabular-nums text-[11px] text-muted-foreground sm:inline">
                      · {mp.tareas_hechas}/{mp.total_tareas} tareas
                    </span>
                  )}
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fecha}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* OKRs (KRs) completados */}
      <section className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5">
        <header className="mb-3 flex items-end justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            <IconCheck className="h-4 w-4" />
            OKRs (KRs) completados
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            últimos {dias} días · {krsCompletados.length}
          </span>
        </header>
        {krsCompletados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún resultado clave cerrado en este rango. Los KRs se
            completan al editar el resultado desde{" "}
            <Link href="/metas/plan" className="underline underline-offset-4">
              /metas/plan
            </Link>{" "}
            o{" "}
            <Link href="/metas/detalle" className="underline underline-offset-4">
              /metas/detalle
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {krsCompletados.map(({ metaCodigo, metaTitulo, kr, updatedAt, meta }) => {
              const fecha = updatedAt.slice(0, 10);
              const tieneMetrica =
                kr.metrica && kr.valor_objetivo != null;
              const ambitoTxt =
                meta.ambito === "personal"
                  ? "👤"
                  : meta.ambito === "profesional"
                    ? "💼"
                    : "·";
              return (
                <li
                  key={kr.id}
                  className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-background/70 p-3 text-sm"
                >
                  <IconCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {metaCodigo ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{kr.titulo}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {ambitoTxt} meta: {metaTitulo}
                      {tieneMetrica &&
                        ` · objetivo ${kr.valor_objetivo} ${kr.metrica}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fecha}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Plan trimestral: ¿cuántas metas tienen KRs? */}
      <section className="rounded-xl border border-border bg-card p-5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Plan trimestral: ¿cuántas metas tienen KRs?
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Una meta “con plan” tiene al menos un Key Result (
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                resultados_periodo
              </code>
              ). Las “sin plan” son declaraciones aspiracionales sin
              sub-metas: en OKR no se miden, solo se desean.
            </p>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {totalMetasNoArchivadas === 0
              ? "0 metas activas"
              : `${metasConPlan.length} con plan · ${metasSinPlan.length} sin plan (de ${totalMetasNoArchivadas} activas)`}
          </span>
        </header>

        {metas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin metas todavía.{" "}
            <Link href="/metas" className="underline underline-offset-4">
              Crea la primera en /metas
            </Link>
            .
          </p>
        ) : (
          <>
            {/* Barras comparativas */}
            <div className="space-y-3">
              <ComparacionFila
                color="emerald"
                etiqueta="Con plan (KRs definidos)"
                n={metasConPlan.length}
                total={metas.length}
                ayuda="OKR completo: la meta tiene resultados_periodo asociados."
              />
              <ComparacionFila
                color="amber"
                etiqueta="Sin plan (aspiraciones)"
                n={metasSinPlan.length}
                total={metas.length}
                ayuda="No tienen KRs. Siguiente paso: materializar el plan (botón ✨ Generar plan con IA en /metas o al crear la meta)."
              />
            </div>

            {/* Listado de metas sin plan: llamada a la acción */}
            {metasSinPlan.length > 0 && (
              <details className="mt-5 group">
                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                  Ver {metasSinPlan.length} meta{metasSinPlan.length === 1 ? "" : "s"} sin plan
                  <span className="ml-1 text-[10px] opacity-60 group-open:hidden">
                    (click para desplegar)
                  </span>
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {metasSinPlan.map((mp) => {
                    const m = mp.meta;
                    const ambitoTxt =
                      m.ambito === "personal"
                        ? "👤"
                        : m.ambito === "profesional"
                          ? "💼"
                          : "·";
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {m.codigo ?? "—"}
                        </span>
                        <Link
                          href={`/metas/detalle?id=${m.id}`}
                          className="min-w-0 flex-1 truncate font-medium hover:underline"
                        >
                          {m.titulo}
                        </Link>
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                          {ambitoTxt} {m.estado.replace("_", " ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** Fila de comparación: etiqueta + barra horizontal + n y %. */
function ComparacionFila({
  etiqueta,
  n,
  total,
  color,
  ayuda,
}: {
  etiqueta: string;
  n: number;
  total: number;
  color: "emerald" | "amber";
  ayuda: string;
}) {
  const pct = total === 0 ? 0 : Math.round((n / total) * 100);
  const barClass =
    color === "emerald" ? "bg-emerald-500/70" : "bg-amber-500/70";
  return (
    <div title={ayuda}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{etiqueta}</span>
        <span className="tabular-nums text-muted-foreground">
          {n} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "violet";
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 ${
        accent === "violet"
          ? "border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5"
          : "border-border"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold tracking-tight ${
          accent === "violet" ? "text-violet-700 dark:text-violet-300" : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
