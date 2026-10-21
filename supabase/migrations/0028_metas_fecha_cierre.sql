-- ============================================================================
-- 0028_metas_fecha_cierre.sql
-- Fecha real de cierre de metas (no proxy de updated_at).
--
-- Por qué:
--   /informes filtraba `metasCompletadas` por `metas.updated_at`, lo cual
--   es solo un proxy: si reabres una meta cerrada hace 6 meses y le añades
--   una tarea hoy, su updated_at pasa a hoy y la métrica "cerradas en los
--   últimos 7 días" se infla. La dirección inversa también miente: una
--   meta cerrada esta semana y no tocada después sale en otro bucket.
--
-- Solución:
--   * Columna `fecha_cierre timestamptz NULL`. Se rellena con `now()` cuando
--     `estado` pasa a `'completada'` por primera vez y se limpia si la meta
--     vuelve a abrirse. La fija el trigger, no la app.
--   * El trigger se llama `trg_metas_fecha_cierre`. Por orden alfabético
--     (`f` < `u`) corre ANTES que `trg_metas_updated`, así que cuando se
--     cierra la meta, `fecha_cierre` y `updated_at` quedan ambos en `now()`
--     y la consulta por fecha_cierre sustituye limpiamente a la de updated_at.
--   * Backfill para metas ya cerradas: usa su `updated_at` como mejor
--     aproximación disponible.
--
-- La columna es NULL para metas NO cerradas — eso es la señal de "abierta".
--
-- Idempotente.
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
  -- Transición "no completada -> completada": sella la fecha de cierre.
  if new.estado = 'completada'
     and (old.estado is null or old.estado <> 'completada') then
    new.fecha_cierre := now();
  -- Cualquier otro estado distinto de 'completada': reabrir / archivar /
  -- cambiar manualmente → limpiamos la fecha. Si vuelve a cerrarse luego,
  -- el trigger la vuelve a sellar.
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

-- Backfill: metas ya cerradas en producción. Best-effort: si updated_at
-- no parece fiable (NULL), dejamos fecha_cierre en NULL y la app caerá al
-- fallback de updated_at en código.
update public.metas
  set fecha_cierre = updated_at
  where estado = 'completada'
    and fecha_cierre is null
    and updated_at is not null;
