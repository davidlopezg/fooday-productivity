-- ----------------------------------------------------------------------------
-- Fecha de finalización de la tarea (date real, no texto).
-- Separado de `deadline` (text), que sigue siendo una nota libre tipo
-- "esta semana", "cuando pueda", etc. Sin migración de legacy: las filas
-- existentes tendrán fecha_fin = NULL y se siguen mostrando por `deadline`.
-- ----------------------------------------------------------------------------
alter table public.tareas
  add column if not exists fecha_fin date;

create index if not exists idx_tareas_fecha_fin
  on public.tareas(fecha_fin)
  where fecha_fin is not null;