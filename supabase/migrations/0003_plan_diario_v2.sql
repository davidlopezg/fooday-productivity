-- fooday-productivity: plan diario v2
-- Aplica sobre el esquema existente.
-- Idempotente: las cláusulas usan IF NOT EXISTS donde aplica.

-- Reemplaza la constraint única original (owner_id, fecha) por una nueva
-- que permita varias generaciones del mismo día.
alter table public.planes_diarios
  drop constraint if exists planes_diarios_owner_id_fecha_key;

alter table public.planes_diarios
  add column if not exists reflexion      text,
  add column if not exists contexto_extra text,
  add column if not exists notas          text,
  add column if not exists num_generacion int  not null default 1,
  add column if not exists origen         text not null default 'manual';

-- La nueva constraint única: (owner_id, fecha, num_generacion).
-- Usamos DO block porque PostgreSQL no soporta ADD CONSTRAINT IF NOT EXISTS.
do $$
begin
  alter table public.planes_diarios
    add constraint planes_diarios_owner_id_fecha_gen_key
    unique (owner_id, fecha, num_generacion);
exception when duplicate_object then
  null; -- ya existe, idempotente
end $$;

alter table public.plan_diario_tareas
  add column if not exists es_ia            boolean not null default false,
  add column if not exists bloque_energia   text
    check (bloque_energia in ('regular','estrategia','ejecucion','mecanica')),
  add column if not exists bloque_cognitivo text
    check (bloque_cognitivo in ('foco','operativa','distribuida')),
  add column if not exists es_tarea_libre   boolean not null default false;

create index if not exists idx_pdt_ia     on public.plan_diario_tareas(es_ia);
create index if not exists idx_pdt_cogni  on public.plan_diario_tareas(bloque_cognitivo);

create table if not exists public.plan_diario_subtareas (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_diario_tarea_id uuid not null references public.plan_diario_tareas(id) on delete cascade,
  descripcion          text not null,
  orden                int  not null default 0,
  hecho                boolean not null default false,
  tiempo_estimado_min  int,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_pdst_tarea on public.plan_diario_subtareas(plan_diario_tarea_id);

create table if not exists public.plan_diario_bloques (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_diario_id uuid not null references public.planes_diarios(id) on delete cascade,
  tipo           text not null
                 check (tipo in ('manana_autocuidado','primer_trabajo','comida','segundo_trabajo','noche')),
  hora_inicio    text not null,
  hora_fin       text not null,
  titulo         text not null,
  contenido      text not null,
  orden          int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_pdb_plan on public.plan_diario_bloques(plan_diario_id, orden);

create table if not exists public.plan_diario_borradores (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_diario_tarea_id uuid not null references public.plan_diario_tareas(id) on delete cascade,
  tipo                 text not null
                       check (tipo in ('email','whatsapp','documento','otro')),
  contenido            text not null,
  prompt_usado         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_pdborr_tarea on public.plan_diario_borradores(plan_diario_tarea_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array[
    'plan_diario_subtareas',
    'plan_diario_bloques',
    'plan_diario_borradores'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on public.%1$s; create trigger trg_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at();',
      t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'plan_diario_subtareas',
    'plan_diario_bloques',
    'plan_diario_borradores'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'drop policy if exists "own_select" on public.%1$s; drop policy if exists "own_insert" on public.%1$s; drop policy if exists "own_update" on public.%1$s; drop policy if exists "own_delete" on public.%1$s; create policy "own_select" on public.%1$s for select using (owner_id = auth.uid()); create policy "own_insert" on public.%1$s for insert with check (owner_id = auth.uid()); create policy "own_update" on public.%1$s for update using (owner_id = auth.uid()) with check (owner_id = auth.uid()); create policy "own_delete" on public.%1$s for delete using (owner_id = auth.uid());',
      t);
  end loop;
end $$;