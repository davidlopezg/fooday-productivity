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
                │ Supabase JS (JWT + RLS)
┌───────────────▼──────────────┐
│  SUPABASE (PostgreSQL)       │  FUENTE DE VERDAD operativa
│  areas, metas, tareas, ...   │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│  RUNTIME DE AGENTES          │  Node independiente (opcional)
│  ejecuciones, permisos,      │  ← #67: streaming, aprobaciones
│  aprobaciones, herramientas │     y herramientas en servidor
└──────────────────────────────┘
```

## Decisiones

| Decisión | Motivo |
|:---|:---|
| Supabase como fuente de verdad operativa | Consultas, multi-dispositivo, sin fricción |
| Markdown del core = origen de migración | Migración puntual, no sincronización continua |
| RLS por `owner_id` | Seguridad desde el minuto 1 |
| `anon` key en el cliente, `service_role` solo server/ETL | Evitar fugas de credenciales |
| Runtime de agentes como proceso Node independiente | La PWA puede seguir en GitHub Pages; los secretos y las ejecuciones no viajan al navegador |
| Dominio **solo operativo** | Salud/legal/finanzas/familia quedan fuera |
| ETL en Python que genera **SQL revisable** | Determinista, auditable, idempotente |

## Lo que NO es (todavía)

- No hay sincronización bidireccional con el repo. La migración es de ida.
- No hay agente conectado a Supabase por MCP (pendiente: configurar el MCP server).
- La pantalla de login con Supabase Auth ya existe; la protección de rutas se realiza en cliente porque GitHub Pages no ejecuta middleware.
- El runtime seguro de agentes está en `runtime/` y se documenta en [`RUNTIME-AGENTES.md`](RUNTIME-AGENTES.md). El hosting Node debe elegirse antes de activarlo en producción.
