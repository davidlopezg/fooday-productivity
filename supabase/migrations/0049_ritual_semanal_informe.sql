-- ============================================================================
-- 0049_ritual_semanal_informe.sql
--
-- EL INFORME DE LA SEMANA (issue #111)
--
-- EL PROBLEMA QUE RESUELVE
-- -----------------------
-- `ritual_semanales` (migration 0043) guardaba lo que se decidió, pero solo
-- como LISTAS DE IDS: metas_vivas, wigs_meta, krs_foco, metas_pausadas y un
-- contador. Con eso no se puede:
--   · CONSULTAR una semana pasada (los ids no dicen qué decía el contexto).
--   · DESCARGAR un PDF de la semana (no hay texto, ni nombres, ni los días).
--
-- QUÉ ES ESTA COLUMNA
--   `informe` es el INFORME de esa semana, en JSON, tal y como se descarga
--   en PDF:
--     · proyectos      → los VIVOS de esa semana + su último contexto.
--     · metas          → las que se trabajaban (estado, fase, situación).
--     · wigs_meta      → las 3 WIGs de meta, en orden.
--     · krs            → los KRs (WIG de ciclo y/o foco de la semana).
--     · dias           → los 7 días con las 3 tareas comprometidas de cada uno.
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · UNA columna jsonb y nada más: no hay tablas nuevas ni joins. El
--     documento es de lectura (se consulta y se imprime), no se consulta por
--     campos sueltos.
--   · Es OPCIONAL: las semanas guardadas antes de esta migración siguen
--     valiendo (se reconstruyen desde los ids, ver src/lib/ritual/informe.ts).
--   · Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

alter table public.ritual_semanales
  add column if not exists informe jsonb;

comment on column public.ritual_semanales.informe is
  'Informe de la semana (JSON): proyectos vivos con su contexto, metas, las 3 WIGs, los KRs y los 7 dias con sus 3 tareas. Es lo que se consulta en el historial y lo que se descarga en PDF.';
