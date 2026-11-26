"use client";

// ============================================================================
// TemporizadorPaso — el reloj de cada paso del ritual (issue #88).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un cronómetro con objetivo: el ritual tiene tiempos (10 min por paso)
//   y sin un límite visible el paso se estira hasta que la tarde se ha ido.
//
// QUÉ NO HACE
//   No avisa por la pantalla (nada de modales): el color y el texto bastan.
//   No guarda nada: es decorativo.
// ============================================================================

import { useEffect, useState } from "react";

export function TemporizadorPaso({
  objetivoMin,
}: {
  /** Objetivo del paso, en minutos. */
  objetivoMin: number;
}) {
  // El contador arranca en 0 al montarse: al cambiar de paso, el padre
  // cambia la `key` y el componente se vuelve a montar (sin efectos).
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const objetivo = objetivoMin * 60;
  const pasado = segundos > objetivo;
  const cerca = !pasado && segundos > objetivo * 0.8;

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] tabular-nums ${
        pasado
          ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
          : cerca
            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-border bg-background text-muted-foreground"
      }`}
      title={`Objetivo de este paso: ${objetivoMin} min`}
    >
      ⏱ {mm}:{ss} / {objetivoMin} min
    </span>
  );
}
