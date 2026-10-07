"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  crearMeta,
  crearResultadoPeriodo,
  crearTareaConIA,
  ensurePeriodosAnio,
  setRecurrencia,
} from "@/lib/mutations";
import {
  fetchPeriodos,
} from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  generarMetaYPlanIA,
  type MetaYPlanGenerado,
} from "@/lib/plan";
import { PlanMetaGeneradoPreview } from "@/components/PlanMetaGeneradoPreview";
import {
  IconArrowLeft,
  IconSparkles,
  IconX,
} from "@/components/icons";
import type { Periodo } from "@/lib/types";

export default function AgenteMetasPage() {
  const router = useRouter();
  const cfg = useConfig();
  const periodosQ = useData<Periodo[]>(fetchPeriodos, []);
  const periodos = periodosQ.data ?? [];
  const anioActual = new Date().getFullYear();

  const trimestresDisponibles = periodos
    .filter((p) => p.tipo === "trimestre" && p.anio === anioActual)
    .sort((a, b) => a.numero - b.numero)
    .map((p) => ({ numero: p.numero as 1 | 2 | 3 | 4, nombre: p.nombre }));

  const [contexto, setContexto] = useState("");
  const [restricciones, setRestricciones] = useState(
    "TDAH; cervicales (no correr, no impacto); ansiedad",
  );
  const [sugerencia, setSugerencia] = useState<MetaYPlanGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);
  const [errorApp, setErrorApp] = useState<string | null>(null);

  const apiKeyOk = !!cfg.data.minimax_api_key;

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
    setGenerando(true);
    setErrorGen(null);
    setSugerencia(null);
    try {
      const res = await generarMetaYPlanIA(cfg.data.base_url, cfg.data.minimax_api_key!, cfg.data.model, {
        contexto: contexto.trim(),
        restricciones: restricciones
          .split(/[;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        trimestres_disponibles: trimestresDisponibles,
        anio: anioActual,
      });
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
      // 1. Asegurar periodos del año.
      await ensurePeriodosAnio(anioActual);
      const periodosActualizados = periodos.filter(
        (p) => p.tipo === "trimestre" && p.anio === anioActual,
      );
      const periodosByNumero = new Map(periodosActualizados.map((p) => [p.numero, p]));

      // 2. Crear meta.
      const meta = await crearMeta({
        titulo: sugerencia.meta_titulo,
        descripcion: sugerencia.meta_descripcion || null,
        ambito: sugerencia.meta_ambito,
        plazo: sugerencia.meta_plazo,
        estado: "sin_empezar",
        prioridad: "alta",
      });

      // 3. Crear KRs y tareas.
      for (const kr of sugerencia.plan.krs) {
        const periodo = periodosByNumero.get(kr.trimestre);
        if (!periodo) continue;
        const resultado = await crearResultadoPeriodo({
          meta_id: meta.id,
          periodo_id: periodo.id,
          titulo: kr.titulo,
          descripcion: kr.descripcion || null,
          metrica: kr.metrica || null,
          valor_objetivo: kr.valor_objetivo,
          unidad: kr.unidad || null,
          peso: kr.peso,
          estado: "pendiente",
        });

        for (const t of kr.tareas) {
          const creada = await crearTareaConIA(
            {
              titulo: t.titulo,
              descripcion: t.descripcion || null,
              prioridad: t.prioridad,
              estado: "pendiente",
              criterio_terminacion_manual: t.criterio_terminacion || null,
              meta_id: meta.id,
              resultado_periodo_id: resultado.id,
            },
            {
              base_url: cfg.data.base_url,
              minimax_api_key: cfg.data.minimax_api_key,
              model: cfg.data.model,
            },
          );

          // Set recurrencia si aplica.
          if (t.recurrencia_tipo) {
            await setRecurrencia(creada.id, {
              tipo: t.recurrencia_tipo,
              dias_semana: t.recurrencia_tipo === "semanal" ? t.recurrencia_dias_semana : null,
              dia_mes: t.recurrencia_tipo === "mensual" ? t.recurrencia_dia_mes : null,
            }).catch((e) => console.warn("[Agente] set recurrencia falló:", e));
          }
        }
      }

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
              bien definida, sus KRs por trimestre y las tareas (incluyendo hábitos) para
              ejecutarla. Revisas, ajustas y aplicas.
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

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={generar}
            disabled={generando || aplicando || !contexto.trim() || !apiKeyOk}
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