-- ============================================================================
-- 0027_configuracion_prompt_pagos.sql
-- Añade la columna `prompt_pagos` (TEXT, nullable) a la tabla `configuracion`
-- para que el usuario pueda editar el prompt que usa el botón IA de /pagos.
--
-- Por qué nullable: el `Config` en `src/lib/configStore.tsx` ya tiene un
-- DEFAULT local con el prompt snowball+ lunes. Si la fila remota tiene NULL,
-- el cliente usa el DEFAULT. Así no hace falta UPDATE masivo en Supabase
-- para los que ya tenían fila creada: el primer `save()` rellenará la columna.
--
-- Decisiones:
--   · Columna TEXT (no VARCHAR(n)): el prompt puede crecer; no acotamos.
--   · Nullable: la app tiene DEFAULT local; fila remota NULL = "usa el default".
--   · Sin default en SQL (sería redundante con el DEFAULT de la app y podría
--     desincronizarse si cambiamos el texto desde la app).
--   · Sin nuevos grants: la tabla `configuracion` ya tiene políticas RLS
--     "own_select/insert/update" (creadas en migration 0002). Esta columna
--     las hereda automáticamente.
-- ============================================================================

alter table configuracion
  add column if not exists prompt_pagos text;

comment on column configuracion.prompt_pagos is
  'Prompt editable que usa el botón IA de /pagos ("Sugerir pagos del próximo mes"). NULL = usar el DEFAULT local en src/lib/configStore.tsx.';

-- Refresca la caché de PostgREST para que la API vea la nueva columna.
notify pgrst, 'reload schema';