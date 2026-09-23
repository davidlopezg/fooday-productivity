# Arquitectura

## Idea

Reducir la fricción de gestionar tareas/metas/planificación sin comandos:
una app web que habla directamente con Supabase.

## Capas

```
┌──────────────────────────────┐
│  APP (Next.js)               │  UI mobile-first
│  /, /tareas, /metas, ...     │
└───────────────┬──────────────┘
                │ @supabase/ssr  (anon key + RLS)
┌───────────────▼──────────────┐
│  SUPABASE (PostgreSQL)       │  FUENTE DE VERDAD operativa
│  areas, metas, tareas, ...   │
└───────────────┬──────────────┘
                │ MCP (Supabase)
┌───────────────▼──────────────┐
│  fooday-intelligence-core    │  CEREBRO: agentes, conocimiento, análisis
│  (ya no es la base de datos) │
└──────────────────────────────┘
```

## Decisiones

| Decisión | Motivo |
|:---|:---|
| Supabase como fuente de verdad operativa | Consultas, multi-dispositivo, sin fricción |
| Markdown del core = origen de migración | Migración puntual, no sincronización continua |
| RLS por `owner_id` | Seguridad desde el minuto 1 |
| `anon` key en el cliente, `service_role` solo server/ETL | Evitar fugas de credenciales |
| Dominio **solo operativo** | Salud/legal/finanzas/familia quedan fuera |
| ETL en Python que genera **SQL revisable** | Determinista, auditable, idempotente |

## Lo que NO es (todavía)

- No hay sincronización bidireccional con el repo. La migración es de ida.
- No hay agente conectado a Supabase por MCP (pendiente: configurar el MCP server).
- No hay auth UI todavía (Supabase Auth incluido en el esquema, pendiente de pantalla).
