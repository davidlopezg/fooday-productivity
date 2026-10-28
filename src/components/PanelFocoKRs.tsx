"use client";

// ============================================================================
// PanelFocoKRs — "🎯 3 KRs de la semana" (migration 0033).
//
// POR QUÉ EXISTE
// -------------
// La cascada de la app es: meta → KR → tarea. Pero hasta ahora NADA
// conectaba el KR con el tiempo de trabajo: el trimestre decía "este
// resultado se entrega antes de Q3" y el salto documentado era meta → tarea.
// Este panel es el eslabón que falta: la CAPA DE EJECUCIÓN.
//
// DOS EJES TEMPORALES, NO UNO
// ---------------------------
//   · `periodos` (trimestre/mes) → VENTANA DE MEDICIÓN: cuándo se entrega.
//   · esta semana (ISO)          → VENTANA DE EJECUCIÓN: dónde pongo horas.
// El trimestre NO se sustituye. El panel solo dice "de tus KRs con la
// entrega en marcha, estos 3 son los de esta semana".
//
// LA REGLA DE CONTENCIÓN
// ---------------------
// Un KR solo puede entrar en el foco si alguno de sus periodos contiene la
// semana actual. Lo aplica la RPC en BD, no este componente. Efecto: lo
// caducado y lo prematuro se quedan fuera solos.
//
// LA IA SUGIERE, EL HUMANO DECIDE
// -------------------------------
// Mismo patrón que "✨ Sugerir 3 WIGs" de /metas: la IA propone con su
// razón (citando el dato: días restantes, diferencia de ritmo) y el
// usuario marca cuáles aplicar. Nunca escribe en BD sin confirmación.
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { IconSparkles, IconTarget, IconX } from "@/components/icons";
import type { KrCandidatoSemana, KrFocoConDetalle } from "@/lib/types";
import type { KrSugerido } from "@/lib/sugerirKRsSemanaIA";

const COLOR_ESTADO: Record<string, string> = {
  por_debajo: "text-red-600 dark:text-red-400",
  en_linea: "text-emerald-600 dark:text-emerald-400",
  por_encima: "text-sky-600 dark:text-sky-400",
  sin_datos: "text-muted-foreground",
};

const EMOJI_ESTADO: Record<string, string> = {
  por_debajo: "⚠️",
  en_linea: "✅",
  por_encima: "🚀",
  sin_datos: "·",
};

const LABEL_ESTADO: Record<string, string> = {
  por_debajo: "Por debajo del ritmo",
  en_linea: "En línea",
  por_encima: "Por encima",
  sin_datos: "Sin datos",
};

function pct(v: number) {
  return `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
}

// ----------------------------------------------------------------------------
// Panel principal — muestra el foco elegido + candidatos + botón de IA.
// ----------------------------------------------------------------------------

export function PanelFocoKRs({
  foco,
  candidatos,
  onAplicar,
  onQuitar,
  guardandoKrId,
  sugerencia,
  sugerenciaLoading,
  sugerenciaError,
  onPedirSugerencia,
  onCancelarSugerencia,
}: {
  foco: KrFocoConDetalle[];
  candidatos: KrCandidatoSemana[];
  onAplicar: (krId: string) => Promise<void>;
  onQuitar: (krId: string) => Promise<void>;
  guardandoKrId: string | null;
  sugerencia: KrSugerido[] | null;
  sugerenciaLoading: boolean;
  sugerenciaError: string | null;
  onPedirSugerencia: () => void;
  onCancelarSugerencia: () => void;
}) {
  const krIdsEnFoco = new Set(foco.map((f) => f.kr.id));
  // Candidatos que aún no están en el foco.
  const disponibles = candidatos.filter((c) => !krIdsEnFoco.has(c.kr.id));

  return (
    <section
      className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-500/10 to-violet-500/5 p-5"
      aria-label="KRs en foco esta semana"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <IconTarget className="h-5 w-5 text-sky-500" />
            KRs en foco — esta semana (máx 3)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Los 3 resultados medibles en los que pones horas esta semana.
            <strong className="text-foreground"> No sustituyen al trimestre</strong>:{" "}
            el trimestre dice <em>cuándo se entrega</em>; esto dice{" "}
            <em>en qué estás trabajando ahora</em>. Solo entran KRs cuya
            entrega está en marcha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold tabular-nums text-sky-700 dark:text-sky-300">
            {foco.length} / 3
          </span>
          <button
            type="button"
            onClick={onPedirSugerencia}
            disabled={sugerenciaLoading || disponibles.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-white hover:bg-sky-600 disabled:opacity-50"
            title="La IA elige 3 KRs por riesgo real (los que van por debajo del ritmo y con menos días restantes)"
          >
            <IconSparkles className="h-3.5 w-3.5" />
            {sugerenciaLoading ? "Pensando…" : "✨ Sugerir 3 KRs"}
          </button>
        </div>
      </header>

      {sugerenciaError && (
        <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {sugerenciaError}
        </p>
      )}

      {/* ── Foco actual ── */}
      {foco.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sky-500/30 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Todavía no has elegido el foco de esta semana. Pulsa{" "}
            <span className="font-medium text-foreground">✨ Sugerir 3 KRs</span>{" "}
            para que la IA elija por riesgo, o marca uno a mano abajo.
          </p>
          <p className="mt-2 text-xs">
            Sin foco semanal, la planificación del día cae en “por deadline”:
            funciona, pero no empuja tus metas.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {foco.map((f) => (
            <li
              key={f.kr.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-500/30 bg-background/80 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-700 dark:text-sky-300">
                {f.foco.orden}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.kr.titulo}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {f.meta.codigo ? `${f.meta.codigo} · ` : ""}
                  {f.meta.titulo}
                  {f.periodos[0] ? ` · ${f.periodos[0].nombre}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                {f.tareas_hechas}/{f.tareas.length} tareas
              </span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums">
                {pct(f.progreso)}
              </span>
              <button
                type="button"
                onClick={() => onQuitar(f.kr.id)}
                disabled={guardandoKrId === f.kr.id}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="Quitar del foco de esta semana"
              >
                {guardandoKrId === f.kr.id ? "…" : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Candidatos ── */}
      {disponibles.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            {disponibles.length} KR{disponibles.length === 1 ? "" : "s"} disponible
            {disponibles.length === 1 ? "" : "s"} para esta semana (de tus metas WIG)
            {" — ver"}
          </summary>
          <ul className="mt-3 space-y-2">
            {disponibles.map((c) => (
              <li
                key={c.kr.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.kr.titulo}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.meta.codigo ? `${c.meta.codigo} · ` : ""}
                    {c.meta.titulo}
                    {c.periodos[0] ? ` · ${c.periodos[0].nombre}` : ""}
                    {c.dias_restantes > 0
                      ? ` · quedan ${c.dias_restantes} días`
                      : " · vence esta semana"}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-medium ${COLOR_ESTADO[c.estado] ?? ""}`}
                  title={`Progreso ${pct(c.progreso)} vs esperado ${pct(c.progreso_esperado)}`}
                >
                  {EMOJI_ESTADO[c.estado] ?? "·"} {LABEL_ESTADO[c.estado] ?? ""}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {pct(c.progreso)} / {pct(c.progreso_esperado)}
                </span>
                <button
                  type="button"
                  onClick={() => onAplicar(c.kr.id)}
                  disabled={guardandoKrId === c.kr.id || foco.length >= 3}
                  className="shrink-0 rounded-md bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-500/25 disabled:opacity-50 dark:text-sky-300"
                  title="Añadir al foco de esta semana"
                >
                  {guardandoKrId === c.kr.id ? "…" : "Añadir"}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {candidatos.length === 0 && foco.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          No hay KRs en ventana esta semana. Suele significar una de dos cosas:
          (a) tus metas WIG no tienen KRs planificados — pásate por{" "}
          <Link
            href="/metas"
            className="font-medium underline underline-offset-4"
          >
            /metas
          </Link>{" "}
          y genera el plan; o (b) sus periodos ya caducaron — toca re-planificarlos
          en el detalle de la meta.
        </p>
      )}

      {sugerencia !== null && (
        <ModalSugerenciaKRs
          sugerencia={sugerencia}
          candidatos={candidatos}
          krIdsEnFoco={krIdsEnFoco}
          guardandoKrId={guardandoKrId}
          onAplicar={onAplicar}
          onCancelar={onCancelarSugerencia}
        />
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Modal de sugerencias — la IA propone, el humano marca.
// ----------------------------------------------------------------------------

function ModalSugerenciaKRs({
  sugerencia,
  candidatos,
  krIdsEnFoco,
  guardandoKrId,
  onAplicar,
  onCancelar,
}: {
  sugerencia: KrSugerido[];
  candidatos: KrCandidatoSemana[];
  krIdsEnFoco: Set<string>;
  guardandoKrId: string | null;
  onAplicar: (krId: string) => Promise<void>;
  onCancelar: () => void;
}) {
  const porId = new Map(candidatos.map((c) => [c.kr.id, c]));
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () => new Set(sugerencia.map((s) => s.kr_id)),
  );

  async function aplicarMarcados() {
    for (const id of seleccionados) {
      await onAplicar(id);
    }
    onCancelar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancelar} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSparkles className="h-4 w-4 text-sky-500" />
            Sugerencias de KRs para la semana
          </h2>
          <button
            onClick={onCancelar}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {sugerencia.length === 0 ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              La IA no propuso ningún KR válido. Suele pasar si los KRs no tienen
              periodos dentro de esta semana. Elige a mano de la lista de
              disponibles.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Estos son mis 3 candidatos para esta semana, ordenados por{" "}
                <strong>riesgo real</strong> (los que van por debajo del ritmo y
                tienen menos días restantes). <strong>Solo sugiero</strong>; tú
                decides cuáles aplicar.
              </p>
              <ul className="space-y-3">
                {sugerencia.map((s, idx) => {
                  const c = porId.get(s.kr_id);
                  if (!c) return null;
                  const yaEnFoco = krIdsEnFoco.has(s.kr_id);
                  const marcado = seleccionados.has(s.kr_id);
                  return (
                    <li
                      key={s.kr_id}
                      className={`rounded-lg border p-4 transition-colors ${
                        marcado
                          ? "border-sky-500/40 bg-sky-500/5"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (yaEnFoco) return;
                            setSeleccionados((prev) => {
                              const next = new Set(prev);
                              if (next.has(s.kr_id)) next.delete(s.kr_id);
                              else next.add(s.kr_id);
                              return next;
                            });
                          }}
                          disabled={yaEnFoco}
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-xs disabled:opacity-50"
                          aria-label={marcado ? "Desmarcar" : "Marcar"}
                        >
                          {yaEnFoco ? "✓" : marcado ? "✓" : ""}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{c.meta.codigo ?? "—"}</span>
                            <span
                              className={`font-medium ${COLOR_ESTADO[c.estado] ?? ""}`}
                            >
                              {EMOJI_ESTADO[c.estado] ?? "·"}{" "}
                              {LABEL_ESTADO[c.estado] ?? ""}
                            </span>
                            {c.periodos[0] && (
                              <span>{c.periodos[0].nombre}</span>
                            )}
                            {yaEnFoco && (
                              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                                YA EN FOCO
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1 font-semibold tracking-tight">
                            {c.kr.titulo}
                          </h3>
                          <p className="mt-2 rounded-md border-l-2 border-sky-500/40 bg-sky-500/5 px-3 py-2 text-sm italic text-foreground/90">
                            {s.razon}
                          </p>
                          <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
                            Progreso {pct(c.progreso)} · esperado{" "}
                            {pct(c.progreso_esperado)} ·{" "}
                            {c.tareas.filter((t) => t.estado === "hecha").length}/
                            {c.tareas.length} tareas
                          </p>
                        </div>
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-700 dark:text-sky-300">
                          {idx + 1}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <p className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            💡 El cap de 3 y la regla “solo KRs con entrega en marcha” los
            impone la base de datos, no esta pantalla. Si un KR está fuera de
            ventana, no se puede añadir.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onCancelar}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cerrar
          </button>
          <button
            onClick={aplicarMarcados}
            disabled={seleccionados.size === 0 || guardandoKrId !== null}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {guardandoKrId !== null
              ? "Aplicando…"
              : `Aplicar ${seleccionados.size} marcado${seleccionados.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
