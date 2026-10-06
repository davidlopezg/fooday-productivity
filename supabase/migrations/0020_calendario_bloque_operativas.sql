-- ============================================================================
-- 0020_calendario_bloque_operativas.sql
-- Soporte para múltiples tareas en Bloque 3 (operativas en lote).
--
-- Hasta ahora UNIQUE (owner, fecha, bloque) → 1 tarea por bloque. El usuario
-- quiere meter hasta 4 micro-tareas (email, WhatsApp, llamadas) en el Bloque
-- 3 de cada día, manteniendo los bloques 1, 2 y 4 con 1 tarea cada uno.
--
-- Cambios:
--   1. Añade columna `orden INT DEFAULT 0` (preserva el orden visual dentro
--      del Bloque 3; las inserciones nuevas lo reciben vía app).
--   2. Quita la UNIQUE constraint global.
--   3. Añade UNIQUE INDEX PARCIAL: solo se exige unicidad para bloques
--      1, 2 y 4. Bloque 3 admite múltiples filas.
--
-- La app limita Bloque 3 a 4 tareas a nivel de UI; el índice no lo
-- restringe (si se insertan más por SQL directo, no rompe nada).
-- ============================================================================

alter table public.calendario_bloques
  add column if not exists orden int not null default 0;

-- Quitar la constraint UNIQUE global de la migración 0017.
-- Postgres nombra las UNIQUE constraints de CREATE TABLE como
--   <table>_<cols>_key  →  calendario_bloques_owner_id_fecha_numero_bloque_key
alter table public.calendario_bloques
  drop constraint if exists calendario_bloques_owner_id_fecha_numero_bloque_key;

-- Índice único PARCIAL: solo aplica a bloques 1, 2 y 4 (1 tarea por bloque).
-- Bloque 3 admite hasta N filas (la UI limita a 4).
create unique index if not exists uniq_calendario_bloque_single
  on public.calendario_bloques (owner_id, fecha, numero_bloque)
  where numero_bloque in (1, 2, 4);

-- Índice de ayuda para ordenar tareas dentro del Bloque 3.
create index if not exists idx_calendario_bloques_bloque_orden
  on public.calendario_bloques (owner_id, fecha, numero_bloque, orden);

comment on column public.calendario_bloques.orden is
  'Orden dentro del (fecha, bloque). Para Bloque 3 agrupa varias tareas operativas en lote; para bloques 1, 2 y 4 siempre es 0.';