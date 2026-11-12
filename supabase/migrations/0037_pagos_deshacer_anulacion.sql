-- 0037_pagos_deshacer_anulacion.sql
--
-- Auditoría de lógica (issue #14): anular un pago con dinero ya pagado
-- borraba ese dinero del seguimiento y no había forma de atrás.
--
-- Qué pasaba:
--   · anularPago() ponía estado='anulado' sin mirar `importe_pagado` ni los
--     movimientos de `pagos.movimientos`.
--   · No existía ninguna operación inversa: el pago se quedaba anulado con
--     el importe pagado dentro, y ese importe ya no sumaba en ningún total.
--
-- La decisión (opción C): permitir anular, pero avisar y poder DESHACER.
--
-- Esta RPC deshace la anulación: borra los movimientos registrados, pone el
-- importe pagado a 0 y devuelve el pago a 'pendiente'. Es la operación
-- inversa de `registrar_pago` para el caso "me equivoqué al anular".
--
-- Es una RPC (y no un update desde la app) por la misma razón que las demás
-- del módulo pagos: el borrado de movimientos y el reset de importes tienen
-- que ser atómicos y validados en el servidor.

create or replace function pagos.deshacer_anulacion(p_pago_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pagos, public
as $$
declare
  v_owner uuid := auth.uid();
  v_pago  pagos.pagos%rowtype;
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
  if v_pago.estado <> 'anulado' then
    raise exception 'El pago no está anulado (estado actual: %)', v_pago.estado;
  end if;

  -- Borra los movimientos registrados (los pagos parciales) y deja el pago
  -- como estaba antes de la anulación: pendiente, sin importe pagado.
  delete from pagos.movimientos where pago_id = p_pago_id;

  update pagos.pagos
    set estado = 'pendiente',
        importe_pagado = 0,
        fecha_pago_real = null,
        fecha_pago_programada = null
    where id = p_pago_id;

  return true;
end;
$$;

grant execute on function pagos.deshacer_anulacion(uuid) to authenticated;
