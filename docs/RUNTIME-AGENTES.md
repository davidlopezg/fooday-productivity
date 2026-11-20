# Runtime de agentes

El runtime es un servicio Node independiente de la PWA estática de Fooday. La interfaz puede seguir desplegándose en GitHub Pages, mientras que las claves privadas, las ejecuciones y las aprobaciones viven en un servidor.

## Arquitectura

```text
PWA /agentes (futuro)
    │ Authorization: Bearer <JWT Supabase>
    ▼
Runtime Node (runtime/)
    ├── valida el JWT con Supabase Auth
    ├── deriva owner_id del usuario (nunca del cuerpo)
    ├── usa AI_API_KEY solo en servidor
    ├── transmite tokens con SSE
    └── persiste runs, aprobaciones y actividad con RLS
              │
              ▼
          Supabase
```

El servicio usa el JWT del usuario para acceder a PostgREST. Por tanto, las políticas RLS siguen siendo la barrera de acceso. No usa `service_role` y no acepta un `owner_id` proporcionado por el cliente.

## Configuración

| Variable | Obligatoria | Descripción |
|---|:---:|---|
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Sí | Clave anon; se usa junto al JWT del usuario |
| `AI_BASE_URL` | Sí | Base OpenAI-compatible, sin `/chat/completions` |
| `AI_API_KEY` | Sí | Secreto del proveedor; nunca en el navegador |
| `AI_MODEL` | No | Modelo; por defecto `Minimax-M3` |
| `PORT` | No | Puerto; por defecto `8787` |
| `RUN_MAX_DURATION_MS` | No | Duración máxima; por defecto `120000` |
| `RUN_MAX_OUTPUT_CHARS` | No | Salida máxima; por defecto `100000` |

## Puesta en marcha

```bash
cd runtime
npm test
npm start
```

El servicio necesita Node 22 o posterior. Todavía no incluye un Dockerfile ni un destino de despliegue: antes de usarlo debe elegirse y documentarse un hosting Node con HTTPS.

## API

Todas las rutas salvo `/health` exigen:

```http
Authorization: Bearer <access_token de Supabase>
```

### Crear una ejecución y recibir streaming

```http
POST /v1/runs
Content-Type: application/json

{"prompt":"Resume el estado de mis tareas","system":"Eres el agente de Fooday"}
```

La respuesta es `text/event-stream` con eventos `run`, `token`, `done` o `error`.

### Consultar y cancelar

```http
GET /v1/runs/:id
POST /v1/runs/:id/cancel
```

Solo se pueden cancelar runs `queued`, `running`, `waiting_user` o `waiting_approval`.

### Aprobaciones

```http
GET /v1/approvals
POST /v1/approvals/:id/approved
POST /v1/approvals/:id/rejected
```

Una aprobación se decide una sola vez. Si `expires_at` ya pasó, el servicio la marca `expired` y rechaza la decisión.

## Persistencia

La migration `supabase/migrations/0039_agentes_runtime.sql` crea:

- `agent_runs`
- `agent_approvals`
- `agent_activity_log`

Todas tienen `owner_id`, RLS e índices. Los triggers impiden vincular una aprobación o actividad a una run de otro propietario.

**La migration debe aplicarse en Supabase antes de desplegar el runtime.**

## Límites de esta primera entrega

- Una ejecución dura como máximo la petición HTTP; todavía no hay cola ni trabajos en segundo plano.
- La recuperación después de reiniciar el runtime está pendiente.
- No hay herramientas externas ni conectores Gmail/WhatsApp.
- No se implementa todavía el MVP `/agentes` ni sus conversaciones multiagente.
- Cancelar una run mientras el proveedor sigue transmitting no interrumpe inmediatamente la llamada; evita estados finales contradictorios, pero elAbort se resolverá en el siguiente incremento.
