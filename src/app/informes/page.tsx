"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchPomodoroSesiones,
  fetchProyectosConConteo,
  fetchTareasCompletadas,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import type { PomodoroSesion, Proyecto, Tarea } from "@/lib/types";

const DIAS_OPCIONES = [7, 30, 90, 365];

type TareaConArea = Tarea & { area: { id: string; nombre: string; color: string | null } | null };

type Dia = {
  fecha: string; // YYYY-MM-DD
  tareas: number;
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
  );
  const { data: proyectos, loading: l3 } = useData(
    fetchProyectosConConteo,
    [],
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

  // Serie diaria (tareas hechas + minutos de foco)
  const serie = useMemo<Dia[]>(() => {
    const mapa = new Map<string, Dia>();
    const hoy = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      mapa.set(fmt(d.toISOString()), { fecha: fmt(d.toISOString()), tareas: 0, foco_min: 0 });
    }
    for (const t of hechasEnRango) {
      const k = fmt(t.completada_at ?? "");
      const row = mapa.get(k);
      if (row) row.tareas++;
    }
    for (const p of pomos) {
      const k = fmt(p.ended_at);
      const row = mapa.get(k);
      if (row) row.foco_min += Math.round(p.duracion_seg / 60);
    }
    return Array.from(mapa.values());
  }, [hechasEnRango, pomos, dias]);

  const totalTareas = hechasEnRango.length;
  const totalFoco = pomos.reduce((acc, p) => acc + p.duracion_seg, 0);
  const totalFocoMin = Math.round(totalFoco / 60);

  // Racha de días consecutivos con al menos 1 tarea hecha
  const racha = useMemo(() => {
    let r = 0;
    for (let i = serie.length - 1; i >= 0; i--) {
      if (serie[i].tareas > 0) r++;
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

  const loading = l1 || l2 || l3;

  // Para el heatmap simple: max tareas/día en la serie
  const maxTareasDia = Math.max(1, ...serie.map((d) => d.tareas));
  const maxFocoDia = Math.max(1, ...serie.map((d) => d.foco_min));

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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Tareas hechas"
          value={loading ? "—" : totalTareas.toString()}
          sub={`últimos ${dias} días`}
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
          sub="días seguidos con tarea"
        />
      </section>

      {/* Heatmap de tareas */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tareas por día
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
                const pct = d.tareas / maxTareasDia;
                const intensity = d.tareas === 0 ? 0 : 0.2 + pct * 0.8;
                return (
                  <div
                    key={d.fecha}
                    title={`${d.fecha}: ${d.tareas} tareas, ${d.foco_min} min foco`}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor:
                        d.tareas === 0
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
          Verde = tareas hechas. La altura de la racha ya está arriba.
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
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
