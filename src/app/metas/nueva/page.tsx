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
import { fetchAreas, fetchPeriodos } from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import { generarPlanMetaIA, type PlanMetaGenerado } from "@/lib/plan";
import { PlanMetaGeneradoPreview } from "@/components/PlanMetaGeneradoPreview";
import type { AmbitoMeta, Area, Periodo } from "@/lib/types";
import { IconSparkles, IconX } from "@/components/icons";

const ESTADOS = [
  "sin_empezar",
  "en_progreso",
  "bloqueada",
  "completada",
] as const;
const PRIORIDADES = ["critica", "alta", "media", "baja"] as const;

const AMBITOS: Array<{ id: AmbitoMeta; label: string }> = [
  { id: "personal", label: "👤 Personal" },
  { id: "profesional", label: "💼 Profesional" },
];

export default function NuevaMetaPage() {
  const router = useRouter();
  const cfg = useConfig();
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: periodos } = useData<Periodo[]>(fetchPeriodos, []);
  const anioActual = new Date().getFullYear();

  const trimestresDisponibles = (periodos ?? [])
    .filter((p) => p.tipo === "trimestre" && p.anio === anioActual)
    .sort((a, b) => a.numero - b.numero)
    .map((p) => ({ numero: p.numero as 1 | 2 | 3 | 4, nombre: p.nombre }));

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("sin_empezar");
  const [prioridad, setPrioridad] = useState<(typeof PRIORIDADES)[number]>("media");
  const [plazo, setPlazo] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [ambito, setAmbito] = useState<AmbitoMeta | "">("");
  const [tags, setTags] = useState("");
  const [autoTrimestres, setAutoTrimestres] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado IA
  const [planGenerado, setPlanGenerado] = useState<PlanMetaGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [errorAplicar, setErrorAplicar] = useState<string | null>(null);

  async function guardar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const meta = await crearMeta({
        titulo,
        descripcion: descripcion.trim() || null,
        estado,
        prioridad,
        area_id: areaId || null,
        plazo: plazo.trim() || null,
        ambito: ambito || null,
        tags: tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      });
      if (autoTrimestres) {
        // Mejor esfuerzo: si falla, no bloquea la creación de la meta.
        try {
          await ensurePeriodosAnio(new Date().getFullYear());
        } catch (e) {
          console.warn("[NuevaMeta] auto-generar trimestres falló:", e);
        }
      }
      router.push(`/metas/detalle?id=${meta.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la meta.");
    } finally {
      setGuardando(false);
    }
  }

  async function generarPlan() {
    if (!titulo.trim()) {
      setErrorIa("Escribe primero el título de la meta.");
      return;
    }
    if (!cfg.data.minimax_api_key) {
      setErrorIa("Configura la clave de IA en /configuracion antes de usar esta función.");
      return;
    }
    if (trimestresDisponibles.length === 0) {
      setErrorIa(
        "No hay trimestres creados para este año. Pulsa el checkbox 'Auto-generar 4 trimestres' abajo y vuelve a intentarlo.",
      );
      return;
    }
    setGenerando(true);
    setErrorIa(null);
    setPlanGenerado(null);
    try {
      const plan = await generarPlanMetaIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        {
          meta_titulo: titulo.trim(),
          meta_descripcion: descripcion.trim() || null,
          meta_ambito: (ambito || null) as "personal" | "profesional" | null,
          meta_plazo: plazo.trim() || null,
          trimestres_disponibles: trimestresDisponibles,
          anio: anioActual,
        },
      );
      setPlanGenerado(plan);
    } catch (e) {
      setErrorIa(
        e instanceof Error ? e.message : "La IA no pudo generar el plan.",
      );
    } finally {
      setGenerando(false);
    }
  }

  async function aplicarPlan() {
    if (!planGenerado) return;
    setAplicando(true);
    setErrorAplicar(null);
    try {
      // Asegurar periodos
      await ensurePeriodosAnio(anioActual);
      const periodosActuales = (periodos ?? []).filter(
        (p) => p.tipo === "trimestre" && p.anio === anioActual,
      );
      const periodosByNumero = new Map(periodosActuales.map((p) => [p.numero, p]));

      // Crear meta con los campos del formulario (no los del plan)
      const meta = await crearMeta({
        titulo,
        descripcion: descripcion.trim() || null,
        estado,
        prioridad,
        area_id: areaId || null,
        plazo: plazo.trim() || null,
        ambito: ambito || null,
        tags: tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      });

      for (const kr of planGenerado.krs) {
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
          if (t.recurrencia_tipo) {
            await setRecurrencia(creada.id, {
              tipo: t.recurrencia_tipo,
              dias_semana: t.recurrencia_tipo === "semanal" ? t.recurrencia_dias_semana : null,
              dia_mes: t.recurrencia_tipo === "mensual" ? t.recurrencia_dia_mes : null,
            }).catch((e) => console.warn("[NuevaMeta] set recurrencia falló:", e));
          }
        }
      }
      router.push(`/metas/detalle?id=${meta.id}`);
    } catch (e) {
      setErrorAplicar(
        e instanceof Error ? e.message : "No se pudo aplicar el plan.",
      );
      setAplicando(false);
    }
  }

  const field =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva meta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una meta. Opcionalmente genera los 4 trimestres del año actual.
          </p>
        </div>
        <Link
          href="/metas"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <IconX className="h-4 w-4" /> Cancelar
        </Link>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">Título *</span>
            <input
              className={field}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="p.ej. Migrar app a PWA con GitHub Pages"
              autoFocus
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">Descripción</span>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Estado</span>
            <select
              className={field}
              value={estado}
              onChange={(e) => setEstado(e.target.value as (typeof ESTADOS)[number])}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Prioridad</span>
            <select
              className={field}
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as (typeof PRIORIDADES)[number])}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Área</span>
            <select
              className={field}
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">— Sin área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Plazo (nota libre)</span>
            <input
              className={field}
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
              placeholder="p.ej. 2026-Q3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Ámbito</span>
            <select
              className={field}
              value={ambito}
              onChange={(e) => setAmbito(e.target.value as AmbitoMeta | "")}
            >
              <option value="">— Sin clasificar —</option>
              {AMBITOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">
              Tags{" "}
              <span className="font-normal text-muted-foreground">
                (separadas por coma, sin #)
              </span>
            </span>
            <input
              className={field}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="p.ej. salud, ansiedad, hábitos"
            />
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoTrimestres}
            onChange={(e) => setAutoTrimestres(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="font-medium">Auto-generar 4 trimestres del {new Date().getFullYear()}</span>
            <span className="block text-xs text-muted-foreground">
              Crea los periodos Q1–Q4 del año actual. Luego podrás añadir
              resultados esperados por trimestre.
            </span>
          </span>
        </label>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generarPlan}
            disabled={generando || aplicando || guardando || !titulo.trim() || !cfg.data.minimax_api_key}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              !cfg.data.minimax_api_key
                ? "Configura la clave de IA en /configuracion"
                : "Genera KRs y tareas automáticamente"
            }
          >
            <IconSparkles className="h-4 w-4" />
            {generando ? "Generando plan…" : "✨ Generar plan con IA"}
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Crear meta"}
          </button>
          <Link
            href="/metas"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </Link>
        </div>
        {errorIa && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errorIa}</p>
        )}
        {!cfg.data.minimax_api_key && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            💡 Para usar el botón IA, configura la clave en{" "}
            <Link href="/configuracion" className="font-mono text-foreground underline">
              /configuracion
            </Link>
            . Si no quieres IA, pulsa directamente “Crear meta”.
          </p>
        )}
      </section>

      {planGenerado && (
        <PlanMetaGeneradoPreview
          plan={planGenerado}
          metaTitulo={titulo}
          trimestrersDisponibles={trimestresDisponibles}
          busy={aplicando}
          error={errorAplicar}
          onCancel={() => {
            setPlanGenerado(null);
            setErrorAplicar(null);
          }}
          onConfirm={aplicarPlan}
        />
      )}
    </div>
  );
}
