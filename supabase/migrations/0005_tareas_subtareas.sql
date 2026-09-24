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