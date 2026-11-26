// ============================================================================
// ritual/cobertura.ts — la COBERTURA de los KRs en foco (issue #89, paso 5b).
// ----------------------------------------------------------------------------
// EL PROBLEMA QUE RESUELVE
//   Elegir 3 KRs en foco y no poner ninguna tarea encima es la forma
//   más fácil de tener un ritual semanal que no empuja nada. Antes de
//   cerrar la semana hay que poder VERlo: qué KR en foco tiene tareas esta
//   semana y cuál se ha quedado sin ninguna.
//
// LO QUE NO HACE
//   No escribe en BD ni decide: solo cuenta y avisa. Es una función pura
//   (testeable sin Supabase).
// ============================================================================

/** Un KR en foco, con lo mínimo que hace falta para contarlo. */
export interface KrParaCobertura {
  id: string;
  titulo: string;
}

/** Una tarea de la semana, con el KR al que apunta (si alguno). */
export interface TareaParaCobertura {
  id: string;
  resultado_periodo_id: string | null;
}

/** Cobertura de un KR en foco: cuántas tareas suyas hay esta semana. */
export interface CoberturaKr {
  krId: string;
  titulo: string;
  /** Nº de tareas de la semana que apuntan a este KR. */
  tareas: number;
  /** Títulos de esas tareas (para poder mostrarlos). */
  titulos: string[];
  /** true si el KR en foco no tiene ninguna tarea esta semana. */
  vacio: boolean;
}

/**
 * Calcula la cobertura de los KRs en foco para una lista de tareas.
 *
 * `tareas` son las tareas ASIGNADAS a la semana (las que están repartidas
 * por días en /semana), no todas las tareas del usuario: el objetivo es
 * saber si el trabajo de la semana está conectado al foco.
 */
export function calcularCobertura(
  krsEnFoco: readonly KrParaCobertura[],
  tareas: readonly (TareaParaCobertura & { titulo?: string })[],
): CoberturaKr[] {
  return krsEnFoco.map((kr) => {
    // Una tarea cuenta si apunta a este KR. Si la tarea NO tiene KR
    // (`resultado_periodo_id` null), NO cuenta para ningún KR: es trabajo
    // sin conexión con el foco, y eso es justo lo que hay que ver.
    const propias = tareas.filter((t) => t.resultado_periodo_id === kr.id);
    return {
      krId: kr.id,
      titulo: kr.titulo,
      tareas: propias.length,
      titulos: propias.map((t) => t.titulo ?? "").filter(Boolean),
      vacio: propias.length === 0,
    };
  });
}

/** Los KRs en foco que se han quedado sin tareas esta semana. */
export function krsSinCobertura(cobertura: readonly CoberturaKr[]): CoberturaKr[] {
  return cobertura.filter((c) => c.vacio);
}

/** Texto del aviso de cobertura (o null si todo el foco está cubierto). */
export function textoAvisoCobertura(
  cobertura: readonly CoberturaKr[],
): string | null {
  const vacios = krsSinCobertura(cobertura);
  if (vacios.length === 0) return null;
  if (vacios.length === cobertura.length) {
    return `Ninguno de tus ${cobertura.length} KRs en foco tiene tareas esta semana.`;
  }
  return `De tus ${cobertura.length} KRs en foco, ${vacios.length} no tiene ninguna tarea esta semana: ${vacios
    .map((c) => c.titulo)
    .join(", ")}.`;
}
