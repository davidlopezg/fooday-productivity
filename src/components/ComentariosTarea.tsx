"use client";

// ============================================================================
// ComentariosTarea — sección de comentarios + @menciones dentro del modal
// de edición de tarea. Single-user, pero el cuerpo admite @palabra y se
// extraen los tags para filtrar después.
// ============================================================================

import { useState } from "react";
import {
  crearComentario,
  eliminarComentario,
} from "@/lib/mutations";
import { fetchComentariosTarea } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { TareaComentario } from "@/lib/types";
import { IconTrash } from "@/components/icons";

function formatRelativo(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dd = Math.round(h / 24);
  if (dd < 30) return `hace ${dd} d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Resalta los @tags dentro de un texto. */
function resaltarCuerpo(texto: string): React.ReactNode {
  const partes = texto.split(/(@[\p{L}\p{N}_-]+)/gu);
  return partes.map((p, i) =>
    /^@/.test(p) ? (
      <span
        key={i}
        className="rounded bg-blue-500/15 px-1 font-medium text-blue-600 dark:text-blue-400"
      >
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function ComentariosTarea({
  tareaId,
  onChanged,
}: {
  tareaId: string;
  onChanged?: () => void;
}) {
  const { data, reload } = useData<TareaComentario[]>(
    () => fetchComentariosTarea(tareaId),
    [],
    [tareaId],
  );
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTag, setFiltroTag] = useState<string | null>(null);

  // Lista plana de tags mencionados en TODOS los comentarios (para filtro)
  const todosTags = Array.from(
    new Set(data.flatMap((c) => c.tags)),
  ).sort();

  const visibles = filtroTag
    ? data.filter((c) => c.tags.includes(filtroTag))
    : data;

  async function enviar() {
    if (!cuerpo.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      await crearComentario({ tarea_id: tareaId, cuerpo });
      setCuerpo("");
      await reload();
      onChanged?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comentarios {data.length > 0 && `(${data.length})`}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Escribe <code className="rounded bg-background px-1">@palabra</code> para
            etiquetar (p.ej. <code>@maria</code>, <code>@urgente</code>).
          </p>
        </div>
      </div>

      {todosTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroTag(null)}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              filtroTag === null
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            todos
          </button>
          {todosTags.map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTag(t === filtroTag ? null : t)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                filtroTag === t
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-blue-600 hover:border-blue-500 dark:text-blue-400"
              }`}
            >
              @{t}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {visibles.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {data.length === 0 ? "Aún no hay comentarios." : "Sin comentarios con este filtro."}
          </p>
        ) : (
          visibles.map((c) => (
            <article
              key={c.id}
              className="rounded-md border border-border bg-background p-2.5"
            >
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatRelativo(c.created_at)}</span>
                <button
                  onClick={async () => {
                    if (!confirm("¿Eliminar comentario?")) return;
                    await eliminarComentario(c.id);
                    await reload();
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-500"
                  aria-label="Eliminar comentario"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {resaltarCuerpo(c.cuerpo)}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <textarea
          rows={2}
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          placeholder="Escribe un comentario… (usa @tag para etiquetar)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            onClick={enviar}
            disabled={enviando || !cuerpo.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Comentar"}
          </button>
        </div>
      </div>
    </section>
  );
}
