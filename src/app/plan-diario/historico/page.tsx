"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { fetchPlanes } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { PlanDiario } from "@/lib/types";

type PlanConConteo = PlanDiario & {
  tareas_total: number;
  tareas_hechas: number;
  tareas_bloques: Array<{
    bloque_num: number | null;
    titulo_libre: string | null;
    tipo_tarea: string | null;
    tarea_id: string | null;
    hecho: boolean;
    orden: number;
  }>;
};

const SEM: Record<string, string> = {
  verde: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amarillo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rojo: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

type Rango = "7" | "30" | "90" | "365" | "todo";

export default function PlanDiarioHistoricoPage() {
  const [rango, setRango] = useState<Rango>("30");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtros = useMemo(() => {
    if (rango === "todo") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(rango, 10));
    return { desde: d.toISOString().slice(0, 10), limit: 500 };
  }, [rango]);

  const planesQ = useData<PlanConConteo[]>(() => fetchPlanes(filtros), []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de planes diarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas las generaciones de planes (incluye re-generaciones del mismo día).
          </p>
        </div>
        <Link
          href="/plan-diario"
          className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          ← Volver a Plan diario
        </Link>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Rango:</span>
          {(["7", "30", "90", "365", "todo"] as Rango[]).map((r) => (
            <button
              key={r}
              onClick={() => setRango(r)}
              className={`rounded-md border px-3 py-1 text-xs ${
                rango === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {r === "todo" ? "Todo" : `Últimos ${r}d`}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {planesQ.loading ? "Cargando…" : `${planesQ.data.length} planes`}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        {planesQ.data.length === 0 && !planesQ.loading && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Aún no hay planes generados.
          </p>
        )}

        {planesQ.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Gen</th>
                  <th className="px-4 py-3">Semáforo</th>
                  <th className="px-4 py-3">Tareas</th>
                  <th className="px-4 py-3">Resumen</th>
                  <th className="px-4 py-3">Recomendación</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {planesQ.data.map((p) => {
                  const isExpanded = expanded === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        className="cursor-pointer transition-colors hover:bg-muted/30"
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{p.fecha}</td>
                        <td className="px-4 py-3 text-muted-foreground">#{p.num_generacion}</td>
                        <td className="px-4 py-3">
                          {p.semaforo ? (
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${SEM[p.semaforo]}`}
                            >
                              {p.semaforo}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs">
                          <span className="font-medium">{p.tareas_hechas}</span>
                          <span className="text-muted-foreground"> / {p.tareas_total}</span>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                          {p.resumen ?? "—"}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                          {p.recomendacion ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {isExpanded ? "▼" : "▶"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4">
                              {/* Cabecera emocional rápida */}
                              <div className="rounded-md border border-border bg-background p-3 text-xs">
                                <span className="font-semibold uppercase tracking-wide text-muted-foreground">
                                  Estado emocional:
                                </span>{" "}
                                🌅 {p.despertar ?? "—"} · 🧠 {p.mente ?? "—"} · 💪 {p.cuerpo ?? "—"} · 🌀 {p.rueda ?? "—"} · 🆘 {p.necesidad ?? "—"}
                              </div>

                              {/* 1. Resumen */}
                              <Section titulo="1. Resumen" emoji="📌">
                                <p className="text-xs whitespace-pre-wrap">{p.resumen ?? "—"}</p>
                              </Section>

                              {/* 2. Recomendación */}
                              <Section titulo="2. Recomendación" emoji="🆘">
                                <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                                  {p.recomendacion ?? "—"}
                                </p>
                              </Section>

                              {/* 3. Lectura psicológica */}
                              <Section titulo="3. Lectura psicológica" emoji="🧠">
                                <div className="space-y-2">
                                  <div>
                                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Lo del día
                                    </h5>
                                    <p className="mt-0.5 text-xs whitespace-pre-wrap">
                                      {p.analisis_emocional_ia ?? "—"}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Análisis del histórico
                                    </h5>
                                    <p className="mt-0.5 text-xs whitespace-pre-wrap">
                                      {p.tendencia_ia ?? "—"}
                                    </p>
                                  </div>
                                </div>
                              </Section>

                              {/* 4. Tu día optimizado */}
                              {p.tareas_bloques.length > 0 && (
                                <Section
                                  titulo={`4. Tu día optimizado (${p.num_bloques_activos ?? p.tareas_bloques.length} de 4)`}
                                  emoji="⏱️"
                                >
                                  <ul className="space-y-1">
                                    {p.tareas_bloques.map((t) => (
                                      <li
                                        key={`${t.bloque_num}-${t.orden}`}
                                        className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-xs"
                                      >
                                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                          B{t.bloque_num}
                                        </span>
                                        <span className="flex-1 truncate">
                                          {t.titulo_libre ?? "—"}
                                        </span>
                                        {t.tipo_tarea && (
                                          <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            {t.tipo_tarea}
                                          </span>
                                        )}
                                        {t.tarea_id && (
                                          <span className="shrink-0 text-[10px] text-muted-foreground">
                                            📌
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </Section>
                              )}

                              {/* 5. Propuesta de comida */}
                              {p.comida_titulo && (
                                <Section titulo="5. Propuesta de comida" emoji="🍽️">
                                  <p className="text-sm font-medium">{p.comida_titulo}</p>
                                  {p.comida_descripcion && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {p.comida_descripcion}
                                    </p>
                                  )}
                                  {p.comida_motivo && (
                                    <p className="mt-1 text-xs italic text-muted-foreground">
                                      💡 {p.comida_motivo}
                                    </p>
                                  )}
                                </Section>
                              )}

                              {/* 6. Notas del día */}
                              {p.notas && (
                                <Section titulo="6. Notas del día" emoji="📓">
                                  <p className="text-xs whitespace-pre-wrap">{p.notas}</p>
                                </Section>
                              )}

                              {p.reflexion && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Ver reflexión libre
                                  </summary>
                                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                                    {p.reflexion}
                                  </p>
                                </details>
                              )}

                              <Link
                                href={`/plan-diario/detalle?id=${p.id}`}
                                className="text-xs text-primary underline underline-offset-4"
                              >
                                Ver plan completo (vista detalle) →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Section({
  emoji,
  titulo,
  children,
}: {
  emoji: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{emoji}</span>
        <span>{titulo}</span>
      </h4>
      {children}
    </div>
  );
}