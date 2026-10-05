-- ============================================================================
-- 0012_proyectos_comentarios_recurrencia.sql
-- 3 features en un solo migration (cohesión, menos deploys):
--   1. Proyectos: tabla `proyectos` + FK desde `tareas`.
--   2. Comentarios con @menciones: tabla `tarea_comentarios`.
--   3. Tareas recurrentes: columnas en `tareas` + helper RPC `clone_recurring`.
--
-- Decisiones de diseño (ponytail — la solución más simple que funcione):
--   - Proyectos SIN jerarquía: un nivel. Si quieres anidar, vuelve a crear.
--     "categorías anidadas" es feature creep para un sistema personal.
--   - Recurrencia SIN librería rrule: 3 tipos (diaria/semanal/mensual) con
--     campos simples. Cubre el 95% de uso real. Si quieres algo más
--     complejo, mira qué patrón tienes y lo cambiamos.
--   - @menciones: una sola persona (auth.uid()). Los @tags son palabras
--     que el usuario escribe para poder filtrar comentarios después
--     (p.ej. @maria, @abril, @urgente). Sin notificaciones.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROYECTOS
-- ----------------------------------------------------------------------------
create table if not exists public.proyectos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  color       text default '#64748b',
  descripcion text,
  orden       int not null default 0,
  archivado   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, nombre)
);

create index if not exists idx_proyectos_owner on public.proyectos(owner_id);

-- FK desde tareas (opcional — un proyecto puede no tener tareas todavía).
alter table public.tareas
  add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;

create index if not exists idx_tareas_proyecto on public.tareas(proyecto_id);

-- Trigger updated_at
drop trigger if exists trg_proyectos_updated on public.proyectos;
create trigger trg_proyectos_updated before update on public.proyectos
  for each row execute function public.set_updated_at();

-- RLS
alter table public.proyectos enable row level security;

drop policy if exists "own_select" on public.proyectos;
drop policy if exists "own_insert" on public.proyectos;
drop policy if exists "own_update" on public.proyectos;
drop policy if exists "own_delete" on public.proyectos;

create policy "own_select" on public.proyectos
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.proyectos
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.proyectos
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.proyectos
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. COMENTARIOS + @MENCIONES
-- ----------------------------------------------------------------------------
create table if not exists public.tarea_comentarios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id    uuid not null references public.tareas(id) on delete cascade,
  cuerpo      text not null,
  -- "tags" se extrae server-side (o client-side) del cuerpo al insertar:
  -- p.ej. "@maria te llamo mañana" → ['maria']. Sirve para filtrar.
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tarea_comentarios_tarea
  on public.tarea_comentarios(tarea_id, created_at desc);
create index if not exists idx_tarea_comentarios_tags
  on public.tarea_comentarios using gin (tags);

drop trigger if exists trg_tarea_comentarios_updated on public.tarea_comentarios;
create trigger trg_tarea_comentarios_updated before update on public.tarea_comentarios
  for each row execute function public.set_updated_at();

alter table public.tarea_comentarios enable row level security;

drop policy if exists "own_select" on public.tarea_comentarios;
drop policy if exists "own_insert" on public.tarea_comentarios;
drop policy if exists "own_update" on public.tarea_comentarios;
drop policy if exists "own_delete" on public.tarea_comentarios;

create policy "own_select" on public.tarea_comentarios
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.tarea_comentarios
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.tarea_comentarios
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.tarea_comentarios
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. TAREAS RECURRENTES
-- ----------------------------------------------------------------------------
-- Columnas en `tareas` (en lugar de tabla aparte — son 1:1 con la tarea):
--   * recurrencia_tipo: 'diaria' | 'semanal' | 'mensual' | null
--   * recurrencia_dias_semana: int[] 0..6 (semanal)
--   * recurrencia_dia_mes: int 1..28 (mensual, cap 28 para evitar problemas con feb)
--   * recurrencia_ultima_generada: date  (última vez que se clonó)
alter table public.tareas
  add column if not exists recurrencia_tipo text
    check (recurrencia_tipo in ('diaria', 'semanal', 'mensual'));
alter table public.tareas
  add column if not exists recurrencia_dias_semana int[];
alter table public.tareas
  add column if not exists recurrencia_dia_mes int check (recurrencia_dia_mes between 1 and 28);
alter table public.tareas
  add column if not exists recurrencia_ultima_generada date;

-- ----------------------------------------------------------------------------
-- 4. RPC: clonar tarea recurrente con la siguiente fecha
-- ----------------------------------------------------------------------------
-- Se llama desde la app al marcar como hecha una tarea recurrente.
-- Crea una nueva tarea igual (mismo título/desc/proyecto/area/capa/...) pero
-- en estado 'pendiente' y con nueva fecha/orden.
create or replace function public.clone_recurring_task(
  p_tarea_id uuid,
  p_nueva_fecha date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_tarea public.tareas%rowtype;
  v_nueva_id uuid;
begin
  select * into v_tarea from public.tareas where id = p_tarea_id;
  if v_tarea.id is null then
    raise exception 'Tarea % no encontrada', p_tarea_id;
  end if;
  if v_tarea.recurrencia_tipo is null then
    raise exception 'La tarea % no es recurrente', p_tarea_id;
  end if;

  insert into public.tareas (
    owner_id, area_id, meta_id, proyecto_id, codigo, titulo, descripcion,
    prioridad, capa, deadline, pts, esfuerzo, importe, estado, origen, notas,
    criterio_terminacion,
    recurrencia_tipo, recurrencia_dias_semana, recurrencia_dia_mes,
    recurrencia_ultima_generada
  ) values (
    v_tarea.owner_id, v_tarea.area_id, v_tarea.meta_id, v_tarea.proyecto_id,
    v_tarea.codigo, v_tarea.titulo, v_tarea.descripcion,
    v_tarea.prioridad, v_tarea.capa, p_nueva_fecha, v_tarea.pts, v_tarea.esfuerzo,
    v_tarea.importe, 'pendiente', 'recurrencia', v_tarea.notas,
    v_tarea.criterio_terminacion,
    v_tarea.recurrencia_tipo, v_tarea.recurrencia_dias_semana,
    v_tarea.recurrencia_dia_mes, p_nueva_fecha
  )
  returning id into v_nueva_id;

  -- Clona también las subtareas (todas en no-hechas)
  insert into public.tareas_subtareas (owner_id, tarea_id, descripcion, tiempo_estimado_min, orden, hecho)
  select owner_id, v_nueva_id, descripcion, tiempo_estimado_min, orden, false
  from public.tareas_subtareas
  where tarea_id = p_tarea_id;

  return v_nueva_id;
end;
$$;

-- Permisos de la RPC
grant execute on function public.clone_recurring_task(uuid, date) to authenticated;
