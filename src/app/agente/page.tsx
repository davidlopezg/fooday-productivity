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

      // 4) Crear cada meta hija + su KR inicial.
      // Migration 0025: si David rellenó fechas en el formulario, las
      // heredamos a cada meta hija (las sugeri das por la IA lo
      // complementan via `fecha_objetivo` por meta — prevalece la del
      // formulario solo si la IA no propone otra).
      const usarFechasDavid = !!fechaInicioMeta || !!fechaObjetivo;
      const idsCreadas: string[] = [];
      for (const m of resultado.metas) {
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
        idsCreadas.push(meta.id);

        if (m.kr_inicial) {
          const periodo = trimestresPorNumero.get(m.kr_inicial.trimestre);
          if (periodo) {
            try {
              await crearResultadoPeriodo({
                meta_id: meta.id,
                periodo_id: periodo.id,
                titulo: m.kr_inicial.titulo,
                descripcion: null,
                metrica: m.kr_inicial.metrica,
                valor_objetivo: m.kr_inicial.valor_objetivo,
                unidad: m.kr_inicial.unidad,
                peso: 1,
                estado: "pendiente",
              });
            } catch (e) {
              console.warn("[Agente] crear KR inicial falló:", e);
            }
          }
        }
      }

      // 5) Redirigir al detalle de la primera meta creada (o al proyecto
      //    si era proyecto). Para proyecto, vamos a /metas y filtramos;
      //    más simple: ir a /metas/detalle de la primera meta — el
      //    humano verá el resto en la lista.
      const primera = idsCreadas[0];
      if (primera) {
        router.push(`/metas/detalle?id=${primera}`);
      } else {
        router.push("/metas");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo aplicar la sugerencia. Puedes intentarlo de nuevo.",
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
