-- ============================================================================
-- APLICAR-PENDIENTES.sql
--
-- Pegar TODO esto en Supabase → SQL Editor → Run.
--
-- Son las migraciones 0005 → 0008 (columnas subtareas y criterio_terminacion,
-- plan diario v3 + RPC upsert_tarea_by_titulo, y adjuntos por tarea).
-- Todas son idempotentes: se pueden ejecutar varias veces sin romper nada.
--
-- Este archivo NO está en supabase/migrations/ a propósito, para no
-- duplicar migraciones cuando hagas `supabase db push` desde el PC.
-- ============================================================================


-- ############################################################################
-- ## 0005_tareas_subtareas.sql
-- ############################################################################

-- ============================================================================
-- 0005_tareas_subtareas.sql
-- Añade la columna `subtareas` (JSONB) a `tareas` para guardar el
-- desglose al máximo posible generado por la IA (botón "Desgranar al máximo
-- posible" dentro del detalle de cada tarea).
--
-- Formato JSON esperado (array, ordenado):
--   [
--     { "descripcion": "...", "tiempo_estimado_min": 5, "hecho": false },
--     ...
--   ]
--
-- La columna es opcional (NULL por defecto). Las políticas RLS ya existentes
-- sobre `tareas` aplican también a esta columna (es parte de la misma fila).
-- ============================================================================

alter table public.tareas
  add column if not exists subtareas jsonb;

comment on column public.tareas.subtareas is
  'Desglose al máximo posible de la tarea (IA o manual). Array JSON de {descripcion, tiempo_estimado_min?, hecho?}.';
-- ############################################################################
-- ## 0006_plan_diario_v3.sql
-- ############################################################################

-- ============================================================================
-- 0006_plan_diario_v3.sql
-- Plan diario v3 — estructura minimal:
--   Parte 1 (input):  estado emocional libre + tareas sueltas
--   Parte 2 (output): análisis psicológico + timeblocking 4 bloques + comida
--
-- Aplica sobre el esquema existente. No rompe el informe rico previo
-- (sigue en planes_diarios.informe_json y en plan_diario_tareas.*).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Columnas nuevas en planes_diarios (caben en la misma fila del plan)
-- ----------------------------------------------------------------------------
alter table public.planes_diarios
  add column if not exists estado_emocional_texto       text,
  add column if not exists analisis_emocional_ia        text,
  add column if not exists tendencia_ia                 text,
  add column if not exists recomendacion_psicologica_ia text,
  add column if not exists contexto_dia_ia              text,
  add column if not exists num_bloques_activos          int
    check (num_bloques_activos is null or num_bloques_activos between 1 and 4),
  add column if not exists comida_titulo                text,
  add column if not exists comida_descripcion           text,
  add column if not exists comida_motivo                text;

-- ----------------------------------------------------------------------------
-- 2. Columnas nuevas en plan_diario_tareas (timeblocking 4 bloques)
-- ----------------------------------------------------------------------------
alter table public.plan_diario_tareas
  add column if not exists bloque_num int
    check (bloque_num is null or bloque_num between 1 and 4),
  add column if not exists tipo_tarea text
    check (tipo_tarea is null or tipo_tarea in ('profunda','rapida'));

create index if not exists idx_pdt_bloque
  on public.plan_diario_tareas(plan_diario_id, bloque_num);

-- ----------------------------------------------------------------------------
-- 3. RPC: upsert idempotente de tarea por título
--    Regla del producto: si la tarea ya existe (mismo owner + título
--    normalizado case-insensitive), devuelve su id. Si no, crea una nueva.
--    Esto evita duplicados al meter tareas sueltas desde el formulario.
-- ----------------------------------------------------------------------------
create or replace function public.upsert_tarea_by_titulo(p_titulo text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_titulo_norm  text;
  v_existente_id uuid;
  v_owner        uuid;
  v_nueva_id     uuid;
begin
  v_titulo_norm := lower(trim(p_titulo));
  if v_titulo_norm is null or v_titulo_norm = '' then
    raise exception 'Título vacío';
  end if;

  v_owner := auth.uid();
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  -- 1) buscar existente (case-insensitive, trimmed)
  select id into v_existente_id
  from public.tareas
  where owner_id = v_owner
    and lower(trim(titulo)) = v_titulo_norm
  limit 1;

  if v_existente_id is not null then
    return v_existente_id;
  end if;

  -- 2) crear nueva
  insert into public.tareas (owner_id, titulo, estado, origen, prioridad)
  values (v_owner, trim(p_titulo), 'pendiente', 'plan_diario', 'media')
  returning id into v_nueva_id;

  return v_nueva_id;
end;
$$;

grant execute on function public.upsert_tarea_by_titulo(text) to authenticated;

-- ############################################################################
-- ## 0007_tareas_criterio_terminacion.sql
-- ############################################################################

-- ============================================================================
-- 0007_tareas_criterio_terminacion.sql
-- Añade la columna `criterio_terminacion` (text, opcional) a `tareas`.
--
-- Es la regla "HECHA cuando __________" — una sola línea que describe bajo
-- qué condición concreta la tarea se considera terminada. Si no se puede
-- escribir, no es una tarea: es un proyecto (parte en trozos hasta que cada
-- trozo tenga su "hecha cuando").
--
-- Nullable: las tareas existentes quedan con NULL (no rompe nada). Las
-- políticas RLS ya existentes sobre `tareas` aplican también a esta columna
-- (es parte de la misma fila).
-- ============================================================================

alter table public.tareas
  add column if not exists criterio_terminacion text;

comment on column public.tareas.criterio_terminacion is
  'Frase corta "Esta tarea está HECHA cuando __________". Si no se puede escribir, es un proyecto (partir en trozos).';

-- ############################################################################
-- ## 0008_tareas_adjuntos.sql
-- ############################################################################

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

-- ============================================================================
-- Refresca la caché de esquema de PostgREST (por si acaso).
-- Sin esto, la API puede seguir diciendo "column ... in the schema cache".
-- ============================================================================
notify pgrst, 'reload schema';
