-- ============================================================================
-- fooday-productivity — Esquema inicial
-- Dominio: OPERATIVO (propósito, valores, visión, metas/OKR, tareas,
--          rituales, plan semanal, plan diario, capturas).
-- NO incluye: finanzas, salud, legal, familia sensible.
-- ============================================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Utilidad: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. ÁREAS
-- ----------------------------------------------------------------------------
create table if not exists public.areas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  color       text default '#64748b',
  orden       int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (owner_id, nombre)
);

-- ----------------------------------------------------------------------------
-- 2. PROPÓSITO / VALORES / VISIÓN  (el "Norte")
-- ----------------------------------------------------------------------------
create table if not exists public.propositos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area_id     uuid references public.areas(id) on delete set null,
  texto       text not null,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.valores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.visiones (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  horizonte   text not null default 'largo plazo',
  texto       text not null,
  es_bhag     boolean not null default false,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. METAS / OKR / HITOS
-- ----------------------------------------------------------------------------
create table if not exists public.metas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area_id     uuid references public.areas(id) on delete set null,
  codigo      text,                                   -- p.ej. "008"
  titulo      text not null,
  descripcion text,
  estado      text not null default 'sin_empezar'
              check (estado in ('sin_empezar','en_progreso','bloqueada','completada','archivada')),
  prioridad   text default 'media'
              check (prioridad in ('critica','alta','media','baja')),
  rice        numeric,                                -- RICE scoring
  plazo       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.okrs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id     uuid references public.metas(id) on delete cascade,
  objetivo    text not null,
  periodo     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.key_results (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  okr_id      uuid not null references public.okrs(id) on delete cascade,
  descripcion text not null,
  target      numeric,
  actual      numeric default 0,
  unidad      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.hitos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meta_id     uuid not null references public.metas(id) on delete cascade,
  titulo      text not null,
  completado  boolean not null default false,
  fecha       date,
  orden       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. RITUALES (reglas fijas de la semana)
-- ----------------------------------------------------------------------------
create table if not exists public.rituales (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia_semana  int not null check (dia_semana between 1 and 7),  -- ISO: 1=lunes
  hora        text,
  bloque      text,
  descripcion text not null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. TAREAS
-- ----------------------------------------------------------------------------
create table if not exists public.tareas (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area_id        uuid references public.areas(id) on delete set null,
  meta_id        uuid references public.metas(id) on delete set null,
  codigo         text,                                 -- p.ej. "T21", "S1", "P3"
  titulo         text not null,
  descripcion    text,
  prioridad      text default 'media'
                 check (prioridad in ('critica','urgente','alta','media','baja')),
  capa           text,                                 -- CAPA 1/2/3
  deadline       text,
  pts            numeric,
  esfuerzo       text,
  importe        numeric,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','en_progreso','bloqueada','hecha','descartada','archivada')),
  origen         text,                                 -- "tareas-notion.md", "manual", etc.
  notas          text,
  completada_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (owner_id, codigo)
);

create index if not exists idx_tareas_estado on public.tareas(estado);
create index if not exists idx_tareas_prioridad on public.tareas(prioridad);
create index if not exists idx_tareas_area on public.tareas(area_id);
create index if not exists idx_tareas_meta on public.tareas(meta_id);
create index if not exists idx_tareas_capa on public.tareas(capa);

-- Claves de idempotencia para la importación desde el repo de inteligencia
create unique index if not exists uq_metas_owner_codigo on public.metas(owner_id, codigo);
create unique index if not exists uq_rituales_owner on public.rituales(owner_id, dia_semana, coalesce(hora, ''), descripcion);

-- ----------------------------------------------------------------------------
-- 6. PLAN SEMANAL
-- ----------------------------------------------------------------------------
create table if not exists public.planes_semanales (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  anio          int not null,
  semana_iso    int not null,                          -- 1..53
  fecha_inicio  date,
  fecha_fin     date,
  bhag          text,
  okrs_resumen  text,
  resumen       text,
  ruta_md       text,                                  -- referencia al .md origen (si existe)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, anio, semana_iso)
);

-- ----------------------------------------------------------------------------
-- 7. PLAN DIARIO + TAREAS DEL DÍA
-- ----------------------------------------------------------------------------
create table if not exists public.planes_diarios (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha           date not null,
  semaforo        text check (semaforo in ('verde','amarillo','rojo')),
  despertar       text,
  mente           text,
  cuerpo          text,
  rueda           text,
  necesidad       text,
  resumen         text,
  recomendacion   text,
  ruta_md         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_id, fecha)
);

create table if not exists public.plan_diario_tareas (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_diario_id uuid not null references public.planes_diarios(id) on delete cascade,
  tarea_id      uuid references public.tareas(id) on delete set null,
  tipo          text not null default 'imprescindible'
                check (tipo in ('imprescindible','autocuidado','micro','extra')),
  titulo_libre  text,
  hecho         boolean not null default false,
  orden         int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_pdt_plan on public.plan_diario_tareas(plan_diario_id);

-- ----------------------------------------------------------------------------
-- 8. CAPTURAS (inbox / vaciar-cabeza)
-- ----------------------------------------------------------------------------
create table if not exists public.capturas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null default current_date,
  rama        text check (rama in ('tarea','problema','reflexion','idea','pago','maria','sin_clasificar')),
  texto       text not null,
  estado      text not null default 'pendiente'
              check (estado in ('pendiente','procesada','descartada')),
  destino     text,                                    -- tabla/entidad a la que se procesó
  sesion_ref  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_capturas_estado on public.capturas(estado);

-- ----------------------------------------------------------------------------
-- Triggers updated_at
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'areas','propositos','valores','visiones','metas','okrs','key_results',
    'hitos','rituales','tareas','planes_semanales','planes_diarios',
    'plan_diario_tareas','capturas'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s;
       create trigger trg_%1$s_updated before update on public.%1$s
       for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (cada usuario solo ve lo suyo)
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'areas','propositos','valores','visiones','metas','okrs','key_results',
    'hitos','rituales','tareas','planes_semanales','planes_diarios',
    'plan_diario_tareas','capturas'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'drop policy if exists "own_select" on public.%1$s;
       drop policy if exists "own_insert" on public.%1$s;
       drop policy if exists "own_update" on public.%1$s;
       drop policy if exists "own_delete" on public.%1$s;
       create policy "own_select" on public.%1$s for select using (owner_id = auth.uid());
       create policy "own_insert" on public.%1$s for insert with check (owner_id = auth.uid());
       create policy "own_update" on public.%1$s for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
       create policy "own_delete" on public.%1$s for delete using (owner_id = auth.uid());', t);
  end loop;
end $$;
