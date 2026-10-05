-- ============================================================================
-- 0013_estatus_diarios.sql
-- Diario de estatus diario (versión app del agente `agente-estatus-diario`).
--
-- Decisiones de diseño (ponytail — la solución más simple que funcione):
--   - 1 entrada por día por owner: UNIQUE (owner_id, fecha). El formulario
--     "nuevo" detecta si ya existe la de HOY y abre el editor en su lugar
--     (mismo principio que el agente: "no doble trabajo").
--   - 9 hábitos como columnas con CHECK ('hecho'|'parcial'|'no'), no JSONB:
--     permite queries SQL reales ("¿cuántos días seguidos ✓ en qi gong?")
--     y mantener el CHECK en una sola fuente de verdad.
--   - Comidas en tabla hija 1:N (mismo patrón que `tareas_subtareas`).
--   - Auditoría 20/80 y Cierre Cognitivo son columnas planas: el agente las
--     trata como 5 preguntas obligatorias, la app las pinta tal cual.
--   - `reflexion_agente` es nullable: cuando el agente LLM (desde el chat)
--     produzca su veredicto narrativo, se pega ahí. La app NO lo genera.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla principal: estatus_diarios
-- ----------------------------------------------------------------------------
create table if not exists public.estatus_diarios (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha       date not null,

  -- === Productividad ===
  tareas_profesionales    text,
  tareas_personales       text,
  trabajo_futuro_ideal    text,
  tareas_nuevas           text,
  correos_importantes     text,
  tareas_no_terminadas    text,

  -- === Estado emocional / mental ===
  estado_emocional            text,
  pensamientos_emociones      text,
  bloqueos_procrastinacion    text,
  ideas_nuevas                text,
  agradecimientos             text,
  lo_que_hiciste_bien         text,

  -- === Relaciones ===
  tiempo_pareja   text,
  tiempo_hija     text,
  tareas_hogar    text,

  -- === Bienestar ===
  uso_movil_min           int  check (uso_movil_min is null or uso_movil_min >= 0),
  acto_de_bondad          text,
  cuido_cuerpo            text,
  mente_subconsciente     text,

  -- === 9 hábitos personales (lista de David, 2026-08-26) ===
  -- Cada uno: 'hecho' | 'parcial' | 'no'. NULL = aún no respondido.
  habito_qigong           text check (habito_qigong in ('hecho','parcial','no')),
  habito_caminar          text check (habito_caminar in ('hecho','parcial','no')),
  habito_ducha            text check (habito_ducha in ('hecho','parcial','no')),
  habito_meditacion       text check (habito_meditacion in ('hecho','parcial','no')),
  habito_desayuno         text check (habito_desayuno in ('hecho','parcial','no')),
  habito_vaciado_mental   text check (habito_vaciado_mental in ('hecho','parcial','no')),
  habito_comida_siesta    text check (habito_comida_siesta in ('hecho','parcial','no')),
  habito_estatus          text check (habito_estatus in ('hecho','parcial','no')),
  habito_3_cosas_buenas  text check (habito_3_cosas_buenas in ('hecho','parcial','no')),

  -- === Auditoría 20/80 (5 preguntas obligatorias del agente) ===
  audit_tareas_criticas          int  check (audit_tareas_criticas between 0 and 3),
  audit_termino_3_principales    boolean,
  audit_anadio_sin_terminar      boolean,
  audit_eran_20_80               text check (audit_eran_20_80 in ('si','no','parcial')),
  audit_sintio                   text check (audit_sintio in ('cumpli','corri','nada')),

  -- === Cierre Cognitivo (5 preguntas obligatorias) ===
  cierre_que_consigo              text,
  cierre_queda_abierto            text,
  cierre_decisiones_tomadas       text,
  cierre_carga_mental             text,
  cierre_primer_problema_manana   text,

  -- === Salida emocional / micro-acción ===
  podes_soltar          text,
  micro_accion_manana   text,

  -- === Semáforo del día (verde/amarillo/rojo) ===
  semaforo   text check (semaforo in ('verde','amarillo','rojo')),

  -- === Veredicto narrativo del agente LLM (opcional, nullable) ===
  reflexion_agente   text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 1 entrada por día por owner
  unique (owner_id, fecha)
);

create index if not exists idx_estatus_diarios_owner_fecha
  on public.estatus_diarios(owner_id, fecha desc);

-- Trigger updated_at
drop trigger if exists trg_estatus_diarios_updated on public.estatus_diarios;
create trigger trg_estatus_diarios_updated before update on public.estatus_diarios
  for each row execute function public.set_updated_at();

-- RLS
alter table public.estatus_diarios enable row level security;

drop policy if exists "own_select" on public.estatus_diarios;
drop policy if exists "own_insert" on public.estatus_diarios;
drop policy if exists "own_update" on public.estatus_diarios;
drop policy if exists "own_delete" on public.estatus_diarios;

create policy "own_select" on public.estatus_diarios
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.estatus_diarios
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.estatus_diarios
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.estatus_diarios
  for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2. Tabla hija: estatus_comidas (1:N — mismo patrón que tareas_subtareas)
-- ----------------------------------------------------------------------------
create table if not exists public.estatus_comidas (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  estatus_id   uuid not null references public.estatus_diarios(id) on delete cascade,
  hora         time,
  descripcion  text not null,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_estatus_comidas_estatus
  on public.estatus_comidas(estatus_id, orden);

alter table public.estatus_comidas enable row level security;

drop policy if exists "own_select" on public.estatus_comidas;
drop policy if exists "own_insert" on public.estatus_comidas;
drop policy if exists "own_update" on public.estatus_comidas;
drop policy if exists "own_delete" on public.estatus_comidas;

create policy "own_select" on public.estatus_comidas
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.estatus_comidas
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.estatus_comidas
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.estatus_comidas
  for delete using (owner_id = auth.uid());
