"use client";

// ============================================================================
// /agente — Entrada unificada del agente de planificación.
// Reemplaza el flujo "solo metas" de /metas/agente por uno que primero
// CLASIFICA lo que el usuario cuenta (proyecto / meta / captura) y luego
// propone la estructura adecuada.
//
// Por qué existe esta página (migration 0024 + esto):
//   · Antes el usuario tenía que decidir él si lo suyo era meta o
//     proyecto, y el modelo de datos no le ayudaba (las metas no
//     colgaban de proyectos, los proyectos no tenían área). De ahí
//     la confusión "¿lo llamo meta o proyecto?".
//   · Ahora: 1 textarea, 1 botón. La IA decide. El humano revisa.
//
// La página /metas/agente sigue existiendo como atajo directo a "crear
// meta con plan", pero el camino "oficial" para entradas nuevas es este.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  crearMeta,
  crearProyecto,
  crearResultadoPeriodo,
  ensurePeriodosAnio,
} from "@/lib/mutations";
import { fetchAreas, fetchPeriodos } from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  clasificarYGenerarIA,
  parsearMesesDeRango,
  generarPlanMetaIA,
  aplicarKrsYTareasEnMeta,
  type PeriodosPorUnidad,
  type MetaHijaGenerada,
  type ResultadoClasificador,
} from "@/lib/plan";
import type { Area, Periodo, Proyecto } from "@/lib/types";
import {
  IconArrowLeft,
  IconCheck,
  IconSparkles,
  IconX,
} from "@/components/icons";

/** YYYY-MM-DD de hoy en hora local del navegador. */
function hoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function AgentePage() {
  const router = useRouter();
  const cfg = useConfig();
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: periodos } = useData<Periodo[]>(fetchPeriodos, []);

  const anioActual = new Date().getFullYear();
  const hoyStr = hoyYMD();

  const [contexto, setContexto] = useState("");
  const [restricciones, setRestricciones] = useState(
    "TDAH; cervicales (no correr, no impacto); ansiedad",
  );
  // Migration 0025: rango opcional. Si lo rellenas, se pasa a la IA +
  // se persiste en cada meta creada.
  const [fechaInicioMeta, setFechaInicioMeta] = useState<string>("");
  const [fechaObjetivo, setFechaObjetivo] = useState<string>("");
  const [fechaFinBloqueada, setFechaFinBloqueada] = useState<boolean>(false);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoClasificador | null>(null);
  /** Mensaje de progreso durante la fase de generación del plan completo
   *  (1 mensaje por meta, p.ej. "Generando plan para meta 2/4..."). El
   *  spinner se queda visible durante la fase 2 sin perder el resultado
   *  del clasificador. */
  const [progresoPlan, setProgresoPlan] = useState<string | null>(null);
  /** Diagnóstico de la aplicación. Si está set, mostramos un panel
   *  amarillo en lugar de redirigir a la primera meta. Esto es la red
   *  de seguridad que David pidió: si solo se crea 1 meta de 4, queremos
   *  ver QUÉ falló sin necesidad de abrir la consola del navegador. */
  const [diagnostico, setDiagnostico] = useState<{
    totalEsperadas: number;
    totalCreadas: number;
    idsCreadas: string[];
    /** Nombres de las metas que se esperaban crear (para mostrar el gap). */
    titulosEsperados: string[];
    /** Nombres de las metas que SÍ se crearon (para cruzar con los esperados). */
    titulosCreados: string[];
    metasFallaron: Array<{ titulo: string; error: string }>;
    krsFallaron: string[];
    /** Resumen de la fase 2 (plan completo). null si no se intentó
     *  todavía. Lista por meta: cuántas KRs+tareas OK, cuántos fallos. */
    planPorMeta?: Array<{
      titulo: string;
      krs: number;
      tareas: number;
      error?: string;
    }>;
  } | null>(null);

  const apiKeyOk = !!cfg.data.minimax_api_key;

  const trimestresPorNumero = (() => {
    const m = new Map<1 | 2 | 3 | 4, { id: string; nombre: string }>();
    for (const p of periodos ?? []) {
      if (p.tipo === "trimestre" && p.anio === anioActual) {
        m.set(p.numero as 1 | 2 | 3 | 4, { id: p.id, nombre: p.nombre });
      }
    }
    return m;
  })();

  // —— Derivados de fechas (migration 0025) ——
  const rango = useMemo(
    () =>
      parsearMesesDeRango({
        fecha_inicio: fechaInicioMeta || hoyStr,
        fecha_objetivo: fechaObjetivo || null,
        anio: anioActual,
        hoy: hoyStr,
      }),
    [fechaInicioMeta, fechaObjetivo, anioActual, hoyStr],
  );

  // True si David rellenó alguna fecha. Lo necesitamos ANTES de los
  // siguientes useMemo (mesesLabel, unidadesObjetivo, metasFueraDeRango)
  // para que no haya orden de declaración raro.
  const hayFechas: boolean = !!fechaInicioMeta || !!fechaObjetivo;

  const fechaError =
    fechaInicioMeta && fechaObjetivo && fechaInicioMeta > fechaObjetivo
      ? "La fecha de inicio no puede ser posterior a la fecha límite."
      : null;

  // Migration 0025: derivamos warnings de metas hijas cuya fecha_objetivo
  // cae fuera del rango marcado por David. El prompt del clasificador ya
  // intenta evitar esto, pero como red de seguridad lo mostramos antes de
  // aplicar y el humano decide si sigue.
  const metasFueraDeRango = useMemo(() => {
    if (!resultado || !hayFechas) return [];
    return resultado.metas
      .filter((m) => {
        if (!m.fecha_objetivo) return false;
        if (fechaInicioMeta && m.fecha_objetivo < fechaInicioMeta) return true;
        if (fechaObjetivo && m.fecha_objetivo > fechaObjetivo) return true;
        return false;
      })
      .map((m) => ({
        titulo: m.meta_titulo,
        fecha: m.fecha_objetivo as string,
      }));
  }, [resultado, hayFechas, fechaInicioMeta, fechaObjetivo]);

  const mesesLabel = useMemo(() => {
    if (!hayFechas) return null;
    if (rango.meses.length === 0) return "sin rango";
    if (rango.meses.length === 1) return `1 mes (${rango.meses[0].nombre})`;
    const primero = rango.meses[0].nombre;
    const ultimo = rango.meses[rango.meses.length - 1].nombre;
    return `${rango.meses.length} meses · ${primero} → ${ultimo}`;
  }, [hayFechas, rango]);

  // Lista plana de meses habilitados (la recibe el prompt del
  // clasificador para que use `unidad_tiempo: "mes"`).
  const unidadesObjetivo = useMemo<Array<{ unidad: "mes"; numero: number }>>(
    () =>
      hayFechas
        ? rango.meses.map((m) => ({ unidad: "mes" as const, numero: m.numero }))
        : [],
    [hayFechas, rango],
  );


  async function generar() {
    if (!contexto.trim()) {
      setError("Escribe primero qué quieres conseguir.");
      return;
    }
    if (!apiKeyOk) {
      setError(
        "Configura la clave de IA en /configuracion antes de usar el agente.",
      );
      return;
    }
    setGenerando(true);
    setError(null);
    setResultado(null);
    setDiagnostico(null);
    try {
      const res = await clasificarYGenerarIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key!,
        cfg.data.model,
        {
          contexto: contexto.trim(),
          restricciones: restricciones
            .split(/[;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          areasExistentes: (areas ?? []).map((a) => a.nombre),
          // Migration 0025: propagamos fechas reales al prompt.
          fecha_inicio_meta: fechaInicioMeta || null,
          fecha_objetivo: fechaObjetivo || null,
          fecha_fin_bloqueada:
            !!fechaFinBloqueada && !!fechaObjetivo ? true : false,
          unidades_objetivo: hayFechas
            ? unidadesObjetivo.map((u) => ({
                unidad: u.unidad,
                numero: u.numero,
              }))
            : undefined,
        },
      );
      setResultado(res);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "La IA no pudo clasificar tu idea.",
      );
    } finally {
      setGenerando(false);
    }
  }

  function cancelar() {
    setResultado(null);
    setError(null);
  }

  async function aplicar() {
    if (!resultado) return;
    setAplicando(true);
    setError(null);
    try {
      // 1) Resolver el área sugerida (o crearla si no existe).
      let areaId: string | null = null;
      if (resultado.area_nombre) {
        const match = (areas ?? []).find(
          (a) => a.nombre.trim().toLowerCase() === resultado.area_nombre!.trim().toLowerCase(),
        );
        if (match) {
          areaId = match.id;
        }
        // Si no existe, NO la creamos automáticamente: el humano debe
          // decidir. Pasamos null y que el editor lo arregle luego. (Regla
          // ponytail: no asumir acciones de escritura silenciosas.)
      }

      // 0) Refrescar la sesión ANTES del primer INSERT. Hipótesis causa
      //    raíz del bug: el JWT está cerca de expirar y `autoRefreshToken`
      //    se dispara entre inserts. El 1º pasa con el token viejo aún
      //    válido; los siguientes fallan por RLS (`owner_id = auth.uid()`
      //    devuelve null durante el refresh). Forzar getSession() aquí
      //    serializa el refresh y garantiza que TODOS los inserts ven
      //    una sesión estable.
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: sesion } = await supabase.auth.getSession();
        if (!sesion?.session) {
          throw new Error(
            "Sesión expirada. Recarga la página (F5) y vuelve a intentarlo.",
          );
        }
        console.log(
          `[Agente] sesión OK · expires_at=${sesion.session.expires_at} · user=${sesion.session.user.id}`,
        );
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.startsWith("Sesión expirada")
        ) {
          throw e; // sí, abortar — sin sesión no podemos seguir
        }
        // Cualquier otro error aquí NO debe abortar el flujo: lo
        // logueamos y seguimos (la sesión puede estar bien igualmente).
        console.warn("[Agente] getSession() no crítico falló:", e);
      }

      // 2) Si es proyecto, crearlo primero.
      let proyectoId: string | null = null;
      if (resultado.clasificacion === "proyecto" && resultado.proyecto) {
        const p: Proyecto = await crearProyecto({
          nombre: resultado.proyecto.nombre,
          color: resultado.proyecto.color || "#6366f1",
          descripcion: resultado.proyecto.descripcion || null,
          area_id: areaId,
        });
        proyectoId = p.id;
      }
      // Las fechas de David (si las rellenó) se aplican en bloque a las
      // metas hijas más abajo. No se guardan en el proyecto porque la
      // tabla `proyectos` no las tiene — es la propia decisión de cada
      // meta la que cuenta.

      // 3) Asegurar periodos del año para poder crear los KRs.
      await ensurePeriodosAnio(anioActual);
      // Migration 0025: si David rellenó fechas, también necesitamos los
      // periodos mensuales del rango para que el planificador batch
      // pueda asignar tareas a meses sueltos (no solo a Q1..Q4).
      if (hayFechas && rango.meses.length > 0) {
        const mesInicio = rango.meses[0].numero;
        const mesFin = rango.meses[rango.meses.length - 1].numero;
        const { ensurePeriodosMeses } = await import("@/lib/mutations");
        await ensurePeriodosMeses(anioActual, mesInicio, mesFin);
      }

      // 4) Refrescar periodos desde BD (no del state de React, que puede
      //    estar stale al llegar aquí). Esto garantiza que tenemos los
      //    periodos recién creados por ensurePeriodosAnio.
      //    Importamos dinámicamente para no crear dependencia circular.
      const { fetchPeriodos } = await import("@/lib/queries");
      const periodosBD = await fetchPeriodos();
      const periodosRefrescados = (periodosBD ?? []).filter(
        (p) => p.anio === anioActual,
      );
      const periodosByNumero = new Map<1 | 2 | 3 | 4, { id: string; nombre: string }>();
      // PeriodosPorUnidad es el Map que espera aplicarKrsYTareasEnMeta:
      // clave "trimestre:N" o "mes:N" → {id, tipo}. Lo construimos una
      // sola vez aquí y lo reutilizamos en el bucle del plan completo.
      const periodosByUnidad: PeriodosPorUnidad = new Map();
      for (const p of periodosRefrescados) {
        if (p.tipo === "trimestre") {
          periodosByNumero.set(p.numero as 1 | 2 | 3 | 4, {
            id: p.id,
            nombre: p.nombre,
          });
          periodosByUnidad.set(`trimestre:${p.numero}`, {
            id: p.id,
            tipo: "trimestre",
          });
        } else if (p.tipo === "mes") {
          periodosByUnidad.set(`mes:${p.numero}`, {
            id: p.id,
            tipo: "mes",
          });
        }
      }

      // 4b) Crear cada meta hija + su KR inicial.
      // Migration 0025: si David rellenó fechas en el formulario, las
      // heredamos a cada meta hija. El kr_inicial puede venir con
      // `unidad_tiempo: "mes"` + `mes: 1..12` (migration 0025) o con
      // `trimestre: 1..4` (compat). Lo resolvemos a periodo_id real aquí.
      const usarFechasDavid = !!fechaInicioMeta || !!fechaObjetivo;
      const idsCreadas: string[] = [];
      const krsFallaron: string[] = [];
      const metasFallaron: Array<{
        titulo: string;
        error: string;
      }> = [];

      // —— Logging brutal del estado ANTES del loop, para poder
      // diagnosticar exactamente qué llega del parser y qué falla. ——
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "agente_debug_aplicar",
            JSON.stringify({
              t: Date.now(),
              clasificacion: resultado.clasificacion,
              metas_recibidas: resultado.metas.length,
              titulos_recibidos: resultado.metas.map((m) => m.meta_titulo),
              titulos_con_kr: resultado.metas
                .filter((m) => m.kr_inicial)
                .map((m) => ({
                  titulo: m.meta_titulo,
                  unidad_tiempo: m.unidad_tiempo,
                  mes: m.mes,
                  trimestre: m.kr_inicial?.trimestre,
                  fecha_objetivo: m.fecha_objetivo,
                  meta_ambito: m.meta_ambito,
                  meta_plazo: m.meta_plazo,
                })),
              periodos_disponibles: Array.from(periodosByNumero.keys()),
              periodo_ids: Array.from(periodosByNumero.entries()).map(
                ([k, v]) => ({ trimestre: k, id: v.id }),
              ),
              proyecto_id: proyectoId,
              area_id: areaId,
            }),
          );
        } catch {
          // sessionStorage puede fallar en modo privado.
        }
      }

      // —— BUCLE PRINCIPAL con retry + árbitro adversarial ——
      // Estrategia:
      //   1) Primer pase: crear cada meta. Si falla, capturar y seguir.
      //   2) Segundo pase: reintentar SOLO las metas que fallaron, una
      //      vez, con un pequeño backoff. Si fallan otra vez, se reportan.
      //   3) Árbitro: al final, si expected !== created, NO redirigir.
      //      Mostrar el gap exacto y bloquear hasta que el humano decida.
      type MetaResultado = {
        meta_titulo: string;
        meta: MetaHijaGenerada;
        metaId?: string;
        krCreado: boolean;
        error?: string;
      };
      const todasMetas: MetaResultado[] = resultado.metas.map((m) => ({
        meta_titulo: m.meta_titulo,
        meta: m,
        krCreado: false,
      }));

      async function intentarCrearMeta(slot: MetaResultado): Promise<void> {
        const m = slot.meta;
        const meta = await crearMeta({
          titulo: m.meta_titulo,
          descripcion: m.meta_descripcion || null,
          estado: "sin_empezar",
          prioridad: "alta",
          area_id: areaId,
          proyecto_id: proyectoId,
          plazo: m.meta_plazo || null,
          ambito: m.meta_ambito,
          fecha_objetivo:
            (usarFechasDavid ? fechaObjetivo : null) ?? m.fecha_objetivo,
          contexto: m.contexto,
          fecha_inicio_meta: usarFechasDavid ? fechaInicioMeta || null : null,
          fecha_fin_bloqueada:
            usarFechasDavid && !!fechaObjetivo ? fechaFinBloqueada : false,
        });
        slot.metaId = meta.id;

        if (m.kr_inicial) {
          let periodoId: string | null = null;
          if (m.unidad_tiempo === "mes" && typeof m.mes === "number") {
            const num = m.mes;
            const trim = (num <= 3 ? 1 : num <= 6 ? 2 : num <= 9 ? 3 : 4) as
              | 1
              | 2
              | 3
              | 4;
            periodoId = periodosByNumero.get(trim)?.id ?? null;
          } else {
            periodoId =
              periodosByNumero.get(m.kr_inicial.trimestre as 1 | 2 | 3 | 4)?.id ??
              null;
          }

          if (periodoId) {
            try {
              await crearResultadoPeriodo({
                meta_id: meta.id,
                periodo_id: periodoId,
                titulo: m.kr_inicial.titulo,
                descripcion: null,
                metrica: m.kr_inicial.metrica,
                valor_objetivo: m.kr_inicial.valor_objetivo,
                unidad: m.kr_inicial.unidad,
                peso: 1,
                estado: "pendiente",
              });
              slot.krCreado = true;
            } catch (e) {
              // KR falla: la meta YA está guardada. Marcamos KR fallido
              // pero NO marcamos la meta como fallida (está persistida).
              const errStr = e instanceof Error ? e.message : String(e);
              console.warn(
                `[Agente] KR inicial falló para "${m.meta_titulo}":`,
                errStr,
              );
              krsFallaron.push(m.meta_titulo);
            }
          } else {
            console.warn(
              `[Agente] KR sin periodo resoluble para "${m.meta_titulo}":`,
              m.kr_inicial,
            );
            krsFallaron.push(m.meta_titulo);
          }
        }
      }

      // —— Pase 1: crear todas las metas en serie ——
      for (let i = 0; i < todasMetas.length; i++) {
        const slot = todasMetas[i];
        console.log(
          `[Agente] pase 1 — creando meta ${i + 1}/${todasMetas.length}: "${slot.meta_titulo}"`,
        );
        try {
          await intentarCrearMeta(slot);
          idsCreadas.push(slot.metaId!);
          console.log(
            `[Agente] ✅ meta creada id=${slot.metaId} ("${slot.meta_titulo}")`,
          );
        } catch (e) {
          const errorStr = e instanceof Error ? e.message : String(e);
          slot.error = errorStr;
          console.error(
            `[Agente] ❌ pase 1 falló para "${slot.meta_titulo}":`,
            errorStr,
          );
        }
        // Cedemos el event loop entre inserts. Hipótesis: autoRefreshToken
        // del cliente Supabase puede dispararse aquí y romper el siguiente
        // INSERT por RLS. Un await 0 fuerza a que el refresh se complete
        // antes del próximo insert.
        await new Promise((r) => setTimeout(r, 50));
      }

      // —— Pase 2: reintentar las que fallaron (UNA vez más) ——
      const fallaronEnPase1 = todasMetas.filter((s) => !s.metaId);
      if (fallaronEnPase1.length > 0) {
        console.warn(
          `[Agente] ${fallaronEnPase1.length} metas fallaron en pase 1. Reintentando en pase 2…`,
        );
        for (let i = 0; i < fallaronEnPase1.length; i++) {
          const slot = fallaronEnPase1[i];
          console.log(
            `[Agente] pase 2 — reintentando "${slot.meta_titulo}"`,
          );
          try {
            await intentarCrearMeta(slot);
            idsCreadas.push(slot.metaId!);
            console.log(
              `[Agente] ✅ pase 2 OK: meta creada id=${slot.metaId} ("${slot.meta_titulo}")`,
            );
            slot.error = undefined;
          } catch (e) {
            const errorStr = e instanceof Error ? e.message : String(e);
            slot.error = errorStr;
            console.error(
              `[Agente] ❌ pase 2 también falló para "${slot.meta_titulo}":`,
              errorStr,
            );
          }
        }
      }

      // —— Recopilar metas fallidas definitivas (las que no se pudieron
      //     crear ni en el pase 2) ——
      for (const slot of todasMetas) {
        if (!slot.metaId && slot.error) {
          metasFallaron.push({ titulo: slot.meta_titulo, error: slot.error });
        }
      }

      // —— FASE 2: plan completo (KRs + tareas + hábitos) por meta ——
      // Solo si la fase 1 dejó metas creadas. Para cada meta con metaId,
      // llama a generarPlanMetaIA (1 LLM call por meta, ~5-15s cada una)
      // y aplicarKrsYTareasEnMeta que materializa KRs/tareas/hábitos.
      // Si una meta falla, las otras siguen. El KR inicial que el
      // clasificador creó en pase 1 cuenta como "KR existente" y se
      // respeta (saltarExistentes=true).
      //
      // El usuario pidió "plan completo o nada" — si esto falla entero,
      // las metas siguen existiendo y el panel diagnóstico lo refleja.
      const planPorMeta: Array<{
        titulo: string;
        krs: number;
        tareas: number;
        error?: string;
      }> = [];
      const metasConId = todasMetas.filter((s) => s.metaId);
      if (metasConId.length > 0) {
        console.log(
          `[Agente] fase 2 — generando plan completo para ${metasConId.length} metas…`,
        );
        setProgresoPlan(
          `Generando plan para meta 1/${metasConId.length}…`,
        );
        for (let i = 0; i < metasConId.length; i++) {
          const slot = metasConId[i];
          const m = slot.meta;
          setProgresoPlan(
            `Generando plan para meta ${i + 1}/${metasConId.length}: "${slot.meta_titulo}"`,
          );
          console.log(
            `[Agente] fase 2 — meta ${i + 1}/${metasConId.length}: "${slot.meta_titulo}"`,
          );
          try {
            // 1) LLM decide KRs + tareas para esta meta. Si la meta no
            //    tiene rango (sin fechas de David), usamos los 4
            //    trimestres del año como disponibles; si tiene rango,
            //    usamos los meses del rango.
            const plan = await generarPlanMetaIA(
              cfg.data.base_url,
              cfg.data.minimax_api_key!,
              cfg.data.model,
              {
                meta_titulo: m.meta_titulo,
                meta_descripcion: m.meta_descripcion,
                meta_ambito: m.meta_ambito,
                meta_plazo: m.meta_plazo,
                anio: anioActual,
                fecha_inicio_meta: usarFechasDavid ? fechaInicioMeta || null : null,
                fecha_objetivo: usarFechasDavid ? fechaObjetivo || null : null,
                fecha_fin_bloqueada:
                  usarFechasDavid && !!fechaObjetivo ? fechaFinBloqueada : false,
                krs_por_trimestre: hayFechas && rango.meses.length > 0 ? 1 : 2,
              },
            );
            // 2) Materializar KRs y tareas. saltarExistentes=true para
            //    que el KR inicial del clasificador se respete.
            const r = await aplicarKrsYTareasEnMeta(
              slot.metaId!,
              plan,
              periodosByUnidad,
              {
                base_url: cfg.data.base_url,
                minimax_api_key: cfg.data.minimax_api_key,
                model: cfg.data.model,
              },
              { saltarExistentes: true },
            );
            console.log(
              `[Agente] ✅ plan de "${slot.meta_titulo}": ` +
                `${r.krsCreados} KRs nuevos + ${r.krsExistentes} KRs existentes (con tareas añadidas) + ${r.tareasCreadas} tareas`,
            );
            planPorMeta.push({
              titulo: slot.meta_titulo,
              krs: r.krsCreados + r.krsExistentes,
              tareas: r.tareasCreadas,
            });
          } catch (e) {
            const errStr = e instanceof Error ? e.message : String(e);
            console.error(
              `[Agente] ❌ plan falló para "${slot.meta_titulo}":`,
              errStr,
            );
            planPorMeta.push({
              titulo: slot.meta_titulo,
              krs: 0,
              tareas: 0,
              error: errStr,
            });
          }
          // Cedemos el event loop entre metas para no disparar
          // auto-refresh del JWT de Supabase en mitad de inserts.
          await new Promise((r) => setTimeout(r, 50));
        }
        setProgresoPlan(null);
        const totalKrs = planPorMeta.reduce((s, p) => s + p.krs, 0);
        const totalTareas = planPorMeta.reduce((s, p) => s + p.tareas, 0);
        const planesFallaron = planPorMeta.filter((p) => p.error);
        console.log(
          `[Agente] fase 2 resumen: ${totalKrs} KRs + ${totalTareas} tareas, ` +
            `${planesFallaron.length} metas con plan fallido`,
        );
      }

      // —— Mapear IDs creados a títulos (para cruzar con los esperados) ——
      const titulosEsperados = resultado.metas.map((m) => m.meta_titulo);
      const titulosCreados = todasMetas
        .filter((s) => s.metaId)
        .map((s) => s.meta_titulo);

      // —— ÁRBITRO ADVERSARIAL ——
      // Si los conteos no cuadran, NO mentir al usuario. Reportar gap.
      const totalEsperadas = resultado.metas.length;
      const totalCreadas = idsCreadas.length;
      const gap = totalEsperadas - totalCreadas;
      const arbitroOk = gap === 0 && metasFallaron.length === 0;

      console.log(
        `[Agente] árbitro: esperadas=${totalEsperadas}, creadas=${totalCreadas}, gap=${gap}, krs_fallaron=${krsFallaron.length}, metas_fallaron_definitivas=${metasFallaron.length}, OK=${arbitroOk}`,
      );

      // —— Logging del resultado final del loop ——
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "agente_debug_aplicar_resultado",
            JSON.stringify({
              t: Date.now(),
              ids_creadas: idsCreadas,
              krs_fallaron: krsFallaron,
              metas_fallaron: metasFallaron,
              plan_por_meta: planPorMeta,
            }),
          );
        } catch {
          // igual que antes
        }
      }

      // 4c) Si el agente recortó el proyecto (≥2 palabras tipo
      // "fases"/"completo"/etc.) y devolvió ≤1 metas cuando
      // clasificacion es proyecto, lo reflejamos en una variable para
      // que la UI lo muestre al usuario tras el redirect.
      if (
        typeof window !== "undefined" &&
        resultado.clasificacion === "proyecto" &&
        resultado.metas.length < 2 &&
        idsCreadas.length > 0
      ) {
        try {
          sessionStorage.setItem(
            "agente_alerta_recorte",
            JSON.stringify({
              titulos: resultado.metas.map((m) => m.meta_titulo),
              razon:
                "El agente clasificó como proyecto pero solo devolvió 1 meta. Probablemente el rango es corto. Considera borrar las metas creadas y reformular el contexto con más detalle.",
              ids: idsCreadas,
              krsFallaron,
            }),
          );
        } catch {
          // sessionStorage puede estar deshabilitado en algunos navegadores
          // (modo privado). Fallar en silencio no rompe el flujo.
        }
      } else if (krsFallaron.length > 0 && typeof window !== "undefined") {
        try {
          sessionStorage.setItem(
            "agente_alerta_krs_fallaron",
            JSON.stringify({ krsFallaron }),
          );
        } catch {
          // igual que arriba
        }
      }

      // 5) Decisión final basada en el ÁRBITRO. Si gap > 0 o hay metas
      //    fallidas, NO redirigir — el humano debe ver el gap.
      if (arbitroOk && idsCreadas.length > 0) {
        // 100% creado. Resumen de la fase 2 (plan completo) en
        // sessionStorage para que el detalle de la primera meta lo
        // pueda mostrar al usuario como toast/banner.
        if (typeof window !== "undefined" && planPorMeta.length > 0) {
          try {
            const totalKrs = planPorMeta.reduce((s, p) => s + p.krs, 0);
            const totalTareas = planPorMeta.reduce((s, p) => s + p.tareas, 0);
            const planesFallaron = planPorMeta.filter((p) => p.error).length;
            sessionStorage.setItem(
              "agente_resumen_plan",
              JSON.stringify({
                krs: totalKrs,
                tareas: totalTareas,
                metas: planPorMeta.length,
                planesFallaron,
              }),
            );
          } catch {
            // sessionStorage puede estar deshabilitado en algunos navegadores
            // (modo privado). Fallar en silencio no rompe el flujo.
          }
        }
        const primera = idsCreadas[0];
        router.push(`/metas/detalle?id=${primera}`);
      } else {
        // Algo no salió bien: panel diagnóstico en pantalla con el gap
        // exacto. Esto es lo que el usuario verá si reaparece el bug.
        setDiagnostico({
          totalEsperadas,
          totalCreadas,
          idsCreadas,
          titulosEsperados,
          titulosCreados,
          metasFallaron,
          krsFallaron,
          planPorMeta: planPorMeta.length > 0 ? planPorMeta : undefined,
        });
        setAplicando(false);
      }
    } catch (e) {
      // Catch exterior: si algo ANTES del bucle lanza (crearProyecto,
      // ensurePeriodosAnio, import dinámico, fetch de periodos), el
      // bucle nunca se ejecuta y no hay `idsCreadas`. Mostramos el error
      // Y dejamos la opción de reintentar — antes esto silenciaba el
      // hecho de que 0 metas se crearon.
      const errorStr = e instanceof Error ? e.message : String(e);
      console.error("[Agente] aplicar() falló antes del bucle:", errorStr);
      setError(
        `No se pudo aplicar la sugerencia: ${errorStr}. ` +
          `Si se creó alguna meta, aparecerá en tu lista. ` +
          `Puedes intentar de nuevo.`,
      );
      setAplicando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <IconSparkles className="h-5 w-5 text-violet-500" />
          Agente de planificación
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Cuéntame en tus palabras qué quieres conseguir. Yo decido si es
          un <strong className="text-foreground">proyecto</strong> (varias
          metas), una <strong className="text-foreground">meta</strong>{" "}
          aislada, o si es mejor dejarlo en el{" "}
          <strong className="text-foreground">inbox</strong> por ahora. Tú
          revisas, ajustas y aplicas.
        </p>
      </header>

      {!apiKeyOk && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Configura la clave de IA en{" "}
          <Link href="/configuracion" className="font-medium underline">
            /configuracion
          </Link>{" "}
          para usar el agente.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">
            ¿Qué quieres conseguir?
          </span>
          <textarea
            rows={6}
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder="Ej: Quiero lanzar la primera versión de Sol de Nit antes de septiembre. Tengo el MVP técnico listo pero falta el onboarding de los primeros usuarios y la pasarela de pago…"
            className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={generando || aplicando}
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium">
            Restricciones duras (separadas por ; o nueva línea)
          </span>
          <input
            value={restricciones}
            onChange={(e) => setRestricciones(e.target.value)}
            placeholder="TDAH; cervicales (no correr); ansiedad"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={generando || aplicando}
          />
          <span className="mt-1 block text-[11px] text-muted-foreground">
            Cosas que la IA debe respetar ABSOLUTAMENTE. Si no tienes, déjalo vacío.
          </span>
        </label>

        {/* === Migration 0025: rango opcional. Vacío = agente puro,
              la IA deduce del texto. Rellenado = se propaga a las metas
              hijas y se pasa a la IA como hint de plazo. === */}
        <details className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Rango de la meta (opcional — déjalo vacío si prefieres que la IA lo deduzca)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha de inicio
                <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
              </span>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={fechaInicioMeta}
                onChange={(e) => setFechaInicioMeta(e.target.value)}
                disabled={generando || aplicando}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha límite
                <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>
              </span>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={fechaObjetivo}
                onChange={(e) => setFechaObjetivo(e.target.value)}
                min={fechaInicioMeta || undefined}
                disabled={generando || aplicando}
              />
            </label>
            <label className="flex items-end pb-1">
              <span className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fechaFinBloqueada}
                  onChange={(e) => setFechaFinBloqueada(e.target.checked)}
                  disabled={!fechaObjetivo || generando || aplicando}
                  className="mt-0.5 h-4 w-4 rounded border-input disabled:opacity-50"
                />
                <span>
                  <span className="font-medium">🔒 Fecha crítica — no se mueve</span>
                  <span className="block text-[11px] text-muted-foreground">
                    La IA no podrá meter nada después.
                  </span>
                </span>
              </span>
            </label>
          </div>
          {fechaError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {fechaError}
            </p>
          )}
          {hayFechas && mesesLabel && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md bg-background px-2 py-0.5 font-mono text-muted-foreground">
                Rango detectado: {mesesLabel}
              </span>
              {rango.fin_abierto && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                  ⚠️ Sin deadline — la IA propondrá uno orientativo
                </span>
              )}
              {fechaFinBloqueada && fechaObjetivo && (
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-300">
                  🔒 HARD CONSTRAINT
                </span>
              )}
            </div>
          )}
        </details>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={generar}
            disabled={generando || aplicando || !contexto.trim() || !apiKeyOk || !!fechaError}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSparkles className="h-4 w-4" />
            {generando ? "Pensando…" : "Clasificar y proponer"}
          </button>
          <Link
            href="/metas/agente"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent"
            title="Atajo: saltar la clasificación y crear una meta directamente"
          >
            Atajo: solo meta →
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {diagnostico && (
        <div
          className={
            "rounded-xl border-2 p-5 text-sm " +
            (diagnostico.totalCreadas < diagnostico.totalEsperadas
              ? "border-red-500/50 bg-red-500/10"
              : "border-amber-500/40 bg-amber-500/10")
          }
        >
          <header>
            <div
              className={
                "text-[11px] font-semibold uppercase tracking-wider " +
                (diagnostico.totalCreadas < diagnostico.totalEsperadas
                  ? "text-red-700 dark:text-red-300"
                  : "text-amber-700 dark:text-amber-300")
              }
            >
              Diagnóstico de aplicación · árbitro adversarial
            </div>
            <h3 className="mt-1 text-base font-bold">
              {diagnostico.totalCreadas < diagnostico.totalEsperadas
                ? `❌ Faltan ${diagnostico.totalEsperadas - diagnostico.totalCreadas} de ${diagnostico.totalEsperadas} metas`
                : `⚠️ Se crearon ${diagnostico.totalCreadas} de ${diagnostico.totalEsperadas}, pero hay KRs sin asignar`}
            </h3>
          </header>
          <div className="mt-3 space-y-3">
            {/* GAP: metas esperadas que NO se crearon */}
            {diagnostico.titulosEsperados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Esperadas ({diagnostico.titulosEsperados.length}):
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                  {diagnostico.titulosEsperados.map((t, i) => {
                    const creada = diagnostico.titulosCreados.includes(t);
                    return (
                      <li
                        key={i}
                        className={
                          creada
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }
                      >
                        {creada ? "✅" : "❌"} {t}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {diagnostico.idsCreadas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  IDs guardados ({diagnostico.idsCreadas.length}):
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-900 dark:text-amber-200">
                  {diagnostico.idsCreadas.map((id, i) => (
                    <li key={i} className="font-mono text-[10px]">
                      {id}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diagnostico.metasFallaron.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  ❌ Motivo del fallo ({diagnostico.metasFallaron.length}):
                </p>
                <ul className="mt-1 space-y-1.5 text-xs">
                  {diagnostico.metasFallaron.map((f, i) => (
                    <li
                      key={i}
                      className="rounded border border-red-500/30 bg-red-500/5 p-2 font-mono text-[11px] leading-relaxed text-red-900 dark:text-red-200"
                    >
                      <div className="font-sans font-semibold">
                        {f.titulo}
                      </div>
                      <div className="mt-1 break-words">{f.error}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diagnostico.krsFallaron.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  ⚠️ KRs sin asignar ({diagnostico.krsFallaron.length}): las metas sí se crearon pero su KR inicial no (el periodo reportado por la IA no existe en BD):
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-orange-900 dark:text-orange-200">
                  {diagnostico.krsFallaron.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {diagnostico.planPorMeta && diagnostico.planPorMeta.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  📊 Plan completo generado ({diagnostico.planPorMeta.length} metas):
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {diagnostico.planPorMeta.map((p, i) => (
                    <li
                      key={i}
                      className={
                        p.error
                          ? "rounded border border-red-500/30 bg-red-500/5 p-2 font-mono text-[11px] text-red-900 dark:text-red-200"
                          : "rounded border border-violet-500/20 bg-violet-500/5 p-2"
                      }
                    >
                      <div className="font-sans font-medium">{p.titulo}</div>
                      {p.error ? (
                        <div className="mt-1 break-words">{p.error}</div>
                      ) : (
                        <div className="text-violet-900 dark:text-violet-200">
                          {p.krs} KR{p.krs === 1 ? "" : "s"} + {p.tareas}{" "}
                          tarea{p.tareas === 1 ? "" : "s"}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 rounded-md bg-amber-500/20 p-2 text-[11px] text-amber-900 dark:text-amber-200">
              💡 <strong>Para David:</strong> copia este diagnóstico y
              pégalo tal cual. Es la pista que necesito para arreglar el
              bug sin más idas y vueltas.
            </div>
          </div>
        </div>
      )}

      {resultado && (
        <ResultadoPreview
          resultado={resultado}
          areas={areas ?? []}
          trimestresPorNumero={trimestresPorNumero}
          busy={aplicando}
          onCancel={cancelar}
          onConfirm={aplicar}
          metasFueraDeRango={metasFueraDeRango}
          fechaInicioMeta={fechaInicioMeta}
          fechaObjetivo={fechaObjetivo}
          fechaFinBloqueada={fechaFinBloqueada && !!fechaObjetivo}
          progresoPlan={progresoPlan}
        />
      )}
    </div>
  );
}

// ============================================================================
// ResultadoPreview — muestra la propuesta de la IA y los botones aplicar/cancelar.
// ============================================================================

function ResultadoPreview({
  resultado,
  areas,
  trimestresPorNumero,
  busy,
  onCancel,
  onConfirm,
  metasFueraDeRango,
  fechaInicioMeta,
  fechaObjetivo,
  fechaFinBloqueada,
  progresoPlan,
}: {
  resultado: ResultadoClasificador;
  areas: Area[];
  trimestresPorNumero: Map<1 | 2 | 3 | 4, { id: string; nombre: string }>;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  metasFueraDeRango: Array<{ titulo: string; fecha: string }>;
  fechaInicioMeta: string;
  fechaObjetivo: string;
  fechaFinBloqueada: boolean;
  /** Mensaje de progreso de la fase 2 (plan completo por meta). Si
   *  está set, el panel muestra un spinner con ese texto en vez del
   *  botón estático "Aplicar". */
  progresoPlan?: string | null;
}) {
  const areaMatch = resultado.area_nombre
    ? areas.find(
        (a) => a.nombre.trim().toLowerCase() === resultado.area_nombre!.trim().toLowerCase(),
      ) ?? null
    : null;

  return (
    <section className="space-y-4 rounded-xl border border-violet-500/40 bg-violet-500/5 p-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider " +
              (resultado.clasificacion === "proyecto"
                ? "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                : resultado.clasificacion === "meta"
                  ? "bg-violet-500/20 text-violet-700 dark:text-violet-300"
                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300")
            }
          >
            {resultado.clasificacion === "captura" ? "📥 Captura" : resultado.clasificacion}
          </span>
          {resultado.area_nombre && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
              Área: <strong className="text-foreground">{resultado.area_nombre}</strong>
              {areaMatch ? (
                <IconCheck className="h-3 w-3 text-green-600" />
              ) : (
                <span className="text-[10px] text-amber-600">(nueva)</span>
              )}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {resultado.razon_clasificacion}
        </p>
      </header>

      {resultado.proyecto && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Proyecto propuesto
          </div>
          <div className="mt-1 text-base font-semibold">
            <span
              className="mr-2 inline-block h-3 w-3 rounded-sm align-middle"
              style={{ backgroundColor: resultado.proyecto.color }}
            />
            {resultado.proyecto.nombre}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {resultado.proyecto.descripcion}
          </p>
        </div>
      )}

      {resultado.metas.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {resultado.clasificacion === "proyecto" ? "Metas hijas" : "Meta"}
          </div>
          <ul className="mt-2 space-y-2">
            {resultado.metas.map((m, i) => (
              <MetaHijaCard
                key={i}
                meta={m}
                trimestreNombre={
                  m.kr_inicial
                    ? trimestresPorNumero.get(m.kr_inicial.trimestre)?.nombre ?? `Q${m.kr_inicial.trimestre}`
                    : null
                }
              />
            ))}
          </ul>
        </div>
      )}

      {resultado.clasificacion === "captura" && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          No he visto una intención accionable. Lo dejo en tu inbox para
          que lo trates cuando quieras. Si insistes en que es accionable,
          reformula el contexto.
        </p>
      )}

      {/* Migration 0025: warning si hay metas hijas cuya fecha_objetivo
          cae fuera del rango que David marcó. Es una red de seguridad
          por si el prompt del clasificador no logra encuadrar todo. */}
      {metasFueraDeRango.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">
            ⚠️ {metasFueraDeRango.length === 1 ? "1 meta hija" : `${metasFueraDeRango.length} metas hijas`} quedan fuera de tu rango:
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
            {metasFueraDeRango.map((m, i) => (
              <li key={i}>
                <span className="font-medium">{m.titulo}</span>
                <span className="ml-1 text-amber-700 dark:text-amber-300">
                  — objetivo: <span className="font-mono">{m.fecha}</span>
                </span>
              </li>
            ))}
          </ul>
          {fechaFinBloqueada ? (
            <p className="mt-2 text-[11px]">
              🔒 Tu fecha límite está marcada como dura. Si aplicas igualmente,
              esas metas se crearán con objetivos anteriores a tu inicio.
              Considera cancelar y reformular el contexto.
            </p>
          ) : (
            <p className="mt-2 text-[11px]">
              Tu rango era {fechaInicioMeta || "?"} → {fechaObjetivo || "?"}. Puedes
              aplicar igualmente si los objetivos de la IA te convencen, o
              cancelar para reformular.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {progresoPlan && (
          <div className="mr-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            {progresoPlan}
          </div>
        )}
        <button
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <IconX className="h-4 w-4" />
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={busy || resultado.metas.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconCheck className="h-4 w-4" />
          {busy ? "Aplicando…" : "Aplicar"}
        </button>
      </div>
    </section>
  );
}

function MetaHijaCard({
  meta,
  trimestreNombre,
}: {
  meta: MetaHijaGenerada;
  trimestreNombre: string | null;
}) {
  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-medium">{meta.meta_titulo}</div>
        {meta.fecha_objetivo && (
          <div className="font-mono text-[11px] text-muted-foreground">
            objetivo: {meta.fecha_objetivo}
          </div>
        )}
      </div>
      {meta.meta_descripcion && (
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.meta_descripcion}
        </p>
      )}
      {meta.contexto && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">
            Contexto:
          </span>{" "}
          {meta.contexto}
        </p>
      )}
      {meta.kr_inicial && (
        <div className="mt-2 rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-1.5 text-xs">
          <span className="font-semibold text-violet-700 dark:text-violet-300">
            {trimestreNombre ? `${trimestreNombre}: ` : ""}KR inicial
          </span>{" "}
          — {meta.kr_inicial.titulo}
          {meta.kr_inicial.metrica && (
            <span className="ml-1 text-muted-foreground">
              (
              {meta.kr_inicial.valor_objetivo ?? "?"}{" "}
              {meta.kr_inicial.unidad ?? meta.kr_inicial.metrica})
            </span>
          )}
        </div>
      )}
    </li>
  );
}
