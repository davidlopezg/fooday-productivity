-- ============================================================================
-- 0050_sin_muros_de_tareas.sql
--
-- LA BASE DE DATOS NO IMPONE TOPES DE TAREAS (issue #114).
--
-- EL PROBLEMA
-- -----------
-- Dos triggers bloqueaban la escritura de tareas con un error de la base de
-- datos:
--
--   · trg_tareas_cupo_activas (migration 0043): máximo 10 tareas activas
--     (pendiente | en_progreso | bloqueada) por persona. Con el inventario
--     acumulado (253 activas) cualquier activación o guardado del paso 5 del
--     ritual semanal fallaba con
--     "Cupo de tareas activas alcanzado (max 10s)".
--
--   · trg_ritual_tareas_dia_cap (migration 0045): máximo 3 tareas
--     comprometidas por día, al guardar "las 3 del día".
--
-- La migration 0046_cupo_tareas_orientativo.sql ya decidió que el cupo de 10
-- es ORIENTATIVO (lo muestra la pantalla), pero NUNCA SE APLICÓ a la base de
-- datos: el trigger siguió vivo. Esta migración aplica de verdad esa
-- decisión y hace lo mismo con el tope de 3 por día.
--
-- LA DECISIÓN
-- -----------
-- La base de datos no decide ni avisa de nada sobre cuántas tareas tiene la
-- persona: guarda. Los topes son orientación de la app:
--   · el inventario del ritual semanal muestra el contador X/10,
--   · "las 3 del día" se eligen en una rejilla de 3 huecos por día.
--
-- Lo que NO cambia:
--   · los estados 'en_espera' y 'cancelada' siguen siendo la forma de apartar
--     trabajo (migration 0043),
--   · la app sigue limitando a 3 lo que guarda de "las 3 del día"
--     (src/lib/mutations.ts → guardarTresDelDia corta la lista a 3) y
--   · ritual_tareas_dia conserva unique (owner, anio, semana, dia, orden) y
--     el check orden between 1 and 3: la estructura sigue impidiendo una 4ª
--     fila, pero sin lanzar un error a la persona.
--
-- Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. El cupo de 10 tareas activas (migration 0043, yaorientativo en 0046).
-- ----------------------------------------------------------------------------
drop trigger if exists trg_tareas_cupo_activas on public.tareas;
drop function if exists public.trg_tareas_cupo_activas();

comment on column public.tareas.estado is
  'Estado de la tarea. `en_espera` = la aparto del foco de esta semana (vuelve); `cancelada` = no la haré. Ninguna de las dos cuenta como activa. El cupo de ~10 activas por semana es ORIENTATIVO (lo muestra el ritual semanal), no un límite que imponga la BD: ningún trigger de la base de datos bloquea activar tareas.';

-- ----------------------------------------------------------------------------
-- 2. El tope de 3 tareas comprometidas por día (migration 0045).
-- ----------------------------------------------------------------------------
drop trigger if exists trg_ritual_tareas_dia_cap on public.ritual_tareas_dia;
drop function if exists public.trg_ritual_tareas_dia_cap();

comment on table public.ritual_tareas_dia is
  'Las 3 del dia: el compromiso de tareas por dia de una semana ISO. Capa de RITUAL: no es `tareas.es_wig` (ciclo, max 3 global) ni el plan diario (propuesta). El tope de 3 por dia lo muestra la app (rejilla de 3 huecos), no un trigger de la base de datos.';
