-- ============================================================================
-- APLICAR-0022.sql
--
-- Pega TODO esto en Supabase → SQL Editor → Run.
--
-- Expone el schema `pagos` a la API de PostgREST. Si no aplicas esta
-- migración, la pantalla /pagos fallará con "permission denied for
-- schema pagos" aunque la RLS esté bien.
--
-- Idempotente: se puede correr varias veces.
-- ============================================================================


-- ############################################################################
-- ## 0022_pagos_grants.sql
-- ############################################################################

-- ============================================================================
-- 0022_pagos_grants.sql
-- EXPONE el schema `pagos` a la API de PostgREST.
--
-- Por qué esta migración existe:
--   Por defecto, PostgREST solo expone los schemas configurados en
--   `pgrst.db_schemas` (en Supabase Cloud suele ser
--   `public, storage, graphql_public`). Cualquier tabla/función en un
--   schema NO listado es INVISIBLE para `supabase-js` aunque la RLS esté
--   perfecta. Los `GRANT` sobre tablas concretas NO son suficientes: la
--   API no llega a ellos si el schema entero no está expuesto.
--
--   Por eso `createClient().schema('pagos').from('pagos')` fallaba con
--   "permission denied for schema pagos" en producción aunque la query
--   funcionara en el SQL editor.
--
-- Tres cosas que hace esta migración:
--   1. ALTER ROLE authenticator: añade `pagos` a `pgrst.db_schemas`.
--      Tras un `NOTIFY pgrst, 'reload config'`, PostgREST lo relee y
--      empieza a servir el schema.
--   2. GRANTs sobre schema/tablas/secuencias/funciones de `pagos`
--      (también en `auth` por si la policy RLS no tenía acceso).
--   3. ALTER DEFAULT PRIVILEGES para que cualquier objeto NUEVO en
--      `pagos` herede los GRANTs automáticamente.
--
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Exponer el schema `pagos` a PostgREST
-- ----------------------------------------------------------------------------
-- `pgrst.db_schemas` es la lista de schemas que PostgREST expone.
-- El default en Supabase Cloud es 'public, storage, graphql_public'.
-- Añado 'pagos' (si no está ya).
do $$
declare
  v_actual text;
  v_lista text[];
  v_nuevo text;
begin
  v_actual := current_setting('pgrst.db_schemas', true);
  if v_actual is null or v_actual = '' then
    v_actual := 'public, storage, graphql_public';
  end if;
  v_lista := string_to_array(v_actual, ',');
  -- limpiar espacios y quedarnos con los que no estén vacíos
  for i in 1..array_length(v_lista, 1) loop
    v_lista[i] := trim(v_lista[i]);
  end loop;
  if 'pagos' = any(v_lista) is distinct from true then
    v_lista := array_append(v_lista, 'pagos');
    v_nuevo := array_to_string(v_lista, ', ');
    execute format('alter role authenticator set pgrst.db_schemas = %L', v_nuevo);
    raise notice 'pgrst.db_schemas actualizado a: %', v_nuevo;
  else
    raise notice 'pgrst.db_schemas ya incluye "pagos" — no se modifica';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. GRANTs sobre el schema `pagos`
-- ----------------------------------------------------------------------------
-- USAGE: poder "entrar" al schema (sin esto, todo lo demás falla).
-- ALL ON TABLES: select/insert/update/delete para que la app pueda CRUD.
-- ALL ON SEQUENCES: por si en el futuro usas serial/bigserial.
-- ALL ON FUNCTIONS: para las RPC (`registrar_pago`, `refresh_vencidos`...).

grant usage on schema pagos to anon, authenticated, authenticator;

grant select, insert, update, delete
  on all tables in schema pagos
  to anon, authenticated, authenticator;

grant usage, select
  on all sequences in schema pagos
  to anon, authenticated, authenticator;

grant execute
  on all functions in schema pagos
  to anon, authenticated, authenticator;

-- ----------------------------------------------------------------------------
-- 3. GRANTs sobre el schema `auth` (por si la RLS los necesita)
-- ----------------------------------------------------------------------------
-- Las policies de `pagos.*` usan `auth.uid()` y comparan con `owner_id`.
-- Si el rol authenticator no puede ni leer `auth.users`, la policy falla
-- y todas las queries devuelven 0 filas (o error de permisos).
grant usage on schema auth to anon, authenticated, authenticator;
grant select on auth.users to anon, authenticated, authenticator;
grant execute on function auth.uid() to anon, authenticated, authenticator;

-- ----------------------------------------------------------------------------
-- 4. DEFAULT PRIVILEGES — para que objetos NUEVOS hereden los GRANTs
-- ----------------------------------------------------------------------------
-- Si en el futuro añades una tabla o función a `pagos` y no quieres
-- acordarte de los GRANTs, ALTER DEFAULT PRIVILEGES los aplica solo.
-- Importante: aplica a objetos creados por el rol que EJECUTA esta
-- migración (típicamente `postgres` en Supabase).

alter default privileges in schema pagos
  grant select, insert, update, delete
  on tables to anon, authenticated, authenticator;

alter default privileges in schema pagos
  grant usage, select
  on sequences to anon, authenticated, authenticator;

alter default privileges in schema pagos
  grant execute
  on functions to anon, authenticated, authenticator;

-- ----------------------------------------------------------------------------
-- 5. Refresca la caché de PostgREST (esquema + config)
-- ----------------------------------------------------------------------------
-- `reload schema` recarga el esquema; `reload config` recarga el setting
-- `pgrst.db_schemas` que acabamos de tocar.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
