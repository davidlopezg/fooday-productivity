"use client";

// ============================================================================
// PasoTareas — el paso 5 del ritual semanal: EL INVENTARIO DE LA SEMANA
// (issue #96; reescrito sobre el issue #89).
// ----------------------------------------------------------------------------
// QUÉ HACE (5a)
//   Decides el inventario VIVO de la semana: qué tareas entran y en qué día.
//   Las candidatas NO son las 230 del inventario: son las de tus KRs en foco,
//   las WIG de tarea y las críticas/urgentes, más un buscador para añadir
//   cualquier otra. El objetivo de ~10 activas es ORIENTATIVO: avisa, no
//   bloquea.
//
// QUÉ HACE (5b)
//   El aviso de cobertura: de tus KRs en foco, ¿cuáles se han quedado sin
//   ninguna tarea en la semana? Se mide sobre lo elegido AQUÍ, no sobre lo
//   que hubiera repartido en /semana.
//
// QUÉ HACE (5c)
//   La rejilla de las 3 del día (en <RejillaTresPorDia />), alimentada por las
//   tareas de la semana.
//
// LA DIRECCIÓN
//   El ritual elige el inventario y reparte por días. /semana muestra y afina
//   ese reparto. Nunca al revés.
//
// LO QUE NO HACE
//   No escribe en BD: el paso guarda cuando pulsas "Guardar y continuar"
//   (como el resto del wizard). El texto vive en src/lib/ritual/semana.ts
//   (candidatas, objetivo) y src/lib/ritual/cobertura.ts (cobertura).
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Tarea } from "@/lib/types";
import {
  calcularCobertura,
  textoAvisoCobertura,
  type KrParaCobertura,
} from "@/lib/ritual/cobertura";
import {
  candidatasSemana,
  esActiva,
  estadoSemana,
  filtrarPorTexto,
  motivoCandidata,
  tareasPorDia,
  type PlanSemana,
  type TareaSemana,
} from "@/lib/ritual/semana";
import type { CandidataTresDelDia, SeleccionDia } from "@/lib/ritual/tresDelDia";
import { RejillaTresPorDia, type DiaRejilla } from "@/components/ritual/RejillaTresPorDia";
import type { DecisionTarea } from "@/lib/ritual/draft";

export type { DecisionTarea };

/** Abreviatura de los días para el selector (1=lunes .. 7=domingo). */
const CORTO_DIA: Record<number, string> = {
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
  7: "D",
};

/** Motivo de una candidata: por qué sale en la lista. */
const MOTIVO: Record<"foco" | "wig" | "urgente", { texto: string; clase: string }> = {
  foco: {
    texto: "de un KR en foco",
    clase: "border-primary/40 bg-primary/10 text-foreground",
  },
  wig: {
    texto: "WIG de tarea",
    clase: "border-fuchsia-500/40 bg-fuchsia-500/10 text-foreground",
  },
  urgente: {
    texto: "crítica o urgente",
    clase: "border-amber-500/40 bg-amber-500/10 text-foreground",
  },
};

export function PasoTareas({
  tareas,
  krsEnFoco,
  plan,
  onPlan,
  decisiones,
  onDecision,
  dias,
  seleccionPorDia,
  onSeleccion,
}: {
  tareas: Tarea[];
  /** Los KRs en foco de esta semana (para las candidatas y la cobertura). */
  krsEnFoco: KrParaCobertura[];
  /** El reparto por días de la semana (BD + borrador): tarea_id → día. */
  plan: PlanSemana;
  /** Poner una tarea en un día (o quitarla de la semana con `null`). */
  onPlan: (tareaId: string, dia: number | null) => void;
  /** Decisiones tomadas en el draft: tarea_id → estado. */
  decisiones: Record<string, DecisionTarea>;
  onDecision: (tareaId: string, decision: DecisionTarea) => void;
  /** Los 7 días de la semana (con su fecha). */
  dias: DiaRejilla[];
  /** Selección de las 3 del día por día. */
  seleccionPorDia: Record<number, SeleccionDia>;
  onSeleccion: (dia: number, seleccion: SeleccionDia) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  // Estado efectivo de cada tarea: el de la BD, con las decisiones del
  // draft por encima (lo que has decidido en esta pantalla manda).
  const estadoEfectivo = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tareas) m.set(t.id, t.estado);
    for (const [id, d] of Object.entries(decisiones)) {
      m.set(id, d === "activa" ? "pendiente" : d);
    }
    return m;
  }, [tareas, decisiones]);

  // Las tareas, en el formato que entiende el módulo puro.
  const tareasSemana: TareaSemana[] = useMemo(
    () =>
      tareas.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        estado: estadoEfectivo.get(t.id) ?? t.estado,
        es_wig: !!t.es_wig,
        prioridad: t.prioridad ?? null,
        resultado_periodo_id: t.resultado_periodo_id ?? null,
        deadline: t.deadline ?? null,
      })),
    [tareas, estadoEfectivo],
  );

  const porId = useMemo(
    () => new Map(tareasSemana.map((t) => [t.id, t])),
    [tareasSemana],
  );

  // ── 5a. La semana ────────────────────────────────────────────────────────
  const enSemana = useMemo(
    () => tareasPorDia(tareasSemana, plan),
    [tareasSemana, plan],
  );

  const candidatas = useMemo(
    () => candidatasSemana(tareasSemana, krsEnFoco).filter((t) => !(t.id in plan)),
    [tareasSemana, krsEnFoco, plan],
  );

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return [];
    return filtrarPorTexto(
      tareasSemana.filter((t) => !(t.id in plan) && esActiva(t)),
      q,
    ).slice(0, 20);
  }, [busqueda, tareasSemana, plan]);

  const estado = useMemo(() => {
    const todas = Object.keys(plan)
      .map((id) => porId.get(id))
      .filter((t): t is TareaSemana => !!t);
    return estadoSemana(todas);
  }, [plan, porId]);

  // ── 5b. Cobertura de los KRs en foco ─────────────────────────────────────
  const cobertura = useMemo(() => {
    const deLaSemana = Object.keys(plan)
      .map((id) => porId.get(id))
      .filter((t): t is TareaSemana => !!t)
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        resultado_periodo_id: t.resultado_periodo_id ?? null,
      }));
    return calcularCobertura(krsEnFoco, deLaSemana);
  }, [krsEnFoco, plan, porId]);

  const avisoCobertura = textoAvisoCobertura(cobertura);

  // ── 5c. Las 3 del día ────────────────────────────────────────────────────
  const candidatasPorDia = useMemo(() => {
    const m = new Map<number, CandidataTresDelDia[]>();
    for (const d of dias) m.set(d.dia, []);
    for (const [dia, lista] of enSemana) {
      m.set(
        dia,
        lista.map((t) => ({ id: t.id, titulo: t.titulo })),
      );
    }
    return m;
  }, [enSemana, dias]);

  return (
    <div className="space-y-5">
      {/* ── 5a. El inventario de la semana ─ */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight">
            🧺 Las tareas de esta semana
          </h3>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              estado.activas > 10
                ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {estado.mensaje}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta es la lista corta: lo que vas a hacer esta semana, con su día.
          El objetivo de ~10 es una guía, no un muro: puedes tener más si lo
          necesitas. Las tareas que apartes pasan a{" "}
          <strong className="text-foreground">En espera</strong> (vuelven) o a{" "}
          <strong className="text-foreground">Cancelada</strong> (no las harás).
        </p>

        {/* Las que ya están en la semana, por día */}
        <div className="mt-4 space-y-3">
          {dias.map((d) => {
            const lista = enSemana.get(d.dia) ?? [];
            if (lista.length === 0) return null;
            return (
              <div key={d.dia}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.nombre}
                  {d.hoy && (
                    <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium normal-case text-foreground">
                      hoy
                    </span>
                  )}
                </h4>
                <ul className="mt-1 space-y-1">
                  {lista.map((t) => {
                    const decision = decisiones[t.id];
                    return (
                    <li
                      key={t.id}
                      className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <span className="min-w-0 truncate">{t.titulo}</span>
                        {decision && (
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                              decision === "hecha"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                                : decision === "en_espera"
                                  ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                                  : "border-border bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {decision === "hecha"
                              ? "completada"
                              : decision === "en_espera"
                                ? "en espera"
                                : "cancelada"}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {decision ? (
                          <Boton
                            etiqueta="↩ Deshacer"
                            onClick={() => onDecision(t.id, "activa")}
                          />
                        ) : (
                          <>
                            <Boton
                              etiqueta="✓ Completar"
                              onClick={() => onDecision(t.id, "hecha")}
                            />
                            <Boton
                              etiqueta="⏸ En espera"
                              onClick={() => onDecision(t.id, "en_espera")}
                            />
                            <Boton
                              etiqueta="✗ Cancelar"
                              onClick={() => onDecision(t.id, "cancelada")}
                            />
                          </>
                        )}
                        <Boton
                          etiqueta="Quitar de la semana"
                          onClick={() => onPlan(t.id, null)}
                        />
                      </span>
                    </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {estado.total === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Todavía no hay tareas en la semana. Elige abajo unas cuantas o
              búscalas.
            </p>
          )}
        </div>

        {/* Candidatas: el pool focalizado */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Candidatas ({candidatas.length})
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Las de tus KRs en foco, las WIG de tarea y las críticas o
            urgentes. Elige el día de cada una y entra en la semana.
          </p>
          <ul className="mt-2 space-y-1">
            {candidatas.map((t) => (
              <li
                key={t.id}
                className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate">{t.titulo}</span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                      MOTIVO[motivoCandidata(t, krsEnFoco)].clase
                    }`}
                  >
                    {MOTIVO[motivoCandidata(t, krsEnFoco)].texto}
                  </span>
                </span>
                <SelectorDia
                  dias={dias}
                  alElegir={(dia) => onPlan(t.id, dia)}
                />
              </li>
            ))}
            {candidatas.length === 0 && (
              <li className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                No hay candidatas por aquí: tus KRs en foco no tienen tareas, o
                ya están todas en la semana. Búscalas abajo.
              </li>
            )}
          </ul>
        </div>

        {/* Buscador: cualquier otra tarea */}
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Añadir cualquier otra
          </h4>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca por título…"
            aria-label="Buscar una tarea para la semana"
            className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {busqueda.trim() !== "" && (
            <ul className="mt-2 space-y-1">
              {resultadosBusqueda.map((t) => (
                <li
                  key={t.id}
                  className="flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  <SelectorDia
                    dias={dias}
                    alElegir={(dia) => onPlan(t.id, dia)}
                  />
                </li>
              ))}
              {resultadosBusqueda.length === 0 && (
                <li className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                  Nada con «{busqueda.trim()}». Créala en /tareas.
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      {/* ── 5b. Cobertura de los KRs en foco ─ */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold tracking-tight">
          🎯 Cobertura de tus KRs en foco
        </h3>
        {krsEnFoco.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Esta semana no has elegido KRs en foco. Elige alguno en el paso 4
            (“KRs de la semana”) o en{" "}
            <Link href="/semana" className="underline underline-offset-4">
              /semana
            </Link>{" "}
            y sabrás en qué estás poniendo horas.
          </p>
        ) : (
          <>
            <ul className="mt-2 space-y-1.5 text-sm">
              {cobertura.map((c) => (
                <li key={c.krId} className="flex items-start gap-2">
                  <span aria-hidden>{c.vacio ? "⚠️" : "✅"}</span>
                  <span className="min-w-0">
                    <span
                      className={
                        c.vacio ? "font-medium text-amber-700 dark:text-amber-300" : undefined
                      }
                    >
                      {c.titulo}
                    </span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {c.vacio
                        ? "sin tareas en la semana"
                        : `${c.tareas} tarea${c.tareas === 1 ? "" : "s"}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {avisoCobertura && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {avisoCobertura} Añádelas arriba (busca por título) para que el
                foco tenga trabajo detrás.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── 5c. Las 3 del día ─ */}
      <section className="rounded-xl border border-border bg-card p-4">
        <RejillaTresPorDia
          dias={dias}
          candidatasPorDia={candidatasPorDia}
          seleccionPorDia={seleccionPorDia}
          onChange={onSeleccion}
        />
      </section>
    </div>
  );
}

// ── Selector de día ────────────────────────────────────────────────────────

function SelectorDia({
  dias,
  alElegir,
}: {
  dias: DiaRejilla[];
  alElegir: (dia: number) => void;
}) {
  return (
    <span className="flex shrink-0 gap-1">
      {dias.map((d) => (
        <button
          key={d.dia}
          type="button"
          onClick={() => alElegir(d.dia)}
          aria-label={`Poner en ${d.nombre}`}
          title={d.nombre}
          className="min-h-10 min-w-9 rounded-md border border-border bg-card px-1.5 py-1 text-xs hover:bg-accent"
        >
          {CORTO_DIA[d.dia]}
        </button>
      ))}
    </span>
  );
}

// ── Botón ───────────────────────────────────────────────────────────────────

function Boton({
  etiqueta,
  onClick,
}: {
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
    >
      {etiqueta}
    </button>
  );
}
