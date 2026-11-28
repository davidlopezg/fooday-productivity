"use client";

// ============================================================================
// /ritual-semanal/historial — las semanas del ritual, una a una (issue #111).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El historial del ritual semanal: una tarjeta por semana ISO con lo que
//   decidiste (proyectos vivos, metas, las 3 WIGs, los KRs y las 3 tareas
//   de cada día). Al desplegar una semana se ve el detalle; el botón
//   «Informe / PDF» lleva al documento imprimible de esa semana.
//
// DE DÓNDE SALE CADA SEMANA
//   1. Del INFORME guardado en la bitácora (`ritual_semanales.informe`,
//      migration 0049): es la foto de la semana tal y como se decidió.
//   2. Si esa semana se guardó sin informe (o la BD todavía no tiene la
//      migration 0049), se RECONSTRUYE con los ids de la bitácora y los
//      nombres de ahora: el historial nunca se queda en blanco.
//
// LA REGLA DE ORO
//   Una semana sin informe NO es una semana sin contenido: se muestra con
//   lo que hay (reconstruido) y se dice de dónde sale.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchKrsOverview,
  fetchMetas,
  fetchProyectos,
  fetchRitualesSemanales,
  fetchTareasDiaRitualTodas,
  fetchTareasPorIds,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import {
  informeDesdeBitacora,
  leerInforme,
  resumenInforme,
  type InformeRitual,
} from "@/lib/ritual/informe";
import { DIAS_SEMANA, isoWeekToMonday, localYMD } from "@/lib/semana";

/** Rango legible de una semana ISO ("9 – 15 nov"). */
function rango(anio: number, semana_iso: number): string {
  const lunes = isoWeekToMonday(anio, semana_iso);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `${fmt(lunes)} – ${fmt(domingo)}`;
}

/** Los 7 días (lunes … domingo) de una semana ISO, con su fecha. */
function diasDe(anio: number, semana_iso: number) {
  const lunes = isoWeekToMonday(anio, semana_iso);
  return DIAS_SEMANA.map((d) => {
    const fecha = new Date(lunes);
    fecha.setDate(lunes.getDate() + (d.id - 1));
    return { dia: d.id, nombre: d.nombre, fecha: localYMD(fecha) };
  });
}

export default function HistorialRitualPage() {
  const [abierta, setAbierta] = useState<string | null>(null);

  // ── Datos ────────────────────────────────────────────────────────────────
  const { data: semanas } = useData(() => fetchRitualesSemanales(), []);
  const { data: metas } = useData(() => fetchMetas(), []);
  const { data: krs } = useData(
    () => fetchKrsOverview(),
    { filas: [], aviso: null },
  );
  const { data: proyectos } = useData(() => fetchProyectos(), []);
  const { data: tresDelDia } = useData(() => fetchTareasDiaRitualTodas(), []);

  const idsTareas = useMemo(
    () => [...new Set((tresDelDia ?? []).map((r) => r.tarea_id))],
    [tresDelDia],
  );
  const { data: tareas } = useData(
    () => fetchTareasPorIds(idsTareas),
    [],
    [idsTareas.join(",")],
  );

  /** El informe de una semana: el guardado, o el reconstruido. */
  const informeDe = useMemo(() => {
    return (fila: {
      anio: number;
      semana_iso: number;
      metas_vivas: string[];
      wigs_meta: string[];
      krs_foco: string[];
      informe?: InformeRitual | null;
    }): InformeRitual | null => {
      const guardado = leerInforme(fila.informe);
      if (guardado) return guardado;
      const suyas = (tresDelDia ?? []).filter(
        (r) => r.anio === fila.anio && r.semana_iso === fila.semana_iso,
      );
      return informeDesdeBitacora(fila, {
        metas: (metas ?? []).map((m) => ({
          id: m.id,
          titulo: m.titulo,
          proyecto:
            proyectos?.find((p) => p.id === m.proyecto_id)?.nombre ?? null,
          estado: m.estado,
          fase: m.fase ?? null,
          situacion: m.situacion_actual ?? "",
        })),
        krs: (krs?.filas ?? []).map((f) => ({
          id: f.kr.id,
          titulo: f.kr.titulo,
          meta: f.meta?.titulo ?? null,
          wig: !!f.kr.es_wig,
        })),
        proyectos: (proyectos ?? []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          estado: p.estado ?? "vivo",
        })),
        tareas: tareas ?? [],
        dias: diasDe(fila.anio, fila.semana_iso),
        tareasDia: suyas.map((r) => ({
          dia_semana: r.dia_semana,
          tarea_id: r.tarea_id,
        })),
      });
    };
  }, [metas, krs, proyectos, tareas, tresDelDia]);

  const clave = (a: number, s: number) => `${a}-${s}`;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Historial del ritual</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Una tarjeta por semana con el ritual que hiciste: los proyectos que
          estaban vivos y su contexto, las metas, las 3 WIGs, los KRs y las 3
          tareas de cada día. Despliega una semana para ver el detalle y bájala
          en PDF.
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
        <ul className="space-y-3">
          {(semanas ?? []).map((s) => {
            const id = clave(s.anio, s.semana_iso);
            const informe = informeDe(s);
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
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                {/* ── Cabecera de la semana ── */}
                <button
                  type="button"
                  onClick={() => setAbierta(abierto ? null : id)}
                  aria-expanded={abierto}
                  className="w-full px-4 py-3 text-left hover:bg-accent/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      Semana {s.semana_iso} · {s.anio}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${
                        s.cerrado_en
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {s.cerrado_en ? "Cerrada" : "En curso"}
                    </span>
                    {!s.informe && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        Reconstruida
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rango(s.anio, s.semana_iso)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Contador n={resumen.proyectos} que="proyectos" />
                    <Contador n={resumen.metas} que="metas" />
                    <Contador n={resumen.wigs} que="WIGs" />
                    <Contador n={resumen.krs} que="KRs" />
                    <Contador n={resumen.tareas} que="tareas" />
                  </div>
                </button>

                {/* ── Detalle ── */}
                {abierto && (
                  <div className="space-y-4 border-t border-border bg-background/40 px-4 py-4">
                    {informe ? (
                      <>
                        <Seccion titulo="Proyectos activos">
                          {informe.proyectos.map((p) => (
                            <li key={p.id}>
                              <span className="font-medium">{p.nombre}</span>
                              {p.situacion ? (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  {p.situacion}
                                </span>
                              ) : (
                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                  Sin contexto.
                                </span>
                              )}
                            </li>
                          ))}
                        </Seccion>

                        <Seccion titulo="Metas">
                          {informe.metas.map((m) => (
                            <li key={m.id}>
                              <span className="font-medium">{m.titulo}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {[m.proyecto, m.fase, m.situacion]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </li>
                          ))}
                        </Seccion>

                        <Seccion titulo="Las 3 WIGs">
                          {informe.wigs_meta.map((w, i) => (
                            <li key={w.id}>
                              <span className="font-medium">
                                {i + 1}. {w.titulo}
                              </span>
                            </li>
                          ))}
                        </Seccion>

                        <Seccion titulo="Los KRs">
                          {informe.krs.map((k) => (
                            <li key={k.id}>
                              <span className="font-medium">{k.titulo}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
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
                        </Seccion>

                        <Seccion titulo="La semana (las 3 de cada día)">
                          {informe.dias.map((d) => (
                            <li key={d.dia}>
                              <span className="font-medium">
                                {d.nombre} · {d.fecha}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {d.tareas.length
                                  ? d.tareas.map((t) => t.titulo).join(" · ")
                                  : "Sin tareas comprometidas."}
                              </span>
                            </li>
                          ))}
                        </Seccion>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay nada que mostrar de esta semana.
                      </p>
                    )}
                  </div>
                )}

                {/* ── Pie: el PDF ── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
                  <span className="text-[11px] text-muted-foreground">
                    {s.informe
                      ? "Informe guardado en el ritual de esa semana."
                      : "Semana guardada antes del informe: se reconstruye con los datos de ahora."}
                  </span>
                  <Link
                    href={`/ritual-semanal/informe?anio=${s.anio}&semana=${s.semana_iso}`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    Informe / PDF
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Una cifra del resumen de la semana. */
function Contador({ n, que }: { n: number; que: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">{n}</span> {que}
    </span>
  );
}

/** Un bloque del detalle (lista con título). */
function Seccion({
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
        <ul className="mt-1 space-y-2 text-sm">{children}</ul>
      )}
    </div>
  );
}
