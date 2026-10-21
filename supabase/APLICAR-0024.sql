-- ============================================================================
-- APLICAR-0024.sql
--
-- M8101 · SALUD · "todo lo necesario para conseguirla"
--
-- Cierra los 3 huecos detectados en el seed original:
--   1) Hay 7 tareas huérfanas (meta_id sí, resultado_periodo_id no) → las
--      vinculamos al KR correcto de su trimestre.
--   2) 3 KRs no tienen ninguna tarea concreta asignada → añadimos las
--      mínimas para que el scorecard mida algo.
--   3) Falta un KR en Q3 ("Alimentación consciente") que sostiene el Q4
--      "IMC saludable" — los 3 huérfanas de comidas rápidas / frutas /
--      diario pertenecen a ese KR, así que lo creamos.
--
-- Diseño:
--   - Todo es idempotente (re-ejecutable sin romper nada).
--   - Los UPDATE de huérfanos solo actúan si `resultado_periodo_id IS NULL`
--     (no pisamos re-asignaciones manuales del usuario).
--   - Los INSERT usan el patrón `on conflict (owner_id, codigo) do update`
--     del seed (codigo = clave idempotente).
--
-- Pegar en Supabase → SQL Editor → Run.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Crear el KR faltante "Alimentación consciente" en Q3 (si no existe).
--    Migration 0028: el INSERT a `resultados_periodo` ya no incluye
--    `periodo_id`; la asignación al trimestre se hace en `kr_periodos`.
--    Idempotencia: el SELECT comprueba si ya existe un KR con ese título
--    en la meta (si existe, no se duplica).
-- ----------------------------------------------------------------------------
do $$
declare
  v_meta_id uuid;
  v_periodo_id uuid;
  v_existente uuid;
begin
  select id into v_meta_id from public.metas
    where owner_id = public.current_owner_id() and codigo = 'M8101' limit 1;
  select id into v_periodo_id from public.periodos
    where owner_id = public.current_owner_id()
      and tipo = 'trimestre' and anio = 2026 and numero = 3 limit 1;

  if v_meta_id is null or v_periodo_id is null then
    raise notice 'M8101 o Q3 2026 no existen — saltando creación del KR';
    return;
  end if;

  -- ¿Ya existe un KR con ese título en esta meta? Si sí, no duplicamos.
  select id into v_existente from public.resultados_periodo
    where meta_id = v_meta_id
      and titulo = 'Alimentación consciente (calidad y registro)'
    limit 1;

  if v_existente is null then
    with ins as (
      insert into public.resultados_periodo (owner_id, meta_id, titulo, descripcion, metrica, valor_objetivo, valor_actual, unidad, peso, orden)
      values (
        public.current_owner_id(),
        v_meta_id,
        'Alimentación consciente (calidad y registro)',
        'Reducir comida rápida, asegurar 5 porciones de fruta/verdura al día, llevar diario. Es la palanca principal para llegar al objetivo de IMC en Q4.',
        'días con alimentación consciente',
        5,
        0,
        'días/sem',
        1,
        4
      )
      returning id
    )
    insert into public.kr_periodos (owner_id, kr_id, periodo_id, peso, orden)
    select public.current_owner_id(), ins.id, v_periodo_id, 1, 0
    from ins
    on conflict (kr_id, periodo_id) do nothing;
  else
    -- Si ya existe el KR pero no estaba asignado a Q3, lo añadimos.
    insert into public.kr_periodos (owner_id, kr_id, periodo_id, peso, orden)
    values (public.current_owner_id(), v_existente, v_periodo_id, 1, 0)
    on conflict (kr_id, periodo_id) do nothing;
  end if;
end $$;


-- ----------------------------------------------------------------------------
-- 2. Vincular las 7 tareas huérfanas al KR correcto de su trimestre.
--    Solo actúa si resultado_periodo_id IS NULL (no pisamos re-asignaciones).
-- ----------------------------------------------------------------------------

-- N8101-07 · Reducir comidas rápidas a 1/semana → Q3 "Alimentación consciente"
-- Migration 0028: el JOIN es vía kr_periodos, no vía resultados_periodo.periodo_id.
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
    and kr.titulo like 'Alimentación consciente%'
  limit 1
)
where t.codigo = 'N8101-07'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-08 · 5 porciones frutas/verduras → Q3 "Alimentación consciente"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
    and kr.titulo like 'Alimentación consciente%'
  limit 1
)
where t.codigo = 'N8101-08'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-09 · Llevar diario de alimentación → Q3 "Alimentación consciente"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
    and kr.titulo like 'Alimentación consciente%'
  limit 1
)
where t.codigo = 'N8101-09'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-10 · Meditación/respiración 3x/sem → Q3 "3 sesiones de relajación/semana"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
    and kr.titulo like '3 sesiones de relajaci%'
  limit 1
)
where t.codigo = 'N8101-10'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-11 · Pesarse semanalmente → Q4 "IMC saludable"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
    and kr.titulo like 'IMC saludable%'
  limit 1
)
where t.codigo = 'N8101-11'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-13 · Pausas 10-15 min cada 2-3h → Q4 "Nivel de energía"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
    and kr.titulo like 'Nivel de energ%'
  limit 1
)
where t.codigo = 'N8101-13'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;

-- N8101-14 · Revisar y ajustar plan cada mes → Q4 "Satisfacción bienestar"
update public.tareas t
set resultado_periodo_id = (
  select kr.id from public.resultados_periodo kr
    join public.metas m on m.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
  where m.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
    and kr.titulo like 'Satisfacci%'
  limit 1
)
where t.codigo = 'N8101-14'
  and t.owner_id = public.current_owner_id()
  and t.resultado_periodo_id IS NULL;


-- ----------------------------------------------------------------------------
-- 3. Añadir tareas que faltan para que cada KR tenga palancas concretas.
--    Codigos nuevos con prefijo 'N8101-Q' para no colisionar con el seed.
-- ----------------------------------------------------------------------------

-- Q2 · "Despertares <2" (solo tiene N8101-06 "Establecer rutina pre-cama")
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q2-DESP-MON',
  'Registrar nº despertares cada mañana (campo libre /estatus)',
  'media', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 2
     and kr.titulo like 'Despertares%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q2 · "Estado ánimo" (solo tiene N8101-04 "1 palabra al despertar")
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q2-ANIMO-REV',
  'Revisión semanal de la palabra de ánimo (domingo noche, /estatus)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 2
     and kr.titulo like 'Estado %nimo%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q3 · "Sueño reparador 80%" (0 tareas)
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q3-SUENO-CAL',
  'Anotar calidad de sueño subjetiva (1-5) en /estatus cada mañana',
  'media', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
     and kr.titulo like '%oches%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q3 · "Estrés -20%" (0 tareas) — dos palancas: identificar triggers + revisar
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q3-ESTRES-TRI',
  'Listar 3 disparadores principales de estrés (1 vez al inicio del trimestre)',
  'media', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
     and kr.titulo like 'Reducir estr%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q3-ESTRES-REV',
  'Revisión mensual del nivel de estrés percibido (escala 0-100, en /estatus)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 3
     and kr.titulo like 'Reducir estr%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q4 · "IMC saludable" (tras vincular N8101-11) — añadir % grasa y revisión
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q4-IMC-GRASA',
  'Medir % grasa corporal mensualmente (báscula o cinta métrica)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
     and kr.titulo like 'IMC saludable%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q4-IMC-EVOL',
  'Revisar tendencia de peso / IMC (línea temporal, /informes)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
     and kr.titulo like 'IMC saludable%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q4 · "Nivel de energía" (tras vincular N8101-13) — auto-eval semanal
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q4-ENER-AUTO',
  'Auto-evaluación semanal de energía (escala 1-10, /estatus)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
     and kr.titulo like 'Nivel de energ%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;

-- Q4 · "Satisfacción bienestar" (tras vincular N8101-14) — encuesta trimestral
insert into public.tareas (owner_id, codigo, titulo, prioridad, estado, meta_id, resultado_periodo_id)
select
  public.current_owner_id(),
  'N8101-Q4-SATIS-ENC',
  'Encuesta trimestral de bienestar (escala 1-10 + 3 notas, en /estatus)',
  'baja', 'pendiente',
  m.id,
  (select kr.id from public.resultados_periodo kr
    join public.metas m2 on m2.id = kr.meta_id
    join public.kr_periodos kp on kp.kr_id = kr.id
    join public.periodos p on p.id = kp.periodo_id
   where m2.codigo = 'M8101' and p.anio = 2026 and p.numero = 4
     and kr.titulo like 'Satisfacci%' limit 1)
from public.metas m
where m.codigo = 'M8101' and m.owner_id = public.current_owner_id()
on conflict (owner_id, codigo) do nothing;


-- ----------------------------------------------------------------------------
-- 4. VERIFICACIÓN — ejecutar tras el script. Debe dar 0 huérfanas y mostrar
--    el conteo de tareas por KR.
-- ----------------------------------------------------------------------------
-- select
--   m.codigo as meta,
--   p.nombre as trimestre,
--   kr.titulo as kr,
--   count(t.id) as total_tareas,
--   count(t.id) filter (where t.estado = 'hecha') as hechas
-- from public.metas m
-- join public.resultados_periodo kr on kr.meta_id = m.id
-- join public.kr_periodos kp on kp.kr_id = kr.id
-- join public.periodos p on p.id = kp.periodo_id
-- left join public.tareas t on t.resultado_periodo_id = kr.id
-- where m.codigo = 'M8101'
-- group by m.codigo, p.nombre, kr.titulo, p.numero, kr.orden
-- order by p.numero, kr.orden;
--
-- select count(*) as tareas_sin_kr
-- from public.tareas
-- where meta_id = (select id from public.metas where codigo = 'M8101')
--   and resultado_periodo_id is null;