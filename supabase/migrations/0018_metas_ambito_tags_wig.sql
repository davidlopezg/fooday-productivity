-- ============================================================================
-- 0018_metas_ambito_tags_wig.sql
--
-- Dos conceptos nuevos sobre `metas`:
--
--   1. ÁMBITO + TAGS — separar metas personales de profesionales.
--      · `ambito`: 'personal' | 'profesional' | null (sin clasificar).
--      · `tags`: text[] libre para clasificar (#'salud', #'finanzas',
--        #'app', #'sol-de-nit'…). Sirve para filtrar y para agrupar.
--
--   2. WIG — Wildly Important Goals (4DX, Chris McChesney).
--      Principio clave: "Enfoque en lo Enormemente Importante". Solo un
--      pequeño número de metas de alto impacto a la vez (idealmente 1-3).
--      · `es_wig`: marca la meta como WIG activo.
--      · `wig_orden`: 1, 2 o 3 (para ordenar el panel y limitar a 3).
--
--      Índice único parcial: un owner no puede tener dos WIGs con el
--      mismo `wig_orden`. La app se encarga de que no haya >3 WIGs.
--
-- Idempotente: `add column if not exists`, índice con `if not exists`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helper `current_owner_id()` — auth.uid() con fallback.
--    En el SQL Editor de Supabase las queries corren como superusuario y
--    auth.uid() devuelve NULL. Esta función hace el patrón seguro:
--    usa auth.uid() si existe, si no coge el primer usuario de auth.users.
--    (El seed reusa esta misma función.)
-- ----------------------------------------------------------------------------
create or replace function public.current_owner_id() returns uuid
language sql stable security definer as $$
  select coalesce(
    auth.uid(),
    (select id from auth.users where deleted_at is null order by created_at asc limit 1)
  );
$$;

grant execute on function public.current_owner_id() to authenticated;

-- ----------------------------------------------------------------------------
-- 1. Columnas
-- ----------------------------------------------------------------------------
alter table public.metas
  add column if not exists ambito text
    check (ambito in ('personal', 'profesional')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists es_wig boolean not null default false,
  add column if not exists wig_orden int
    check (wig_orden is null or wig_orden between 1 and 3);

create index if not exists idx_metas_ambito on public.metas(ambito);
create index if not exists idx_metas_tags on public.metas using gin (tags);
create index if not exists idx_metas_wig on public.metas(owner_id) where es_wig;

-- Un owner no puede tener dos WIGs con el mismo orden.
create unique index if not exists uq_metas_wig_orden
  on public.metas(owner_id, wig_orden)
  where es_wig and wig_orden is not null;

-- ----------------------------------------------------------------------------
-- 2. Comentarios (para futuros devs / agentes)
-- ----------------------------------------------------------------------------
comment on column public.metas.ambito is
  'Ámbito de la meta: personal o profesional. Null = sin clasificar.';
comment on column public.metas.tags is
  'Etiquetas libres para filtrar/agrupar (p.ej. {salud,finanzas,app}).';
comment on column public.metas.es_wig is
  'Wildly Important Goal (4DX): meta de alto impacto seleccionada. Máx 3 a la vez.';
comment on column public.metas.wig_orden is
  'Posición en el panel WIG (1-3). Único por owner cuando es_wig=true.';

-- ----------------------------------------------------------------------------
-- 3. RPC helper: marcar/desmarcar WIG respetando el límite de 3.
--    Devuelve true si se pudo aplicar, false si ya hay 3 WIGs.
-- ----------------------------------------------------------------------------
create or replace function public.toggle_meta_wig(
  p_meta_id uuid,
  p_es_wig boolean
) returns boolean
language plpgsql
security invoker
as $$
declare
  v_owner uuid := public.current_owner_id();
  v_actual boolean;
  v_count int;
  v_next_orden int;
begin
  -- Verifica que la meta es del owner.
  select es_wig into v_actual
  from public.metas
  where id = p_meta_id and owner_id = v_owner;
  if not found then
    raise exception 'Meta % no encontrada o no es tuya', p_meta_id;
  end if;

  if p_es_wig = v_actual then
    return true; -- no-op idempotente
  end if;

  if p_es_wig then
    select count(*) into v_count
    from public.metas
    where owner_id = v_owner and es_wig = true and id <> p_meta_id;
    if v_count >= 3 then
      return false; -- ya hay 3 WIGs
    end if;
    -- Busca el primer hueco 1-3 libre.
    select min(g) into v_next_orden
    from generate_series(1, 3) g
    where g not in (
      select wig_orden from public.metas
      where owner_id = v_owner and es_wig = true and wig_orden is not null
    );
    update public.metas
      set es_wig = true, wig_orden = v_next_orden
      where id = p_meta_id and owner_id = v_owner;
  else
    update public.metas
      set es_wig = false, wig_orden = null
      where id = p_meta_id and owner_id = v_owner;
  end if;
  return true;
end;
$$;

grant execute on function public.toggle_meta_wig(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Backfill suave: si ya hay metas con ámbito deducible por área, rellenar.
--    No es obligatorio, pero evita que el panel nazca vacío.
--    (Descomenta y ajusta si quieres auto-clasificar las existentes.)
-- ----------------------------------------------------------------------------
-- update public.metas m
--   set ambito = 'profesional'
--   from public.areas a
--   where m.area_id = a.id
--     and a.nombre in ('Sol de Nit', 'Rent Boats')
--     and m.ambito is null;
-- update public.metas m
--   set ambito = 'personal'
--   from public.areas a
--   where m.area_id = a.id
--     and a.nombre in ('Familia', 'Salud', 'Crecimiento Personal', 'Finanzas')
--     and m.ambito is null;