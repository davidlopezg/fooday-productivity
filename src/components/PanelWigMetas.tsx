"use client";

// ============================================================================
// PanelWigMetas.tsx — el panel de WIGs de META + sus KRs.
//
// COMPARTIDO entre /metas y /tareas (a petición de David: "añadir encima
// de la tabla los wigs y kresults igual que tenemos en metas"). Antes este
// panel vivía dentro de /metas/page.tsx y no se podía reutilizar.
//
// QUÉ MUESTRA (la capa de foco de 4DX)
//   · Las 1-3 metas marcadas como WIG (máx 3, cap impuesto por la BD).
//   · De cada una, SUS KRs con el periodo de entrega y el valor actual
//     frente al objetivo — que es lo que hace útil el panel: no solo
//     "en qué meta estás", sino "qué resultado concreto está advancing".
//
// POR QUÉ EN /tareas TAMBIÉN
//   /tareas es donde se EJECUTA. Ver arriba la tabla "qué WIG/KR estoy
//   moviendo ahora" evita tener que saltar a otra pantalla a mirar.
// ============================================================================

import Link from "next/link";
import { IconTarget } from "@/components/icons";
import type { MetaConPlan } from "@/lib/types";

/** Nombre de los periodos de un KR ("Q1 2026" / "Marzo 2026"). */
function periodosDe(kr: MetaConPlan["resultados"][number]): string {
  const ps = kr.periodos.length > 0 ? kr.periodos : kr.periodo.id ? [kr.periodo] : [];
  return ps.map((p) => p.nombre).filter(Boolean).join(" · ");
}

export function PanelWigMetas({
  wigs,
  onQuitar,
  guardandoId,
  mostrarKRs = true,
  compacto = false,
}: {
  wigs: MetaConPlan[];
  onQuitar: (id: string) => void;
  guardandoId: string | null;
  /** Mostrar los KRs de cada WIG (el "y kresults" del encargo). */
  mostrarKRs?: boolean;
  /** Versión corta: solo la fila de la meta, sin los KRs. */
  compacto?: boolean;
}) {
  return (
    <section
      className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5"
      aria-label={mostrarKRs ? "WIGs de metas y sus resultados clave" : "WIGs de metas"}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <IconTarget className="h-5 w-5 text-violet-500" />
            WIGs — OKR foco (máx 3)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mostrarKRs ? (
              <>
                Las 3 metas a las que dedicas energía desproporcionada este
                ciclo, con sus resultados clave (KRs). El resto de metas siguen
                activas pero sin foco — “OKR” describe la fila completa (meta +
                KRs + tareas); “WIG” es el subconjunto donde concentras la
                energía.
              </>
            ) : (
              <>
                Las 3 metas a las que dedicas energía desproporcionada este
                ciclo. Sus resultados clave (KRs) los ves al abrir la meta.
                El resto de metas siguen activas pero sin foco.
              </>
            )}
          </p>
        </div>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold tabular-nums text-violet-700 dark:text-violet-300">
          {wigs.length} / 3
        </span>
      </header>

      {wigs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-violet-500/30 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Todavía no has marcado ningún WIG. Pulsa la{" "}
            <span className="font-medium text-foreground">diana 🎯</span> en
            una meta para ascenderla a Enormemente Importante.
          </p>
          <p className="mt-2 text-xs">
            Empieza por 1. Cuando la sostengas, añade la segunda. No pases de 3
            aunque te sientas capaz — el punto es la concentración, no la
            ambición.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {wigs.map((w) => (
            <li
              key={w.meta.id}
              className="rounded-lg border border-violet-500/30 bg-background/80 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-700 dark:text-violet-300">
                  {w.meta.wig_orden ?? "?"}
                </span>
                <Link
                  href={`/metas/detalle?id=${w.meta.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                >
                  {w.meta.titulo}
                </Link>
                {w.total_tareas > 0 && (
                  <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                    {w.tareas_hechas}/{w.total_tareas}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onQuitar(w.meta.id)}
                  disabled={guardandoId === w.meta.id}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                  title="Quitar de WIG"
                >
                  {guardandoId === w.meta.id ? "…" : "Quitar"}
                </button>
              </div>

              {/* Los KRs de la meta: qué resultado concreto se está
                  moviendo, en qué periodo y por cuánto. */}
              {mostrarKRs && w.resultados.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-violet-500/15 pl-10 pt-2">
                  {w.resultados.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] leading-snug text-muted-foreground"
                    >
                      <span className="text-violet-500">▪</span>
                      <span className="text-foreground/90">{r.titulo}</span>
                      {periodosDe(r) && (
                        <span className="opacity-70">· {periodosDe(r)}</span>
                      )}
                      {r.valor_objetivo != null && (
                        <span className="opacity-70">
                          · {r.valor_actual ?? 0}/{r.valor_objetivo}
                          {r.unidad ? ` ${r.unidad}` : ""}
                        </span>
                      )}
                      <span className="opacity-70">· {r.estado.replace("_", " ")}</span>
                      {(() => {
                        const hechas = r.tareas.filter(
                          (t) => t.estado === "hecha",
                        ).length;
                        return hechas > 0 ? (
                          <span className="opacity-70">
                            · {hechas}/{r.tareas.length} tareas
                          </span>
                        ) : null;
                      })()}
                    </li>
                  ))}
                </ul>
              )}

              {!compacto && w.meta.descripcion && (
                <p className="mt-1.5 pl-10 text-[11px] leading-snug text-muted-foreground/80">
                  {w.meta.descripcion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
