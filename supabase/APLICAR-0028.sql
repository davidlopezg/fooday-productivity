-- ============================================================================
-- APLICAR-0028.sql
-- Pegar TODO esto en Supabase → SQL Editor → Run.
--
-- Aplica la migración 0028 (metas.fecha_cierre + trigger + backfill) en
-- una base de datos existente. Idempotente.
-- ============================================================================

alter table public.metas
  add column if not exists fecha_cierre timestamptz null;

comment on column public.metas.fecha_cierre is
  'Cuándo se cerró la meta (estado pasó a completada). NULL si nunca se ha cerrado. Se limpia si la meta se reabre.';

create or replace function public.set_metas_fecha_cierre()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'completada'
     and (old.estado is null or old.estado <> 'completada') then
    new.fecha_cierre := now();
  elsif new.estado <> 'completada' then
    new.fecha_cierre := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_metas_fecha_cierre on public.metas;
create trigger trg_metas_fecha_cierre
  before update on public.metas
  for each row execute function public.set_metas_fecha_cierre();

update public.metas
  set fecha_cierre = updated_at
  where estado = 'completada'
    and fecha_cierre is null
    and updated_at is not null;
