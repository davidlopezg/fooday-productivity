-- ============================================================================
-- 0043_ritual_semanal_datos.sql
--
-- CAPA DE DATOS DEL RITUAL SEMANAL (issue #87)
--
-- EL PROBLEMA QUE RESUELVE
-- -----------------------
-- El modelo actual solo contempla el flujo de EJECUCIÓN: hacer, descartar,
-- archivar. El ritual semanal (la hoja de los lunes) trabaja con otro tipo
-- de decisiones:
--
--   1. PAUSAR una meta (distinto de archivarla: pausada vuelve).
--   2. La FASE en la que está ("¿en qué fase está?").
--   3. El "STATUS METAS" — que no es un semáforo, es el texto de SITUACIÓN
--      que ya vive en `metas.situacion_actual` (0024) y que en la capa de
--      Escenarios se escribe a mano. Hoy se sobrescribe sin dejar rastro.
--   4. El INVENTARIO de tareas de la semana: EN ESPERA (la aparto, no la
--      mato) y CANCELADA (no la haré), con un CUPO de 10 activas.
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · Se AMPLÍAN los CHECK (no se restringen): las filas actuales siguen
--     siendo válidas y no hay que backfill.
--   · El cupo de 10 se impone con un TRIGGER, no solo con una RPC: así
--     ningún cliente (script, ETL, la propia app) puede saltárselo.
--   · El semáforo NO se persiste: se deriva. Una tabla de estado se pudre
--     (misma regla que `estadoDeProyecto` en la capa de Escenarios).
--   · Las fases viven en `config_listas` (editable en /configuracion) con
--     un catálogo por defecto en código (src/lib/ritualSemanal.ts).
--   · Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. METAS: pausa + fase + fecha de la última situación
-- ----------------------------------------------------------------------------
alter table public.metas
  drop constraint if exists metas_estado_check;
alter table public.metas
  add constraint metas_estado_check
  check (estado in (
    'sin_empezar','en_progreso','bloqueada','pausada','completada','archivada'
  ));

alter table public.metas
  add column if not exists fase text;
alter table public.metas
  add column if not exists situacion_actualizada_at timestamptz;

create index if not exists idx_metas_fase
  on public.metas(owner_id) where fase is not null;

comment on column public.metas.estado is
  'Estado de la meta. `pausada` = viva pero en pausa (vuelve); `archivada` = se cierra para siempre. No confundir con una meta cancelada.';
comment on column public.metas.fase is
  'Fase actual de la meta (catálogo editable en /configuracion).';
comment on column public.metas.situacion_actualizada_at is
  'Última vez que se escribió la situación actual (el "Status Meta").';

-- ----------------------------------------------------------------------------
-- 2. HISTORIAL DE SITUACIÓN (el "Status Meta" con rastro)
-- ----------------------------------------------------------------------------
create table if not exists public.meta_situaciones (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id     uuid not null references public.metas(id) on delete cascade,
  situacion   text not null,
  -- 'manual' | 'ia' | 'wizard'
  origen      text not null default 'manual',
  creada_en   timestamptz not null default now()
);

create index if not exists idx_meta_situaciones_meta
  on public.meta_situaciones(meta_id, creada_en desc);

alter table public.meta_situaciones enable row level security;

drop policy if exists "own_select" on public.meta_situaciones;
drop policy if exists "own_insert" on public.meta_situaciones;
drop policy if exists "own_update" on public.meta_situaciones;
drop policy if exists "own_delete" on public.meta_situaciones;

create policy "own_select" on public.meta_situaciones for select using (owner_id = auth.uid());
create policy "own_insert" on public.meta_situaciones for insert with check (owner_id = auth.uid());
create policy "own_update" on public.meta_situaciones for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.meta_situaciones for delete using (owner_id = auth.uid());

comment on table public.meta_situaciones is
  'Historial del "Status Meta" (situación actual). Cada escritura deja una fila: el valor anterior nunca se pierde.';

-- ----------------------------------------------------------------------------
-- 3. PROYECTOS: vivo / en pausa / muerto
-- ----------------------------------------------------------------------------
alter table public.proyectos
  add column if not exists estado text not null default 'vivo';
alter table public.proyectos
  drop constraint if exists proyectos_estado_check;
alter table public.proyectos
  add constraint proyectos_estado_check
  check (estado in ('vivo','pausado','muerto'));

comment on column public.proyectos.estado is
  'Ciclo de vida del proyecto en el ritual semanal. `archivado` (bool, preexistente) sigue significando "oculto de las listas".';

-- ----------------------------------------------------------------------------
-- 4. TAREAS: en espera / cancelada
-- ----------------------------------------------------------------------------
alter table public.tareas
  drop constraint if exists tareas_estado_check;
alter table public.tareas
  add constraint tareas_estado_check
  check (estado in (
    'pendiente','en_progreso','bloqueada','en_espera','hecha','descartada','cancelada','archivada'
  ));

comment on column public.tareas.estado is
  'Estado de la tarea. `en_espera` = la aparto del foco de esta semana (vuelve); `cancelada` = no la haré. Ninguna de las dos cuenta como activa.';

-- ----------------------------------------------------------------------------
-- 5. CUPO DE 10 TAREAS ACTIVAS (en la BD, no en la UI)
-- ----------------------------------------------------------------------------
-- Activas = pendiente | en_progreso | bloqueada.
-- El trigger protege CUALQUIER vía de escritura (app, ETL, SQL manual).
create or replace function public.trg_tareas_cupo_activas()
returns trigger
language plpgsql
as $$
declare
  v_activas int;
  v_cupo constant int := 10;
begin
  -- Solo cuando la tarea pasa a estar activa (o nace activa).
  if tg_op = 'UPDATE' and new.estado = old.estado then
    return new;
  end if;

  if new.estado not in ('pendiente','en_progreso','bloqueada') then
    return new;
  end if;

  select count(*) into v_activas
    from public.tareas
   where owner_id = new.owner_id
     and id is distinct from new.id
     and estado in ('pendiente','en_progreso','bloqueada');

  if v_activas >= v_cupo then
    raise exception
      'Cupo de tareas activas alcanzado (max %s). Baja alguna a "En espera" o "Cancelada" antes de activar esta.',
      v_cupo
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tareas_cupo_activas on public.tareas;
create trigger trg_tareas_cupo_activas
  before insert or update of estado on public.tareas
  for each row execute function public.trg_tareas_cupo_activas();

-- ----------------------------------------------------------------------------
-- 6. BITÁCORA SEMANAL (qué se decidió cada semana)
-- ----------------------------------------------------------------------------
create table if not exists public.ritual_semanales (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio          int not null,
  semana_iso    int not null check (semana_iso between 1 and 53),
  -- Lo que se decidió en el ritual de esa semana.
  metas_vivas   uuid[] not null default '{}',
  wigs_meta     uuid[] not null default '{}',
  krs_foco      uuid[] not null default '{}',
  metas_pausadas uuid[] not null default '{}',
  tareas_activas int not null default 0,
  notas         text,
  cerrado_en    timestamptz,
  created_at    timestamptz not null default now(),
  unique (owner_id, anio, semana_iso)
);

alter table public.ritual_semanales enable row level security;

drop policy if exists "own_select" on public.ritual_semanales;
drop policy if exists "own_insert" on public.ritual_semanales;
drop policy if exists "own_update" on public.ritual_semanales;
drop policy if exists "own_delete" on public.ritual_semanales;

create policy "own_select" on public.ritual_semanales for select using (owner_id = auth.uid());
create policy "own_insert" on public.ritual_semanales for insert with check (owner_id = auth.uid());
create policy "own_update" on public.ritual_semanales for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.ritual_semanales for delete using (owner_id = auth.uid());

comment on table public.ritual_semanales is
  'Bitácora del ritual semanal: una fila por semana ISO con lo que se decidió (metas vivas, WIGs, KRs en foco, cupo de tareas).';

-- ----------------------------------------------------------------------------
-- 7. LISTAS CONFIGURABLES (catálogo de fases de meta)
-- ----------------------------------------------------------------------------
create table if not exists public.config_listas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clave       text not null,
  valores     jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (owner_id, clave)
);

alter table public.config_listas enable row level security;

drop policy if exists "own_select" on public.config_listas;
drop policy if exists "own_insert" on public.config_listas;
drop policy if exists "own_update" on public.config_listas;
drop policy if exists "own_delete" on public.config_listas;

create policy "own_select" on public.config_listas for select using (owner_id = auth.uid());
create policy "own_insert" on public.config_listas for insert with check (owner_id = auth.uid());
create policy "own_update" on public.config_listas for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.config_listas for delete using (owner_id = auth.uid());

drop trigger if exists trg_config_listas_updated on public.config_listas;
create trigger trg_config_listas_updated before update on public.config_listas
  for each row execute function public.set_updated_at();

comment on table public.config_listas is
  'Listas de valores configurables por el usuario (p.ej. "fases_meta"). Si no hay fila, se usa el catálogo por defecto del código.';
