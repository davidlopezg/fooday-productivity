"use client";

// ============================================================================
// PasoProyectos — paso 1 del ritual semanal (issue #88).
// ----------------------------------------------------------------------------
// POR QUÉ LOS PROYECTOS VAN PRIMERO
//   Un proyecto muerto arrastra sus metas: si el ritual empieza por las
//   metas, se elige una WIG de una meta que pronto no existe. La
//   estructura va antes que el foco.
//
// QUÉ ESCRIBE
//   · El estado del proyecto: vivo / en pausa / muerto (migration 0043).
//   · La SITUACIÓN: un evento de tipo 'situacion' en `proyecto_eventos`
//     (la misma capa de Escenarios que ya usa /escenarios).
//
// QUÉ NO HACE
//   No archiva nada por su cuenta y no inventa: el estado MEDIDO (avance,
//   bloqueadas) se muestra en read-only, tal cual está en /escenarios.
// ============================================================================

import Link from "next/link";
import type { DraftRitual } from "@/lib/ritual/draft";
import { estadoDeProyecto } from "@/lib/escenarios/hipotesis";
import type { Proyecto, Tarea } from "@/lib/types";

const ESTADOS: { valor: "vivo" | "pausado" | "muerto"; label: string }[] = [
  { valor: "vivo", label: "Vivo" },
  { valor: "pausado", label: "En pausa" },
  { valor: "muerto", label: "Muere" },
];

export function PasoProyectos({
  proyectos,
  tareasPorProyecto,
  hoy,
  draft,
  onChange,
  onRedactar,
  redactando,
}: {
  proyectos: Proyecto[];
  tareasPorProyecto: Map<string, Tarea[]>;
  hoy: string;
  draft: DraftRitual;
  onChange: (d: DraftRitual) => void;
  onRedactar: (proyectoId: string) => void;
  redactando: string | null;
}) {
  if (proyectos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        No hay proyectos activos. Si tienes metas sueltas, puedes seguir en el
        paso 2.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {proyectos.map((p) => {
        const tareas = tareasPorProyecto.get(p.id) ?? [];
        const medido = estadoDeProyecto(tareas, hoy);
        const d = draft.proyectos[p.id] ?? {};
        const estado = d.estado ?? p.estado ?? "vivo";

        return (
          <li key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.nombre}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Estado MEDIDO (no se escribe): {medido.avance}% ·{" "}
                  {medido.hechas}/{medido.total} hechas · {medido.bloqueadas}{" "}
                  bloqueadas
                  {medido.vencidas > 0 && ` · ${medido.vencidas} vencidas`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {ESTADOS.map((e) => (
                  <button
                    key={e.valor}
                    type="button"
                    aria-pressed={estado === e.valor}
                    onClick={() =>
                      onChange({
                        ...draft,
                        proyectos: {
                          ...draft.proyectos,
                          [p.id]: { ...d, estado: e.valor },
                        },
                      })
                    }
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${
                      estado === e.valor
                        ? e.valor === "vivo"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : e.valor === "pausado"
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
              Situación actual (qué pasa con este proyecto)
            </label>
            <textarea
              value={d.situacion ?? ""}
              onChange={(e) =>
                onChange({
                  ...draft,
                  proyectos: {
                    ...draft.proyectos,
                    [p.id]: { ...d, situacion: e.target.value },
                  },
                })
              }
              rows={2}
              placeholder="p. ej. esperando la respuesta del cliente; la parte técnica está hecha"
              className="mt-1 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRedactar(p.id)}
                disabled={redactando === p.id}
                className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 disabled:opacity-50 dark:text-violet-300"
              >
                {redactando === p.id ? "✍️ Redactando…" : "✍️ Redactar con IA"}
              </button>
              <span className="text-[11px] text-muted-foreground">
                (la IA propone; el texto es tuyo)
              </span>
              <span className="ml-auto flex flex-wrap gap-2 text-[11px]">
                <Link
                  href={`/escenarios`}
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Escenarios
                </Link>
                <Link
                  href={`/metas?proyecto=${p.id}`}
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Metas
                </Link>
                <Link
                  href={`/tareas?proyecto=${p.id}`}
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Tareas
                </Link>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
