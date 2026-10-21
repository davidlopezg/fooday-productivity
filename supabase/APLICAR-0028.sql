-- ============================================================================
-- APLICAR-0028.sql
--
-- Refactor: separar el KR del trimestre. La tabla `resultados_periodo`
-- pasa a ser la entidad "KR" (sin trimestre propio); la asignación a uno
-- o varios periodos se hace en la nueva tabla puente `kr_periodos`.
--
-- Por qué:
--   · Antes, `unique(meta_id, periodo_id)` obligaba a tener 1 KR por
--     (meta, trimestre). El usuario veía el bug "solo puedo poner un KR
--     por meta". Tras el refactor, una meta puede tener N KRs y cada KR
--     puede vivir en 1..N trimestres/meses.
--
-- Pegar en Supabase → SQL Editor → Run.
-- Also applies the goal closure date (trigger and backfill).
-- Idempotente: se puede correr varias veces sin romper nada (los
-- `create table if not exists`, `insert ... on conflict do nothing`,
-- `drop constraint if exists` y `drop column if exists` lo garantizan).
--
-- Tras correrlo:
--   · Los KRs existentes en `resultados_periodo` se MIGRAN automáticamente
--     a `kr_periodos` con el mismo (peso, orden, periodo_id) original.
--   · La columna `resultados_periodo.periodo_id` se elimina.
--   · La constraint `unique(meta_id, periodo_id)` se elimina.
--   · Las tareas siguen apuntando al KR (no cambian).
-- ============================================================================


-- ############################################################################
-- ## Contenido idéntico a 0028_kr_separado_de_trimestre.sql.
-- ## Se duplica aquí para que pueda ejecutarse directamente en el SQL Editor
-- ## sin necesidad de `supabase db push` (mismo patrón que APLICAR-0024.sql).
-- ############################################################################


-- ----------------------------------------------------------------------------
-- 1. Crear tabla puente `kr_periodos` + índices + RLS + trigger updated_at.
-- ----------------------------------------------------------------------------
create table if not exists public.kr_periodos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kr_id       uuid not null references public.resultados_periodo(id) on delete cascade,
  periodo_id  uuid not null references public.periodos(id) on delete cascade,
  peso        numeric not null default 1 check (peso > 0),
  orden       int    not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kr_id, periodo_id)
);

create index if not exists idx_kr_periodos_owner on public.kr_periodos(owner_id);
create index if not exists idx_kr_periodos_kr on public.kr_periodos(kr_id);
create index if not exists idx_kr_periodos_periodo on public.kr_periodos(periodo_id);

drop trigger if exists trg_kr_periodos_updated on public.kr_periodos;
create trigger trg_kr_periodos_updated before update on public.kr_periodos
  for each row execute function public.set_updated_at();

alter table public.kr_periodos enable row level security;

drop policy if exists "own_select" on public.kr_periodos;
drop policy if exists "own_insert" on public.kr_periodos;
drop policy if exists "own_update" on public.kr_periodos;
drop policy if exists "own_delete" on public.kr_periodos;

create policy "own_select" on public.kr_periodos
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.kr_periodos
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.kr_periodos
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.kr_periodos
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Rellenar kr_periodos desde los datos existentes.
--    Para cada fila en `resultados_periodo`, si tiene periodo_id y no
--    existe ya una entrada en `kr_periodos` para ese (kr_id, periodo_id),
--    la creamos con peso=peso y orden=orden originales.
-- ----------------------------------------------------------------------------
insert into public.kr_periodos (owner_id, kr_id, periodo_id, peso, orden)
select
  rp.owner_id,
  rp.id,
  rp.periodo_id,
  rp.peso,
  rp.orden
from public.resultados_periodo rp
where rp.periodo_id is not null
  and not exists (
    select 1 from public.kr_periodos kp
    where kp.kr_id = rp.id and kp.periodo_id = rp.periodo_id
  );

-- ----------------------------------------------------------------------------
-- 3. Eliminar la UNIQUE rota (unique meta_id, periodo_id).
--    Buscamos el nombre del constraint dinámicamente (varía según PG).
-- ----------------------------------------------------------------------------
do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'resultados_periodo'
    and con.contype = 'u'
    and array_length(con.conkey, 1) = 2
    and exists (
      select 1 from pg_attribute a
      where a.attrelid = rel.oid
        and a.attnum = con.conkey[1]
        and a.attname = 'meta_id'
    )
    and exists (
      select 1 from pg_attribute a
      where a.attrelid = rel.oid
        and a.attnum = con.conkey[2]
        and a.attname = 'periodo_id'
    )
  limit 1;

  if cname is not null then
    execute format('alter table public.resultados_periodo drop constraint %I', cname);
    raise notice '0028: drop constraint % (unique meta_id, periodo_id)', cname;
  else
    raise notice '0028: no se encontró unique(meta_id, periodo_id) — probablemente ya eliminada';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Eliminar la columna periodo_id de resultados_periodo.
-- ----------------------------------------------------------------------------
alter table public.resultados_periodo
  drop column if exists periodo_id;

-- ----------------------------------------------------------------------------
-- 5. Comentarios de esquema.
-- ----------------------------------------------------------------------------
comment on table public.resultados_periodo is
  'KR (Key Result) de una meta. Antes se llamaba "resultado por trimestre"
   y forzaba UNIQUE(meta_id, periodo_id). Tras la migration 0028, una meta
   puede tener N KRs y cada KR vive en uno o varios trimestres/meses vía
   la tabla puente `kr_periodos`. Las tareas apuntan al KR directamente
   (tareas.resultado_periodo_id = kr_id).';

comment on column public.resultados_periodo.meta_id is
  'Meta a la que pertenece este KR (no se elimina si se borra la meta).';

comment on table public.kr_periodos is
  'Asignación N:M entre KRs (resultados_periodo) y periodos (trimestres/meses).
   Un KR puede vivir en uno o varios periodos (p.ej. "Q1 + Q2 2026").';

comment on column public.kr_periodos.kr_id is
  'FK al KR (resultados_periodo.id). on delete cascade.';

comment on column public.kr_periodos.periodo_id is
  'FK al periodo (periodos.id). on delete cascade.';

comment on column public.tareas.resultado_periodo_id is
  'FK al KR (resultados_periodo.id). Antes se llamaba "KR del trimestre",
   ahora apunta al KR directamente. Para saber en qué trimestre(s) vive
   esta tarea, haz join con kr_periodos usando este id como kr_id.';

-- ----------------------------------------------------------------------------
-- 6. Vista de compat: kr_con_periodo_principal (periodo de menor orden).
-- ----------------------------------------------------------------------------
create or replace view public.kr_con_periodo_principal
with (security_invoker = true) as
select
  kp.kr_id as kr_id,
  kp.periodo_id as periodo_id,
  p.tipo,
  p.anio,
  p.numero,
  p.nombre,
  p.fecha_inicio,
  p.fecha_fin,
  kp.peso,
  kp.orden
from public.kr_periodos kp
join public.periodos p on p.id = kp.periodo_id
where kp.orden = (
  select min(kp2.orden) from public.kr_periodos kp2 where kp2.kr_id = kp.kr_id
);

comment on view public.kr_con_periodo_principal is
  'Vista de compat: para cada KR, devuelve su periodo "principal"
   (el de menor orden). Si un KR tiene varios periodos, los demás
   siguen accesibles vía la tabla `kr_periodos` directamente.';

-- ----------------------------------------------------------------------------
-- 7. RPC: ensure_periodos_kr(kr_id, periodo_ids[]).
-- ----------------------------------------------------------------------------
create or replace function public.ensure_periodos_kr(
  p_kr_id uuid,
  p_periodo_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_periodo uuid;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;
  if p_kr_id is null then
    raise exception 'p_kr_id es null';
  end if;

  if not exists (
    select 1 from public.resultados_periodo
    where id = p_kr_id and owner_id = v_owner
  ) then
    raise exception 'KR % no encontrado o no pertenece al usuario', p_kr_id;
  end if;

  if p_periodo_ids is null or array_length(p_periodo_ids, 1) is null then
    return;
  end if;

  foreach v_periodo in array p_periodo_ids loop
    insert into public.kr_periodos (owner_id, kr_id, periodo_id, peso, orden)
    values (v_owner, p_kr_id, v_periodo, 1, 0)
    on conflict (kr_id, periodo_id) do nothing;
  end loop;
end $$;

grant execute on function public.ensure_periodos_kr(uuid, uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC de auditoría: list_kr_periodos(meta_id).
-- ----------------------------------------------------------------------------
create or replace function public.list_kr_periodos(p_meta_id uuid)
returns table (
  kr_id uuid,
  kr_titulo text,
  kr_peso numeric,
  periodo_id uuid,
  periodo_nombre text,
  periodo_tipo text,
  periodo_numero int,
  periodo_anio int
)
language sql
security invoker
set search_path = public
as $$
  select
    rp.id as kr_id,
    rp.titulo as kr_titulo,
    rp.peso as kr_peso,
    p.id as periodo_id,
    p.nombre as periodo_nombre,
    p.tipo as periodo_tipo,
    p.numero as periodo_numero,
    p.anio as periodo_anio
  from public.resultados_periodo rp
  left join public.kr_periodos kp on kp.kr_id = rp.id
  left join public.periodos p on p.id = kp.periodo_id
  where rp.meta_id = p_meta_id
    and rp.owner_id = auth.uid()
  order by rp.orden, p.anio, p.numero;
$$;

grant execute on function public.list_kr_periodos(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 9. UNIQUE (meta_id, titulo) en resultados_periodo.
--    Ver migrations/0028_kr_separado_de_trimestre.sql para la justificación
--    completa. Resumen: la 0028 quitó `unique (meta_id, periodo_id)` para
--    permitir N KRs por trimestre, pero sin esa UNIQUE el seed 001b y
--    `aplicarKrsYTareasEnMeta` quedaron no-idempotentes. La nueva UNIQUE
--    (meta_id, titulo) es el candado semánticamente correcto.
-- ----------------------------------------------------------------------------
do $$
declare
  v_dups int;
begin
  select count(*) into v_dups
  from (
    select meta_id, titulo, count(*) as n
    from public.resultados_periodo
    group by meta_id, titulo
    having count(*) > 1
  ) d;

  if v_dups > 0 then
    raise exception E'0028: ya hay % (meta_id, titulo) duplicados en resultados_periodo.\nResuélvelos antes de continuar (p.ej. `delete from resultados_periodo where id in (...ids sobrantes...)`).\nTras limpiarlos, vuelve a aplicar 0028 (es idempotente excepto este paso).', v_dups;
  end if;
end $$;

alter table public.resultados_periodo
  add constraint resultados_periodo_meta_id_titulo_key unique (meta_id, titulo);

-- ----------------------------------------------------------------------------
-- 10. Refresh PostgREST cache.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';


-- ############################################################################
-- ## VERIFICACIÓN (descomentar y correr tras el script).
-- ############################################################################
-- select
--   m.codigo as meta,
--   count(distinct rp.id) as krs,
--   count(distinct kp.periodo_id) as periodos_asignados,
--   count(t.id) as tareas
-- from public.metas m
-- left join public.resultados_periodo rp on rp.meta_id = m.id
-- left join public.kr_periodos kp on kp.kr_id = rp.id
-- left join public.tareas t on t.resultado_periodo_id = rp.id
-- where m.codigo in ('M8101','M8149','M8166','M8181')
-- group by m.codigo
-- order by m.codigo;
--
-- -- Vista de compat:
-- select * from public.kr_con_periodo_principal limit 5;
--
-- -- Tareas huérfanas (no deberían existir tras la migración):
-- select count(*) as tareas_sin_kr
-- from public.tareas t
-- join public.metas m on m.id = t.meta_id
-- where m.codigo in ('M8101','M8149','M8166','M8181')
--   and t.resultado_periodo_id is null;

-- ============================================================================
-- 0028_metas_fecha_cierre.sql (second part; no data is deleted)
-- ============================================================================

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
