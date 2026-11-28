// ============================================================================
// improductividad.ts — LA IMPRODUCTIVIDAD, DÍA A DÍA (issue #65)
// ----------------------------------------------------------------------------
// QUÉ ES
//   La regla del producto: "siempre hay que hacer aunque sea una principal".
//   Un día en el que solo se hacen tareas secundarias (o no se hace nada del
//   plan) es un día IMPRODUCTIVO, aunque haya hecho un montón de trabajo.
//
// CÓMO SE CLASIFICA UN DÍA
//   · "principal"   → se hizo la TAREA PRINCIPAL del plan de ese día.
//   · "secundarias" → NO se hizo la principal, pero sí alguna de las
//                     secundarias del plan.
//   · "nada"        → no se hizo ninguna tarea del plan.
//
// QUÉ ES LA "TAREA PRINCIPAL" DEL PLAN
//   El plan diario (planes_diarios + plan_diario_tareas) guarda sus filas en
//   orden: la primera (orden más bajo) es la tarea principal del día y las
//   demás son secundarias. Es el mismo criterio con el que se pinta el plan
//   en /plan-diario (bloque 1 = lo primero del día).
//
// POR QUÉ ES UN MÓDULO PURO
//   Sin Supabase, sin React: solo classify/aggregate. Así se testea con el
//   harness del repo (scripts/run-tests.mjs) y se reutiliza en la UI y en el
//   informe sin arrastrar lógica dentro del componente.
// ============================================================================

/** Cómo ha quedado el día. */
export type EstadoDia = "principal" | "secundarias" | "nada";

/** Una tarea del plan de un día (la fila de `plan_diario_tareas`). */
export type TareaDelPlan = {
  /** Posición en el plan: 0 = la principal. */
  orden: number;
  /** ¿Está marcada como hecha en el plan? */
  hecho: boolean;
  /** Título (de la tarea real o el texto libre del plan). */
  titulo: string | null;
};

/** Un día con plan, ya normalizado para el informe. */
export type DiaConPlan = {
  /** YYYY-MM-DD */
  fecha: string;
  principal: TareaDelPlan;
  secundarias: TareaDelPlan[];
};

/** Resumen de la ventana. */
export type ResumenImproductividad = {
  /** Días con plan en la ventana. */
  diasConPlan: number;
  /** Días en los que se hizo la principal. */
  conPrincipal: number;
  /** Días en los que solo se hicieron secundarias. */
  soloSecundarias: number;
  /** Días en los que no se hizo nada del plan. */
  nada: number;
  /** % de días con plan en los que se hizo la principal (0-100). */
  pctPrincipal: number;
};

/**
 * Clasifica UN día con plan.
 *
 * La principal manda: si se hizo, el día es productivo aunque también se
 * hayan hecho secundarias (eso es lo que se busca: la principal primero).
 */
export function clasificarDia(dia: DiaConPlan): EstadoDia {
  if (dia.principal.hecho) return "principal";
  if (dia.secundarias.some((t) => t.hecho)) return "secundarias";
  return "nada";
}

/** Etiqueta corta para cada estado (la UI la usa tal cual). */
export function etiquetaEstado(estado: EstadoDia): string {
  switch (estado) {
    case "principal":
      return "Con principal";
    case "secundarias":
      return "Solo secundarias";
    case "nada":
      return "Nada";
  }
}

/**
 * Normaliza las filas de un plan (las que devuelve la BD) al día que usa el
 * informe: ordena por `orden` y separa la principal (la primera) de las
 * secundarias.
 *
 * Si el plan no tiene filas, devuelve `null`: un plan sin tareas no es un
 * día "en blanco", es un día sin plan (no cuenta ni a favor ni en contra).
 */
export function normalizarDia(
  fecha: string,
  filas: TareaDelPlan[],
): DiaConPlan | null {
  const ordenadas = [...filas].sort((a, b) => a.orden - b.orden);
  const primera = ordenadas[0];
  if (!primera) return null;
  return {
    fecha,
    principal: primera,
    secundarias: ordenadas.slice(1),
  };
}

/** Cuenta los días de cada tipo y el % de días con principal. */
export function resumenImproductividad(
  dias: DiaConPlan[],
): ResumenImproductividad {
  let conPrincipal = 0;
  let soloSecundarias = 0;
  let nada = 0;
  for (const d of dias) {
    const estado = clasificarDia(d);
    if (estado === "principal") conPrincipal++;
    else if (estado === "secundarias") soloSecundarias++;
    else nada++;
  }
  const diasConPlan = dias.length;
  return {
    diasConPlan,
    conPrincipal,
    soloSecundarias,
    nada,
    pctPrincipal:
      diasConPlan === 0 ? 0 : Math.round((conPrincipal / diasConPlan) * 100),
  };
}
