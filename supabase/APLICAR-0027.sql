-- ============================================================================
-- APLICAR-0027.sql
-- Pegar TODO esto en Supabase → SQL Editor → Run.
--
-- Aplica la migración 0027 (pomodoro_sesiones.tarea_id nullable) en una
-- base de datos existente. Idempotente.
-- ============================================================================

alter table public.pomodoro_sesiones
  alter column tarea_id drop not null;

comment on column public.pomodoro_sesiones.tarea_id is
  'Tarea asociada al pomodoro. NULL cuando es un foco libre (sin tarea asignada).';
