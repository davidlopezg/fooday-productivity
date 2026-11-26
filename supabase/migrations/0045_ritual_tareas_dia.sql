-- ============================================================================
-- 0045_ritual_tareas_dia.sql
--
-- LAS 3 DEL DÍA — el compromiso diario de la semana (issue #89).
--
-- EL PROBLEMA QUE RESUELVE
-- -----------------------
-- El ritual semanal (issue #88) decide QUÉ (proyectos, metas, WIGs, KRs) y
-- /semana reparte las tareas por días. Faltaba una cosa: de todo lo que hay
-- repartido en la semana, ¿con CUÁLES 3 tareas te comprometes cada día?
-- El plan diario (IA) propone, pero la propuesta no es un compromiso: es
-- una sugerencia que cambia con el estado de ánimo.
--
-- QUÉ ES ESTA TABLA
--   El compromiso: 3 tareas por día (ISO 1=lunes .. 7=domingo) para una
--   semana ISO. Es una CAPA NUEVA, pero NO es un WIG diario:
--     · NO toca `tareas.es_wig` (esa es la capa de CICLO, máx 3, global).
--     · NO toca `plan_diario_tareas` (la propuesta del plan del día).
--     · Es por SEMANA y por DÍA, y se puede cambiar freely.
--   El cap de 3 lo impone un TRIGGER (igual que el cupo de 10 activas).
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · `fecha` (el día concreto, YYYY-MM-DD) se guarda en la fila para poder
--     preguntar "las 3 de HOY" sin recalcular la semana ISO en la consulta.
--   · `unique (owner, anio, semana_iso, dia_semana, orden)`: un hueco por
--     posición, y `unique (owner, anio, semana_iso, tarea_id)`: la misma
--     tarea no ocupa dos huecos del mismo día.
--   · Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

create table if not exists public.ritual_tareas_dia (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio        int  not null,
  semana_iso  int  not null check (semana_iso between 1 and 53),
  dia_semana  int  not null check (dia_semana between 1 and 7),
  orden       int  not null check (orden between 1 and 3),
  tarea_id    uuid not null references public.tareas(id) on delete cascade,
  fecha       date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, anio, semana_iso, dia_semana, orden),
  unique (owner_id, anio, semana_iso, tarea_id)
);

create index if not exists idx_ritual_tareas_dia_semana
  on public.ritual_tareas_dia(owner_id, anio, semana_iso);

create index if not exists idx_ritual_tareas_dia_fecha
  on public.ritual_tareas_dia(owner_id, fecha);

drop trigger if exists trg_ritual_tareas_dia_updated on public.ritual_tareas_dia;
create trigger trg_ritual_tareas_dia_updated before update on public.ritual_tareas_dia
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Cap de 3 por día (lo impone la BD, no la UI).
-- ----------------------------------------------------------------------------
create or replace function public.trg_ritual_tareas_dia_cap()
returns trigger
language plpgsql
as $$
declare
  v_otros int;
begin
  select count(*) into v_otros
    from public.ritual_tareas_dia
   where owner_id = new.owner_id
     and anio = new.anio
     and semana_iso = new.semana_iso
     and dia_semana = new.dia_semana
     and id is distinct from new.id;

  if v_otros >= 3 then
    raise exception
      'Ese dia ya tiene 3 tareas comprometidas. Quita una antes de anadir otra.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ritual_tareas_dia_cap on public.ritual_tareas_dia;
create trigger trg_ritual_tareas_dia_cap
  before insert or update on public.ritual_tareas_dia
  for each row execute function public.trg_ritual_tareas_dia_cap();

-- ----------------------------------------------------------------------------
-- RLS (mismo patrón que el resto del proyecto).
-- ----------------------------------------------------------------------------
alter table public.ritual_tareas_dia enable row level security;

drop policy if exists "own_select" on public.ritual_tareas_dia;
drop policy if exists "own_insert" on public.ritual_tareas_dia;
drop policy if exists "own_update" on public.ritual_tareas_dia;
drop policy if exists "own_delete" on public.ritual_tareas_dia;

create policy "own_select" on public.ritual_tareas_dia for select using (owner_id = auth.uid());
create policy "own_insert" on public.ritual_tareas_dia for insert with check (owner_id = auth.uid());
create policy "own_update" on public.ritual_tareas_dia for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.ritual_tareas_dia for delete using (owner_id = auth.uid());

comment on table public.ritual_tareas_dia is
  'Las 3 del dia: el compromiso de tareas por dia de una semana ISO (max 3 por dia, cap impuesto por trigger). Capa de RITUAL: no es `tareas.es_wig` (ciclo, max 3 global) ni el plan diario (propuesta).';
