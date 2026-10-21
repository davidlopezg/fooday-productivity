# Modelo de datos

Esquema definido en [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
Todas las tablas tienen **RLS** y columna `owner_id` (`default auth.uid()`).

## Jerarquía

```
Áreas
 └── Propósitos
 └── Proyectos (area_id) ─── Metas (proyecto_id) ── Key Results (resultados_periodo)
                                                     ├── kr_periodos (N:M) ── Periodos
                                                     └── Tareas (resultado_periodo_id)
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
>
> Migration `0028_kr_separado_de_trimestre.sql` corrige el bug "solo
> puedo poner un KR por meta". Antes `resultados_periodo` forzaba
> `unique(meta_id, periodo_id)` (1 KR por trimestre). Ahora un KR es
> independiente del trimestre y vive en uno o varios periodos a través
> de la tabla puente `kr_periodos` (asignación N:M).

## Tablas

| Tabla | Función | Clave natural (idempotencia) |
|:---|:---|:---|
| `areas` | Ámbitos (Familia, Finanzas, Salud, Sol de Nit…) | `owner_id + nombre` |
| `propositos` | Propósito (el "por qué") | — |
| `valores` | Valores personales | — |
| `visiones` | Visión / BHAG | — |
| `metas` | Metas (card por meta) | `owner_id + codigo` |
| `resultados_periodo` | Key Results (KR) de una meta. Migration 0028: ya no tiene `periodo_id`; la asignación a 1..N trimestres/meses vive en `kr_periodos`. | — |
| `kr_periodos` | Asignación N:M KR↔periodo. Migration 0028. | `kr_id + periodo_id` |
| `periodos` | Trimestres / meses / rangos custom. | `owner_id + tipo + anio + numero` |
| `proyectos` | Proyectos (área_id, hijos de area). | `owner_id + nombre` |
| `okrs` | **LEGACY** (migration 0001, nunca usado por la app). | — |
| `key_results` | **LEGACY** (migration 0001, nunca usado por la app). | — |
| `hitos` | **LEGACY** (migration 0001, nunca usado por la app). | — |
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
