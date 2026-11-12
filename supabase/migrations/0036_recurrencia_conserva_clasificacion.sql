-- 0036_recurrencia_conserva_clasificacion.sql
--
-- Auditoría de lógica (issue #7): al clonar una tarea recurrente se perdía
-- parte de su clasificación.
--
-- QUÉ SE PERDÍA (y es un bug, sin justificación posible):
--   · ambito  → la copia recurrente se quedaba "sin clasificar" y salía del
--               inbox (personal/profesional) al que pertenecía. El método
--               define DOS inboxes por ámbito: perderlo rompe esa regla.
--   · tags    → la copia perdía sus etiquetas, con lo que deja de aparecer
--               en los filtros por tag.
--   · fecha_fin → la copia no heredar la fecha dura de finalización, así que
--               no salía en "Vencen hoy" (/plan-diario) el día que le toca.
--
-- QUÉ NO SE COPIA (y es intencionado):
--   · resultado_periodo_id → un KR pertenece a un periodo (trimestre), así que
--     la ocurrencia siguiente debe reasignarse al KR del periodo que le toque.
--     Queda en la bandeja de la meta ("con meta sin resultado"), que es
--     exactamente lo que ese grupo del inbox representa.
--   · es_wig / wig_orden → un WIG no se hereda: el foco se elige cada día.
--   · pendiente_respuesta → una ocurrencia nueva no espera respuesta de nadie.

create or replace function public.clone_recurring_task(
  p_tarea_id uuid,
  p_nueva_fecha date
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_tarea public.tareas%rowtype;
  v_nueva_id uuid;
begin
  select * into v_tarea from public.tareas where id = p_tarea_id;
  if v_tarea.id is null then
    raise exception 'Tarea % no encontrada', p_tarea_id;
  end if;
  if v_tarea.recurrencia_tipo is null then
    raise exception 'La tarea % no es recurrente', p_tarea_id;
  end if;

  insert into public.tareas (
    owner_id, area_id, meta_id, proyecto_id, codigo, titulo, descripcion,
    prioridad, capa, deadline, pts, esfuerzo, importe, estado, origen, notas,
    criterio_terminacion,
    ambito, tags, fecha_fin,
    recurrencia_tipo, recurrencia_dias_semana, recurrencia_dia_mes,
    recurrencia_ultima_generada
  ) values (
    v_tarea.owner_id, v_tarea.area_id, v_tarea.meta_id, v_tarea.proyecto_id,
    v_tarea.codigo, v_tarea.titulo, v_tarea.descripcion,
    v_tarea.prioridad, v_tarea.capa, p_nueva_fecha, v_tarea.pts, v_tarea.esfuerzo,
    v_tarea.importe, 'pendiente', 'recurrencia', v_tarea.notas,
    v_tarea.criterio_terminacion,
    -- Clasificación heredada (issue #7)
    v_tarea.ambito, v_tarea.tags,
    -- La fecha dura se traslada a la nueva fecha SOLO si el usuario la fijó:
    -- si nunca la fijó, la copia tampoco la tiene.
    case when v_tarea.fecha_fin is not null then p_nueva_fecha else null end,
    v_tarea.recurrencia_tipo, v_tarea.recurrencia_dias_semana,
    v_tarea.recurrencia_dia_mes, p_nueva_fecha
  )
  returning id into v_nueva_id;

  -- Clona también las subtareas (todas en no-hechas)
  insert into public.tareas_subtareas (owner_id, tarea_id, descripcion, tiempo_estimado_min, orden, hecho)
  select owner_id, v_nueva_id, descripcion, tiempo_estimado_min, orden, false
  from public.tareas_subtareas
  where tarea_id = p_tarea_id;

  return v_nueva_id;
end;
$$;

grant execute on function public.clone_recurring_task(uuid, date) to authenticated;
