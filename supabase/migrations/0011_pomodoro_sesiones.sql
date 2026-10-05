-- ============================================================================
-- 0011_pomodoro_sesiones.sql
-- Registro de sesiones pomodoro completadas vinculadas a una subtarea.
--
-- Diseño:
--   * Se inserta UNA fila cuando el usuario TERMINA un pomodoro de foco
--     (no cuando lo inicia, no cuando lo aborta). Esto mantiene la métrica
--     limpia: cada fila = 1 unidad de foco real.
--   * Vinculada a `tareas_subtareas` (no a `tareas`) para poder medir
--     granularidad fina (qué micro-paso comía más tiempo).
--   * `on_delete cascade` en las FK → si borras la tarea o la subtarea, se
--     va también el histórico (decisión consciente: evita huérfanos).
--   * `duracion_seg` para poder distinguir pomodoros "de serie" (25 min)
--     de "express" (5 min). El motor registra lo que el usuario hizo, no
--     lo que se supone que tenía que hacer.
--   * RLS por owner, mismo patrón que el resto del proyecto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------
create table if not exists public.pomodoro_sesiones (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id      uuid not null references public.tareas(id) on delete cascade,
  subtarea_id   uuid references public.tareas_subtareas(id) on delete cascade,
  started_at    timestamptz not null,            -- cuándo se pulsó start
  ended_at      timestamptz not null,            -- cuándo terminó el pomodoro
  duracion_seg  int  not null check (duracion_seg > 0),
  -- 'focus' | 'descanso_corto' | 'descanso_largo' — por si más adelante
  -- se quiere medir también los descansos completados.
  fase          text not null check (fase in ('focus', 'descanso_corto', 'descanso_largo')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_pomodoro_sesiones_owner_started
  on public.pomodoro_sesiones(owner_id, started_at desc);

create index if not exists idx_pomodoro_sesiones_tarea
  on public.pomodoro_sesiones(tarea_id);

create index if not exists idx_pomodoro_sesiones_subtarea
  on public.pomodoro_sesiones(subtarea_id);

-- ----------------------------------------------------------------------------
-- 2. RLS — mismo patrón que el resto del proyecto (cada user solo lo suyo)
-- ----------------------------------------------------------------------------
alter table public.pomodoro_sesiones enable row level security;

drop policy if exists "own_select" on public.pomodoro_sesiones;
drop policy if exists "own_insert" on public.pomodoro_sesiones;
drop policy if exists "own_update" on public.pomodoro_sesiones;
drop policy if exists "own_delete" on public.pomodoro_sesiones;

-- Solo lectura, insert y delete: NO permitimos update (una sesión
-- completada no se modifica, se borra si te arrepientes).
create policy "own_select" on public.pomodoro_sesiones
  for select using (owner_id = auth.uid());

create policy "own_insert" on public.pomodoro_sesiones
  for insert with check (owner_id = auth.uid());

create policy "own_delete" on public.pomodoro_sesiones
  for delete using (owner_id = auth.uid());
