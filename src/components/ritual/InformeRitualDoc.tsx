"use client";

// ============================================================================
// InformeRitualDoc — el DOCUMENTO de la semana (issue #111).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El informe del ritual semanal, escrito para IMPRIMIR (A4): los
//   proyectos que estaban vivos con el último contexto del ritual, las
//   metas que se trabajaban, las 3 WIGs, los KRs (WIG de ciclo y foco de
//   la semana) y los 7 días con las 3 tareas comprometidas de cada uno.
//
// CÓMO SE DESCARGA
//   Con el mismo truco que el reporte de proyecto: `window.print()` del
//   navegador ("Guardar como PDF"). El CSS de impresión vive en
//   `src/app/globals.css` (clases `ritual-informe*`).
//
// LO QUE NO HACE
//   No consulta nada: recibe el informe ya hecho (src/lib/ritual/informe.ts).
// ============================================================================

import type { InformeRitual } from "@/lib/ritual/informe";

export type Props = {
  informe: InformeRitual;
  anio: number;
  semana_iso: number;
  /** Rango de la semana: "9 – 15 nov 2026". */
  rango: string;
  /** Fecha de generación (ya formateada). */
  generado: string;
};

const ESTADO_META_LABEL: Record<string, string> = {
  sin_empezar: "Sin empezar",
  en_progreso: "En progreso",
  bloqueada: "Bloqueada",
  pausada: "En pausa",
  completada: "Completada",
  archivada: "Archivada",
};

const ESTADO_TAREA_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  bloqueada: "Bloqueada",
  en_espera: "En espera",
  hecha: "Hecha",
  descartada: "Descartada",
  cancelada: "Cancelada",
  archivada: "Archivada",
};

export default function InformeRitualDoc({
  informe,
  anio,
  semana_iso,
  rango,
  generado,
}: Props) {
  return (
    <article className="ritual-informe">
      {/* ── Portada ── */}
      <header className="ritual-informe__portada">
        <h1>Ritual semanal</h1>
        <p className="ritual-informe__subtitulo">
          {anio} · semana {semana_iso} · {rango}
        </p>
        <p className="ritual-informe__meta">
          Informe generado el {generado}
        </p>
      </header>

      {/* ── 1. Proyectos ── */}
      <section className="ritual-informe__seccion">
        <h2 className="ritual-informe__h2">1. Proyectos activos</h2>
        {informe.proyectos.length === 0 ? (
          <p className="ritual-informe__vacio">
            Ningún proyecto estaba vivo esta semana.
          </p>
        ) : (
          <ul className="ritual-informe__lista">
            {informe.proyectos.map((p) => (
              <li key={p.id} className="ritual-informe__proyecto">
                <h3 className="ritual-informe__h3">{p.nombre}</h3>
                {p.situacion ? (
                  <p className="ritual-informe__contexto">{p.situacion}</p>
                ) : (
                  <p className="ritual-informe__vacio">Sin contexto.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 2. Metas ── */}
      <section className="ritual-informe__seccion">
        <h2 className="ritual-informe__h2">2. Metas de la semana</h2>
        {informe.metas.length === 0 ? (
          <p className="ritual-informe__vacio">No se trabajaron metas.</p>
        ) : (
          <ul className="ritual-informe__lista">
            {informe.metas.map((m) => (
              <li key={m.id} className="ritual-informe__meta">
                <div className="ritual-informe__meta-head">
                  <span className="ritual-informe__meta-titulo">{m.titulo}</span>
                  <span className="ritual-informe__badge">
                    {ESTADO_META_LABEL[m.estado] ?? m.estado}
                  </span>
                  {m.fase ? (
                    <span className="ritual-informe__badge">
                      {m.fase}
                    </span>
                  ) : null}
                </div>
                {m.proyecto ? (
                  <p className="ritual-informe__meta-sub">Proyecto: {m.proyecto}</p>
                ) : null}
                {m.situacion ? (
                  <p className="ritual-informe__contexto">{m.situacion}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 3. Las 3 WIGs ── */}
      <section className="ritual-informe__seccion">
        <h2 className="ritual-informe__h2">3. Las 3 WIGs de meta</h2>
        {informe.wigs_meta.length === 0 ? (
          <p className="ritual-informe__vacio">No se eligieron WIGs.</p>
        ) : (
          <ol className="ritual-informe__wigs">
            {informe.wigs_meta.map((w, i) => (
              <li key={w.id}>
                <span className="ritual-informe__wig-num">{i + 1}.</span> {w.titulo}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── 4. Los KRs ── */}
      <section className="ritual-informe__seccion">
        <h2 className="ritual-informe__h2">4. Los KRs</h2>
        {informe.krs.length === 0 ? (
          <p className="ritual-informe__vacio">No se marcaron KRs.</p>
        ) : (
          <ul className="ritual-informe__lista">
            {informe.krs.map((k) => (
              <li key={k.id} className="ritual-informe__kr">
                <div className="ritual-informe__kr-head">
                  <span className="ritual-informe__kr-titulo">{k.titulo}</span>
                  {k.wig ? (
                    <span className="ritual-informe__badge ritual-informe__badge--wig">
                      WIG
                    </span>
                  ) : null}
                  {k.foco ? (
                    <span className="ritual-informe__badge ritual-informe__badge--foco">
                      Foco de la semana
                    </span>
                  ) : null}
                </div>
                {k.meta ? (
                  <p className="ritual-informe__kr-meta">Meta: {k.meta}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 5. La semana ── */}
      <section className="ritual-informe__seccion">
        <h2 className="ritual-informe__h2">
          5. La semana: las 3 tareas de cada día
        </h2>
        <ul className="ritual-informe__dias">
          {informe.dias.map((d) => (
            <li key={d.dia} className="ritual-informe__dia">
              <h3 className="ritual-informe__h3">
                {d.nombre} <span className="ritual-informe__fecha">{d.fecha}</span>
              </h3>
              {d.tareas.length === 0 ? (
                <p className="ritual-informe__vacio">
                  Sin tareas comprometidas.
                </p>
              ) : (
                <ul className="ritual-informe__tareas">
                  {d.tareas.map((t) => (
                    <li key={t.id} className="ritual-informe__tarea">
                      <span className="ritual-informe__check">☐</span>
                      <span className="ritual-informe__tarea-titulo">
                        {t.titulo}
                      </span>
                      <span className="ritual-informe__tarea-estado">
                        {ESTADO_TAREA_LABEL[t.estado] ?? t.estado}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer className="ritual-informe__footer">
        fooday · ritual semanal · {anio} · semana {semana_iso}
      </footer>
    </article>
  );
}
