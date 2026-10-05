-- ============================================================================
-- 0019_tareas_ambito_tags_wig.sql
--
-- Aplica a `tareas` el mismo patrón 4DX que ya vive en `metas` (migration 0018):
--
--   1. ÁMBITO + TAGS — separar tareas personales de profesionales.
--      · `ambito`: 'personal' | 'profesional' | null (sin clasificar).
--      · `tags`: text[] libre (p.ej. {salud, familia, app, sol-de-nit}).
--
--   2. WIG — Wildly Important Goals también sobre tareas.
--      Las METAS ya tienen su panel WIG (máx 3). Ahora las TAREAS
--      concretas que ejecutan esas metas también pueden ascender a WIG:
--      las 3 acciones diarias/semanales que SOSTIENEN los WIG de metas.
--      Cap independiente: máx 3 WIG-tareas por owner (no se mezclan con
--      los WIG-metas; son dos planos distintos).
--
-- Idempotente: `add column if not exists`, índices con `if not exists`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas
-- ----------------------------------------------------------------------------
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

-- Un owner no puede tener dos WIG-tareas con el mismo orden.
create unique index if not exists uq_tareas_wig_orden
  on public.tareas(owner_id, wig_orden)
  where es_wig and wig_orden is not null;

-- ----------------------------------------------------------------------------
-- 2. Comentarios
-- ----------------------------------------------------------------------------
comment on column public.tareas.ambito is
  'Ámbito de la tarea: personal o profesional. Null = sin clasificar.';
comment on column public.tareas.tags is
  'Etiquetas libres para filtrar/agrupar (p.ej. {salud, familia, app}).';
comment on column public.tareas.es_wig is
  'Wildly Important Goal (4DX) — tarea de alto impacto. Máx 3 a la vez.';
comment on column public.tareas.wig_orden is
  'Posición en el panel WIG de tareas (1-3). Único por owner cuando es_wig=true.';

-- ----------------------------------------------------------------------------
-- 3. RPC helper: marcar/desmarcar WIG respetando el límite de 3.
--    Devuelve true si se pudo aplicar, false si ya hay 3 WIGs.
--    Réplica de `toggle_meta_wig` pero sobre `tareas`.
-- ----------------------------------------------------------------------------
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
  -- Verifica que la tarea es del owner.
  select es_wig into v_actual
  from public.tareas
  where id = p_tarea_id and owner_id = v_owner;
  if not found then
    raise exception 'Tarea % no encontrada o no es tuya', p_tarea_id;
  end if;

  if p_es_wig = v_actual then
    return true; -- no-op idempotente
  end if;

  if p_es_wig then
    select count(*) into v_count
    from public.tareas
    where owner_id = v_owner and es_wig = true and id <> p_tarea_id;
    if v_count >= 3 then
      return false; -- ya hay 3 WIG-tareas
    end if;
    -- Busca el primer hueco 1-3 libre.
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