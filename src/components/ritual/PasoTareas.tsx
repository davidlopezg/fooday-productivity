"use client";

// ============================================================================
// PasoTareas — el paso 5 del ritual semanal: el INVENTARIO DE TAREAS
// (issue #89).
// ----------------------------------------------------------------------------
// QUÉ HACE (5a)
//   Revisa el inventario de tareas de la semana: marcar como completada,
//   bajar a En espera o cancelar. Y avisa del CUPO DE 10 activas: el límite
//   lo impone la BD (trigger de la migration 0043), aquí solo se informa.
//
// QUÉ HACE (5b)
//   El aviso de cobertura: de tus KRs en foco, ¿cuáles se han quedado sin
//   ninguna tarea esta semana? Es el último control del ritual: un foco sin
//   tareas es un foco que no empuja nada.
//
// QUÉ HACE (5c)
//   La rejilla de las 3 del día (en <RejillaTresPorDia />).
//
// LO QUE NO HACE
//   No escribe en BD: el paso guarda cuando pulsas "Guardar y continuar"
//   (como el resto del wizard). El texto vive en src/lib/ritualSemanal.ts
//   (cupo) y src/lib/ritual/cobertura.ts (cobertura).
// ============================================================================

import { useMemo } from "react";
import Link from "next/link";
import type { PlanSemanalTarea, Tarea } from "@/lib/types";
import { estadoCupo } from "@/lib/ritualSemanal";
import {
  calcularCobertura,
  textoAvisoCobertura,
  type KrParaCobertura,
} from "@/lib/ritual/cobertura";
import type { CandidataTresDelDia, SeleccionDia } from "@/lib/ritual/tresDelDia";
import { RejillaTresPorDia, type DiaRejilla } from "@/components/ritual/RejillaTresPorDia";
import type { DecisionTarea } from "@/lib/ritual/draft";

export type { DecisionTarea };

export function PasoTareas({
  tareas,
  planSemanal,
  krsEnFoco,
  decisiones,
  onDecision,
  dias,
  candidatasPorDia,
  seleccionPorDia,
  onSeleccion,
}: {
  tareas: Tarea[];
  /** Asignaciones tarea↔día de esta semana (plan_semanal_tareas). */
  planSemanal: PlanSemanalTarea[];
  /** Los KRs en foco de esta semana (para el aviso de cobertura). */
  krsEnFoco: KrParaCobertura[];
  /** Decisiones tomadas en el draft: tarea_id → estado. */
  decisiones: Record<string, DecisionTarea>;
  onDecision: (tareaId: string, decision: DecisionTarea) => void;
  /** Los 7 días de la semana (con su fecha). */
  dias: DiaRejilla[];
  /** Candidatas por día (tareas repartidas en /semana). */
  candidatasPorDia: Map<number, CandidataTresDelDia[]>;
  /** Selección de las 3 del día por día. */
  seleccionPorDia: Record<number, SeleccionDia>;
  onSeleccion: (dia: number, seleccion: SeleccionDia) => void;
}) {
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

  const cupo = useMemo(
    () =>
      estadoCupo(
        [...tareas].map((t) => ({
          estado: (estadoEfectivo.get(t.id) ?? t.estado) as Tarea["estado"],
        })),
      ),
    [tareas, estadoEfectivo],
  );

  const grupos = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const activas: Tarea[] = [];
    const completadas: Tarea[] = [];
    const espera: Tarea[] = [];
    const canceladas: Tarea[] = [];
    for (const t of tareas) {
      const e = estadoEfectivo.get(t.id) ?? t.estado;
      if (e === "hecha") {
        // Solo las completadas HOY: la revisión es de esta sesión, no un
        // histórico de todo lo hecho desde que existe la app.
        if (decisiones[t.id] === "hecha" || (t.completada_at ?? "").slice(0, 10) === hoy) {
          completadas.push(t);
        }
      } else if (e === "en_espera") espera.push(t);
      else if (e === "cancelada") canceladas.push(t);
      else if (e === "archivada" || e === "descartada") continue;
      else activas.push(t);
    }
    const porTitulo = (a: Tarea, b: Tarea) => a.titulo.localeCompare(b.titulo);
    return {
      activas: activas.sort(porTitulo),
      completadas: completadas.sort(porTitulo),
      espera: espera.sort(porTitulo),
      canceladas: canceladas.sort(porTitulo),
    };
  }, [tareas, estadoEfectivo, decisiones]);

  // ── Cobertura de los KRs en foco (5b) ───────────────────────────────────
  const cobertura = useMemo(() => {
    const tareasPorId = new Map(tareas.map((t) => [t.id, t]));
    const deLaSemana = planSemanal
      .map((a) => tareasPorId.get(a.tarea_id))
      .filter((t): t is Tarea => !!t)
      .map((t) => ({
        id: t.id,
        titulo: t.titulo,
        resultado_periodo_id: t.resultado_periodo_id ?? null,
      }));
    return calcularCobertura(krsEnFoco, deLaSemana);
  }, [krsEnFoco, planSemanal, tareas]);

  const avisoCobertura = textoAvisoCobertura(cobertura);

  return (
    <div className="space-y-5">
      {/* ── 5a. Inventario ── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight">
            🧺 Revisión del inventario
          </h3>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              cupo.excedido || cupo.libres === 0
                ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {cupo.mensaje}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca lo que ya está hecho, aparta lo que no quieres esta semana y
          cancela lo que no vas a hacer. El límite de{" "}
          {cupo.cupo} tareas activas lo impone la base de datos: la pantalla
          solo te informa.
        </p>

        <GrupoTareas
          titulo={`Activas (${grupos.activas.length})`}
          tareas={grupos.activas}
          vacio="No hay tareas activas."
          onDecision={onDecision}
          decisiones={decisiones}
        />
        <GrupoTareas
          titulo={`Completadas (${grupos.completadas.length})`}
          tareas={grupos.completadas}
          vacio="Nada completado todavía."
          onDecision={onDecision}
          decisiones={decisiones}
        />
        <GrupoTareas
          titulo={`En espera (${grupos.espera.length})`}
          tareas={grupos.espera}
          vacio="Nada en espera."
          onDecision={onDecision}
          decisiones={decisiones}
          tono="espera"
        />
        <GrupoTareas
          titulo={`Canceladas (${grupos.canceladas.length})`}
          tareas={grupos.canceladas}
          vacio="Nada cancelado."
          onDecision={onDecision}
          decisiones={decisiones}
          tono="cancelada"
        />
      </section>

      {/* ── 5b. Cobertura de los KRs en foco ── */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold tracking-tight">
          🎯 Cobertura de tus KRs en foco
        </h3>
        {krsEnFoco.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Esta semana no has elegido KRs en foco.{" "}
            <Link href="/semana" className="underline underline-offset-4">
              Elige alguno en /semana
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
                        ? "sin tareas esta semana"
                        : `${c.tareas} tarea${c.tareas === 1 ? "" : "s"}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {avisoCobertura && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {avisoCobertura} Repártelas en{" "}
                <Link href="/semana" className="underline underline-offset-4">
                  /semana
                </Link>
                .
              </p>
            )}
          </>
        )}
      </section>

      {/* ── 5c. Las 3 del día ── */}
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

// ── Grupo de tareas ────────────────────────────────────────────────────────

function GrupoTareas({
  titulo,
  tareas,
  vacio,
  onDecision,
  decisiones,
  tono,
}: {
  titulo: string;
  tareas: Tarea[];
  vacio: string;
  onDecision: (tareaId: string, decision: DecisionTarea) => void;
  decisiones: Record<string, DecisionTarea>;
  tono?: "espera" | "cancelada";
}) {
  if (tareas.length === 0) {
    return (
      <div className="mt-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {titulo}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">{vacio}</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {titulo}
      </h4>
      <ul className="mt-1 space-y-1">
        {tareas.slice(0, 30).map((t) => (
          <li
            key={t.id}
            className={`flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              tono === "cancelada"
                ? "border-border bg-muted/20 text-muted-foreground"
                : tono === "espera"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-border bg-background"
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
            <span className="flex shrink-0 gap-1">
              {tono ? (
                <Boton
                  etiqueta="Volver a activa"
                  onClick={() => onDecision(t.id, "activa")}
                />
              ) : (
                <>
                  <Boton etiqueta="✓ Completar" onClick={() => onDecision(t.id, "hecha")} />
                  <Boton etiqueta="⏸ En espera" onClick={() => onDecision(t.id, "en_espera")} />
                  <Boton etiqueta="✗ Cancelar" onClick={() => onDecision(t.id, "cancelada")} />
                </>
              )}
              {decisiones[t.id] && tono === undefined && (
                <Boton
                  etiqueta="Deshacer"
                  onClick={() => onDecision(t.id, "activa")}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
      {tareas.length > 30 && (
        <p className="mt-1 text-xs text-muted-foreground">
          y {tareas.length - 30} más ·{" "}
          <Link href="/tareas" className="underline underline-offset-4">
            verlas en /tareas
          </Link>
        </p>
      )}
    </div>
  );
}

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
