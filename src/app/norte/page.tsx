"use client";

import { fetchNorte } from "@/lib/queries";
import { useData } from "@/lib/useData";

type Norte = {
  propositos: { id: string; texto: string }[];
  valores: { id: string; nombre: string; descripcion: string | null }[];
  visiones: { id: string; horizonte: string; texto: string }[];
};

export default function NortePage() {
  const { data, loading } = useData<Norte>(fetchNorte, {
    propositos: [],
    valores: [],
    visiones: [],
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Norte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Propósito, valores y visión: la brújula que da sentido a las metas.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold tracking-tight">🎯 Propósito</h2>
        <ul className="space-y-2">
          {data.propositos.map((p) => (
            <li key={p.id} className="text-sm leading-relaxed">
              {p.texto}
            </li>
          ))}
          {!loading && data.propositos.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin definir todavía.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold tracking-tight">🧭 Valores</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.valores.map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-background p-4">
              <div className="text-sm font-medium">{v.nombre}</div>
              {v.descripcion ? (
                <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {v.descripcion}
                </div>
              ) : null}
            </div>
          ))}
          {!loading && data.valores.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin definir todavía.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold tracking-tight">🔭 Visión</h2>
        <ul className="space-y-3">
          {data.visiones.map((v) => (
            <li key={v.id} className="text-sm leading-relaxed">
              <span className="mr-2 rounded bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                {v.horizonte}
              </span>
              {v.texto}
            </li>
          ))}
          {!loading && data.visiones.length === 0 && (
            <li className="text-sm text-muted-foreground">Sin definir todavía.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
