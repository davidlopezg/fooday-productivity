"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  crearMeta,
  ensurePeriodosAnio,
  ensurePeriodosMeses,
} from "@/lib/mutations";
import {
  fetchPeriodos,
} from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  aplicarKrsYTareasEnMeta,
  generarMetaYPlanIA,
  parsearMesesDeRango,
  type MetaYPlanGenerado,
  type UnidadDisponible,
} from "@/lib/plan";
import { PlanMetaGeneradoPreview } from "@/components/PlanMetaGeneradoPreview";
import {
  IconArrowLeft,
  IconSparkles,
  IconX,
} from "@/components/icons";
import type { Periodo } from "@/lib/types";

/** YYYY-MM-DD de hoy en hora local del navegador. */
function hoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function AgenteMetasPage() {
  const router = useRouter();
  const cfg = useConfig();
  const periodosQ = useData<Periodo[]>(fetchPeriodos, []);
  const periodos = periodosQ.data ?? [];
  const anioActual = new Date().getFullYear();
  const hoyStr = hoyYMD();

  const trimestresDisponibles = periodos
    .filter((p) => p.tipo === "trimestre" && p.anio === anioActual)
    .sort((a, b) => a.numero - b.numero)
    .map((p) => ({
      unidad: "trimestre" as const,
      numero: p.numero as 1 | 2 | 3 | 4,
      nombre: p.nombre,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
    }));

  const [contexto, setContexto] = useState("");
  const [restricciones, setRestricciones] = useState(
    "TDAH; cervicales (no correr, no impacto); ansiedad",
  );
  // Migration 0025: fechas reales opcionales. Vacías = la IA deduce (modo
  // agente puro). Rellenadas = la IA debe respetar el rango.
  const [fechaInicioMeta, setFechaInicioMeta] = useState<string>("");
  const [fechaObjetivo, setFechaObjetivo] = useState<string>("");
  const [fechaFinBloqueada, setFechaFinBloqueada] = useState<boolean>(false);
  const [sugerencia, setSugerencia] = useState<MetaYPlanGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);
  const [errorApp, setErrorApp] = useState<string | null>(null);

  // —— Derivados de fechas (solo si hay fechas rellenas; si no, vacío) ——
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

  const unidadesObjetivo: UnidadDisponible[] = useMemo(
    () =>
      rango.meses.map<UnidadDisponible>((m) => ({
        unidad: "mes",
        numero: m.numero,
        nombre: m.nombre,
        fecha_inicio: m.fecha_inicio,
        fecha_fin: m.fecha_fin,
      })),
    [rango],
  );

  // Error derivado (sin setState en useMemo).
  const fechaError =
    fechaInicioMeta && fechaObjetivo && fechaInicioMeta > fechaObjetivo
      ? "La fecha de inicio no puede ser posterior a la fecha límite."
      : null;

  const apiKeyOk = !!cfg.data.minimax_api_key;
  const hayFechas = !!fechaInicioMeta || !!fechaObjetivo;

  const field =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  async function generar() {
    if (!contexto.trim()) {
      setErrorGen("Escribe primero qué quieres conseguir.");
      return;
    }
    if (!apiKeyOk) {
      setErrorGen(
        "Necesitas configurar la clave de IA en /configuracion antes de usar el agente.",
      );
      return;
    }
    if (trimestresDisponibles.length === 0) {
      setErrorGen(
        "No hay trimestres creados para este año. Ve a /metas/plan y pulsa '+ Crear 4 trimestres' primero.",
      );
      return;
    }
    if (fechaError) {
      setErrorGen(fechaError);
      return;
    }
    setGenerando(true);
    setErrorGen(null);
    setSugerencia(null);
    try {
      const res = await generarMetaYPlanIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key!,
        cfg.data.model,
        {
          contexto: contexto.trim(),
          restricciones: restricciones
            .split(/[;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          // Compat: trimestres como fallback si no hay fechas.
          trimestres_disponibles: trimestresDisponibles,
          // Migration 0025: si hay fechas,优先 pasan meses sueltos.
          unidades_disponibles: hayFechas ? unidadesObjetivo : undefined,
          unidades_objetivo: hayFechas
            ? unidadesObjetivo.map((u) => ({
                unidad: u.unidad,
                numero: u.numero,
              }))
            : undefined,
          fecha_inicio_meta: fechaInicioMeta || null,
          fecha_objetivo: fechaObjetivo || null,
          fecha_fin_bloqueada: fechaFinBloqueada && !!fechaObjetivo,
          anio: anioActual,
        },
      );
      setSugerencia(res);
    } catch (e) {
      setErrorGen(e instanceof Error ? e.message : "La IA no pudo generar la sugerencia.");
    } finally {
      setGenerando(false);
    }
  }

  async function aplicar() {
    if (!sugerencia) return;
    setAplicando(true);
    setErrorApp(null);
    try {
      // 1. Asegurar periodos (trimestres del año + meses del plan si los trae).
      await ensurePeriodosAnio(anioActual);
      const mesesEnPlan = Array.from(
        new Set(
          sugerencia.plan.krs
            .filter((k) => k.unidad_tiempo === "mes" && typeof k.mes === "number")
            .map((k) => k.mes as number),
        ),
      );
      if (mesesEnPlan.length > 0) {
        try {
          await ensurePeriodosMeses(
            anioActual,
            Math.min(...mesesEnPlan),
            Math.max(...mesesEnPlan),
          );
        } catch (e) {
          console.warn("[Agente] ensurePeriodosMeses falló:", e);
        }
      }
      const periodosActualizados = periodos.filter((p) => p.anio === anioActual);
      const periodosByUnidad = new Map<
        string,
        { id: string; tipo: "trimestre" | "mes" }
      >();
      for (const p of periodosActualizados) {
        periodosByUnidad.set(`${p.tipo}:${p.numero}`, {
          id: p.id,
          tipo: p.tipo as "trimestre" | "mes",
        });
      }

      // 2. Crear meta (migration 0025: pasamos fechas si las rellenó).
      const meta = await crearMeta({
        titulo: sugerencia.meta_titulo,
        descripcion: sugerencia.meta_descripcion || null,
        ambito: sugerencia.meta_ambito,
        plazo: sugerencia.meta_plazo,
        estado: "sin_empezar",
        prioridad: "alta",
        fecha_inicio_meta: fechaInicioMeta || null,
        fecha_objetivo: fechaObjetivo || null,
        fecha_fin_bloqueada:
          !!fechaFinBloqueada && !!fechaObjetivo ? true : false,
      });

      // 3. Materializar el plan con el helper compartido (migration 0025).
      await aplicarKrsYTareasEnMeta(
        meta.id,
        sugerencia.plan,
        periodosByUnidad,
        cfg.data,
        { saltarExistentes: true },
      );

      router.push(`/metas/detalle?id=${meta.id}`);
    } catch (e) {
      setErrorApp(
        e instanceof Error
          ? e.message
          : "No se pudo aplicar el plan. Puedes intentarlo de nuevo.",
      );
      setAplicando(false);
    }
  }

  function cancelar() {
    setSugerencia(null);
    setErrorGen(null);
  }

  // Etiqueta humana del rango (para el chip).
  const mesesLabel = useMemo(() => {
    if (!hayFechas) return null;
    if (rango.meses.length === 0) return "sin rango";
    if (rango.meses.length === 1) return `1 mes (${rango.meses[0].nombre})`;
    const primero = rango.meses[0].nombre;
    const ultimo = rango.meses[rango.meses.length - 1].nombre;
    return `${rango.meses.length} meses · ${primero} → ${ultimo}`;
  }, [hayFechas, rango]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
              Agente de metas
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cuéntame qué quieres conseguir en tus propias palabras. Te propongo una meta
              bien definida, sus KRs (por meses o trimestres, según lo que indiques) y las
              tareas (incluyendo hábitos) para ejecutarla. Revisas, ajustas y aplicas.
            </p>
          </div>
        </div>
      </header>

      {!apiKeyOk && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Para usar el agente necesitas configurar la clave de IA en{" "}
          <Link href="/configuracion" className="font-medium underline">
            /configuracion
          </Link>
          .
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">¿Qué quieres conseguir?</span>
          <textarea
            rows={5}
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            placeholder="Ej: Quiero dormir mejor, levantarme con energía, no tener ansiedad nocturna. Tengo TDAH y dos hernias cervicales, así que nada de impacto. Mi objetivo es estar mucho mejor en 6 meses..."
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

        {/* === Migration 0025: rango opcional. Vacío = agente puro, la IA
              deduce del texto. Rellenado = la IA reparte los KRs dentro del
              rango como meses sueltos (no fuerza 4 trimestres). === */}
        <details className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Rango de la meta (opcional — déjalo vacío si prefieres que la IA lo deduzca)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha de inicio
                <span className="ml-1 font-normal text-muted-foreground">
                  (opcional)
                </span>
              </span>
              <input
                type="date"
                className={field}
                value={fechaInicioMeta}
                onChange={(e) => setFechaInicioMeta(e.target.value)}
                disabled={generando || aplicando}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha límite
                <span className="ml-1 font-normal text-muted-foreground">
                  (opcional)
                </span>
              </span>
              <input
                type="date"
                className={field}
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
                  <span className="font-medium">
                    🔒 Fecha crítica — no se mueve
                  </span>
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
            {generando ? "Pensando…" : "Generar sugerencia"}
          </button>
          <Link
            href="/metas"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconX className="h-4 w-4" />
            Cancelar
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-muted/20 p-5 text-sm">
        <h2 className="font-semibold">Cómo funciona</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>Escribes en lenguaje natural lo que quieres conseguir.</li>
          <li>
            (Opcional) Indicas el rango real con dos fechas + si la fecha
            límite es dura.
          </li>
          <li>La IA (modelo MiniMax-M3) analiza y propone una meta + KRs + tareas.</li>
          <li>Te muestra una previsualización. Puedes cancelar y reformular, o aplicar.</li>
          <li>Al aplicar, se crea la meta + KRs + tareas con un solo clic. Te lleva al detalle.</li>
        </ol>
        <p className="mt-3 text-[11px] text-muted-foreground">
          💡 Si ya tienes el título claro, también puedes usar{" "}
          <Link href="/metas/nueva" className="font-mono text-foreground underline">
            /metas/nueva
          </Link>{" "}
          con su botón IA. Y si lo que necesitas es decidir cuáles 3 metas deberían ser tus
          WIGs este trimestre, hay un botón en{" "}
          <Link href="/metas" className="font-mono text-foreground underline">
            /metas
          </Link>
          .
        </p>
      </section>

      {sugerencia && (
        <PlanMetaGeneradoPreview
          plan={sugerencia.plan}
          metaTitulo={sugerencia.meta_titulo}
          trimestrersDisponibles={trimestresDisponibles}
          unidadesDisponibles={unidadesObjetivo}
          busy={aplicando}
          error={errorApp}
          onCancel={cancelar}
          onConfirm={aplicar}
        />
      )}
      {errorGen && !sugerencia && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {errorGen}
        </div>
      )}
    </div>
  );
}
