-- ============================================================================
-- 0017_calendario_bloques.sql
-- Time-blocking: asignar tareas a bloques horarios concretos en una fecha.
--
-- El pilar 3 (Gestión del tiempo) recomienda BLOQUEAR TIEMPO: asignar
-- bloques específicos en el calendario a tareas prioritarias evita el
-- coste de hasta 40% de pérdida de productividad por cambio de contexto.
--
-- Diseño:
--   * `calendario_bloques` = (fecha, numero_bloque, tarea_id opcional).
--   * `numero_bloque` ∈ {1,2,3,4} — coincide con BLOQUE_HORARIO en
--     `src/lib/semana.ts` (11-12, 12-13, 15-16, 16-17).
--   * `tarea_id` NULL = bloque libre (sin asignar).
--   * Constraint UNIQUE (owner_id, fecha, numero_bloque) — solo 1 tarea
--     por bloque. Si quieres meter 2, crea 2 bloques consecutivos (no
--     implementamos multi-tarea por bloque: complica la UI sin valor).
--   * RLS misma política que el resto.
-- ============================================================================

create table if not exists public.calendario_bloques (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha         date not null,
  numero_bloque int  not null check (numero_bloque between 1 and 4),
  tarea_id      uuid references public.tareas(id) on delete set null,
  nota          text,                          -- p.ej. "bloque de creación, no meetings"
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, fecha, numero_bloque)
);

create index if not exists idx_calendario_bloques_owner_fecha
  on public.calendario_bloques(owner_id, fecha);

create index if not exists idx_calendario_bloques_tarea
  on public.calendario_bloques(tarea_id);

-- Trigger updated_at
drop trigger if exists trg_calendario_bloques_updated on public.calendario_bloques;
create trigger trg_calendario_bloques_updated before update on public.calendario_bloques
  for each row execute function public.set_updated_at();

-- RLS
alter table public.calendario_bloques enable row level security;

drop policy if exists "own_select" on public.calendario_bloques;
drop policy if exists "own_insert" on public.calendario_bloques;
drop policy if exists "own_update" on public.calendario_bloques;
drop policy if exists "own_delete" on public.calendario_bloques;

create policy "own_select" on public.calendario_bloques
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.calendario_bloques
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.calendario_bloques
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.calendario_bloques
  for delete using (owner_id = auth.uid());

comment on table public.calendario_bloques is
  'Time-blocking: una tarea concreta por bloque horario en cada fecha.';