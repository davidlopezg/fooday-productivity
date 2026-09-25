-- ============================================================================
-- 0008_tareas_adjuntos.sql
-- Adjuntos por tarea (1+ archivos por tarea).
-- Los bytes viven en Supabase Storage (bucket privado "tareas-adjuntos");
-- aquí guardamos SOLO los metadatos + el path dentro del bucket.
--
-- Estructura del path dentro del bucket:
--   <owner_id>/<tarea_id>/<uuid>-<filename>
-- Esa forma permite que el RLS del Storage sea por owner de forma limpia:
-- (storage.foldername(name))[1] = auth.uid()::text
--
-- El bucket es PRIVADO: descargar exige un signed URL temporal.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de metadatos
-- ----------------------------------------------------------------------------
create table if not exists public.tarea_adjuntos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id      uuid not null references public.tareas(id) on delete cascade,
  filename      text not null,                       -- nombre original
  mime          text,                                -- mime del archivo (opcional)
  size_bytes    bigint,                              -- tamaño en bytes (opcional)
  storage_path  text not null,                       -- ruta dentro del bucket
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tarea_adjuntos_tarea
  on public.tarea_adjuntos(tarea_id);

create index if not exists idx_tarea_adjuntos_owner_tarea
  on public.tarea_adjuntos(owner_id, tarea_id);

-- updated_at trigger
drop trigger if exists trg_tarea_adjuntos_updated on public.tarea_adjuntos;
create trigger trg_tarea_adjuntos_updated before update on public.tarea_adjuntos
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. RLS (mismo patrón que el resto del proyecto: cada usuario solo ve lo suyo)
-- ----------------------------------------------------------------------------
alter table public.tarea_adjuntos enable row level security;

drop policy if exists "own_select" on public.tarea_adjuntos;
drop policy if exists "own_insert" on public.tarea_adjuntos;
drop policy if exists "own_update" on public.tarea_adjuntos;
drop policy if exists "own_delete" on public.tarea_adjuntos;

create policy "own_select" on public.tarea_adjuntos
  for select using (owner_id = auth.uid());

create policy "own_insert" on public.tarea_adjuntos
  for insert with check (owner_id = auth.uid());

create policy "own_update" on public.tarea_adjuntos
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "own_delete" on public.tarea_adjuntos
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Bucket privado de Storage (idempotente)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tareas-adjuntos',
  'tareas-adjuntos',
  false,                              -- privado: requiere signed URL
  10485760,                           -- 10 MB / archivo
  null                                -- sin whitelist de mimes
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- ----------------------------------------------------------------------------
-- 4. Policies del Storage (RLS sobre storage.objects)
-- Solo el dueño puede subir/ver/borrar los objetos bajo
--   auth.uid()/<tarea_id>/<filename>
-- ----------------------------------------------------------------------------

drop policy if exists "tareas_adjuntos_select" on storage.objects;
drop policy if exists "tareas_adjuntos_insert" on storage.objects;
drop policy if exists "tareas_adjuntos_update" on storage.objects;
drop policy if exists "tareas_adjuntos_delete" on storage.objects;

-- Carpeta raíz = auth.uid() del propietario del archivo
create policy "tareas_adjuntos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tareas-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tareas_adjuntos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tareas-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tareas_adjuntos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'tareas-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'tareas-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "tareas_adjuntos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tareas-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
