-- ============================================================================
-- 0016_pomodoro_pre_flight.sql
-- Pre-flight check en sesiones pomodoro.
--
-- El principio de Deep Work [10-12] dice: la fuerza de voluntad es un
-- recurso finito, hay que crear rutinas claras sobre CÓMO trabajarás
-- profundamente. Un pomodoro que empieza con el móvil sonando y el email
-- abierto es tiempo perdido: el cerebro entra y sale de foco cada vez.
--
-- Esto registra las 3 respuestas del checklist pre-pomodoro:
--   1. silencie_notificaciones  — "¿He silenciado el móvil?"
--   2. cerre_email             — "¿He cerrado email/Slack/WhatsApp?"
--   3. criterio_exito          — texto libre: "¿Cómo sabré que he avanzado?"
--
-- Diseño:
--   * 3 columnas NULLABLES — el checklist no es bloqueante, pero se mide.
--   * No hay CHECK constraint en criterio_exito: es opcional y libre.
--   * Sin RLS nueva: ya está activa en pomodoro_sesiones.
-- ============================================================================

alter table public.pomodoro_sesiones
  add column if not exists pre_silencio_notif boolean,
  add column if not exists pre_cerre_email    boolean,
  add column if not exists pre_criterio_exito text;

comment on column public.pomodoro_sesiones.pre_silencio_notif is
  'Checklist pre-pomodoro: el usuario confirmó haber silenciado notificaciones.';
comment on column public.pomodoro_sesiones.pre_cerre_email is
  'Checklist pre-pomodoro: el usuario confirmó haber cerrado email/mensajería.';
comment on column public.pomodoro_sesiones.pre_criterio_exito is
  'Checklist pre-pomodoro: criterio de éxito declarado por el usuario (texto libre).';