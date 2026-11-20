-- ============================================================================
-- 0039_agentes_runtime.sql
--
-- Runtime seguro de agentes: ejecuciones persistentes, aprobaciones y
-- actividad. Las tablas las consume el servicio Node de runtime/, nunca el
-- navegador con credenciales privilegiadas.
-- ============================================================================

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid,
  agent_id uuid,
  state text not null default 'queued'
    check (state in ('queued','running','waiting_user','waiting_approval','completed','failed','cancelled')),
  prompt text not null,
  output text,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_owner_created
  on public.agent_runs(owner_id, created_at desc);
create index if not exists idx_agent_runs_state
  on public.agent_runs(owner_id, state);

create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  tool text not null,
  action_payload jsonb not null default '{}'::jsonb,
  reason text,
  state text not null default 'pending'
    check (state in ('pending','approved','rejected','expired')),
  expires_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_approvals_owner_state
  on public.agent_approvals(owner_id, state, created_at desc);
create index if not exists idx_agent_approvals_run
  on public.agent_approvals(run_id);

create table if not exists public.agent_activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_activity_owner_created
  on public.agent_activity_log(owner_id, created_at desc);

-- Las referencias entre runs y aprobaciones no pueden cruzar propietarios.
create or replace function public.validar_owner_agente_run()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.run_id is not null and not exists (
    select 1 from public.agent_runs
    where id = new.run_id and owner_id = new.owner_id
  ) then
    raise exception 'La run indicada no existe o no es tuya';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agent_approvals_owner on public.agent_approvals;
create trigger trg_agent_approvals_owner
  before insert or update on public.agent_approvals
  for each row execute function public.validar_owner_agente_run();

drop trigger if exists trg_agent_activity_owner on public.agent_activity_log;
create trigger trg_agent_activity_owner
  before insert on public.agent_activity_log
  for each row execute function public.validar_owner_agente_run();

drop trigger if exists trg_agent_runs_updated on public.agent_runs;
create trigger trg_agent_runs_updated before update on public.agent_runs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_agent_approvals_updated on public.agent_approvals;
create trigger trg_agent_approvals_updated before update on public.agent_approvals
  for each row execute function public.set_updated_at();

do $$
begin
  alter table public.agent_runs enable row level security;
  drop policy if exists "own_select" on public.agent_runs;
  drop policy if exists "own_insert" on public.agent_runs;
  drop policy if exists "own_update" on public.agent_runs;
  drop policy if exists "own_delete" on public.agent_runs;
  create policy "own_select" on public.agent_runs for select using (owner_id = auth.uid());
  create policy "own_insert" on public.agent_runs for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.agent_runs for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.agent_runs for delete using (owner_id = auth.uid());

  alter table public.agent_approvals enable row level security;
  drop policy if exists "own_select" on public.agent_approvals;
  drop policy if exists "own_insert" on public.agent_approvals;
  drop policy if exists "own_update" on public.agent_approvals;
  drop policy if exists "own_delete" on public.agent_approvals;
  create policy "own_select" on public.agent_approvals for select using (owner_id = auth.uid());
  create policy "own_insert" on public.agent_approvals for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.agent_approvals for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.agent_approvals for delete using (owner_id = auth.uid());

  alter table public.agent_activity_log enable row level security;
  drop policy if exists "own_select" on public.agent_activity_log;
  drop policy if exists "own_insert" on public.agent_activity_log;
  drop policy if exists "own_update" on public.agent_activity_log;
  drop policy if exists "own_delete" on public.agent_activity_log;
  create policy "own_select" on public.agent_activity_log for select using (owner_id = auth.uid());
  create policy "own_insert" on public.agent_activity_log for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.agent_activity_log for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.agent_activity_log for delete using (owner_id = auth.uid());
end $$;

notify pgrst, 'reload schema';
