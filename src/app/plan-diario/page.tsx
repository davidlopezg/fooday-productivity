"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTareas,
  fetchTareasActivas,
  fetchHistorialEmocional,
  fetchPlanSemanal,
  fetchKRsFocoSemanal,
  fetchMetas,
  fetchPlanHoy,
} from "@/lib/queries";
import { fetchPagosConUrgencia } from "@/lib/pagos/queries";
import {
  upsertTareaPorTitulo,
  guardarPlanDiarioSimple,
  guardarNotasPlan,
  actualizarTareaDelPlan,
  anadirTareaAlPlan,
  eliminarTareaDelPlan,
  moverTareaABloque,
  marcarHecha,
  marcarTareaPlanHecha,
  reabrirTarea,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import { generarPlanSimple } from "@/lib/planSimple";
import type { EstadoEmocional } from "@/lib/plan";
import { getCurrentISOWeek, BLOQUE_HORARIO, localYMD } from "@/lib/semana";
import { calcularPropuestaShadow, type PropuestaShadow } from "@/lib/recuperacion/shadow";
import { PlanShadow } from "@/components/PlanShadow";
import SelectorTareaPlan from "@/components/SelectorTareaPlan";
import { agruparPorBloque, numBloquesActivos, type NumeroBloque, type TareaCandidata } from "@/lib/planBloques";
import type {
  KrFocoConDetalle,
  Meta,
  PlanDiario,
  PlanGeneradoSimple,
  PlanSemanalTarea,
  Tarea,
} from "@/lib/types";
import type { Pago } from "@/lib/pagos/types";

// ----------------------------------------------------------------------------
// Constantes UI
// ----------------------------------------------------------------------------

// localYMD, no toISOString(): el plan se persiste con esta fecha y, en UTC+
  // (España), el toISOString() entre las 00:00 y las 02:00 devuelve el día
  // anterior → el plan de hoy se guardaba como el de ayer.
const HOY = () => localYMD(new Date());

// Las opciones coinciden EXACTAMENTE con los MAPAS del Dashboard emocional,
// para que los valores se puedan graficar en el dashboard sin mapeos extra.
const DESPIERTAR = ["Con energía", "Cansado pero estable", "Agotado", "Ansioso"];
const MENTE = ["Relativamente clara", "Acelerada", "Nublada", "Oscura"];
const CUERPO = ["Liviano", "Tenso", "Dolorido", "Me cuesta habitarlo"];
const RUEDA = [
  "No, estoy presente",
  "Un poco",
  "Sí, todo me arrastra",
  "Totalmente sobrepasado",
];
const NECESIDAD = ["Calma", "Claridad", "Contención", "Esperanza", "Nada"];

const SEM_COLOR: Record<"verde" | "amarillo" | "rojo", string> = {
  verde: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amarillo: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rojo: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

const BLOQUE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Bloque 1",
  2: "Bloque 2",
  3: "Bloque 3",
  4: "Bloque 4",
};

// BLOQUE_HORARIO se importa desde @/lib/semana (migration 0017 lo reusa también).

// ----------------------------------------------------------------------------
// Tipos locales
// ----------------------------------------------------------------------------

type TareaLibre = {
  /** clave local para la lista en UI */
  uid: string;
  /** id de la tarea en BD (null mientras se está persistiendo) */
  id_bd: string | null;
  titulo: string;
  /** true si la RPC tuvo que crearla; false si ya existía */
  creada: boolean;
  /** estado de persistencia */
  estado: "idle" | "guardando" | "guardado" | "error";
  error?: string;
};

type PlanLocal = Omit<PlanGeneradoSimple, "tu_dia_optimizado"> & {
  /** id de la fila en planes_diarios (post-guardado) */
  planId: string | null;
  fecha: string;
  fecha_larga: string;
  estado: EstadoEmocional;
  reflexion: string;
  notas: string;
  guardadoAt: number;
  tu_dia_optimizado: {
    num_bloques_activos: number;
    /** Una entrada por TAREA del plan. Un bloque puede tener varias. */
    bloques: BloqueLocal[];
  };
};

/** Una tarea dentro de un bloque del plan (con su id de fila en BD). */
type BloqueLocal = PlanGeneradoSimple["tu_dia_optimizado"]["bloques"][number] & {
  /** ¿Ya está hecha? (las vinculadas lo heredan de la tarea real). */
  hecho?: boolean;
};

// ----------------------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------------------

export default function PlanDiarioPage() {
  const config = useConfig();
  const tareasQ = useData<Tarea[]>(() => fetchTareas("pendiente"), []);
  const historialQ = useData<PlanDiario[]>(() => fetchHistorialEmocional(7), []);

  // ── Semana actual + día de hoy (ISO 1=lun..7=dom) ──
  const currentWeek = useMemo(() => getCurrentISOWeek(), []);
  const today = useMemo(
    () => ((new Date().getDay() || 7) as 1 | 2 | 3 | 4 | 5 | 6 | 7),
    [],
  );
  const planSemanalQ = useData<PlanSemanalTarea[]>(
    () =>
      fetchPlanSemanal({
        anio: currentWeek.anio,
        semana_iso: currentWeek.semana_iso,
      }),
    [],
  );

  // KRs en foco de la semana (migration 0033). La capa intermedia: el
  // planificador diario ancla el día a estos resultados medibles. Si no
  // hay foco elegido, el día se planifica igual (degradación correcta).
  const focoKRsQ = useData<KrFocoConDetalle[]>(
    () =>
      fetchKRsFocoSemanal(
        currentWeek.anio,
        currentWeek.semana_iso,
      ),
    [],
    [currentWeek.anio, currentWeek.semana_iso],
  );

  // Tareas que /semana marcó para HOY (intersección plan_semanal_tareas × tareas pendientes).
  const tareasProgramadasHoy = useMemo<Tarea[]>(() => {
    const ids = new Set(
      planSemanalQ.data
        .filter((p) => p.dia_semana === today)
        .map((p) => p.tarea_id),
    );
    return tareasQ.data.filter((t) => ids.has(t.id));
  }, [planSemanalQ.data, tareasQ.data, today]);

  // Tareas activas cuya fecha_fin es HOY (no requieren asignación manual).
  const tareasVencenHoy = useMemo<Tarea[]>(() => {
    const hoy = HOY();
    return tareasQ.data.filter(
      (t) =>
        t.fecha_fin === hoy &&
        (t.estado === "pendiente" || t.estado === "en_progreso" || t.estado === "bloqueada"),
    );
  }, [tareasQ.data]);

  // ── Parte 1: input ──
  const [estado, setEstado] = useState<EstadoEmocional>({
    despertar: "Cansado pero estable",
    mente: "Acelerada",
    cuerpo: "Tenso",
    rueda: "Sí, todo me arrastra",
    necesidad: "Claridad",
  });
  const [reflexion, setReflexion] = useState("");
  const [tareaNueva, setTareaNueva] = useState("");
  const [tareasLibres, setTareasLibres] = useState<TareaLibre[]>([]);
  const [errorTarea, setErrorTarea] = useState<string | null>(null);
  // Selector de tareas de la BD abierto en la Parte 1 (issue #73).
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  // Tareas activas de la BD (pendiente / en_progreso / bloqueada): son las
  // que se pueden meter en el plan (issue #73).
  const activasQ = useData<TareaCandidata[]>(() => fetchTareasActivas(), []);

  // ── Estado de generación ──
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planLocal, setPlanLocal] = useState<PlanLocal | null>(null);

  // ── MODO SOMBRA (Fase 3 del Modo Recuperación) ──────────────────────
  // Sólo LEE y PROPONE. No escribe nada en la BD: ni estados, ni fechas,
  // ni descartes. La propuesta se recalcula en cada render a partir de los
  // datos actuales, así que si cambias una tarea, la ves al instante.
  const [shadowActivo, setShadowActivo] = useState(false);
  const [shadow, setShadow] = useState<PropuestaShadow | null>(null);
  const [shadowError, setShadowError] = useState<string | null>(null);

  const metasQ = useData<Meta[]>(() => fetchMetas(), []);
  const pagosQ = useData<Pago[]>(() => fetchPagosConUrgencia(), []);
  const planHoyQ = useData(() => fetchPlanHoy(), null);

  const calcularShadow = useCallback(() => {
    try {
      setShadowError(null);
      const propuesta = calcularPropuestaShadow({
        tareas: tareasQ.data,
        metas: metasQ.data,
        pagos: pagosQ.data,
        planActual: planHoyQ.data,
        estado,
        hoy: HOY(),
      });
      setShadow(propuesta);
    } catch (e) {
      console.error("[plan-diario] shadow falló:", e);
      setShadowError(e instanceof Error ? e.message : String(e));
    }
  }, [tareasQ.data, metasQ.data, pagosQ.data, planHoyQ.data, estado]);

  // Recalcular cuando cambian los datos o el estado emocional (sólo si el
  // shadow está abierto: si no, no gastamos CPU en calcularlo).
  useEffect(() => {
    if (!shadowActivo) return;
    calcularShadow();
  }, [shadowActivo, calcularShadow]);

  // ── Notas del día ──
  const [notasEstado, setNotasEstado] = useState<
    | { status: "idle" }
    | { status: "guardando" }
    | { status: "guardado"; timestamp: number }
    | { status: "error"; mensaje: string }
  >({ status: "idle" });

  // Cuando hay plan generado, recargar historial automáticamente
  useEffect(() => {
    if (planLocal) historialQ.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLocal?.planId]);

  // ----------------------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------------------

  async function anadirTareaLibre(tituloAlterno?: string) {
    const titulo = (tituloAlterno ?? tareaNueva).trim();
    if (!titulo) return;
    setErrorTarea(null);

    // Evitar duplicados locales (en la lista en memoria)
    if (tareasLibres.some((t) => t.titulo.toLowerCase() === titulo.toLowerCase())) {
      setErrorTarea(`"${titulo}" ya está en la lista.`);
      return;
    }

    const uid = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTareasLibres((arr) => [
      ...arr,
      { uid, id_bd: null, titulo, creada: false, estado: "guardando" },
    ]);
    setTareaNueva("");

    try {
      const r = await upsertTareaPorTitulo(titulo);
      setTareasLibres((arr) =>
        arr.map((t) =>
          t.uid === uid
            ? { ...t, id_bd: r.id, creada: r.creada, estado: "guardado" }
            : t,
        ),
      );
      tareasQ.reload();
    } catch (e) {
      setTareasLibres((arr) =>
        arr.map((t) =>
          t.uid === uid
            ? { ...t, estado: "error", error: (e as Error).message }
            : t,
        ),
      );
    }
  }

  function eliminarTareaLibre(uid: string) {
    setTareasLibres((arr) => arr.filter((t) => t.uid !== uid));
  }

  /**
   * Añade una tarea que YA está en la base de datos a la lista de la
   * Parte 1 (issue #73). La IA la recibe como prioridad 2.
   */
  function elegirTareaDeBd(t: TareaCandidata) {
    if (tareasLibres.some((x) => x.id_bd === t.id)) {
      setErrorTarea(`"${t.titulo}" ya está en la lista.`);
      return;
    }
    setErrorTarea(null);
    setTareasLibres((arr) => [
      ...arr,
      {
        uid: `bd-${t.id}`,
        id_bd: t.id,
        titulo: t.titulo,
        creada: false,
        estado: "guardado",
      },
    ]);
    setSelectorAbierto(false);
  }

  // --------------------------------------------------------------------------
  // Edición del plan YA GENERADO (issue #73)
  // --------------------------------------------------------------------------
  //
  // El plan dejó de ser de solo lectura: se pueden añadir tareas (nuevas o
  // de la base de datos), activar bloques desactivados, renombrar/sustituir/
  // cambiar el tipo de la tarea que propone la IA, moverla de bloque y
  // quitarla del plan.

  /** Aplica un cambio a la lista local de tareas del plan. */
  function actualizarBloquesLocal(fn: (bloques: BloqueLocal[]) => BloqueLocal[]) {
    setPlanLocal((p) => {
      if (!p) return p;
      const bloques = fn(p.tu_dia_optimizado.bloques);
      return {
        ...p,
        tu_dia_optimizado: {
          ...p.tu_dia_optimizado,
          bloques,
          num_bloques_activos: numBloquesActivos(bloques),
        },
      };
    });
  }

  /** Mete una tarea en un bloque del plan (nueva o de la base de datos). */
  async function anadirAlPlan(
    bloqueNum: NumeroBloque,
    datos: { titulo: string; tareaId?: string | null; tipo?: "profunda" | "rapida" },
  ) {
    if (!planLocal?.planId) return;
    try {
      const fila = await anadirTareaAlPlan({
        planId: planLocal.planId,
        bloqueNum,
        titulo: datos.titulo,
        tareaId: datos.tareaId ?? null,
        tipo: datos.tipo ?? "profunda",
      });
      actualizarBloquesLocal((bs) => [
        ...bs,
        {
          bloque_num: bloqueNum,
          tipo: fila.tipo_tarea ?? datos.tipo ?? "profunda",
          tarea_id: fila.tarea_id,
          titulo_libre: fila.titulo_libre ?? datos.titulo,
          tiempo_min: 60,
          plan_tarea_id: fila.id,
          hecho: false,
        },
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Añade al bloque una tarea que YA existe en la base de datos. */
  async function anadirExistenteAlPlan(bloqueNum: NumeroBloque, t: TareaCandidata) {
    await anadirAlPlan(bloqueNum, { titulo: t.titulo, tareaId: t.id });
  }

  /**
   * Añade al bloque una tarea escrita por la persona. Si el título no
   * existía en `tareas`, se crea (RPC `upsert_tarea_by_titulo`): así la
   * tarea del plan es una tarea de verdad y se puede marcar desde /tareas.
   */
  async function anadirNuevaAlPlan(bloqueNum: NumeroBloque, titulo: string) {
    try {
      const r = await upsertTareaPorTitulo(titulo);
      await anadirAlPlan(bloqueNum, { titulo: r.titulo, tareaId: r.id });
      tareasQ.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Sustituye la tarea de un bloque por otra que ya existe en la BD. */
  async function sustituirPorExistente(planTareaId: string, t: TareaCandidata) {
    await actualizarTarea(planTareaId, { titulo: t.titulo, tareaId: t.id });
  }

  /** Sustituye la tarea de un bloque por una escrita ahora (se crea en BD). */
  async function sustituirPorTitulo(planTareaId: string, titulo: string) {
    try {
      const r = await upsertTareaPorTitulo(titulo);
      await actualizarTarea(planTareaId, { titulo: r.titulo, tareaId: r.id });
      tareasQ.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Renombra / cambia el tipo / sustituye la tarea de un bloque. */
  async function actualizarTarea(
    planTareaId: string,
    patch: { titulo?: string; tareaId?: string | null; tipoTarea?: "profunda" | "rapida" },
  ) {
    if (!planLocal?.planId) return;
    try {
      await actualizarTareaDelPlan({ planTareaId, ...patch });
      actualizarBloquesLocal((bs) =>
        bs.map((b) =>
          b.plan_tarea_id === planTareaId
            ? {
                ...b,
                titulo_libre: patch.titulo ?? b.titulo_libre,
                tarea_id: patch.tareaId !== undefined ? patch.tareaId : b.tarea_id,
                tipo: patch.tipoTarea ?? b.tipo,
              }
            : b,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Quita una tarea del plan (la tarea de la BD no se borra). */
  async function quitarDelPlan(planTareaId: string) {
    if (!planLocal?.planId) return;
    try {
      await eliminarTareaDelPlan({ planId: planLocal.planId, planTareaId });
      actualizarBloquesLocal((bs) => bs.filter((b) => b.plan_tarea_id !== planTareaId));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Mueve una tarea a otro bloque del plan. */
  async function moverTarea(planTareaId: string, nuevoBloqueNum: NumeroBloque) {
    if (!planLocal?.planId) return;
    try {
      await moverTareaABloque(planLocal.planId, planTareaId, nuevoBloqueNum);
      actualizarBloquesLocal((bs) =>
        bs.map((b) =>
          b.plan_tarea_id === planTareaId ? { ...b, bloque_num: nuevoBloqueNum } : b,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Marca (o desmarca) una tarea del plan como hecha. */
  async function alternarHecha(bloque: BloqueLocal) {
    const id = bloque.plan_tarea_id;
    if (!id) return;
    const siguiente = !bloque.hecho;
    // Optimista: la UI responde al instante. Si la tarea está vinculada a una
    // tarea real, se marcan TODAS sus filas del plan (es lo que hace
    // `sincronizarProgresoPlan` en la BD).
    actualizarBloquesLocal((bs) =>
      bs.map((b) => {
        const misma = bloque.tarea_id
          ? b.tarea_id === bloque.tarea_id
          : b.plan_tarea_id === id;
        return misma ? { ...b, hecho: siguiente } : b;
      }),
    );
    try {
      if (bloque.tarea_id) {
        // Tarea real: se marca en `tareas` (el plan se sincroniza solo).
        if (siguiente) await marcarHecha(bloque.tarea_id);
        else await reabrirTarea(bloque.tarea_id);
        tareasQ.reload();
      } else {
        await marcarTareaPlanHecha(id, siguiente);
      }
    } catch (e) {
      // Revertir: la UI no puede mentir.
      actualizarBloquesLocal((bs) =>
        bs.map((b) => {
          const misma = bloque.tarea_id
            ? b.tarea_id === bloque.tarea_id
            : b.plan_tarea_id === id;
          return misma ? { ...b, hecho: !siguiente } : b;
        }),
      );
      setError((e as Error).message);
    }
  }

  async function generar() {
    if (!config.data.minimax_api_key) {
      setError("Configura primero tu API key en /configuracion.");
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const fecha = HOY();
      const tareasLibresConId = tareasLibres
        .filter((t) => t.id_bd)
        .map((t): Tarea => ({
          id: t.id_bd as string,
          titulo: t.titulo,
          estado: "pendiente",
          prioridad: "media",
          // El resto de campos no se usan en `buildPrompt`/`sanearPlanSimple`
          area_id: null,
          meta_id: null,
          proyecto_id: null,
          codigo: null,
          descripcion: null,
          capa: null,
          deadline: null,
          pts: null,
          esfuerzo: null,
          importe: null,
          origen: null,
          notas: null,
          completada_at: null,
          fecha_fin: null,
          subtareas: null,
          criterio_terminacion: null,
          recurrencia_tipo: null,
          recurrencia_dias_semana: null,
          recurrencia_dia_mes: null,
          recurrencia_ultima_generada: null,
          resultado_periodo_id: null,
          ambito: null,
          tags: [],
          es_wig: false,
          wig_orden: null,
          pendiente_respuesta: false,
          pendiente_respuesta_at: null,
        }));

      const plan = await generarPlanSimple(
        {
          baseUrl: config.data.base_url,
          apiKey: config.data.minimax_api_key,
          model: config.data.model,
        },
        {
          estado,
          reflexion,
          fecha,
          tareas: tareasQ.data,
          tareasProgramadasHoy,
          tareasLibres: tareasLibresConId,
          historial: historialQ.data,
          // Migration 0033: los KRs en foco de la semana son la capa
          // intermedia. El planificador los usa para anclar el día.
          krsFoco: (focoKRsQ.data ?? []).map((f) => ({
            kr_id: f.kr.id,
            titulo: f.kr.titulo,
            meta_titulo: f.meta.titulo,
            periodo: f.periodos[0]?.nombre ?? null,
            dias_restantes: f.periodos[0]
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(f.periodos[0].fecha_fin + "T00:00:00").getTime() -
                      Date.now()) /
                      86_400_000,
                  ),
                )
              : undefined,
          })),
          // Migration 0032: el perfil va en la tabla `configuracion`, no
          // hardcodeado en el prompt.
          perfil: config.data,
        },
      );

      const fecha_larga = fechaToLargaLocal(fecha);
      const { planId, tareas } = await guardarPlanDiarioSimple({
        fecha,
        fecha_larga,
        estado,
        reflexion,
        plan,
      });

      // Hidrata los bloques con los IDs reales de BD para poder editarlos.
      // Una entrada por TAREA del plan (un bloque puede llevar varias).
      const bloquesConId = tareas
        .filter((t) => t.bloque_num !== null)
        .map((t) => {
          const ia = plan.tu_dia_optimizado.bloques.find(
            (b) => b.bloque_num === t.bloque_num,
          );
          return {
            bloque_num: t.bloque_num as NumeroBloque,
            tipo: (ia?.tipo ?? "profunda") as "profunda" | "rapida",
            tarea_id: t.tarea_id,
            titulo_libre: t.titulo_libre ?? ia?.titulo_libre ?? "",
            tiempo_min: 60,
            plan_tarea_id: t.id,
            hecho: t.hecho,
          };
        })
        .sort((a, b) => a.bloque_num - b.bloque_num);

      setPlanLocal({
        ...plan,
        tu_dia_optimizado: {
          ...plan.tu_dia_optimizado,
          bloques: bloquesConId,
          num_bloques_activos: numBloquesActivos(bloquesConId),
        },
        planId,
        fecha,
        fecha_larga,
        estado,
        reflexion,
        notas: "",
        guardadoAt: Date.now(),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerando(false);
    }
  }

  async function guardarNotas() {
    if (!planLocal?.planId) return;
    setNotasEstado({ status: "guardando" });
    try {
      await guardarNotasPlan(planLocal.planId, planLocal.notas);
      setNotasEstado({ status: "guardado", timestamp: Date.now() });
    } catch (e) {
      setNotasEstado({ status: "error", mensaje: (e as Error).message });
    }
  }

  /**
   * Abre el plan YA GENERADO de hoy para editarlo (issue #73).
   *
   * El plan del día no se pierde al recargar: la IA lo propose al amanecer
   * y a lo largo del día hay que poder seguir metiendo tareas, cambiarlas y
   * marcarlas. `fetchPlanHoy` devuelve la última generación de hoy con sus
   * tareas; aquí se traduce al mismo estado local que usa la Parte 2.
   */
  function abrirPlanDeHoy() {
    const p = planHoyQ.data;
    if (!p) return;
    const bloques: BloqueLocal[] = p.tareas
      .filter((t) => t.bloque_num !== null && t.bloque_num !== undefined)
      .map((t) => ({
        bloque_num: t.bloque_num as NumeroBloque,
        tipo: t.tipo_tarea ?? "profunda",
        tarea_id: t.tarea_id,
        titulo_libre: t.titulo_libre ?? "",
        tiempo_min: 60,
        plan_tarea_id: t.id,
        hecho: t.hecho,
      }))
      .sort((a, b) => a.bloque_num - b.bloque_num);

    setPlanLocal({
      semaforo: (p.semaforo ?? "amarillo") as PlanLocal["semaforo"],
      resumen: p.resumen ?? "",
      recomendacion: p.recomendacion ?? "",
      lectura_psicologica: {
        lo_del_dia: p.analisis_emocional_ia ?? "",
        analisis_historico: p.tendencia_ia ?? "",
      },
      tu_dia_optimizado: {
        num_bloques_activos: numBloquesActivos(bloques),
        bloques,
      },
      propuesta_comida: {
        titulo: p.comida_titulo ?? "",
        descripcion: p.comida_descripcion ?? "",
        motivo: p.comida_motivo ?? "",
      },
      planId: p.id,
      fecha: p.fecha,
      fecha_larga: p.fecha_larga ?? p.fecha,
      estado: {
        despertar: p.despertar ?? "",
        mente: p.mente ?? "",
        cuerpo: p.cuerpo ?? "",
        rueda: p.rueda ?? "",
        necesidad: p.necesidad ?? "",
      },
      reflexion: p.reflexion ?? "",
      notas: p.notas ?? "",
      guardadoAt: Date.now(),
    });
    // La Parte 1 se oculta cuando hay un plan abierto.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function empezarDeNuevo() {
    setPlanLocal(null);
    setEstado({
      despertar: "Cansado pero estable",
      mente: "Acelerada",
      cuerpo: "Tenso",
      rueda: "Sí, todo me arrastra",
      necesidad: "Claridad",
    });
    setReflexion("");
    setTareasLibres([]);
    setTareaNueva("");
    setError(null);
    setNotasEstado({ status: "idle" });
  }

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------

  const input =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const selectCls =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan diario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado emocional (5 dimensiones) + tareas + IA = plan ejecutable para hoy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Plan diario" items={AYUDA_POR_RUTA["/plan-diario"]?.items ?? []} />
        <div className="flex gap-2 text-xs">
          <Link
            href="/plan-diario/historico"
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            📋 Histórico
          </Link>
        </div>
        </div>
      </header>

      {!config.data.minimax_api_key && !config.loading && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          Aún no has configurado tu API key.{" "}
          <Link href="/configuracion" className="underline underline-offset-4">
            Ir a Configuración
          </Link>
          .
        </div>
      )}

      {/* Errores de la página (generar plan, editar bloques…): viven aquí
          arriba para que se vean también con el plan abierto (issue #73). */}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* =========================================================================
          MODO SOMBRA — la propuesta del sistema, sin escribir nada.
          Toggle manual: por defecto está apagado para noDistraer. Cuando
          se abre, sólo LEE y PROPONE (ninguna escritura en la BD).
      ========================================================================= */}
      <div>
        <button
          onClick={() => setShadowActivo((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
            shadowActivo
              ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
          aria-expanded={shadowActivo}
        >
          <IconSparkles className="h-3.5 w-3.5" />
          {shadowActivo ? "Ocultar propuesta" : "¿Qué propondría el sistema?"}
        </button>
      </div>

      {shadowActivo && (
        <PlanShadow
          propuesta={shadow}
          cargando={tareasQ.loading || metasQ.loading || pagosQ.loading}
          error={shadowError}
        />
      )}

      {/* =========================================================================
          PARTE 1 — INPUT (se oculta cuando hay un plan abierto: el plan es
          lo que hay que ver y editar; "Empezar de nuevo" vuelve aquí)
      ========================================================================= */}
      {!planLocal && (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold tracking-tight">
          Parte 1 — Captura
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Marca cómo estás hoy en las 5 dimensiones. Alimentan el Dashboard emocional.
        </p>

        {/* 1A — Estado emocional (5 dimensiones, mismo vocabulario que Dashboard emocional) */}
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["despertar", "🌅 ¿Cómo te has despertado?", DESPIERTAR],
            ["mente", "🧠 ¿Cómo está tu mente?", MENTE],
            ["cuerpo", "💪 ¿Cómo habita tu cuerpo?", CUERPO],
            ["rueda", "🌀 ¿Rueda del ratón?", RUEDA],
            ["necesidad", "🆘 ¿Qué necesitas hoy?", NECESIDAD],
          ] as const).map(([k, label, opts]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {label}
              </span>
              <select
                className={selectCls}
                value={estado[k]}
                onChange={(e) =>
                  setEstado({ ...estado, [k]: e.target.value })
                }
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* 1B — Reflexión opcional (desahogo) */}
        <details className="mt-5 rounded-md border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium hover:bg-muted/50">
            💬 Reflexión / desahogo (opcional)
          </summary>
          <div className="p-3">
            <textarea
              className={`${input} min-h-[80px]`}
              value={reflexion}
              onChange={(e) => setReflexion(e.target.value)}
              placeholder="¿Qué tienes en la cabeza hoy? Sin filtro. La IA lo usará como contexto adicional."
            />
          </div>
        </details>

        {/* 1C — Vencen hoy (fecha_fin = hoy, no requieren asignación manual) */}
        {tareasVencenHoy.length > 0 && (
          <div className="mt-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              <span>⏰ Vencen hoy</span>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Por fecha de finalización
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {tareasVencenHoy.length} tarea{tareasVencenHoy.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Tareas activas cuya fecha de finalización es hoy. Márcalas como hechas desde aquí sin salirte.
            </p>
            <ul className="space-y-1.5">
              {tareasVencenHoy.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{t.titulo}</span>
                    {t.prioridad && (
                      <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t.prioridad}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await marcarHecha(t.id);
                        tareasQ.reload();
                      } catch (e) {
                        console.error("[plan-diario] marcarHecha falló:", e);
                      }
                    }}
                    className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                    title="Marcar como hecha"
                  >
                    ✓ Hecha
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 1D — Tareas programadas para HOY (read-only, vienen de /semana) */}
        <div className="mt-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <span>📅 Programadas para hoy</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Desde /semana
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {tareasProgramadasHoy.length > 0
                ? `${tareasProgramadasHoy.length} tareas · solo lectura`
                : "solo lectura"}
            </span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {tareasProgramadasHoy.length > 0
              ? "Estas tareas vienen de tu planificación semanal. La IA las prioriza al armar los bloques."
              : "Aún no has marcado tareas para hoy en /semana. Ve allí a planificar."}
          </p>

          {planSemanalQ.loading ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              Cargando…
            </div>
          ) : tareasProgramadasHoy.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
              No has marcado tareas para hoy en{" "}
              <Link
                href="/semana"
                className="font-medium text-foreground underline underline-offset-4"
              >
                /semana
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-1.5">
              {tareasProgramadasHoy.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{t.titulo}</span>
                    {t.prioridad && (
                      <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t.prioridad}
                      </span>
                    )}
                    {t.deadline && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        ⏰ {t.deadline}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/semana"
                    className="shrink-0 rounded p-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
                    title="Editar en /semana"
                  >
                    ↗
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 1D — Otras tareas */}
        <div className="mt-5">
          <label htmlFor="plan-otras-tareas" className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-medium">
              <span>Otras tareas</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Opcional
              </span>
            </span>
            <span className="mb-2 block text-xs text-muted-foreground">
              Escribe una tarea o elige una de las tuyas que aún no está
              completada. Si el título ya existe en tu base de datos, no se
              duplica: la IA la reutiliza tal cual.
            </span>
          </label>

          {/* En el móvil el campo y el botón van en columna: en una fila el
              input se comía el ancho y el botón quedaba aplastado (issue #73). */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="plan-otras-tareas"
              type="text"
              className={`${input} h-11`}
              value={tareaNueva}
              onChange={(e) => setTareaNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  anadirTareaLibre();
                }
              }}
              placeholder='Escribe una tarea y pulsa Enter (ej: "Llamar a María")'
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => anadirTareaLibre()}
                disabled={!tareaNueva.trim()}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50 sm:w-auto"
              >
                Añadir
              </button>
              <button
                type="button"
                onClick={() => setSelectorAbierto((v) => !v)}
                aria-expanded={selectorAbierto}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/5 px-4 text-sm font-medium text-primary hover:bg-primary/10 sm:w-auto"
              >
                {selectorAbierto ? "✕ Ocultar" : "📋 Elegir de mis tareas"}
              </button>
            </div>
          </div>

          {selectorAbierto && (
            <div className="mt-3">
              <SelectorTareaPlan
                candidatas={activasQ.data}
                yaEnElPlan={tareasLibres.map((t) => t.id_bd).filter((x): x is string => !!x)}
                onElegir={elegirTareaDeBd}
                onNueva={(titulo) => anadirTareaLibre(titulo)}
                onCerrar={() => setSelectorAbierto(false)}
                titulo="Tareas pendientes de tu base de datos"
                textoNueva="Escribe una tarea nueva"
              />
            </div>
          )}

          {errorTarea && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {errorTarea}
            </p>
          )}

          {tareasLibres.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {tareasLibres.map((t) => (
                <li
                  key={t.uid}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{t.titulo}</span>
                    {t.estado === "guardando" && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        guardando…
                      </span>
                    )}
                    {t.estado === "guardado" && !t.creada && (
                      <span
                        className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                        title="Ya existía en la base de datos — no se duplicó"
                      >
                        ya en BD
                      </span>
                    )}
                    {t.estado === "guardado" && t.creada && (
                      <span
                        className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300"
                        title="Tarea nueva creada en la base de datos"
                      >
                        nueva
                      </span>
                    )}
                    {t.estado === "error" && (
                      <span
                        className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300"
                        title={t.error ?? "Error"}
                      >
                        error
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarTareaLibre(t.uid)}
                    aria-label="Quitar tarea"
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 1E — Ya hay un plan hoy: se puede abrir para seguir editándolo */}
        {!planLocal && planHoyQ.data && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <span className="text-sm font-medium">
              📌 Ya tienes un plan generado hoy
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (generación #{planHoyQ.data.num_generacion}) — puedes abrirlo
                para añadir tareas, cambiar las que propone la IA o activar
                más bloques.
              </span>
            </span>
            <button
              type="button"
              onClick={abrirPlanDeHoy}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
            >
              Abrir el plan de hoy
            </button>
          </div>
        )}

        {/* 1F — Botón Generar Plan */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={generar}
            disabled={generando || !config.data.minimax_api_key}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconBolt className="h-4 w-4" />
            {generando ? "Generando plan…" : "Generar plan"}
          </button>
          <span className="text-xs text-muted-foreground">
            {tareasQ.data.length} tareas pendientes en BD
            {tareasLibres.length > 0 && ` · ${tareasLibres.length} añadidas en esta sesión`}
          </span>
        </div>

        {errorTarea && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {errorTarea}
          </p>
        )}
      </section>
      )}

      {/* =========================================================================
          PARTE 2 — RESULTADO (se muestra tras pulsar "Generar plan")
      ========================================================================= */}
      {planLocal && (
        <PlanGeneradoView
          plan={planLocal}
          notasEstado={notasEstado}
          onNotasChange={(texto) => setPlanLocal({ ...planLocal, notas: texto })}
          onGuardarNotas={guardarNotas}
          onEmpezarDeNuevo={empezarDeNuevo}
          onAnadirExistente={anadirExistenteAlPlan}
          onAnadirNueva={anadirNuevaAlPlan}
          onSustituirExistente={sustituirPorExistente}
          onSustituirNueva={sustituirPorTitulo}
          onActualizarTarea={actualizarTarea}
          onQuitarTarea={quitarDelPlan}
          onMoverTarea={moverTarea}
          onAlternarHecha={alternarHecha}
          candidatas={activasQ.data}
          yaEnElPlan={planLocal.tu_dia_optimizado.bloques
            .map((b) => b.tarea_id)
            .filter((x): x is string => !!x)}
        />
      )}

      {/* Histórico mini-cards (solo si no hay plan activo aún) */}
      {!planLocal && historialQ.data.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            📈 Últimos {historialQ.data.length} planes
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {historialQ.data.slice(-7).map((h) => (
              <div
                key={h.id}
                className="rounded-lg border border-border bg-background p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.fecha.slice(5)}</span>
                  {h.semaforo && (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[10px] ${SEM_COLOR[h.semaforo]}`}
                    >
                      {h.semaforo[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {h.resumen && (
                  <p className="mt-1 line-clamp-2 text-muted-foreground">
                    {h.resumen}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Vista del plan generado (Parte 2)
// ============================================================================

function PlanGeneradoView({
  plan,
  notasEstado,
  onNotasChange,
  onGuardarNotas,
  onEmpezarDeNuevo,
  onAnadirExistente,
  onAnadirNueva,
  onSustituirExistente,
  onSustituirNueva,
  onActualizarTarea,
  onQuitarTarea,
  onMoverTarea,
  onAlternarHecha,
  candidatas,
  yaEnElPlan,
}: {
  plan: PlanLocal;
  notasEstado:
    | { status: "idle" }
    | { status: "guardando" }
    | { status: "guardado"; timestamp: number }
    | { status: "error"; mensaje: string };
  onNotasChange: (texto: string) => void;
  onGuardarNotas: () => void;
  onEmpezarDeNuevo: () => void;
  onAnadirExistente: (bloqueNum: NumeroBloque, t: TareaCandidata) => void;
  onAnadirNueva: (bloqueNum: NumeroBloque, titulo: string) => void;
  onSustituirExistente: (planTareaId: string, t: TareaCandidata) => void;
  onSustituirNueva: (planTareaId: string, titulo: string) => void;
  onActualizarTarea: (
    planTareaId: string,
    patch: { titulo?: string; tareaId?: string | null; tipoTarea?: "profunda" | "rapida" },
  ) => void;
  onQuitarTarea: (planTareaId: string) => void;
  onMoverTarea: (planTareaId: string, nuevoBloqueNum: NumeroBloque) => void;
  onAlternarHecha: (bloque: BloqueLocal) => void;
  candidatas: TareaCandidata[];
  yaEnElPlan: string[];
}) {
  const semaforo = plan.semaforo;

  return (
    <div className="space-y-6">
      {/* Cabecera del plan */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            📅 {plan.fecha_larga}
          </h2>
          {plan.estado && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              🌅 {plan.estado.despertar} · 🧠 {plan.estado.mente} · 💪 {plan.estado.cuerpo} · 🌀 {plan.estado.rueda} · 🆘 {plan.estado.necesidad}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${SEM_COLOR[semaforo]}`}
          >
            <SemaforoDot semaforo={semaforo} />
            {semaforo}
          </span>
          <button
            onClick={onEmpezarDeNuevo}
            className="inline-flex items-center justify-center min-h-10 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            ↻ Empezar de nuevo
          </button>
        </div>
      </header>

      {/* Aviso de "guardado": el plan vive en la base de datos y se puede
          recuperar desde el histórico (issue #73). */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          ✅ Plan guardado
        </span>
        <span className="text-xs text-muted-foreground">
          Está en el histórico de planes: puedes recuperarlo cuando quieras.
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {plan.planId && (
            <Link
              href={`/plan-diario/detalle?id=${plan.planId}`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Ver plan completo
            </Link>
          )}
          <Link
            href="/plan-diario/historico"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            📋 Histórico
          </Link>
        </div>
      </div>

      {/* ============================================================
          SECCIÓN 1 — Resumen
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader emoji="📌" titulo="1. Resumen" />
        <p className="text-sm leading-relaxed">{plan.resumen}</p>
      </section>

      {/* ============================================================
          SECCIÓN 2 — Recomendación
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader emoji="🆘" titulo="2. Recomendación" />
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {plan.recomendacion
            .split(/(?:;|\n|(?:^|\s)-\s)/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, i) => (
              <li key={i}>{s}</li>
            ))}
        </ul>
      </section>

      {/* ============================================================
          SECCIÓN 3 — Lectura Psicológica
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader
          emoji="🧠"
          titulo="3. Lectura psicológica"
          subtitulo="Lo del día + análisis del histórico."
        />
        <div className="space-y-4">
          <SubBloque titulo="Lo del día">
            <p className="text-sm leading-relaxed">
              {plan.lectura_psicologica.lo_del_dia}
            </p>
          </SubBloque>
          <SubBloque titulo="Análisis del histórico">
            <p className="text-sm leading-relaxed">
              {plan.lectura_psicologica.analisis_historico}
            </p>
          </SubBloque>
        </div>
      </section>

      {/* ============================================================
          SECCIÓN 4 — Tu día optimizado
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader
          emoji="⏱️"
          titulo="4. Tu día optimizado"
          subtitulo={`${plan.tu_dia_optimizado.num_bloques_activos} de 4 bloques activos · cada bloque son 60 min estrictos.`}
        />

        <div className="relative">
          {/* Línea horizontal que representa el mediodía */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                ☀️ mediodía
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {agruparPorBloque(plan.tu_dia_optimizado.bloques).map((grupo) => (
              <BloqueBlock
                key={grupo.bloque}
                num={grupo.bloque}
                tareas={grupo.tareas}
                candidatas={candidatas}
                yaEnElPlan={yaEnElPlan}
                onAnadirExistente={onAnadirExistente}
                onAnadirNueva={onAnadirNueva}
                onSustituirExistente={onSustituirExistente}
                onSustituirNueva={onSustituirNueva}
                onActualizar={onActualizarTarea}
                onQuitar={onQuitarTarea}
                onMover={onMoverTarea}
                onAlternarHecha={onAlternarHecha}
              />
            ))}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          La IA decide cuántos bloques activa según tu estado, pero el plan es
          tuyo: puedes activar los bloques que te deje desactivados, cambiar la
          tarea que propone, añadirle más o moverla a otro bloque. Los
          bloques 1-2 son de mañana (antes de comer); los bloques 3-4 de
          tarde.
        </p>
      </section>

      {/* ============================================================
          SECCIÓN 5 — Propuesta de comida
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader emoji="🍽️" titulo="5. Propuesta de comida" />

        <div className="rounded-lg border border-border bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 p-5">
          <h3 className="text-lg font-bold tracking-tight">
            {plan.propuesta_comida.titulo || "—"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed">
            {plan.propuesta_comida.descripcion}
          </p>
          {plan.propuesta_comida.motivo && (
            <p className="mt-3 border-t border-border/60 pt-3 text-xs italic text-muted-foreground">
              💡 {plan.propuesta_comida.motivo}
            </p>
          )}
        </div>
      </section>

      {/* ============================================================
          SECCIÓN 6 — Notas del día
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          📓 Notas del día
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              className="min-h-[80px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={plan.notas}
              onChange={(e) => {
                onNotasChange(e.target.value);
                if (notasEstado.status === "guardado") {
                  // reset visual; la próxima vez que guarde se actualizará el timestamp
                }
              }}
              placeholder="Reflexiones al final del día, qué salió bien, qué ajustar mañana…"
            />
            <button
              onClick={onGuardarNotas}
              disabled={notasEstado.status === "guardando"}
              className="inline-flex items-center justify-center min-h-10 h-fit rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {notasEstado.status === "guardando" ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {notasEstado.status === "guardado" && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              ✅ Guardado a las{" "}
              {new Date(notasEstado.timestamp).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
          {notasEstado.status === "error" && (
            <p className="text-xs text-red-600 dark:text-red-400">
              ❌ Error: {notasEstado.mensaje}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Sub-componentes de presentación
// ============================================================================

function SectionHeader({
  emoji,
  titulo,
  subtitulo,
}: {
  emoji: string;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <span className="text-lg">{emoji}</span>
        {titulo}
      </h2>
      {subtitulo && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitulo}</p>
      )}
    </div>
  );
}

function SubBloque({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function SemaforoDot({ semaforo }: { semaforo: "verde" | "amarillo" | "rojo" }) {
  const color =
    semaforo === "verde"
      ? "bg-emerald-500"
      : semaforo === "amarillo"
        ? "bg-amber-500"
        : "bg-red-500";
  return <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden />;
}

import { IconBolt, IconSparkles } from "@/components/icons";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";

function fechaToLargaLocal(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
// ============================================================================
// Bloque individual: las tareas del bloque + las acciones para editarlas.
//
// Un bloque puede llevar VARIAS tareas (issue #73): las que propuso la IA y
// las que ha añadido la persona. Cada tarea se puede renombrar, cambiar de
// tipo, sustituir por otra de la base de datos, mover a otro bloque, marcar
// como hecha o quitar del plan.
//
// Si el bloque está vacío aparece como "desactivado" y se puede ACTIVAR:
// la IA propone cuántos bloques encajan con tu estado, pero el plan es tuyo.
// ============================================================================

function BloqueBlock({
  num,
  tareas,
  candidatas,
  yaEnElPlan,
  onAnadirExistente,
  onAnadirNueva,
  onSustituirExistente,
  onSustituirNueva,
  onActualizar,
  onQuitar,
  onMover,
  onAlternarHecha,
}: {
  num: NumeroBloque;
  tareas: BloqueLocal[];
  candidatas: TareaCandidata[];
  yaEnElPlan: string[];
  onAnadirExistente: (bloqueNum: NumeroBloque, t: TareaCandidata) => void;
  onAnadirNueva: (bloqueNum: NumeroBloque, titulo: string) => void;
  onSustituirExistente: (planTareaId: string, t: TareaCandidata) => void;
  onSustituirNueva: (planTareaId: string, titulo: string) => void;
  onActualizar: (
    planTareaId: string,
    patch: { titulo?: string; tareaId?: string | null; tipoTarea?: "profunda" | "rapida" },
  ) => void;
  onQuitar: (planTareaId: string) => void;
  onMover: (planTareaId: string, nuevoBloqueNum: NumeroBloque) => void;
  onAlternarHecha: (bloque: BloqueLocal) => void;
}) {
  const [panelAbierto, setPanelAbierto] = useState(false);
  /** Id de la tarea que se está sustituyendo (null = se está añadiendo). */
  const [sustituyendoId, setSustituyendoId] = useState<string | null>(null);

  function abrirPanel(sustituyendo: string | null) {
    setSustituyendoId(sustituyendo);
    setPanelAbierto(true);
  }

  function cerrarPanel() {
    setPanelAbierto(false);
    setSustituyendoId(null);
  }

  return (
    <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide">
          {BLOQUE_LABELS[num]}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
            {BLOQUE_HORARIO[num]}
          </span>
          {tareas.length > 1 && (
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
              {tareas.length} tareas
            </span>
          )}
        </div>
      </div>

      {tareas.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background/60 px-3 py-4 text-center">
          <p className="text-xs italic text-muted-foreground">
            bloque desactivado — la IA lo dejó fuera según tu estado
          </p>
          <button
            type="button"
            onClick={() => abrirPanel(null)}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            ➕ Activar este bloque
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {tareas.map((t) => (
              <TareaEnBloque
                key={t.plan_tarea_id ?? `${num}-${t.titulo_libre}`}
                tarea={t}
                onActualizar={onActualizar}
                onQuitar={onQuitar}
                onMover={onMover}
                onAlternarHecha={onAlternarHecha}
                onSustituir={() => abrirPanel(t.plan_tarea_id ?? null)}
              />
            ))}
          </ul>
          <button
            type="button"
            onClick={() => abrirPanel(null)}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-dashed border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            ➕ Añadir una tarea a este bloque
          </button>
        </>
      )}

      {panelAbierto && (
        <div className="mt-2">
          <SelectorTareaPlan
            candidatas={candidatas}
            yaEnElPlan={yaEnElPlan}
            onElegir={(t) => {
              if (sustituyendoId) onSustituirExistente(sustituyendoId, t);
              else onAnadirExistente(num, t);
              cerrarPanel();
            }}
            onNueva={(titulo) => {
              if (sustituyendoId) onSustituirNueva(sustituyendoId, titulo);
              else onAnadirNueva(num, titulo);
              cerrarPanel();
            }}
            onCerrar={cerrarPanel}
            titulo={
              sustituyendoId
                ? "Sustituir por otra tarea"
                : `Añadir una tarea a ${BLOQUE_LABELS[num]}`
            }
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Una tarea dentro de un bloque: casilla, título editable y acciones.
// ============================================================================

function TareaEnBloque({
  tarea,
  onActualizar,
  onQuitar,
  onMover,
  onAlternarHecha,
  onSustituir,
}: {
  tarea: BloqueLocal;
  onActualizar: (
    planTareaId: string,
    patch: { titulo?: string; tareaId?: string | null; tipoTarea?: "profunda" | "rapida" },
  ) => void;
  onQuitar: (planTareaId: string) => void;
  onMover: (planTareaId: string, nuevoBloqueNum: NumeroBloque) => void;
  onAlternarHecha: (bloque: BloqueLocal) => void;
  onSustituir: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(tarea.titulo_libre);
  const id = tarea.plan_tarea_id;

  function commitRename() {
    if (!id) return;
    const limpio = borrador.trim();
    if (limpio && limpio !== tarea.titulo_libre) {
      onActualizar(id, { titulo: limpio });
    } else {
      setBorrador(tarea.titulo_libre);
    }
    setEditando(false);
  }

  return (
    <li className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={!!tarea.hecho}
          onChange={() => onAlternarHecha(tarea)}
          aria-label={`Marcar "${tarea.titulo_libre}" como hecha`}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-emerald-600"
        />
        <div className="min-w-0 flex-1">
          {editando ? (
            <input
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  setBorrador(tarea.titulo_libre);
                  setEditando(false);
                }
              }}
              aria-label="Nuevo nombre de la tarea"
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditando(true)}
              title="Toca para renombrar"
              className={`w-full break-words rounded-md px-2 py-2 text-left text-sm font-medium leading-snug hover:bg-muted ${
                tarea.hecho ? "text-muted-foreground line-through" : ""
              }`}
            >
              {tarea.titulo_libre}
            </button>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <button
              type="button"
              disabled={!id}
              onClick={() =>
                id && onActualizar(id, { tipoTarea: tarea.tipo === "profunda" ? "rapida" : "profunda" })
              }
              title="Cambiar el tipo de bloque (profunda = el bloque entero · rápida = micro-tarea)"
              className={`rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide disabled:opacity-50 ${
                tarea.tipo === "profunda"
                  ? "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  : "border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
              }`}
            >
              {tarea.tipo}
            </button>
            <span>{tarea.tarea_id ? "📌 vinculada a tarea en BD" : "✨ propuesta por la IA"}</span>
          </div>

          {/* Acciones: 40 px de alto para que se pulsen con el dedo. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!id}
              onClick={() => setEditando(true)}
              title="Renombrar"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-2 text-xs hover:bg-muted disabled:opacity-50"
            >
              ✎
            </button>
            <button
              type="button"
              disabled={!id}
              onClick={onSustituir}
              title="Sustituir por otra tarea"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-background px-2 text-xs hover:bg-muted disabled:opacity-50"
            >
              ⇄
            </button>
            <select
              aria-label="Mover la tarea a otro bloque"
              disabled={!id}
              value={tarea.bloque_num}
              onChange={(e) => {
                const nuevo = Number(e.target.value) as NumeroBloque;
                if (id && nuevo !== tarea.bloque_num) onMover(id, nuevo);
              }}
              className="h-10 rounded-md border border-border bg-background px-2 text-[11px] outline-none hover:bg-muted disabled:opacity-50"
            >
              {([1, 2, 3, 4] as const).map((b) => (
                <option key={b} value={b}>
                  ↔ Bloque {b}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!id}
              onClick={() => id && onQuitar(id)}
              title="Quitar del plan (la tarea de la base de datos no se borra)"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-500/30 bg-background px-2 text-xs text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
