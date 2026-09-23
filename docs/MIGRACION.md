# Migración desde `fooday-intelligence-core`

Migración **de ida** (one-shot). El repo de inteligencia es el origen; Supabase, el destino.

## Qué se migra

| Origen (Markdown) | Destino (Supabase) | Estado |
|:---|:---|:---|
| `docs/planificacion/tareas-notion.md` | `tareas` (193) | ✅ automático |
| `docs/metas/*.md` | `metas` (5) + `areas` | ✅ automático |
| `docs/planificacion/rituales-semanales.md` | `rituales` (23) | ✅ automático |
| `docs/perfil/mi-proposito-de-vida.md`, `knowledge/vision-mision-proposito.md` | `propositos`, `valores`, `visiones` | ⚠️ plantilla manual |
| `docs/planificacion/semanal/*.md` | `planes_semanales` | 🔜 pendiente |
| `docs/planificacion/dia/*.md` | `planes_diarios` + tareas | 🔜 pendiente |

## Cómo ejecutarlo

```bash
FOODAY_CORE_DIR="C:/Users/David/Projects/fooday-intelligence-core" \
FOODAY_OWNER_ID="<uuid-de-tu-usuario>" \
python scripts/etl/import_from_core.py
```

Genera:

- `supabase/seed/001_seed_from_core.sql` — datos deterministas, idempotentes (`on conflict do update`).
- `supabase/seed/002_norte_manual.sql` — plantilla del Norte, para rellenar a mano.

Luego ejecuta los `.sql` en Supabase (SQL Editor o `npx supabase db push`).

## `FOODAY_OWNER_ID`

Es el `uuid` del usuario de Supabase Auth al que pertenecen los datos.
Se obtiene tras crear tu usuario (ver [`CONFIGURACION.md`](CONFIGURACION.md)):

```sql
select id, email from auth.users;
```

## Idempotencia

El ETL se puede re-ejecutar sin duplicar:

- `tareas`: `on conflict (owner_id, codigo) do update`
- `metas`: `on conflict (owner_id, codigo) do update`
- `areas`: `on conflict (owner_id, nombre) do update`
- `rituales`: `on conflict do nothing` (índice único por día/hora/descripción)

## Limitaciones conocidas

- El parser de tareas depende del **formato exacto de las tablas** del `.md`. Si cambia, hay que actualizar `parsear_tareas()`.
- Las metas se mapean a áreas por coincidencia de nombre; revisar el resultado.
- Finanzas, salud y datos legales **no** se migran (fuera de alcance).
