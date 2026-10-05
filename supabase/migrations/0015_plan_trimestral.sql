-- ============================================================================
-- 0015_plan_trimestral.sql
-- Capa de planificación trimestral ENCIMA de `metas` y `tareas` existentes.
--
-- Decisiones de diseño (ponytail — la solución más simple que funcione):
--   - NO se toca `metas` ni `tareas` (salvo +1 columna `resultado_periodo_id`).
--   - NO se duplican tareas. Una tarea → UN resultado_periodo (1:N). Si la
--     misma tarea debe contar para 2 KRs, se divide en dos tareas.
--   - `tareas.meta_id` se mantiene (queries "tareas de esta meta" rápidas
--     sin join a través de resultados). `resultado_periodo_id` da el detalle
--     de qué trimestre/resultado. La app los sincroniza en una sola mutación.
--   - Periodos flexibles: tipo `trimestre | mes | custom`. La vista por
--     defecto es trimestral, pero la tabla admite meses (1..12) o rangos
--     custom si el usuario quiere afinar.
--   - Periodos NO son FK obligatoria de meta: una meta puede existir sin
--     periodos (sigue siendo meta suelta). Los periodos se crean al pedir
--     "auto-generar 4 trimestres" o al añadir manualmente.
--   - Resultados_periodo es UNIQUE(meta_id, periodo_id): un resultado
--     esperado por (meta, trimestre).
--   - on delete set null: si se borra un resultado o periodo, la tarea
--     queda desvinculada pero NO se borra. Sigue en la bandeja.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PERIODOS
-- ----------------------------------------------------------------------------
create table if not exists public.periodos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo          text not null default 'trimestre'
                check (tipo in ('trimestre','mes','custom')),
  anio          int  not null check (anio between 1900 and 3000),
  numero        int  not null check (numero >= 1),
  nombre        text not null,                          -- "Q1 2026", "Enero 2026", etc.
  fecha_inicio  date not null,
  fecha_fin     date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Idempotencia: un (owner, tipo, anio, numero) = un único periodo.
  unique (owner_id, tipo, anio, numero)
);

create index if not exists idx_periodos_owner_anio
  on public.periodos(owner_id, anio desc, tipo, numero);

drop trigger if exists trg_periodos_updated on public.periodos;
create trigger trg_periodos_updated before update on public.periodos
  for each row execute function public.set_updated_at();

alter table public.periodos enable row level security;

drop policy if exists "own_select" on public.periodos;
drop policy if exists "own_insert" on public.periodos;
drop policy if exists "own_update" on public.periodos;
drop policy if exists "own_delete" on public.periodos;

create policy "own_select" on public.periodos
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.periodos
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.periodos
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.periodos
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. RESULTADOS POR PERIODO (vinculan una meta con un periodo y definen
--    el resultado esperado + métrica opcional).
-- ----------------------------------------------------------------------------
create table if not exists public.resultados_periodo (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id         uuid not null references public.metas(id) on delete cascade,
  periodo_id      uuid not null references public.periodos(id) on delete cascade,
  titulo          text not null,
  descripcion     text,                                  -- "resultado esperado"
  metrica         text,                                  -- p.ej. "usuarios activos"
  valor_objetivo  numeric,
  valor_actual    numeric default 0,
  unidad          text,                                  -- "usuarios", "€", "%", etc.
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','en_progreso','completado','descartado')),
  peso            numeric not null default 1
                  check (peso > 0),                      -- ponderación para el progreso
  orden           int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Un resultado por (meta, periodo).
  unique (meta_id, periodo_id)
);

create index if not exists idx_resultados_meta
  on public.resultados_periodo(meta_id);
create index if not exists idx_resultados_periodo
  on public.resultados_periodo(periodo_id);

drop trigger if exists trg_resultados_periodo_updated on public.resultados_periodo;
create trigger trg_resultados_periodo_updated before update on public.resultados_periodo
  for each row execute function public.set_updated_at();

alter table public.resultados_periodo enable row level security;

drop policy if exists "own_select" on public.resultados_periodo;
drop policy if exists "own_insert" on public.resultados_periodo;
drop policy if exists "own_update" on public.resultados_periodo;
drop policy if exists "own_delete" on public.resultados_periodo;

create policy "own_select" on public.resultados_periodo
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.resultados_periodo
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.resultados_periodo
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.resultados_periodo
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. COLUMNA EN TAREAS — enlace opcional con el resultado concreto
-- ----------------------------------------------------------------------------
-- on delete set null: si se borra el resultado, la tarea queda suelta
-- (vuelve al "inbox" de la meta o a la bandeja global), NO se borra.
alter table public.tareas
  add column if not exists resultado_periodo_id uuid
    references public.resultados_periodo(id) on delete set null;

create index if not exists idx_tareas_resultado_periodo
  on public.tareas(resultado_periodo_id)
  where resultado_periodo_id is not null;

-- ----------------------------------------------------------------------------
-- 4. RPC: ensure_periodos_anio
--    Crea los 4 trimestres del año si no existen y devuelve la lista
--    completa del año. Idempotente: si ya existen, no hace nada.
-- ----------------------------------------------------------------------------
-- Fechas de los trimestres (calendario gregoriano, todas las zonas):
--   Q1: 1 ene – 31 mar
--   Q2: 1 abr – 30 jun
--   Q3: 1 jul – 30 sep
--   Q4: 1 oct – 31 dic
create or replace function public.ensure_periodos_anio(p_anio int)
returns setof public.periodos
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  q record;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  for q in
    select * from (values
      (1, 'Q1', make_date(p_anio, 1,  1), make_date(p_anio, 3, 31)),
      (2, 'Q2', make_date(p_anio, 4,  1), make_date(p_anio, 6, 30)),
      (3, 'Q3', make_date(p_anio, 7,  1), make_date(p_anio, 9, 30)),
      (4, 'Q4', make_date(p_anio, 10, 1), make_date(p_anio, 12, 31))
    ) as t(numero, prefijo, fi, ff)
  loop
    insert into public.periodos (owner_id, tipo, anio, numero, nombre, fecha_inicio, fecha_fin)
    values (v_owner, 'trimestre', p_anio, q.numero,
            q.prefijo || ' ' || p_anio, q.fi, q.ff)
    on conflict (owner_id, tipo, anio, numero) do nothing;
  end loop;

  return query
    select * from public.periodos
    where owner_id = v_owner and tipo = 'trimestre' and anio = p_anio
    order by numero;
end;
$$;

grant execute on function public.ensure_periodos_anio(int) to authenticated;

-- Refresca la caché de PostgREST.
notify pgrst, 'reload schema';
