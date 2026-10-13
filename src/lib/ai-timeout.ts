// ============================================================================
// ai-timeout.ts — helper compartido para calcular el timeout de las
// llamadas a la IA (migration 0025).
//
// Antes: timeout fijo de 45s en plan.ts, planSimple.ts y motorPriorizacion.ts.
// Con la migration 0025 los prompts crecieron (soporte de meses + hard
// constraint + fechas reales), y la IA empezó a chocar contra el límite
// en cold start / redes lentas.
//
// Aquí centralizamos el cálculo para no tener el mismo bloque copiado 3
// veces. Las constantes se pueden ajustar en una sola ronda futura.
// ============================================================================

/** Config por defecto del timeout. Ajustable exportando las constantes
 *  si en el futuro hay que parametrizar por modelo o entorno. */
export const AI_TIMEOUT_BASE_MS = 90_000;
export const AI_TIMEOUT_PER_CHARS_MS = 1500; // 1.5s extra cada 100 chars
export const AI_TIMEOUT_PER_N_CHARS = 100;
export const AI_TIMEOUT_MAX_MS = 240_000;

/** Calcula el timeout (ms) en función de los chars del prompt.
 *  @param promptLen suma de longitudes de system + user prompts. */
export function calcularTimeoutIA(promptLen: number): number {
  const extraMs =
    Math.ceil(promptLen / AI_TIMEOUT_PER_N_CHARS) * AI_TIMEOUT_PER_CHARS_MS;
  return Math.min(AI_TIMEOUT_BASE_MS + extraMs, AI_TIMEOUT_MAX_MS);
}

/** Mensaje que verá David si se agotó el tiempo. Incluye el límite
 *  efectivo (segundos) y el tamaño del prompt para diagnosticar. */
export function mensajeTimeoutIA(promptLen: number): string {
  const segundos = Math.round(calcularTimeoutIA(promptLen) / 1000);
  return `La IA no respondió a tiempo (más de ${segundos}s, prompt de ${promptLen} chars). Vuelve a intentarlo o sube el timeout.`;
}
