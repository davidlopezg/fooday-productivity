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
