"use client";

// ============================================================================
// RevisionSemanal.tsx — Fase 7: el barrido semanal del Modo Recuperación.
// ----------------------------------------------------------------------------
// QUÉ ES
//   El panel que propone, tarea a tarea, qué hacer con el inventario que el
//   motor diario no seleccionó para hoy. Es LECTURA + PROPUESTA: no aplica
//   nada por su cuenta.
//
// LO QUE PROPONE
//   · Mantener   → sigue viva, ya estaba programada.
//   · Programar  → necesita un día concreto (por fecha, por pago, por meta).
//   · Aplazar    → sin objetivo ni fecha: no es trabajo todavía.
//   · Delegar    → no es tuya.   · Descartar → no es trabajo.
//
// NO BLOQUEA: los proyectos sin movimiento son una ADVERTENCIA, no un tope.
// ============================================================================

import { useState } from "react";
import type { ResultadoRevision, RevisionTarea } from "@/lib/recuperacion/revision";

const ETIQUETA_SUGERENCIA: Record<string, string> = {
  mantener: "✅ Mantener",
  programar: "📅 Programar",
  aplazar: "⏸ Aplazar",
  delegar: "👥 Delegar",
  descartar: "🗑 Descartar",
};

const TONO_SUGERENCIA: Record<string, string> = {
  mantener: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  programar: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  aplazar: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  delegar: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  descartar: "border-border bg-muted text-muted-foreground",
};

export function RevisionSemanal({
  revision,
  cargando = false,
  error = null,
  onRecargar,
}: {
  revision: ResultadoRevision | null;
  cargando?: boolean;
  error?: string | null;
  onRecargar?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  if (cargando) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Calculando el barrido semanal…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <p className="text-sm text-red-700 dark:text-red-300">
          No se pudo calcular el barrido: {error}
        </p>
      </section>
    );
  }

  if (!revision) return null;

  const total = revision.tareas.length;
  const porSugerencia = {
    programar: revision.tareas.filter((t) => t.sugerencia === "programar").length,
    aplazar: revision.tareas.filter((t) => t.sugerencia === "aplazar").length,
    mantener: revision.tareas.filter((t) => t.sugerencia === "mantener").length,
    delegar: revision.tareas.filter((t) => t.sugerencia === "delegar").length,
    descartar: revision.tareas.filter((t) => t.sugerencia === "descartar").length,
  };

  return (
    <section className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-5 sm:p-6">
      <header className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold tracking-tight">🗓️ Revisión semanal</h2>
          {onRecargar && (
            <button
              type="button"
              onClick={onRecargar}
              className="rounded-md border border-border bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              ↻ Recalcular
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{revision.resumen}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Nada se aplica por su cuenta: esto son propuestas. Tú decides.
        </p>
      </header>

      {/* Contadores por acción */}
      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
          📅 {porSugerencia.programar} para programar
        </span>
        <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300">
          ⏸ {porSugerencia.aplazar} sin objetivo
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
          ✅ {porSugerencia.mantener} ya programadas
        </span>
      </div>

      {/* Pagos que exigen decisión esta semana */}
      {(revision.pagos.vencidos > 0 || revision.pagos.proximos > 0) && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-sm font-medium">
            {revision.pagos.vencidos > 0
              ? `🚨 ${revision.pagos.vencidos} pago(s) vencido(s) · ${formatEuros(revision.pagos.totalVencido)}`
              : `⚠️ ${revision.pagos.proximos} pago(s) por vencer esta semana`}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {revision.pagos.detalle.map((d, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                · {d.texto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proyectos sin movimiento: advertencia, no bloqueo */}
      {revision.proyectos.length > 0 && (
        <div className="mb-3 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
          <p className="text-sm font-medium">
            📉 {revision.proyectos.length} proyecto(s) sin movimiento
          </p>
          <ul className="mt-1.5 space-y-1">
            {revision.proyectos.map((p) => (
              <li key={p.id} className="text-xs leading-relaxed text-muted-foreground">
                · <strong className="text-foreground">{p.titulo}</strong> — {p.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de tareas: desplegable cuando hay muchas */}
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No hay tareas que revisar.</p>
      ) : (
        <details open={total <= 8} onToggle={() => setAbierto(!abierto)}>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {total} tarea{total === 1 ? "" : "s"} revisadas
            {abierto ? "" : ` (${revision.tareas.filter((t) => t.sugerencia === "programar").length} para programar)`}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {revision.tareas.map((r) => (
              <FilaTarea key={r.tarea.id} r={r} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function FilaTarea({ r }: { r: RevisionTarea }) {
  const [accion, setAccion] = useState<string | null>(null);
  return (
    <li className="rounded-lg border border-border bg-background/70 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONO_SUGERENCIA[r.sugerencia]}`}
        >
          {ETIQUETA_SUGERENCIA[r.sugerencia]}
        </span>
        <span className="min-w-0 flex-1 text-sm">{r.tarea.titulo}</span>
        {r.diasSinAvance != null && (
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {r.diasSinAvance}d parada
          </span>
        )}
        <button
          type="button"
          onClick={() => setAccion(accion === r.tarea.id ? null : r.tarea.id)}
          className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          {accion === r.tarea.id ? "Cerrar" : "¿Por qué?"}
        </button>
      </div>
      {accion === r.tarea.id && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.motivo}</p>
      )}
    </li>
  );
}

function formatEuros(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}