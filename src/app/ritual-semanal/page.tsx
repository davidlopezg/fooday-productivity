"use client";

// ============================================================================
// /ritual-semanal — el ritual semanal en 4 pasos (issue #88).
// ----------------------------------------------------------------------------
// QUÉ ES
//   La hoja del lunes, dentro de la app: proyectos → metas → 3 WIGs → KRs
//   de la semana. El borrador se guarda en el navegador (se puede parar y
//   seguir) y cada paso escribe sus decisiones al pulsar "Guardar".
//
// LO QUE NO HACE
//   No reparte tareas por los días: eso es /semana. Aquí se decide QUÉ;
//   allí se hace CÓMO.
// ============================================================================

import { useState } from "react";
import { WizardRitual } from "@/components/ritual/WizardRitual";
import { getCurrentISOWeek, shiftISOWeek } from "@/lib/semana";

export default function RitualSemanalPage() {
  const [semana, setSemana] = useState(() => {
    const w = getCurrentISOWeek();
    return { anio: w.anio, semana_iso: w.semana_iso };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-1 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setSemana((s) => shiftISOWeek(s.anio, s.semana_iso, -1))}
          className="rounded-md px-2 py-1 text-sm hover:bg-accent"
          aria-label="Semana anterior"
        >
          ←
        </button>
        <span className="px-2 py-1 text-sm font-medium">
          {semana.anio} · semana {semana.semana_iso}
        </span>
        <button
          type="button"
          onClick={() => setSemana((s) => shiftISOWeek(s.anio, s.semana_iso, 1))}
          className="rounded-md px-2 py-1 text-sm hover:bg-accent"
          aria-label="Semana siguiente"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => setSemana(getCurrentISOWeek())}
          className="ml-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
        >
          Hoy
        </button>
      </div>

      <WizardRitual anio={semana.anio} semana_iso={semana.semana_iso} />
    </div>
  );
}
