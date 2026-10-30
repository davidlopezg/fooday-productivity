# Análisis de la propuesta P1–P5 (y 4 atributos) frente a FOODAY Productivity

Fecha: 2026-01-14
Contexto: revisión de la propuesta de metodología recibida (5 categorías de impacto P1–P5, 3 atributos, organización diaria 1+2, revisión semanal, cap de 2 proyectos) comparada con la implementación real de este repositorio.

---

## 0. Resumen ejecutivo

- La propuesta **describe un problema que la app ya resuelve en gran parte**: el inventario GTD, la fuente de verdad externa, los estados richer, el control de tesorería y el foco curado del día ya existen.
- **NO tiene sentido copiar P1–P5 como un campo nuevo de prioridad.** La app ya tiene `prioridad` (critica/urgente/alta/media/baja), `ambito`, `matriz` Eisenhower 2D, `capa`, `es_wig` y `proyecto_id`. Una quinta escala de "prioridad" sería más campos para el mismo problema.
- **Sí tiene sentido implementar 4 cosas concretas y baratas**, todas coherentes con la arquitectura existente:
  1. `esfuerzo` como enum (15/30/60/90) y usarlo de verdad en la priorización.
  2. Cap de 2 proyectos activos simultáneos (RPC en BD, igual que los caps de 3 ya existentes).
  3. Estructura explícita "1 objetivo principal + 2 secundarios + 1 mantenimiento" en `/plan-diario`.
  4. Dos pasos que faltan en la revisión semanal: **vencimientos/riesgos** y **descartar/delegar/aplazar**.
- La regla del "verbo + resultado concreto" se implementa sobre el campo `criterio_terminacion` que **ya existe**, sin añadir campos.

---

## 1. ¿Qué aplicación se usa para gestionar las tareas?

**FOODAY Productivity** — la que se está construyendo en este repositorio.

- Next.js 16.3.6 (App Router) + React 19 + Tailwind 4
- Supabase (Postgres + Auth + Storage) — 33 migraciones aplicadas (`supabase/migrations/0001..0033`)
- Capacitor 8 (Android + iOS), build estático exportable (`out/`)
- IA pluggable (OpenAI-compatible endpoint configurable en `/configuracion`)

Tablas de dominio relevantes:

| Tabla | Contenido |
|---|---|
| `tareas` | Inventario completo (meta, área, proyecto, prioridad, deadline, estado, capa, esfuerzo, importe, subtareas, adjuntos, comentarios, recurrencia) |
| `metas` | Objetivos + WIG (`es_wig`, máx 3) + rango de fechas |
| `resultados_periodo` | KRs medibles (trimestre/mes) + foco semanal (migration 0033, máx 3) |
| `proyectos` / `areas` | Contenedores de resultados |
| `pagos` | Tesorería: importes, vencimientos, snowball, programación |
| `plan_diario_tareas` / `plan_semanal_tareas` | Planes por día y por semana |
| `tareas_subtareas` / `tareas_adjuntos` / `tareas_comentarios` | Profundidad por tarea |
| `proyecto_eventos` / `proyecto_analisis` | Cronología + escenarios (migration 0029) |

---

## 2. ¿Cumple ya los requisitos? (matriz de cumplimiento)

| # | Requisito de la propuesta | Estado | Detalle / dónde vive ya |
|---|---|---|---|
| 1 | **P1–P5 (clasificación por impacto)** | ❌ No existe | Hoy: `prioridad` = `critica/urgente/alta/media/baja` (escala de **urgencia**, no de impacto), `ambito` (personal/profesional), `matriz` Eisenhower 2D (`/matriz`), `capa`, `es_wig`, `proyecto_id`. No hay escala P1–P5 ni de "impacto". |
| 2 | **Tiempo estimado (15/30/60/90)** | ⚠️ Existe pero inerte | `tareas.esfuerzo` es **texto libre** (`<input>` sin validación en `src/components/TareaModal.tsx`), nunca se usa para priorizar. `tiempo_estimado_min` solo existe en `tareas_subtareas` (subtareas), no en la tarea madre. |
| 3 | **Estado (pendiente / en curso / esperando / terminado)** | ✅ Sí, y mejor | `estado` = `pendiente/en_progreso/bloqueada/hecha/descartada/archivada` + flag independiente `pendiente_respuesta` (migration 0026) + panel `/tareas/pendientes-respuesta` + `/tareas/completadas`. "Esperando" ya es dimensión semántica separada del estado, no un valor más. |
| 4 | **"Toda tarea empieza con verbo y describe un resultado concreto"** | ⚠️ Parcial | Ya existe `criterio_terminacion` ("Esta tarea está HECHA cuando ___"), pero es un campo opcional y aparte, no una regla de escritura validada. |
| 5 | **Día: 1 objetivo principal + 2 secundarios + 1 mantenimiento** | ⚠️ Muy cerca | `/plan-diario` (IA con estado emocional + semáforo + 4 tipos de bloque: imprescindible/autocuidado/micro/extra, anclado a KRs en foco) y `/focus` (Pomodoro + `motorPriorizacion.ts` que devuelve **una** tarea de ≤45 min con motivo, tiempo y primer paso). Falta la **jerarquía explícita 1+2** y el slot explícito "mantenimiento". |
| 6 | **Revisión semanal 30–45 min** (revisar pendientes, identificar vencimientos y riesgos, elegir 3 prioridades, descartar/delegar/aplazar, elegir objetivo del día siguiente) | ⚠️ Parcial | Domingo en `/semana` (elegir 3 KRs + arrastrar tareas a días), `/pipeline` miércoles (Kanban + motor IA), `/pagos` lunes estricto (tesorería), `/informes` viernes (heatmap + scorecard), `/metas/plan` domingo (proyección de KRs). **Falta**: barrido de vencimientos/riesgos y el paso explícito de **descartar/delegar/aplazar**. |
| 7 | **Máx. 2 proyectos importantes en ejecución simultánea** | ❌ No existe | Hay caps de 3 en WIGs-metas, KRs-semana y WIGs-tareas (RPCs en BD que rechazan el 4º), pero **cap de proyectos = 0**. `/escenarios` trabaja por proyecto sin ningún límite de simultaneidad. |
| 8 | **Anticipar tesorería, no apagar fuegos** | ✅ Muy fuerte | `/pagos`: importes, `fecha_vencimiento`, snowball, programación a 6 lunes, botón "✨ Sugerir pagos" por IA con prompt editable (`prompt_pagos`, migration 0027), parser de PDF (`src/lib/pagos/parser-pdf.ts`), detección de vencido. Es de lo mejor de la app. |
| 9 | **300 tareas fuera de la cabeza** | ✅ Sí | GTD puro: dos inboxes (`/captura` y `/tareas/inbox`), inventario completo en BD, foco curado en Hoy (6 en preview), prohibido mostrar 200 pendientes de golpe. Documentado en `/metodologia` §4 como "repositorio GTD externo". |

**Resumen:** 3 requisitos cumplidos (3, 8, 9), 3 parciales (2, 4, 5, 6 → propuestos), 2 ausentes (1, 7).

---

## 3. ¿Tiene sentido implementarlo? ¿Cómo está enfocado el proyecto?

### 3.1 Lo que NO tiene sentido copiar

**a) P1–P5 como campo nuevo de prioridad.**
La app ya tiene un modelo de clasificación multidimensional: `prioridad` (5 niveles de urgencia), `ambito`, `capa`, `matriz` (Eisenhower 2D calculada desde `fecha_fin` + WIG), `es_wig`, `proyecto_id`, `meta_id`, `deadline`, `fecha_fin`. Añadir P1–P5 como una **quinta** escala de "prioridad" multiplica el ruido en el formulario de tarea y crea dos verdades que se contradicen ("P1 pero `prioridad=media`").
El error conceptual de la propuesta es pensar que **el problema es la etiqueta**. El problema real es **falta de criterio de selección** — y eso ya está resuelto en el proyecto con:
- `motorPriorizacion.ts` → devuelve UNA acción con motivo y primer paso.
- `/matriz` + "✨ Sugerir redistribución" (IA) → reubica por urgencia×importancia.
- `/pipeline` → Kanban por prioridad + motor IA.
- `/plan-diario` → la IA decide el día anclando a KRs en foco + estado emocional + deadlines.

**b) "Una tarea única como límite" y el modelo 1+2.**
Contradice la arquitectura actual y la base teórica propia del proyecto. `/focus` (Pomodoro) + `/calendario` (4 bloques fijos × 7 días) + `/plan-diario` (1–4 bloques activos) están construidos sobre Masicampo & Baumeister (plan concreto → desactiva Zeigarnik) y sobre bloques de foco profundo. El modelo 1+2 es **menos** granular que lo actual.
Lo que sí se puede incorporar de su lógica es la **regla de lectura del resultado**: *"si solo completas el objetivo principal, el día no es un fracaso"* → encaja exactamente con el **semáforo emocional** que ya existe (`/dashboard-emocional`, 4 dimensiones) y con el hecho de que el plan diario ya se adapta al estado (verde/amarillo/rojo → nº de bloques activos). Eso **se documenta**, no se reescribe.

**c) Reescribir los estados.**
Los estados actuales son superiores: `bloqueada` (impedimento interno), `descartada` (decisión explícita,区别 de "hecha"), `archivada` (fuera del inventario activo) y `pendiente_respuesta` como **dimensión semántica independiente** del estado (una tarea puede estar hecha y aun así esperando confirmación). Sustituir esto por 4 estados simplificaría el modelo.

**d) "No complicar con veinte campos" pero proponer 3 campos nuevos.**
Los 3 campos ya existen (2 de ellos); el único realmente nuevo sería la escala P1–P5, que es justo el que no aporta.

### 3.2 Lo que SÍ tiene sentido implementar (4 cosas)

**1) `esfuerzo` como enum (15/30/60/90) + usarlo en la priorización.**
- Migración: `ALTER TABLE tareas ...` con CHECK sobre `esfuerzo` (o nueva columna `minutos_estimados` numérica, más simple de consultar y de migrar).
- Cambiar el `<input>` de texto libre en `src/components/TareaModal.tsx` (líneas ~1299 y ~1632) por un `<select>`.
- Consecuencia real: permite "capacidad realista" (cuántas horas tengo hoy), y alimenta al motor de priorización y al plan diario (elegir bloques que quepan en el día).
- Coste: bajo. Beneficio: alto. Es el requisito con mejor relación valor/coste.

**2) Cap de 2 proyectos activos simultáneos (RPC en BD).**
- Coherente con el patrón ya establecido (`toggle_meta_wig`, `toggle_kr_foco_semanal`, `toggle_tarea_wig` rechazan el 4º).
- Ataca exactamente su diagnóstico: *"no necesitas empezar más cosas, necesitas terminar algunas"*.
- Visible en `/proyectos` (badge "3/2 en curso" en rojo) y bloqueable en `/agente` al crear un proyecto nuevo.

**3) Estructura explícita "1 principal + 2 secundarios + 1 mantenimiento" en `/plan-diario`.**
- Hoy `plan_diario_tareas.tipo` ∈ {imprescindible, autocuidado, micro, extra}. Se puede mapear sin cambiar el esquema: marcar 1 como *principal*, hasta 2 como *secundarias*, 1 como *mantenimiento*.
- Aporta la lectura psychological del día ("si solo cumples el principal, no es un fracaso") sin romper el time-blocking.

**4) Revisión semanal: añadir 2 pasos que faltan.**
- **Barrido de vencimientos y riesgos** (hoy /pagos es solo lunes y solo pagos; no hay vista unificada de "todo lo que vence en 7 días + todo lo bloqueado + todo lo pendiente de respuesta").
- **Descarte / delegación / aplazamiento explícitos** — el modelo ya tiene `descartada`, `archivada` y `bloqueada`, pero no hay una acción de revisión que las proponga en lote (lo que la propuesta llama "descartar lo que no es necesario"). Se podría implementar como botón en `/pipeline` o `/tareas` → "🧹 Revisar backlog: proponer descartar / aplazar / delegar" (IA) con modal de revisión al estilo `SugerirWigs` / `SugerirPagos` / `SugerirMatriz`, que ya existen como patrón en el proyecto.

**Bonus — la regla del verbo + resultado, sin campo nuevo:**
Convertir `criterio_terminacion` en **obligatorio para tareas de 60+ min** (las "grandes"), con validación en el modal de tarea. El campo ya existe; solo cambia su regla de uso. Además, `subtareas` ya es la mécanisme correcta de descomposición de un proyecto en acciones ("no puedes ejecutar un proyecto, puedes ejecutar la siguiente acción").

### 3.3 Lo que ya está resuelto y no hay que tocar

- Pagos / tesorería anticipada (`/pagos` + parser PDF + snowball + IA)
- GTD: captura externa, dos inboxes, inventario completo, foco curado
- Los tres caps de 3 (WIG-metas, KRs-semana, WIG-tareas) con RPC en BD
- El foco del día (Hoy: 6 tareas en preview, no 200)
- Los estados ricos de tarea + `pendiente_respuesta`
- El semáforo emocional y la adaptación del día al estado
- `/escenarios`: análisis de riesgos por proyecto con probabilidad y estrategia

---

## 4. Punto de salud (fuera del alcance técnico, pero no se ignora)

Lo descrito — años de pérdida del disfrute, pérdida de interés y de motivación (anhedonia), saturación constante y, hace unos meses, la idea de "quizá no merecía la pena seguir" — encaja con un cuadro de **depresión con ideación autolítica**, no con sobrecarga de trabajo. La anhedonia (perder interés por cosas que antes te gustaban) es un criterio cardinal, y la saturación es su cousin cognitive.

- **Acción concreta**: pedir valoración con el médico de cabecera y explicitar todo (anhedonia, saturación, ideación autolítica). No esperar a que empeore.
- **Si vuelve, o si aparecen deseos de morir o de hacerse daño**: 024 (línea de atención a la conducta suicida, 24 h, España) o 112 si hay peligro inmediato.
- **Consecuencia de diseño para la app**: el sistema debe ir al ritmo del usuario, no al revés. Por eso la parte aprovechable de su propuesta (1 principal + 2 secundarios, y "completar solo el principal no es un fracaso") encaja con `/plan-diario` y con el semáforo emocional ya existente. Eso se documenta en `/docs` y `/metodologia`.

**Nota de alcance**: este punto no se implementa en el código ni se documenta en `/docs` como feature. Es un asunto de salud, no de producto.

---

## 5. Plan de implementación propuesto (orden)

| # | Cambio | Migración | Archivos tocados | Esfuerzo |
|---|---|---|---|---|
| 1 | `esfuerzo` → enum + `minutos_estimados` | Sí (0034) | `types.ts`, `mutations.ts`, `TareaModal.tsx`, `motorPriorizacion.ts`, `planSimple.ts` | Bajo |
| 2 | Cap de 2 proyectos activos | Sí (RPC) | `supabase/migrations/0034…`, `/proyectos`, `/agente` | Medio |
| 3 | 1 principal + 2 secundarios + 1 mantenimiento en `/plan-diario` | No | `planSimple.ts`, `plan-diario/page.tsx`, `types.ts` (tipo de bloque) | Medio |
| 4 | Revisión semanal: barrido vencimientos/riesgos +(propuesta de) descartar/delegar/aplazar | No (o vista calculada) | `/pipeline` o `/tareas`, nuevo módulo `sugerirLimpiezaIA.ts`, `queries.ts` | Medio-alto |
| 5 | Regla del verbo: `criterio_terminacion` obligatorio ≥60 min | No | `TareaModal.tsx` | Bajo |

**Regla del proyecto (AGENTS.md)**: cualquier cambio en pantalla/hábito/ritual/metodología obliga a actualizar en la misma sesión: (1) `FEATURES` en `src/app/docs/page.tsx`, (2) la sección correspondiente de `/docs`, (3) `/metodologia` si afecta a la arquitectura de metas/tareas, (4) el registro de cambios al final de `/docs` con la fecha.

---

## 6. Decisión recomendada

**Implementar 1, 2, 3 y 5 + el paso 4 en su forma más barata (vista de vencimientos calculada, sin IA).**
**Rechazar P1–P5 como campo** y mantener el modelo multidimensional actual.
**Documentar** (sin tocar la arquitectura) el modelo "1 principal + 2 secundarios + 1 mantenimiento" y la regla "completar solo el principal no es un fracaso".

---

## 7. Preguntas abiertas para decidir

1. ¿Se ejecuta `esfuerzo` como CHECK sobre el texto existente o se migra a columna numérica (`minutos_estimados`)?
2. ¿El cap de 2 proyectos bloquea la creación en `/agente` o solo avisa?
3. ¿La revisión semanal va como paso del ritual de domingo en `/semana`, o como pantalla nueva `/revision`?
4. ¿La propuesta de descartar/delegar/aplazar usa IA (modal de revisión) o reglas deterministas (vence + bloqueada + sin meta)?
