// ============================================================================
// RecurrenciaChip — distingue visualmente hábitos de tareas puntuales.
//
// Uso: <RecurrenciaChip tarea={t} />
//
// Datos de la BD: tareas.recurrencia_tipo ∈ {"diaria","semanal","mensual",null}
//   + tareas.recurrencia_dias_semana: number[] (0=Dom..6=Sáb)
//   + tareas.recurrencia_dia_mes: number (1..28)
//
// El chip devuelve null si la tarea NO es recurrente (caso normal de tareas
// puntuales). Si es recurrente, muestra un resumen corto:
//   · Diaria  → 🔁 Diaria (verde, indica hábito fuerte)
//   · Semanal con días específicos → 🗓️ L-V / L-X-V (ámbar)
//   · Semanal sin días → 🗓️ Semanal
//   · Mensual con día → 📅 Día 15 (gris)
//   · Mensual sin día → 📅 Mensual
// ============================================================================

import type { Tarea } from "@/lib/types";

const DIAS_LBL = ["D", "L", "M", "X", "J", "V", "S"];

function resumenDias(dias: number[] | null | undefined): string {
  if (!dias || dias.length === 0) return "";
  // Solo laborables (L-V = 1,2,3,4,5) → "L-V"
  const lab = [1, 2, 3, 4, 5];
  if (dias.length === 5 && lab.every((d) => dias.includes(d)) && dias.every((d) => lab.includes(d))) {
    return "L-V";
  }
  // Diario (todos los 7) → "D-S" (cubre caso 7 días)
  if (dias.length === 7) return "D-S";
  // Cualquier otro → lista corta tipo "L-X-V"
  return dias
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS_LBL[d] ?? "?")
    .join("-");
}

export function RecurrenciaChip({ tarea }: { tarea: Tarea }) {
  const tipo = tarea.recurrencia_tipo;
  if (!tipo) return null;

  let label = "";
  let tone = "";

  if (tipo === "diaria") {
    label = "🔁 Diaria";
    tone = "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  } else if (tipo === "semanal") {
    const dias = resumenDias(tarea.recurrencia_dias_semana);
    label = dias ? `🗓️ ${dias}` : "🗓️ Semanal";
    tone = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  } else {
    // mensual
    const dia = tarea.recurrencia_dia_mes;
    label = dia ? `📅 Día ${dia}` : "📅 Mensual";
    tone = "border-border bg-muted text-muted-foreground";
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${tone}`}
      title={
        tipo === "diaria"
          ? "Hábito diario: al marcarla como hecha, se crea una copia nueva automáticamente."
          : tipo === "semanal"
            ? `Hábito semanal (${resumenDias(tarea.recurrencia_dias_semana) || "días no definidos"}).`
            : `Hábito mensual (día ${tarea.recurrencia_dia_mes ?? "?"} de cada mes).`
      }
    >
      {label}
    </span>
  );
}

/** Variante inline (sin borde) para espacios estrechos como la fila de
 *  tarea dentro de /metas/detalle. */
export function RecurrenciaTag({ tarea }: { tarea: Tarea }) {
  const tipo = tarea.recurrencia_tipo;
  if (!tipo) return null;

  if (tipo === "diaria") return <span title="Hábito diario">🔁</span>;
  if (tipo === "semanal") {
    const dias = resumenDias(tarea.recurrencia_dias_semana);
    return <span title={`Hábito semanal (${dias || "?"})`}>🗓️{dias ? ` ${dias}` : ""}</span>;
  }
  const dia = tarea.recurrencia_dia_mes;
  return <span title={`Hábito mensual (día ${dia ?? "?"})`}>📅{dia ? ` ${dia}` : ""}</span>;
}