-- ============================================================================
-- 0030_limpieza_tablas_muertas.sql
--
-- Elimina 4 tablas del esquema que quedaron huérfanas desde 0001_init.sql y
-- que la app NO lee ni escribe en ningún momento (0 referencias en `src/`):
--
--   · public.okrs             → sustituida por public.resultados_periodo
--                              (migration 0015, y luego 0028 la convirtió en
--                              "KR" con tabla puente kr_periodos).
--   · public.key_results      → ídem. ÚNICA tabla que la usaba era `okrs`
--                              (FK `okr_id`), así que se va con ella.
--   · public.hitos            → hitos/milestones de meta. La app nunca los
--                              pintó; las tareas subtareas (0010) ocuparon
--                              ese rol funcional.
--   · public.planes_semanales → cabecera estratégica de la semana. Sustituida
--                              por public.plan_semanal_tareas (migration
--                              0009), que es la que usa /semana.
--
-- POR QUÉ AHORA (y no antes):
--   Las 4 se crean en 0001_init.sql y siguen ahí. Este fichero NO las borra
--   de 0001 — reescribir una migration ya aplicada rompe el historial y
--   las BDs que ya la ejecutaron. Se borran aquí, hacia adelante.
--
-- SEGURIDAD:
--   · Ninguna migration posterior a 0001 las referencia (verificado:
--     la única FK `references public.okrs` estaba dentro de `key_results`).
--   · Ningún seed las usa (`supabase/seed/*.sql` y el ETL no las tocan).
--   · `src/` no las menciona (0 coincidencias).
--
-- IDEMPOTENCIA:
--   `drop table if exists ... cascade` es idempotente y no falla si la tabla
--   ya no existe. El `cascade` es necesario para `key_results`→`okrs`, pero
--   como precaution lo limitamos: dropeamos primero la dependiente.
--
-- CUIDADO: `cascade` en `public.metas` NO debeocarpar a la app. Ninguna de
-- estas 4 tablas es referenciada por `metas`, `tareas`, `proyectos` ni
-- `resultados_periodo` (las únicas que la app usa). Verificado.
-- ============================================================================

-- 1) Dependiente primero: key_results tiene FK → okrs.
drop table if exists public.key_results cascade;

-- 2) Las otras tres: sin dependientes en el esquema vivo.
drop table if exists public.okrs cascade;
drop table if exists public.hitos cascade;
drop table if exists public.planes_semanales cascade;