-- ============================================================================
-- 0033_kr_foco_semanal.sql
--
-- NUEVA CAPA DE FOCO SEMANAL: "3 KRs de la semana".
--
-- EL PROBLEMA QUE RESUELVE
-- ------------------------
-- Antes (migration 0028) la cascada era:
--     meta (WIG, máx 3) → KR (medible, vive en trimestres/meses) → tarea
-- Pero NADA conectaba el KR con el TIEMPO DE TRABAJO. El trimestre dice
-- "este resultado se entrega antes de Q3"; no dice "esta semana pongo
-- horas en ÉSTE". Consecuencia: el salto documentado era meta → tarea,
-- y la planificación semanal (/semana) filtraba por `prioridad = 'critica'`,
-- ignorando por completo metas y KRs. El sistema se sentía desconectado.
--
-- LA SOLUCIÓN: un eje temporal ORTOGONAL, no una sustitución
-- ---------------------------------------------------------------
--   · `periodos` + `kr_periodos`  = VENTANA DE MEDICIÓN
--     (trimestre / mes / custom: "este KR se entrega en este periodo")
--   · `kr_foco_semanal` (esta)   = VENTANA DE EJECUCIÓN
--     (semana ISO: "esta semana enfoco este KR")
--
-- El trimestre NO se toca. Sigue siendo el compromiso de entrega. Lo
-- nuevo es dónde se aplica la energía. Regla de contención (la hace
-- cumplir la RPC, no el cliente):
--
--     un KR solo puede entrar en el foco semanal si ALGUNO de sus
--     periodos contiene la semana actual.
--
-- Eso filtra lo stale (un KR de Q1 sin cerrar en Q2 no entra), filtra
-- lo prematuro (un KR de Q3 no entra en mayo) y da el criterio de
-- selección a la IA: los 3 KRs EN RIESGO dentro de su ventana.
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · NO se toca `periodos`, `kr_periodos` ni `resultados_periodo`.
--     El scorecard trimestral (/metas/plan), el exportador PDF y el
--     planificador de metas siguen funcionando igual.
--   · La clave temporal es `(anio, semana_iso)`, la MISMA que ya usan
--     `planes_semanales` y `plan_semanal_tareas` → cero conceptos nuevos.
--   · `unique (kr_id, anio, semana_iso)`: un KR puede estar en varias
--     semanas (si su periodo dura 3 semanas, aparece 3 veces). No es
--     una "propiedad" del KR, es una ASIGNACIÓN temporal — igual que
--     `plan_semanal_tareas`.
--   · El cap de 3 lo aplica la RPC (patrón `toggle_meta_wig` /
--     `toggle_tarea_wig`): rechaza el 4º. El cap es POR SEMANA, así
--     que el foco rota solo cada semana.
--   · `on delete cascade` desde el KR: si borras el KR, sus filas de
--     foco desaparecen solas (mismo criterio que 0028).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------
create table if not exists public.kr_foco_semanal (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio        int  not null,
  semana_iso  int  not null check (semana_iso between 1 and 53),
  kr_id       uuid not null references public.resultados_periodo(id) on delete cascade,
  orden       int  not null default 0 check (orden between 1 and 3),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kr_id, anio, semana_iso)
);

create index if not exists idx_kr_foco_semanal_owner
  on public.kr_foco_semanal(owner_id);
create index if not exists idx_kr_foco_semanal_semana
  on public.kr_foco_semanal(owner_id, anio, semana_iso);
create index if not exists idx_kr_foco_semanal_kr
  on public.kr_foco_semanal(kr_id);

drop trigger if exists trg_kr_foco_semanal_updated on public.kr_foco_semanal;
create trigger trg_kr_foco_semanal_updated before update on public.kr_foco_semanal
  for each row execute function public.set_updated_at();

alter table public.kr_foco_semanal enable row level security;

drop policy if exists "own_select" on public.kr_foco_semanal;
drop policy if exists "own_insert" on public.kr_foco_semanal;
drop policy if exists "own_update" on public.kr_foco_semanal;
drop policy if exists "own_delete" on public.kr_foco_semanal;

create policy "own_select" on public.kr_foco_semanal
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.kr_foco_semanal
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.kr_foco_semanal
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.kr_foco_semanal
  for delete using (owner_id = auth.uid());

comment on table public.kr_foco_semanal is
  'Foco semanal: los KRs (máx 3 por semana ISO) en los que se aplica energía
   esta semana. EJE ORTOGONAL a `kr_periodos` (que es la ventana de
   MEDICIÓN: trimestre/mes). Regla de contención: un KR solo puede entrar
   si alguno de sus periodos contiene la semana actual.';

comment on column public.kr_foco_semanal.kr_id is
  'FK al KR (resultados_periodo.id). on delete cascade.';

comment on column public.kr_foco_semanal.orden is
  'Posición en el panel de foco de la semana (1-3).';

-- ----------------------------------------------------------------------------
-- 2. RPC auxiliar: rango de fechas de una semana ISO.
--    La app necesita la ventana [inicio, fin] de la semana para:
--      · pintar "esta semana (lun-dom)".
--      · filtrar candidatos cuyo periodo contiene la semana.
--    Se resuelve aquí para que cliente y servidor usen la MISMA
--    definición de "semana ISO" (evita duplicar el cálculo en JS).
--
--    Se define ANTES que `toggle_kr_foco_semanal` porque esa RPC la usa.
--    Semana 1 = la que contiene el 4 de enero (ISO 8601). El lunes es
--    `date_trunc('week', ...)` (en PG la semana empieza en lunes).
-- ----------------------------------------------------------------------------
create or replace function public.rango_semana_iso(
  p_anio int,
  p_semana_iso int
) returns date[]
language sql
immutable
as $$
  select array[
    (date_trunc('week', (p_anio::text || '-01-04')::date + ((p_semana_iso - 1) * 7)))::date,
    ((date_trunc('week', (p_anio::text || '-01-04')::date + ((p_semana_iso - 1) * 7)))::date + 6)::date
  ];
$$;
grant execute on function public.rango_semana_iso(int, int) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC: toggle_kr_foco_semanal
--    Réplica de `toggle_meta_wig` pero con cap POR SEMANA y con la regla
--    de contención (el KR debe tener un periodo que cubra la semana).
--
--    La regla de contención se evalúa aquí, en BD, para que ningún cliente
--    (web, móvil, script) pueda saltársela.
-- ----------------------------------------------------------------------------
create or replace function public.toggle_kr_foco_semanal(
  p_kr_id uuid,
  p_anio int,
  p_semana_iso int,
  p_es_wig boolean
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid := public.current_owner_id();
  v_actual boolean;
  v_count int;
  v_next_orden int;
  v_actual_periodo text;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  -- Verifica que el KR es del owner.
  select exists (
    select 1 from public.resultados_periodo
    where id = p_kr_id and owner_id = v_owner
  ) into v_actual;
  if not v_actual then
    raise exception 'KR % no encontrado o no es tuyo', p_kr_id;
  end if;

  -- ¿Ya está en el foco de esta semana?
  select exists (
    select 1 from public.kr_foco_semanal
    where owner_id = v_owner
      and kr_id = p_kr_id
      and anio = p_anio
      and semana_iso = p_semana_iso
  ) into v_actual;

  if p_es_wig = v_actual then
    return true; -- no-op idempotente
  end if;

  if p_es_wig then
    -- Cap de 3 para esta semana.
    select count(*) into v_count
    from public.kr_foco_semanal
    where owner_id = v_owner
      and anio = p_anio
      and semana_iso = p_semana_iso;
    if v_count >= 3 then
      return false; -- ya hay 3 KRs en foco esta semana
    end if;

    -- REGLA DE CONTENCIÓN: el KR debe tener al menos un periodo que
    -- contenga la semana actual. Sin esto se colarían KRs de trimestres
    -- ya cerrados o de trimestres futuros.
    --
    -- La condición es SOLAPAMIENTO REAL: el periodo [inicio, fin]
    -- contiene la semana [lunes, domingo] si inicio <= domingo Y
    -- fin >= lunes. Debe coincidir EXACTAMENTE con la query del cliente
    -- (`periodoCubreSemana` en src/lib/queries.ts), o el panel ofrecería
    -- candidatos que la RPC después rechaza.
    select p.nombre into v_actual_periodo
    from public.kr_periodos kp
    join public.periodos p on p.id = kp.periodo_id
    where kp.kr_id = p_kr_id
      and p.fecha_inicio <= (public.rango_semana_iso(p_anio, p_semana_iso))[2]
      and p.fecha_fin >= (public.rango_semana_iso(p_anio, p_semana_iso))[1]
    limit 1;

    if v_actual_periodo is null then
      -- Sin periodo que cubra la semana: NO se puede entrar en el foco.
      -- (Si el usuario lo necesita de verdad, primero debe re-planificar
      --  el KR en /metas/detalle → ✨ Generar plan con IA.)
      return false;
    end if;

    -- Primer hueco 1-3 libre.
    select min(g) into v_next_orden
    from generate_series(1, 3) g
    where g not in (
      select orden from public.kr_foco_semanal
      where owner_id = v_owner
        and anio = p_anio
        and semana_iso = p_semana_iso
    );
    insert into public.kr_foco_semanal (owner_id, anio, semana_iso, kr_id, orden)
    values (v_owner, p_anio, p_semana_iso, p_kr_id, v_next_orden)
    on conflict (kr_id, anio, semana_iso) do update
      set orden = excluded.orden;
  else
    delete from public.kr_foco_semanal
    where owner_id = v_owner
      and kr_id = p_kr_id
      and anio = p_anio
      and semana_iso = p_semana_iso;
  end if;
  return true;
end;
$$;

grant execute on function public.toggle_kr_foco_semanal(uuid, int, int, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Refresh PostgREST cache.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
