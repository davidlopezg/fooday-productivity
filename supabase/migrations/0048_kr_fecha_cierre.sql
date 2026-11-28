-- ============================================================================
-- 0048_kr_fecha_cierre.sql
--
-- FECHA REAL DE CIERRE DE LOS KRs (issue #108).
--
-- EL PROBLEMA
-- -----------
-- /informes cuenta "OKRs (KRs) cerrados", pero:
--   · La fecha de cierre la sacaba de `resultados_periodo.updated_at`, que
--     es un PROXY: cualquier edición posterior (cambiar el título, la
--     métrica, el peso) mueve la fecha y el KR cerrado vuelve a entrar en la
--     ventana de "últimos 30 días". Es exactamente el problema que ya se
--     arregló para las metas en 0028_metas_fecha_cierre.sql.
--   · Peor: la lectura de KRs no pedía `updated_at`, así que el contador de
--     KRs cerrados salía SIEMPRE a 0.
--
-- LA SOLUCIÓN
-- -----------
--   · Columna `fecha_cierre timestamptz NULL` en `resultados_periodo`. La
--     sella un trigger cuando `estado` pasa a `'completado'` y la limpia si
--     el KR se reabre (o se descarta).
--   · Es NULL mientras el KR no esté cerrado: eso es la señal de "abierto".
--   * El trigger corre ANTES que `trg_resultados_periodo_updated` (por
--     orden alfabético: 'f' < 'u'), así que al cerrar un KR, `fecha_cierre`
--     y `updated_at` quedan ambos en `now()`.
--   · Backfill: los KRs que ya estaban cerrados reciben su `updated_at`
--     como mejor aproximación disponible.
--
-- La app degrada si esta migración no está aplicada: lee los KRs sin
-- `fecha_cierre` y avisa (ver `src/lib/queries.ts`).
--
-- Idempotente.
-- ============================================================================

alter table public.resultados_periodo
  add column if not exists fecha_cierre timestamptz null;

comment on column public.resultados_periodo.fecha_cierre is
  'Cuándo se cerró el KR (estado pasó a completado). NULL si nunca se ha cerrado. Se limpia si el KR se reabre.';

create or replace function public.set_resultados_periodo_fecha_cierre()
returns trigger
language plpgsql
as $$
begin
  -- Alta: si ya nace cerrado, sella la fecha.
  if tg_op = 'INSERT' then
    if new.estado = 'completado' then
      new.fecha_cierre := now();
    end if;
    return new;
  end if;

  -- Transición "no completado -> completado": sella la fecha de cierre.
  if new.estado = 'completado'
     and (old.estado is null or old.estado <> 'completado') then
    new.fecha_cierre := now();
  -- Cualquier otro estado (reabrir, descartar, cambiar a mano): la fecha
  -- deja de ser válida. Si se vuelve a cerrar luego, el trigger la sella.
  elsif new.estado <> 'completado' then
    new.fecha_cierre := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_resultados_periodo_fecha_cierre
  on public.resultados_periodo;
create trigger trg_resultados_periodo_fecha_cierre
  before insert or update on public.resultados_periodo
  for each row execute function public.set_resultados_periodo_fecha_cierre();

-- Backfill: KRs ya cerrados. Best-effort (si `updated_at` es NULL, se deja
-- NULL y la app cae al fallback en código).
update public.resultados_periodo
  set fecha_cierre = updated_at
 where estado = 'completado'
   and fecha_cierre is null
   and updated_at is not null;
