-- ============================================================================
-- APLICAR-0029.sql
--
-- Capa de "escenarios de proyecto": cronología (`proyecto_eventos`) +
-- historial de análisis de hipótesis (`proyecto_analisis`).
--
-- Por qué:
--   · Hoy la app solo guarda el "estado" de un proyecto (sus tareas) y
--     pierde todo lo que no es tarea: reuniones, emails, decisiones,
--     cambios de rumbo.
--   · El análisis de hipótesis (probabilidad + estrategia) es lo que ayuda
--     a decidir, pero no tenía dónde vivir ni historial.
--
-- Pegar en Supabase → SQL Editor → Run.
-- Idempotente: se puede correr varias veces sin romper nada
-- (`create table if not exists`, `drop policy if exists`,
-- `drop trigger if exists`).
--
-- Tras correrlo:
--   · Aparece la pantalla /escenarios con los proyectos activos.
--   · Cada proyecto tiene: cronología (manual o por voz, vía agente),
--     estado (calculado de las tareas) y el último análisis de la IA.
--   · La IA se lanza bajo demanda con el botón "✨ Analizar escenarios".
--
-- Nota: NO toca `proyectos`, `metas` ni `tareas`. Es una capa encima.
-- ============================================================================


-- ############################################################################
-- ## Contenido idéntico a 0029_escenarios_proyecto.sql.
-- ## Se duplica aquí para que pueda ejecutarse directamente en el SQL Editor
-- ## sin necesidad de `supabase db push` (mismo patrón que APLICAR-0028.sql).
-- ############################################################################


-- ============================================================================
-- 0029_escenarios_proyecto.sql
-- Capa de "escenarios de proyecto" (contexto / estado / situación / hipótesis).
--
-- Por qué:
--   · Un proyecto es vivo: suceden cosas. Hoy la app solo guarda el
--     "estado" (tareas del proyecto) y pierde todo lo que no es tarea
--     (reuniones, Emails, decisiones, cambios de rumbo).
--   · El análisis de hipótesis (probabilidad + estrategia) es lo que
--     realmente ayuda a decidir, pero no tiene dónde vivir.
--
-- Decisiones (ponytail — mínimo que funcione):
--   · 2 tablas, no 4. `proyecto_eventos` = la cronología (append-only) y
--     `proyecto_analisis` = el historial de análisis generados por la IA.
--   · El "estado" NO es una tabla: se calcula desde `tareas` en cada
--     render. Cero mantenimiento, cero datos que se pudren.
--   · La "situación" es un evento de tipo 'situacion' (manual) + el campo
--     `situacion` del último análisis (lectura de la IA). Sin tabla extra.
--   · `hipotesis` es jsonb: la forma (categoría, probabilidad, estrategia)
--     la define el módulo IA, no el schema. Cambiar el prompt no obliga a
--     migrar la BD.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CRONOLOGÍA DEL PROYECTO
--    · `tipo`: 'contexto' (lo que ya pasó) | 'estado' (hecho medible) |
--              'situacion' (lectura interpretativa).
--    · Append-only: los hechos no se reescriben. Si te equivocaste, añades
--      otro evento con la fecha correcta.
-- ----------------------------------------------------------------------------
create table if not exists public.proyecto_eventos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  tipo        text not null check (tipo in ('contexto', 'estado', 'situacion')),
  texto       text not null,
  ocurrido_en date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_proyecto_eventos_proyecto
  on public.proyecto_eventos(proyecto_id, ocurrido_en desc);

alter table public.proyecto_eventos enable row level security;

drop policy if exists "own_select" on public.proyecto_eventos;
drop policy if exists "own_insert" on public.proyecto_eventos;
drop policy if exists "own_update" on public.proyecto_eventos;
drop policy if exists "own_delete" on public.proyecto_eventos;

create policy "own_select" on public.proyecto_eventos
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.proyecto_eventos
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.proyecto_eventos
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.proyecto_eventos
  for delete using (owner_id = auth.uid());

drop trigger if exists trg_proyecto_eventos_updated on public.proyecto_eventos;
create trigger trg_proyecto_eventos_updated before update on public.proyecto_eventos
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. ANÁLISIS DE ESCENARIOS (historial)
--    · Un análisis por generación. Se guardan TODOS: el último es el que
--      se ve en el proyecto, los anteriores permiten ver cómo cambió la
--      lectura con los nuevos hechos.
--    · `hipotesis` jsonb: [{categoria, titulo, probabilidad, estrategia, ...}]
-- ----------------------------------------------------------------------------
create table if not exists public.proyecto_analisis (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  generado_en timestamptz not null default now(),
  situacion   text,
  hipotesis   jsonb not null default '[]'::jsonb,
  modelo      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_proyecto_analisis_proyecto
  on public.proyecto_analisis(proyecto_id, generado_en desc);

alter table public.proyecto_analisis enable row level security;

drop policy if exists "own_select" on public.proyecto_analisis;
drop policy if exists "own_insert" on public.proyecto_analisis;
drop policy if exists "own_update" on public.proyecto_analisis;
drop policy if exists "own_delete" on public.proyecto_analisis;

create policy "own_select" on public.proyecto_analisis
  for select using (owner_id = auth.uid());
create policy "own_insert" on public.proyecto_analisis
  for insert with check (owner_id = auth.uid());
create policy "own_update" on public.proyecto_analisis
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on public.proyecto_analisis
  for delete using (owner_id = auth.uid());

drop trigger if exists trg_proyecto_analisis_updated on public.proyecto_analisis;
create trigger trg_proyecto_analisis_updated before update on public.proyecto_analisis
  for each row execute function public.set_updated_at();
