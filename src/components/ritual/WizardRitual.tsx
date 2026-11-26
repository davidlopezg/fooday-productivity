"use client";

// ============================================================================
// WizardRitual — el RITUAL SEMANAL en 4 pasos (issue #88).
// ----------------------------------------------------------------------------
// LA REGLA DE ORO
//   "El wizard decide QUÉ; las pantallas hacen CÓMO". Aquí no se reordena
//   tareas ni se reparte la semana: eso es /semana. Aquí se toman las
//   DECISIONES del ritual y se escriben en los campos que ya existen.
//
// LOS 4 PASOS (en orden, porque el modelo va de arriba abajo)
//   1. Proyectos  → ¿qué proyectos viven? (estructura antes que foco)
//   2. Metas      → ¿qué metas viven, en qué fase y en qué situación?
//   3. WIGs meta  → las 3 metas que mandan (máx 3, con orden)
//   4. KRs        → de esas metas, los KRs de esta semana (2 capas)
//
// EL DRAFT
//   El ritual son ~2 h en el móvil. Todo lo que contestas se guarda en el
//   navegador (localStorage) y se restaura al volver. Nada se escribe en
//   la BD hasta que pulsas "Guardar y continuar" en cada paso: así puedes
//   rectificar sin ensuciar los datos.
//
// LA IA
//   Solo redacta borradores de situación (proyectos y metas). Proponer es
//   una cosa y decidir es otra: el texto siempre lo editas tú.
// ============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchFasesMeta,
  fetchIdsKRsFocoSemanal,
  fetchKrsOverview,
  fetchMetas,
  fetchProyectos,
  fetchProyectosEventos,
  fetchRitualSemanal,
  fetchTareas,
} from "@/lib/queries";
import {
  actualizarEstadoProyecto,
  actualizarEstadoMeta,
  actualizarFaseMeta,
  actualizarMeta,
  crearEventoProyecto,
  guardarRitualSemanal,
  guardarSituacionMeta,
  guardarWigsMeta,
  marcarKrFocoSemanal,
  marcarKrWig,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { Tarea } from "@/lib/types";
import { useConfig } from "@/lib/configStore";
import { estadoCupo } from "@/lib/ritualSemanal";
import { redactarSituacionIA } from "@/lib/ritual/situacionIA";
import {
  draftVacio,
  leerDraft,
  PASOS,
  serializarDraft,
  type DraftRitual,
  type PasoId,
} from "@/lib/ritual/draft";
import { isoWeekToMonday, localYMD, shiftISOWeek } from "@/lib/semana";
import { PasoProyectos } from "@/components/ritual/PasoProyectos";
import { PasoMetas } from "@/components/ritual/PasoMetas";
import { PasoWigMetas } from "@/components/ritual/PasoWigMetas";
import { PasoKrs } from "@/components/ritual/PasoKrs";
import { TemporizadorPaso } from "@/components/ritual/TemporizadorPaso";

const CLAVE_DRAFT = "fooday.ritual-semanal.draft";

export function WizardRitual({
  anio,
  semana_iso,
}: {
  anio: number;
  semana_iso: number;
}) {
  const cfg = useConfig();
  const hoy = localYMD(new Date());

  const [draft, setDraft] = useState<DraftRitual>(() =>
    draftVacio(anio, semana_iso),
  );
  const [cargadoDraft, setCargadoDraft] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redactando, setRedactando] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(false);

  // ── Datos ────────────────────────────────────────────────────────────────
  const { data: proyectos } = useData(() => fetchProyectos(), []);
  const { data: metas } = useData(() => fetchMetas(), []);
  const { data: krs } = useData(() => fetchKrsOverview(), { filas: [], aviso: null });
  const { data: tareas } = useData(() => fetchTareas(), []);
  const { data: focoIds } = useData(
    () => fetchIdsKRsFocoSemanal(anio, semana_iso),
    [],
    [anio, semana_iso],
  );
  const { data: eventos } = useData(() => fetchProyectosEventos(), []);

  // La bitácora de la semana PASADA: de dónde salen las WIGs que el ritual
  // sugiere repetir ("Continuar igual").
  const semanaPrevia = useMemo(
    () => shiftISOWeek(anio, semana_iso, -1),
    [anio, semana_iso],
  );
  const { data: ritualPrevio } = useData(
    () => fetchRitualSemanal(semanaPrevia.anio, semanaPrevia.semana_iso),
    null,
    [semanaPrevia.anio, semanaPrevia.semana_iso],
  );

  // ── Draft: restaurar y guardar ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const d = leerDraft(window.localStorage.getItem(CLAVE_DRAFT), anio, semana_iso);
    // El borrador se restaura AL ENTRAR: es un estado externo (el
    // navegador), no un estado derivado del render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d) setDraft(d);
    setCargadoDraft(true);
  }, [anio, semana_iso]);

  useEffect(() => {
    if (!cargadoDraft || typeof window === "undefined") return;
    window.localStorage.setItem(CLAVE_DRAFT, serializarDraft(draft));
  }, [draft, cargadoDraft]);

  const cambiar = useCallback((d: DraftRitual) => {
    setMensaje(null);
    setError(null);
    setDraft(d);
  }, []);

  // ── Derivados ────────────────────────────────────────────────────────────
  const proyectosPorId = useMemo(
    () => new Map((proyectos ?? []).map((p) => [p.id, p])),
    [proyectos],
  );

  const tareasPorProyecto = useMemo(() => {
    const m = new Map<string, Tarea[]>();
    for (const t of tareas ?? []) {
      if (!t.proyecto_id) continue;
      const arr = m.get(t.proyecto_id) ?? [];
      arr.push(t);
      m.set(t.proyecto_id, arr);
    }
    return m;
  }, [tareas]);

  const metasPorId = useMemo(
    () => new Map((metas ?? []).map((m) => [m.id, m])),
    [metas],
  );

  const proyectosVivos = useMemo(() => {
    const ids = new Set<string>();
    for (const p of proyectos ?? []) {
      const estado = draft.proyectos[p.id]?.estado ?? p.estado ?? "vivo";
      if (estado !== "muerto") ids.add(p.id);
    }
    return ids;
  }, [proyectos, draft.proyectos]);

  const metasVivas = useMemo(() => {
    return (metas ?? []).filter((m) => {
      if (m.estado === "archivada") return false;
      if (draft.metas[m.id]?.estado === "archivada") return false;
      if (m.proyecto_id && !proyectosVivos.has(m.proyecto_id)) return false;
      return true;
    });
  }, [metas, draft.metas, proyectosVivos]);

  const metasDeProyectosMuertos = useMemo(() => {
    return (metas ?? []).filter(
      (m) =>
        m.estado !== "archivada" &&
        m.proyecto_id !== null &&
        m.proyecto_id !== undefined &&
        !proyectosVivos.has(m.proyecto_id),
    );
  }, [metas, proyectosVivos]);

  const krsDeWigs = useMemo(() => {
    const ids = new Set(draft.wigsMeta);
    return (krs?.filas ?? []).filter((f) => f.meta && ids.has(f.meta.id));
  }, [krs, draft.wigsMeta]);

  const { data: fases } = useData(
    () => fetchFasesMeta((metas ?? []).map((m) => m.fase ?? "").filter(Boolean)),
    [],
    [metas?.length],
  );

  // ── IA: redactar situación ───────────────────────────────────────────────
  async function onRedactar(objetivo: string, tipo: "proyecto" | "meta") {
    if (!cfg.data.minimax_api_key) {
      setError("Configura la clave de IA en /configuracion para usar esta botón.");
      return;
    }
    setRedactando(objetivo);
    setError(null);
    try {
      const tareasDel = tipo === "proyecto" ? (tareasPorProyecto.get(objetivo) ?? []) : [];
      const contexto = {
        tipo,
        nombre:
          tipo === "proyecto"
            ? (proyectosPorId.get(objetivo)?.nombre ?? "")
            : (metasPorId.get(objetivo)?.titulo ?? ""),
        descripcion:
          tipo === "proyecto"
            ? (proyectosPorId.get(objetivo)?.descripcion ?? null)
            : (metasPorId.get(objetivo)?.descripcion ?? null),
        situacionActual:
          tipo === "meta" ? (metasPorId.get(objetivo)?.situacion_actual ?? null) : null,
        tareas: {
          total: tareasDel.length,
          hechas: tareasDel.filter((t) => t.estado === "hecha").length,
          abiertas: tareasDel.filter(
            (t) => t.estado === "pendiente" || t.estado === "en_progreso",
          ).length,
          bloqueadas: tareasDel.filter((t) => t.estado === "bloqueada").length,
          vencidas: 0,
          avance:
            tareasDel.length === 0
              ? 0
              : Math.round(
                  (tareasDel.filter((t) => t.estado === "hecha").length /
                    tareasDel.length) *
                    100,
                ),
        },
      };
      const texto = await redactarSituacionIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        contexto,
      );
      if (tipo === "proyecto") {
        cambiar({
          ...draft,
          proyectos: {
            ...draft.proyectos,
            [objetivo]: { ...draft.proyectos[objetivo], situacion: texto },
          },
        });
      } else {
        cambiar({
          ...draft,
          metas: {
            ...draft.metas,
            [objetivo]: { ...draft.metas[objetivo], situacion: texto },
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "La IA no pudo redactar la situación.");
    } finally {
      setRedactando(null);
    }
  }

  // ── Aplicar paso a paso ──────────────────────────────────────────────────
  async function aplicarPaso(paso: PasoId) {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      if (paso === "proyectos") {
        for (const [id, d] of Object.entries(draft.proyectos)) {
          const p = proyectosPorId.get(id);
          if (!p) continue;
          if (d.estado && (p.estado ?? "vivo") !== d.estado) {
            await actualizarEstadoProyecto(id, d.estado);
          }
          const texto = (d.situacion ?? "").trim();
          const previa = ultimaSituacion(eventos ?? [], id);
          if (texto && texto !== previa) {
            await crearEventoProyecto({
              proyecto_id: id,
              tipo: "situacion",
              texto,
              ocurrido_en: hoy,
            });
          }
        }
      }

      if (paso === "metas") {
        for (const [id, d] of Object.entries(draft.metas)) {
          const m = metasPorId.get(id);
          if (!m) continue;
          if (d.estado && m.estado !== d.estado) {
            await actualizarEstadoMeta(id, d.estado);
          }
          if (d.fase !== undefined && (m.fase ?? null) !== d.fase) {
            await actualizarFaseMeta(id, d.fase);
          }
          const bloqueo = (d.bloqueo ?? "").trim();
          if (bloqueo) {
            await actualizarEstadoMeta(id, "bloqueada");
            const contexto = [m.contexto, `Bloqueo: ${bloqueo}`]
              .filter(Boolean)
              .join("\n");
            await actualizarMeta(id, { contexto });
          }
          const texto = (d.situacion ?? "").trim();
          if (texto && texto !== (m.situacion_actual ?? "").trim()) {
            await guardarSituacionMeta(id, texto, "wizard");
          }
        }
      }

      if (paso === "wigs") {
        await guardarWigsMeta(draft.wigsMeta);
      }

      if (paso === "krs") {
        for (const [krId, d] of Object.entries(draft.krs)) {
          const kr = (krs?.filas ?? []).find((f) => f.kr.id === krId)?.kr;
          if (!kr) continue;
          const eraWig = !!kr.es_wig;
          if (d.wig !== eraWig) await marcarKrWig(krId, d.wig);
          const eraFoco = (focoIds ?? []).includes(krId);
          if (d.foco !== eraFoco) {
            await marcarKrFocoSemanal(krId, anio, semana_iso, d.foco);
          }
        }
      }

      const siguiente = PASOS[PASOS.findIndex((p) => p.id === paso) + 1];
      if (siguiente) {
        cambiar({ ...draft, paso: siguiente.id });
        setMensaje(`Paso guardado. Siguiente: ${siguiente.titulo}.`);
      } else {
        setMensaje("Paso guardado.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el paso.");
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarSemana() {
    setGuardando(true);
    setError(null);
    try {
      await guardarRitualSemanal({
        anio,
        semana_iso,
        metas_vivas: metasVivas.map((m) => m.id),
        wigs_meta: draft.wigsMeta,
        krs_foco: Object.entries(draft.krs)
          .filter(([, v]) => v.foco)
          .map(([k]) => k),
        metas_pausadas: Object.entries(draft.metas)
          .filter(([, v]) => v.estado === "pausada")
          .map(([k]) => k),
        tareas_activas: estadoCupo(tareas ?? []).activas,
        notas: null,
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(CLAVE_DRAFT);
      }
      setCerrado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cerrar la semana.");
    } finally {
      setGuardando(false);
    }
  }

  // WIGs de la semana pasada (si la bitácora las guarda).
  const wigsPrevias = useMemo(() => {
    const ids = ritualPrevio?.wigs_meta ?? [];
    if (ids.length > 0) return ids;
    // Sin bitácora: las WIGs que ya tienes son, de hecho, las de la semana
    // pasada (el ritual es lo que las cambia).
    return (metas ?? []).filter((m) => m.es_wig).map((m) => m.id);
  }, [ritualPrevio, metas]);

  const pasoActual = PASOS.find((p) => p.id === draft.paso) ?? PASOS[0];
  const indice = PASOS.indexOf(pasoActual);

  return (
    <div className="space-y-5">
      {/* ── Cabecera ── */}
      <header className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">
              Ritual semanal · {anio} · semana {semana_iso}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              4 pasos: proyectos → metas → 3 WIGs → KRs de la semana. Puedes
              parar y seguir: el borrador se guarda en este navegador.
            </p>
          </div>
          <TemporizadorPaso key={pasoActual.id} objetivoMin={pasoActual.minutos} />
        </div>

        {/* Progreso */}
        <ol className="mt-4 flex flex-wrap gap-2">
          {PASOS.map((p, i) => {
            const activo = p.id === draft.paso;
            const hecho = i < indice;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => cambiar({ ...draft, paso: p.id })}
                  aria-current={activo ? "step" : undefined}
                  className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                    activo
                      ? "border-primary bg-primary/10 text-foreground"
                      : hecho
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {i + 1}. {p.titulo}
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {mensaje && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {mensaje}
        </p>
      )}
      {cerrado && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Semana cerrada: la bitácora ya tiene lo que decidiste.{" "}
          <Link href="/semana" className="underline underline-offset-4">
            Repartir las tareas por los días →
          </Link>
        </p>
      )}

      {/* ── Cuerpo del paso ── */}
      <section className="space-y-4">
        {draft.paso === "proyectos" && (
          <PasoProyectos
            proyectos={proyectos ?? []}
            tareasPorProyecto={tareasPorProyecto}
            hoy={hoy}
            draft={draft}
            onChange={cambiar}
            onRedactar={(id) => onRedactar(id, "proyecto")}
            redactando={redactando}
          />
        )}
        {draft.paso === "metas" && (
          <PasoMetas
            metas={metasVivas}
            metasDeProyectosMuertos={metasDeProyectosMuertos}
            fases={fases}
            draft={draft}
            onChange={cambiar}
            onRedactar={(id) => onRedactar(id, "meta")}
            redactando={redactando}
          />
        )}
        {draft.paso === "wigs" && (
          <PasoWigMetas
            metas={metasVivas}
            proyectosPorId={proyectosPorId}
            draft={draft}
            onChange={cambiar}
            wigsSemanaPasada={wigsPrevias}
          />
        )}
        {draft.paso === "krs" && (
          <PasoKrs
            krs={krsDeWigs}
            draft={draft}
            onChange={cambiar}
            lunes={LUNES_Y_DOMINGO(anio, semana_iso).lunes}
            domingo={LUNES_Y_DOMINGO(anio, semana_iso).domingo}
          />
        )}
      </section>

      {/* ── Pie: aplicar / saltar ── */}
      <footer className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
        <button
          type="button"
          onClick={() => aplicarPaso(draft.paso)}
          disabled={guardando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar y continuar"}
        </button>
        <button
          type="button"
          onClick={() => {
            const siguiente = PASOS[indice + 1];
            if (siguiente) cambiar({ ...draft, paso: siguiente.id });
          }}
          disabled={indice >= PASOS.length - 1}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40"
        >
          Saltar este paso
        </button>
        <button
          type="button"
          onClick={cerrarSemana}
          disabled={guardando || cerrado}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-40"
        >
          Cerrar la semana (guardar bitácora)
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Nada se escribe hasta que pulsas “Guardar”. Los pasos 5 (tareas) y el
          reparto por días viven en{" "}
          <Link href="/semana" className="underline underline-offset-4">
            /semana
          </Link>
          .
        </span>
      </footer>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Último texto de situación registrado de un proyecto. */
function ultimaSituacion(
  eventos: Array<{ proyecto_id: string; tipo: string; texto: string; ocurrido_en: string }>,
  proyectoId: string,
): string {
  const propios = eventos
    .filter((e) => e.proyecto_id === proyectoId && e.tipo === "situacion")
    .sort((a, b) => b.ocurrido_en.localeCompare(a.ocurrido_en));
  return propios[0]?.texto ?? "";
}

/** Lunes y domingo (YYYY-MM-DD) de una semana ISO. */
function LUNES_Y_DOMINGO(anio: number, semana_iso: number): {
  lunes: string;
  domingo: string;
} {
  const lunes = isoWeekToMonday(anio, semana_iso);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { lunes: localYMD(lunes), domingo: localYMD(domingo) };
}
