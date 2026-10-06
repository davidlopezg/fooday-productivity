-- ============================================================================
-- 0023_seed_pagos_fooday.sql
-- Seed: inserta las 19 facturas pendientes desde
-- `docs/strategy/pagos/facturas-pendientes-pago.md` + sección
-- "Capturado VC-20260921-001" del 2026-09-21.
--
-- Decisiones de mapeo (acordadas con el usuario):
--   1. Todo se inserta como `pendiente`. La app actualizará a `vencido` los
--      cuya fecha_vencimiento ya haya pasado, al cargar /pagos.
--   2. Los 4 items sin importe (P1 Galiana, P3 Gros Mercat, P4 Luz, P5 Xaloc)
--      NO entran: el CHECK exige `importe_total > 0`. Se meten a mano.
--   3. P5 Xaloc NO entra como pago: es una baja de vehículo, no un pago.
--   4. P8 Hacienda se inserta como UN solo pago por 700 € (mínimo conocido).
--   5. Los pagos del mismo "vecino" comparten `recurrencia_id` (UUID) para
--      que la UI los agrupe visualmente cuando se implemente Sprint 6.
--   6. `recurrente_id` queda NULL: aún no creamos reglas automáticas
--      (eso es Sprint 6). Los pagos están "sueltos" pero agrupados.
--
-- Idempotencia: este seed NO es idempotente (insertar 2 veces duplicaría).
-- Si lo ejecutas por error, borra con:
--   delete from pagos.pagos
--   where notas like 'Migrado desde facturas-pendientes-pago.md%';
-- ============================================================================

do $$
declare
  v_owner uuid;

  -- UUIDs de agrupación (compartidos entre pagos del mismo "vecino")
  v_g_sabadell        uuid := gen_random_uuid();
  v_g_tgss            uuid := gen_random_uuid();
  v_g_manas_sumin     uuid := gen_random_uuid();
  v_g_teresa_atrasos  uuid := gen_random_uuid();
  v_g_teresa_plan     uuid := gen_random_uuid();
  v_g_nominas_jul     uuid := gen_random_uuid();
  v_g_familia_sep     uuid := gen_random_uuid();  -- Abril + devolución Fooday
  v_g_aeat            uuid := gen_random_uuid();  -- Hacienda
begin
  -- 1) Obtener el owner (primer usuario de auth.users).
  --    El SQL editor de Supabase corre como `postgres` (no como un
  --    usuario autenticado), así que `auth.uid()` devuelve NULL.
  select id into v_owner from auth.users limit 1;
  if v_owner is null then
    raise exception 'No hay usuarios en auth.users. Crea un usuario primero.';
  end if;

  raise notice 'Insertando pagos para owner %', v_owner;

  -- =========================================================================
  -- GRUPO 1: Banco Sabadell (3 cuotas de préstamo)
  -- Riesgo: embargo si no se paga (cuota 1)
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_sabadell, null,
     'Banco Sabadell', 'Cuota préstamo 1/3', 'prestamo',
     577.85, null, '2026-07-31',
     'pendiente', 'critica', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Embargo si no se paga. Compromiso con el banco.'),
    (v_owner, v_g_sabadell, null,
     'Banco Sabadell', 'Cuota préstamo 2/3', 'prestamo',
     577.85, null, '2026-08-31',
     'pendiente', 'alta', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Compromiso con el banco.'),
    (v_owner, v_g_sabadell, null,
     'Banco Sabadell', 'Cuota préstamo 3/3', 'prestamo',
     577.85, null, '2026-09-30',
     'pendiente', 'alta', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Fuera del plan 31/08.');

  -- =========================================================================
  -- GRUPO 2: TGSS / Autónomo (3 atrasos)
  -- Riesgo: CRECE con intereses si no se paga
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_tgss, null,
     'TGSS', 'Cuota autónomo atraso 2', 'impuesto',
     480.00, '2026-07-13', '2026-08-17',
     'pendiente', 'alta', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasado desde 13/07. CRECE si no se paga.'),
    (v_owner, v_g_tgss, null,
     'TGSS', 'Cuota autónomo atraso 3', 'impuesto',
     480.00, '2026-07-13', '2026-08-17',
     'pendiente', 'alta', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasado desde 13/07. CRECE si no se paga.'),
    (v_owner, v_g_tgss, null,
     'TGSS', 'Cuota autónomo atraso 4', 'impuesto',
     480.00, '2026-07-13', '2026-08-03',
     'pendiente', 'alta', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasado desde 13/07. CRECE si no se paga.');

  -- =========================================================================
  -- GRUPO 3: Mañas Suministros (2 facturas)
  -- Riesgo: CORTE de suministro
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_manas_sumin, null,
     'Mañas', 'Suministros atraso 10/07', 'suministro',
     200.00, '2026-07-10', '2026-07-27',
     'pendiente', 'critica', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Riesgo de CORTE de suministro.'),
    (v_owner, v_g_manas_sumin, null,
     'Mañas', 'Suministros fra pendiente 1', 'suministro',
     150.00, null, '2026-07-27',
     'pendiente', 'critica', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Riesgo de CORTE de suministro.');

  -- =========================================================================
  -- GRUPO 4: Teresa — facturas atrasadas (fra 1 y fra 2 del doc original)
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_teresa_atrasos, null,
     'Teresa', 'Factura julio (atrasada)', 'nomina',
     350.00, '2026-07-13', '2026-07-27',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasada desde 13/07. Casi 1 año sin presión.'),
    (v_owner, v_g_teresa_atrasos, null,
     'Teresa', 'Factura agosto', 'nomina',
     350.00, null, '2026-08-10',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Casi 1 año sin presión.');

  -- =========================================================================
  -- GRUPO 5: Nóminas puntuales de julio (Menchu, María, Manel)
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_nominas_jul, null,
     'Menchu', 'Nómina julio', 'nomina',
     120.00, null, '2026-07-20',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Sin presión.'),
    (v_owner, v_g_nominas_jul, null,
     'María', 'Nómina julio', 'nomina',
     180.00, null, '2026-07-20',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Sin presión.'),
    (v_owner, v_g_nominas_jul, null,
     'Manel Esteve Quera', 'Nómina junio (atrasada)', 'nomina',
     120.81, '2026-06-15', '2026-07-20',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasado desde 15/06.');

  -- =========================================================================
  -- GRUPO 6: Septiembre 2026 — familia (Abril, Fooday) y AEAT
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, null, null,
     'Prevención Riesgos', 'Servicio PRL', 'proveedor',
     229.90, '2026-06-19', '2026-08-17',
     'pendiente', 'media', 'transferencia',
     'Migrado desde facturas-pendientes-pago.md. Atrasado desde 19/06.'),
    (v_owner, v_g_familia_sep, null,
     'Fooday', 'Devolución tarjeta — gastos vacaciones', 'otro',
     31.70, '2026-09-21', '2026-09-21',
     'pendiente', 'media', 'transferencia',
     'Migrado desde VC-20260921-001 (#3). 29,50 + 1,10 + 1,10 = 31,70 €.'),
    (v_owner, v_g_familia_sep, null,
     'Abril', 'Registro escolar', 'otro',
     75.00, '2026-09-21', '2026-09-21',
     'pendiente', 'media', 'transferencia',
     'Migrado desde VC-20260921-001 (#13).'),
    (v_owner, v_g_aeat, null,
     'AEAT', 'Renta Boats 2025 — IVA + deuda adicional', 'impuesto',
     700.00, '2026-09-21', '2026-09-21',
     'pendiente', 'critica', 'transferencia',
     'Migrado desde VC-20260921-001 (#17). Importe mínimo conocido (>700 €). Bloqueado por gestoría que no responde. Solicitar aplazamiento a AEAT. EDITA el importe cuando sepas el total real.');

  -- =========================================================================
  -- GRUPO 7: Teresa — plan VC-20260921-001 (3 facturas condicionadas)
  -- =========================================================================
  insert into pagos.pagos (
    owner_id, recurrencia_id, recurrente_id,
    proveedor, concepto, categoria,
    importe_total, fecha_emision_factura, fecha_vencimiento,
    estado, prioridad, metodo_pago, notas
  ) values
    (v_owner, v_g_teresa_plan, null,
     'Teresa', 'Plan VC: Factura A (300€ AHORA)', 'nomina',
     300.00, '2026-09-21', '2026-09-21',
     'pendiente', 'media', 'transferencia',
     'Migrado desde VC-20260921-001 (#8). Pagar ya.'),
    (v_owner, v_g_teresa_plan, null,
     'Teresa', 'Plan VC: Factura B (300€ próximo finde)', 'nomina',
     300.00, '2026-09-21', '2026-09-26',
     'pendiente', 'media', 'transferencia',
     'Migrado desde VC-20260921-001 (#8). Pagar el fin de semana del 26-27/09.'),
    (v_owner, v_g_teresa_plan, null,
     'Teresa', 'Plan VC: Factura C (500€ tras recibir 290€)', 'nomina',
     500.00, '2026-09-21', '2026-12-31',
     'pendiente', 'media', 'transferencia',
     'Migrado desde VC-20260921-001 (#8). CONDICIONAL: solo se paga tras recibir los 290€ que Teresa adeuda. Enviarle factura de 290€. Fecha de vencimiento 31/12/2026 como placeholder hasta que sepas la real.');

  raise notice '✔ Insertados 19 pagos en 7 grupos';
  raise notice '  · Banco Sabadell: 3 (1.733,55 €)';
  raise notice '  · TGSS: 3 (1.440,00 €)';
  raise notice '  · Mañas Suministros: 2 (350,00 €)';
  raise notice '  · Teresa atrasadas: 2 (700,00 €)';
  raise notice '  · Nóminas julio: 3 (420,81 €)';
  raise notice '  · Septiembre (Prevención, Abril, Fooday, AEAT): 4 (1.036,60 €)';
  raise notice '  · Teresa plan VC: 3 (1.100,00 €)';
  raise notice '  TOTAL: 6.780,96 €';
end $$;

-- Refresca la caché de PostgREST para que la app vea los nuevos registros.
notify pgrst, 'reload schema';
