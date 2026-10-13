-- ============================================================================
-- 0026_tareas_pendiente_respuesta.sql
--
-- Añade a `tareas` un flag binario `pendiente_respuesta` para marcar
-- cualquier tarea de la que estés esperando una respuesta externa
-- (un email que mandaste, una llamada pendiente, un OK que necesitas…).
-- Es un estado SEMÁNTICO independiente de `estado`: la tarea sigue
-- pudiendo estar en pendiente / en_progreso / hecha. Solo significa
-- "ahora mismo estoy bloqueado por alguien".
--
-- Se ve en:
--   · Una columna-badgé en /tareas (toggle desde la fila, como WIG).
--   · Una página propia /tareas/pendientes-respuesta con todas las que
--     tienen el flag activo, ordenadas por `pendiente_respuesta_at`
--     (las más antiguas primero: lo que más tiempo lleva esperando).
--
-- Idempotente: `add column if not exists`, índices con `if not exists`.
-- ============================================================================

-- 1. Columnas
alter table public.tareas
  add column if not exists pendiente_respuesta boolean not null default false,
  add column if not exists pendiente_respuesta_at timestamptz;

create index if not exists idx_tareas_pendiente_respuesta
  on public.tareas(owner_id, pendiente_respuesta_at desc)
  where pendiente_respuesta = true;

-- 2. Comentarios
comment on column public.tareas.pendiente_respuesta is
  'True si la tarea está bloqueada externamente (esperando respuesta de alguien). Estado SEMÁNTICO independiente de `estado`.';
comment on column public.tareas.pendiente_respuesta_at is
  'Última vez que se activó/renovó `pendiente_respuesta`. Sirve para ordenar el panel por antigüedad.';

-- Refresca la caché de PostgREST para que `select(*)` traiga la columna
-- desde el primer SELECT tras aplicar la migration.
notify pgrst, 'reload schema';
