-- ============================================================================
-- Configuración personal (Base URL, API key de MiniMax, modelo)
-- Una fila por usuario.
-- ============================================================================

create table if not exists public.configuracion (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  base_url         text not null default 'https://api.minimax.io/v1',
  minimax_api_key  text,
  model            text not null default 'Minimax-M3',
  updated_at       timestamptz not null default now()
);

-- Por si la tabla ya existía sin base_url
alter table public.configuracion
  add column if not exists base_url text not null default 'https://api.minimax.io/v1';

alter table public.configuracion enable row level security;

create policy "own_select" on public.configuracion for select using (user_id = auth.uid());
create policy "own_insert" on public.configuracion for insert with check (user_id = auth.uid());
create policy "own_update" on public.configuracion for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_delete" on public.configuracion for delete using (user_id = auth.uid());

drop trigger if exists trg_configuracion_updated on public.configuracion;
create trigger trg_configuracion_updated before update on public.configuracion
  for each row execute function public.set_updated_at();
