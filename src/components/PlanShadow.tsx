"use client";

// ============================================================================
// PlanShadow — MODO SOMBRA: la propuesta del sistema, sin escribir nada.
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un panel que muestra QUÉ PROPONDRÍA el motor de selección para hoy, con
//   el motivo de cada decisión, y lo compara con el plan que ya has hecho.
//
// POR QUÉ ESTÁ EN "SOMBRA"
//   Esta fase es de OBSERVACIÓN. El panel no escribe nada en la base de
//   datos: ni cambia estados, ni fechas, ni descarta tareas. Solo lee y
//   propone. La idea es ver durante unos días si el criterio acierta antes
//   de dejar que automatice.
//
//   Cuando estés conforme, la Fase siguiente guarda esta misma propuesta en
//   `plan_diario_tareas` (el motor es el mismo: solo cambia el destino del
//   resultado).
//
// LO QUE NO HACE
//   · No llama a la IA (la selección es determinista).
//   · No modifica ninguna tarea.
//   · No inventa importes, fechas ni prioridades.
//   · No esconde los riesgos: los avisos de pago se muestran siempre.
// ============================================================================

import { useMemo } from "react";
import {
  ETIQUETA_REGLA,
  TONO_REGLA,
  agruparDescartables,
  type PropuestaShadow,
} from "@/lib/recuperacion/shadow";
import type { TareaSeleccionada } from "@/lib/recuperacion/seleccion";
import { IconAlertTriangle, IconCheck, IconSparkles } from "@/components/icons";

const NIVEL_LABEL: Record<string, string> = {
  alta: "carga completa",
  media: "carga media",
  minima: "carga mínima",
};

const NIVEL_TONO: Record<string, string> = {
  alta: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  media: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  minima: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

/** Tarea de la propuesta con su chip de regla, su motivo y su tiempo. */
function TareaPropuesta({
  sel,
  destacada = false,
  enPlan = false,
}: {
  sel: TareaSeleccionada;
  destacada?: boolean;
  enPlan?: boolean;
}) {
  const { tarea, motivo, minutosEstimados } = sel;
  return (
    <li
      className={`rounded-lg border bg-background p-3 ${
        destacada ? "border-orange-500/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {tarea.titulo}
        </p>
        {minutosEstimados != null && (
          <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {minutosEstimados} min
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONO_REGLA[motivo.regla] ?? TONO_REGLA.mejora_no_urgente}`}
        >
          {ETIQUETA_REGLA[motivo.regla] ?? motivo.regla}
        </span>
        {enPlan && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            ✓ ya está en tu plan
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Por qué:</span>{" "}
        {motivo.motivo}
      </p>
      {motivo.detalle && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {motivo.detalle}
        </p>
      )}
    </li>
  );
}

/** Aviso de riesgo (pago vencido o próximo). Se muestra SIEMPRE. */
function Aviso({
  texto,
  nivel,
  detalle,
}: {
  texto: string;
  nivel: number;
  detalle?: string[];
}) {
  return (
    <li
      className={`rounded-lg border p-3 ${
        nivel === 0
          ? "border-red-500/30 bg-red-500/5"
          : nivel === 1
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-2 text-sm">
        <IconAlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            nivel === 0
              ? "text-red-600 dark:text-red-400"
              : nivel === 1
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          }`}
        />
        <span className="leading-relaxed">{texto}</span>
      </div>
      {detalle && detalle.length > 0 && (
        <details className="mt-2 pl-6">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Ver los {detalle.length} pagos uno a uno
          </summary>
          <ul className="mt-1.5 space-y-1">
            {detalle.map((d, i) => (
              <li key={i} className="text-xs leading-relaxed text-muted-foreground">
                · {d}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

export function PlanShadow({
  propuesta,
  cargando = false,
  error = null,
}: {
  propuesta: PropuestaShadow | null;
  cargando?: boolean;
  error?: string | null;
}) {
  // Comparación contra el plan actual: id → ¿ya estaba?
  const enPlan = useMemo(() => {
    const set = new Set(propuesta?.comparacion.coincide ?? []);
    return set;
  }, [propuesta]);

  // Las descartables agrupadas por categoría (hábitos / con fecha / sin
  // objetivo / otras). El useMemo va ANTES de los returns tempranos: los
  // hooks deben ejecutarse siempre en el mismo orden.
  const grupos = useMemo(
    () => agruparDescartables(propuesta?.resultado.descartables ?? []),
    [propuesta?.resultado.descartables],
  );

  if (cargando) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconSparkles className="h-4 w-4 animate-pulse" />
          Calculando la propuesta…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm text-red-700 dark:text-red-300">
          No se pudo calcular la propuesta: {error}
        </p>
      </section>
    );
  }

  if (!propuesta) return null;

  const { resultado, nivel, origenCapacidad, comparacion, resumen } = propuesta;
  const nada = resultado.plan.length === 0 && resultado.avisos.length === 0;

  return (
    <section className="rounded-2xl border-2 border-dashed border-sky-500/40 bg-gradient-to-br from-sky-500/5 to-cyan-500/5 p-5 sm:p-6">
      {/* ── Cabecera: qué es esto y qué NO hace ── */}
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
            <IconSparkles className="h-3 w-3" />
            Modo sombra · propuesta
          </span>
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${NIVEL_TONO[nivel]}`}
          >
            {NIVEL_LABEL[nivel]}
          </span>
          {origenCapacidad === "estimado" && (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              capacidad estimada
            </span>
          )}
          {origenCapacidad === "por_defecto" && (
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              capacidad por defecto
            </span>
          )}
        </div>

        <h2 className="mt-2.5 text-lg font-bold tracking-tight">
          Qué propondría el sistema para hoy
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {resumen}.{" "}
          <strong className="text-foreground">Esto no cambia nada</strong>:
          es una propuesta que se recalcula al entrar, sin tocar tus tareas,
          tus fechas ni tu plan. Sirve para comprobar si el criterio acierta
          antes de que automatice.
        </p>

        {comparacion.hayPlan && (
          <p className="mt-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Comparado con tu plan de hoy:</strong>{" "}
            {comparacion.coincide.length} coincidente
            {comparacion.coincide.length === 1 ? "" : "s"}
            {comparacion.soloMotor.length > 0 && (
              <> · {comparacion.soloMotor.length} solo el sistema</>
            )}
            {comparacion.soloPlan.length > 0 && (
              <> · {comparacion.soloPlan.length} solo tú</>
            )}
            .
          </p>
        )}
      </header>

      {nada ? (
        <p className="rounded-lg border border-border bg-background/70 p-4 text-sm text-muted-foreground">
          No hay nada que proponer hoy: no hay tareas activas que encajen en
          las reglas de selección.
        </p>
      ) : (
        <div className="space-y-4">
          {/* ── Riesgos: SIEMPRE visibles, aunque la carga esté mínima ── */}
          {resultado.avisos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                ⚠️ Riesgos que el sistema no silencia
              </h3>
              <ul className="space-y-2">
                {resultado.avisos.map((a, i) => (
                  <Aviso
                    key={`${a.tipo}-${i}`}
                    texto={a.texto}
                    nivel={a.nivel}
                    detalle={a.detalle}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* ── Tarea principal ── */}
          {resultado.principal && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                🔴 Tarea principal
              </h3>
              <ul className="space-y-2">
                <TareaPropuesta
                  sel={resultado.principal}
                  destacada
                  enPlan={enPlan.has(resultado.principal.tarea.id)}
                />
              </ul>
            </div>
          )}

          {/* ── Secundarias ── */}
          {resultado.secundarias.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                🟡 Tareas secundarias ({resultado.secundarias.length})
              </h3>
              <ul className="space-y-2">
                {resultado.secundarias.map((s) => (
                  <TareaPropuesta
                    key={s.tarea.id}
                    sel={s}
                    enPlan={enPlan.has(s.tarea.id)}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* ── Mantenimiento (opcional) ── */}
          {resultado.mantenimiento && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">🔧 Mantenimiento</h3>
              <ul className="space-y-2">
                <TareaPropuesta
                  sel={resultado.mantenimiento}
                  enPlan={enPlan.has(resultado.mantenimiento.tarea.id)}
                />
              </ul>
            </div>
          )}

          {/* ── Bienestar (sección propia: no compite con el trabajo) ── */}
          {resultado.bienestar && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">🌿 Tiempo personal</h3>
              <ul className="space-y-2">
                <TareaPropuesta
                  sel={resultado.bienestar}
                  enPlan={enPlan.has(resultado.bienestar.tarea.id)}
                />
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Este tiempo no cuenta como improductivo ni se descarta: es
                tiempo protegido.
              </p>
            </div>
          )}

          {/* ── Lo que NO entra hoy (para la revisión semanal) ── */}
          {grupos.length > 0 && (
            <details className="rounded-lg border border-border bg-background/60 p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                💤 {resultado.descartables.length} tarea
                {resultado.descartables.length === 1 ? "" : "s"} que hoy no
                entrarían
              </summary>
              <div className="mt-2 space-y-3">
                {grupos.map((g) => (
                  <div key={g.clave}>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {g.titulo} · {g.tareas.length}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {g.tareas.map((d) => (
                        <li
                          key={d.tarea.id}
                          className="text-xs leading-relaxed text-muted-foreground"
                        >
                          · <span className="font-medium text-foreground">
                            {d.tarea.titulo}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                No se descartan: solo se apartan del día. La revisión semanal
                propondrá qué hacer con ellas (mantener, programar, aplazar,
                delegar o descartar).
              </p>
            </details>
          )}

          {/* ── Pie: qué falta y por qué ── */}
          <footer className="rounded-lg border border-sky-500/20 bg-background/70 p-3">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>
                El criterio es determinista: mismas tareas → misma propuesta,
                siempre. No hay caja negra detrás. Lo que aún no hace es
                redactar el <em>primer paso concreto</em> ni el motivo en
                lenguaje natural — eso lo añadirá la IA, que sólo redactará
                sobre esta decisión ya tomada.
              </span>
            </p>
          </footer>
        </div>
      )}
    </section>
  );
}
