"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchEstatusPorFecha } from "@/lib/queries";
import { EstatusForm } from "@/components/EstatusForm";
import type { EstatusConComidas } from "@/lib/types";

export default function EstatusEditarPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <EstatusEditarInner />
    </Suspense>
  );
}

function Cargando() {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      Cargando…
    </p>
  );
}

function EstatusEditarInner() {
  const searchParams = useSearchParams();
  const fecha = searchParams.get("fecha");
  const [estatus, setEstatus] = useState<EstatusConComidas | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!fecha) {
      setEstatus(null);
      return;
    }
    let alive = true;
    fetchEstatusPorFecha(fecha)
      .then((e) => {
        if (alive) setEstatus(e);
      })
      .catch(() => {
        if (alive) setEstatus(null);
      });
    return () => {
      alive = false;
    };
  }, [fecha]);

  if (!fecha) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Falta el parámetro <code>?fecha=YYYY-MM-DD</code> en la URL.
        </p>
        <Link
          href="/estatus"
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ir al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editar estatus del {fecha}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modifica cualquier campo. Se guarda al pulsar "Guardar cambios".
          </p>
        </div>
        <Link
          href={`/estatus/ver?fecha=${fecha}`}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          ← Ver detalle
        </Link>
      </header>

      {estatus === undefined && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Cargando…
        </p>
      )}
      {estatus === null && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No hay estatus guardado para el {fecha}.
          </p>
          <Link
            href="/estatus/nuevo"
            className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Crearlo
          </Link>
        </div>
      )}
      {estatus && (
        <EstatusForm fecha={fecha} estatusInicial={estatus} modo="editar" />
      )}
    </div>
  );
}
