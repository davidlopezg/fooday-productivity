"use client";

// ============================================================================
// PanelFocoSemanaKRs.tsx — los KRs en foco de la semana (capa intermedia).
//
// LA CASCADA DE 4 CAPAS, A LA VISTA
//   meta (WIG, violeta) → KR (foco semanal, celeste) → tarea (WIG, fucsia)
//   El eslabón del medio es el que faltaba: el trimestre dice QUÉ se
//   entrega; la semana dice DÓNDE pones horas.
//
// COMPARTIDO entre la home (/) y /tareas (la tabla), para que la misma
// cascada se vea en los dos sitios donde se decide qué hacer. En la home
// es el recordatorio del día; en /tareas es el contexto mientras ejecutas.
//
// Regla de contención (migration 0033): solo entra un KR cuyo periodo de
// entrega contiene la semana actual. Lo aplica la RPC en BD.
//
// EL NOMBRE (issue #59)
// --------------------
// El título dice SIEMPRE en qué eje temporal vive el panel: "esta
// semana". Antes esta capa se llamaba "KR's Enormemente Importantes" en
// la home, /tareas y /krs, y "KRs en foco — esta semana (máx 3)" en
// /semana: dos nombres para lo mismo, y el primero se confundía con el
// WIG de KR del ciclo ("WIGs — KRs del ciclo (máx 3)", violeta), que es
// OTRA capa. Ahora el foco semanal se llama igual en todas las páginas y
// el rótulo dice el eje.
// ============================================================================

import Link from "next/link";
import { IconTarget } from "@/components/icons";
import type { KrFocoConDetalle } from "@/lib/types";

export function PanelFocoSemanaKRs({
  focos,
  titulo = "KRs en foco — esta semana (máx 3)",
  descripcion,
  estadoVacio,
}: {
  focos: KrFocoConDetalle[];
  titulo?: string;
  /** Texto del párrafo de cabecera (por defecto, el de la home). */
  descripcion?: string;
  /** Si se pasa, el panel se pinta TAMBIÉN sin focos (con este texto). */
  estadoVacio?: string;
}) {
  if (focos.length === 0 && !estadoVacio) return null;
  return (
    <section
      className="rounded-xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-500/10 to-violet-500/5 p-5"
      aria-label="KRs en foco esta semana"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <IconTarget className="h-5 w-5 text-sky-500" />
          {titulo}
        </h2>
        <Link
          href="/semana"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          editar foco semanal
        </Link>
      </header>
      <p className="mb-3 text-xs text-muted-foreground">
        {descripcion ??
          (focos.length > 0
            ? `Los ${focos.length} resultados medibles en los que pones horas esta semana — el eslabón entre tus WIGs de meta y las tareas que los sostienen.`
            : "Los resultados medibles en los que pones horas esta semana — el eslabón entre tus WIGs de meta y las tareas que los sostienen.")}
      </p>
      {focos.length === 0 && (
        <p className="rounded-lg border border-sky-500/30 bg-background/70 px-3 py-2.5 text-xs text-muted-foreground">
          {estadoVacio}
        </p>
      )}
      <ul className="space-y-2">
        {focos.map((f) => {
          const pct = Math.round(f.progreso * 100);
          return (
            <li
              key={f.kr.id}
              className="flex items-center gap-3 rounded-lg border border-sky-500/30 bg-background/70 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold tabular-nums text-sky-700 dark:text-sky-300">
                {f.foco.orden}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/metas/detalle?id=${f.meta.id}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {f.kr.titulo}
                </Link>
                <p className="truncate text-[11px] text-muted-foreground">
                  {f.meta.codigo ? `${f.meta.codigo} · ` : ""}
                  {f.meta.titulo}
                  {f.periodos[0] ? ` · ${f.periodos[0].nombre}` : ""}
                </p>
              </div>
              <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                {f.tareas_hechas}/{f.tareas.length} tareas
              </span>
              <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
