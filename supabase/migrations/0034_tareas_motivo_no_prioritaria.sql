-- fooday-productivity: motivo de "no prioritaria" / bloqueo del Modo Recuperación
-- ----------------------------------------------------------------------------
-- Aplica sobre el esquema existente.
-- Idempotente: todas las cláusulas usan IF NOT EXISTS donde aplica.
--
-- CONTEXTO
--   El Modo Recuperación (motor determinista de `src/lib/recuperacion/`)
--   propone qué hacer cada día. Cuando el usuario no está de acuerdo con la
--   propuesta necesita poder decir "esta hoy no" Y POR QUÉ, para que el
--   sistema no vuelva a proponer lo mismo mañana.
--
--   `tareas.estado` YA tiene el valor 'bloqueada' (ver 0001_init.sql), así
--   que NO se toca ese campo: no se duplica ni se sustituye ninguna fuente
--   de verdad. Lo que se añade es el MOTIVO y el sello de cuándo se puso,
--   que antes no existían en ninguna parte.
--
--   Nada se borra. Nada se cambia de nombre. Es puramente aditivo.

-- ----------------------------------------------------------------------------
-- 1. Motivo y metadatos de la postergación / bloqueo
-- ----------------------------------------------------------------------------
alter table public.tareas
  add column if not exists motivo_no_prioritaria text,
  add column if not exists pospuesta_hasta    date,
  add column if not exists postergada_en       timestamptz;

comment on column public.tareas.motivo_no_prioritaria is
  'Por qué el usuario decidió que esta tarea no es prioritaria hoy (texto libre, la IA lo usa como contexto, no como decisión).';
comment on column public.tareas.pospuesta_hasta is
  'Fecha hasta la que el usuario ha pedido aplazar la tarea. NULL = sin fecha.';
comment on column public.tareas.postergada_en is
  'Cuándo se registró la postergación (para medir cuánto se aplaza de verdad).';

-- ----------------------------------------------------------------------------
-- 2. Índice para la revisión semanal
--    La revisión semanal busca las tareas postergadas para preguntar "¿ya
--    toca?" sin tener que recorrer todas.
-- ----------------------------------------------------------------------------
create index if not exists idx_tareas_pospuesta on public.tareas(pospuesta_hasta)
  where pospuesta_hasta is not null;

create index if not exists idx_tareas_motivo_np on public.tareas(updated_at)
  where motivo_no_prioritaria is not null;

-- ----------------------------------------------------------------------------
-- 3. Feedback del sistema (qué regla proponía, y qué dijo el usuario)
-- ----------------------------------------------------------------------------
-- Tabla ADITIVA y separada: no se toca `tareas`. Es un registro de lo que
-- el sistema propuso y de lo que el usuario respondió, para poder aprender
-- del feedback sin acoplarse al modelo de tareas.
--
-- `regla_propuesta` es la clave de la regla del motor determinista
-- ('riesgo_financiero', 'compromiso_inamovible', ...). Al ser texto (no
-- enum), añadir reglas nuevas no requiere migración.
create table if not exists public.recuperacion_feedback (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha           date not null default current_date,
  tarea_id        uuid references public.tareas(id) on delete cascade,
  -- Qué proponía el motor (clave de regla del motor determinista).
  regla_propuesta text not null,
  -- Qué respondió el usuario.
  accion          text not null
                  check (accion in ('aceptada','pospuesta','bloqueada','no_prioritaria')),
  -- Texto libre opcional (el motivo).
  motivo          text,
  -- Contexto del día: qué nivel de carga había (alta/media/minima).
  nivel_carga     text check (nivel_carga in ('alta','media','minima')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_rec_feedback_fecha on public.recuperacion_feedback(fecha desc);
create index if not exists idx_rec_feedback_tarea on public.recuperacion_feedback(tarea_id);

do $$
begin
  alter table public.recuperacion_feedback enable row level security;
  drop policy if exists "own_select" on public.recuperacion_feedback;
  drop policy if exists "own_insert" on public.recuperacion_feedback;
  drop policy if exists "own_update" on public.recuperacion_feedback;
  drop policy if exists "own_delete" on public.recuperacion_feedback;
  create policy "own_select" on public.recuperacion_feedback for select using (owner_id = auth.uid());
  create policy "own_insert" on public.recuperacion_feedback for insert with check (owner_id = auth.uid());
  create policy "own_update" on public.recuperacion_feedback for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  create policy "own_delete" on public.recuperacion_feedback for delete using (owner_id = auth.uid());
end $$;

do $$
begin
  drop trigger if exists trg_recuperacion_feedback_updated on public.recuperacion_feedback;
  create trigger trg_recuperacion_feedback_updated
    before update on public.recuperacion_feedback
    for each row execute function public.set_updated_at();
exception when others then
  null; -- la función set_updated_at puede no existir: no es crítico
end $$;
