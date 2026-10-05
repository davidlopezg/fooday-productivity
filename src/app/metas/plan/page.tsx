"use client";

import Link from "next/link";
import { useState } from "react";
import { fetchPlanTrimestral } from "@/lib/queries";
import { ensurePeriodosAnio } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { Meta, Periodo, ResultadoPeriodo, Tarea } from "@/lib/types";
import { IconArrowLeft, IconPlus } from "@/components/icons";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";

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

// ---------------------------------------------------------------------------
// Scorecard de KR con proyección lineal
// ---------------------------------------------------------------------------
// El pilar 2 dice: las metas específicas funcionan como "puntos de
// referencia internos". Para que el punto de referencia sea VISIBLE
// calculamos:
//   1. progreso_actual  = valor_actual / valor_objetivo
//   2. progreso_esperado = (dias_transcurridos / dias_totales) del periodo
//   3. proyeccion = actual * (es_dias_totales / es_dias_transcurridos)
//      (si seguimos a este ritmo, ¿a qué llegaremos al final del periodo?)
// Devolvemos un semáforo: por_debajo / en_linea / por_encima / sin_datos
// para que el usuario vea de un vistazo si está en track.
// ---------------------------------------------------------------------------
type EstadoKR = "por_debajo" | "en_linea" | "por_encima" | "sin_datos";

function scorecardKR(
  r: ResultadoPeriodo,
  periodo: Periodo,
): {
  progreso: number;       // 0..1
  progresoEsperado: number; // 0..1
  proyeccion: number | null;
  estado: EstadoKR;
  diferencia: number;     // % sobre o bajo lo esperado
} {
  const obj = r.valor_objetivo;
  const act = r.valor_actual ?? 0;
  if (obj == null || obj === 0) {
    return { progreso: 0, progresoEsperado: 0, proyeccion: null, estado: "sin_datos", diferencia: 0 };
  }
  const progreso = Math.max(0, Math.min(1, act / obj));
  const inicio = new Date(periodo.fecha_inicio + "T00:00:00");
  const fin = new Date(periodo.fecha_fin + "T00:00:00");
  const hoy = new Date();
  const diasTotales = Math.max(1, (fin.getTime() - inicio.getTime()) / 86_400_000);
  const diasTrans = Math.max(0, Math.min(diasTotales, (hoy.getTime() - inicio.getTime()) / 86_400_000));
  const progresoEsperado = diasTrans / diasTotales;

  // Proyección lineal al ritmo actual
  const proyeccion = diasTrans > 7 ? (act * diasTotales) / diasTrans : null;

  let estado: EstadoKR = "en_linea";
  if (progreso < progresoEsperado - 0.1) estado = "por_debajo";
  else if (progreso > progresoEsperado + 0.1) estado = "por_encima";

  const diferencia = Math.round((progreso - progresoEsperado) * 100);
  return { progreso, progresoEsperado, proyeccion, estado, diferencia };
}

const COLOR_ESTADO: Record<EstadoKR, string> = {
  por_debajo: "text-red-600 dark:text-red-400",
  en_linea: "text-emerald-600 dark:text-emerald-400",
  por_encima: "text-sky-600 dark:text-sky-400",
  sin_datos: "text-muted-foreground",
};

const EMOJI_ESTADO: Record<EstadoKR, string> = {
  por_debajo: "⚠️",
  en_linea: "✅",
  por_encima: "🚀",
  sin_datos: "·",
};

const LABEL_ESTADO: Record<EstadoKR, string> = {
  por_debajo: "Por debajo del ritmo",
  en_linea: "En línea",
  por_encima: "Por encima",
  sin_datos: "Sin objetivo numérico",
};

function ScorecardKR({
  resultado,
  periodo,
}: {
  resultado: ResultadoPeriodo;
  periodo: Periodo;
}) {
  const s = scorecardKR(resultado, periodo);
  return (
    <div className="mt-2 rounded-md border border-dashed border-border bg-background/50 p-2 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Scorecard</span>
        <span className={`font-medium ${COLOR_ESTADO[s.estado]}`}>
          {EMOJI_ESTADO[s.estado]} {LABEL_ESTADO[s.estado]}
        </span>
      </div>
      {s.estado !== "sin_datos" && (
        <>
          <div className="mt-1.5 grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">Actual</div>
              <div className="font-bold tabular-nums">{pct(s.progreso)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Esperado</div>
              <div className="font-bold tabular-nums">{pct(s.progresoEsperado)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">Diferencia</div>
              <div className={`font-bold tabular-nums ${COLOR_ESTADO[s.estado]}`}>
                {s.diferencia > 0 ? "+" : ""}{s.diferencia}%
              </div>
            </div>
          </div>
          {/* Barra compuesta: actual vs esperado */}
          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
              style={{ width: `${s.progreso * 100}%` }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-amber-500"
              style={{ left: `${s.progresoEsperado * 100}%` }}
              aria-label="marca de progreso esperado"
            />
          </div>
          {s.proyeccion !== null && resultado.valor_objetivo != null && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              A este ritmo llegarás a{" "}
              <span className="font-medium tabular-nums">
                {Math.round(s.proyeccion)}
                {resultado.unidad ?? ""}
              </span>
              {" "}/{" "}
              <span className="tabular-nums">
                {resultado.valor_objetivo}{resultado.unidad ?? ""}
              </span>
              {" "}al final del trimestre.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PlanTrimestralPage() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [creandoPeriodos, setCreandoPeriodos] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  const planQ = useData<{
    periodos: Periodo[];
    porTrimestre: Map<string, Array<{ meta: Meta; resultado: ResultadoPeriodo; tareas: Tarea[] }>>;
  }>(
    async () => fetchPlanTrimestral(anio),
    { periodos: [], porTrimestre: new Map() },
    [anio],
  );

  const aniosPosibles = (() => {
    const a = new Date().getFullYear();
    return [a - 1, a, a + 1];
  })();

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
          <h1 className="text-2xl font-bold tracking-tight">Plan trimestral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista Q1–Q4 con los resultados esperados y su progreso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Plan trimestral" items={AYUDA_POR_RUTA["/metas/plan"]?.items ?? []} />
          <label className="flex items-center gap-2 text-sm">
          <span className="text-xs text-muted-foreground">Año</span>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {aniosPosibles.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        </div>
      </header>

      {planQ.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : planQ.error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-sm">
          Error: {planQ.error}
        </div>
      ) : (planQ.data?.periodos.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay trimestres creados para {anio}. El plan trimestral necesita
            los 4 periodos (Q1–Q4) para poder mostrar resultados y scorecards.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Es un paso único. Luego puedes añadir resultados a cada trimestre
            desde el detalle de cada meta.
          </p>
          <button
            type="button"
            disabled={creandoPeriodos}
            onClick={async () => {
              setCreandoPeriodos(true);
              setErrorCrear(null);
              try {
                await ensurePeriodosAnio(anio);
                await planQ.reload();
              } catch (e) {
                setErrorCrear(
                  e instanceof Error
                    ? e.message
                    : "No se pudieron crear los trimestres",
                );
              } finally {
                setCreandoPeriodos(false);
              }
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            {creandoPeriodos ? "Creando…" : `Crear Q1–Q4 de ${anio}`}
          </button>
          {errorCrear && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              {errorCrear}
            </p>
          )}
          <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            ¿Prefieres empezar por una meta?{" "}
            <Link
              href="/metas/nueva"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Crea una meta con trimestres auto-generados
            </Link>
            .
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(planQ.data?.periodos ?? []).map((p) => {
            const items = planQ.data?.porTrimestre.get(p.id) ?? [];
            const totalTareas = items.reduce((acc, x) => acc + x.tareas.length, 0);
            const hechas = items.reduce(
              (acc, x) => acc + x.tareas.filter((t) => t.estado === "hecha").length,
              0,
            );
            const prog = totalTareas === 0 ? 0 : hechas / totalTareas;
            return (
              <section
                key={p.id}
                className="flex min-h-[200px] flex-col rounded-xl border border-border bg-card p-4"
              >
                <header className="mb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold tracking-tight">{p.nombre}</h2>
                    <span className="text-[11px] text-muted-foreground">
                      {p.fecha_inicio} → {p.fecha_fin}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {hechas}/{totalTareas} tareas
                    </span>
                    <span className="tabular-nums">{pct(prog)}</span>
                  </div>
                  <div className="mt-1">
                    <MiniBar value={prog} />
                  </div>
                </header>

                {items.length === 0 ? (
                  <p className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                    Sin resultados en este trimestre.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {items.map(({ meta, resultado, tareas }) => {
                      const rh = tareas.filter((t) => t.estado === "hecha").length;
                      const rt = tareas.length;
                      const rp = rt === 0 ? 0 : rh / rt;
                      return (
                        <li
                          key={resultado.id}
                          className="rounded-md border border-border bg-muted/20 p-2"
                        >
                          <Link
                            href={`/metas/detalle?id=${meta.id}`}
                            className="block text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            {meta.codigo ?? "—"} · {meta.titulo}
                          </Link>
                          <p className="mt-0.5 text-sm font-medium">
                            {resultado.titulo}
                          </p>
                          {resultado.metrica && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {resultado.metrica}
                              {resultado.valor_objetivo != null &&
                                ` · objetivo ${resultado.valor_objetivo}${resultado.unidad ?? ""}`}
                            </p>
                          )}
                          {rt > 0 && (
                            <div className="mt-1.5">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>
                                  {rh}/{rt}
                                </span>
                                <span className="tabular-nums">{pct(rp)}</span>
                              </div>
                              <MiniBar value={rp} />
                            </div>
                          )}
                          <ScorecardKR resultado={resultado} periodo={p} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
