"use client";

// ============================================================================
// PanelWigKrs.tsx — el panel de WIGs de KR (capa intermedia, issue #49).
//
// QUÉ MUESTRA
//   · Los 1-3 KRs marcados como WIG (máx 3, cap impuesto por la BD).
//   · De cada uno, su META y su ENTREGA (trimestre/mes): sin eso el
//     nombre del KR no dice a qué resultado apunta.
//
// POR QUÉ EXISTE
//   Las metas y las tareas ya tienen su capa de WIG (paneles violeta y
//   fucsia). Los KRs —la capa medible que hay ENTRE las dos— no tenían
//   ninguna: en /krs no se podía marcar "este resultado es el que más
//   importa del ciclo". Solo existía el FOCO SEMANAL (migration 0033),
//   que es otra cosa: dice dónde pones horas ESTA semana y rota solo.
//
// DIFERENCIA CON EL FOCO SEMANAL (que también está en /krs)
//   · WIG de KR  → el resultado que importa en el CICLO (permanece).
//   · Foco semanal → dónde pones horas ESTA semana (rota cada semana).
//   Los dos paneles conviven: el celeste de arriba es el foco semanal,
//   este es el WIG del ciclo.
// ============================================================================

import Link from "next/link";
import { IconTarget } from "@/components/icons";
import type { KrOverview } from "@/lib/types";

export function PanelWigKrs({
  wigs,
  onQuitar,
  guardandoId,
}: {
  wigs: KrOverview[];
  onQuitar: (krId: string) => void;
  guardandoId: string | null;
}) {
  return (
    <section
      className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-sky-500/5 p-5"
      aria-label="WIGs de key results"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <IconTarget className="h-5 w-5 text-violet-500" />
            WIGs — KRs del ciclo (máx 3)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Los 3 resultados clave más importantes del ciclo: el eslabón
            medible entre tus metas WIG y las tareas que los sostienen. Pulsa
            la{" "}
            <span className="font-medium text-foreground">diana 🎯</span> en
            una fila para ascenderlo.
          </p>
        </div>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold tabular-nums text-violet-700 dark:text-violet-300">
          {wigs.length} / 3
        </span>
      </header>

      {wigs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-violet-500/30 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Todavía no has marcado ningún KR como WIG. Pulsa la{" "}
            <span className="font-medium text-foreground">diana 🎯</span> en
            un KR para ascenderlo como Enormemente Importante.
          </p>
          <p className="mt-2 text-xs">
            Empieza por 1: el resultado que, si avanza, hace avanzar la meta.
            El foco de la semana es otra cosa (y se elige en /semana).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {wigs.map((w) => (
            <li
              key={w.kr.id}
              className="rounded-lg border border-violet-500/30 bg-background/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">
                  {w.kr.wig_orden ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  {w.meta ? (
                    <Link
                      href={`/metas/detalle?id=${w.meta.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {w.kr.titulo}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-medium">
                      {w.kr.titulo}
                    </span>
                  )}
                  <p className="truncate text-[11px] text-muted-foreground">
                    {w.meta ? (
                      <>
                        {w.meta.codigo ? `${w.meta.codigo} · ` : ""}
                        {w.meta.titulo}
                      </>
                    ) : (
                      "sin meta (huérfano)"
                    )}
                    {w.periodos.length > 0 && (
                      <> · {w.periodos.map((p) => p.nombre).join(" · ")}</>
                    )}
                  </p>
                </div>
                <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                  {w.tareas_hechas}/{w.total_tareas}
                </span>
                <button
                  type="button"
                  onClick={() => onQuitar(w.kr.id)}
                  disabled={guardandoId === w.kr.id}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                  title="Quitar de WIG"
                >
                  {guardandoId === w.kr.id ? "…" : "Quitar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
