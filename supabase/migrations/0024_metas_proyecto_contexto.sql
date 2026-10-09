-- ============================================================================
-- 0024_metas_proyecto_contexto.sql
-- Cierra 4 huecos del modelo meta/proyecto:
--   1. metas.proyecto_id       → las metas pueden vivir dentro de un proyecto
--   2. metas.fecha_objetivo    → fecha concreta que el agente sugiere
--                                y la UI muestra (distinta de plazo text)
--   3. metas.contexto          → texto libre con la situación que rodea
--                                la meta (input para el agente)
--   4. metas.situacion_actual  → estado del mundo hoy: dónde estoy
--                                (input para el agente)
--   5. proyectos.area_id       → los proyectos cuelgan de un área
--
-- Decisiones (ponytail — mínimo que funcione):
--   · proyecto_id y area_id son NULL-safe. Las metas/proyectos viejos siguen
--     funcionando; el flag "sin clasificar" lo muestra la UI de auditoría.
--   · fecha_objetivo es `date` real (no text). La IA la propone; el humano
--     la confirma. No se calcula automáticamente: simplifica y el heurístico
--     "MAX(deadline de KRs)" no compensa la complejidad.
--   · contexto y situacion_actual son `text` simples. La IA los recibe en el
--     prompt del agente. Sin estructura rígida para no forzar al usuario.
-- ============================================================================

-- 1. metas.proyecto_id
alter table public.metas
  add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;
create index if not exists idx_metas_proyecto on public.metas(proyecto_id);

-- 2. metas.fecha_objetivo
alter table public.metas
  add column if not exists fecha_objetivo date;

create index if not exists idx_metas_fecha_objetivo
  on public.metas(fecha_objetivo)
  where fecha_objetivo is not null;

-- 3+4. metas.contexto y metas.situacion_actual
alter table public.metas
  add column if not exists contexto text;
alter table public.metas
  add column if not exists situacion_actual text;

-- 5. proyectos.area_id
alter table public.proyectos
  add column if not exists area_id uuid references public.areas(id) on delete set null;
create index if not exists idx_proyectos_area on public.proyectos(area_id);
