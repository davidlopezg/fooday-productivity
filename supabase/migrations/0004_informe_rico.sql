-- fooday-productivity: informe rico del plan diario v3
-- Añade columnas JSONB para guardar el informe completo generado por la IA.

alter table public.planes_diarios
  add column if not exists informe_json jsonb,
  add column if not exists fecha_larga  text;

create index if not exists idx_planes_informe
  on public.planes_diarios using gin (informe_json);