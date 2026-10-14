"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Area,
  Meta,
  MetaConPlan,
  Periodo,
  Proyecto,
  ResultadoPeriodo,
  Tarea,
} from "@/lib/types";
import { ordenarSubtareas } from "@/lib/queries";

/**
 * Carga TODO lo necesario para imprimir el PDF de un proyecto:
 *  - El proyecto y su área.
 *  - Las metas del proyecto (incluye resultados_periodo ya cargados).
 *  - Los periodos de los resultados (necesarios para nombre/orden).
 *  - TODAS las tareas del proyecto (cualquier estado, incluido "archivada"
 *    y "descartada" — el doc muestra todas, hechas o no).
 *
 * Devuelve un `MetaConPlan[]` ya armado en cliente + el array plano de
 * tareas del proyecto, listo para pasar a `ProyectoReport`.
 *
 * Hacemos las queries en paralelo, igual que `fetchMetaConPlan`.
 */
export async function cargarDatosProyectoParaReporte(
  proyectoId: string,
): Promise<{
  proyecto: Proyecto;
  area: Area | null;
  metas: MetaConPlan[];
  tareas: Tarea[];
} | null> {
  const supabase = createClient();

  const [proyectoRes, metasRes, resultadosRes, periodosRes, tareasRes, areasRes] =
    await Promise.all([
      supabase
        .from("proyectos")
        .select("id,nombre,color,descripcion,orden,archivado,area_id")
        .eq("id", proyectoId)
        .maybeSingle(),
      supabase
        .from("metas")
        .select("*")
        .eq("proyecto_id", proyectoId)
        // Orden estable: por código (las que tienen van primero; nullsLast),
        // luego por título. fetchMetas ya hace esto pero aquí lo
        // replicamos porque leemos directo de la BD.
        .order("codigo", { ascending: true, nullsFirst: false })
        .order("titulo"),
      supabase
        .from("resultados_periodo")
        .select(
          "id,meta_id,periodo_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden",
        )
        .order("orden"),
      supabase
        .from("periodos")
        .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin"),
      // Todas las tareas del proyecto, sin filtrar por estado. El doc
      // muestra tanto las activas como las hechas/descartadas/archivadas.
      supabase
        .from("tareas")
        .select("*, subtareas:tareas_subtareas(*)")
        .eq("proyecto_id", proyectoId)
        .order("created_at", { ascending: false }),
      supabase.from("areas").select("id,nombre,color,orden"),
    ]);

  if (proyectoRes.error) throw proyectoRes.error;
  if (!proyectoRes.data) return null;
  if (metasRes.error) throw metasRes.error;
  if (resultadosRes.error) throw resultadosRes.error;
  if (periodosRes.error) throw periodosRes.error;
  if (tareasRes.error) throw tareasRes.error;
  if (areasRes.error) throw areasRes.error;

  const proyecto = proyectoRes.data as Proyecto;
  const metas = (metasRes.data ?? []) as Meta[];
  const resultados = (resultadosRes.data ?? []) as ResultadoPeriodo[];
  const periodosById = new Map<string, Periodo>(
    ((periodosRes.data ?? []) as Periodo[]).map((p) => [p.id, p]),
  );
  const tareas = ordenarSubtareas((tareasRes.data ?? []) as Tarea[]);
  const areas = (areasRes.data ?? []) as Area[];
  const area = proyecto.area_id
    ? areas.find((a) => a.id === proyecto.area_id) ?? null
    : null;

  // Mapeos para MetaConPlan.
  const resultadosPorMeta = new Map<string, ResultadoPeriodo[]>();
  for (const r of resultados) {
    const arr = resultadosPorMeta.get(r.meta_id) ?? [];
    arr.push(r);
    resultadosPorMeta.set(r.meta_id, arr);
  }

  const tareasPorResultado = new Map<string, Tarea[]>();
  for (const t of tareas) {
    if (!t.resultado_periodo_id) continue;
    const arr = tareasPorResultado.get(t.resultado_periodo_id) ?? [];
    arr.push(t);
    tareasPorResultado.set(t.resultado_periodo_id, arr);
  }

  const metasArmadas: MetaConPlan[] = metas.map((m) => {
    const rsDeMeta = (resultadosPorMeta.get(m.id) ?? [])
      .map((r) => {
        const periodo = periodosById.get(r.periodo_id);
        if (!periodo) return null;
        return {
          ...r,
          periodo,
          tareas: (tareasPorResultado.get(r.id) ?? []).slice().sort(
            (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
          ),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort(
        (a, b) =>
          a.periodo.anio - b.periodo.anio || a.periodo.numero - b.periodo.numero,
      );
    const total = rsDeMeta.reduce(
      (acc, r) => acc + r.tareas.length,
      0,
    );
    const hechas = rsDeMeta.reduce(
      (acc, r) => acc + r.tareas.filter((t) => t.estado === "hecha").length,
      0,
    );
    return {
      meta: m,
      resultados: rsDeMeta,
      total_tareas: total,
      tareas_hechas: hechas,
      progreso: total === 0 ? 0 : hechas / total,
    };
  });

  return {
    proyecto,
    area,
    metas: metasArmadas,
    tareas,
  };
}