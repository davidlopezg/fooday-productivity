"use client";

// ============================================================================
// /ritual-semanal/informe — el INFORME de una semana (issue #111).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El documento del ritual de esa semana, listo para imprimir (o guardar
//   como PDF): los proyectos vivos con su último contexto, las metas, las
//   3 WIGs, los KRs y los 7 días con las 3 tareas comprometidas de cada uno.
//
// DE DÓNDE SALE EL CONTENIDO
//   1. Del informe guardado en la bitácora (`ritual_semanales.informe`,
//      migration 0049): es la foto de la semana tal y como se decidió.
//   2. Si la semana se guardó ANTES de esa migration, se reconstruye con
//      los ids de la bitácora y los nombres de ahora (src/lib/ritual/informe.ts).
//
// CÓMO SE DESCARGA
//   Botón «Guardar PDF» → `window.print()` del navegador, con el CSS de
//   impresión de `src/app/globals.css` (A4, solo el documento).
//
// POR QUÉ LA SEMANA VA EN LA URL (?anio=&semana=)
//   La app se exporta como estático (output: export): una ruta con
//   parámetros dinámicos no se puede prerenderizar. La semana viaja en la
//   query y, si no viene, se usa la semana en curso.
// ============================================================================

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fetchKrsOverview,
  fetchMetas,
  fetchProyectos,
  fetchRitualSemanal,
  fetchTareasDiaRitual,
  fetchTareasPorIds,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import {
  informeDesdeBitacora,
  leerInforme,
  type InformeRitual,
} from "@/lib/ritual/informe";
import {
  DIAS_SEMANA,
  getCurrentISOWeek,
  isoWeekToMonday,
  localYMD,
} from "@/lib/semana";
import InformeRitualDoc from "@/components/ritual/InformeRitualDoc";

export default function InformeSemanalPage() {
  const searchParams = useSearchParams();
  const actual = getCurrentISOWeek();
  const anio = Number(searchParams.get("anio")) || actual.anio;
  const semana_iso = Number(searchParams.get("semana")) || actual.semana_iso;

  // Al imprimir sale SOLO el documento: se marca el <body> y el CSS de
  // impresión (src/app/globals.css) oculta el chrome de la app.
  useEffect(() => {
    document.body.dataset.print = "ritual";
    return () => {
      delete document.body.dataset.print;
    };
  }, []);

  // ── Datos ────────────────────────────────────────────────────────────────
  const { data: fila } = useData(
    () => fetchRitualSemanal(anio, semana_iso),
    null,
    [anio, semana_iso],
  );
  const { data: tresDelDia } = useData(
    () => fetchTareasDiaRitual(anio, semana_iso),
    [],
    [anio, semana_iso],
  );
  const { data: metas } = useData(() => fetchMetas(), []);
  const { data: krs } = useData(
    () => fetchKrsOverview(),
    { filas: [], aviso: null },
  );
  const { data: proyectos } = useData(() => fetchProyectos(), []);

  const idsTareas = useMemo(
    () => [...new Set((tresDelDia ?? []).map((r) => r.tarea_id))],
    [tresDelDia],
  );
  const { data: tareas } = useData(
    () => fetchTareasPorIds(idsTareas),
    [],
    [idsTareas.join(",")],
  );

  // ── El informe: el guardado si hay; si no, reconstruido ─────────────────
  const informe: InformeRitual | null = useMemo(() => {
    if (!fila) return null;
    const guardado = leerInforme(fila.informe);
    if (guardado) return guardado;
    // Semana guardada antes de la migration 0049: se reconstruye con los
    // ids de la bitácora y los nombres de ahora.
    const lunes = isoWeekToMonday(anio, semana_iso);
    const dias = DIAS_SEMANA.map((d) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + (d.id - 1));
      return { dia: d.id, nombre: d.nombre, fecha: localYMD(fecha) };
    });
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
      dias,
      tareasDia: (tresDelDia ?? []).map((r) => ({
        dia_semana: r.dia_semana,
        tarea_id: r.tarea_id,
      })),
    });
  }, [
    fila,
    metas,
    krs,
    proyectos,
    tareas,
    tresDelDia,
    anio,
    semana_iso,
  ]);

  // ── Rango de la semana (para la portada) ────────────────────────────────
  const rango = useMemo(() => {
    const lunes = isoWeekToMonday(anio, semana_iso);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    return `${fmt(lunes)} – ${fmt(domingo)}`;
  }, [anio, semana_iso]);

  const generado = useMemo(
    () => new Date().toLocaleDateString("es-ES", { dateStyle: "long" }),
    [],
  );

  function imprimir() {
    // Doble rAF: asegura que el navegador ya pintó el documento antes de
    // entrar al modo print (mismo truco que el reporte de proyecto).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  return (
    <div className="ritual-informe-page">
      {/* Toolbar: NO se imprime (el CSS de impresión oculta todo lo que
          cuelga de <body> salvo el documento). */}
      <div className="ritual-informe-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            Informe del ritual · {anio} · semana {semana_iso}
          </p>
          <p className="text-xs text-muted-foreground">
            {informe
              ? fila?.informe
                ? "Pulsa «Guardar PDF» y elige «Guardar como PDF» en el diálogo del navegador."
                : "Semana sin informe guardado: se ha reconstruido con los datos de ahora."
              : "Esta semana todavía no tiene ritual guardado."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/ritual-semanal/historial"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Volver al historial
          </Link>
          <button
            type="button"
            onClick={imprimir}
            disabled={!informe}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Guardar PDF
          </button>
        </div>
      </div>

      {/* El documento. */}
      <div className="ritual-informe-portal" data-preview="1">
        {informe ? (
          <InformeRitualDoc
            informe={informe}
            anio={anio}
            semana_iso={semana_iso}
            rango={rango}
            generado={generado}
          />
        ) : (
          <p className="ritual-informe__vacio p-6">
            No hay ritual guardado para la semana {semana_iso} de {anio}. Haz
            el ritual en{" "}
            <Link href="/ritual-semanal" className="underline underline-offset-4">
              /ritual-semanal
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
