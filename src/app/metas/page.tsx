"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchMetasConProgreso } from "@/lib/queries";
import { marcarWig } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import type { AmbitoMeta, MetaConPlan } from "@/lib/types";
import {
  IconColumns,
  IconInbox,
  IconPlus,
  IconTarget,
} from "@/components/icons";

const ESTADO: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const ESTADO_DOT: Record<string, string> = {
  sin_empezar: "bg-slate-400",
  en_progreso: "bg-amber-500",
  bloqueada: "bg-red-500",
  completada: "bg-emerald-500",
  archivada: "bg-slate-300",
};

const AMBITO_BADGE: Record<AmbitoMeta, string> = {
  personal:
    "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
  profesional:
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
};

const AMBITO_LABEL: Record<AmbitoMeta, string> = {
  personal: "👤 Personal",
  profesional: "💼 Profesional",
};

type Filtro = "todas" | AmbitoMeta;

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  const pctTxt = Math.round(pct * 100);
  const color =
    pct < 0.3 ? "bg-red-500" : pct < 0.7 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progreso</span>
        <span className="font-medium tabular-nums">{pctTxt}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pctTxt}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel WIG — las 1-3 metas enormemente importantes (4DX)
// ---------------------------------------------------------------------------
function PanelWig({
  wigs,
  onQuitar,
  guardandoId,
}: {
  wigs: MetaConPlan[];
  onQuitar: (id: string) => void;
  guardandoId: string | null;
}) {
  return (
    <section className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <IconTarget className="h-5 w-5 text-violet-500" />
            Enormemente Importantes (WIG)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Máximo 3 metas a la vez. La simplicidad en el número de objetivos
            concentra la energía con la intensidad suficiente para generar
            resultados reales.
          </p>
        </div>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold tabular-nums text-violet-700 dark:text-violet-300">
          {wigs.length} / 3
        </span>
      </header>

      {wigs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-violet-500/30 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            Todavía no has marcado ningún WIG. Pulsa la{" "}
            <span className="font-medium text-foreground">diana 🎯</span> en
            una meta de abajo para ascenderla a Enormemente Importante.
          </p>
          <p className="mt-2 text-xs">
            Empieza por 1. Cuando la sostengas, añade la segunda. No pases de 3
            aunque te sientas capaz — el punto es la concentración, no la
            ambición.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {wigs.map((w) => (
            <li
              key={w.meta.id}
              className="flex items-center gap-3 rounded-lg border border-violet-500/30 bg-background/80 px-3 py-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-700 dark:text-violet-300">
                {w.meta.wig_orden ?? "?"}
              </span>
              <Link
                href={`/metas/detalle?id=${w.meta.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {w.meta.titulo}
              </Link>
              {w.total_tareas > 0 && (
                <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
                  {w.tareas_hechas}/{w.total_tareas}
                </span>
              )}
              <button
                type="button"
                onClick={() => onQuitar(w.meta.id)}
                disabled={guardandoId === w.meta.id}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="Quitar de WIG"
              >
                {guardandoId === w.meta.id ? "…" : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function MetasPage() {
  const { data: metas, loading, reload } = useData<MetaConPlan[]>(
    fetchMetasConProgreso,
    [],
  );

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [tagsSel, setTagsSel] = useState<Set<string>>(new Set());
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errorWig, setErrorWig] = useState<string | null>(null);

  const wigs = useMemo(
    () =>
      metas
        .filter((m) => m.meta.es_wig)
        .sort((a, b) => (a.meta.wig_orden ?? 9) - (b.meta.wig_orden ?? 9)),
    [metas],
  );

  /** Todos los tags únicos de las metas del usuario, ordenados alfabéticamente. */
  const todosLosTags = useMemo(() => {
    const s = new Set<string>();
    for (const m of metas) {
      for (const t of m.meta.tags ?? []) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es"));
  }, [metas]);

  const filtradas = useMemo(() => {
    let res = metas;
    if (filtro !== "todas") res = res.filter((m) => m.meta.ambito === filtro);
    if (tagsSel.size > 0) {
      res = res.filter((m) =>
        (m.meta.tags ?? []).some((t) => tagsSel.has(t)),
      );
    }
    return res;
  }, [metas, filtro, tagsSel]);

  function toggleTag(t: string) {
    setTagsSel((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function toggleWig(mp: MetaConPlan) {
    setErrorWig(null);
    setGuardandoId(mp.meta.id);
    try {
      const ok = await marcarWig(mp.meta.id, !mp.meta.es_wig);
      if (!ok) {
        setErrorWig(
          "Ya tienes 3 WIG activos. Quita uno antes de añadir otro.",
        );
      } else {
        await reload();
      }
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoId(null);
    }
  }

  const conteoPersonal = metas.filter((m) => m.meta.ambito === "personal").length;
  const conteoProfesional = metas.filter(
    (m) => m.meta.ambito === "profesional",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas / OKR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "…" : metas.length} metas registradas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Metas" items={AYUDA_POR_RUTA["/metas"]?.items ?? []} />
          <Link
            href="/tareas/inbox"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconInbox className="h-4 w-4" />
            Inbox
          </Link>
          <Link
            href="/metas/plan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconColumns className="h-4 w-4" />
            Plan trimestral
          </Link>
          <Link
            href="/metas/nueva"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nueva meta
          </Link>
        </div>
      </header>

      {errorWig && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {errorWig}
        </p>
      )}

      {/* Panel WIG — siempre arriba, antes del listado */}
      <PanelWig wigs={wigs} onQuitar={(id) => toggleWig(metas.find((m) => m.meta.id === id)!)} guardandoId={guardandoId} />

      {/* Filtro por ámbito */}
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-xs">
        {(
          [
            { id: "todas", label: `Todas (${metas.length})` },
            { id: "personal", label: `👤 Personales (${conteoPersonal})` },
            { id: "profesional", label: `💼 Profesionales (${conteoProfesional})` },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id as Filtro)}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              filtro === f.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtro por tags (AND con el filtro de ámbito) */}
      {todosLosTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-2 text-xs">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          {todosLosTags.map((t) => {
            const activo = tagsSel.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                aria-pressed={activo}
                className={`rounded-full border px-2.5 py-1 transition-colors ${
                  activo
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                #{t}
                {activo && <span className="ml-1">×</span>}
              </button>
            );
          })}
          {tagsSel.size > 0 && (
            <button
              type="button"
              onClick={() => setTagsSel(new Set())}
              className="ml-auto text-[11px] text-muted-foreground underline-offset-4 hover:underline"
            >
              limpiar ({tagsSel.size})
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtradas.map((mp) => {
          const m = mp.meta;
          return (
            <article
              key={m.id}
              className={`group relative rounded-xl border bg-card p-5 transition-shadow hover:shadow-md ${
                m.es_wig ? "border-violet-500/40" : "border-border"
              }`}
            >
              {/* Botón WIG (diana) */}
              <button
                type="button"
                onClick={() => toggleWig(mp)}
                disabled={guardandoId === m.id}
                className={`absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors disabled:opacity-50 ${
                  m.es_wig
                    ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                }`}
                title={m.es_wig ? "Quitar de Enormemente Importantes" : "Marcar como WIG"}
                aria-label={m.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                aria-pressed={m.es_wig}
              >
                {guardandoId === m.id ? (
                  <span className="block h-4 w-4 text-center text-[10px]">…</span>
                ) : (
                  <IconTarget className="h-4 w-4" />
                )}
              </button>

              <Link href={`/metas/detalle?id=${m.id}`} className="block">
                <div className="flex items-start justify-between gap-3 pr-8">
                  <span className="text-xs font-medium text-muted-foreground">
                    {m.codigo ?? "—"}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      ESTADO[m.estado] ?? ESTADO.sin_empezar
                    }`}
                  >
                    <span
                      className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                        ESTADO_DOT[m.estado] ?? ESTADO_DOT.sin_empezar
                      }`}
                    />
                    {m.estado.replace("_", " ")}
                  </span>
                </div>
                <h2 className="mt-3 font-semibold tracking-tight group-hover:underline">
                  {m.titulo}
                </h2>
                {m.descripcion && (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {m.descripcion}
                  </p>
                )}

                {/* Badges: ámbito + tags */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {m.ambito && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                        AMBITO_BADGE[m.ambito]
                      }`}
                    >
                      {AMBITO_LABEL[m.ambito]}
                    </span>
                  )}
                  {m.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                  {!m.ambito && m.tags.length === 0 && (
                    <span className="text-[10px] text-muted-foreground/60">
                      sin clasificar
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {m.rice != null && <span>RICE {m.rice}</span>}
                  {m.plazo && <span>· {m.plazo}</span>}
                  {mp.total_tareas > 0 && (
                    <span>
                      · {mp.tareas_hechas}/{mp.total_tareas} tareas
                    </span>
                  )}
                </div>
                {mp.total_tareas > 0 && <ProgressBar value={mp.progreso} />}
              </Link>
            </article>
          );
        })}
        {!loading && metas.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aún no tienes metas. Crea la primera con{" "}
              <Link
                href="/metas/nueva"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Nueva meta
              </Link>
              .
            </p>
          </div>
        )}
        {!loading && metas.length > 0 && filtradas.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {tagsSel.size > 0
              ? `No hay metas con los tags seleccionados${filtro !== "todas" ? ` en el ámbito ${filtro}` : ""}.`
              : `No hay metas en este ámbito.`}
          </div>
        )}
      </div>
    </div>
  );
}