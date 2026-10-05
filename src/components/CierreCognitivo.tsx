"use client";

import type { EstatusDiario } from "@/lib/types";

/** Tabla read-only con las 5 preguntas del cierre cognitivo (obligatorio). */
export function CierreCognitivo({ estatus }: { estatus: EstatusDiario }) {
  const rows: Array<[string, string | null]> = [
    ["¿Qué he conseguido?", estatus.cierre_que_consigo],
    ["¿Qué queda abierto?", estatus.cierre_queda_abierto],
    ["¿Qué decisiones he tomado?", estatus.cierre_decisiones_tomadas],
    [
      "¿Qué problemas siguen ocupando espacio mental?",
      estatus.cierre_carga_mental,
    ],
    [
      "¿Cuál debería ser el primer problema de mañana?",
      estatus.cierre_primer_problema_manana,
    ],
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([pregunta, respuesta], i) => (
            <tr
              key={pregunta}
              className={i % 2 === 0 ? "bg-muted/30" : ""}
            >
              <td className="w-1/3 px-3 py-2 align-top text-xs font-medium text-muted-foreground">
                {pregunta}
              </td>
              <td className="px-3 py-2 align-top">
                {respuesta?.trim() ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {respuesta}
                  </p>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
