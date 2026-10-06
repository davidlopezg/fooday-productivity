-- ============================================================================
-- APLICAR-0019-0020.sql
--
-- Pega TODO esto en Supabase → SQL Editor → Run.
--
-- Son las migraciones 0019 (ámbitos/tags/WIG en `tareas`) y 0020
-- (multi-tarea en Bloque 3 del calendario).
-- Incluyo también la 0018 (ámbitos/tags/WIG en `metas`) por si tampoco
-- la tuvieses aplicada, aunque en principio ya estaba en uso.
--
-- Todas son idempotentes (add column if not exists, etc.), así que se
-- pueden correr varias veces sin romper nada.
-- ============================================================================


-- ############################################################################
-- ## 0018_metas_ambito_tags_wig.sql
-- ############################################################################

-- ============================================================================
-- 0018_metas_ambito_tags_wig.sql
-- Patrón 4DX (The 4 Disciplines of Execution) sobre METAS:
--   1. ÁMBITO — separar metas personales de profesionales.
--   2. TAGS — filtrar/agrupar metas.
--   3. WIG — Wildly Important Goal: máx 3 metas WIG a la vez por owner.
-- ============================================================================

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

create unique index if not exists uq_metas_wig_orden
  on public.metas(owner_id, wig_orden)
  where es_wig and wig_orden is not null;

comment on column public.metas.ambito is
  'Ámbito de la meta: personal o profesional. Null = sin clasificar.';
comment on column public.metas.tags is
  'Etiquetas libres para filtrar/agrupar metas (p.ej. {salud, app, q1-2026}).';
comment on column public.metas.es_wig is
  'Wildly Important Goal (4DX) — meta de alto impacto. Máx 3 a la vez.';
comment on column public.metas.wig_orden is
  'Posición en el panel WIG de metas (1-3). Único por owner cuando es_wig=true.';

-- RPC: marcar/desmarcar WIG respetando el límite de 3.
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
  select es_wig into v_actual
  from public.metas
  where id = p_meta_id and owner_id = v_owner;
  if not found then
    raise exception 'Meta % no encontrada o no es tuya', p_meta_id;
  end if;

  if p_es_wig = v_actual then
    return true;
  end if;

  if p_es_wig then
    select count(*) into v_count
    from public.metas
    where owner_id = v_owner and es_wig = true and id <> p_meta_id;
    if v_count >= 3 then
      return false;
    end if;
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


-- ############################################################################
-- ## 0019_tareas_ambito_tags_wig.sql
-- ############################################################################

-- ============================================================================
-- 0019_tareas_ambito_tags_wig.sql
-- Mismo patrón 4DX que `metas` (migración 0018), pero sobre TAREAS:
--   1. ÁMBITO + TAGS en `tareas`.
--   2. WIG sobre tareas concretas (las 3 acciones que sostienen los WIG-metas).
-- ============================================================================

alter table public.tareas
  add column if not exists ambito text
    check (ambito in ('personal', 'profesional')),
  add column if not exists tags text[] not null default '{}',
  add column if not exists es_wig boolean not null default false,
  add column if not exists wig_orden int
    check (wig_orden is null or wig_orden between 1 and 3);

create index if not exists idx_tareas_ambito on public.tareas(ambito);
create index if not exists idx_tareas_tags on public.tareas using gin (tags);
create index if not exists idx_tareas_wig on public.tareas(owner_id) where es_wig;

create unique index if not exists uq_tareas_wig_orden
  on public.tareas(owner_id, wig_orden)
  where es_wig and wig_orden is not null;

comment on column public.tareas.ambito is
  'Ámbito de la tarea: personal o profesional. Null = sin clasificar.';
comment on column public.tareas.tags is
  'Etiquetas libres para filtrar/agrupar (p.ej. {salud, familia, app}).';
comment on column public.tareas.es_wig is
  'Wildly Important Goal (4DX) — tarea de alto impacto. Máx 3 a la vez.';
comment on column public.tareas.wig_orden is
  'Posición en el panel WIG de tareas (1-3). Único por owner cuando es_wig=true.';

create or replace function public.toggle_tarea_wig(
  p_tarea_id uuid,
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
  select es_wig into v_actual
  from public.tareas
  where id = p_tarea_id and owner_id = v_owner;
  if not found then
    raise exception 'Tarea % no encontrada o no es tuya', p_tarea_id;
  end if;

  if p_es_wig = v_actual then
    return true;
  end if;

  if p_es_wig then
    select count(*) into v_count
    from public.tareas
    where owner_id = v_owner and es_wig = true and id <> p_tarea_id;
    if v_count >= 3 then
      return false;
    end if;
    select min(g) into v_next_orden
    from generate_series(1, 3) g
    where g not in (
      select wig_orden from public.tareas
      where owner_id = v_owner and es_wig = true and wig_orden is not null
    );
    update public.tareas
      set es_wig = true, wig_orden = v_next_orden
      where id = p_tarea_id and owner_id = v_owner;
  else
    update public.tareas
      set es_wig = false, wig_orden = null
      where id = p_tarea_id and owner_id = v_owner;
  end if;
  return true;
end;
$$;

grant execute on function public.toggle_tarea_wig(uuid, boolean) to authenticated;


-- ############################################################################
-- ## 0020_calendario_bloque_operativas.sql
-- ############################################################################

-- ============================================================================
-- 0020_calendario_bloque_operativas.sql
-- Bloque 3 del calendario admite hasta 4 operativas en lote.
-- ============================================================================

alter table public.calendario_bloques
  add column if not exists orden int not null default 0;

alter table public.calendario_bloques
  drop constraint if exists calendario_bloques_owner_id_fecha_numero_bloque_key;

create unique index if not exists uniq_calendario_bloque_single
  on public.calendario_bloques (owner_id, fecha, numero_bloque)
  where numero_bloque in (1, 2, 4);

create index if not exists idx_calendario_bloques_bloque_orden
  on public.calendario_bloques (owner_id, fecha, numero_bloque, orden);

comment on column public.calendario_bloques.orden is
  'Orden dentro del (fecha, bloque). Para Bloque 3 agrupa varias tareas operativas en lote; para bloques 1, 2 y 4 siempre es 0.';


-- ############################################################################
-- ## Refrescar la cache de esquema de PostgREST
-- ############################################################################
-- PostgREST cachea el esquema de las tablas. Tras un ALTER TABLE, a veces
-- sirve forzar el reload para que las próximas requests reconozcan las
-- columnas nuevas al instante (suele refrescarse solo en segundos).
notify pgrst, 'reload schema';
