-- 0040_agentes_mvp.sql — MVP estático del centro de mando de agentes.

create table if not exists public.agent_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  icono text not null default '🤖',
  especialidad text not null default '',
  objetivo text not null default '',
  prompt text not null default '',
  prompt_version integer not null default 1 check (prompt_version >= 1),
  modelo text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, nombre)
);

create table if not exists public.agent_config_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agent_configs(id) on delete cascade,
  version integer not null check (version >= 1),
  prompt text not null,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);

create table if not exists public.agent_skills_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  descripcion text not null default '',
  instrucciones text not null default '',
  herramientas text[] not null default '{}',
  version integer not null default 1 check (version >= 1),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, nombre)
);

create table if not exists public.agent_skill_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agent_configs(id) on delete cascade,
  skill_id uuid not null references public.agent_skills_mvp(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (agent_id, skill_id)
);

create table if not exists public.agent_conversations_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default 'Nueva conversación',
  proyecto_id uuid references public.proyectos(id) on delete set null,
  estado text not null default 'activa' check (estado in ('activa','archivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_conversation_participants_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.agent_conversations_mvp(id) on delete cascade,
  agent_id uuid not null references public.agent_configs(id) on delete cascade,
  rol text not null default 'participante' check (rol in ('orquestador','participante')),
  created_at timestamptz not null default now(),
  unique (conversation_id, agent_id)
);

create table if not exists public.agent_messages_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.agent_conversations_mvp(id) on delete cascade,
  agent_id uuid references public.agent_configs(id) on delete set null,
  autor text not null check (autor in ('user','agent')),
  contenido text not null,
  refs jsonb not null default '[]'::jsonb,
  propuesta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_task_assignments_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  agent_id uuid not null references public.agent_configs(id) on delete cascade,
  conversation_id uuid references public.agent_conversations_mvp(id) on delete set null,
  instrucciones text not null default '',
  estado text not null default 'asignada' check (estado in ('asignada','en_curso','esperando_usuario','completada','fallida','cancelada')),
  resultado text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_action_proposals_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid references public.agent_conversations_mvp(id) on delete cascade,
  agent_id uuid references public.agent_configs(id) on delete set null,
  tipo text not null check (tipo in ('crear_tarea')),
  payload jsonb not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','aplicando','aplicada','rechazada','error')),
  resultado jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_activity_mvp (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  agent_id uuid references public.agent_configs(id) on delete set null,
  conversation_id uuid references public.agent_conversations_mvp(id) on delete set null,
  tipo text not null,
  detalles jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_configs_owner on public.agent_configs(owner_id, activo, nombre);
create index if not exists idx_agent_skills_owner on public.agent_skills_mvp(owner_id, activo, nombre);
create index if not exists idx_agent_skill_links_owner on public.agent_skill_links(owner_id, agent_id);
create index if not exists idx_agent_conv_mvp_owner on public.agent_conversations_mvp(owner_id, updated_at desc);
create index if not exists idx_agent_messages_mvp_conv on public.agent_messages_mvp(owner_id, conversation_id, created_at);
create index if not exists idx_agent_assignments_mvp_owner on public.agent_task_assignments_mvp(owner_id, created_at desc);
create index if not exists idx_agent_proposals_mvp_owner on public.agent_action_proposals_mvp(owner_id, estado, created_at desc);
create index if not exists idx_agent_activity_mvp_owner on public.agent_activity_mvp(owner_id, created_at desc);

-- Cada relación debe pertenecer al mismo propietario que su fila principal.
create or replace function public.validar_relaciones_agentes_mvp()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'agent_config_versions' and not exists (
    select 1 from public.agent_configs where id = new.agent_id and owner_id = new.owner_id
  ) then raise exception 'El agente no existe o no es tuyo'; end if;
  if tg_table_name = 'agent_skill_links' and (
    not exists (select 1 from public.agent_configs where id = new.agent_id and owner_id = new.owner_id)
    or not exists (select 1 from public.agent_skills_mvp where id = new.skill_id and owner_id = new.owner_id)
  ) then raise exception 'Agente o skill no válidos'; end if;
  if tg_table_name = 'agent_conversation_participants_mvp' and (
    not exists (select 1 from public.agent_conversations_mvp where id = new.conversation_id and owner_id = new.owner_id)
    or not exists (select 1 from public.agent_configs where id = new.agent_id and owner_id = new.owner_id)
  ) then raise exception 'Conversación o agente no válidos'; end if;
  if tg_table_name = 'agent_messages_mvp' and not exists (
    select 1 from public.agent_conversations_mvp where id = new.conversation_id and owner_id = new.owner_id
  ) then raise exception 'La conversación no existe o no es tuya'; end if;
  if tg_table_name = 'agent_task_assignments_mvp' and (
    not exists (select 1 from public.tareas where id = new.tarea_id and owner_id = new.owner_id)
    or not exists (select 1 from public.agent_configs where id = new.agent_id and owner_id = new.owner_id)
  ) then raise exception 'Tarea o agente no válidos'; end if;
  return new;
end $$;

drop trigger if exists trg_agent_relations_mvp on public.agent_config_versions;
create trigger trg_agent_relations_mvp before insert or update on public.agent_config_versions for each row execute function public.validar_relaciones_agentes_mvp();
drop trigger if exists trg_agent_relations_mvp on public.agent_skill_links;
create trigger trg_agent_relations_mvp before insert or update on public.agent_skill_links for each row execute function public.validar_relaciones_agentes_mvp();
drop trigger if exists trg_agent_relations_mvp on public.agent_conversation_participants_mvp;
create trigger trg_agent_relations_mvp before insert or update on public.agent_conversation_participants_mvp for each row execute function public.validar_relaciones_agentes_mvp();
drop trigger if exists trg_agent_relations_mvp on public.agent_messages_mvp;
create trigger trg_agent_relations_mvp before insert or update on public.agent_messages_mvp for each row execute function public.validar_relaciones_agentes_mvp();
drop trigger if exists trg_agent_relations_mvp on public.agent_task_assignments_mvp;
create trigger trg_agent_relations_mvp before insert or update on public.agent_task_assignments_mvp for each row execute function public.validar_relaciones_agentes_mvp();

-- Una propuesta y la actividad pertenecen al propietario de su conversación.
create or replace function public.validar_conversacion_agentes_mvp()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.conversation_id is not null and not exists (
    select 1 from public.agent_conversations_mvp where id = new.conversation_id and owner_id = new.owner_id
  ) then raise exception 'La conversación no existe o no es tuya'; end if;
  if tg_table_name = 'agent_conversations_mvp' and new.proyecto_id is not null and not exists (
    select 1 from public.proyectos where id = new.proyecto_id and owner_id = new.owner_id
  ) then raise exception 'El proyecto no existe o no es tuyo'; end if;
  return new;
end $$;
drop trigger if exists trg_agent_conv_owner_project on public.agent_conversations_mvp;
create trigger trg_agent_conv_owner_project before insert or update on public.agent_conversations_mvp for each row execute function public.validar_conversacion_agentes_mvp();
drop trigger if exists trg_agent_proposal_conv on public.agent_action_proposals_mvp;
create trigger trg_agent_proposal_conv before insert or update on public.agent_action_proposals_mvp for each row execute function public.validar_conversacion_agentes_mvp();
drop trigger if exists trg_agent_activity_conv on public.agent_activity_mvp;
create trigger trg_agent_activity_conv before insert or update on public.agent_activity_mvp for each row execute function public.validar_conversacion_agentes_mvp();

drop trigger if exists trg_agent_configs_updated on public.agent_configs;
create trigger trg_agent_configs_updated before update on public.agent_configs for each row execute function public.set_updated_at();
drop trigger if exists trg_agent_skills_updated on public.agent_skills_mvp;
create trigger trg_agent_skills_updated before update on public.agent_skills_mvp for each row execute function public.set_updated_at();
drop trigger if exists trg_agent_conv_mvp_updated on public.agent_conversations_mvp;
create trigger trg_agent_conv_mvp_updated before update on public.agent_conversations_mvp for each row execute function public.set_updated_at();
drop trigger if exists trg_agent_assignments_mvp_updated on public.agent_task_assignments_mvp;
create trigger trg_agent_assignments_mvp_updated before update on public.agent_task_assignments_mvp for each row execute function public.set_updated_at();
drop trigger if exists trg_agent_proposals_mvp_updated on public.agent_action_proposals_mvp;
create trigger trg_agent_proposals_mvp_updated before update on public.agent_action_proposals_mvp for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['agent_configs','agent_config_versions','agent_skills_mvp','agent_skill_links','agent_conversations_mvp','agent_conversation_participants_mvp','agent_messages_mvp','agent_task_assignments_mvp','agent_action_proposals_mvp','agent_activity_mvp'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('drop policy if exists own_delete on public.%I', t);
    execute format('create policy own_select on public.%I for select using (owner_id = auth.uid())', t);
    execute format('create policy own_insert on public.%I for insert with check (owner_id = auth.uid())', t);
    execute format('create policy own_update on public.%I for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
    execute format('create policy own_delete on public.%I for delete using (owner_id = auth.uid())', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
