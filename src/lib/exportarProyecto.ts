"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  Area,
  Meta,
  MetaConPlan,
  Periodo,
  Proyecto,
  ResultadoConTareas,
  ResultadoPeriodo,
  Tarea,
} from "@/lib/types";
import { ordenarSubtareas } from "@/lib/queries";

/**
 * Carga TODO lo necesario para imprimir el PDF de un proyecto:
 *  - El proyecto y su área.
 *  - Las metas del proyecto (incluye sus KRs ya cargados).
 *  - Los periodos de los KRs (migration 0028: vía `kr_periodos`).
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

  // 1) Metas del proyecto PRIMERO: necesitamos sus ids para traerse las
  //    tareas que viven dentro de sus KRs (esas NO llevan `proyecto_id`).
  const metasRes = await supabase
    .from("metas")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("codigo", { ascending: true, nullsFirst: false })
    .order("titulo");
  if (metasRes.error) throw metasRes.error;

  const metaIds = (metasRes.data ?? []).map((m: { id: string }) => m.id);
  const filtroTareas =
    metaIds.length > 0
      ? `proyecto_id.eq.${proyectoId},meta_id.in.(${metaIds.join(",")})`
      : `proyecto_id.eq.${proyectoId}`;

  const [proyectoRes, krsRes, krPeriodosRes, periodosRes, tareasRes, areasRes] =
    await Promise.all([
      supabase
        .from("proyectos")
        .select("id,nombre,color,descripcion,orden,archivado,area_id")
        .eq("id", proyectoId)
        .maybeSingle(),
      // Migration 0028: KRs sin periodo_id. Cargamos los de las metas
      // de este proyecto (filtramos tras la query; las metas del
      // proyecto son pocas).
      supabase
        .from("resultados_periodo")
        .select(
          "id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden",
        )
        .order("orden"),
      // Asignaciones KR↔periodo (migration 0028).
      supabase.from("kr_periodos").select("kr_id,periodo_id,orden"),
      supabase
        .from("periodos")
        .select("id,tipo,anio,numero,nombre,fecha_inicio,fecha_fin"),
      // Todas las tareas del proyecto (directas + las de los KRs de sus
      // metas), sin filtrar por estado.
      supabase
        .from("tareas")
        .select("*, subtareas:tareas_subtareas(*)")
        .or(filtroTareas)
        .order("created_at", { ascending: false }),
      supabase.from("areas").select("id,nombre,color,orden"),
    ]);

  if (proyectoRes.error) throw proyectoRes.error;
  if (!proyectoRes.data) return null;
  if (krsRes.error) throw krsRes.error;
  if (krPeriodosRes.error) throw krPeriodosRes.error;
  if (periodosRes.error) throw periodosRes.error;
  if (tareasRes.error) throw tareasRes.error;
  if (areasRes.error) throw areasRes.error;

  const proyecto = proyectoRes.data as Proyecto;
  const metas = (metasRes.data ?? []) as Meta[];
  const krs = (krsRes.data ?? []) as ResultadoPeriodo[];
  const periodosById = new Map<string, Periodo>(
    ((periodosRes.data ?? []) as Periodo[]).map((p) => [p.id, p]),
  );
  const tareas = ordenarSubtareas((tareasRes.data ?? []) as Tarea[]);
  const areas = (areasRes.data ?? []) as Area[];
  const area = proyecto.area_id
    ? areas.find((a) => a.id === proyecto.area_id) ?? null
    : null;

  // Mapa: kr_id -> Periodo[] (ordenados por kr_periodos.orden, luego anio/numero).
  const periodosPorKr = new Map<string, Periodo[]>();
  for (const a of (krPeriodosRes.data ?? []) as Array<{
    kr_id: string;
    periodo_id: string;
    orden: number;
  }>) {
    const p = periodosById.get(a.periodo_id);
    if (!p) continue;
    const arr = periodosPorKr.get(a.kr_id) ?? [];
    arr.push(p);
    periodosPorKr.set(a.kr_id, arr);
  }
  for (const arr of periodosPorKr.values()) {
    arr.sort((x, y) => x.anio - y.anio || x.numero - y.numero);
  }

  // Filtramos KRs a los de las metas del proyecto.
  const metaIdSet = new Set(metas.map((m) => m.id));
  const krsDelProyecto = krs.filter((r) => metaIdSet.has(r.meta_id));

  const krsPorMeta = new Map<string, ResultadoPeriodo[]>();
  for (const r of krsDelProyecto) {
    const arr = krsPorMeta.get(r.meta_id) ?? [];
    arr.push(r);
    krsPorMeta.set(r.meta_id, arr);
  }

  const tareasPorKr = new Map<string, Tarea[]>();
  for (const t of tareas) {
    if (!t.resultado_periodo_id) continue;
    const arr = tareasPorKr.get(t.resultado_periodo_id) ?? [];
    arr.push(t);
    tareasPorKr.set(t.resultado_periodo_id, arr);
  }

  const metasArmadas: MetaConPlan[] = metas.map((m) => {
    const krsDeMeta = (krsPorMeta.get(m.id) ?? [])
      .map((r): ResultadoConTareas | null => {
        const periodosDelKr = periodosPorKr.get(r.id) ?? [];
        const periodo = periodosDelKr[0] ?? null;
        if (!periodo) {
          // KR huérfano: mostrar como "sin trimestre".
          return {
            ...r,
            periodos: [],
            periodo: {
              id: "",
              tipo: "custom",
              anio: 0,
              numero: 0,
              nombre: "sin trimestre",
              fecha_inicio: "",
              fecha_fin: "",
            },
            tareas: (tareasPorKr.get(r.id) ?? []).slice().sort(
              (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
            ),
          };
        }
        return {
          ...r,
          periodos: periodosDelKr,
          periodo,
          tareas: (tareasPorKr.get(r.id) ?? []).slice().sort(
            (a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
          ),
        };
      })
      .filter((r): r is ResultadoConTareas => r !== null)
      .sort((a, b) => {
        if (a.periodo.anio !== b.periodo.anio) return a.periodo.anio - b.periodo.anio;
        if (a.periodo.numero !== b.periodo.numero) return a.periodo.numero - b.periodo.numero;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });
    const total = krsDeMeta.reduce((acc, r) => acc + r.tareas.length, 0);
    const hechas = krsDeMeta.reduce(
      (acc, r) => acc + r.tareas.filter((t) => t.estado === "hecha").length,
      0,
    );
    return {
      meta: m,
      resultados: krsDeMeta,
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