-- ============================================================================
-- 0041_tareas_wig_solo_activas.sql
--
-- Issue #80: una tarea marcada como WIG que se completa SE QUEDA en el panel
-- "WIGs — Tareas foco (máx 3)" y, peor, sigue OCUPANDO una de las 3 plazas.
--
-- QUÉ PASABA (bug real):
--   · `marcarHecha()` (src/lib/mutations.ts) solo escribe `estado` y
--     `completada_at`: nunca toca `es_wig` / `wig_orden`.
--   · El panel de /tareas filtra `t.es_wig` sin mirar `t.estado` y la query
--     de la home hace `.eq("es_wig", true)` sin filtro de estado.
--   · La RPC `toggle_tarea_wig` (0019) cuenta `es_wig = true` sin mirar
--     `estado`, así que una tarea completada seguía contando para el cap:
--     con 3 WIGs marcadas y una completada el contador decía 3/3 y NO se
--     podía promover otra tarea a WIG ("Ya tienes 3 tareas marcadas como
--     WIG").
--
-- LA REGLA (en la BD, como el cap de 3):
--   El foco es para lo que está VIVO. Una tarea WIG que deja de estar viva
--   (hecha / archivada / descartada) deja de ser WIG: sale del panel y
--   libera su plaza para promover la siguiente.
--
-- POR QUÉ EN LA BD Y NO EN LA APP:
--   La tarea se puede cerrar por muchos caminos (marcarHecha, el modal de
--   editar, archivar, archivar un proyecto en cascada). Un trigger los
--   cubre todos; un `if` en la app se quedaría corto en el primero que
--   se olvide. Es el mismo criterio que el cap de 3: lo manda la base de
--   datos.
--
-- Idempotente: `create or replace function` + `drop trigger if exists`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger: una tarea que no está viva NO es WIG.
--
-- BEFORE UPDATE para que el cambio va dentro de la MISMA actualización (no
-- hace falta un segundo UPDATE ni que la app se entere).
--
-- Es una INVARIANTE, no un caso: si la tarea no está viva, no tiene plaza de
-- foco, la tenga o no la tuviera antes. Por eso no se mira `old`:
--   · completar o archivar una tarea WIG  → suelta la plaza ✓
--   · editar una tarea WIG y cerrarla      → suelta la plaza ✓
--   · marcar como WIG una tarea ya cerrada → no cuela plaza (la RPC decía
--     que sí, pero la fila nace sin foco y sin contar para el cap) ✓
-- ----------------------------------------------------------------------------
create or replace function public.tareas_wig_al_cerrar()
returns trigger
language plpgsql
security invoker
as $$
begin
  -- Estado VIVO = el mismo juego que el filtro "activas" de la tabla de
  -- tareas y que `fetchTareasActivas()`: pendiente / en_progreso / bloqueada.
  if new.estado not in ('pendiente', 'en_progreso', 'bloqueada') then
    new.es_wig := false;
    new.wig_orden := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tareas_wig_al_cerrar on public.tareas;
create trigger trg_tareas_wig_al_cerrar
before update on public.tareas
for each row execute function public.tareas_wig_al_cerrar();

comment on function public.tareas_wig_al_cerrar() is
  'Issue #80: al cerrar una tarea (hecha/archivada/descartada) se le suelta el WIG y la plaza de foco.';

-- ----------------------------------------------------------------------------
-- 2. Backfill: las tareas que YA estaban cerradas y quedaban como WIG.
--
-- El trigger solo actúa en los UPDATE que vengan de ahora en adelante; las
-- filas ya cerradas con `es_wig = true` seguirían occupying plaza. Se
-- limpian aquí (y de paso liberan sus huecos 1-3 para el siguiente WIG).
-- ----------------------------------------------------------------------------
update public.tareas
set es_wig = false,
    wig_orden = null
where es_wig = true
  and estado not in ('pendiente', 'en_progreso', 'bloqueada');
