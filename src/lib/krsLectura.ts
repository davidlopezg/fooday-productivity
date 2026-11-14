// ============================================================================
// krsLectura.ts — leer la tabla de KRs tolerando que la BD vaya por detrás.
// ----------------------------------------------------------------------------
// QUÉ ES
//   La migration 0038 (`resultados_periodo.es_wig` / `.wig_orden` + RPC
//   `toggle_kr_wig`) puede NO estar aplicada en el proyecto de Supabase:
//   el código ya la usa, pero la base de datos todavía no la tiene. Eso
//   pasaba de verdad: al fusionar el PR #50, la página /krs dejó de
//   cargar con "column resultados_periodo.es_wig does not exist (42703)".
//
// POR QUÉ EXISTE
//   Un `select` a una columna que no existe tumba la pantalla ENTERA. Con
//   este lector, la app DEGRADA: lee los KRs sin las columnas del WIG y
//   AVISA de lo que falta, en vez de romperse. Es el mismo patrón que usa
//   el Modo Recuperación con la migration 0034 (`supabase/esquema.ts`).
//
// LO QUE NO HACE
//   No aplica migraciones ni toca el esquema: solo detecta que falta algo
//   y lo dice.
//
// POR QUÉ ES UN MÓDULO APARTE
//   Para poder PROBAR el degradado sin base de datos: la función recibe
//   el "selector" (la función que hace el `select`) por parámetro, así que
//   un test le puede pasar un doble que falla con 42703.
// ============================================================================

import { esEsquemaAusente } from "@/lib/supabase/esquema";

/** Columnas de la tabla de KRs que existen desde siempre. */
export const COLUMNAS_KR =
  "id,meta_id,titulo,descripcion,metrica,valor_objetivo,valor_actual,unidad,estado,peso,orden";

/** Las mismas + las del WIG de KR (migration 0038). */
export const COLUMNAS_KR_CON_WIG = `${COLUMNAS_KR},es_wig,wig_orden`;

/**
 * Aviso para el usuario cuando la BD va por detrás del código.
 *
 * Dice qué falta y qué se queda sin hacer hasta que se aplique, porque un
 * aviso sin consecuencia no sirve: el 🎯 de WIG no marca nada hasta que la
 * columna existe.
 */
export const AVISO_MIGRACION_0038 =
  "Falta aplicar la migración 0038 en Supabase (resultados_periodo.es_wig): los KRs se ven, pero el botón 🎯 de WIG no funciona hasta que se aplique.";

/** Lo que devuelve el `select` de PostgREST (solo lo que nos importa). */
type ResultadoSelect = { data: unknown; error: unknown };

/**
 * Lee la tabla de KRs sin romperse si la BD va por detrás.
 *
 * @param seleccionar  Función que hace el `select` con las columnas pedidas.
 * @returns Los KRs leídos y el aviso (null si la BD está al día).
 * @throws  Si el error NO es "falta una columna": ahí sí es un fallo real.
 */
export async function leerKrsConRespaldo(
  seleccionar: (columnas: string) => PromiseLike<ResultadoSelect>,
): Promise<{ krs: unknown[]; aviso: string | null }> {
  const conWig = await seleccionar(COLUMNAS_KR_CON_WIG);
  if (!conWig.error) {
    return { krs: (conWig.data ?? []) as unknown[], aviso: null };
  }

  // Un error que no es de esquema (red, permisos, timeout) se propaga: no
  // tiene sentido fingir que la tabla está vacía.
  if (!esEsquemaAusente(conWig.error)) {
    throw conWig.error;
  }

  // La BD no tiene la migration 0038: se leen los KRs SIN las columnas del
  // WIG. Antes esto tumbaba la página /krs entera.
  const sinWig = await seleccionar(COLUMNAS_KR);
  if (sinWig.error) throw sinWig.error;
  return { krs: (sinWig.data ?? []) as unknown[], aviso: AVISO_MIGRACION_0038 };
}
