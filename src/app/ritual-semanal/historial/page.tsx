"use client";

// ============================================================================
// /ritual-semanal/historial — las semanas del ritual, una a una (issue #111).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El historial del ritual semanal: una fila por semana ISO con lo que
//   decidiste (proyectos vivos, metas, las 3 WIGs, los KRs y las 3 tareas
//   de cada día). Al desplegar una semana se ve el detalle; el botón
//   «Informe / PDF» lleva al documento imprimible de esa semana.
//
// DE DÓNDE SALE
//   De `ritual_semanales` (la bitácora): una fila por semana, escrita por
//   el wizard a medida que avanzas (migration 0049 guarda el informe).
// ============================================================================

import { useState } from "react";
import Link from "next/link";
import { fetchRitualesSemanales } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { leerInforme, resumenInforme } from "@/lib/ritual/informe";
import { isoWeekToMonday } from "@/lib/semana";

/** Rango legible de una semana ISO ("9 – 15 nov"). */
function rango(anio: number, semana_iso: number): string {
  const lunes = isoWeekToMonday(anio, semana_iso);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${fmt(lunes)} – ${fmt(domingo)}`;
}

export default function HistorialRitualPage() {
  const { data: semanas } = useData(() => fetchRitualesSemanales(), []);
  const [abierta, setAbierta] = useState<string | null>(null);

  const clave = (a: number, s: number) => `${a}-${s}`;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Historial del ritual</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Una entrada por semana con el ritual hecho: los proyectos que
          estaban vivos y su contexto, las metas, las 3 WIGs, los KRs y las 3
          tareas de cada día. Cada semana se puede abrir y bajar en PDF.
        </p>
      </header>

      {(semanas ?? []).length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Todavía no hay ninguna semana guardada. Haz el ritual en{" "}
          <Link href="/ritual-semanal" className="underline underline-offset-4">
            /ritual-semanal
          </Link>{" "}
          y aquí aparecerá.
        </p>
      ) : (
        <ul className="space-y-2">
          {(semanas ?? []).map((s) => {
            const id = clave(s.anio, s.semana_iso);
            const informe = leerInforme(s.informe);
            const resumen = informe
              ? resumenInforme(informe)
              : {
                  proyectos: 0,
                  metas: s.metas_vivas.length,
                  wigs: s.wigs_meta.length,
                  krs: s.krs_foco.length,
                  tareas: 0,
                };
            const abierto = abierta === id;
            return (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAbierta(abierto ? null : id)}
                    aria-expanded={abierto}
                    className="text-left"
                  >
                    <span className="block text-sm font-semibold">
                      {s.anio} · semana {s.semana_iso}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {rango(s.anio, s.semana_iso)} ·{" "}
                      {s.cerrado_en ? "cerrada" : "en curso"} ·{" "}
                      {resumen.proyectos} proyectos · {resumen.metas} metas ·{" "}
                      {resumen.wigs} WIGs · {resumen.krs} KRs ·{" "}
                      {resumen.tareas} tareas
                    </span>
                  </button>
                  <Link
                    href={`/ritual-semanal/informe?anio=${s.anio}&semana=${s.semana_iso}`}
                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Informe / PDF
                  </Link>
                </div>

                {abierto && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {!informe ? (
                      <p className="text-sm text-muted-foreground">
                        Esta semana se guardó antes de que existiera el informe
                        (solo quedaron los identificadores).{" "}
                        <Link
                          href={`/ritual-semanal/informe?anio=${s.anio}&semana=${s.semana_iso}`}
                          className="underline underline-offset-4"
                        >
                          Abrir el informe
                        </Link>{" "}
                        para reconstruirlo con los datos de ahora.
                      </p>
                    ) : (
                      <>
                        <Detalle titulo="Proyectos activos">
                          {informe.proyectos.map((p) => (
                            <li key={p.id}>
                              <span className="font-medium">{p.nombre}</span>
                              {p.situacion ? (
                                <span className="block text-xs text-muted-foreground">
                                  {p.situacion}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </Detalle>

                        <Detalle titulo="Metas">
                          {informe.metas.map((m) => (
                            <li key={m.id}>
                              <span className="font-medium">{m.titulo}</span>
                              <span className="block text-xs text-muted-foreground">
                                {[m.proyecto, m.fase, m.situacion]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </li>
                          ))}
                        </Detalle>

                        <Detalle titulo="Las 3 WIGs">
                          {informe.wigs_meta.map((w, i) => (
                            <li key={w.id}>
                              <span className="font-medium">
                                {i + 1}. {w.titulo}
                              </span>
                            </li>
                          ))}
                        </Detalle>

                        <Detalle titulo="Los KRs">
                          {informe.krs.map((k) => (
                            <li key={k.id}>
                              <span className="font-medium">{k.titulo}</span>
                              <span className="block text-xs text-muted-foreground">
                                {[
                                  k.meta,
                                  k.wig ? "WIG" : null,
                                  k.foco ? "foco de la semana" : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </li>
                          ))}
                        </Detalle>

                        <Detalle titulo="La semana (las 3 de cada día)">
                          {informe.dias.map((d) => (
                            <li key={d.dia}>
                              <span className="font-medium">
                                {d.nombre} · {d.fecha}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {d.tareas.length
                                  ? d.tareas.map((t) => t.titulo).join(" · ")
                                  : "Sin tareas comprometidas."}
                              </span>
                            </li>
                          ))}
                        </Detalle>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Un bloque del detalle (lista con título). */
function Detalle({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  const vacio = Array.isArray(children) && children.length === 0;
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {vacio ? (
        <p className="mt-1 text-xs text-muted-foreground">Nada.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">{children}</ul>
      )}
    </div>
  );
}
