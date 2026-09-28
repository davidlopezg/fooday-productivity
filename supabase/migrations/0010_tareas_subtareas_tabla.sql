-- ============================================================================
-- 0010_tareas_subtareas_tabla.sql
-- Migra `tareas.subtareas` (JSONB) a una tabla relacional `tareas_subtareas`.
--
-- Motivación: las subtareas son interactivas (check/anadir/reordenar), se
-- cuentan en métricas y se cruzan con el resto del dominio (auto-completar
-- tarea cuando todas lo están, próximas micro-acciones, sync offline fino).
-- Mantenerlas como JSONB impedía queries e índices; el resto del proyecto ya
-- usa tablas relacionales para entidades hermanas (`plan_diario_subtareas`,
-- `tarea_adjuntos`).
--
-- Idempotente: si la columna JSONB ya no existe, la migración de datos y el
-- DROP son no-op. Si la tabla ya existe, no se recrea.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------
create table if not exists public.tareas_subtareas (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id             uuid not null references public.tareas(id) on delete cascade,
  descripcion          text not null,
  tiempo_estimado_min  int  check (tiempo_estimado_min is null or tiempo_estimado_min between 1 and 5),
  hecho                boolean not null default false,
  orden                int  not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_tareas_subtareas_tarea
  on public.tareas_subtareas(tarea_id);

create index if not exists idx_tareas_subtareas_owner_tarea
  on public.tareas_subtareas(owner_id, tarea_id);

create index if not exists idx_tareas_subtareas_pendientes
  on public.tareas_subtareas(tarea_id) where hecho = false;

-- updated_at trigger (mismo helper que el resto del proyecto)
drop trigger if exists trg_tareas_subtareas_updated on public.tareas_subtareas;
create trigger trg_tareas_subtareas_updated before update on public.tareas_subtareas
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. RLS — mismo patrón que el resto del proyecto (cada user solo lo suyo)
-- ----------------------------------------------------------------------------
alter table public.tareas_subtareas enable row level security;

drop policy if exists "own_select" on public.tareas_subtareas;
drop policy if exists "own_insert" on public.tareas_subtareas;
drop policy if exists "own_update" on public.tareas_subtareas;
drop policy if exists "own_delete" on public.tareas_subtareas;

create policy "own_select" on public.tareas_subtareas
  for select using (owner_id = auth.uid());

create policy "own_insert" on public.tareas_subtareas
  for insert with check (owner_id = auth.uid());

create policy "own_update" on public.tareas_subtareas
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "own_delete" on public.tareas_subtareas
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Migración de datos: JSONB -> filas
-- Solo se ejecuta si la columna `tareas.subtareas` (JSONB) todavía existe.
-- Convierte cada elemento del array en una fila preservando orden y `hecho`.
-- ----------------------------------------------------------------------------
do $$
declare
  v_count int;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tareas'
      and column_name  = 'subtareas'
      and data_type    = 'jsonb'
  ) then
    -- Limpia cualquier residuo previo en la tabla destino (por si se re-ejecuta).
    delete from public.tareas_subtareas ts
    where exists (
      select 1 from public.tareas t
      where t.id = ts.tarea_id
        and t.subtareas is not null
        and jsonb_typeof(t.subtareas) = 'array'
    );

    -- Inserta las filas a partir del JSONB.
    with parsed as (
      select
        t.id              as tarea_id,
        t.owner_id        as owner_id,
        b.ord             as orden,
        nullif(btrim(coalesce(b.elem->>'descripcion', '')), '') as descripcion,
        case
          when (b.elem ? 'tiempo_estimado_min')
               and (b.elem->>'tiempo_estimado_min') ~ '^[0-9]+$'
               and (b.elem->>'tiempo_estimado_min')::int between 1 and 5
            then (b.elem->>'tiempo_estimado_min')::int
          else null
        end              as tiempo_estimado_min,
        coalesce((b.elem->>'hecho')::boolean, false) as hecho
      from public.tareas t
      cross join lateral jsonb_array_elements(t.subtareas)
        with ordinality as b(elem, ord)
      where t.subtareas is not null
        and jsonb_typeof(t.subtareas) = 'array'
    )
    insert into public.tareas_subtareas
      (tarea_id, owner_id, orden, descripcion, tiempo_estimado_min, hecho)
    select tarea_id, owner_id, orden, descripcion, tiempo_estimado_min, hecho
    from parsed
    where descripcion is not null;

    get diagnostics v_count = row_count;
    raise notice '[0010] Migradas % subtareas de JSONB a tabla', v_count;
  else
    raise notice '[0010] Columna tareas.subtareas (JSONB) ya no existe — nada que migrar';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Eliminar la columna JSONB (ya está vaciada)
-- ----------------------------------------------------------------------------
alter table public.tareas drop column if exists subtareas;