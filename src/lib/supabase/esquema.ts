// ============================================================================
// supabase/esquema.ts — ¿este error es "la BD va por detrás del código"?
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un detector de errores de PostgREST/Postgres que significan "esto no
//   existe en la base de datos":
//     · 42703     → `column "x" does not exist`
//     · 42P01     → `relation "x" does not exist`
//     · PGRST204  → no encuentra la función en el esquema
//     · PGRST205  → no encuentra la tabla en el esquema
//
// POR QUÉ EXISTE
//   La app se despliega antes que las migraciones: es normal que el código
//   pida una columna que la base de datos todavía no tiene. Antes eso
//   reventaba la pantalla entera; con este detector la app puede DEGRADAR
//   (leer lo que sí existe, avisar de lo que no) en vez de romperse.
//
// LO QUE NO HACE
//   No aplica migraciones ni toca el esquema: solo mira el error.
// ============================================================================

/** Códigos de PostgREST/Postgres que significan "esto no existe en la BD". */
const CODIGOS_ESQUEMA_AUSENTE = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "PGRST204", // función no encontrada en el esquema
  "PGRST205", // tabla no encontrada en el esquema
]);

/** ¿El error es "la columna/tabla/función no existe en la base de datos"? */
export function esEsquemaAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.code === "string" && CODIGOS_ESQUEMA_AUSENTE.has(e.code)) {
    return true;
  }
  const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    msg.includes("schema cache")
  );
}
