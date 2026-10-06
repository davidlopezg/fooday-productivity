"use client";

import { PagosLista } from "@/components/pagos/PagosLista";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";

export default function PagosPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lo que tienes que pagar y lo que ya pagaste. Optimiza tu tesorería
              programando cada lunes. Módulo aislado del resto del sistema.
            </p>
          </div>
          <HelpDrawer title="Pagos" items={AYUDA_POR_RUTA["/pagos"]?.items ?? []} />
        </div>
      </header>

      <PagosLista />
    </div>
  );
}
