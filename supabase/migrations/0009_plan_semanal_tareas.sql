-- ============================================================================
-- 0009_plan_semanal_tareas.sql
-- Planificación semanal: a qué día de qué semana está asignada cada tarea.
-- Una tarea puede aparecer como máximo UNA vez por semana; cambiar de día
-- se hace con UPDATE sobre la misma fila (o arrastrando en el Kanban).
--
-- Diferencias con `planes_semanales` (que ya existe):
--   - `planes_semanales`     → cabecera estratégica de la semana (BHAG/OKR/resumen).
--   - `plan_semanal_tareas`  → relaciones tarea↔día↔semana (este archivo).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------
create table if not exists public.plan_semanal_tareas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio        int  not null,                                   -- p.ej. 2025
  semana_iso  int  not null check (semana_iso between 1 and 53),
  tarea_id    uuid not null references public.tareas(id) on delete cascade,
  dia_semana  int  not null check (dia_semana between 1 and 7), -- ISO: 1=lunes .. 7=domingo
  orden       int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Misma tarea no puede estar 2 veces en la misma semana.
  -- Si se quiere mover de día, se hace UPDATE sobre la misma fila.
  unique (owner_id, anio, semana_iso, tarea_id)
);

create index if not exists idx_plan_semanal_tareas_semana
  on public.plan_semanal_tareas(owner_id, anio, semana_iso);

create index if not exists idx_plan_semanal_tareas_tarea
  on public.plan_semanal_tareas(tarea_id);

-- updated_at trigger
drop trigger if exists trg_plan_semanal_tareas_updated on public.plan_semanal_tareas;
create trigger trg_plan_semanal_tareas_updated before update on public.plan_semanal_tareas
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. RLS (mismo patrón que el resto del proyecto: cada usuario solo ve lo suyo)
-- ----------------------------------------------------------------------------
alter table public.plan_semanal_tareas enable row level security;

drop policy if exists "own_select" on public.plan_semanal_tareas;
drop policy if exists "own_insert" on public.plan_semanal_tareas;
drop policy if exists "own_update" on public.plan_semanal_tareas;
drop policy if exists "own_delete" on public.plan_semanal_tareas;

create policy "own_select" on public.plan_semanal_tareas
  for select using (owner_id = auth.uid());

create policy "own_insert" on public.plan_semanal_tareas
  for insert with check (owner_id = auth.uid());

create policy "own_update" on public.plan_semanal_tareas
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "own_delete" on public.plan_semanal_tareas
  for delete using (owner_id = auth.uid());