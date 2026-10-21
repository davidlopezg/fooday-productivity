-- ============================================================================
-- 0027_pomodoro_tarea_id_nullable.sql
-- Permitir sesiones pomodoro SIN tarea asignada (foco "libre").
--
-- Por qué:
--   El botón "Foco libre" en /focus siempre llama a `iniciar({ tarea_id:
--   "libre", ... })`. El store usa "libre" como sentinel local, pero la
--   tabla `pomodoro_sesiones.tarea_id` era NOT NULL y FK a `public.tareas`,
--   así que `grabarSesion` abortaba con `return` antes de insertar.
--   Resultado: ningún pomodoro libre llegaba a BD → KPIs de /informes y
--   contadores en /focus siempre a 0 para quienes usan foco libre.
--
-- Cambio:
--   * `pomodoro_sesiones.tarea_id` pasa a nullable.
--   * La FK se mantiene: sigue apuntando a `public.tareas(id)` y conserva
--     `ON DELETE CASCADE` (un usuario que borra una tarea pierde sus focos).
--   * Política RLS sin cambios (sigue filtrando por owner_id).
--
-- Esta migración es idempotente.
-- ============================================================================

alter table public.pomodoro_sesiones
  alter column tarea_id drop not null;

comment on column public.pomodoro_sesiones.tarea_id is
  'Tarea asociada al pomodoro. NULL cuando es un foco libre (sin tarea asignada).';
