"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchPlanCompleto } from "@/lib/queries";
import { guardarNotasPlan } from "@/lib/mutations";
import { informeToMarkdown } from "@/lib/plan";
import type {
  InformePlan,
  PlanDiario,
  PlanDiarioBloque,
  PlanDiarioBorrador,
  PlanDiarioSubtarea,
  PlanDiarioTarea,
} from "@/lib/types";

type PlanCompleto = PlanDiario & {
  tareas: (PlanDiarioTarea & {
    subtareas: PlanDiarioSubtarea[];
    borradores: PlanDiarioBorrador[];
  })[];
  bloques: PlanDiarioBloque[];
};

const SEM: Record<string, string> = {
  verde: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amarillo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rojo: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const SEM_FUERTE: Record<string, string> = {
  verde: "border-emerald-500/40 bg-emerald-500/5",
  amarillo: "border-amber-500/40 bg-amber-500/5",
  rojo: "border-red-500/40 bg-red-500/5",
};

export default function PlanDetallePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const [plan, setPlan] = useState<PlanCompleto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notas, setNotas] = useState("");
  const [notasEstado, setNotasEstado] = useState<
    | { status: "idle" }
    | { status: "guardando" }
    | { status: "guardado"; timestamp: number }
    | { status: "error"; mensaje: string }
  >({ status: "idle" });

  useEffect(() => {
    let alive = true;
    setCargando(true);
    fetchPlanCompleto(id)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          setError("Plan no encontrado");
          return;
        }
        setPlan(p as PlanCompleto);
        setNotas(p.notas ?? "");
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setCargando(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function guardarNotas() {
    if (!plan) return;
    setNotasEstado({ status: "guardando" });
    try {
      await guardarNotasPlan(plan.id, notas);
      setNotasEstado({ status: "guardado", timestamp: Date.now() });
    } catch (e) {
      setNotasEstado({ status: "error", mensaje: (e as Error).message });
    }
  }

  function descargarMd() {
    if (!plan || !plan.informe_json) return;
    const md = informeToMarkdown(
      plan.fecha,
      plan.fecha_larga ?? plan.fecha,
      plan.informe_json,
      plan.semaforo ?? "amarillo",
      plan.despertar,
      plan.mente,
      plan.cuerpo,
      plan.rueda,
      plan.necesidad,
      plan.resumen,
      plan.recomendacion,
      notas,
      plan.reflexion,
    );
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.fecha}-planificacion-diaria-gen${plan.num_generacion}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Cargando plan…</p>
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="space-y-4">
        <Link href="/plan-diario/historico" className="text-sm underline">
          ← Volver al histórico
        </Link>
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error ?? "Plan no encontrado"}
        </div>
      </div>
    );
  }

  // Si el plan NO tiene informe_json (planes antiguos o generaciones previas a v3)
  if (!plan.informe_json) {
    return (
      <div className="space-y-4">
        <Link href="/plan-diario/historico" className="text-sm underline">
          ← Volver al histórico
        </Link>
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Plan del {plan.fecha}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generación #{plan.num_generacion}</p>
        </header>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm">
            Este plan se generó con la versión anterior (sin informe completo).
          </p>
          {plan.resumen && (
            <>
              <h3 className="mt-3 text-sm font-semibold">Resumen</h3>
              <p className="mt-1 text-sm">{plan.resumen}</p>
            </>
          )}
          {plan.recomendacion && (
            <>
              <h3 className="mt-3 text-sm font-semibold">Recomendación</h3>
              <p className="mt-1 text-sm">{plan.recomendacion}</p>
            </>
          )}
          {plan.tareas.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold">Tareas</h3>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {plan.tareas.map((t) => (
                  <li key={t.id}>{t.titulo_libre ?? "—"}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  const inf: InformePlan = plan.informe_json;
  const semaforo = (plan.semaforo ?? "amarillo") as "verde" | "amarillo" | "rojo";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/plan-diario/historico" className="text-sm underline">
          ← Volver al histórico
        </Link>
        <button
          onClick={descargarMd}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          📄 Descargar .md
        </button>
      </div>

      <section className={`space-y-6 rounded-2xl border-2 bg-card p-6 ${SEM_FUERTE[semaforo]}`}>
        <header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                📅 {plan.fecha_larga ?? plan.fecha}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Generación #{plan.num_generacion} · {new Date(plan.reflexion ?? plan.id).toString().slice(0, 24)}
              </p>
            </div>
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${SEM[semaforo]}`}>
              {semaforo.toUpperCase()}
            </span>
          </div>
          <blockquote className="mt-3 rounded-md border-l-4 border-primary/60 bg-muted/30 px-4 py-2 text-sm italic">
            {inf.cabecera}
          </blockquote>
        </header>

        {/* Resumen ejecutivo (vista rápida) */}
        <Section titulo="⚡ Resumen ejecutivo">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-background p-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resumen
              </h3>
              <p className="text-sm leading-relaxed">{plan.resumen ?? "—"}</p>
            </div>
            <div className="rounded-md border border-border bg-background p-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recomendación
              </h3>
              <p className="text-sm leading-relaxed">{plan.recomendacion ?? "—"}</p>
            </div>
          </div>
        </Section>

        {/* Estado hoy */}
        <Section titulo="🌡️ Tu Estado Hoy">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border/60">
                {inf.estado_hoy.tabla.map((f, i) => (
                  <tr key={i}>
                    <td className="w-40 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {f.campo}
                    </td>
                    <td className="px-4 py-2">
                      <span className="mr-2 text-base">{f.emoji}</span>
                      {f.valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inf.estado_hoy.conexion_emocional && (
            <div className="mt-3 rounded-md border-l-4 border-violet-500/50 bg-violet-500/5 px-4 py-2 text-sm leading-relaxed">
              <strong>Conexión emocional:</strong> {inf.estado_hoy.conexion_emocional}
            </div>
          )}
        </Section>

        {/* Tendencia */}
        {inf.tendencia.registros.length > 0 && (
          <Section titulo="📈 Tendencia vs últimos registros">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Indicador</th>
                    {inf.tendencia.registros.map((r, i) => (
                      <th key={i} className="px-3 py-2 text-center">
                        {r.fecha}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">Tendencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(["despertar", "mente", "cuerpo", "rueda", "necesita"] as const).map(
                    (campo) => (
                      <tr key={campo}>
                        <td className="bg-muted/30 px-3 py-2 font-medium capitalize">{campo}</td>
                        {inf.tendencia.registros.map((r, i) => {
                          const rec = r as unknown as Record<string, unknown>;
                          return (
                            <td key={i} className="px-3 py-2 text-center text-[11px]">
                              {String(rec[campo] ?? "—")}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          {inf.tendencia.registros[inf.tendencia.registros.length - 1]
                            ?.tendencia_despertar ?? "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {inf.tendencia.lectura && (
              <p className="mt-3 text-sm leading-relaxed">{inf.tendencia.lectura}</p>
            )}
          </Section>
        )}

        {/* Lectura Psicológica */}
        <Section titulo="🧠 Lectura Psicológica">
          {inf.lectura_psicologica.estado_actual && (
            <SubSection titulo="Estado actual">
              <p className="text-sm leading-relaxed">{inf.lectura_psicologica.estado_actual}</p>
            </SubSection>
          )}
          {inf.lectura_psicologica.analisis_emocional && (
            <SubSection titulo="Análisis emocional">
              <p className="text-sm leading-relaxed">{inf.lectura_psicologica.analisis_emocional}</p>
            </SubSection>
          )}
          {inf.lectura_psicologica.recomendaciones_hoy.length > 0 && (
            <SubSection titulo="Recomendación psicológica — Para hoy">
              <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
                {inf.lectura_psicologica.recomendaciones_hoy.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </SubSection>
          )}
          {inf.lectura_psicologica.para_esta_semana.length > 0 && (
            <SubSection titulo="Para tener en cuenta (esta semana)">
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                {inf.lectura_psicologica.para_esta_semana.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </SubSection>
          )}
        </Section>

        {/* Conexión con tareas */}
        {inf.conexion_tareas.analisis_realismo.length > 0 && (
          <Section titulo="🎯 Cómo afecta a tus tareas">
            <SubSection titulo="Análisis de realismo">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Tarea</th>
                      <th className="px-3 py-2">¿Realista?</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {inf.conexion_tareas.analisis_realismo.map((x, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{x.tarea}</td>
                        <td className="px-3 py-2 text-center">
                          {x.realista_hoy === "si" ? "✅" : x.realista_hoy === "si_condiciones" ? "⚠️" : "❌"}
                        </td>
                        <td className="px-3 py-2 text-[11px]">{x.accion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>
            {inf.conexion_tareas.justificacion_3_tareas && (
              <div className="rounded-md border-l-4 border-amber-500/50 bg-amber-500/5 px-4 py-2 text-sm leading-relaxed">
                {inf.conexion_tareas.justificacion_3_tareas}
              </div>
            )}
          </Section>
        )}

        {/* Día optimizado */}
        <Section titulo="📋 Tu Día Optimizado">
          {inf.dia_optimizado.energia_disponible && (
            <p className="mb-2 text-sm">
              <strong>ENERGÍA DISPONIBLE:</strong> {inf.dia_optimizado.energia_disponible}
            </p>
          )}
          {inf.dia_optimizado.principio_hoy && (
            <p className="mb-3 text-sm italic text-muted-foreground">
              <strong>Principio hoy:</strong> {inf.dia_optimizado.principio_hoy}
            </p>
          )}
          {inf.dia_optimizado.horario.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Horario</th>
                    <th className="px-3 py-2">Bloque</th>
                    <th className="px-3 py-2">Tarea</th>
                    <th className="px-3 py-2">Por qué</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inf.dia_optimizado.horario.map((h, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{h.horario}</td>
                      <td className="px-3 py-2 text-[11px]">{h.bloque}</td>
                      <td className="px-3 py-2">{h.tarea}</td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">{h.por_que}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {inf.dia_optimizado.delegacion_ia.length > 0 && (
            <div className="mt-3 rounded-md border-l-4 border-fuchsia-500/50 bg-fuchsia-500/5 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
                🤖 Delegación IA
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {inf.dia_optimizado.delegacion_ia.map((d, i) => (
                  <li key={i}>
                    <strong>🔧 {d.que}</strong> — <span className="text-muted-foreground">{d.cuando_listo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* Clasificación */}
        <Section titulo="📊 Clasificación de Todas las tareas">
          {inf.clasificacion_tareas.del_dia.length > 0 && (
            <SubSection titulo={`🔴 Tareas del día (${inf.clasificacion_tareas.del_dia.length})`}>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Tarea</th>
                      <th className="px-3 py-2">Origen</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Bloque</th>
                      <th className="px-3 py-2 text-right">Tiempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {inf.clasificacion_tareas.del_dia.map((t, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-bold">{t.id ?? `T${i + 1}`}</td>
                        <td className="px-3 py-2 font-medium">{t.titulo}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.origen ?? "—"}</td>
                        <td className="px-3 py-2">{t.tipo ?? "—"}</td>
                        <td className="px-3 py-2">{t.bloque_energia ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {t.tiempo_min ? `${t.tiempo_min} min` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SubSection>
          )}
          {inf.clasificacion_tareas.pendientes_criticas.length > 0 && (
            <SubSection titulo="🟠 Pendientes críticas (próximos 7 días)">
              <TablaSencilla
                headers={["Tarea", "Deadline", "Notas"]}
                filas={inf.clasificacion_tareas.pendientes_criticas.map((t) => [
                  t.titulo,
                  t.deadline ?? "—",
                  t.notas ?? "—",
                ])}
              />
            </SubSection>
          )}
          {inf.clasificacion_tareas.programables.length > 0 && (
            <SubSection titulo="🟡 Programables (próxima semana)">
              <TablaSencilla
                headers={["Tarea", "Esfuerzo"]}
                filas={inf.clasificacion_tareas.programables.map((t) => [t.titulo, t.esfuerzo ?? "—"])}
              />
            </SubSection>
          )}
          {inf.clasificacion_tareas.backlog.length > 0 && (
            <SubSection titulo="⚪ Backlog">
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {inf.clasificacion_tareas.backlog.map((t, i) => (
                  <li key={i}>{t.titulo}</li>
                ))}
              </ul>
            </SubSection>
          )}
        </Section>

        {/* Recomendación estratégica */}
        {inf.recomendacion_estrategica.vs_plan_largo.length > 0 && (
          <Section titulo="🎯 Recomendación Estratégica del Día">
            <SubSection titulo="vs Plan a largo plazo">
              <TablaSencilla
                headers={["Tarea de hoy", "Meta estratégica", "Conexión"]}
                filas={inf.recomendacion_estrategica.vs_plan_largo.map((r) => [
                  r.tarea,
                  r.meta,
                  r.conexion,
                ])}
              />
            </SubSection>
            {inf.recomendacion_estrategica.si_estancas && (
              <SubSection titulo="Si te estancás">
                <p className="text-sm leading-relaxed">{inf.recomendacion_estrategica.si_estancas}</p>
              </SubSection>
            )}
          </Section>
        )}

        {/* Notas */}
        {inf.notas.length > 0 && (
          <Section titulo="📝 Notas">
            <div className="space-y-3">
              {inf.notas.map((n, i) => (
                <div key={i} className="rounded-md border border-border bg-background p-3">
                  <h4 className="text-sm font-semibold">
                    {i + 1}. {n.titulo}
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {n.texto}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Comida */}
        <Section titulo="🍽️ Propuesta de Comida">
          <SubSection titulo="🥗 Plato Base 1 — Desayuno">
            <p className="text-sm"><strong>Estructura:</strong> {inf.comida.plato_base_desayuno.estructura}</p>
            <p className="text-sm"><strong>Tiempo:</strong> {inf.comida.plato_base_desayuno.tiempo}</p>
            {inf.comida.plato_base_desayuno.variaciones.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm">
                {inf.comida.plato_base_desayuno.variaciones.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            {inf.comida.plato_base_desayuno.base_metabolica && (
              <p className="mt-2 text-xs italic text-muted-foreground">
                {inf.comida.plato_base_desayuno.base_metabolica}
              </p>
            )}
          </SubSection>
          <SubSection titulo="🥗 Plato Base 2 — Comida">
            <p className="text-sm"><strong>Estructura:</strong> {inf.comida.plato_base_comida.estructura}</p>
            <p className="text-sm"><strong>Tiempo:</strong> {inf.comida.plato_base_comida.tiempo}</p>
            {inf.comida.plato_base_comida.variaciones.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm">
                {inf.comida.plato_base_comida.variaciones.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
          </SubSection>
          {inf.comida.menu_familiar.length > 0 && (
            <SubSection titulo="🍴 Menú Familiar">
              <TablaSencilla
                headers={["Día", "Comida", "Cena"]}
                filas={inf.comida.menu_familiar.map((m) => [m.dia, m.comida, m.cena])}
              />
            </SubSection>
          )}
          {inf.comida.lista_compra.length > 0 && (
            <SubSection titulo="🛒 Lista de la Compra">
              <div className="space-y-2">
                {inf.comida.lista_compra.map((l, i) => (
                  <div key={i} className="rounded-md border border-border bg-background p-3">
                    <h5 className="text-sm font-semibold">{l.categoria}</h5>
                    <p className="mt-1 text-sm text-muted-foreground">{l.items}</p>
                  </div>
                ))}
              </div>
            </SubSection>
          )}
        </Section>
      </section>

      {/* Notas del día (editables) */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">📓 Notas del día</h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              className="min-h-[80px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value);
                if (notasEstado.status === "guardado") setNotasEstado({ status: "idle" });
              }}
              placeholder="Reflexiones al final del día…"
            />
            <button
              onClick={guardarNotas}
              disabled={notasEstado.status === "guardando"}
              className="h-fit rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
            >
              {notasEstado.status === "guardando" ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {notasEstado.status === "guardado" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              ✅ Guardado a las{" "}
              {new Date(notasEstado.timestamp).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {notasEstado.status === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              ❌ Error: {notasEstado.mensaje}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{titulo}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SubSection({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function TablaSencilla({ headers, filas }: { headers: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}