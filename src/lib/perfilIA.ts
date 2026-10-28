// ============================================================================
// perfilIA.ts — el "quién es el usuario" que se inyecta en los prompts.
//
// EL PROBLEMA QUE ESTE MÓDULO RESUELVE
//   El perfil estaba escrito dentro de las plantillas de prompt de
//   `plan.ts`, `planSimple.ts`, `iaSugerencias.ts`, `sugerirPagosIA.ts`,
//   `sugerirMatrizIA.ts` y `analizarEscenariosIA.ts` ("David", familia,
//   restricciones, TDAH…). Cambiarlo obligaba a tocar el código, y el
//   perfil viajaba dentro del prompt a un tercero (el LLM) en cada llamada.
//
// CÓMO FUNCIONA
//   · Los textos viven ahora en la tabla `configuracion` (columnas
//     `perfil`, `familia`, `restricciones`, `contexto_negocio`, migration
//     0032), que el usuario edita en /configuracion.
//   · `DEFAULT_PERFIL_IA` conserva EXACTAMENTE los valores que estaban
//     hardcodeados, como red de seguridad para cuando la fila no existe o
//     una columna quedó vacía. Un usuario que nunca abre /configuracion
//     recibe prompts idénticos a los de antes.
//
//   · Los prompts se construyen con `bloquePerfil(p)`, que devuelve "" si
//     todo está vacío (para no dejar cabeceras huérfanas en el prompt).
//
// SIN CAMBIOS DE COMPORTAMIENTO: los defaults son los literales anteriores.
// ============================================================================

export type PerfilIA = {
  /** Párrafo de identidad: nombre, a qué se dedica, contexto. */
  perfil: string | null;
  /** Familia / carga familiar. */
  familia: string | null;
  /** Restricciones duras: salud, dieta, TDAH, lesiones. */
  restricciones: string | null;
  /** Reglas del negocio que la IA debe respetar (días de facturación…). */
  contexto_negocio: string | null;
};

/**
 * Defaults = los valores que estaban escritos en los prompts.
 * NO cambiar estos valores salvo que quieras cambiar el comportamiento por
 * defecto de la app: son el contrato de lo que el usuario recibe si no
 * personaliza nada.
 */
export const DEFAULT_PERFIL_IA: PerfilIA = {
  perfil:
    "David. Dirige un restaurante (Sol de Nit) y trabaja en proyectos tech. " +
    "Trabaja solo, con TDAH y problemas de cervicales.",
  familia: "Familia: María y Abril (5 años).",
  restricciones:
    "Restricciones activas: SIN avena, SIN cilantro, SIN quinoa, SIN tofu. " +
    "No correr ni hacer impacto (cervicales); ansiedad: evitar sobrecarga.",
  contexto_negocio:
    "Factura el viernes y el sábado por la noche. Los ingresos llegan al banco " +
    "el sábado y el domingo; el lunes es el día natural para pagar.",
};

/** Devuelve el perfil con los defaults rellenados donde falte algo. */
export function perfilConDefaults(p?: PerfilIA | null): PerfilIA {
  return {
    perfil: p?.perfil?.trim() || DEFAULT_PERFIL_IA.perfil,
    familia: p?.familia?.trim() || DEFAULT_PERFIL_IA.familia,
    restricciones: p?.restricciones?.trim() || DEFAULT_PERFIL_IA.restricciones,
    contexto_negocio:
      p?.contexto_negocio?.trim() || DEFAULT_PERFIL_IA.contexto_negocio,
  };
}

/**
 * Bloque de identidad para pegar en un prompt.
 * Devuelve "" si TODOS los campos están vacíos, para no dejar cabeceras
 * huérfanas ("PERFIL DEL USUARIO:\n\n") en el prompt.
 */
export function bloquePerfil(p?: PerfilIA | null): string {
  const { perfil, familia, restricciones, contexto_negocio } =
    perfilConDefaults(p);
  const lineas: string[] = [];
  if (perfil) lineas.push(`- ${perfil}`);
  if (familia) lineas.push(`- ${familia}`);
  if (restricciones) lineas.push(`- ${restricciones}`);
  if (contexto_negocio) lineas.push(`- Negocio: ${contexto_negocio}`);
  if (lineas.length === 0) return "";
  return `PERFIL DEL USUARIO:\n${lineas.join("\n")}`;
}