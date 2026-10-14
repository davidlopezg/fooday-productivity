"use client";

import type {
  Area,
  Meta,
  MetaConPlan,
  Proyecto,
  ResultadoPeriodo,
  Tarea,
} from "@/lib/types";

/**
 * Reporte imprimible de un proyecto. Pensado para "Imprimir a PDF" del
 * navegador (window.print + @media print en globals.css). Sin libs de PDF.
 *
 * Estructura del documento (orden estable):
 *  1. Portada: nombre, área, totales, fecha de generación
 *  2. Contexto general: descripción + metadatos (archivado, color, orden)
 *  3. Metas (1 por meta con sus KRs/resultados_periodo y tareas dentro)
 *  4. Tareas del proyecto que NO son recurrentes, ordenadas por estado
 *     (activas primero → hechas → descartadas → archivadas) y por orden
 *     estable: creadas después primero.
 *  5. Tareas recurrentes del proyecto (las que tienen recurrencia_tipo).
 */

type Props = {
  proyecto: Proyecto;
  area: Area | null;
  /** Metas del proyecto, cada una ya con sus resultados + tareas calculadas. */
  metas: MetaConPlan[];
  /** Todas las tareas del proyecto (incluye las que viven dentro de KRs,
   *  recurrentes y huérfanas). Las re-agrupamos aquí para las secciones
   *  finales. */
  tareas: Tarea[];
};

const ESTADO_META_LABEL: Record<Meta["estado"], string> = {
  sin_empezar: "Sin empezar",
  en_progreso: "En progreso",
  bloqueada: "Bloqueada",
  completada: "Completada",
  archivada: "Archivada",
};

const ESTADO_TAREA_LABEL: Record<Tarea["estado"], string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  bloqueada: "Bloqueada",
  hecha: "Hecha",
  descartada: "Descartada",
  archivada: "Archivada",
};

const ESTADO_RESULTADO_LABEL: Record<ResultadoPeriodo["estado"], string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  descartado: "Descartado",
};

const ESTADO_TAREA_ORDEN: Record<Tarea["estado"], number> = {
  en_progreso: 0,
  bloqueada: 1,
  pendiente: 2,
  hecha: 3,
  descartada: 4,
  archivada: 5,
};

const RECURRENCIA_LABEL: Record<NonNullable<Tarea["recurrencia_tipo"]>, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  mensual: "Mensual",
};

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  // iso puede venir como "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss..."
  const ymd = iso.slice(0, 10);
  const [y, m, d] = ymd.split("-");
  if (!y || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatFechaHora(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function ProyectoReport({ proyecto, area, metas, tareas }: Props) {
  const todasTareas = tareas;

  // Tareas NO recurrentes (la sección "tareas normales" del doc).
  const tareasNoRecurrentes = todasTareas
    .filter((t) => t.recurrencia_tipo == null)
    .slice()
    .sort((a, b) => {
      const ea = ESTADO_TAREA_ORDEN[a.estado] ?? 99;
      const eb = ESTADO_TAREA_ORDEN[b.estado] ?? 99;
      if (ea !== eb) return ea - eb;
      // Desempate: más recientes primero si tienen created_at, si no por título.
      const ca = a.created_at ? +new Date(a.created_at) : 0;
      const cb = b.created_at ? +new Date(b.created_at) : 0;
      if (ca !== cb) return cb - ca;
      return a.titulo.localeCompare(b.titulo);
    });

  // Tareas recurrentes del proyecto.
  const tareasRecurrentes = todasTareas
    .filter((t) => t.recurrencia_tipo != null)
    .slice()
    .sort((a, b) => {
      const ca = a.created_at ? +new Date(a.created_at) : 0;
      const cb = b.created_at ? +new Date(b.created_at) : 0;
      if (ca !== cb) return cb - ca;
      return a.titulo.localeCompare(b.titulo);
    });

  const totalTareas = todasTareas.length;
  const tareasHechas = todasTareas.filter((t) => t.estado === "hecha").length;
  const tareasActivas = todasTareas.filter(
    (t) => t.estado !== "hecha" && t.estado !== "archivada" && t.estado !== "descartada",
  ).length;

  return (
    <article className="proyecto-report">
      {/* ───── Portada ───── */}
      <header className="proyecto-report__portada">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-5 w-5 shrink-0 rounded"
            style={{ backgroundColor: proyecto.color ?? "#64748b" }}
            aria-hidden
          />
          <h1 className="text-2xl font-bold tracking-tight">{proyecto.nombre}</h1>
          {proyecto.archivado && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Archivado
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Generado el {formatFechaHora()} · {metas.length} metas · {totalTareas} tareas
          ({tareasActivas} activas · {tareasHechas} hechas) · {tareasRecurrentes.length}{" "}
          recurrentes
          {area ? ` · Área: ${area.nombre}` : ""}
        </p>
      </header>

      {/* ───── Contexto general ───── */}
      <section className="proyecto-report__seccion">
        <h2 className="proyecto-report__h2">1. Contexto general</h2>
        <dl className="proyecto-report__dl">
          <dt>Nombre</dt>
          <dd>{proyecto.nombre}</dd>

          <dt>Área</dt>
          <dd>{area ? area.nombre : "Sin área"}</dd>

          <dt>Estado</dt>
          <dd>{proyecto.archivado ? "Archivado" : "Activo"}</dd>

          <dt>Color</dt>
          <dd>
            <span
              className="inline-block h-3 w-3 rounded-sm align-middle"
              style={{ backgroundColor: proyecto.color ?? "#64748b" }}
              aria-hidden
            />{" "}
            <code>{proyecto.color ?? "#64748b"}</code>
          </dd>

          <dt>Descripción</dt>
          <dd>{proyecto.descripcion?.trim() || <em>— sin descripción —</em>}</dd>

          <dt>Tareas del proyecto</dt>
          <dd>
            {totalTareas} en total · {tareasActivas} activas · {tareasHechas} hechas
          </dd>

          <dt>Metas hijas</dt>
          <dd>{metas.length}</dd>
        </dl>
      </section>

      {/* ───── Metas ───── */}
      <section className="proyecto-report__seccion">
        <h2 className="proyecto-report__h2">2. Metas ({metas.length})</h2>
        {metas.length === 0 ? (
          <p className="proyecto-report__empty">
            Este proyecto aún no tiene metas hijas.
          </p>
        ) : (
          <ol className="proyecto-report__metas">
            {metas.map((mc, i) => {
              const m = mc.meta;
              return (
                <li key={m.id} className="proyecto-report__meta">
                  <div className="proyecto-report__meta-head">
                    <span className="proyecto-report__meta-num">{i + 1}.</span>
                    <span className="proyecto-report__meta-estado">
                      {ESTADO_META_LABEL[m.estado]}
                    </span>
                    {m.es_wig && (
                      <span className="proyecto-report__badge-wig">WIG</span>
                    )}
                    <h3 className="proyecto-report__h3">
                      {m.codigo ? (
                        <span className="font-mono text-sm text-muted-foreground">
                          [{m.codigo}]
                        </span>
                      ) : null}{" "}
                      {m.titulo}
                    </h3>
                  </div>

                  <dl className="proyecto-report__dl">
                    {m.descripcion && (
                      <>
                        <dt>Descripción</dt>
                        <dd>{m.descripcion}</dd>
                      </>
                    )}
                    {m.contexto && (
                      <>
                        <dt>Contexto</dt>
                        <dd>{m.contexto}</dd>
                      </>
                    )}
                    {m.situacion_actual && (
                      <>
                        <dt>Situación actual</dt>
                        <dd>{m.situacion_actual}</dd>
                      </>
                    )}
                    {(m.fecha_inicio_meta || m.fecha_objetivo || m.plazo) && (
                      <>
                        <dt>Plazo</dt>
                        <dd>
                          {m.fecha_inicio_meta
                            ? `Inicio ${formatFecha(m.fecha_inicio_meta)}`
                            : ""}
                          {m.fecha_inicio_meta && m.fecha_objetivo ? " → " : ""}
                          {m.fecha_objetivo
                            ? `Límite ${formatFecha(m.fecha_objetivo)}`
                            : ""}
                          {m.fecha_fin_bloqueada ? " 🔒 (hard constraint)" : ""}
                          {!m.fecha_inicio_meta && !m.fecha_objetivo && m.plazo
                            ? m.plazo
                            : ""}
                        </dd>
                      </>
                    )}
                    {m.ambito && (
                      <>
                        <dt>Ámbito</dt>
                        <dd className="capitalize">{m.ambito}</dd>
                      </>
                    )}
                    {m.tags && m.tags.length > 0 && (
                      <>
                        <dt>Tags</dt>
                        <dd>{m.tags.join(", ")}</dd>
                      </>
                    )}
                    {m.prioridad && (
                      <>
                        <dt>Prioridad</dt>
                        <dd className="capitalize">{m.prioridad}</dd>
                      </>
                    )}
                  </dl>

                  {mc.resultados.length > 0 && (
                    <div className="proyecto-report__resultados">
                      <h4 className="proyecto-report__h4">
                        Resultados / KRs ({mc.resultados.length})
                      </h4>
                      <ol className="proyecto-report__krs">
                        {mc.resultados.map((r, ri) => (
                          <li key={r.id} className="proyecto-report__kr">
                            <div className="proyecto-report__kr-head">
                              <span className="proyecto-report__meta-num">
                                {ri + 1}.
                              </span>
                              <span className="proyecto-report__meta-estado">
                                {ESTADO_RESULTADO_LABEL[r.estado]}
                              </span>
                              <strong>{r.titulo}</strong>
                              <span className="proyecto-report__periodo">
                                [{r.periodo.nombre}]
                              </span>
                            </div>
                            {(r.descripcion || r.metrica || r.valor_objetivo != null) && (
                              <p className="proyecto-report__kr-meta">
                                {r.descripcion ? `${r.descripcion}` : ""}
                                {r.metrica ? ` · Métrica: ${r.metrica}` : ""}
                                {r.valor_objetivo != null
                                  ? ` · Objetivo: ${r.valor_actual ?? 0} / ${
                                      r.valor_objetivo
                                    }${r.unidad ? ` ${r.unidad}` : ""}`
                                  : ""}
                                {r.peso ? ` · Peso: ${r.peso}` : ""}
                              </p>
                            )}
                            {r.tareas.length > 0 && (
                              <ul className="proyecto-report__tareas">
                                {r.tareas
                                  .slice()
                                  .sort((a, b) =>
                                    ESTADO_TAREA_ORDEN[a.estado] -
                                    ESTADO_TAREA_ORDEN[b.estado],
                                  )
                                  .map((t) => (
                                    <li
                                      key={t.id}
                                      className={`proyecto-report__tarea proyecto-report__tarea--${t.estado}`}
                                    >
                                      <span className="proyecto-report__check" aria-hidden>
                                        {t.estado === "hecha" ? "☑" : "☐"}
                                      </span>
                                      <span className="proyecto-report__tarea-titulo">
                                        {t.titulo}
                                      </span>
                                      <span className="proyecto-report__tarea-estado">
                                        {ESTADO_TAREA_LABEL[t.estado]}
                                      </span>
                                    </li>
                                  ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ───── Tareas no recurrentes ───── */}
      <section className="proyecto-report__seccion">
        <h2 className="proyecto-report__h2">
          3. Tareas ({tareasNoRecurrentes.length})
        </h2>
        {tareasNoRecurrentes.length === 0 ? (
          <p className="proyecto-report__empty">No hay tareas no recurrentes.</p>
        ) : (
          <ul className="proyecto-report__tareas-list">
            {tareasNoRecurrentes.map((t) => (
              <li
                key={t.id}
                className={`proyecto-report__tarea proyecto-report__tarea--${t.estado}`}
              >
                <span className="proyecto-report__check" aria-hidden>
                  {t.estado === "hecha" ? "☑" : "☐"}
                </span>
                <span className="proyecto-report__tarea-titulo">{t.titulo}</span>
                <span className="proyecto-report__tarea-estado">
                  {ESTADO_TAREA_LABEL[t.estado]}
                </span>
                {t.prioridad && (
                  <span className="proyecto-report__tarea-prio">
                    {t.prioridad}
                  </span>
                )}
                {t.deadline && (
                  <span className="proyecto-report__tarea-deadline">
                    📅 {formatFecha(t.deadline)}
                  </span>
                )}
                {t.fecha_fin && !t.deadline && (
                  <span className="proyecto-report__tarea-deadline">
                    📅 {formatFecha(t.fecha_fin)}
                  </span>
                )}
                {t.completada_at && (
                  <span className="proyecto-report__tarea-completed">
                    ✓ {formatFecha(t.completada_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ───── Tareas recurrentes ───── */}
      <section className="proyecto-report__seccion">
        <h2 className="proyecto-report__h2">
          4. Tareas recurrentes ({tareasRecurrentes.length})
        </h2>
        {tareasRecurrentes.length === 0 ? (
          <p className="proyecto-report__empty">No hay tareas recurrentes.</p>
        ) : (
          <ul className="proyecto-report__tareas-list">
            {tareasRecurrentes.map((t) => (
              <li
                key={t.id}
                className={`proyecto-report__tarea proyecto-report__tarea--${t.estado}`}
              >
                <span className="proyecto-report__check" aria-hidden>
                  {t.estado === "hecha" ? "☑" : "☐"}
                </span>
                <span className="proyecto-report__tarea-titulo">{t.titulo}</span>
                <span className="proyecto-report__tarea-estado">
                  {ESTADO_TAREA_LABEL[t.estado]}
                </span>
                <span className="proyecto-report__recurrencia">
                  🔁 {RECURRENCIA_LABEL[t.recurrencia_tipo!]}
                  {t.recurrencia_tipo === "semanal" &&
                    t.recurrencia_dias_semana &&
                    ` (días ${t.recurrencia_dias_semana.join(", ")})`}
                  {t.recurrencia_tipo === "mensual" && t.recurrencia_dia_mes
                    ? ` (día ${t.recurrencia_dia_mes})`
                    : ""}
                </span>
                {t.completada_at && (
                  <span className="proyecto-report__tarea-completed">
                    ✓ última: {formatFecha(t.completada_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="proyecto-report__footer">
        <em>
          fooday·productivity — reporte generado automáticamente. Las tareas y
          metas listadas son las existentes en el momento de generar este
          documento.
        </em>
      </footer>
    </article>
  );
}