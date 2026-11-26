"use client";

// ============================================================================
// RejillaTresPorDia — las 3 tareas con las que te comprometes cada día
// (issue #89, paso 5c).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Una rejilla de 7 días × 3 huecos. Las candidatas son las tareas que ya
//   están repartidas en ese día en /semana; tú eliges con cuáles te
//   comprometes. El resto queda "de apoyo": puede que las hagas, pero no
//   te comprometes.
//
// POR QUÉ NO ES EL PLAN DIARIO
//   El plan diario es la PROPUESTA de la IA para hoy (cambia con el estado
//   de ánimo). Esto es el COMPROMISO de la semana, elegido por ti en el
//   ritual del domingo. Y no es el WIG de tarea (`tareas.es_wig`), que es
//   la capa de ciclo (máx 3 en todo el sistema, para meses).
//   La diferencia se explica en la propia pantalla, que es donde se confunde.
//
// LO QUE NO HACE
//   No escribe en BD: la selección se guarda al pulsar "Guardar y
//   continuar" del paso (como el resto del wizard).
// ============================================================================

import {
  anadirALaSeleccion,
  CAP_TRES_DEL_DIA,
  estadoHuecos,
  quitarDeLaSeleccion,
  tareasDeApoyo,
  type CandidataTresDelDia,
  type SeleccionDia,
} from "@/lib/ritual/tresDelDia";

export interface DiaRejilla {
  /** ISO: 1=lunes .. 7=domingo. */
  dia: number;
  nombre: string;
  /** Fecha concreta (YYYY-MM-DD). */
  fecha: string;
  /** ¿Es hoy? */
  hoy: boolean;
}

export function RejillaTresPorDia({
  dias,
  candidatasPorDia,
  seleccionPorDia,
  onChange,
}: {
  dias: DiaRejilla[];
  candidatasPorDia: Map<number, CandidataTresDelDia[]>;
  seleccionPorDia: Record<number, SeleccionDia>;
  onChange: (dia: number, seleccion: SeleccionDia) => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <h3 className="text-base font-semibold tracking-tight">
          🎯 Las 3 de cada día
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          De lo que ya tienes repartido en <strong>/semana</strong>, elige con
          cuáles te comprometes. Las demás quedan de apoyo: puedes hacerlas,
          pero no te comprometes.
        </p>
      </header>

      <div className="space-y-3">
        {dias.map((d) => {
          const candidatas = candidatasPorDia.get(d.dia) ?? [];
          const seleccion = seleccionPorDia[d.dia] ?? [];
          const apoyo = tareasDeApoyo(candidatas, seleccion);
          const estado = estadoHuecos(seleccion);
          const tituloDe = (id: string) =>
            candidatas.find((c) => c.id === id)?.titulo ?? "";

          return (
            <section
              key={d.dia}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold">
                  {d.nombre}
                  {d.hoy && (
                    <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium">
                      hoy
                    </span>
                  )}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {estado.mensaje}
                </span>
              </div>

              {/* 3 huecos */}
              <ol className="mt-2 space-y-1.5">
                {Array.from({ length: CAP_TRES_DEL_DIA }, (_, i) => {
                  const id = seleccion[i];
                  return (
                    <li
                      key={i}
                      className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                        id
                          ? "border-primary/40 bg-primary/5"
                          : "border-dashed border-border text-muted-foreground"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {id ? `${i + 1}. ${tituloDe(id)}` : `${i + 1}. —`}
                      </span>
                      {id && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange(d.dia, quitarDeLaSeleccion(seleccion, id))
                          }
                          aria-label={`Quitar ${tituloDe(id)} del compromiso del ${d.nombre}`}
                          className="min-h-10 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                        >
                          Quitar
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>

              {/* De apoyo */}
              {apoyo.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    De apoyo ({apoyo.length})
                  </h5>
                  <ul className="mt-1 space-y-1">
                    {apoyo.map((c) => (
                      <li
                        key={c.id}
                        className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-1 text-sm text-muted-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
                        <button
                          type="button"
                          disabled={estado.completo}
                          onClick={() =>
                            onChange(d.dia, anadirALaSeleccion(seleccion, c.id))
                          }
                          className="min-h-10 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
                        >
                          {estado.completo ? "Cupo lleno" : "Comprometerme"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {candidatas.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No hay tareas repartidas en este día. Repártelas en /semana.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">No lo confundas:</strong> estas 3
        son tu <strong className="text-foreground">compromiso diario</strong>{" "}
        (lo eliges tú en el ritual del domingo). El WIG de tarea (🎯, máx 3 en
        toda la app) es la capa de <strong className="text-foreground">ciclo</strong>
        : lo que importa a meses. Y el plan diario es la{" "}
        <strong className="text-foreground">propuesta</strong> de la IA para
        hoy, que puede cambiar. Estas 3 no las cambia nadie: las cambias tú.
      </p>
    </div>
  );
}
