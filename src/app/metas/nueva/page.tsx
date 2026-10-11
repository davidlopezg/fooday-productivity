"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  crearMeta,
  ensurePeriodosAnio,
  ensurePeriodosMeses,
} from "@/lib/mutations";
import { fetchAreas, fetchPeriodos, fetchProyectos } from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  aplicarKrsYTareasEnMeta,
  generarPlanMetaIA,
  parsearMesesDeRango,
  parsearTrimestresDePlazo,
  type PlanMetaGenerado,
  type UnidadDisponible,
} from "@/lib/plan";
import { PlanMetaGeneradoPreview } from "@/components/PlanMetaGeneradoPreview";
import type { AmbitoMeta, Area, Periodo, Proyecto } from "@/lib/types";
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

/** YYYY-MM-DD de hoy en hora local del navegador. */
function hoyYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function NuevaMetaPage() {
  const router = useRouter();
  const cfg = useConfig();
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: periodos } = useData<Periodo[]>(fetchPeriodos, []);
  const { data: proyectos } = useData<Proyecto[]>(() => fetchProyectos(), []);
  const anioActual = new Date().getFullYear();
  const hoyStr = hoyYMD();

  const trimestresDisponibles = (periodos ?? [])
    .filter((p) => p.tipo === "trimestre" && p.anio === anioActual)
    .sort((a, b) => a.numero - b.numero)
    .map((p) => ({
      unidad: "trimestre" as const,
      numero: p.numero as 1 | 2 | 3 | 4,
      nombre: p.nombre,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
    }));

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("sin_empezar");
  const [prioridad, setPrioridad] = useState<(typeof PRIORIDADES)[number]>("media");
  const [areaId, setAreaId] = useState<string>("");
  const [ambito, setAmbito] = useState<AmbitoMeta | "">("");
  const [tags, setTags] = useState("");
  // Migration 0024: proyecto + contexto + situación actual.
  const [proyectoId, setProyectoId] = useState<string>("");
  const [contexto, setContexto] = useState("");
  const [situacionActual, setSituacionActual] = useState("");
  // Migration 0025: rango real de la meta (sustituye al campo libre `plazo`).
  // Defaults sensatos: hoy como inicio, sin fecha límite. La IA propondrá
  // si está vacía (orientativa, no dura) o la respetará si está bloqueada.
  const [fechaInicioMeta, setFechaInicioMeta] = useState<string>(hoyStr);
  const [fechaObjetivo, setFechaObjetivo] = useState<string>("");
  const [fechaFinBloqueada, setFechaFinBloqueada] = useState<boolean>(false);
  // Campo libre `plazo` se conserva por compat de UI (no se usa para
  // planificar: la fuente de verdad son las fechas reales). Lo ocultamos
  // por defecto y se mantiene en el form legacy si alguien lo necesita.
  const [plazo, setPlazo] = useState("");
  const [autoTrimestres, setAutoTrimestres] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado IA
  const [planGenerado, setPlanGenerado] = useState<PlanMetaGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [errorAplicar, setErrorAplicar] = useState<string | null>(null);

  // —— Derivados de fechas ——
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

  const unidadesObjetivo = useMemo<UnidadDisponible[]>(() => {
    return rango.meses.map<UnidadDisponible>((m) => ({
      unidad: "mes",
      numero: m.numero,
      nombre: m.nombre,
      fecha_inicio: m.fecha_inicio,
      fecha_fin: m.fecha_fin,
    }));
  }, [rango]);

  // Error de validación de fechas derivado en cada render (sin effect).
  const fechaError =
    fechaInicioMeta && fechaObjetivo && fechaInicioMeta > fechaObjetivo
      ? "La fecha de inicio no puede ser posterior a la fecha límite."
      : null;

  async function guardar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (fechaError) {
      setError(fechaError);
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
        proyecto_id: proyectoId || null,
        fecha_objetivo: fechaObjetivo || null,
        contexto: contexto.trim() || null,
        situacion_actual: situacionActual.trim() || null,
        fecha_inicio_meta: fechaInicioMeta || null,
        fecha_fin_bloqueada: fechaFinBloqueada,
      });
      if (autoTrimestres) {
        try {
          await ensurePeriodosAnio(anioActual);
        } catch (e) {
          console.warn("[NuevaMeta] auto-generar trimestres falló:", e);
        }
      }
      // Pre-creamos también los periodos mensuales del rango para que la
      // asignación KRs↔periodo no falle cuando David edite la meta sin
      // volver a pasar por la IA.
      if (rango.meses.length > 0) {
        try {
          await ensurePeriodosMeses(
            anioActual,
            rango.meses[0].numero,
            rango.meses[rango.meses.length - 1].numero,
          );
        } catch (e) {
          console.warn("[NuevaMeta] ensurePeriodosMeses falló:", e);
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
    if (unidadesObjetivo.length === 0) {
      setErrorIa(
        "No hay meses en el rango seleccionado. Revisa las fechas de inicio y fin.",
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
          meta_plazo:
            plazo.trim() ||
            (fechaObjetivo
              ? fechaObjetivo
              : `${rango.meses.length} mes(es) desde ${fechaInicioMeta || hoyStr}`),
          // Migration 0025: pasar fechas reales (la IA las usa como hard
          // constraint si `fecha_fin_bloqueada`).
          fecha_inicio_meta: fechaInicioMeta || null,
          fecha_objetivo: fechaObjetivo || null,
          fecha_fin_bloqueada: fechaFinBloqueada,
          unidades_disponibles: unidadesObjetivo,
          unidades_objetivo: unidadesObjetivo.map((u) => ({
            unidad: u.unidad,
            numero: u.numero,
          })),
          // Se mantiene por compat con callers viejos.
          trimestres_disponibles: trimestresDisponibles,
          trimestres_objetivo: parsearTrimestresDePlazo(plazo.trim()),
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
      // Asegurar periodos (trimestres del año + meses del rango).
      if (autoTrimestres) {
        try {
          await ensurePeriodosAnio(anioActual);
        } catch (e) {
          console.warn("[NuevaMeta] auto-generar trimestres falló:", e);
        }
      }
      // Refrescar periodos desde BD para tener los IDs recién creados.
      const periodosRefrescados = (periodos ?? []).filter(
        (p) => p.anio === anioActual,
      );
      const periodosByUnidad = new Map<string, { id: string; tipo: "trimestre" | "mes" }>();
      for (const p of periodosRefrescados) {
        periodosByUnidad.set(`${p.tipo}:${p.numero}`, {
          id: p.id,
          tipo: p.tipo as "trimestre" | "mes",
        });
      }

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
        proyecto_id: proyectoId || null,
        fecha_objetivo: fechaObjetivo || null,
        contexto: contexto.trim() || null,
        situacion_actual: situacionActual.trim() || null,
        fecha_inicio_meta: fechaInicioMeta || null,
        fecha_fin_bloqueada: fechaFinBloqueada,
      });

      // Materializar el plan (KRs + tareas) — helper compartido con
      // EditarMetaModal para que ambos flujos tengan el mismo invariante.
      await aplicarKrsYTareasEnMeta(
        meta.id,
        planGenerado,
        periodosByUnidad,
        cfg.data,
        { saltarExistentes: true },
      );

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

  // Helpers visuales
  const mesesLabel = useMemo(() => {
    if (rango.meses.length === 0) return "sin rango";
    if (rango.meses.length === 1) return `1 mes (${rango.meses[0].nombre})`;
    const primero = rango.meses[0].nombre;
    const ultimo = rango.meses[rango.meses.length - 1].nombre;
    return `${rango.meses.length} meses · ${primero} → ${ultimo}`;
  }, [rango]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva meta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una meta con un rango de fechas real. La IA distribuirá los
            KRs dentro del rango, no a 4 trimestres fijos.
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
        </div>

        {/* === Migration 0025: rango real de la meta === */}
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rango de la meta
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha de inicio
                <span className="ml-1 font-normal text-muted-foreground">
                  (cuándo puedes empezar)
                </span>
              </span>
              <input
                type="date"
                className={field}
                value={fechaInicioMeta}
                onChange={(e) => setFechaInicioMeta(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Fecha límite
                <span className="ml-1 font-normal text-muted-foreground">
                  (deadline; si la dejas vacía, la IA propone una)
                </span>
              </span>
              <input
                type="date"
                className={field}
                value={fechaObjetivo}
                onChange={(e) => setFechaObjetivo(e.target.value)}
                min={fechaInicioMeta || undefined}
              />
            </label>
            <label className="flex items-end pb-1">
              <span className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fechaFinBloqueada}
                  onChange={(e) => setFechaFinBloqueada(e.target.checked)}
                  disabled={!fechaObjetivo}
                  className="mt-0.5 h-4 w-4 rounded border-input disabled:opacity-50"
                />
                <span>
                  <span className="font-medium">
                    🔒 Fecha crítica — no se mueve
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    El planificador no podrá meter nada después de esta fecha.
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
        </div>

        <label className="block sm:col-span-2 mt-3">
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

        {/* === Migration 0024: proyecto + contexto. === */}
        <details className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Clasificación y contexto (ayuda al agente)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Proyecto
                <span className="ml-1 font-normal text-muted-foreground">
                  (si pertenece a uno)
                </span>
              </span>
              <select
                className={field}
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
              >
                <option value="">— Sin proyecto —</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium">
                Plazo libre (legacy)
                <span className="ml-1 font-normal text-muted-foreground">
                  (opcional — solo informativo)
                </span>
              </span>
              <input
                className={field}
                value={plazo}
                onChange={(e) => setPlazo(e.target.value)}
                placeholder="p.ej. Q3 2026 (legacy)"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium">
                Contexto
                <span className="ml-1 font-normal text-muted-foreground">
                  (lo que rodea esta meta)
                </span>
              </span>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="p.ej. Lanzamiento v1 antes del verano. Equipo de 2, presupuesto limitado."
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium">
                Situación actual
                <span className="ml-1 font-normal text-muted-foreground">
                  (dónde estoy hoy con esta meta)
                </span>
              </span>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={situacionActual}
                onChange={(e) => setSituacionActual(e.target.value)}
                placeholder="p.ej. MVP técnico listo, falta onboarding y pasarela de pago."
              />
            </label>
          </div>
        </details>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoTrimestres}
            onChange={(e) => setAutoTrimestres(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="font-medium">Auto-generar 4 trimestres del {anioActual}</span>
            <span className="block text-xs text-muted-foreground">
              Crea los periodos Q1–Q4 del año. Los meses del rango los crea
              la app al aplicar el plan.
            </span>
          </span>
        </label>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={generarPlan}
            disabled={
              generando ||
              aplicando ||
              guardando ||
              !titulo.trim() ||
              !cfg.data.minimax_api_key ||
              !!fechaError ||
              unidadesObjetivo.length === 0
            }
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
            disabled={guardando || !!fechaError}
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
          unidadesDisponibles={unidadesObjetivo}
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
