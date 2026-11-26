-- ============================================================================
-- 0046_cupo_tareas_orientativo.sql
--
-- EL CUPO DE 10 TAREAS ACTIVAS PASA A SER ORIENTATIVO (issue #96).
--
-- EL PROBLEMA
-- -----------
-- La migration 0043 metió un trigger que impedía tener más de 10 tareas en
-- estado activo (pendiente | en_progreso | bloqueada). El trigger contaba
-- TODAS las tareas activas del usuario, de toda la vida: no era "las tareas
-- de esta semana", era "las tareas que tienes abiertas en el sistema".
--
-- Consecuencias en el uso real:
--   · El inventario acumulado (cientos de tareas abiertas de años) ya incumple
--     el cupo, pero el trigger solo dispara en INSERT/UPDATE: las filas viejas
--     se quedan y cualquier activación nueva falla con
--     "Cupo de tareas activas alcanzado".
--   · El ritual semanal (paso 5) no tenía ninguna noción de "las 10 tareas de
--     esta semana": el tope no significaba nada útil y solo bloqueaba.
--
-- LA DECISIÓN
-- -----------
-- El objetivo de ~10 tareas activas por semana sigue viva, pero como ORIENTACIÓN,
-- no como muro: lo muestra la pantalla (src/lib/ritual/semana.ts) y no impide
-- trabajar. El cupo lo decide la persona en el ritual, no la base de datos.
--
-- Lo que NO cambia: los estados 'en_espera' y 'cancelada' siguen existiendo y
-- siguen siendo la forma de apartar trabajo (migration 0043). Lo que se quita
-- es el trigger que impedía activar tareas.
--
-- Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

drop trigger if exists trg_tareas_cupo_activas on public.tareas;

drop function if exists public.trg_tareas_cupo_activas();

comment on column public.tareas.estado is
  'Estado de la tarea. `en_espera` = la aparto del foco de esta semana (vuelve); `cancelada` = no la haré. Ninguna de las dos cuenta como activa. El cupo de ~10 activas por semana es ORIENTATIVO (lo muestra el ritual semanal), no un límite que imponga la BD.';
