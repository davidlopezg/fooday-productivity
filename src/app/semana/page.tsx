"use client";

import { fetchRituales } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { Ritual } from "@/lib/types";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function SemanaPage() {
  const { data: rituales, loading } = useData<Ritual[]>(fetchRituales, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Semana</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rituales fijos de la semana (reglas no negociables).
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {DIAS.map((dia, i) => {
          const delDia = rituales.filter((r) => r.dia_semana === i + 1);
          if (delDia.length === 0) return null;
          return (
            <section key={dia} className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 font-semibold tracking-tight">{dia}</h2>
              <ul className="space-y-2">
                {delDia.map((r) => (
                  <li key={r.id} className="flex gap-3 text-sm">
                    {r.hora && (
                      <span className="w-20 shrink-0 font-medium text-muted-foreground">
                        {r.hora}
                      </span>
                    )}
                    <span>{r.descripcion}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!loading && rituales.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay rituales cargados.</p>
        )}
      </div>
    </div>
  );
}
