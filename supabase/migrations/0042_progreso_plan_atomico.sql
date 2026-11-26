-- ============================================================================
-- 0042_progreso_plan_atomico.sql
-- issue #23 — El estado de una tarea y su reflejo en el plan del día se
-- escriben ATÓMICAMENTE (una sola transacción) y, si alguna vez se quedan
-- descuadrados, el plan se RECONCILIA al leerlo.
--
-- Antes: `marcarHecha()` hacía dos escrituras sueltas (UPDATE de `tareas` y
-- UPDATE de `plan_diario_tareas`). Si la segunda fallaba (red caída), la
-- tarea quedaba hecha pero el contador del día marcaba la tarea como
-- pendiente → el histórico del plan mostraba un progreso imposible.
--
-- Ahora:
--   1. `marcar_tarea_y_plan()` hace las dos escrituras en la misma
--      transacción: o van las dos, o no va ninguna.
--   2. `reconciliar_plan_diario()` alinea el plan con el estado real de las
--      tareas cuando se lee (red de seguridad para escrituras viejas).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: marcar la tarea y reflejarlo en el plan del día, en UNA transacción.
--
-- `security definer` + comprobación explícita de `owner_id`: la función no
-- depende de que las políticas RLS sigan como están y no deja que un usuario
-- toque tareas de otro. `search_path` fijo y objetos cualificados: sin
-- inyección de esquema.
-- ----------------------------------------------------------------------------
create or replace function public.marcar_tarea_y_plan(
  p_tarea_id uuid,
  p_hecho boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid := auth.uid();
  v_existe boolean;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  -- La tarea tiene que ser del owner (o el UPDATE no tocaría nada).
  select true into v_existe
  from public.tareas
  where id = p_tarea_id and owner_id = v_owner;

  if not coalesce(v_existe, false) then
    raise exception 'Tarea % no encontrada o no es tuya', p_tarea_id;
  end if;

  -- (1) La tarea.
  update public.tareas
  set estado = case when p_hecho then 'hecha' else 'pendiente' end,
      completada_at = case when p_hecho then now() else null end
  where id = p_tarea_id and owner_id = v_owner;

  -- (2) Su reflejo en el plan del día (todas las filas que la apuntan).
  --     Las dos escrituras van en la MISMA transacción: si (2) falla,
  --     PostgreSQL deshace (1) y no queda la tarea hecha con el plan
  --     pendiente.
  update public.plan_diario_tareas
  set hecho = p_hecho
  where tarea_id = p_tarea_id and owner_id = v_owner;

  return true;
end;
$$;

grant execute on function public.marcar_tarea_y_plan(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. RPC: reconciliar el plan con el estado real de sus tareas.
--
-- Red de seguridad: si una escritura se quedó a medias (por ejemplo, una
-- versión antigua de la app que escribía a `tareas` y `plan_diario_tareas`
-- por separado), el contador del día queda descuadrado. Esta RPC lo arregla
-- al leer el plan.
--
-- Regla: una fila del plan está "hecha" si su tarea está hecha
-- (`estado = 'hecha'`) O se completó alguna vez (`completada_at` no es null;
-- archivar una tarea ya hecha no borra `completada_at`).
--
-- `p_plan_diario_id = null` → reconcilia todos los planes del owner.
-- Devuelve cuántas filas corrigió (0 si ya estaban bien).
-- ----------------------------------------------------------------------------
create or replace function public.reconciliar_plan_diario(
  p_plan_diario_id uuid default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_filas int;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  update public.plan_diario_tareas pdt
  set hecho = (t.estado = 'hecha' or t.completada_at is not null)
  from public.tareas t
  where t.id = pdt.tarea_id
    and pdt.owner_id = v_owner
    and (p_plan_diario_id is null or pdt.plan_diario_id = p_plan_diario_id)
    -- Solo las filas que están linked a una tarea real (las libres del plan
    -- no tienen tarea y su estado lo manda el usuario).
    and pdt.tarea_id is not null
    and pdt.hecho is distinct from (t.estado = 'hecha' or t.completada_at is not null);

  get diagnostics v_filas = row_count;
  return v_filas;
end;
$$;

grant execute on function public.reconciliar_plan_diario(uuid) to authenticated;
