-- ============================================================================
-- 0044_estatus_revision_diaria.sql
--
-- REVISIÓN DIARIA en el Estatus (issue #85).
--
-- EL PROBLEMA QUE RESUELVE
-- -----------------------
-- El Estatus Diario ya tenía 9 hábitos, auditoría 20/80 y cierre cognitivo,
-- pero NO tenía el checklist de cierre de día que se pide: 9 afirmaciones
-- concretas (Trabajo / Atención / Vida personal) + "una cosa que quiero
-- mejorar mañana". Eran respuesta suelta (texto libre) o campos que no
-- existían, así que no se podía marcar "sí / no" y no se podía comparar
-- un día con otro.
--
-- DECISIONES (ponytail — mínimo que funcione):
--   · 9 columnas BOOLEAN planas + 1 TEXT. Sin JSONB: son respuestas
--     sí/no y se pueden consultar con SQL real ("¿cuántos días cerraste a
--     una hora razonable?").
--   · NULL = "no respondido" (igual que los 9 hábitos). FALSE = "no lo
--     hice". La diferencia importa: absentarse no es lo mismo que fallar.
--   · Idempotente: se puede aplicar dos veces sin romper nada.
-- ============================================================================

alter table public.estatus_diarios
  add column if not exists rev_trabajo_avance boolean,
  add column if not exists rev_trabajo_sin_nuevos boolean,
  add column if not exists rev_trabajo_cierre_razonable boolean,
  add column if not exists rev_atencion_movil boolean,
  add column if not exists rev_atencion_sin_interrupciones boolean,
  add column if not exists rev_vida_familia boolean,
  add column if not exists rev_vida_lectura boolean,
  add column if not exists rev_vida_ejercicio boolean,
  add column if not exists rev_vida_descanso boolean,
  add column if not exists rev_mejora_manana text;

comment on column public.estatus_diarios.rev_trabajo_avance is
  'REVISIÓN DIARIA · Trabajo: "He avanzado en mi tarea principal".';
comment on column public.estatus_diarios.rev_trabajo_sin_nuevos is
  'REVISIÓN DIARIA · Trabajo: "He evitado abrir nuevos proyectos sin necesidad".';
comment on column public.estatus_diarios.rev_trabajo_cierre_razonable is
  'REVISIÓN DIARIA · Trabajo: "He cerrado el trabajo a una hora razonable".';
comment on column public.estatus_diarios.rev_atencion_movil is
  'REVISIÓN DIARIA · Atención: "He evitado el consumo automático del móvil".';
comment on column public.estatus_diarios.rev_atencion_sin_interrupciones is
  'REVISIÓN DIARIA · Atención: "He trabajado sin interrupciones importantes".';
comment on column public.estatus_diarios.rev_vida_familia is
  'REVISIÓN DIARIA · Vida personal: "He dedicado tiempo de calidad a mi familia".';
comment on column public.estatus_diarios.rev_vida_lectura is
  'REVISIÓN DIARIA · Vida personal: "He leído al menos 30 minutos".';
comment on column public.estatus_diarios.rev_vida_ejercicio is
  'REVISIÓN DIARIA · Vida personal: "He caminado o hecho ejercicio".';
comment on column public.estatus_diarios.rev_vida_descanso is
  'REVISIÓN DIARIA · Vida personal: "He tenido un momento de descanso real".';
comment on column public.estatus_diarios.rev_mejora_manana is
  'REVISIÓN DIARIA: "Una cosa que quiero mejorar mañana".';
