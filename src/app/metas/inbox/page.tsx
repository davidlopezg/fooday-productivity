"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  asignarTareaResultado,
  crearTarea,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  fetchMetasConProgreso,
  fetchTareasSinMeta,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import type {
  MetaConPlan,
  ResultadoConTareas,
  TareaSinMeta,
} from "@/lib/types";
import { IconArrowLeft, IconInbox, IconPlus } from "@/components/icons";

export default function InboxPage() {
  const inboxQ = useData<TareaSinMeta[]>(fetchTareasSinMeta, [], []);
  const metasQ = useData<MetaConPlan[]>(fetchMetasConProgreso, [], []);

  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearYCapturar() {
    if (!nuevoTitulo.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await crearTarea({ titulo: nuevoTitulo.trim(), prioridad: "media" });
      setNuevoTitulo("");
      await inboxQ.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la tarea.");
    } finally {
      setBusy(false);
    }
  }

  const sinNada = (inboxQ.data ?? []).filter((x) => !x.tiene_meta_sin_resultado);
  const conMetaSinResultado = (inboxQ.data ?? []).filter((x) => x.tiene_meta_sin_resultado);

  return (
    <div className="space-y-6">
      <Link
        href="/metas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Todas las metas
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <IconInbox className="h-5 w-5" />
          Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tareas sin asignar a ningún trimestre/resultado. Decide después si
          encajan en una meta o las dejas sueltas.
        </p>
      </header>

      {/* Captura rápida */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Captura rápida</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Se crea como tarea suelta (sin meta). Luego la asignas a un resultado
          o la dejas aquí.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Título de la nueva tarea"
            className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") crearYCapturar();
            }}
          />
          <button
            onClick={crearYCapturar}
            disabled={busy || !nuevoTitulo.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            Crear
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {/* Listado */}
      {inboxQ.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sin meta ({sinNada.length})
            </h2>
            {sinNada.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                No hay tareas sueltas sin meta.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border bg-card">
                {sinNada.map(({ tarea }) => (
                  <TareaInboxRow
                    key={tarea.id}
                    tarea={tarea}
                    metas={metasQ.data ?? []}
                    onChanged={async () => {
                      await inboxQ.reload();
                      await metasQ.reload();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Con meta, sin trimestre ({conMetaSinResultado.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tareas que ya están en una meta pero aún no repartidas por trimestre.
            </p>
            {conMetaSinResultado.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                Todas las tareas de tus metas tienen un trimestre asignado.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border bg-card">
                {conMetaSinResultado.map(({ tarea }) => (
                  <TareaInboxRow
                    key={tarea.id}
                    tarea={tarea}
                    metas={metasQ.data ?? []}
                    onChanged={async () => {
                      await inboxQ.reload();
                      await metasQ.reload();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TareaInboxRow({
  tarea,
  metas,
  onChanged,
}: {
  tarea: { id: string; titulo: string; estado: string; prioridad: string | null };
  metas: MetaConPlan[];
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const opciones: Array<{
    metaId: string;
    metaTitulo: string;
    resultado: ResultadoConTareas;
  }> = useMemo(() => {
    const out: Array<{
      metaId: string;
      metaTitulo: string;
      resultado: ResultadoConTareas;
    }> = [];
    for (const mp of metas) {
      if (mp.meta.estado === "archivada") continue;
      for (const r of mp.resultados) {
        out.push({
          metaId: mp.meta.id,
          metaTitulo: `${mp.meta.codigo ?? "—"} · ${mp.meta.titulo}`,
          resultado: r,
        });
      }
    }
    return out.sort((a, b) =>
      a.metaTitulo.localeCompare(b.metaTitulo) ||
      a.resultado.periodo.anio - b.resultado.periodo.anio ||
      a.resultado.periodo.numero - b.resultado.periodo.numero,
    );
  }, [metas]);

  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={async () => {
            if (tarea.estado === "hecha") await reabrirTarea(tarea.id);
            else await marcarHecha(tarea.id);
            await onChanged();
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border hover:border-primary"
          title={tarea.estado === "hecha" ? "Reabrir" : "Marcar hecha"}
        >
          {tarea.estado === "hecha" ? "✅" : ""}
        </button>
        <span
          className={`min-w-0 flex-1 ${
            tarea.estado === "hecha" ? "text-muted-foreground line-through" : ""
          }`}
        >
          {tarea.titulo}
        </span>
        {tarea.prioridad && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            {tarea.prioridad}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
        >
          {open ? "Cerrar" : "Asignar a…"}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-2">
          {opciones.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay resultados. Crea una meta y añade resultados por trimestre.
            </p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {opciones.map((o) => (
                <li key={o.resultado.id}>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await asignarTareaResultado(tarea.id, o.resultado.id);
                        await onChanged();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <span className="block font-medium">{o.resultado.titulo}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {o.metaTitulo} · {o.resultado.periodo.nombre}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
