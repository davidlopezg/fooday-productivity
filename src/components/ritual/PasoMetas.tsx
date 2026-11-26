"use client";

// ============================================================================
// PasoMetas — paso 2 del ritual semanal (issue #88).
// ----------------------------------------------------------------------------
// QUÉ ESCRIBE
//   · El estado de la meta: viva / en pausa / muere (migration 0043).
//   · La FASE (catálogo editable en /configuracion).
//   · La SITUACIÓN actual: el "Status Meta", que se guarda CON HISTORIAL
//     (`meta_situaciones`, migration 0043).
//
// EL SEMÁFORO NO SE ESCRIBE
//   Verde/ámbar/rojo se DERIVA del estado real (igual que en /escenarios):
//   una tabla de estado se pudre. Lo que se guarda es la situación, que es
//   la lectura interpretation de la persona.
//
// EL FILTRO
//   Solo entran las metas de proyectos VIVOS (o sin proyecto). Las metas de
//   un proyecto muerto se avisan, pero no compiten por una WIG.
// ============================================================================

import Link from "next/link";
import type { DraftRitual } from "@/lib/ritual/draft";
import type { EstadoMeta, Meta } from "@/lib/types";

const ESTADOS_META: { valor: EstadoMeta; label: string }[] = [
  { valor: "en_progreso", label: "Viva" },
  { valor: "pausada", label: "En pausa" },
  { valor: "archivada", label: "Muere" },
];

function semaforo(m: Meta, d: DraftRitual): { color: string; label: string } {
  const estado = d.metas[m.id]?.estado ?? m.estado;
  if (estado === "bloqueada") return { color: "text-red-500", label: "Bloqueada" };
  if (estado === "pausada") return { color: "text-amber-500", label: "En pausa" };
  if (estado === "archivada") return { color: "text-muted-foreground", label: "Muere" };
  if (estado === "en_progreso") return { color: "text-emerald-500", label: "Viva" };
  return { color: "text-muted-foreground", label: "Sin empezar" };
}

export function PasoMetas({
  metas,
  metasDeProyectosMuertos,
  fases,
  draft,
  onChange,
  onRedactar,
  redactando,
}: {
  metas: Meta[];
  metasDeProyectosMuertos: Meta[];
  fases: string[];
  draft: DraftRitual;
  onChange: (d: DraftRitual) => void;
  onRedactar: (metaId: string) => void;
  redactando: string | null;
}) {
  if (metas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No hay metas vivas que revisar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {metasDeProyectosMuertos.length > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {metasDeProyectosMuertos.length} meta(s) están en proyectos que has
          marcado como muertos: no compiten por una WIG. Revísalas en{" "}
          <Link href="/metas" className="underline underline-offset-4">
            /metas
          </Link>
          .
        </p>
      )}

      <ul className="space-y-3">
        {metas.map((m) => {
          const d = draft.metas[m.id] ?? {};
          const sem = semaforo(m, draft);

          return (
            <li key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    <span className={sem.color}>●</span> {m.codigo ? `${m.codigo} · ` : ""}
                    {m.titulo}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Semáforo DERIVADO: {sem.label} (no se guarda: se calcula)
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {ESTADOS_META.map((e) => (
                    <button
                      key={e.valor}
                      type="button"
                      aria-pressed={(d.estado ?? m.estado) === e.valor}
                      onClick={() =>
                        onChange({
                          ...draft,
                          metas: {
                            ...draft.metas,
                            [m.id]: { ...d, estado: e.valor },
                          },
                        })
                      }
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                        (d.estado ?? m.estado) === e.valor
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`fase-${m.id}`}
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    Fase
                  </label>
                  <select
                    id={`fase-${m.id}`}
                    value={d.fase ?? m.fase ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        metas: {
                          ...draft.metas,
                          [m.id]: { ...d, fase: e.target.value || null },
                        },
                      })
                    }
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— sin fase —</option>
                    {fases.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`bloqueo-${m.id}`}
                    className="text-[11px] font-medium text-muted-foreground"
                  >
                    ¿Bloqueada? (motivo)
                  </label>
                  <input
                    id={`bloqueo-${m.id}`}
                    value={d.bloqueo ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        metas: {
                          ...draft.metas,
                          [m.id]: { ...d, bloqueo: e.target.value },
                        },
                      })
                    }
                    placeholder="vacío = no bloqueada"
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                Situación actual (el “Status Meta”)
              </label>
              <textarea
                value={d.situacion ?? m.situacion_actual ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    metas: {
                      ...draft.metas,
                      [m.id]: { ...d, situacion: e.target.value },
                    },
                  })
                }
                rows={2}
                placeholder="Dónde estoy hoy con esta meta (se guarda con historial)"
                className="mt-1 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRedactar(m.id)}
                  disabled={redactando === m.id}
                  className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 disabled:opacity-50 dark:text-violet-300"
                >
                  {redactando === m.id ? "✍️ Redactando…" : "✍️ Redactar con IA"}
                </button>
                <Link
                  href={`/metas/detalle/${m.id}`}
                  className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Abrir meta
                </Link>
                <Link
                  href="/krs"
                  className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  KRs
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
