"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAreas, fetchMetas, fetchProyectosConConteo, fetchTareas } from "@/lib/queries";
import {
  archivarProyecto,
  archivarProyectoEnCascada,
  crearProyecto,
  eliminarProyecto,
} from "@/lib/mutations";
import { cargarDatosProyectoParaReporte } from "@/lib/exportarProyecto";
import { useData } from "@/lib/useData";
import type { Area, Meta, MetaConPlan, Proyecto, Tarea } from "@/lib/types";
import { IconArchive, IconFile, IconFolder, IconPencil, IconTarget, IconTrash, IconX } from "@/components/icons";
import ProyectoReport from "@/components/ProyectoReport";
import { EditarProyectoModal } from "@/components/EditarProyectoModal";

type DatosReporte = {
  proyecto: Proyecto;
  area: Area | null;
  metas: MetaConPlan[];
  tareas: Tarea[];
};

/**
 * Modal de vista previa + impresión a PDF.
 *
 * Por qué modal y no trigger automático de window.print():
 *   - El usuario puede VER el documento antes de imprimir (sabemos
 *     que "no se ve nada" era el síntoma de un problema de timing).
 *   - El botón "Imprimir / Guardar PDF" dispara el diálogo nativo
 *     con `requestAnimationFrame` doble para asegurar que el portal
 *     ya está pintado.
 *
 * El reporte vive dentro de `.proyecto-report-portal[data-preview="1"]`
 * (estilos ya definidos en globals.css para esta vista previa).
 * Al imprimir, el `@media print` oculta todo lo demás y deja solo el
 * reporte en formato A4.
 */
function ReporteModal({
  datos,
  onCerrar,
}: {
  datos: DatosReporte | null;
  onCerrar: () => void;
}) {
  if (!datos) return null;

  async function imprimir() {
    // Doble rAF: asegura que el navegador ya pintó el portal antes
    // de entrar al modo print (alivia problemas de timing reportados).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <div
      className="proyecto-report-modal fixed inset-0 z-50 flex flex-col bg-black/60 p-0 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa del reporte de ${datos.proyecto.nombre}`}
    >
      {/* Toolbar flotante arriba (no se imprime; el modal está fuera del portal). */}
      <div className="proyecto-report-modal__toolbar flex shrink-0 items-center justify-between gap-2 bg-background/95 px-4 py-2 shadow sm:rounded-t-lg">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Vista previa · {datos.proyecto.nombre}
          </p>
          <p className="text-xs text-muted-foreground">
            {datos.metas.length} metas · {datos.tareas.length} tareas
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={imprimir}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <IconFile className="h-4 w-4" />
            Imprimir / Guardar PDF
          </button>
          <button
            onClick={onCerrar}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar vista previa"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Contenedor scrollable con la "hoja" del documento. */}
      <div className="proyecto-report-modal__scroll flex-1 overflow-y-auto bg-muted/40 py-4">
        <div
          className="proyecto-report-portal"
          data-preview="1"
          aria-label="Documento del proyecto"
        >
          <ProyectoReport
            proyecto={datos.proyecto}
            area={datos.area}
            metas={datos.metas}
            tareas={datos.tareas}
          />
        </div>
      </div>
    </div>
  );
}

type ProyectoConConteo = Proyecto & {
  total_tareas: number;
  tareas_hechas: number;
};

export default function ProyectosPage() {
  const { data, loading, error, reload } = useData<ProyectoConConteo[]>(
    fetchProyectosConConteo,
    [],
  );
  // Tareas para mostrar conteo rápido por proyecto (lo alternativo es
  // un join en el backend, pero ya tenemos esto: hacemos una sola query
  // adicional a /tareas y agrupamos en cliente. Mantenemos la página
  // liviana sin tocar la RPC de proyectos).
  const { data: tareas } = useData<Tarea[]>(() => fetchTareas(), []);
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  // Metas hijas de cada proyecto. Una sola query, agrupamos en cliente
  // por proyecto_id. Migration 0024: metas.proyecto_id nullable; las
  // metas sin proyecto se ignoran aquí (viven solo en /metas).
  const { data: metas } = useData<Meta[]>(fetchMetas, []);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#64748b");
  const [areaId, setAreaId] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errForm, setErrForm] = useState<string | null>(null);
  /** Spinner inline mientras se hace la cascada de archivado.
   *  Mostramos qué proyecto se está procesando y un mensaje neutro. */
  const [procesando, setProcesando] = useState<string | null>(null);
  /** Proyecto cuyo PDF estamos generando (muestra el spinner del botón). */
  const [exportando, setExportando] = useState<string | null>(null);
  /** Datos del proyecto para el modal de vista previa. */
  const [reporte, setReporte] = useState<DatosReporte | null>(null);
  /** Proyecto que falló al generar PDF y mensaje de error asociado. */
  const [errorExportPorProyecto, setErrorExportPorProyecto] = useState<
    Record<string, string>
  >({});
  /** Proyecto abierto en el modal de edición. Null = modal oculto. */
  const [editando, setEditando] = useState<Proyecto | null>(null);

  /**
   * Carga los datos del proyecto y abre el modal con la vista previa.
   * El usuario ve el documento en pantalla y, si está bien, pulsa
   * "Imprimir / Guardar PDF" para abrir el diálogo nativo del navegador.
   * Cero librerías externas (sin jsPDF/html2canvas).
   */
  async function exportarPDF(proyectoId: string) {
    // Limpia error previo de ESTE proyecto.
    setErrorExportPorProyecto((prev) => {
      const { [proyectoId]: _ignored, ...rest } = prev;
      void _ignored;
      return rest;
    });
    setExportando(proyectoId);
    try {
      const datos = await cargarDatosProyectoParaReporte(proyectoId);
      if (!datos) {
        throw new Error("Proyecto no encontrado");
      }
      setReporte(datos);
    } catch (e) {
      const msg = (e as Error).message;
      setErrorExportPorProyecto((prev) => ({ ...prev, [proyectoId]: msg }));
      // Auto-clear a los 5s para no saturar la card.
      setTimeout(() => {
        setErrorExportPorProyecto((prev) => {
          const { [proyectoId]: _ignored, ...rest } = prev;
          void _ignored;
          return rest;
        });
      }, 5000);
    } finally {
      setExportando(null);
    }
  }

  async function crear() {
    if (!nombre.trim()) {
      setErrForm("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setErrForm(null);
    try {
      await crearProyecto({ nombre, color, descripcion: desc || null, area_id: areaId || null });
      setNombre("");
      setDesc("");
      setColor("#64748b");
      setAreaId("");
      setMostrarForm(false);
      await reload();
    } catch (e) {
      setErrForm((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="font-medium text-red-600 dark:text-red-400">Error al cargar proyectos</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <button
          onClick={reload}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const tareasPorProyecto = new Map<string, Tarea[]>();
  for (const t of tareas) {
    if (t.proyecto_id) {
      const arr = tareasPorProyecto.get(t.proyecto_id) ?? [];
      arr.push(t);
      tareasPorProyecto.set(t.proyecto_id, arr);
    }
  }

  // Agrupar metas por proyecto. Orden estable: por `codigo` ascendente
  // (que ya devuelve fetchMetas), luego por título como desempate.
  const metasPorProyecto = new Map<string, Meta[]>();
  // Metas sin proyecto asignado (migration 0024: metas.proyecto_id nullable).
  // Las mostramos en una sección aparte al final, igual que /areas hace
  // con los proyectos sin área, para que David no las pierda.
  const metasHuerfanas: Meta[] = [];
  for (const m of metas) {
    if (m.proyecto_id) {
      const arr = metasPorProyecto.get(m.proyecto_id) ?? [];
      arr.push(m);
      metasPorProyecto.set(m.proyecto_id, arr);
    } else {
      metasHuerfanas.push(m);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupa metas y tareas por proyecto. {loading ? "…" : data.length} proyectos.
          </p>
          {procesando && (
            <p className="mt-1 inline-flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              {procesando}
            </p>
          )}
        </div>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {mostrarForm ? <IconX className="h-4 w-4" /> : <span className="text-base leading-none">+</span>}
          {mostrarForm ? "Cancelar" : "Nuevo proyecto"}
        </button>
      </header>

      {mostrarForm && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nuevo proyecto
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="p.ej. Q4 fooday-launch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-1 outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Área</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Sin área —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <label className="text-xs font-medium">Descripción (opcional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {errForm && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errForm}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={crear}
              disabled={guardando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Crear"}
            </button>
          </div>
        </section>
      )}

      {data.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          Aún no tienes proyectos. Crea el primero con el botón de arriba.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((p) => {
            const tareasDelProyecto = tareasPorProyecto.get(p.id) ?? [];
            const activas = tareasDelProyecto.filter(
              (t) => t.estado !== "hecha" && t.estado !== "archivada",
            );
            const metasDelProyecto = metasPorProyecto.get(p.id) ?? [];
            return (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{ backgroundColor: p.color ?? "#64748b" }}
                        aria-hidden
                      />
                      <h3 className="truncate font-semibold tracking-tight">
                        {p.nombre}
                      </h3>
                      {p.archivado && (
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          archivado
                        </span>
                      )}
                    </div>
                    {p.descripcion && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.descripcion}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {activas.length} activas · {p.tareas_hechas} hechas
                      </span>
                      {p.total_tareas > 0 && (
                        <span className="text-muted-foreground/60">
                          ({p.total_tareas} total)
                        </span>
                      )}
                    </div>
                    {metasDelProyecto.length > 0 && (
                      <div className="mt-3 border-t border-border pt-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Metas hijas ({metasDelProyecto.length})
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {metasDelProyecto.map((m) => {
                            const dotClass: Record<string, string> = {
                              sin_empezar: "bg-slate-400",
                              en_progreso: "bg-amber-500",
                              bloqueada: "bg-red-500",
                              completada: "bg-emerald-500",
                              archivada: "bg-slate-300",
                            };
                            return (
                              <li key={m.id} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                    dotClass[m.estado] ?? "bg-slate-400"
                                  }`}
                                  aria-hidden
                                />
                                <Link
                                  href={`/metas/detalle?id=${m.id}`}
                                  className="min-w-0 flex-1 truncate text-foreground hover:underline"
                                  title={m.titulo}
                                >
                                  {m.codigo ? (
                                    <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                                      {m.codigo}
                                    </span>
                                  ) : null}
                                  {m.titulo}
                                </Link>
                                {m.es_wig && (
                                  <IconTarget
                                    className="h-3 w-3 shrink-0 text-violet-500"
                                    aria-label="WIG activo"
                                  />
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/tareas?proyecto=${p.id}`}
                      className="rounded-md p-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Ver tareas del proyecto"
                    >
                      ver
                    </Link>
                    <button
                      onClick={() => setEditando(p)}
                      disabled={procesando !== null}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title="Editar proyecto"
                      aria-label="Editar proyecto"
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => exportarPDF(p.id)}
                      disabled={
                        exportando !== null || procesando !== null
                      }
                      className="inline-flex items-center gap-1 rounded-md p-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title="Exportar proyecto a PDF (Imprimir a PDF del navegador)"
                    >
                      {exportando === p.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <IconFile className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {exportando === p.id ? "Generando…" : "PDF"}
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        const accion = p.archivado ? "desarchivar" : "archivar";
                        // Cascade preview: contamos qué se va a afectar.
                        const metasAfectadas = metasDelProyecto.filter(
                          (m) =>
                            p.archivado
                              ? m.estado === "archivada"
                              : m.estado !== "archivada" && m.estado !== "completada",
                        ).length;
                        const tareasAfectadas = tareasDelProyecto.filter(
                          (t) =>
                            p.archivado
                              ? t.estado === "archivada"
                              : t.estado !== "hecha" && t.estado !== "archivada",
                        ).length;
                        let msg = `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${p.nombre}"?`;
                        if (metasAfectadas > 0 || tareasAfectadas > 0) {
                          const verb = p.archivado ? "se desarchivarán" : "se archivarán";
                          msg = `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${p.nombre}"?\n\nEsto arrastrará en cascada:\n`;
                          if (metasAfectadas > 0) {
                            msg += `  · ${metasAfectadas} meta${metasAfectadas === 1 ? "" : "s"} hija${metasAfectadas === 1 ? "" : "s"} ${verb}\n`;
                          }
                          if (tareasAfectadas > 0) {
                            msg += `  · ${tareasAfectadas} tarea${tareasAfectadas === 1 ? "" : "s"} ${verb}\n`;
                          }
                          msg += `\nPuedes ${p.archivado ? "desarchivar" : "archivar"} el proyecto de nuevo para revertir.`;
                        }
                        if (!confirm(msg)) return;
                        setProcesando(`${accion} "${p.nombre}"…`);
                        try {
                          if (p.archivado) {
                            // Desarchivar: solo cambia el flag del proyecto.
                            await archivarProyecto(p.id, false);
                          } else {
                            // Archivar: cascada a metas y tareas.
                            await archivarProyectoEnCascada(p.id, true);
                          }
                          await reload();
                        } catch (e) {
                          alert(`No se pudo ${accion}: ${(e as Error).message}`);
                        } finally {
                          setProcesando(null);
                        }
                      }}
                      disabled={procesando !== null}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                      title={p.archivado ? "Desarchivar" : "Archivar"}
                    >
                      <IconArchive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        // Contamos el impacto del delete (las metas NO se borran,
                        // quedan con proyecto_id=null gracias al ON DELETE SET
                        // NULL de la FK; las tareas tampoco, mismo motivo).
                        const metasHuerfanas = metasDelProyecto.length;
                        const tareasHuerfanas = tareasDelProyecto.length;
                        let msg = `¿Eliminar "${p.nombre}"?`;
                        if (metasHuerfanas > 0 || tareasHuerfanas > 0) {
                          msg += `\n\nLas filas NO se borran, solo se desvinculan del proyecto:\n`;
                          if (metasHuerfanas > 0) {
                            msg += `  · ${metasHuerfanas} meta${metasHuerfanas === 1 ? "" : "s"} quedará${metasHuerfanas === 1 ? "á" : "án"} huérfana${metasHuerfanas === 1 ? "" : "s"} (sin proyecto, pero vivas en /metas)\n`;
                          }
                          if (tareasHuerfanas > 0) {
                            msg += `  · ${tareasHuerfanas} tarea${tareasHuerfanas === 1 ? "" : "s"} quedará${tareasHuerfanas === 1 ? "á" : "án"} sin proyecto\n`;
                          }
                          msg += `\nSi quieres archivarlo TODO junto, usa el botón Archivar.`;
                        }
                        if (!confirm(msg)) return;
                        setProcesando(`eliminando "${p.nombre}"…`);
                        try {
                          await eliminarProyecto(p.id);
                          await reload();
                        } catch (e) {
                          alert(`No se pudo eliminar: ${(e as Error).message}`);
                        } finally {
                          setProcesando(null);
                        }
                      }}
                      disabled={procesando !== null}
                      className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-red-500 disabled:opacity-50"
                      title="Eliminar proyecto"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {errorExportPorProyecto[p.id] && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {errorExportPorProyecto[p.id]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {metasHuerfanas.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            ⚠️ {metasHuerfanas.length} meta{metasHuerfanas.length === 1 ? "" : "s"} sin proyecto
          </h2>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
            Estas metas no tienen proyecto asignado. Para vincularlas a uno,
            edítalas desde{" "}
            <Link href="/metas" className="underline">
              /metas
            </Link>
            .
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {metasHuerfanas.map((m) => {
              const dotClass: Record<string, string> = {
                sin_empezar: "bg-slate-400",
                en_progreso: "bg-amber-500",
                bloqueada: "bg-red-500",
                completada: "bg-emerald-500",
                archivada: "bg-slate-300",
              };
              return (
                <li
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-background px-2 py-1 text-xs"
                >
                  <IconFolder className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      dotClass[m.estado] ?? "bg-slate-400"
                    }`}
                    aria-hidden
                  />
                  <Link
                    href={`/metas/detalle?id=${m.id}`}
                    className="text-foreground hover:underline"
                    title={m.titulo}
                  >
                    {m.codigo ? (
                      <span className="mr-1 font-mono text-[10px] text-muted-foreground">
                        {m.codigo}
                      </span>
                    ) : null}
                    {m.titulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ReporteModal datos={reporte} onCerrar={() => setReporte(null)} />

      {editando && (
        <EditarProyectoModal
          proyecto={editando}
          areas={areas}
          onClose={() => setEditando(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}