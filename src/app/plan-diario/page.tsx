"use client";

import { useEffect, useState } from "react";
import {
  fetchTareas,
  fetchHistorialEmocional,
} from "@/lib/queries";
import {
  upsertTareaPorTitulo,
  guardarPlanDiarioSimple,
  guardarNotasPlan,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import { generarPlanSimple } from "@/lib/planSimple";
import type { PlanDiario, PlanGeneradoSimple, Tarea } from "@/lib/types";

// ----------------------------------------------------------------------------
// Constantes UI
// ----------------------------------------------------------------------------

const HOY = () => new Date().toISOString().slice(0, 10);

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

const BLOQUE_HORARIO: Record<1 | 2 | 3 | 4, string> = {
  1: "11:00 – 12:00",
  2: "12:00 – 13:00",
  3: "15:00 – 16:00",
  4: "16:00 – 17:00",
};

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

type PlanLocal = PlanGeneradoSimple & {
  /** id de la fila en planes_diarios (post-guardado) */
  planId: string | null;
  fecha: string;
  fecha_larga: string;
  estadoEmocionalTexto: string;
  notas: string;
  guardadoAt: number;
};

// ----------------------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------------------

export default function PlanDiarioPage() {
  const config = useConfig();
  const tareasQ = useData<Tarea[]>(() => fetchTareas("pendiente"), []);
  const historialQ = useData<PlanDiario[]>(() => fetchHistorialEmocional(7), []);

  // ── Parte 1: input ──
  const [estadoTexto, setEstadoTexto] = useState("");
  const [tareaNueva, setTareaNueva] = useState("");
  const [tareasLibres, setTareasLibres] = useState<TareaLibre[]>([]);
  const [errorTarea, setErrorTarea] = useState<string | null>(null);

  // ── Estado de generación ──
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planLocal, setPlanLocal] = useState<PlanLocal | null>(null);

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

  async function anadirTareaLibre() {
    const titulo = tareaNueva.trim();
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

  async function generar() {
    if (!config.data.minimax_api_key) {
      setError("Configura primero tu API key en /configuracion.");
      return;
    }
    if (!estadoTexto.trim()) {
      setError('Escribe primero cómo te sientes hoy en "¿Cómo te sientes?"');
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const fecha = HOY();
      const tareasLibresConId = tareasLibres
        .filter((t) => t.id_bd)
        .map<Tarea>((t) => ({
          id: t.id_bd as string,
          titulo: t.titulo,
          estado: "pendiente",
          prioridad: "media",
          // el resto de campos no los necesitamos para el prompt
        } as Tarea));

      const plan = await generarPlanSimple(
        {
          baseUrl: config.data.base_url,
          apiKey: config.data.minimax_api_key,
          model: config.data.model,
        },
        {
          estadoTexto,
          fecha,
          tareas: tareasQ.data,
          tareasLibres: tareasLibresConId,
          historial: historialQ.data,
        },
      );

      const fecha_larga = fechaToLargaLocal(fecha);
      const planId = await guardarPlanDiarioSimple({
        fecha,
        fecha_larga,
        estadoEmocionalTexto: estadoTexto,
        plan,
      });

      setPlanLocal({
        ...plan,
        planId,
        fecha,
        fecha_larga,
        estadoEmocionalTexto: estadoTexto,
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

  function empezarDeNuevo() {
    setPlanLocal(null);
    setEstadoTexto("");
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

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan diario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ¿Cómo te sientes? + tareas + IA = plan ejecutable para hoy.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <a
            href="/plan-diario/historico"
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            📋 Histórico
          </a>
        </div>
      </header>

      {!config.data.minimax_api_key && !config.loading && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          Aún no has configurado tu API key.{" "}
          <a href="/configuracion" className="underline underline-offset-4">
            Ir a Configuración
          </a>
          .
        </div>
      )}

      {/* =========================================================================
          PARTE 1 — INPUT
      ========================================================================= */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold tracking-tight">
          Parte 1 — Captura
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Cuéntame cómo estás y, si quieres, añade tareas sueltas. La IA se
          encarga del resto.
        </p>

        {/* 1A — ¿Cómo te sientes? */}
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-medium">
            <span>¿Cómo te sientes?</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              Principal
            </span>
          </span>
          <textarea
            className={`${input} min-h-[100px]`}
            value={estadoTexto}
            onChange={(e) => setEstadoTexto(e.target.value)}
            placeholder='Ej: "Estoy cansado, con la cabeza nublada, pero con ganas de cerrar el bug del cliente antes de comer."'
          />
        </label>

        {/* 1B — Otras tareas */}
        <div className="mt-5">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-medium">
              <span>Otras tareas</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Opcional
              </span>
            </span>
            <p className="mb-2 text-xs text-muted-foreground">
              Una por línea. Si la tarea ya existe en tu base de datos, no se
              duplica: la IA la reutiliza tal cual.
            </p>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              className={input}
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
            <button
              type="button"
              onClick={anadirTareaLibre}
              disabled={!tareaNueva.trim()}
              className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Añadir
            </button>
          </div>

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

        {/* 1C — Botón Generar Plan */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={generar}
            disabled={generando || !config.data.minimax_api_key || !estadoTexto.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BoltIcon className="h-4 w-4" />
            {generando ? "Generando plan…" : "Generar plan"}
          </button>
          <span className="text-xs text-muted-foreground">
            {tareasQ.data.length} tareas pendientes en BD
            {tareasLibres.length > 0 && ` · ${tareasLibres.length} añadidas en esta sesión`}
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </section>

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
          {plan.estadoEmocionalTexto && (
            <p className="mt-1 text-xs italic text-muted-foreground">
              "{plan.estadoEmocionalTexto}"
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
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            ↻ Empezar de nuevo
          </button>
        </div>
      </header>

      {/* ============================================================
          SECCIÓN A — Resultado Psicológico
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader
          emoji="🧠"
          titulo="Resultado Psicológico"
          subtitulo="Lectura de tu estado + tendencia + recomendación + contexto del día."
        />

        <div className="space-y-4">
          <SubBloque titulo="Análisis del estado actual">
            <p className="text-sm leading-relaxed">{plan.analisis_emocional}</p>
          </SubBloque>

          <SubBloque titulo="Tendencia vs histórico">
            <p className="text-sm leading-relaxed">{plan.tendencia}</p>
          </SubBloque>

          <SubBloque titulo="Recomendación accionable">
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {plan.recomendacion_psicologica
                .split(/(?:;|\n|(?:^|\s)-\s)/)
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ul>
          </SubBloque>

          <SubBloque titulo="Contexto del día">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {plan.contexto_dia}
            </p>
          </SubBloque>
        </div>
      </section>

      {/* ============================================================
          SECCIÓN B — Timeblocking
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader
          emoji="⏱️"
          titulo="Timeblocking"
          subtitulo={`${plan.num_bloques_activos} de 4 bloques activos · cada bloque son 60 min estrictos.`}
        />

        {/* Grid 2x2 con línea horizontal divisoria (mediodía) */}
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
            {([1, 2, 3, 4] as const).map((n) => {
              const bloque = plan.bloques.find((b) => b.bloque_num === n);
              const activo = bloque !== undefined;

              return (
                <div
                  key={n}
                  className={`relative rounded-lg border p-4 ${
                    activo
                      ? "border-primary/30 bg-primary/5"
                      : "border-dashed border-border bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      {BLOQUE_LABELS[n]}
                    </span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                      {BLOQUE_HORARIO[n]}
                    </span>
                  </div>

                  {activo ? (
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            bloque.tipo === "profunda"
                              ? "border border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
                              : "border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          }`}
                        >
                          {bloque.tipo}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          60 min
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-snug">
                        {bloque.titulo_libre}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {bloque.tarea_id
                          ? "📌 vinculada a tarea en BD"
                          : "✨ tarea propuesta por la IA"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex h-[60px] items-center justify-center text-xs italic text-muted-foreground">
                      bloque desactivado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          La IA decide el número de bloques activos según tu estado. Los
          bloques 1-2 son de mañana (antes de comer); los bloques 3-4 de
          tarde.
        </p>
      </section>

      {/* ============================================================
          SECCIÓN C — Sugerencia de Comida
      ============================================================ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <SectionHeader
          emoji="🍽️"
          titulo="Sugerencia de comida"
          subtitulo="Una sola recomendación adaptada a tu estado y al día de hoy."
        />

        <div className="rounded-lg border border-border bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 p-5">
          <h3 className="text-lg font-bold tracking-tight">
            {plan.comida.titulo || "—"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed">
            {plan.comida.descripcion}
          </p>
          {plan.comida.motivo && (
            <p className="mt-3 border-t border-border/60 pt-3 text-xs italic text-muted-foreground">
              💡 {plan.comida.motivo}
            </p>
          )}
        </div>
      </section>

      {/* ============================================================
          Notas del día
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
              className="h-fit rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
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

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

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
