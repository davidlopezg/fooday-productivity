"use client";

// ============================================================================
// agente/contexto.ts — el "estado real" del usuario, en texto compacto.
//
// QUÉ ES ESTO
//   La app es una SPA estática (`output: 'export'`): no hay route handlers,
//   ni server actions, ni un backend donde meter tool-calling. Así que la
//   única forma de que el agente "sepa" lo que tienes es construirle un
//   SNAPSHOT en texto y metérselo en el prompt.
//
// POR QUÉ UN SNAPSHOT Y NO UNA TOOL POR PREGUNTA
//   · Un router previo ("¿qué datasets necesita esta pregunta?") duplica
//     las llamadas a la IA y añade un modo de fallo: si clasifica mal, el
//     agente responde "no tengo ese dato" cuando sí lo tenía.
//   · Con el snapshot completo el agente ve TODO y decide solo. Cuesta más
//     tokens, pero una sola llamada, cero falsos negativos y respuestas
//     mucho más útiles ("¿qué está en riesgo?" necesita metas + KRs +
//     tareas a la vez).
//   · El snapshot se recorta con topes (tareas, metas) para que no crezca
//     sin límite.
//
// EL FORMATO
//   Texto plano con secciones. Es lo que mejor consume un LLM cuando le
//   pides que cite datos concretos: cada línea es un hecho, con su id
//   entre corchetes para que pueda citarlo.
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import {
  fetchContadores,
  fetchKRsFocoSemanal,
  fetchMetasConProgreso,
  fetchNorte,
  fetchPlanHoy,
  fetchProyectosConConteo,
} from "@/lib/queries";
import { getCurrentISOWeek, localYMD } from "@/lib/semana";
import type { MetaConPlan, Proyecto, Tarea } from "@/lib/types";
import type { TipoRef } from "@/lib/agente/chatStore";

/** Entidad que el agente puede citar y la app puede enlazar. */
export type EntidadSnapshot = {
  tipo: TipoRef;
  id: string;
  etiqueta: string;
  /** Para KRs: la meta a la que pertenece (destino del enlace). */
  meta_id?: string | null;
};

/** Topes para que el snapshot no crezca sin límite. */
const MAX_TAREAS = 300;
const MAX_METAS = 60;
const MAX_KRS_POR_META = 8;

/** Estados de tarea que cuentan como "pendiente" para el snapshot. */
const ESTADOS_ACTIVOS = ["pendiente", "en_progreso", "bloqueada"];

/** Orden de prioridad al listar tareas (lo crítico primero). */
const ORDEN_PRIORIDAD: Record<string, number> = {
  critica: 0,
  urgente: 1,
  alta: 2,
  media: 3,
  baja: 4,
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Snapshot en texto del sistema del usuario.
 *
 * @param consulta Texto de la pregunta del usuario. Se usa solo para
 *   priorizar (si menciona un proyecto o meta, sus tareas suben de lista).
 * @returns El texto del snapshot + el catálogo de entidades que contiene
 *   (para validar y etiquetar las referencias que cite el agente).
 */
export async function construirContexto(consulta: string): Promise<{
  texto: string;
  catalogo: EntidadSnapshot[];
}> {
  const iso = getCurrentISOWeek();
  // localYMD, no toISOString(): la fecha del snapshot es el "día civil" del
  // usuario, no un instante UTC (a las 00:30 en UTC+2 sería el día anterior).
  const hoy = localYMD(new Date());
  const catalogo: EntidadSnapshot[] = [];

  const [
    contadores,
    metasRes,
    proyectosRes,
    tareasRes,
    planRes,
    focoRes,
    norteRes,
  ] = await Promise.all([
    fetchContadores().catch(() => null),
    fetchMetasConProgreso().catch(() => [] as MetaConPlan[]),
    fetchProyectosConConteo().catch(() => [] as Array<Proyecto & { total_tareas: number; tareas_hechas: number }>),
    cargarTareasActivas().catch(() => [] as Tarea[]),
    fetchPlanHoy().catch(() => null),
    fetchKRsFocoSemanal(iso.anio, iso.semana_iso).catch(() => []),
    fetchNorte().catch(() => null),
  ]);

  const lineas: string[] = [];
  lineas.push(`SNAPSHOT DEL SISTEMA · hoy=${hoy} · semana ISO ${iso.semana_iso}/${iso.anio}`);
  lineas.push(
    `Contadores: ${contadores?.tareasPendientes ?? "?"} tareas pendientes · ` +
      `${contadores?.metasActivas ?? "?"} metas activas · ` +
      `${contadores?.capturasPendientes ?? "?"} capturas sin procesar`,
  );
  lineas.push("");

  // ── METAS + KRs ──────────────────────────────────────────────────────────
  const metas = metasRes.filter((m) => m.meta.estado !== "archivada").slice(0, MAX_METAS);
  lineas.push(`METAS (${metas.length})`);
  if (metas.length === 0) lineas.push("(no hay metas)");
  for (const mp of metas) {
    const m = mp.meta;
    const krs = mp.resultados.slice(0, MAX_KRS_POR_META);
    const flags = [
      m.es_wig ? "WIG" : null,
      m.ambito ? m.ambito : null,
      m.prioridad ? `prio:${m.prioridad}` : null,
      m.fecha_objetivo ? `objetivo:${m.fecha_objetivo}` : null,
      m.plazo ? `plazo:${m.plazo}` : null,
    ].filter(Boolean);
    lineas.push(
      `- [${m.id}] "${m.titulo}" · estado:${m.estado}` +
        (flags.length ? ` · ${flags.join(" · ")}` : "") +
        ` · tareas:${mp.tareas_hechas}/${mp.total_tareas} · progreso:${pct(mp.progreso)}`,
    );
    catalogo.push({ tipo: "meta", id: m.id, etiqueta: m.titulo });
    if (m.descripcion) lineas.push(`    desc: ${recortar(m.descripcion, 220)}`);
    if (m.contexto) lineas.push(`    contexto: ${recortar(m.contexto, 220)}`);
    if (m.situacion_actual) lineas.push(`    situación: ${recortar(m.situacion_actual, 220)}`);
    for (const kr of krs) {
      const periodos = kr.periodos.map((p) => p.nombre).join("/");
      const metric = kr.valor_objetivo != null
        ? `${kr.valor_actual ?? 0}/${kr.valor_objetivo}${kr.unidad ? " " + kr.unidad : ""}`
        : (kr.metrica ? kr.metrica : null);
      const hechas = kr.tareas.filter((t) => t.estado === "hecha").length;
      lineas.push(
        `    KR [${kr.id}] "${kr.titulo}" · ${periodos || "sin periodo"} · estado:${kr.estado}` +
          (metric ? ` · ${metric}` : "") +
          ` · tareas:${hechas}/${kr.tareas.length}`,
      );
      catalogo.push({ tipo: "kr", id: kr.id, etiqueta: kr.titulo, meta_id: m.id });
    }
    if (mp.resultados.length > MAX_KRS_POR_META) {
      lineas.push(`    (+${mp.resultados.length - MAX_KRS_POR_META} KRs más)`);
    }
  }
  lineas.push("");

  // ── PROYECTOS ───────────────────────────────────────────────────────────
  const proyectos = proyectosRes.filter((p) => !p.archivado);
  lineas.push(`PROYECTOS (${proyectos.length})`);
  if (proyectos.length === 0) lineas.push("(no hay proyectos)");
  for (const p of proyectos) {
    const metasDelProyecto = metas
      .filter((mp) => mp.meta.proyecto_id === p.id)
      .map((mp) => `"${mp.meta.titulo}"(${mp.meta.estado})`);
    lineas.push(
      `- [${p.id}] "${p.nombre}" · tareas:${p.tareas_hechas}/${p.total_tareas}` +
        (metasDelProyecto.length ? ` · metas: ${metasDelProyecto.join(", ")}` : " · sin metas"),
    );
    catalogo.push({ tipo: "proyecto", id: p.id, etiqueta: p.nombre });
    if (p.descripcion) lineas.push(`    desc: ${recortar(p.descripcion, 220)}`);
  }
  lineas.push("");

  // ── TAREAS ──────────────────────────────────────────────────────────────
  const tareas = ordenarTareas(tareasRes, consulta);
  const mostradas = tareas.slice(0, MAX_TAREAS);
  lineas.push(`TAREAS ACTIVAS (${tareas.length}${tareas.length > MAX_TAREAS ? `, se muestran ${MAX_TAREAS}` : ""})`);
  if (tareas.length === 0) lineas.push("(no hay tareas activas)");
  const metaTitulo = new Map(metas.map((mp) => [mp.meta.id, mp.meta.titulo]));
  const krTitulo = new Map<string, string>();
  for (const mp of metas) for (const kr of mp.resultados) krTitulo.set(kr.id, kr.titulo);
  const proyectoNombre = new Map(proyectos.map((p) => [p.id, p.nombre]));
  for (const t of mostradas) {
    const etiquetas: string[] = [];
    if (t.meta_id && metaTitulo.has(t.meta_id)) etiquetas.push(`meta:"${metaTitulo.get(t.meta_id)}"`);
    if (t.resultado_periodo_id && krTitulo.has(t.resultado_periodo_id)) {
      etiquetas.push(`KR:"${krTitulo.get(t.resultado_periodo_id)}"`);
    }
    if (t.proyecto_id && proyectoNombre.has(t.proyecto_id)) {
      etiquetas.push(`proyecto:"${proyectoNombre.get(t.proyecto_id)}"`);
    }
    if (t.area_id) etiquetas.push(`area:${t.area_id.slice(0, 8)}`);
    lineas.push(
      `- [${t.id}] "${t.titulo}" · ${t.prioridad ?? "sin-prio"} · ${t.estado}` +
        (t.fecha_fin ? ` · fecha_fin:${t.fecha_fin}` : "") +
        (t.deadline ? ` · deadline:${t.deadline}` : "") +
        (t.es_wig ? " · WIG" : "") +
        (t.pendiente_respuesta ? " · esperando-respuesta" : "") +
        (etiquetas.length ? ` · ${etiquetas.join(" · ")}` : ""),
    );
    catalogo.push({ tipo: "tarea", id: t.id, etiqueta: t.titulo });
  }
  lineas.push("");

  // ── PLAN DE HOY ─────────────────────────────────────────────────────────
  lineas.push("PLAN DE HOY");
  if (!planRes) {
    lineas.push("(no hay plan generado para hoy)");
  } else {
    const hechas = planRes.tareas.filter((t) => t.hecho).length;
    lineas.push(
      `- semáforo:${planRes.semaforo ?? "?"} · tareas:${hechas}/${planRes.tareas.length} · ` +
        `bloques:${planRes.num_bloques_activos ?? 0}`,
    );
    if (planRes.resumen) lineas.push(`  resumen: ${recortar(planRes.resumen, 300)}`);
    if (planRes.recomendacion) lineas.push(`  recomendación: ${recortar(planRes.recomendacion, 300)}`);
    for (const t of planRes.tareas.slice(0, 15)) {
      lineas.push(`  - ${t.hecho ? "[x]" : "[ ]"} ${t.titulo_libre ?? "(sin título)"}`);
    }
  }
  lineas.push("");

  // ── FOCO SEMANAL ────────────────────────────────────────────────────────
  lineas.push(`FOCO DE LA SEMANA (ISO ${iso.semana_iso})`);
  if (focoRes.length === 0) {
    lineas.push("(no hay KRs en foco esta semana)");
  } else {
    for (const f of focoRes) {
      const periodos = f.periodos.map((p) => p.nombre).join("/");
      lineas.push(
        `- KR [${f.kr.id}] "${f.kr.titulo}" (meta "${f.meta.titulo}") · ${periodos || "sin periodo"} · ` +
          `tareas:${f.tareas_hechas}/${f.tareas.length} · ${f.kr.estado}`,
      );
    }
  }
  lineas.push("");

  // ── NORTE ───────────────────────────────────────────────────────────────
  if (norteRes) {
    lineas.push("NORTE (identidad)");
    for (const p of norteRes.propositos) lineas.push(`- propósito: ${p.texto}`);
    for (const v of norteRes.valores) lineas.push(`- valor: ${v.nombre}${v.descripcion ? ` — ${recortar(v.descripcion, 160)}` : ""}`);
    for (const v of norteRes.visiones) lineas.push(`- visión (${v.horizonte}): ${v.texto}`);
    lineas.push("");
  }

  return { texto: lineas.join("\n"), catalogo };
}

/** Recorta un texto largo para no inflar el prompt. */
function recortar(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Tareas activas (pendiente / en_progreso / bloqueada) con los campos
 *  justos para el snapshot (sin subtareas ni adjuntos). */
async function cargarTareasActivas(): Promise<Tarea[]> {
  const { data, error } = await createClient()
    .from("tareas")
    .select(
      "id,titulo,estado,prioridad,fecha_fin,deadline,meta_id,resultado_periodo_id,proyecto_id,area_id,es_wig,pendiente_respuesta",
    )
    .in("estado", ESTADOS_ACTIVOS)
    .order("created_at", { ascending: false })
    .limit(600);
  if (error) throw error;
  return (data ?? []) as Tarea[];
}

/** Ordena las tareas: primero las que la consulta menciona (por coincidencia
 *  de texto con un proyecto/meta), luego por prioridad y fecha. */
function ordenarTareas(tareas: Tarea[], consulta: string): Tarea[] {
  const q = consulta.toLowerCase();
  const peso = (t: Tarea): number => {
    if (!q) return 0;
    let p = 0;
    if (q.includes(t.titulo.toLowerCase())) p -= 100;
    for (const palabra of q.split(/\s+/)) {
      if (palabra.length < 4) continue;
      if (t.titulo.toLowerCase().includes(palabra)) p -= 10;
    }
    if (p !== 0) return p;
    return ORDEN_PRIORIDAD[t.prioridad ?? ""] ?? 9;
  };
  return [...tareas].sort((a, b) => {
    const d = peso(a) - peso(b);
    if (d !== 0) return d;
    const pa = ORDEN_PRIORIDAD[a.prioridad ?? ""] ?? 9;
    const pb = ORDEN_PRIORIDAD[b.prioridad ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.fecha_fin ?? "9999").localeCompare(b.fecha_fin ?? "9999");
  });
}
