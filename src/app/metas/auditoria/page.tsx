"use client";

// ============================================================================
// /metas/auditoria — vista de "dónde le falta información" a cada meta.
// Pensada para una sola sesión de tarde: detectas huecos y los cierras
// con un click. No pretende reemplazar el formulario de edición.
//
// Señala con ❌ lo que falta y con 🟢 lo que está:
//   · área          (la meta suelta sin área no se vincula al Norte)
//   · proyecto      (la meta suelta no se agrupa con sus hermanas)
//   · fecha objetivo (sin fecha, la meta se diluye)
//   · contexto      (sin contexto, el agente "olvida" cada vez)
//   · situación actual (idem)
//   · KRs           (si es 0, no hay plan trimestral)
//
// Click en "❌ falta" abre el EditarMetaModal preenfocado en ese campo.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAreas,
  fetchMetas,
  fetchMetasConProgreso,
  fetchProyectos,
  fetchResultadosPeriodo,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import { EditarMetaModal } from "@/components/EditarMetaModal";
import { IconArrowLeft, IconCheck, IconSparkles } from "@/components/icons";
import type { Area, Meta, MetaConPlan, Proyecto, ResultadoPeriodo } from "@/lib/types";

type Fila = {
  meta: Meta;
  area: Area | null;
  proyecto: Proyecto | null;
  numKrs: number;
  numTareas: number;
};

export default function AuditoriaMetasPage() {
  const { data: metas } = useData<Meta[]>(fetchMetas, []);
  const { data: metasConPlan } = useData<MetaConPlan[]>(
    fetchMetasConProgreso,
    [],
  );
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: proyectos } = useData<Proyecto[]>(() => fetchProyectos(), []);
  const { data: resultados } = useData<ResultadoPeriodo[]>(
    () => fetchResultadosPeriodo(),
    [],
  );

  const [metaEdit, setMetaEdit] = useState<Meta | null>(null);

  // Conteos por meta_id (lo justo para la auditoría — sin cargar tareas).
  const krsPorMeta = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resultados ?? []) m.set(r.meta_id, (m.get(r.meta_id) ?? 0) + 1);
    return m;
  }, [resultados]);

  const tareasPorMeta = useMemo(() => {
    const m = new Map<string, number>();
    for (const mp of metasConPlan ?? []) {
      let n = 0;
      for (const r of mp.resultados ?? []) n += (r.tareas ?? []).length;
      m.set(mp.meta.id, n);
    }
    return m;
  }, [metasConPlan]);

  const areaById = useMemo(() => {
    const m = new Map<string, Area>();
    for (const a of areas ?? []) m.set(a.id, a);
    return m;
  }, [areas]);

  const proyectoById = useMemo(() => {
    const m = new Map<string, Proyecto>();
    for (const p of proyectos ?? []) m.set(p.id, p);
    return m;
  }, [proyectos]);

  // Solo metas activas (no archivadas ni completadas — la auditoría
  // se enfoca en lo que aún tiene que moverse).
  const filas: Fila[] = useMemo(() => {
    return (metas ?? [])
      .filter((m) => m.estado !== "archivada")
      .map((meta) => ({
        meta,
        area: meta.area_id ? areaById.get(meta.area_id) ?? null : null,
        proyecto: meta.proyecto_id ? proyectoById.get(meta.proyecto_id) ?? null : null,
        numKrs: krsPorMeta.get(meta.id) ?? 0,
        numTareas: tareasPorMeta.get(meta.id) ?? 0,
      }))
      .sort((a, b) => {
        // Primero las que más huecos tienen (urgencia visual).
        const huecos = (f: Fila) =>
          (f.area ? 0 : 1) +
          (f.proyecto ? 0 : 1) +
          (f.meta.fecha_objetivo ? 0 : 1) +
          (f.meta.contexto ? 0 : 1) +
          (f.meta.situacion_actual ? 0 : 1) +
          (f.numKrs > 0 ? 0 : 1);
        return huecos(b) - huecos(a);
      });
  }, [metas, areaById, proyectoById, krsPorMeta, tareasPorMeta]);

  const totalFilas = filas.length;
  const completas = filas.filter(
    (f) =>
      f.area &&
      f.proyecto &&
      f.meta.fecha_objetivo &&
      f.meta.contexto &&
      f.meta.situacion_actual &&
      f.numKrs > 0,
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/metas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver a Metas
      </Link>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <IconSparkles className="h-5 w-5 text-violet-500" />
              Auditoría de metas
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Una foto rápida de qué le falta a cada meta. Las que más
              huecos tienen aparecen arriba. Pulsa{" "}
              <span className="font-mono">❌ falta</span> para abrirlas en
              el editor y rellenarlas. La meta está{" "}
              <strong className="text-foreground">completa</strong> cuando
              tiene área, proyecto, fecha objetivo, contexto, situación
              actual y al menos un KR.
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Completas
            </div>
            <div className="text-2xl font-bold tabular-nums">
              {completas} / {totalFilas}
            </div>
          </div>
        </div>
      </header>

      {filas.length === 0 ? (
        <p className="rounded-md border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          No hay metas activas. Crea una en{" "}
          <Link href="/metas/nueva" className="font-mono text-foreground underline">
            /metas/nueva
          </Link>{" "}
          o pídele una al{" "}
          <Link href="/metas/agente" className="font-mono text-foreground underline">
            /metas/agente
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Meta</th>
                <th className="px-3 py-2">Área</th>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Fecha objetivo</th>
                <th className="px-3 py-2">Contexto</th>
                <th className="px-3 py-2">Situación</th>
                <th className="px-3 py-2 text-right">KRs</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => {
                const completa =
                  f.area &&
                  f.proyecto &&
                  f.meta.fecha_objetivo &&
                  f.meta.contexto &&
                  f.meta.situacion_actual &&
                  f.numKrs > 0;
                return (
                  <tr
                    key={f.meta.id}
                    className={
                      completa
                        ? "border-b border-border last:border-0"
                        : "border-b border-border bg-amber-500/5 last:border-0"
                    }
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{f.meta.titulo}</div>
                      {f.meta.codigo && (
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {f.meta.codigo}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {f.area ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <IconCheck className="h-3 w-3" />
                          {f.area.nombre}
                        </span>
                      ) : (
                        <button
                          onClick={() => setMetaEdit(f.meta)}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ falta
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {f.proyecto ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <IconCheck className="h-3 w-3" />
                          {f.proyecto.nombre}
                        </span>
                      ) : (
                        <button
                          onClick={() => setMetaEdit(f.meta)}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ falta
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {f.meta.fecha_objetivo ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <IconCheck className="h-3 w-3" />
                          {f.meta.fecha_objetivo}
                        </span>
                      ) : (
                        <button
                          onClick={() => setMetaEdit(f.meta)}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ falta
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {f.meta.contexto ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <IconCheck className="h-3 w-3" />
                          <span className="line-clamp-1 max-w-[180px]">
                            {f.meta.contexto}
                          </span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setMetaEdit(f.meta)}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ falta
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {f.meta.situacion_actual ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
                          <IconCheck className="h-3 w-3" />
                          <span className="line-clamp-1 max-w-[180px]">
                            {f.meta.situacion_actual}
                          </span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setMetaEdit(f.meta)}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ falta
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-right tabular-nums">
                      {f.numKrs > 0 ? (
                        <span>
                          {f.numKrs}{" "}
                          <span className="text-[10px] text-muted-foreground">
                            ({f.numTareas} tareas)
                          </span>
                        </span>
                      ) : (
                        <Link
                          href={`/metas/detalle?id=${f.meta.id}`}
                          className="text-xs text-amber-700 underline hover:no-underline dark:text-amber-400"
                        >
                          ❌ 0
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <button
                        onClick={() => setMetaEdit(f.meta)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                        title="Editar meta"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        💡 Esta página NO modifica nada por sí misma. Solo te dice qué
        falta. Los cambios se hacen desde el editor (botón{" "}
        <strong>Editar</strong> de cada fila) o desde la tarjeta de la meta
        en <Link href="/metas" className="font-mono underline">/metas</Link>.
      </p>

      {metaEdit && (
        <EditarMetaModal
          meta={metaEdit}
          onClose={() => setMetaEdit(null)}
          onChanged={() => setMetaEdit(null)}
        />
      )}
    </div>
  );
}
