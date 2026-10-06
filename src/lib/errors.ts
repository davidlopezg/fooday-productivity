/**
 * Conversión robusta de cualquier valor lanzado (`unknown`) a un mensaje
 * apto para mostrar al usuario.
 *
 * Por qué existe:
 *   El patrón `e instanceof Error ? e.message : String(e)` es frágil.
 *   `String(objetoPlano)` da `"[object Object]"` y deja al usuario sin pista
 *   cuando el error NO extiende `Error` (por ejemplo, un `PostgrestError`
 *   cuyo prototipo se pierde al cruzar un límite de bundle, o un error
 *   serializado por React). Esta función cubre los casos reales:
 *
 *     - `Error` real (incluye `PostgrestError`, que `extends Error`) →
 *       usa `.message` y, si están, añade `.details` / `.hint` / `.code`.
 *     - Objeto plano con `message` (PostgrestError "desnudo") → mismo
 *       tratamiento que el caso anterior.
 *     - `string` → la devuelve tal cual.
 *     - Cualquier otro objeto → `JSON.stringify` con `try/catch` por si
 *       tiene referencias circulares.
 *     - `null` / `undefined` → fallback configurable (por defecto
 *       "Error desconocido").
 *
 * Uso:
 *     try { ... } catch (e) { setError(errorMessage(e)); }
 *     try { ... } catch (e) { setError(errorMessage(e, "No se pudo guardar")); }
 */
export function errorMessage(e: unknown, fallback = "Error desconocido"): string {
  if (e == null) return fallback;
  if (typeof e === "string") return e;
  if (typeof e !== "object") return String(e);

  // Error "de verdad" (PostgrestError extiende Error → .message está disponible)
  if (e instanceof Error) {
    return formatWithExtras(e.message, e as unknown as Record<string, unknown>);
  }

  // Objeto plano con .message (PostgrestError "desnudo", JSON.parse, etc.)
  const maybeMsg = (e as { message?: unknown }).message;
  if (typeof maybeMsg === "string" && maybeMsg.length > 0) {
    return formatWithExtras(maybeMsg, e as Record<string, unknown>);
  }

  // Objeto sin .message → stringify defensivo
  try {
    const json = JSON.stringify(e);
    if (json && json !== "{}") return json;
  } catch {
    // referencias circulares → fallback
  }
  return fallback;
}

/** Si el objeto trae campos típicos de PostgREST (`details`, `hint`, `code`)
 *  los añade en una segunda línea para que el mensaje sea diagnosticable. */
function formatWithExtras(message: string, e: Record<string, unknown>): string {
  const parts: string[] = [message];
  const details = typeof e.details === "string" ? e.details.trim() : "";
  const hint = typeof e.hint === "string" ? e.hint.trim() : "";
  const code = typeof e.code === "string" ? e.code.trim() : "";
  const extras: string[] = [];
  if (details) extras.push(`details: ${details}`);
  if (hint) extras.push(`hint: ${hint}`);
  if (code) extras.push(`code: ${code}`);
  if (extras.length) parts.push(extras.join(" · "));
  return parts.join("\n");
}
