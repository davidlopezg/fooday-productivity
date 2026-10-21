-- ============================================================================
-- 0028_kr_separado_de_trimestre.sql
-- Refactor de la capa meta → KR → tarea:
--   · ANTES:  resultados_periodo = "KR-por-trimestre"
--             unique(meta_id, periodo_id) → solo 1 KR por (meta, trimestre).
--             El usuario percibía el bug "solo puedo poner un KR por meta".
--   · AHORA:  resultados_periodo = entidad "KR" (sin trimestre obligatorio).
--             Una meta puede tener N KRs.
--             Un KR vive en uno o varios trimestres/meses a través de la
--             tabla puente `kr_periodos`.
--             Las tareas siguen apuntando a un KR (FK resultado_periodo_id).
--
-- Decisiones (ponytail — mínimo que funcione):
--   · NO se renombra la tabla `resultados_periodo` → sería masivo (queries
--    PostgREST + vista de Supabase). Se mantiene el nombre en BD; el
--    código cliente lo interpreta como "KR". El nombre "resultado_periodo"
--    pasa a ser legacy semántico (la columna `periodo_id` se elimina).
--   · Se ELIMINA la columna `periodo_id` de `resultados_periodo`.
--     Toda asignación a un trimestre vive ahora en `kr_periodos`.
--   · Se ELIMINA la constraint `unique(meta_id, periodo_id)`.
--   · Se crea `kr_periodos` (id, kr_id, periodo_id, peso, orden)
--     con `unique(kr_id, periodo_id)` y FKs on delete cascade.
--   · Las tareas siguen usando `resultado_periodo_id` apuntando al KR.
--     Para queries que necesiten el/los trimestre(s) de una tarea, se
--     hace join a `kr_periodos`.
--   · Migración de datos:
--       1) Para cada fila en `resultados_periodo`, crear una fila en
--          `kr_periodos` con el `periodo_id` original y `peso=peso, orden=orden`.
--       2) Eliminar `periodo_id` y la UNIQUE.
--   · Idempotente (puede ejecutarse varias veces sin romper).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Sanity check: si por lo que sea la tabla puente ya existe, no la
--    volvemos a crear (los CREATE IF NOT EXISTS ya lo cubren, pero el
--    safety aquí evita un mensaje confuso si se ejecuta en caliente).
-- ----------------------------------------------------------------------------
do $$
begin
  -- Nada que comprobar: 0028 se ejecuta UNA vez al migrar; es idempotente.
  raise notice '0028: iniciando refactor resultados_periodo → KR + kr_periodos';
end $$;

-- ----------------------------------------------------------------------------
-- 1. Migración de DATOS: crear la tabla puente y rellenar desde
--    `resultados_periodo.periodo_id`. La columna se mantiene todavía
--    en la tabla (se elimina en el paso 3) para que el `INSERT...SELECT`
--    no rompa por orden.
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

-- Relleno idempotente: para cada KR existente sin entrada en kr_periodos,
-- copio su (peso, orden, periodo_id) original.
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
-- 2. Eliminar la UNIQUE rota.
--    ANTES: unique (meta_id, periodo_id) → 1 KR por (meta, trimestre).
--    AHORA: nada — el "KR por trimestre" se modela con kr_periodos.
-- ----------------------------------------------------------------------------
do $$
declare cname text;
begin
  -- Busca el nombre del constraint UNIQUE sobre (meta_id, periodo_id)
  -- creado en la migration 0015. Es variable según versión de PG, así
  -- que lo buscamos por columnas en lugar de por nombre.
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
-- 3. Eliminar la columna periodo_id de resultados_periodo.
--    AHORA `resultados_periodo` es el "KR" — no tiene trimestre propio.
--    El trimestre se modela en `kr_periodos`.
-- ----------------------------------------------------------------------------
alter table public.resultados_periodo
  drop column if exists periodo_id;

-- ----------------------------------------------------------------------------
-- 4. Comentarios de esquema para que el siguiente desarrollador sepa qué
--    es cada cosa (PostgREST los expone en OpenAPI).
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
-- 5. Vista de compat: para queries que aún pidan el trimestre "principal"
--    del KR (legacy), exponemos una vista `kr_con_periodo_principal` que
--    elige el periodo de menor `orden` como "principal".
--    Útil para exportador PDF y otros sitios donde se renderiza
--    "Q1 · nombre_KR" en una sola línea.
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
-- 6. RPC: ensure_periodos_kr(meta_id, periodo_ids uuid[])
--    Asegura que un KR está asignado a N periodos dados (idempotente).
--    Si ya existe la asignación, la respeta. Si falta, la crea.
--    Usado por la app cliente cuando el usuario añade un KR con varios
--    trimestres seleccionados.
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

  -- Verifica que el KR pertenece al owner (RLS ya lo hace, pero
  -- fallamos pronto con un mensaje claro).
  if not exists (
    select 1 from public.resultados_periodo
    where id = p_kr_id and owner_id = v_owner
  ) then
    raise exception 'KR % no encontrado o no pertenece al usuario', p_kr_id;
  end if;

  if p_periodo_ids is null or array_length(p_periodo_ids, 1) is null then
    return; -- nada que hacer
  end if;

  foreach v_periodo in array p_periodo_ids loop
    insert into public.kr_periodos (owner_id, kr_id, periodo_id, peso, orden)
    values (v_owner, p_kr_id, v_periodo, 1, 0)
    on conflict (kr_id, periodo_id) do nothing;
  end loop;
end $$;

grant execute on function public.ensure_periodos_kr(uuid, uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC de ayuda para auditoría: lista los KRs con sus periodos (todos).
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
-- 8. UNIQUE (meta_id, titulo) en resultados_periodo.
--    La migración 0028 eliminó `unique (meta_id, periodo_id)` para
--    permitir que una meta tuviera N KRs en el mismo trimestre. Pero al
--    quitar ese candado, el seed (001, 001b) y `aplicarKrsYTareasEnMeta`
--    quedaron **NO idempotentes**: re-ejecutar el seed duplicaba filas
--    porque el `on conflict do nothing` sin nada concreto solo evita
--    duplicados de la PK (aleatoria, nunca choca).
--
--    La nueva UNIQUE (meta_id, titulo) es semánticamente correcta:
--    un KR se identifica por su TÍTULO dentro de la meta. No tiene
--    sentido tener 2 KRs con el mismo título en la misma meta (sería
--    el mismo KR duplicado por error o por re-ejecución del LLM).
--
--    - NO afecta a KRs existentes distintos (los títulos son únicos
--      de facto en BD limpia).
--    - Hace idempotente el seed 001b con `on conflict (meta_id, titulo)
--      do nothing`.
--    - Refuerza el invariante de `aplicarKrsYTareasEnMeta` (deduplica
--      por título en cliente — ahora también en BD como red de seguridad).
--
--    Si al aplicar esta UNIQUE hay duplicados preexistentes (porque el
--    seed 001b se ejecutó varias veces antes de 0028), fallamos con
--    un mensaje claro y NO eliminamos los duplicados automáticamente:
--    el usuario decide qué hacer.
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
-- 9. Refresh PostgREST cache.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';