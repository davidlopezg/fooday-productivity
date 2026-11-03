-- ============================================================================
-- 0035_agente_chat.sql
--
-- EL CHAT DEL AGENTE (presente en toda la app)
--
-- EL PROBLEMA QUE RESUELVE
--   La app tiene muchísimos datos (proyectos, metas, KRs, tareas, planes) y
--   la única forma de "preguntar" por ellos hoy es abrirlos a mano, uno por
--   uno. El agente de /agente SOLO crea estructura: no consulta el estado
--   real del sistema. Faltaba un "pregúntale a tu sistema".
--
-- LA SOLUCIÓN
--   Un chat global (presente en todas las pantallas) que consulta los datos
--   reales del usuario y responde. Las conversaciones se GUARDAN para poder
--   retomarlas.
--
-- DECISIONES (ponytail — mínimo que funciona)
--   · El chat es de LECTURA. No escribe nada en el dominio (no crea metas,
--     no completa tareas). Escribir es cosa de /agente, que ya tiene su
--     flujo de revisión humana.
--   · El contexto (datos) se arma EN EL CLIENTE y se mete en el prompt.
--     La app es una SPA estática (output: 'export'): no hay route handlers
--     ni server actions donde meter una tool-calling. Ver src/lib/agente/.
--   · Dos tablas (conversaciones + mensajes) en vez de una con JSONB: el
--     historial se lee, escribe y pagina con queries simples, sin
--     read-modify-write del blob entero en cada mensaje.
--   · `refs` (jsonb) guarda las entidades que la respuesta menciona
--     (proyecto/meta/KR/tarea) para poder pintarlas como enlaces navegables.
--
-- NADA SE BORRA: son tablas nuevas. `on delete cascade` desde
-- `auth.users` y desde la conversación.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Conversaciones
-- ----------------------------------------------------------------------------
create table if not exists public.agente_conversaciones (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Título legible (se genera con el primer mensaje). NULL = sin título.
  titulo      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_agente_conversaciones_owner
  on public.agente_conversaciones(owner_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- 2. Mensajes
-- ----------------------------------------------------------------------------
create table if not exists public.agente_mensajes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversacion_id uuid not null references public.agente_conversaciones(id) on delete cascade,
  rol             text not null check (rol in ('user', 'assistant')),
  contenido       text not null,
  -- Referencias a entidades del dominio que menciona la respuesta:
  --   [{ "tipo": "proyecto"|"meta"|"kr"|"tarea", "id": "...", "etiqueta": "..." }]
  refs            jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_agente_mensajes_conversacion
  on public.agente_mensajes(conversacion_id, created_at);

-- ----------------------------------------------------------------------------
-- 3. RLS — las mismas 4 políticas que usa el resto de la app.
-- ----------------------------------------------------------------------------
do $$
begin
  alter table public.agente_conversaciones enable row level security;
  drop policy if exists "own_select" on public.agente_conversaciones;
  drop policy if exists "own_insert" on public.agente_conversaciones;
  drop policy if exists "own_update" on public.agente_conversaciones;
  drop policy if exists "own_delete" on public.agente_conversaciones;
  create policy "own_select" on public.agente_conversaciones for select using (owner_id = auth.uid());
  create policy "own_insert" on public.agente_conversaciones for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.agente_conversaciones for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.agente_conversaciones for delete using (owner_id = auth.uid());

  alter table public.agente_mensajes enable row level security;
  drop policy if exists "own_select" on public.agente_mensajes;
  drop policy if exists "own_insert" on public.agente_mensajes;
  drop policy if exists "own_update" on public.agente_mensajes;
  drop policy if exists "own_delete" on public.agente_mensajes;
  create policy "own_select" on public.agente_mensajes for select using (owner_id = auth.uid());
  create policy "own_insert" on public.agente_mensajes for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.agente_mensajes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.agente_mensajes for delete using (owner_id = auth.uid());
end $$;

-- ----------------------------------------------------------------------------
-- 4. Trigger `updated_at` (misma función que usa el resto de la app)
-- ----------------------------------------------------------------------------
drop trigger if exists trg_agente_conversaciones_updated on public.agente_conversaciones;
create trigger trg_agente_conversaciones_updated before update on public.agente_conversaciones
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Trigger: cada mensaje "toca" su conversación.
--    Así el historial se ordena por última actividad sin que el cliente
--    tenga que acordarse de hacer un UPDATE extra.
--
--    De paso se valida la INTEGRIDAD: un mensaje solo puede vivir en una
--    conversación del MISMO owner. La política RLS del INSERT solo mira
--    `agente_mensajes.owner_id`; sin esta comprobación, un usuario podría
--    meter un mensaje en la conversación de otro (y moverle el
--    `updated_at`). El trigger lo corta en la BD.
-- ----------------------------------------------------------------------------
create or replace function public.tocar_conversacion_agente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.agente_conversaciones
    where id = new.conversacion_id
      and owner_id = new.owner_id
  ) then
    raise exception 'La conversación % no existe o no es tuya', new.conversacion_id;
  end if;

  update public.agente_conversaciones
     set updated_at = now()
   where id = new.conversacion_id
     and owner_id = new.owner_id;
  return new;
end;
$$;

grant execute on function public.tocar_conversacion_agente() to authenticated;

drop trigger if exists trg_agente_mensajes_toca_conversacion on public.agente_mensajes;
create trigger trg_agente_mensajes_toca_conversacion
  before insert on public.agente_mensajes
  for each row execute function public.tocar_conversacion_agente();

-- ----------------------------------------------------------------------------
-- 6. Refresh PostgREST cache.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
