-- ============================================================================
-- APLICAR-PENDIENTES.sql
--
-- Pegar TODO esto en Supabase → SQL Editor → Run.
--
-- Son las migraciones 0005 → 0008 + 0010 (columnas subtareas y criterio_terminacion,
-- plan diario v3 + RPC upsert_tarea_by_titulo, adjuntos por tarea y migración de
-- `subtareas` JSONB a tabla relacional `tareas_subtareas`).
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

-- ############################################################################
-- ## 0010_tareas_subtareas_tabla.sql
-- ############################################################################

create table if not exists public.tareas_subtareas (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tarea_id             uuid not null references public.tareas(id) on delete cascade,
  descripcion          text not null,
  tiempo_estimado_min  int  check (tiempo_estimado_min is null or tiempo_estimado_min between 1 and 5),
  hecho                boolean not null default false,
  orden                int  not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_tareas_subtareas_tarea on public.tareas_subtareas(tarea_id);
create index if not exists idx_tareas_subtareas_owner_tarea on public.tareas_subtareas(owner_id, tarea_id);
create index if not exists idx_tareas_subtareas_pendientes on public.tareas_subtareas(tarea_id) where hecho = false;

drop trigger if exists trg_tareas_subtareas_updated on public.tareas_subtareas;
create trigger trg_tareas_subtareas_updated before update on public.tareas_subtareas
  for each row execute function public.set_updated_at();

alter table public.tareas_subtareas enable row level security;

drop policy if exists "own_select" on public.tareas_subtareas;
drop policy if exists "own_insert" on public.tareas_subtareas;
drop policy if exists "own_update" on public.tareas_subtareas;
drop policy if exists "own_delete" on public.tareas_subtareas;

create policy "own_select" on public.tareas_subtareas for select using (owner_id = auth.uid());
create policy "own_insert" on public.tareas_subtareas for insert with check (owner_id = auth.uid());
create policy "own_update" on public.tareas_subtareas for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.tareas_subtareas for delete using (owner_id = auth.uid());

-- Migración JSONB -> filas (idempotente)
do $$
declare v_count int;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tareas'
      and column_name='subtareas' and data_type='jsonb'
  ) then
    delete from public.tareas_subtareas ts
    where exists (
      select 1 from public.tareas t
      where t.id = ts.tarea_id and t.subtareas is not null and jsonb_typeof(t.subtareas)='array'
    );
    with parsed as (
      select t.id as tarea_id, t.owner_id, b.ord as orden,
        nullif(btrim(coalesce(b.elem->>'descripcion','')),'') as descripcion,
        case
          when (b.elem ? 'tiempo_estimado_min')
               and (b.elem->>'tiempo_estimado_min') ~ '^[0-9]+$'
               and (b.elem->>'tiempo_estimado_min')::int between 1 and 5
            then (b.elem->>'tiempo_estimado_min')::int
          else null
        end as tiempo_estimado_min,
        coalesce((b.elem->>'hecho')::boolean, false) as hecho
      from public.tareas t
      cross join lateral jsonb_array_elements(t.subtareas) with ordinality as b(elem, ord)
      where t.subtareas is not null and jsonb_typeof(t.subtareas)='array'
    )
    insert into public.tareas_subtareas (tarea_id, owner_id, orden, descripcion, tiempo_estimado_min, hecho)
    select tarea_id, owner_id, orden, descripcion, tiempo_estimado_min, hecho from parsed
    where descripcion is not null;
    get diagnostics v_count = row_count;
    raise notice '[0010] Migradas % subtareas', v_count;
  end if;
end $$;

alter table public.tareas drop column if exists subtareas;

-- ============================================================================
-- Refresca la caché de esquema de PostgREST (por si acaso).
-- Sin esto, la API puede seguir diciendo "column ... in the schema cache".
-- ============================================================================
notify pgrst, 'reload schema';

-- ############################################################################
-- ## 0013_estatus_diarios.sql
-- ############################################################################

-- ============================================================================
-- 0013_estatus_diarios.sql
-- Diario de estatus diario (versión app del agente `agente-estatus-diario`).
-- 1 entrada por día, 9 hábitos como columnas CHECK, comidas en tabla hija.
-- ============================================================================

create table if not exists public.estatus_diarios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null,

  -- Productividad
  tareas_profesionales    text,
  tareas_personales       text,
  trabajo_futuro_ideal    text,
  tareas_nuevas           text,
  correos_importantes     text,
  tareas_no_terminadas    text,

  -- Estado emocional / mental
  estado_emocional            text,
  pensamientos_emociones      text,
  bloqueos_procrastinacion    text,
  ideas_nuevas                text,
  agradecimientos             text,
  lo_que_hiciste_bien         text,

  -- Relaciones
  tiempo_pareja   text,
  tiempo_hija     text,
  tareas_hogar    text,

  -- Bienestar
  uso_movil_min           int  check (uso_movil_min is null or uso_movil_min >= 0),
  acto_de_bondad          text,
  cuido_cuerpo            text,
  mente_subconsciente     text,

  -- 9 hábitos personales
  habito_qigong           text check (habito_qigong in ('hecho','parcial','no')),
  habito_caminar          text check (habito_caminar in ('hecho','parcial','no')),
  habito_ducha            text check (habito_ducha in ('hecho','parcial','no')),
  habito_meditacion       text check (habito_meditacion in ('hecho','parcial','no')),
  habito_desayuno         text check (habito_desayuno in ('hecho','parcial','no')),
  habito_vaciado_mental   text check (habito_vaciado_mental in ('hecho','parcial','no')),
  habito_comida_siesta    text check (habito_comida_siesta in ('hecho','parcial','no')),
  habito_estatus          text check (habito_estatus in ('hecho','parcial','no')),
  habito_3_cosas_buenas  text check (habito_3_cosas_buenas in ('hecho','parcial','no')),

  -- Auditoría 20/80
  audit_tareas_criticas          int  check (audit_tareas_criticas between 0 and 3),
  audit_termino_3_principales    boolean,
  audit_anadio_sin_terminar      boolean,
  audit_eran_20_80               text check (audit_eran_20_80 in ('si','no','parcial')),
  audit_sintio                   text check (audit_sintio in ('cumpli','corri','nada')),

  -- Cierre Cognitivo
  cierre_que_consigo              text,
  cierre_queda_abierto            text,
  cierre_decisiones_tomadas       text,
  cierre_carga_mental             text,
  cierre_primer_problema_manana   text,

  -- Salida emocional / micro-acción
  podes_soltar          text,
  micro_accion_manana   text,

  -- Semáforo
  semaforo   text check (semaforo in ('verde','amarillo','rojo')),

  -- Veredicto del agente LLM (opcional)
  reflexion_agente   text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (owner_id, fecha)
);

create index if not exists idx_estatus_diarios_owner_fecha
  on public.estatus_diarios(owner_id, fecha desc);

drop trigger if exists trg_estatus_diarios_updated on public.estatus_diarios;
create trigger trg_estatus_diarios_updated before update on public.estatus_diarios
  for each row execute function public.set_updated_at();

alter table public.estatus_diarios enable row level security;

drop policy if exists "own_select" on public.estatus_diarios;
drop policy if exists "own_insert" on public.estatus_diarios;
drop policy if exists "own_update" on public.estatus_diarios;
drop policy if exists "own_delete" on public.estatus_diarios;

create policy "own_select" on public.estatus_diarios
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.estatus_diarios
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.estatus_diarios
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.estatus_diarios
  for delete using (owner_id = auth.uid());

-- Tabla hija de comidas
create table if not exists public.estatus_comidas (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  estatus_id   uuid not null references public.estatus_diarios(id) on delete cascade,
  hora         time,
  descripcion  text not null,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_estatus_comidas_estatus
  on public.estatus_comidas(estatus_id, orden);

alter table public.estatus_comidas enable row level security;

drop policy if exists "own_select" on public.estatus_comidas;
drop policy if exists "own_insert" on public.estatus_comidas;
drop policy if exists "own_update" on public.estatus_comidas;
drop policy if exists "own_delete" on public.estatus_comidas;

create policy "own_select" on public.estatus_comidas
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.estatus_comidas
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.estatus_comidas
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.estatus_comidas
  for delete using (owner_id = auth.uid());

notify pgrst, 'reload schema';
