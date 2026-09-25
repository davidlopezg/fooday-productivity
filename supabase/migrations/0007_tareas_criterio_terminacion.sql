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
