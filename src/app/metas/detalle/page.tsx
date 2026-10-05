"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  archivarMeta,
  asignarTareaResultado,
  crearResultadoPeriodo,
  crearTarea,
  eliminarResultadoPeriodo,
  ensurePeriodosAnio,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  fetchMetaConPlan,
  fetchPeriodos,
  fetchTareasSinMeta,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import type {
  MetaConPlan,
  Periodo,
  ResultadoConTareas,
  Tarea,
  TareaSinMeta,
} from "@/lib/types";
import {
  IconArchive,
  IconArrowLeft,
  IconPencil,
  IconPlus,
  IconTarget,
  IconTrash,
} from "@/components/icons";
import { EditarMetaModal } from "@/components/EditarMetaModal";

const ESTADO_META: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const ESTADO_RESULTADO: Record<string, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  completado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  descartado: "bg-muted text-muted-foreground border-border",
};

function pct(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function MiniBar({ value }: { value: number }) {
  const p = Math.max(0, Math.min(1, value));
  const color = p < 0.3 ? "bg-red-500" : p < 0.7 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${p * 100}%` }} />
    </div>
  );
}

export default function MetaDetallePage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const planQ = useData<MetaConPlan | null>(
    async () => (id ? fetchMetaConPlan(id) : null),
    null,
    [id],
  );
  const periodosQ = useData<Periodo[]>(fetchPeriodos, [], []);
  const inboxQ = useData<TareaSinMeta[]>(fetchTareasSinMeta, [], []);
  const [anioActual] = useState(new Date().getFullYear());

  const plan = planQ.data;
  const periodos = periodosQ.data;
  const [editando, setEditando] = useState(false);

  // Trimestres del año actual que NO tienen aún un resultado en esta meta.
  // Se usan para el selector "+ Añadir resultado".
  // (useMemo antes de cualquier return temprano: regla de hooks.)
  const trimestresLibres = useMemo(() => {
    if (!plan || !periodos) return [];
    const usados = new Set(plan.resultados.map((r) => r.periodo_id));
    return periodos
      .filter((p) => p.tipo === "trimestre" && p.anio === anioActual && !usados.has(p.id))
      .sort((a, b) => a.numero - b.numero);
  }, [plan, periodos, anioActual]);

  if (!id) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-6 text-sm">
        Falta el parámetro <code>?id=</code>.{" "}
        <Link href="/metas" className="font-medium underline">
          Volver a metas
        </Link>
        .
      </div>
    );
  }

  if (planQ.error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-sm">
        Error al cargar: {planQ.error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/metas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Todas las metas
      </Link>

      {!plan ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {planQ.loading ? "Cargando…" : "Meta no encontrada."}
        </div>
      ) : (
        <>
          {/* Cabecera */}
          <header className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IconTarget className="h-3.5 w-3.5" />
                  {plan.meta.codigo ?? "—"}
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">
                  {plan.meta.titulo}
                </h1>
                {plan.meta.descripcion && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.meta.descripcion}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 font-medium ${
                      ESTADO_META[plan.meta.estado] ?? ESTADO_META.sin_empezar
                    }`}
                  >
                    {plan.meta.estado.replace("_", " ")}
                  </span>
                  {plan.meta.prioridad && (
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5">
                      prioridad: {plan.meta.prioridad}
                    </span>
                  )}
                  {plan.meta.plazo && (
                    <span className="rounded-full border border-border bg-muted px-2.5 py-0.5">
                      plazo: {plan.meta.plazo}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold tabular-nums">{pct(plan.progreso)}</div>
                <div className="text-xs text-muted-foreground">
                  {plan.tareas_hechas}/{plan.total_tareas} tareas hechas
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditando(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    <IconPencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`¿Archivar "${plan.meta.titulo}"?`)) return;
                      await archivarMeta(plan.meta.id);
                      await planQ.reload();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    <IconArchive className="h-3.5 w-3.5" /> Archivar
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <MiniBar value={plan.progreso} />
            </div>
          </header>

          {/* Trimestres / resultados / tareas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Trimestres y resultados
              </h2>
              <button
                onClick={async () => {
                  await ensurePeriodosAnio(anioActual);
                  await periodosQ.reload();
                }}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                title="Crea los 4 trimestres del año si no existen"
              >
                Asegurar {anioActual} Q1–Q4
              </button>
            </div>

            {plan.resultados.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Esta meta aún no tiene resultados por trimestre.{" "}
                {trimestresLibres.length > 0
                  ? "Usa el selector de abajo para añadir el primero."
                  : "Asegúrate de tener periodos creados y añade un resultado."}
              </div>
            ) : (
              <div className="space-y-4">
                {plan.resultados.map((r) => (
                  <ResultadoCard
                    key={r.id}
                    resultado={r}
                    inbox={inboxQ.data ?? []}
                    metaId={plan.meta.id}
                    onChanged={async () => {
                      await planQ.reload();
                      await inboxQ.reload();
                    }}
                  />
                ))}
              </div>
            )}

            {trimestresLibres.length > 0 && (
              <NuevoResultadoForm
                periodosLibres={trimestresLibres}
                metaId={plan.meta.id}
                onCreated={async () => {
                  await planQ.reload();
                  await periodosQ.reload();
                }}
              />
            )}
          </section>
        </>
      )}

      {plan && editando && (
        <EditarMetaModal
          meta={plan.meta}
          onClose={() => setEditando(false)}
          onChanged={() => planQ.reload()}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultadoCard: tarjeta por (trimestre, resultado) con sus tareas.
// ---------------------------------------------------------------------------
function ResultadoCard({
  resultado,
  inbox,
  metaId,
  onChanged,
}: {
  resultado: ResultadoConTareas;
  inbox: TareaSinMeta[];
  metaId: string;
  onChanged: () => Promise<void> | void;
}) {
  const [openAdd, setOpenAdd] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaPrioridad, setNuevaPrioridad] = useState("media");
  const [busy, setBusy] = useState(false);

  const hechas = resultado.tareas.filter((t) => t.estado === "hecha").length;
  const total = resultado.tareas.length;
  const prog = total === 0 ? 0 : hechas / total;

  async function crearTareaRapida() {
    if (!nuevoTitulo.trim()) return;
    setBusy(true);
    try {
      const { id } = await crearTarea({
        titulo: nuevoTitulo.trim(),
        prioridad: nuevaPrioridad,
      });
      await asignarTareaResultado(id, resultado.id);
      setNuevoTitulo("");
      setOpenAdd(false);
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
              {resultado.periodo.nombre}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                ESTADO_RESULTADO[resultado.estado] ?? ESTADO_RESULTADO.pendiente
              }`}
            >
              {resultado.estado.replace("_", " ")}
            </span>
            {resultado.metrica && (
              <span className="text-[11px]">
                · métrica: {resultado.metrica}
                {resultado.valor_objetivo != null &&
                  ` (objetivo ${resultado.valor_objetivo}${resultado.unidad ?? ""})`}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-semibold tracking-tight">{resultado.titulo}</h3>
          {resultado.descripcion && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {resultado.descripcion}
            </p>
          )}
        </div>
        <button
          onClick={async () => {
            if (!confirm(`¿Eliminar el resultado "${resultado.titulo}"? Las tareas se desvinculan (no se borran).`))
              return;
            await eliminarResultadoPeriodo(resultado.id);
            await onChanged();
          }}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-red-500"
          title="Eliminar resultado"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </header>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {hechas}/{total} tareas hechas
        </span>
        <span className="tabular-nums">{Math.round(prog * 100)}%</span>
      </div>
      <div className="mt-1">
        <MiniBar value={prog} />
      </div>

      {/* Lista de tareas */}
      {resultado.tareas.length > 0 && (
        <ul className="mt-3 divide-y divide-border/60">
          {resultado.tareas.map((t) => (
            <TareaRow
              key={t.id}
              tarea={t}
              onToggle={async () => {
                if (t.estado === "hecha") await reabrirTarea(t.id);
                else await marcarHecha(t.id);
                await onChanged();
              }}
            />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setOpenAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Nueva tarea
        </button>
        <button
          onClick={() => setOpenAssign((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Asignar existente
        </button>
      </div>

      {openAdd && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
          <input
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Título de la tarea"
            className="h-8 min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") crearTareaRapida();
            }}
          />
          <select
            value={nuevaPrioridad}
            onChange={(e) => setNuevaPrioridad(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {["critica", "alta", "media", "baja"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            onClick={crearTareaRapida}
            disabled={busy || !nuevoTitulo.trim()}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Crear
          </button>
        </div>
      )}

      {openAssign && (
        <AsignarExistente
          inbox={inbox}
          metaId={metaId}
          resultadoId={resultado.id}
          onAsignado={async () => {
            setOpenAssign(false);
            await onChanged();
          }}
        />
      )}
    </article>
  );
}

function TareaRow({
  tarea,
  onToggle,
}: {
  tarea: Tarea;
  onToggle: () => Promise<void> | void;
}) {
  const hecha = tarea.estado === "hecha";
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <button
        onClick={() => onToggle()}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border hover:border-primary"
        title={hecha ? "Reabrir" : "Marcar hecha"}
      >
        {hecha ? "✅" : ""}
      </button>
      <span className={`min-w-0 flex-1 ${hecha ? "text-muted-foreground line-through" : ""}`}>
        {tarea.titulo}
      </span>
      {tarea.prioridad && (
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
          {tarea.prioridad}
        </span>
      )}
    </li>
  );
}

function AsignarExistente({
  inbox,
  metaId,
  resultadoId,
  onAsignado,
}: {
  inbox: TareaSinMeta[];
  metaId: string;
  resultadoId: string;
  onAsignado: () => Promise<void> | void;
}) {
  // Filtra: solo tareas sin resultado_periodo (las que están en inbox).
  // Mantenemos las que tienen meta distinta a la actual para que el
  // usuario sepa que está REASIGNANDO.
  const candidatos = inbox;
  if (candidatos.length === 0) {
    return (
      <p className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
        No hay tareas en la bandeja. Crea una primero o asigna desde /tareas/inbox.
      </p>
    );
  }
  return (
    <div className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-2">
      <p className="mb-1 text-[11px] text-muted-foreground">
        Asignar tarea existente a este resultado
        {metaId && " (cambia también la meta si era otra)"}
      </p>
      <ul className="space-y-1">
        {candidatos.map(({ tarea, tiene_meta_sin_resultado }) => (
          <li
            key={tarea.id}
            className="flex items-center gap-2 rounded-md bg-background px-2 py-1 text-xs"
          >
            <span className="min-w-0 flex-1 truncate">{tarea.titulo}</span>
            <span className="text-[10px] text-muted-foreground">
              {tiene_meta_sin_resultado ? "meta sin trimestre" : "sin meta"}
            </span>
            <button
              onClick={async () => {
                await asignarTareaResultado(tarea.id, resultadoId);
                await onAsignado();
              }}
              className="rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
            >
              Asignar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NuevoResultadoForm({
  periodosLibres,
  metaId,
  onCreated,
}: {
  periodosLibres: Periodo[];
  metaId: string;
  onCreated: () => Promise<void> | void;
}) {
  const [periodoId, setPeriodoId] = useState(periodosLibres[0]?.id ?? "");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [metrica, setMetrica] = useState("");
  const [valorObjetivo, setValorObjetivo] = useState("");
  const [unidad, setUnidad] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear() {
    if (!titulo.trim() || !periodoId) {
      setError("Título y trimestre son obligatorios.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const valor = valorObjetivo.trim() === "" ? null : Number(valorObjetivo);
      if (valor !== null && Number.isNaN(valor)) {
        setError("El valor objetivo tiene que ser numérico.");
        return;
      }
      await crearResultadoPeriodo({
        meta_id: metaId,
        periodo_id: periodoId,
        titulo,
        descripcion: descripcion.trim() || null,
        metrica: metrica.trim() || null,
        valor_objetivo: valor,
        unidad: unidad.trim() || null,
      });
      setTitulo("");
      setDescripcion("");
      setMetrica("");
      setValorObjetivo("");
      setUnidad("");
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el resultado.");
    } finally {
      setBusy(false);
    }
  }

  if (periodosLibres.length === 0) return null;
  return (
    <section className="rounded-xl border border-dashed border-border bg-card/50 p-4">
      <h3 className="text-sm font-semibold">Añadir resultado esperado</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Solo los trimestres del {new Date().getFullYear()} sin resultado aún.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium">Trimestre *</span>
          <select
            value={periodoId}
            onChange={(e) => setPeriodoId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {periodosLibres.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.fecha_inicio} → {p.fecha_fin})
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium">Título *</span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="p.ej. 100 usuarios activos"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium">Descripción (resultado esperado)</span>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Métrica (opcional)</span>
          <input
            value={metrica}
            onChange={(e) => setMetrica(e.target.value)}
            placeholder="usuarios activos"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Valor objetivo</span>
          <div className="flex gap-1">
            <input
              value={valorObjetivo}
              onChange={(e) => setValorObjetivo(e.target.value)}
              inputMode="numeric"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
            <input
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              placeholder="ud"
              className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={crear}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <IconPlus className="h-3.5 w-3.5" />
        {busy ? "Creando…" : "Crear resultado"}
      </button>
    </section>
  );
}
