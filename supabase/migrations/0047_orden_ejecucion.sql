-- ============================================================================
-- 0047_orden_ejecucion.sql
--
-- ORDEN DE EJECUCIÓN EN LOS TRES NIVELES (issue #105).
--
-- EL PROBLEMA
-- -----------
-- El orden en que hay que ejecutar el trabajo es implícito:
--   · Las metas de un proyecto se ven por `codigo` (alfanumérico), no por
--     el orden en que David piensa ejecutarlas.
--   · Los KRs de una meta tienen `resultados_periodo.orden`, pero no se
--     edita, no se normaliza por meta y no significa "orden de ejecución".
--   · Las tareas de un KR no tienen NINGUNA columna de orden: se leen por
--     `created_at desc`, o sea, la última creada primero.
--
-- LA DECISIÓN
-- -----------
-- Un orden de ejecución explícito y manual en los tres niveles:
--
--   proyecto ──▶ meta (`metas.orden_ejecucion`)
--                   └──▶ KR (`resultados_periodo.orden`, normalizado 1..N
--                              por meta)
--                          └──▶ tarea (`tareas.orden_ejecucion`)
--
-- Las metas SUELTAS (sin proyecto) NO tienen orden: no hay nada contra
-- lo que ordenar (decisión de la persona responsable, issue #105).
--
-- `orden_ejecucion` es un entero 1..N dentro de su grupo (proyecto para
-- las metas, KR para las tareas). 0 = "sin posición": es el valor por
-- defecto y significa "sin orden explícito" (tareas sueltas, metas
-- huérfanas). Al leer, 0 se trata como el último (peor caso: la IA y la UI
-- las ven al final, sin sorpresas).
--
-- Idempotente: se puede aplicar dos veces sin romper nada. El backfill
-- SOLO se hace la primera vez (cuando las columnas no existían): si se
-- re-aplica, el orden manual que haya puesto la persona NO se pisa.
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. COLUMNAS (+ marca de "ya existían" para el backfill)
-- -----------------------------------------------------------------------------
do $$
declare
  metas_ya_existia boolean := exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'metas'
       and column_name = 'orden_ejecucion'
  );
  tareas_ya_existia boolean := exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'tareas'
       and column_name = 'orden_ejecucion'
  );
begin
  alter table public.metas
    add column if not exists orden_ejecucion int not null default 0;
  alter table public.tareas
    add column if not exists orden_ejecucion int not null default 0;

  -- ---------------------------------------------------------------------------
  -- BACKFILL (solo la primera vez)
  -- ---------------------------------------------------------------------------

  -- Metas: se ordenan por antigüedad dentro de su proyecto (1..N). Las metas
  -- sin proyecto se quedan en 0 (no necesitan orden).
  if not metas_ya_existia then
    with ranked as (
      select id,
             row_number() over (
               partition by proyecto_id
               order by created_at asc, id asc
             ) as rn
      from public.metas
      where proyecto_id is not null
    )
    update public.metas m
       set orden_ejecucion = ranked.rn
      from ranked
     where m.id = ranked.id;

    -- KRs: `resultados_periodo.orden` se normaliza a 1..N POR META (antes
    -- compartían valores entre metas, así que no significaban nada).
    with ranked as (
      select id,
             row_number() over (
               partition by meta_id
               order by orden asc, created_at asc, id asc
             ) as rn
      from public.resultados_periodo
    )
    update public.resultados_periodo r
       set orden = ranked.rn
      from ranked
     where r.id = ranked.id;
  end if;

  -- Tareas: se ordenan por antigüedad dentro de su KR (1..N). Las tareas sin
  -- KR se quedan en 0.
  if not tareas_ya_existia then
    with ranked as (
      select id,
             row_number() over (
               partition by resultado_periodo_id
               order by created_at asc, id asc
             ) as rn
      from public.tareas
      where resultado_periodo_id is not null
    )
    update public.tareas t
       set orden_ejecucion = ranked.rn
      from ranked
     where t.id = ranked.id;
  end if;
end
$$;

comment on column public.metas.orden_ejecucion is
  'Orden de ejecución de la meta DENTRO de su proyecto (1..N). 0 = sin orden (meta suelta o sin posición).';
comment on column public.tareas.orden_ejecucion is
  'Orden de ejecución de la tarea DENTRO de su KR (1..N). 0 = sin orden (tarea suelta, sin KR).';

-- -----------------------------------------------------------------------------
-- 2. ÍNDICES
-- -----------------------------------------------------------------------------
create index if not exists idx_metas_orden_ejecucion
  on public.metas(owner_id, proyecto_id, orden_ejecucion);

create index if not exists idx_tareas_orden_ejecucion
  on public.tareas(resultado_periodo_id, orden_ejecucion)
  where resultado_periodo_id is not null;
