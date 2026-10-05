"use client";

import type { EstatusDiario } from "@/lib/types";

/** Tabla read-only con la auditoría 20/80 (5 preguntas obligatorias). */
export function Auditoria20_80({ estatus }: { estatus: EstatusDiario }) {
  const rows: Array<[string, string]> = [
    [
      "¿Cuántas tareas críticas hiciste hoy?",
      estatus.audit_tareas_criticas !== null
        ? `${estatus.audit_tareas_criticas} / 3 — ${estatus.audit_tareas_criticas <= 3 ? "respetó el límite" : "⚠️ sobrecarga"}`
        : "—",
    ],
    [
      "¿Terminaste las 3 principales del plan?",
      estatus.audit_termino_3_principales === true
        ? "Sí"
        : estatus.audit_termino_3_principales === false
          ? "No"
          : "—",
    ],
    [
      "¿AÑADISTE tareas nuevas sin terminar las anteriores?",
      estatus.audit_anadio_sin_terminar === true
        ? "Sí — ⚠️ señal de sobresaturación"
        : estatus.audit_anadio_sin_terminar === false
          ? "No"
          : "—",
    ],
    [
      "¿Las tareas que hiciste eran 20/80?",
      estatus.audit_eran_20_80 === "si"
        ? "Sí"
        : estatus.audit_eran_20_80 === "parcial"
          ? "Parcial"
          : estatus.audit_eran_20_80 === "no"
            ? "No — fueron ruido"
            : "—",
    ],
    [
      "¿Sientes que cumpliste o que corriste?",
      estatus.audit_sintio === "cumpli"
        ? "Cumplí"
        : estatus.audit_sintio === "corri"
          ? "Corrí"
          : estatus.audit_sintio === "nada"
            ? "Nada"
            : "—",
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
              <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                {pregunta}
              </td>
              <td className="px-3 py-2 align-top text-right font-medium">
                {respuesta}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
