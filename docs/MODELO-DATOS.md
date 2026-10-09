# Modelo de datos

Esquema definido en [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
Todas las tablas tienen **RLS** y columna `owner_id` (`default auth.uid()`).

## Jerarquía

```
Áreas
 └── Propósitos
 └── Proyectos (area_id) ─── Metas (proyecto_id) ──┬── OKRs ── Key Results
                                                     └── Hitos
Tareas ── (area_id, meta_id, proyecto_id)
Rituales (reglas fijas de la semana)
Planes semanales
Planes diarios ── Plan diario tareas ── Tareas
Capturas (inbox / vaciar-cabeza)
```

> Migration `0024_metas_proyecto_contexto.sql` añade `metas.proyecto_id`,
> `metas.fecha_objetivo`, `metas.contexto`, `metas.situacion_actual` y
> `proyectos.area_id`. Cierra el hueco que provocaba la confusión
> "¿esto es meta o proyecto?": ahora la jerarquía es completa y el
> agente en `/agente` clasifica el contexto libre en proyecto / meta /
> captura antes de proponer estructura.

## Tablas

| Tabla | Función | Clave natural (idempotencia) |
|:---|:---|:---|
| `areas` | Ámbitos (Familia, Finanzas, Salud, Sol de Nit…) | `owner_id + nombre` |
| `propositos` | Propósito (el "por qué") | — |
| `valores` | Valores personales | — |
| `visiones` | Visión / BHAG | — |
| `metas` | Metas (card por meta) | `owner_id + codigo` |
| `okrs` | Objetivos por meta | — |
| `key_results` | KRs medibles | — |
| `hitos` | Hitos de una meta | — |
| `rituales` | Qué toca cada día de la semana | `owner_id + dia + hora + descripcion` |
| `tareas` | Tareas | `owner_id + codigo` |
| `planes_semanales` | Plan de cada semana ISO | `owner_id + anio + semana_iso` |
| `planes_diarios` | Plan de cada día | `owner_id + fecha` |
| `plan_diario_tareas` | Tareas del día (R1/R2/micro) | — |
| `capturas` | Inbox sin procesar | — |

## Enumerados (`check`)

- **estado meta:** `sin_empezar · en_progreso · bloqueada · completada · archivada`
- **estado tarea:** `pendiente · en_progreso · bloqueada · hecha · descartada · archivada`
- **prioridad:** `critica · urgente · alta · media · baja`
- **semáforo:** `verde · amarillo · rojo`
- **tipo tarea del día:** `imprescindible · autocuidado · micro · extra`
- **rama captura:** `tarea · problema · reflexion · idea · pago · maria · sin_clasificar`

## El vínculo que da valor

```
tarea → meta → OKR/área → propósito
```

Sin ese vínculo, la app es una lista. Con él, es un **sistema de mando**.

## RLS

Cada tabla: 4 políticas (`select/insert/update/delete`) con `owner_id = auth.uid()`.
La `service_role` (ETL) omite RLS, por eso el ETL debe fijar `owner_id` explícitamente.
