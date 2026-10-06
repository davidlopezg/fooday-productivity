-- ============================================================================
-- APLICAR-0021.sql
--
-- Pega TODO esto en Supabase → SQL Editor → Run.
--
-- Crea el módulo de PAGOS en un schema separado `pagos` (portabilidad
-- futura: si quieres moverlo a otro proyecto, `pg_dump --schema=pagos`
-- y listo). Cero impacto sobre el schema `public`.
--
-- Crea:
--   · Schema `pagos`
--   · Tablas: pagos.recurrentes, pagos.pagos, pagos.movimientos, pagos.adjuntos
--   · Vista: pagos.v_pagos (con score de urgencia recalculado al vuelo)
--   · Funciones RPC: refresh_vencidos, registrar_pago,
--     reprogramar_siguiente_lunes, generar_recurrentes, calcular_urgencia,
--     siguiente_lunes
--   · RLS sobre las 4 tablas
--   · Bucket privado `pagos-adjuntos` en Storage + sus policies
--
-- Idempotente: se puede correr varias veces sin romper nada.
-- ============================================================================


-- ############################################################################
-- ## 0021_pagos.sql
-- ############################################################################

-- ============================================================================
-- 0021_pagos.sql
-- Módulo de PAGOS — schema separado `pagos` para portabilidad futura
-- (un solo `pg_dump --schema=pagos` si algún día se quiere mover a otro
-- proyecto Supabase). Cero impacto sobre el schema `public`.
--
-- Decisiones de diseño (ponytail — la solución más simple que funcione):
--
--   · UN solo schema `pagos` con 4 tablas: `pagos` (la principal, incluye
--     histórico filtrable por estado), `recurrentes` (reglas tipo "alquiler
--     día 1 de cada mes"), `movimientos` (log de pagos parciales) y
--     `adjuntos` (metadatos de PDFs subidos; bytes van a Storage).
--
--   · Estados: pendiente | programado | pagado_parcial | pagado | vencido
--     | anulado. El paso a `vencido` se hace por una función idempotente
--     `pagos.refresh_vencidos()` que la app llama al cargar `/pagos`.
--     No hace falta cron: con que abras la app un día al mes, se actualiza.
--
--   · Fraccionamiento: `importe_total` (no cambia) y `importe_pagado`
--     (suma de movimientos). Estado se deriva:
--       importe_pagado = 0            → pendiente (o programado)
--       0 < importe_pagado < total   → pagado_parcial
--       importe_pagado = total        → pagado
--     Un CHECK garantiza `importe_pagado <= importe_total`.
--
--   · Recurrencia EN MVP (tabla `recurrentes`). El campo `recurrencia_id`
--     en `pagos` agrupa visualmente los pagos del mismo concepto. La
--     función `pagos.generar_recurrentes(mes, anio)` crea los pagos del
--     mes desde las reglas activas. Idempotente: si ya existe el pago
--     de "Alquiler Octubre" para una regla, no lo duplica.
--
--   · `urgencia_score` se calcula en SQL en la vista `pagos.v_pagos`.
--     Se persiste en la tabla al crear/actualizar para poder ordenar
--     eficientemente. La app puede sobrescribir `prioridad` pero la
--     vista recalcula siempre y muestra warning si score > prioridad.
--
--   · `metodo_pago = 'domiciliacion'` se trata como informativo: NO
--     aparece en "A pagar este lunes" salvo filtro explícito.
--
--   · Adjuntos: bucket Storage PRIVADO `pagos-adjuntos` con RLS por
--     owner (mismo patrón que `tareas-adjuntos`).
--
--   · Sin datos bancarios. Sin IBAN. Sin integración con bancos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. SCHEMA
-- ----------------------------------------------------------------------------
create schema if not exists pagos;

-- ----------------------------------------------------------------------------
-- 1. RECURRENTES — reglas de generación automática
-- ----------------------------------------------------------------------------
create table if not exists pagos.recurrentes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proveedor     text not null,
  concepto      text not null,
  categoria     text not null
                check (categoria in ('alquiler','suministro','nomina','proveedor','impuesto','prestamo','seguro','otro')),
  importe       numeric not null check (importe > 0),
  -- día del mes en que se emite la factura (cap 28 para no liar febrero)
  dia_del_mes   int  not null check (dia_del_mes between 1 and 28),
  -- día del mes en que vence (cap 28). Si null, vence el mismo día del mes
  -- siguiente a dia_del_mes (es decir, 30 días después de la emisión).
  dia_vencimiento int check (dia_vencimiento between 1 and 28),
  metodo_pago   text not null default 'transferencia'
                check (metodo_pago in ('transferencia','domiciliacion','tarjeta','bizum','efectivo')),
  fecha_inicio  date not null,
  fecha_fin     date,                                       -- null = indefinido
  activo        boolean not null default true,
  notas         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_pagos_recurrentes_owner
  on pagos.recurrentes(owner_id) where activo = true;

-- updated_at
drop trigger if exists trg_pagos_recurrentes_updated on pagos.recurrentes;
create trigger trg_pagos_recurrentes_updated before update on pagos.recurrentes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. PAGOS — tabla principal (incluye histórico filtrable por estado)
-- ----------------------------------------------------------------------------
create table if not exists pagos.pagos (
  id                       uuid primary key default gen_random_uuid(),
  owner_id                 uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- agrupa pagos del mismo concepto recurrente (mismo UUID en todos los meses)
  recurrencia_id           uuid,
  -- referencia opcional a la regla que lo generó (null si fue alta manual)
  recurrente_id            uuid references pagos.recurrentes(id) on delete set null,

  proveedor                text not null,
  concepto                 text not null,
  categoria                text not null
                           check (categoria in ('alquiler','suministro','nomina','proveedor','impuesto','prestamo','seguro','otro')),
  importe_total            numeric not null check (importe_total > 0),
  importe_pagado           numeric not null default 0 check (importe_pagado >= 0),

  fecha_emision_factura    date,
  fecha_vencimiento        date not null,
  fecha_pago_programada    date,                          -- el lunes elegido
  fecha_pago_real          date,                          -- cuando realmente pagaste

  estado                   text not null default 'pendiente'
                           check (estado in ('pendiente','programado','pagado_parcial','pagado','vencido','anulado')),
  prioridad                text not null default 'media'
                           check (prioridad in ('critica','alta','media','baja')),

  -- calculado en front y persistido al guardar (se recalcula en la vista al listar)
  urgencia_score           numeric,

  metodo_pago              text not null default 'transferencia'
                           check (metodo_pago in ('transferencia','domiciliacion','tarjeta','bizum','efectivo')),

  alerta_vencimiento_dias  int not null default 3 check (alerta_vencimiento_dias >= 0),

  notas                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- coherencia: no se puede haber pagado más que el total
  check (importe_pagado <= importe_total),
  -- si está pagado, fecha_pago_real es obligatoria
  check (
    estado not in ('pagado','pagado_parcial')
    or fecha_pago_real is not null
  )
);

create index if not exists idx_pagos_owner_estado
  on pagos.pagos(owner_id, estado);
create index if not exists idx_pagos_owner_vencimiento
  on pagos.pagos(owner_id, fecha_vencimiento);
create index if not exists idx_pagos_owner_programada
  on pagos.pagos(owner_id, fecha_pago_programada)
  where fecha_pago_programada is not null;
create index if not exists idx_pagos_recurrencia
  on pagos.pagos(recurrencia_id) where recurrencia_id is not null;
create index if not exists idx_pagos_owner_score
  on pagos.pagos(owner_id, urgencia_score desc nulls last);

-- updated_at
drop trigger if exists trg_pagos_pagos_updated on pagos.pagos;
create trigger trg_pagos_pagos_updated before update on pagos.pagos
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. MOVIMIENTOS — log de pagos (uno por pago íntegro; varios para parciales)
-- ----------------------------------------------------------------------------
create table if not exists pagos.movimientos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pago_id       uuid not null references pagos.pagos(id) on delete cascade,
  fecha         date not null default current_date,
  importe       numeric not null check (importe > 0),
  metodo_pago   text not null
                check (metodo_pago in ('transferencia','domiciliacion','tarjeta','bizum','efectivo')),
  notas         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_pagos_movimientos_pago
  on pagos.movimientos(pago_id, fecha desc);

-- updated_at: no hay updated_at en movimientos (es append-only)

-- ----------------------------------------------------------------------------
-- 4. ADJUNTOS — metadatos de PDFs subidos. Bytes en Storage.
-- ----------------------------------------------------------------------------
create table if not exists pagos.adjuntos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pago_id       uuid not null references pagos.pagos(id) on delete cascade,
  filename      text not null,
  mime          text,
  size_bytes    bigint,
  storage_path  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_pagos_adjuntos_pago
  on pagos.adjuntos(pago_id);
create index if not exists idx_pagos_adjuntos_owner
  on pagos.adjuntos(owner_id, pago_id);

drop trigger if exists trg_pagos_adjuntos_updated on pagos.adjuntos;
create trigger trg_pagos_adjuntos_updated before update on pagos.adjuntos
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. RUTINAS
-- ----------------------------------------------------------------------------

-- 5.1. siguiente_lunes(fecha) → date
-- Devuelve el lunes de la semana de la fecha (ISO: 1=lunes).
-- Si la fecha ya es lunes, devuelve la misma fecha.
create or replace function pagos.siguiente_lunes(p_fecha date)
returns date
language sql
immutable
as $$
  select p_fecha + ((8 - extract(isodow from p_fecha)::int) % 7);
$$;

grant execute on function pagos.siguiente_lunes(date) to authenticated;

-- 5.2. refresh_vencidos() → int
-- Marca como `vencido` todo pago con fecha_vencimiento < hoy y estado en
-- (pendiente, programado). Idempotente: solo cambia lo que toca.
-- La app lo llama al entrar a /pagos (1 query barata, no requiere cron).
create or replace function pagos.refresh_vencidos()
returns int
language plpgsql
security invoker
set search_path = pagos, public
as $$
declare
  v_owner uuid := auth.uid();
  v_count int;
begin
  if v_owner is null then
    return 0;
  end if;
  update pagos.pagos
    set estado = 'vencido'
    where owner_id = v_owner
      and estado in ('pendiente','programado')
      and fecha_vencimiento < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function pagos.refresh_vencidos() to authenticated;

-- 5.3. registrar_pago(p_pago_id, p_importe, p_metodo, p_fecha) → uuid
-- Crea un movimiento y actualiza importe_pagado + estado del pago.
-- Si el importe cubre el total → estado = 'pagado'.
-- Si es parcial → estado = 'pagado_parcial'.
-- Devuelve el id del movimiento creado.
-- Seguridad: verifica que el pago es del owner; hace el cálculo y los updates
-- en una sola transacción.
create or replace function pagos.registrar_pago(
  p_pago_id  uuid,
  p_importe  numeric,
  p_metodo   text,
  p_fecha    date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = pagos, public
as $$
declare
  v_owner      uuid := auth.uid();
  v_pago       pagos.pagos%rowtype;
  v_nuevo_pagado numeric;
  v_nuevo_estado text;
  v_mov_id     uuid;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;
  if p_importe is null or p_importe <= 0 then
    raise exception 'El importe debe ser > 0';
  end if;
  if p_metodo not in ('transferencia','domiciliacion','tarjeta','bizum','efectivo') then
    raise exception 'Método de pago no válido: %', p_metodo;
  end if;

  select * into v_pago from pagos.pagos where id = p_pago_id for update;
  if v_pago.id is null then
    raise exception 'Pago % no encontrado', p_pago_id;
  end if;
  if v_pago.owner_id <> v_owner then
    raise exception 'El pago % no es tuyo', p_pago_id;
  end if;
  if v_pago.estado in ('pagado','anulado') then
    raise exception 'El pago ya está en estado %', v_pago.estado;
  end if;

  v_nuevo_pagado := v_pago.importe_pagado + p_importe;
  if v_nuevo_pagado > v_pago.importe_total then
    raise exception 'El pago acumulado (%) supera el importe total (%)',
      v_nuevo_pagado, v_pago.importe_total;
  end if;

  if v_nuevo_pagado = v_pago.importe_total then
    v_nuevo_estado := 'pagado';
  else
    v_nuevo_estado := 'pagado_parcial';
  end if;

  -- crea el movimiento
  insert into pagos.movimientos (owner_id, pago_id, fecha, importe, metodo_pago)
  values (v_owner, p_pago_id, p_fecha, p_importe, p_metodo)
  returning id into v_mov_id;

  -- actualiza el pago
  update pagos.pagos
    set importe_pagado = v_nuevo_pagado,
        estado = v_nuevo_estado,
        fecha_pago_real = p_fecha,
        fecha_pago_programada = null         -- ya no está programado
    where id = p_pago_id;

  return v_mov_id;
end;
$$;

grant execute on function pagos.registrar_pago(uuid, numeric, text, date) to authenticated;

-- 5.4. reprogramar_siguiente_lunes(p_pago_id) → date
-- Mueve el pago al lunes de la semana próxima (o el siguiente, si hoy ya
-- es lunes y quieres pasarlo a la semana que viene). Devuelve la nueva fecha.
-- Útil para el botón "Al lunes 21".
create or replace function pagos.reprogramar_siguiente_lunes(p_pago_id uuid)
returns date
language plpgsql
security invoker
set search_path = pagos, public
as $$
declare
  v_owner  uuid := auth.uid();
  v_pago   pagos.pagos%rowtype;
  v_nueva  date;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  select * into v_pago from pagos.pagos where id = p_pago_id for update;
  if v_pago.id is null then
    raise exception 'Pago % no encontrado', p_pago_id;
  end if;
  if v_pago.owner_id <> v_owner then
    raise exception 'El pago % no es tuyo', p_pago_id;
  end if;
  if v_pago.estado in ('pagado','anulado') then
    raise exception 'El pago ya está en estado %', v_pago.estado;
  end if;

  -- base: hoy. Si el pago ya estaba programado, mantenemos la lógica de
  -- "mover 7 días más allá" en vez de "ir al lunes próximo" (que podría
  -- ser hoy mismo).
  v_nueva := pagos.siguiente_lunes(coalesce(v_pago.fecha_pago_programada, current_date) + 7);

  update pagos.pagos
    set fecha_pago_programada = v_nueva,
        estado = 'programado'
    where id = p_pago_id;

  return v_nueva;
end;
$$;

grant execute on function pagos.reprogramar_siguiente_lunes(uuid) to authenticated;

-- 5.5. generar_recurrentes(p_mes int, p_anio int) → int
-- Crea los pagos del mes para todas las reglas activas. Idempotente:
-- si ya existe un pago para (recurrente_id, mes, año) no lo duplica.
-- Devuelve el número de pagos creados.
create or replace function pagos.generar_recurrentes(p_mes int, p_anio int)
returns int
language plpgsql
security invoker
set search_path = pagos, public
as $$
declare
  v_owner  uuid := auth.uid();
  v_reg    record;
  v_fecha_emision date;
  v_fecha_venc    date;
  v_count int := 0;
  v_existe int;
  v_dia_emision int;
  v_dia_venc int;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;
  if p_mes is null or p_mes between 1 and 12 is false then
    raise exception 'Mes inválido: %', p_mes;
  end if;
  if p_anio is null or p_anio < 2000 or p_anio > 3000 then
    raise exception 'Año inválido: %', p_anio;
  end if;

  for v_reg in
    select * from pagos.recurrentes
    where owner_id = v_owner
      and activo = true
      and fecha_inicio <= make_date(p_anio, p_mes, 28)
      and (fecha_fin is null or fecha_fin >= make_date(p_anio, p_mes, 1))
  loop
    -- emisión: día_del_mes del mes/año
    v_dia_emision := v_reg.dia_del_mes;
    v_fecha_emision := make_date(p_anio, p_mes, v_dia_emision);

    -- vencimiento: dia_vencimiento del mes, o +30 días desde emisión
    v_dia_venc := coalesce(v_reg.dia_vencimiento, v_dia_emision);
    -- si dia_vencimiento <= dia_del_mes, va al mes siguiente
    if v_dia_venc <= v_dia_emision then
      v_fecha_venc := make_date(p_anio, p_mes, v_dia_venc) + interval '1 month';
    else
      v_fecha_venc := make_date(p_anio, p_mes, v_dia_venc);
    end if;

    -- ¿ya existe? (por recurrente_id, mes y año de emisión)
    select count(*) into v_existe
    from pagos.pagos
    where owner_id = v_owner
      and recurrente_id = v_reg.id
      and date_part('year', fecha_emision_factura)::int = p_anio
      and date_part('month', fecha_emision_factura)::int = p_mes;

    if v_existe = 0 then
      insert into pagos.pagos (
        owner_id, recurrencia_id, recurrente_id,
        proveedor, concepto, categoria,
        importe_total, importe_pagado,
        fecha_emision_factura, fecha_vencimiento,
        estado, prioridad, metodo_pago
      ) values (
        v_owner, v_reg.id, v_reg.id,
        v_reg.proveedor, v_reg.concepto, v_reg.categoria,
        v_reg.importe, 0,
        v_fecha_emision, v_fecha_venc,
        'pendiente', 'media', v_reg.metodo_pago
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function pagos.generar_recurrentes(int, int) to authenticated;

-- 5.6. calcular_urgencia(p_fecha_venc, p_categoria, p_estado) → numeric
-- Función pura para que front y SQL estén sincronizados. El score se
-- persiste en la tabla al guardar (urgencia_score) y se recalcula al
-- listar desde la vista.
--
-- `stable` (no `immutable`) porque usa `current_date` internamente.
-- Aun así, dentro de la misma query el resultado es estable, lo que permite
-- al planner hacer optimizaciones razonables.
--
-- Lógica del score:
--   - Pagado/anulado → 0
--   - Vencido (días < 0) → 1000 + bonus categoría + 500 (vencido)
--   - En plazo → 100 / días_que_faltan + bonus categoría
--   - Bonus categoría: nomina/impuesto +200, alquiler/suministro/prestamo +80
--   - Sin fecha → 0
create or replace function pagos.calcular_urgencia(
  p_fecha_venc date,
  p_categoria text,
  p_estado    text
)
returns numeric
language sql
stable
as $$
  select
    case
      when p_fecha_venc is null then 0
      when p_estado in ('pagado','anulado') then 0
      when (p_fecha_venc - current_date) < 0 then
        1000
        + case
            when p_categoria in ('nomina','impuesto') then 200
            when p_categoria in ('alquiler','suministro','prestamo') then 80
            else 0
          end
        + 500
      else
        100.0 / (p_fecha_venc - current_date)
        + case
            when p_categoria in ('nomina','impuesto') then 200
            when p_categoria in ('alquiler','suministro','prestamo') then 80
            else 0
          end
    end;
$$;

grant execute on function pagos.calcular_urgencia(date, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. VISTA v_pagos — score recalculado al vuelo + días hasta vencer
-- Útil para listados: ordenable, filtrable, sin lógica de cliente.
-- ----------------------------------------------------------------------------
create or replace view pagos.v_pagos as
select
  p.*,
  -- estado efectivo: si está vencido por fecha y aún figura pendiente/programado, mostrar vencido
  case
    when p.estado in ('pendiente','programado') and p.fecha_vencimiento < current_date
      then 'vencido'::text
    else p.estado
  end as estado_efectivo,
  -- días hasta vencer (negativo si vencido)
  (p.fecha_vencimiento - current_date) as dias_hasta_vencer,
  -- score recalculado al listar (ignora el persistido, que puede estar desfasado)
  pagos.calcular_urgencia(p.fecha_vencimiento, p.categoria,
    case
      when p.estado in ('pendiente','programado') and p.fecha_vencimiento < current_date
        then 'vencido'
      else p.estado
    end
  ) as urgencia_calculada
from pagos.pagos p;

-- La vista hereda el RLS de la tabla base (Postgres propaga las policies).
-- No hace falta policies adicionales aquí.

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY — cada usuario solo ve lo suyo
-- ----------------------------------------------------------------------------
alter table pagos.recurrentes enable row level security;
alter table pagos.pagos      enable row level security;
alter table pagos.movimientos enable row level security;
alter table pagos.adjuntos   enable row level security;

-- recurrentes
drop policy if exists "own_select" on pagos.recurrentes;
drop policy if exists "own_insert" on pagos.recurrentes;
drop policy if exists "own_update" on pagos.recurrentes;
drop policy if exists "own_delete" on pagos.recurrentes;
create policy "own_select" on pagos.recurrentes for select using (owner_id = auth.uid());
create policy "own_insert" on pagos.recurrentes for insert with check (owner_id = auth.uid());
create policy "own_update" on pagos.recurrentes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on pagos.recurrentes for delete using (owner_id = auth.uid());

-- pagos
drop policy if exists "own_select" on pagos.pagos;
drop policy if exists "own_insert" on pagos.pagos;
drop policy if exists "own_update" on pagos.pagos;
drop policy if exists "own_delete" on pagos.pagos;
create policy "own_select" on pagos.pagos for select using (owner_id = auth.uid());
create policy "own_insert" on pagos.pagos for insert with check (owner_id = auth.uid());
create policy "own_update" on pagos.pagos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on pagos.pagos for delete using (owner_id = auth.uid());

-- movimientos
drop policy if exists "own_select" on pagos.movimientos;
drop policy if exists "own_insert" on pagos.movimientos;
drop policy if exists "own_update" on pagos.movimientos;
drop policy if exists "own_delete" on pagos.movimientos;
create policy "own_select" on pagos.movimientos for select using (owner_id = auth.uid());
create policy "own_insert" on pagos.movimientos for insert with check (owner_id = auth.uid());
create policy "own_update" on pagos.movimientos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on pagos.movimientos for delete using (owner_id = auth.uid());

-- adjuntos
drop policy if exists "own_select" on pagos.adjuntos;
drop policy if exists "own_insert" on pagos.adjuntos;
drop policy if exists "own_update" on pagos.adjuntos;
drop policy if exists "own_delete" on pagos.adjuntos;
create policy "own_select" on pagos.adjuntos for select using (owner_id = auth.uid());
create policy "own_insert" on pagos.adjuntos for insert with check (owner_id = auth.uid());
create policy "own_update" on pagos.adjuntos for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_delete" on pagos.adjuntos for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. STORAGE — bucket privado para los PDFs de facturas
-- Patrón idéntico a `tareas-adjuntos`: bytes en storage, metadatos en
-- `pagos.adjuntos`, path `<owner_id>/<pago_id>/<uuid>-<filename>`.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pagos-adjuntos',
  'pagos-adjuntos',
  false,                              -- privado: requiere signed URL
  10485760,                           -- 10 MB / archivo
  array['application/pdf']::text[]    -- SOLO PDFs en MVP (imágenes fuera)
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pagos_adjuntos_select" on storage.objects;
drop policy if exists "pagos_adjuntos_insert" on storage.objects;
drop policy if exists "pagos_adjuntos_update" on storage.objects;
drop policy if exists "pagos_adjuntos_delete" on storage.objects;

create policy "pagos_adjuntos_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'pagos-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pagos_adjuntos_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pagos-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pagos_adjuntos_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pagos-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'pagos-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "pagos_adjuntos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pagos-adjuntos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 9. Refresca la caché de PostgREST para que la API vea el nuevo schema.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
