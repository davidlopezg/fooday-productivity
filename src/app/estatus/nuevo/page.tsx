"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchEstatusPorFecha } from "@/lib/queries";
import { EstatusForm } from "@/components/EstatusForm";
import type { EstatusConComidas } from "@/lib/types";

const HOY = () => new Date().toISOString().slice(0, 10);

export default function EstatusNuevoPage() {
  const router = useRouter();
  const [fecha, setFecha] = useState<string>(HOY());
  const [existente, setExistente] = useState<EstatusConComidas | null | undefined>(undefined);
  // undefined = cargando, null = no existe, EstatusConComidas = ya hay entrada

  useEffect(() => {
    let alive = true;
    fetchEstatusPorFecha(fecha)
      .then((e) => {
        if (alive) setExistente(e);
      })
      .catch(() => {
        if (alive) setExistente(null);
      });
    return () => {
      alive = false;
    };
  }, [fecha]);

  // Si ya existe la entrada, redirige a editar (regla: 1 por día)
  useEffect(() => {
    if (existente) {
      router.replace(`/estatus/editar?fecha=${fecha}`);
    }
  }, [existente, fecha, router]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Nuevo estatus diario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Una entrada por día. Si ya creaste el de {fecha}, te llevamos al
            editor.
          </p>
        </div>
        <Link
          href="/estatus"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          ← Volver al listado
        </Link>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Fecha del estatus
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </div>

      {existente === undefined && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Comprobando si ya existe entrada para {fecha}…
        </p>
      )}
      {existente === null && (
        <EstatusForm fecha={fecha} modo="nuevo" />
      )}
      {existente && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Ya existe una entrada para {fecha}. Redirigiendo al editor…
        </p>
      )}
    </div>
  );
}
