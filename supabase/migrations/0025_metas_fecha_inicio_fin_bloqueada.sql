-- ============================================================================
-- 0025_metas_fecha_inicio_fin_bloqueada.sql
-- Sustituye el campo libre `plazo` (texto) por dos fechas reales + un flag
-- que indica si la fecha_fin es dura (no se mueve). Esto permite que el
-- planificador distribuya los KRs dentro de un rango real, no a 4
-- trimestres fijos.
--
-- Decisiones (ponytail — mínimo que funcione):
--   · `fecha_inicio_meta` (date, nullable). Si null → asumimos "hoy" en el caller.
--   · `fecha_fin_bloqueada` (bool, default false). Distingue "deseo" de
--     "fecha dura — no se mueve". El prompt del planificador trata las
--     bloqueadas como hard constraint.
--   · Reusamos `fecha_objetivo` (migration 0024) como `fecha_fin` operativa;
--     NO duplicamos columnas. Solo añadimos el flag `bloqueada` al lado.
--   · Nullable todo → metas viejas siguen funcionando como hasta ahora
--     (la UI degrada a "sin plazo definido" y el planificador usa el
--     comportamiento previo: 4 trimestres por defecto).
--
-- No se renombra `plazo` para no romper el parser actual ni el historial.
-- La migración se aprovecha cuando los formularios empiecen a usar las
-- fechas reales (PR /metas/nueva + EditarMetaModal).
-- ============================================================================

-- 1. metas.fecha_inicio_meta: cuándo puede David empezar a trabajar la meta.
alter table public.metas
  add column if not exists fecha_inicio_meta date;

create index if not exists idx_metas_fecha_inicio_meta
  on public.metas(fecha_inicio_meta)
  where fecha_inicio_meta is not null;

-- 2. metas.fecha_fin_bloqueada: ¿la fecha objetivo es dura?
alter table public.metas
  add column if not exists fecha_fin_bloqueada boolean not null default false;

-- ============================================================================
-- 3. RPC ensure_periodos_meses
-- ----------------------------------------------------------------------------
-- Idempotente: crea los periodos mensuales (tipo='mes') que falten entre
-- (anio, mes_inicio) y (anio, mes_fin). Devuelve la lista completa de
-- meses pedidos + los trimestres presentes en su ventana (para no romper
-- callers que mezclan los dos tipos al materializar el plan).
--
-- Ejemplo de uso desde cliente (TS):
--   await supabase.rpc("ensure_periodos_meses", { p_anio: 2026, p_mes_inicio: 5, p_mes_fin: 11 })
-- ============================================================================
create or replace function public.ensure_periodos_meses(
  p_anio int,
  p_mes_inicio int,
  p_mes_fin int
)
returns setof public.periodos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  m int;
  v_nombre text;
  v_fi date;
  v_ff date;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;
  if p_mes_inicio < 1 or p_mes_inicio > 12 or p_mes_fin < 1 or p_mes_fin > 12 then
    raise exception 'Los meses deben estar entre 1 y 12';
  end if;
  if p_mes_fin < p_mes_inicio then
    raise exception 'p_mes_fin debe ser >= p_mes_inicio';
  end if;

  for m in p_mes_inicio..p_mes_fin loop
    v_nombre := case m
      when 1  then 'Enero' when 2  then 'Febrero' when 3  then 'Marzo'
      when 4  then 'Abril' when 5  then 'Mayo'    when 6  then 'Junio'
      when 7  then 'Julio' when 8  then 'Agosto'  when 9  then 'Septiembre'
      when 10 then 'Octubre' when 11 then 'Noviembre' when 12 then 'Diciembre'
    end || ' ' || p_anio;
    v_fi := make_date(p_anio, m, 1);
    v_ff := (make_date(p_anio, m, 1) + interval '1 month' - interval '1 day')::date;
    insert into public.periodos (owner_id, tipo, anio, numero, nombre, fecha_inicio, fecha_fin)
    values (v_owner, 'mes', p_anio, m, v_nombre, v_fi, v_ff)
    on conflict (owner_id, tipo, anio, numero) do nothing;
  end loop;

  return query
    select * from public.periodos
    where owner_id = v_owner and tipo = 'mes' and anio = p_anio
      and numero between p_mes_inicio and p_mes_fin
    order by numero;
end;
$$;

grant execute on function public.ensure_periodos_meses(int, int, int) to authenticated;

-- Refresca la caché de PostgREST.
notify pgrst, 'reload schema';
