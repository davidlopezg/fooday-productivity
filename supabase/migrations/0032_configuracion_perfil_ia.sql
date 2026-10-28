-- ============================================================================
-- 0032_configuracion_perfil_ia.sql
--
-- Saca la identidad del usuario de los PROMPTS y la lleva a la tabla
-- `configuracion`, que ya existe y ya está protegida por RLS (user_id).
--
-- EL PROBLEMA QUE RESUELVE
--   El perfil ("David", familia "María y Abril (5 años)", restricciones
--   alimentarias, TDAH/cervicales, negocio de restaurante…) estaba escrito
--   a fuego dentro de las plantillas de prompt de `plan.ts`, `planSimple.ts`,
--   `iaSugerencias.ts`, `sugerirPagosIA.ts`, `sugerirMatrizIA.ts` y
--   `analizarEscenariosIAIA.ts`. Eso obligaba a tocar el código para
--   customize el prompt, y si el perfil.Contains(), con la API key, cada vez
--   que se compilaba la app.
--
-- QUÉ HACE
--   Añade columnas de texto libre (todas nullable, todas con default igual al
--   valor que estaba hardcodeado) para:
--     · perfil        → párrafo corto de identidad/contexto que se inyecta en
--                       los prompts ("nombre", "a qué se dedica"…).
--     · familia       → con quién vive / carga familiar.
--     · restricciones → límites duros (salud, dieta, TDAH, lesiones…).
--     · contexto_negocio → reglas del negocio que la IA debe respetar al
--                       sugerir (p.ej. "factura viernes y sábado").
--
-- POR QUÉ ES SEGURO (no cambia el comportamiento)
--   · Todos los defaults son LITERALMENTE los textos que estaban en el código.
--     Una BD nueva que aplique 0032 y no toque nada obtiene exactamente el
--     mismo prompt que antes.
--   · `null` significa "usa el default de la app" → el código mantiene los
--     mismos valores en `DEFAULT_PERFIL_IA` como red de seguridad (por si la
--     fila no existe o la columna quedó vacía).
--   · No se toca ninguna tabla de datos: solo `configuracion`.
-- ============================================================================

alter table public.configuracion
  add column if not exists perfil          text,
  add column if not exists familia         text,
  add column if not exists restricciones   text,
  add column if not exists contexto_negocio text;

comment on column public.configuracion.perfil is
  'Contexto personal que se inyecta en los prompts de IA (quién es el usuario). null = usar el default de la app.';
comment on column public.configuracion.familia is
  'Familia / carga familiar que la IA debe tener en cuenta al planificar. null = default.';
comment on column public.configuracion.restricciones is
  'Restricciones duras (salud, dieta, TDAH, lesiones). null = default.';
comment on column public.configuracion.contexto_negocio is
  'Reglas del negocio para las sugerencias de la IA (p.ej. días de facturación). null = default.';