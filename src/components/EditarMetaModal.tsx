"use client";

// ============================================================================
// EditarMetaModal — edición rápida de una meta desde la tarjeta en /metas.
// Es el "atajo" para no tener que entrar a /metas/detalle cuando solo quieres
// cambiar título, descripción, ámbito, tags, estado, prioridad o plazo.
//
// Lo que NO edita este modal (por diseño):
//   · codigo: lo gestiona el ETL/seed; cambiarlo a mano es fuente de errores.
//   · es_wig / wig_orden: se gestiona con la diana 🎯 en la propia tarjeta.
//   · RICE: se calcula en otro flujo (motor de priorización).
//   · resultados_periodo / trimestres: eso vive en /metas/detalle.
//     PERO desde aquí también se puede invocar el botón IA para enriquecer
//     la meta con un plan nuevo sin recrearla (no la marca como completada).
//
// Si necesitas editar algo fuera del alcance de este modal, el pie del
// diálogo tiene un enlace a /metas/detalle.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { actualizarMeta, ensurePeriodosAnio } from "@/lib/mutations";
import { fetchAreas, fetchPeriodos, fetchProyectos } from "@/lib/queries";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  aplicarKrsYTareasEnMeta,
  generarPlanMetaIA,
  parsearTrimestresDePlazo,
  type PlanMetaGenerado,
} from "@/lib/plan";
import { PlanMetaGeneradoPreview } from "@/components/PlanMetaGeneradoPreview";
import type {
  AmbitoMeta,
  Area,
  Meta,
  Periodo,
  Prioridad,
  Proyecto,
} from "@/lib/types";
import { IconPencil, IconSparkles, IconX } from "@/components/icons";

const ESTADOS = [
  "sin_empezar",
  "en_progreso",
  "bloqueada",
  "completada",
  "archivada",
] as const;

const PRIORIDADES: Prioridad[] = ["critica", "alta", "media", "baja"];

const AMBITOS: Array<{ id: AmbitoMeta | ""; label: string }> = [
  { id: "", label: "— Sin clasificar —" },
  { id: "personal", label: "👤 Personal" },
  { id: "profesional", label: "💼 Profesional" },
];

export function EditarMetaModal({
  meta,
  onClose,
  onChanged,
}: {
  meta: Meta;
  onClose: () => void;
  onChanged: () => void;
}) {
  const cfg = useConfig();
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: periodos } = useData<Periodo[]>(fetchPeriodos, []);
  const { data: proyectos } = useData<Proyecto[]>(() => fetchProyectos(), []);
  const anioActual = new Date().getFullYear();

  const [titulo, setTitulo] = useState(meta.titulo);
  const [descripcion, setDescripcion] = useState(meta.descripcion ?? "");
  const [estado, setEstado] = useState<Meta["estado"]>(meta.estado);
  const [prioridad, setPrioridad] = useState<Prioridad | "">(
    meta.prioridad ?? "",
  );
  const [areaId, setAreaId] = useState<string>(meta.area_id ?? "");
  const [plazo, setPlazo] = useState(meta.plazo ?? "");
  const [ambito, setAmbito] = useState<AmbitoMeta | "">(meta.ambito ?? "");
  const [tagsInput, setTagsInput] = useState<string>((meta.tags ?? []).join(", "));
  // Migration 0024: proyecto + fecha objetivo + contexto + situación actual.
  const [proyectoId, setProyectoId] = useState<string>(meta.proyecto_id ?? "");
  const [fechaObjetivo, setFechaObjetivo] = useState<string>(meta.fecha_objetivo ?? "");
  const [contexto, setContexto] = useState<string>(meta.contexto ?? "");
  const [situacionActual, setSituacionActual] = useState<string>(meta.situacion_actual ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // === Estado IA: mismo flujo que /metas/nueva ===
  const [planGenerado, setPlanGenerado] = useState<PlanMetaGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorIa, setErrorIa] = useState<string | null>(null);
  const [errorAplicar, setErrorAplicar] = useState<string | null>(null);

  const trimestresDisponibles = useMemo(
    () =>
      (periodos ?? [])
        .filter((p) => p.tipo === "trimestre" && p.anio === anioActual)
        .sort((a, b) => a.numero - b.numero)
        .map((p) => ({ numero: p.numero as 1 | 2 | 3 | 4, nombre: p.nombre })),
    [periodos, anioActual],
  );

  async function generarPlan() {
    if (!cfg.data.minimax_api_key) {
      setErrorIa(
        "Configura la clave de IA en /configuracion antes de usar esta función.",
      );
      return;
    }
    if (trimestresDisponibles.length === 0) {
      setErrorIa(
        `No hay trimestres creados para ${anioActual}. Ve a /metas y marca el checkbox 'Auto-generar 4 trimestres' la próxima vez que crees una meta.`,
      );
      return;
    }
    setGenerando(true);
    setErrorIa(null);
    setPlanGenerado(null);
    try {
      // Trimestres objetivo derivados del campo libre "plazo".
      // Si el usuario no escribió nada, el parser devuelve los 4 trimestres.
      const trimestresObjetivo = parsearTrimestresDePlazo(plazo.trim());
      const plan = await generarPlanMetaIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        {
          meta_titulo: titulo.trim() || meta.titulo,
          meta_descripcion: descripcion.trim() || null,
          meta_ambito: (ambito || null) as "personal" | "profesional" | null,
          meta_plazo: plazo.trim() || null,
          trimestres_disponibles: trimestresDisponibles,
          trimestres_objetivo: trimestresObjetivo,
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

  async function aplicarPlanAmetoExistente() {
    if (!planGenerado) return;
    setAplicando(true);
    setErrorAplicar(null);
    try {
      // Nos aseguramos de que los periodos del año existan (idempotente).
      await ensurePeriodosAnio(anioActual);
      const periodosActuales = (periodos ?? []).filter(
        (p) => p.tipo === "trimestre" && p.anio === anioActual,
      );
      const periodosByNumero = new Map(
        periodosActuales.map((p) => [
          p.numero as 1 | 2 | 3 | 4,
          { id: p.id },
        ]),
      );

      // Aplica el plan a la meta YA EXISTENTE. NO modifica su estado:
      // por contrato del helper, solo crea KRs nuevos (los ya existentes
      // se saltan y se les añaden las tareas nuevas) y crea las tareas.
      await aplicarKrsYTareasEnMeta(
        meta.id,
        planGenerado,
        periodosByNumero,
        cfg.data,
        { saltarExistentes: true },
      );

      // Avisamos al padre (lista de metas) y cerramos el modal.
      onChanged();
      onClose();
    } catch (e) {
      setErrorAplicar(
        e instanceof Error ? e.message : "No se pudo aplicar el plan.",
      );
      setAplicando(false);
    }
  }

  function guardar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const tagsLimpios = tagsInput
          .split(",")
          .map((s) => s.trim().replace(/^#/, "").toLowerCase())
          .filter((s) => s.length > 0);
        await actualizarMeta(meta.id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          estado,
          prioridad: prioridad || null,
          area_id: areaId || null,
          plazo: plazo.trim() || null,
          ambito: ambito || null,
          tags: tagsLimpios,
          proyecto_id: proyectoId || null,
          fecha_objetivo: fechaObjetivo || null,
          contexto: contexto.trim() || null,
          situacion_actual: situacionActual.trim() || null,
        });
        onChanged();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  const field =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring";
  const fieldTextarea =
    "w-full rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="safe-b relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <IconPencil className="h-4 w-4" />
              Editar meta
            </h2>
            <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent" aria-label="Cerrar">
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {/* Código (solo lectura): el modal NO lo edita */}
            {meta.codigo && (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">Código:</span>{" "}
                <span className="font-mono">{meta.codigo}</span>
                <span className="ml-2">(gestionado por el ETL; no editable)</span>
              </div>
            )}

            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Título *</span>
              <input
                autoFocus
                className={field}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Descripción</span>
              <textarea
                rows={3}
                className={fieldTextarea}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                <select
                  className={field}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as Meta["estado"])}
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Prioridad</span>
                <select
                  className={field}
                  value={prioridad}
                  onChange={(e) =>
                    setPrioridad(e.target.value as Prioridad | "")
                  }
                >
                  <option value="">—</option>
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Área</span>
                <select
                  className={field}
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                >
                  <option value="">— Sin área —</option>
                  {(areas ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Plazo{" "}
                  <span className="font-normal">
                    (define en qué trimestres se generan KRs)
                  </span>
                </span>
                <input
                  className={field}
                  value={plazo}
                  onChange={(e) => setPlazo(e.target.value)}
                  placeholder="p.ej. Q3 2026, Q1-Q3, fin de 2026, trimestre 3…"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  Formatos: <code className="font-mono">Q3</code>,{" "}
                  <code className="font-mono">Q3 2026</code>,{" "}
                  <code className="font-mono">Q1-Q3</code>,{" "}
                  <code className="font-mono">fin de 2026</code>… Si lo dejas
                  vacío, se generan los 4 trimestres.
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Ámbito</span>
                <select
                  className={field}
                  value={ambito}
                  onChange={(e) => setAmbito(e.target.value as AmbitoMeta | "")}
                >
                  {AMBITOS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Tags (separadas por coma)
                </span>
                <input
                  className={field}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="salud, familia, app…"
                />
              </label>
            </div>

            {/* === Migration 0024: proyecto + fecha objetivo + contexto. === */}
            <details className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                Clasificación y contexto (ayuda al agente)
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Proyecto
                    <span className="ml-1 font-normal">(si pertenece a uno)</span>
                  </span>
                  <select
                    className={field}
                    value={proyectoId}
                    onChange={(e) => setProyectoId(e.target.value)}
                  >
                    <option value="">— Sin proyecto —</option>
                    {(proyectos ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Fecha objetivo
                    <span className="ml-1 font-normal">(sugerida por el agente)</span>
                  </span>
                  <input
                    type="date"
                    className={field}
                    value={fechaObjetivo}
                    onChange={(e) => setFechaObjetivo(e.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Contexto
                    <span className="ml-1 font-normal">
                      (lo que rodea esta meta; el agente lo lee para proponer KRs)
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    className={fieldTextarea}
                    value={contexto}
                    onChange={(e) => setContexto(e.target.value)}
                    placeholder="Ej: Lanzamiento v1 de Sol de Nit antes del verano. Equipo de 2, presupuesto limitado."
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Situación actual
                    <span className="ml-1 font-normal">
                      (dónde estoy hoy con esta meta)
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    className={fieldTextarea}
                    value={situacionActual}
                    onChange={(e) => setSituacionActual(e.target.value)}
                    placeholder="Ej: MVP técnico listo, falta onboarding y pasarela de pago."
                  />
                </label>
              </div>
            </details>

            {/* === Botón IA: enriquece la meta con un plan nuevo sin recrearla.
                El estado de la meta NO se modifica — explícitamente lo
                prometimos en la UI y en el helper. === */}
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <IconSparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      Plan con IA
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Genera KRs por trimestre + tareas para esta meta. Los
                    trimestres que ya tengan un KR se conservan: solo se
                    añaden las tareas nuevas a su KR existente. La meta{" "}
                    <strong className="text-foreground">no se marca como
                    completada</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generarPlan}
                  disabled={generando || aplicando}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                  title={
                    cfg.data.minimax_api_key
                      ? "Proponer KRs + tareas con IA"
                      : "Configura primero la clave en /configuracion"
                  }
                >
                  <IconSparkles className="h-3.5 w-3.5" />
                  {generando ? "Generando…" : "✨ Generar plan con IA"}
                </button>
              </div>
              {!cfg.data.minimax_api_key && (
                <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                  No hay API key configurada. Ve a{" "}
                  <Link
                    href="/configuracion"
                    className="underline"
                  >
                    Configuración
                  </Link>{" "}
                  para añadir una. Puedes guardar la meta manualmente.
                </p>
              )}
              {errorIa && (
                <p className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-600 dark:text-red-400">
                  {errorIa}
                </p>
              )}
            </div>

            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              💡 Para editar los resultados por trimestre o los key results,
              ve a{" "}
              <Link
                href={`/metas/detalle?id=${meta.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /metas/detalle
              </Link>
              .
            </p>
          </div>

          {error && (
            <p className="mx-5 mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          {errorAplicar && (
            <p className="mx-5 mb-2 text-xs text-red-600 dark:text-red-400">
              {errorAplicar}
            </p>
          )}

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={pending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {/* Preview del plan generado por la IA — mismo componente que en
          /metas/nueva. onConfirm enruta a aplicarPlanAmetoExistente para
          materializar el plan sobre la meta YA EXISTENTE. */}
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
          onConfirm={aplicarPlanAmetoExistente}
        />
      )}
    </>
  );
}