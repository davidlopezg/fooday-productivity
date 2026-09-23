"use client";

import { useState } from "react";
import { fetchCapturasPendientes } from "@/lib/queries";
import { crearCaptura } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import type { Captura } from "@/lib/types";

export default function CapturaPage() {
  const { data: capturas, loading, reload } = useData<Captura[]>(
    fetchCapturasPendientes,
    [],
  );
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    await crearCaptura(texto);
    setTexto("");
    setGuardando(false);
    reload();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Captura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vuelca lo que tengas en la cabeza. Luego se clasificará en su rama.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          rows={4}
          placeholder="Escribe aquí… (tarea, problema, reflexión, idea…)"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar captura"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Pendientes de procesar ({capturas.length})
        </h2>
        <ul className="space-y-2">
          {capturas.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="mb-1 flex gap-2 text-xs text-muted-foreground">
                <span>{c.fecha}</span>
                {c.rama && <span>· {c.rama}</span>}
              </div>
              <p className="leading-relaxed">{c.texto}</p>
            </li>
          ))}
          {!loading && capturas.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Inbox vacío.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
