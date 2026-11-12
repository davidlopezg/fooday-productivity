-- ============================================================================
-- 0038_kr_wig.sql
--
-- LOS KRs TAMBIÉN SON WIGS (capa intermedia, la que faltaba).
--
-- EL PROBLEMA QUE RESUELVE
-- ------------------------
-- `metas` (0018) y `tareas` (0019) tienen las columnas `es_wig` / `wig_orden`
-- y su botón 🎯 para ascenderse a "Enormemente Importante". Los KRs —la
-- capa medible que hay ENTRE la meta y la tarea— no tenían nada: en /krs
-- no había forma de decir "este resultado es el que más importa del
-- ciclo". Solo existía el foco SEMANAL (`kr_foco_semanal`, migration 0033),
-- que es otra cosa: es la ventana de EJECUCIÓN (en qué KR pones horas
-- ESTA semana) y rota solo cada semana.
--
-- LA SOLUCIÓN: el mismo patrón 4DX, en la tabla de KRs
-- ---------------------------------------------------------
--   · `resultados_periodo.es_wig` / `.wig_orden` (1-3): el KR de mayor
--     impacto del CICLO (no de la semana).
--   · Índice único parcial (owner_id, wig_orden): dos KRs no pueden
--     ocupar el mismo slot.
--   · RPC `toggle_kr_wig`: rechaza el 4º, igual que `toggle_meta_wig` y
--     `toggle_tarea_wig`.
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · NO se toca `kr_periodos` ni `periodos`: el trimestre sigue mandando
--     en la entrega y la semana en el esfuerzo (0033 no se toca).
--   · NO se toca `metas` ni `tareas`: cada capa tiene su propio cap
--     (3 WIG-metas, 3 WIG-KRs, 3 WIG-tareas), igual que ya se hacía.
--   · Sin tabla nueva: son dos columnas, como en 0018/0019.
--   · Idempotente (`add column if not exists`, índices con `if not exists`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas
-- ----------------------------------------------------------------------------
alter table public.resultados_periodo
  add column if not exists es_wig boolean not null default false,
  add column if not exists wig_orden int
    check (wig_orden is null or wig_orden between 1 and 3);

create index if not exists idx_resultados_periodo_wig
  on public.resultados_periodo(owner_id) where es_wig;

-- Un owner no puede tener dos WIG-KRs con el mismo orden.
create unique index if not exists uq_resultados_periodo_wig_orden
  on public.resultados_periodo(owner_id, wig_orden)
  where es_wig and wig_orden is not null;

-- ----------------------------------------------------------------------------
-- 2. Comentarios (para futuros devs / agentes)
-- ----------------------------------------------------------------------------
comment on column public.resultados_periodo.es_wig is
  'Wildly Important Goal (4DX) aplicado al KR: resultado clave de alto impacto del ciclo. Máx 3 a la vez. Distinto del foco semanal (kr_foco_semanal, migration 0033), que es la ventana de ejecución de la semana.';
comment on column public.resultados_periodo.wig_orden is
  'Posición en el panel WIG de KRs (1-3). Único por owner cuando es_wig=true.';

-- ----------------------------------------------------------------------------
-- 3. RPC helper: marcar/desmarcar WIG respetando el límite de 3.
--    Réplica de `toggle_meta_wig` (0018) y `toggle_tarea_wig` (0019).
-- ----------------------------------------------------------------------------
create or replace function public.toggle_kr_wig(
  p_kr_id uuid,
  p_es_wig boolean
) returns boolean
language plpgsql
security invoker
as $$
declare
  v_owner uuid := public.current_owner_id();
  v_actual boolean;
  v_count int;
  v_next_orden int;
begin
  -- Verifica que el KR es del owner.
  select es_wig into v_actual
  from public.resultados_periodo
  where id = p_kr_id and owner_id = v_owner;
  if not found then
    raise exception 'KR % no encontrado o no es tuyo', p_kr_id;
  end if;

  if p_es_wig = v_actual then
    return true; -- no-op idempotente
  end if;

  if p_es_wig then
    select count(*) into v_count
    from public.resultados_periodo
    where owner_id = v_owner and es_wig = true and id <> p_kr_id;
    if v_count >= 3 then
      return false; -- ya hay 3 WIG-KRs
    end if;
    -- Busca el primer hueco 1-3 libre.
    select min(g) into v_next_orden
    from generate_series(1, 3) g
    where g not in (
      select wig_orden from public.resultados_periodo
      where owner_id = v_owner and es_wig = true and wig_orden is not null
    );
    update public.resultados_periodo
      set es_wig = true, wig_orden = v_next_orden
      where id = p_kr_id and owner_id = v_owner;
  else
    update public.resultados_periodo
      set es_wig = false, wig_orden = null
      where id = p_kr_id and owner_id = v_owner;
  end if;
  return true;
end;
$$;

grant execute on function public.toggle_kr_wig(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Refresh PostgREST cache.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
