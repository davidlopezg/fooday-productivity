"use client";

// ============================================================================
// DedupeModal — Detecta y ayuda a limpiar tareas duplicadas o casi.
//
// Decisiones (ponytail — mínimo que funcione):
//   · Heurística cliente (Levenshtein + Jaccard de shingles). Sin IA.
//     Set esperado: cientos. Set grande → se enchufa embedding luego.
//   · Acción segura: ARCHIVAR la perdedora (no borrar). Reversible.
//   · Si la perdedora tiene subtareas, advertimos ANTES de archivar (el
//     usuario puede querer fusionarlas primero). Sin fusión automática:
//     el borrado accidental de micro-pasos duele más que el clic extra.
//   · Si la tarea perdedora está hecha, no la tocamos (es histórica; el
//     usuario puede archivarla manualmente desde /tareas/completadas).
//   · Excluimos del siguiente pase las que el usuario ya archivó en esta
//     sesión (estado local), para que el botón "Buscar de nuevo" refleje
//     el progreso inmediato.
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import type { Tarea, TareaSubtarea } from "@/lib/types";
import { archivarTarea } from "@/lib/mutations";
import {
  encontrarDuplicadas,
  motivoLabel,
  type GrupoDuplicado,
} from "@/lib/dedupeTareas";
import { IconArchive, IconCheck, IconSparkles, IconX } from "@/components/icons";
import { errorMessage } from "@/lib/errors";

function DuplaBadge({
  motivo,
  similitud,
}: {
  motivo: "exacto" | "levenshtein" | "shingle-jaccard";
  similitud: number;
}) {
  const tone: Record<typeof motivo, string> = {
    exacto: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    levenshtein: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    "shingle-jaccard":
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tone[motivo]}`}
      title={`${motivoLabel(motivo)} · similitud ${(similitud * 100).toFixed(0)}%`}
    >
      {motivo === "exacto" ? "=" : motivo === "levenshtein" ? "~" : "≈"}{" "}
      {(similitud * 100).toFixed(0)}%
    </span>
  );
}

function TareaCard({
  tarea,
  elegida,
  onElegir,
  disabled,
  motivo,
  similitud,
}: {
  tarea: Tarea;
  elegida: boolean;
  onElegir: () => void;
  disabled?: boolean;
  motivo?: "exacto" | "levenshtein" | "shingle-jaccard";
  similitud?: number;
}) {
  const subsHechas = (tarea.subtareas ?? []).filter((s) => s.hecho).length;
  const subsTotal = (tarea.subtareas ?? []).length;
  return (
    <div
      className={`rounded-lg border bg-card p-3 transition-colors ${
        elegida ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-2">
        <input
          type="radio"
          name={`elegir-${tarea.id}`}
          checked={elegida}
          disabled={disabled}
          onChange={onElegir}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
          aria-label="Marcar como la que se queda"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 text-sm font-medium leading-snug">
              {tarea.titulo}
            </div>
            {motivo && similitud != null && (
              <DuplaBadge motivo={motivo} similitud={similitud} />
            )}
          </div>
          {tarea.descripcion && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {tarea.descripcion}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {tarea.estado && (
              <span className="rounded border border-border bg-background px-1.5 py-0.5">
                {tarea.estado.replace("_", " ")}
              </span>
            )}
            {tarea.prioridad && (
              <span className="rounded border border-border bg-background px-1.5 py-0.5">
                {tarea.prioridad}
              </span>
            )}
            {tarea.deadline && (
              <span className="rounded border border-border bg-background px-1.5 py-0.5">
                📅 {tarea.deadline}
              </span>
            )}
            {subsTotal > 0 && (
              <span className="rounded border border-border bg-background px-1.5 py-0.5">
                ✂️ {subsHechas}/{subsTotal} sub
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DedupeModal({
  tareas,
  onClose,
  onChanged,
}: {
  tareas: Tarea[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [excluirIds, setExcluirIds] = useState<Set<string>>(new Set());
  const [archivadasEnSesion, setArchivadasEnSesion] = useState<string[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescoTick, setRefrescoTick] = useState(0); // fuerza recálculo
  const [, startTransition] = useTransition();

  const grupos: GrupoDuplicado<Tarea>[] = useMemo(() => {
    // Excluimos también las que acabamos de archivar en esta sesión.
    const set = new Set([...excluirIds, ...archivadasEnSesion]);
    return encontrarDuplicadas(tareas, { excluirIds: set });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareas, excluirIds, archivadasEnSesion, refrescoTick]);

  async function archivar(tarea: Tarea) {
    if (tarea.estado === "archivada") {
      // Ya estaba: solo la ocultamos del siguiente pase.
      setArchivadasEnSesion((prev) => [...prev, tarea.id]);
      return;
    }
    if (tarea.estado === "hecha") {
      // Política: no tocamos hechas. Lo advertimos y dejamos la decisión
      // manual al usuario. (Razón: si era un duplicado y se cerró, archivar
      // una ya-hecha sin querer es fácil; forzar un paso manual lo evita.)
      const ok = confirm(
        `"${tarea.titulo}" está HECHA. Archivar una tarea hecha puede ser destructivo. ¿Continuar?`,
      );
      if (!ok) return;
    }
    const subs = tarea.subtareas ?? [];
    if (subs.length > 0) {
      const subsHechas = subs.filter((s: TareaSubtarea) => s.hecho).length;
      const msg =
        subsHechas > 0
          ? `Esta tarea tiene ${subsHechas} subtarea(s) HECHA(s) que se archivarán con ella. ¿Archivar de todas formas?`
          : `Esta tarea tiene ${subs.length} subtarea(s). Al archivar, también se archivarán. ¿Continuar?`;
      if (!confirm(msg)) return;
    }
    setError(null);
    setPendingId(tarea.id);
    startTransition(async () => {
      try {
        await archivarTarea(tarea.id);
        setArchivadasEnSesion((prev) => [...prev, tarea.id]);
        onChanged();
      } catch (e) {
        setError(
          `No se pudo archivar "${tarea.titulo}": ${errorMessage(e)}`,
        );
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar tareas duplicadas"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="safe-b relative flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-2xl border border-border bg-card shadow-lg sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-2 font-semibold">
              <IconSparkles className="h-4 w-4 text-violet-500" />
              Buscar tareas duplicadas
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Heurística: Levenshtein ≤ 3 o Jaccard(shingles 3) ≥ 80% sobre el
              título normalizado (sin acentos, minúsculas, sin signos).
              Solo candidatas activas (no hechas ni ya archivadas).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent"
            aria-label="Cerrar"
          >
            <IconX className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {grupos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
              <IconCheck className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 font-medium text-emerald-700 dark:text-emerald-300">
                No se han encontrado duplicadas
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Si crees que falta algo, suele ser un caso borderline. Estos
                candidatos ya están filtrados por similitud alta.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {grupos.length} grupo{grupos.length === 1 ? "" : "s"} ·{" "}
                {grupos.reduce((s, g) => s + g.tareas.length, 0)} tareas
                implicadas. La acción{" "}
                <strong className="text-foreground">archivar</strong> es
                reversible (se puede desarchivar desde{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                  /tareas
                </code>
                ).
              </p>
              {grupos.map((g, gIdx) => {
                const mejor = g.pares[0]; // ya viene ordenado por similitud desc
                const subtareasTotales = g.tareas.reduce(
                  (s, t) => s + (t.subtareas?.length ?? 0),
                  0,
                );
                return (
                  <section
                    key={g.id}
                    className="rounded-xl border border-border bg-background/40 p-4"
                    aria-label={`Grupo ${gIdx + 1}`}
                  >
                    <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                          {gIdx + 1}
                        </span>
                        <h3 className="text-sm font-semibold">
                          {g.tareas.length} tareas candidatas
                        </h3>
                        <DuplaBadge
                          motivo={mejor.motivo}
                          similitud={mejor.similitud}
                        />
                        {subtareasTotales > 0 && (
                          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                            ⚠️ {subtareasTotales} subtarea(s) en juego
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // "Ignorar todas" = marcar como excluidas y dejar vivas
                          setExcluirIds((prev) => {
                            const next = new Set(prev);
                            for (const t of g.tareas) next.add(t.id);
                            return next;
                          });
                        }}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-accent"
                        title="Sacar este grupo de la lista (no las modifica)"
                      >
                        Mantener todas
                      </button>
                    </header>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {g.tareas.map((t) => (
                        <TareaCard
                          key={t.id}
                          tarea={t}
                          elegida={false}
                          onElegir={() => {
                            // No implementado explícitamente (lo gestiona el
                            // botón archivar). Se deja el radio para que se
                            // pueda "marcar mentalmente" cuál se queda.
                            void t;
                          }}
                          motivo={mejor.motivo}
                          similitud={mejor.similitud}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                      <p className="mr-auto text-[11px] text-muted-foreground">
                        Archiva las que NO te quedas (resto = se queda la
                        primera).
                      </p>
                      {g.tareas.slice(0, -1).map((t) => (
                        <button
                          key={`arch-${t.id}`}
                          onClick={() => archivar(t)}
                          disabled={pendingId === t.id || t.estado === "archivada"}
                          className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-background px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-500/10 disabled:opacity-50 dark:text-amber-300"
                          title="Archivar (reversible desde /tareas)"
                        >
                          <IconArchive className="h-3 w-3" />
                          {t.estado === "archivada"
                            ? "ya archivada"
                            : pendingId === t.id
                              ? "Archivando…"
                              : "Archivar"}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}

              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  💡 <strong>Tip:</strong> si quieres fusionar las subtareas
                  o comentarios antes de archivar, abre la perdedora con el
                  lápiz y muévelos a mano. La detección funciona en tiempo
                  real: cuando archives una, este diálogo se recalcula y el
                  siguiente grupo "asciende".
                </p>
              </div>
            </>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 py-4">
          <button
            onClick={() => setRefrescoTick((n) => n + 1)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
            disabled={pendingId !== null}
          >
            🔄 Recalcular
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Listo
          </button>
        </footer>
      </div>
    </div>
  );
}
