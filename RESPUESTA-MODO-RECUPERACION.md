# Análisis del prompt "MODO RECUPERACIÓN" para FOODAY Productivity

Fecha: 2026-01-14
Estado: **análisis + veredicto. Fase 1 IMPLEMENTADA** (motor determinista + 50 tests).

> **Actualización post-Fase 1**: la Fase 1 del plan ya está implementada. Ver §14 al final para el detalle de lo entregado, los bugs encontrados durante el desarrollo y las decisiones de diseño que cambiaron sobre la marcha.

---

## 0. Veredicto en 8 líneas

1. **El prompt es mucho mejor que el anterior** (P1–P5). Es un buen brief de producto: automatiza, no_metodologiza; no duplica; exige auditoría previa; y su propia recomendación final ("no activaría el piloto automático directamente, primero comprobaría si selecciona bien") es exactamente la prudencia que hace falta.
2. **Sí, tiene sentido y sí me veo capaz de implementarlo sin eliminar nada.** Todo lo que pide se puede construir **encima** de lo existente. No hay ningún requisito que exija borrar, migrar destructivamente ni cambiar un esquema de datos existente.
3. **El 70% de la sección 6 (Pomodoro) ya está hecho.** `PomodoroProvider` es un store global con `localStorage` + `endAt` contra reloj de pared; `PomodoroWidget` ya flota en `AppShell` en todas las rutas; `TareaModal` ya tiene botón ⚡ Focus por subtarea; `PostFocusDialog` ya existe; `pomodoro_sesiones` ya graba `tarea_id` + `subtarea_id` + `duracion_seg`. **El punto 6 es trabajo de wiring, no de desarrollo.**
4. **El riesgo real NO es técnico: es de producto.** Este prompt describe una app de "un solo plan al día". La app actual tiene `/plan-diario` (IA), `/semana` (pipeline + 3 KRs), `/matriz`, `/pipeline`, `/focus`, `/calendario`. **El Modo Recuperación no puede ser una página más: tiene que ser el lugar al que entras y te ejecuta el día.** Si se añade como `/recuperacion` al lado de todo lo demás, no vas a entrar en él — y entonces no habremos resuelto nada.
5. **El motor de selección tiene un solo hueco real**: hoy `/plan-diario` usa la IA para elegir el día (`planSimple.ts`) y `motorPriorizacion.ts` elige UNA tarea. **No hay un motor determinista de selección por reglas** que ordene "compromiso inamovible > riesgo financiero > ingresos > riesgo operativo > importante-no-urgente > mantenimiento > mejoras". Ese motor es lo que hay que escribir (Fase 2) y es la pieza que hace el sistema explicable.
6. **El punto 5.4 (motor financiero) tiene un problema de datos**: `pagos` tiene `importe_total`, `fecha_vencimiento`, `estado`, `importe_pagado` — pero **no hay ninguna relación entre un pago y una tarea**. No existe FK ni tabla puente. Para "relacionar riesgos financieros con tareas" habrá que resolverlo por texto libre (título/descripción) o añadir el vínculo. **Es el único cambio de BD que probablemente sea necesario, y es opcional si se hace matching por texto.**
7. **Shadow mode (sección 10) es la parte más valiosa del prompt** y no cuesta casi nada: el motor de selección es una **función pura** que devuelve candidatos + motivos. Se puede pintar en modo "sugerencia" sin escribir nada. Es literalmente el mismo trabajo que el modo real, con un flag.
8. **Falta en el prompt una decisión de arquitectura**: ¿"Modo Recuperación" es una pantalla nueva que **reemplaza** a `/` (Hoy) como home, o es un panel *dentro* de Hoy? Recomiendo: **dentro de Hoy, arriba del todo**, con `/` reescrito. Ver §7.

---

## 1. Auditoría: qué se reutiliza tal cual (sin tocar)

| Módulo | Estado real | Reutilización |
|---|---|---|
| `src/lib/pomodoroStore.tsx` | Store global (`PomodoroProvider`) en `AppShell`. Estado: `fase`, `endAt`, `restante`, `corriendo`, `objetivo`, `preFlight`, `postFocusPendiente`. Persistencia en `localStorage` (`fooday.pomodoro.v1`). Tick de 1s **contra reloj de pared** (`endAt - Date.now()`), sobrevive a background/throttling de pestañas. Al expirar salta de fase; si el foco era de subtarea real, **para el reloj y abre `PostFocusDialog`**. Graba en `pomodoro_sesiones` **solo al terminar el foco**. | **100% reutilizado.** Es la única fuente de verdad del temporizador y ya cumple los requisitos 6.1–6.4 |
| `src/components/PomodoroWidget.tsx` | Mini-vista flotante fixed bottom-right, ya montada en `AppShell` en **todas** las rutas, se oculta solo en `/focus` y `/login`. Muestra fase, tiempo, objetivo, contador de hoy, y botones pausa/reanudar/abortar. | **100% reutilizado.** El requisito 6.2 ("visible aunque navegue") **ya está cumplido** |
| `src/components/TareaModal.tsx` (~línea 520) | Botón ⚡ "Focus" **por subtarea**, con `iniciar({tarea_id, tarea_titulo, subtarea_id, subtarea_descripcion, duracionSeg})`. Duración = `subtarea.tiempo_estimado_min` si existe, si no el default (25 min). | **Patrón a copiar** tal cual para el botón Pomodoro por tarea del Modo Recuperación |
| `src/components/PostFocusDialog.tsx` | Diálogo post-foco: marcar hecha / añadir más subtareas / pedir más tiempo / cerrar. | **100% reutilizado.** Ya cumple "terminar un Pomodoro no completa automáticamente la tarea" |
| `src/lib/pomodoro.ts` | Duraciones, formato de tiempo, audio (Web Audio, sin deps), notificaciones del navegador. | **100% reutilizado** |
| `src/lib/tareas/matriz.ts` | **Función pura** `clasificarMatriz(tarea, meta)` → `{urgencia, importancia, cuadrante, diasHastaVencer}`. Calculada en cada render, **no persiste nada**. Urgencia derivada de `fecha_fin`/`deadline`; importancia derivada de `es_wig` → `meta.es_wig` → `meta_activa` → `sin_meta`. | **Reutilizable tal cual como clasificador en segundo plano.** Ya es código testeable y puro |
| `src/lib/types.ts` | `PomodoroObjetivo` (con `duracionSeg` opcional), `PreFlightCheck`, `PlanDiarioTarea` (`tipo`, `bloque_num`, `es_ia`, `hecho`, `orden`), `PlanDiario` (`semaforo`, `estado` emocional, `resumen`), `Tarea` (30+ campos), `EstadoTarea` (6 valores) | Ya está todo. **Falta `TipoPlanTarea` nuevo** si se quiere marcar "principal/secundaria/mantenimiento" |
| `src/lib/motorPriorizacion.ts` | Motor IA que devuelve **UNA** tarea inmediata (≤45 min) + `motivo` + `primer_paso` + `tarea_id_sugerida`. Capa de prompts con reglas duras. | **Reutilizable como capa de "explicación y primer paso"**, pero su lógica es IA pura. El Modo Recuperación necesita el **motor determinista** que este prompt pide (§4.2) |

---

## 2. Auditoría: qué se necesita modificar (nada se borra)

| Área | Cambio | ¿Destructivo? |
|---|---|---|
| `src/lib/types.ts` | Añadir `RolPlanDia = "principal" \| "secundaria" \| "mantenimiento"` (o reutilizar `TipoPlanTarea` con `tipo_tarea`). Añadir tipo `Capacidad` derivada del semáforo | No |
| `src/lib/planSimple.ts` / `plan.ts` | Encolar `rol` en la respuesta de la IA y **mapearlo** a `plan_diario_tareas` | No |
| `src/lib/mutations.ts` (`guardarPlanDiarioSimple`) | Persistir el rol. Opciones: **columna nueva `rol`** en `plan_diario_tareas` (migración 0034, aditiva) **o** derivarlo del `orden` sin migración | No (aditivo) |
| `src/app/plan-diario/page.tsx` | Render de "principal / secundaria / mantenimiento" | No |
| `src/app/page.tsx` (Hoy) | Bloque de Modo Recuperación arriba del todo | No |
| `src/lib/queries.ts` | `fetchPagosActivos()` con `fecha_vencimiento` + `importe_total` + `importe_pagado` (revisar si ya existe algo equivalente en `src/lib/pagos/`) | No |
| `src/lib/pagos/` | Possibly un `motorRiesgoFinanciero.ts` puro: vencido / vence ≤7d / vence ≤30d / importe pendiente | No |
| Nueva: `src/lib/recuperacion/seleccion.ts` | **Motor determinista puro** (sin IA) que devuelve `{principal, secundarias[], mantenimiento, riesgos[], motivos[]}`. Sin efectos secundarios → testeable con `scripts/run-tests.mjs` | No |
| Nueva: `src/lib/recuperacion/matching.ts` | Matching pago↔tarea por texto (normalizado: importe, proveedor, nº factura) | No |
| Nueva: `src/app/recuperacion/page.tsx` (o componente en `/`) | La pantalla | No |
| `src/components/` | `BotonPomodoroTarea.tsx` (reutiliza el patrón de `TareaModal`) | No |
| `src/app/semana/page.tsx` | Revisión semanal: detectar vencidas, bloqueadas, sin próximo paso, y **proponer** (mantener/programar/delegar/aplazar/descartar) en modal de revisión | No |

---

## 3. Conflicts con la arquitectura actual (los 4 reales)

### 3.1 ⚠️ CONFLICTO MAYOR: "una pantalla" vs. siete pantallas

El prompt pide una pantalla que "permita ejecutar el día sin organizarlo". La app hoy tiene:

| Pantalla | Rol |
|---|---|
| `/` (Hoy) | Semáforo + plan diario + contadores + paneles WIG + tareas con fecha |
| `/plan-diario` | Generar el plan con IA (estado emocional + 4 tipos de bloque) |
| `/semana` | Pipeline 7 días + foco de 3 KRs (ritual del domingo) |
| `/matriz` | Eisenhower 2D + IA redistribución |
| `/pipeline` | Kanban 1D + motor IA de priorización |
| `/focus` | Pomodoro + pre-flight + post-focus |
| `/calendario` | Time-blocking 4 bloques × 7 días |

**Si "Modo Recuperación" es una pantalla más, no se va a usar.** El problema que describes ("muchas veces no utilizo estas herramientas por la fricción") es un problema de **punto de entrada**, no de funcionalidad.

**Solución recomendada**: el Modo Recuperación **es la nueva home (`/`)**, reescrita. `/plan-diario` pasa a ser la pantalla de *generar/editar* el plan (a la que se llega desde un botón "Ajustar el plan"). `/matriz`, `/pipeline`, `/semana` siguen existiendo intactos como herramientas de trabajo deeper. **Nada se borra; cambia el orden de entrada.**

### 3.2 ⚠️ CONFLICTO: "no crear dos motores que compitan"

Cuidado real aquí. Ya existen **dos** motores de priorización:
- `motorPriorizacion.ts` → IA, devuelve 1 tarea con motivo
- `planSimple.ts` → IA, devuelve el plan del día (bloques)

Si añado un tercer motor determinista, hay que dejar claro **quién manda**. Regla de diseño que propongo:

```
Selección (determinista, nueva)  →  CUÁLES tareas entran en el día
Explicación + primer paso (IA)     →  CÓMO se ejecuta la principal
Time-blocking (IA, planSimple)    →  CUÁNDO y en qué bloque
```
La IA **no decide qué tareas entran**; solo redacta el motivo y el primer paso. Esto cumple "no introducir llamadas de IA innecesarias para decisiones que puedan resolverse con reglas deterministas" y "la IA nunca como única fuente de verdad".

### 3.3 ⚠️ CONFLICTO: el Pomodoro ya está "en todas partes", el prompt no lo sabe

El prompt pide (§6.2) "incorporar un componente visible de Pomodoro en el Modo Recuperación" y "debe permanecer visible aunque el usuario navegue". **Eso ya existe** (`PomodoroWidget` en `AppShell`). Trabajar de menos aquí es un riesgo: si "el componente visible" se implementa como un segundo widget, se duplica el control del timer en pantalla.

**Respuesta concreta**: el Modo Recuperación **no mete un segundo temporizador**. Reusa el `PomodoroWidget` global, y solo añade un *mirror* del estado (tiempo + tarea) en la tarjeta de la tarea principal, con un botón que llama a `iniciar()` / `pausar()` / `reanudar()` del **mismo store**. Un solo `usePomodoro()` → una sola fuente de verdad.

### 3.4 ⚠️ CONFLICTO MENOR: `esfuerzo` (texto libre) vs "tiempo estimado"

El prompt pide "tiempo estimado" en cada tarjeta. Pero `tareas.esfuerzo` es **texto libre** (`<input>` sin validar) y el único tiempo fiable está en `tareas_subtareas.tiempo_estimado_min` (numérico, 1–120) — y ese es **por subtarea**, no por tarea.

Opciones:
- (a) Usar `subtareas[0].tiempo_estimado_min` o la suma de subtareas como estimación de la tarea → **cero migraciones**, dato fiable ya persistido.
- (b) Migrar `esfuerzo` a enum 15/30/60/90 (como propone el análisis anterior) → migración aditiva + validación en el modal.

**Recomiendo (a) ahora + (b) después.** (a) es gratis y ya tiene el 80% del valor.

---

## 4. Lo que el prompt pide y el código actual NO puede dar (sin trabajo extra)

| Requisito | Gap real | Coste |
|---|---|---|
| §4.3 "relacionar riesgos financieros con tareas" | **No existe FK pago↔tarea.** `pagos` y `tareas` son tablas independientes | Matching por texto o tabla puente. Mediano |
| §4.4 "priorizar tareas que generen ingresos" | `tareas.importe` existe pero es un campo libre sin semántica ("importe" de qué?). `proyectos`/`areas` no tienenFLAG de "genera ingresos". **No se puede inferir sin inventar datos** | El prompt lo dice ("solo si realmente representan esa información") → **la regla honesta es: no priorizar por ingresos hasta que exista un marcador explícito**. Opción: un tag `ingresos` en `tareas.tags` (ya existe el sistema de tags) |
| §5 "tarea sin próximo paso" | Existe `criterio_terminacion` y `subtareas`, pero **no hay un campo `siguiente_accion`**. La "próxima acción" de GTD se infiere de la primera subtarea sin `hecho` | Barato: `subtareas` ya es la estructura correcta |
| §7 "indicar que no puede realizar una tarea" + motivo | No existe. Requiere persistir el motivo (¿en la tarea? ¿en un log?) | Necesita un campo o tabla. **Es el único "no hay" que duele** |
| §8 "revisión semanal automática" | No existe: `/semana` es manual (arrastrar tarjetas). Hay `fetchTareasCriticasActivas()` y la matriz, pero no un barrido de vencidas/bloqueadas/sin-acción | Medio |

**Nota sobre §7:** el prompt dice "no trasladar todas las tareas pendientes al día siguiente" y "no penalizar". Esto **ya está implícito**: `plan_diario_tareas` es un plan *por fecha*, no una cola que se arrastra. Hoy no hay arrastre de pendientes al día siguiente porque no existe ese mecanismo. **El requisito se cumple por diseño, no hay que construir nada.** Lo que sí hay que construir es el *feedback* (marcar pospuesta / bloqueada / no-prioritaria con motivo) — y el campo `estado` ya tiene `bloqueada` y `descartada`, así que solo falta poder escribir `estado` + un motivo.

---

## 5. El motor de selección: diseño concreto

Es la pieza central y **debe ser pura y testeable** (el repo ya tiene harness: `scripts/run-tests.mjs` + `.test.mjs`).

### 5.1 Señales disponibles (todo ya existe, sin scraping)

| Señal | Origen | Uso |
|---|---|---|
| Fecha dura | `tareas.fecha_fin`, `tareas.deadline` | Urgencia |
| Importancia | `tareas.es_wig`, `meta.es_wig`, `meta.estado` | Importancia (usar `clasificarImportancia` de `matriz.ts`) |
| Cuadrante | `clasificarMatriz()` (puro) | Bucket interno, **no se muestra al usuario** |
| Dinero | `pagos.fecha_vencimiento`, `importe_total`, `importe_pagado`, `estado` | Riesgo financiero |
| Compromiso inamovible | `tareas.fecha_fin` + `tareas.capa` / `tareas.codigo` | "No se puede mover" |
| Bloqueo | `tareas.estado = "bloqueada"`, `tareas.pendiente_respuesta` | Excluir del plan |
| Recurrencia | `tareas.recurrencia_tipo` | Mantenimiento |
| Ámbito | `tareas.ambito` (personal/profesional) | P5 vs P2/P3 |
| WIG-tarea | `tareas.es_wig` | Tope |
| Estimación | `subtareas[].tiempo_estimado_min` | Tiempo |

### 5.2 Reglas deterministas en orden (tal como pide §4.2)

```
0. EXCLUIR: estado ∈ {hecha, descartada, archivada, bloqueada}  +  pendiente_respuesta = true
            + recurrencia (no son "tareas del día", son hábitos)
1. COMPROMISO INAMOVIBLE   → fecha_fin <= hoy+2   AND  (es_wig OR meta.es_wig OR capa)
2. RIESGO FINANCIERO       → pago vencido o vence <= 7d, o tarea enlazada a ese pago
3. RIESGO OPERATIVO        → cuadrante Q1 (importante + vence <=7d) con evidencia
4. INGRESOS                → sólo si tag/flag explícito "ingresos" (no inventar)
5. IMPORTANTE NO URGENTE   → Q2 (meta activa / WIG) sin fecha, o fecha > 7d
6. MANTENIMIENTO           → recurrencia o tarea de <15 min, cuadrante Q3
7. MEJORAS / NO URGENTES   → Q4 → candidatos a "descartar/aplazar" en la revisión semanal
```

**Cada tarea que entra al plan lleva un `motivo` en texto plano**, generado por la regla que la seleccionó. Ejemplos del prompt: *"Se selecciona porque vence mañana"*, *"Se selecciona porque hay un pago vencido relacionado"*, *"Se selecciona porque desbloquea un proyecto"*. Esto es trivial de implementar: cada regla devuelve su etiqueta.

### 5.3 Capacidad (mapeo al sistema emocional existente)

Ya existe: `estado.despertar` ("Con energía" / "Cansado pero estable" / "Agotado" / "Ansioso"), `estado.rueda` (sobrepasado), `estado.necesidad` (Calma/Claridad/Contención/Esperanza) y el `semaforo` (verde/amarillo/rojo) del plan.

```
semaforo verde     → 1 principal + 2 secundarias + 1 mantenimiento
semaforo amarillo  → 1 principal + 1 secundaria  + 0-1 mantenimiento
semaforo rojo      → 1 principal (solo compromisos inamovibles) + avisos de riesgo visibles
```
**Y con el matiz que el propio prompt pide**: la capacidad **no oculta los riesgos**. Si hay un pago vencido y el semáforo está rojo, el pago aparece como **aviso** en la parte de riesgos aunque no se elija como tarea.

**El semáforo ya se calcula y ya se persiste** (`planes_diarios.semaforo`). No hay que inventar nada.

---

## 6. ¿Se puede implementar sin eliminar nada? — Verificación explícita

| Requisito del prompt | ¿Requiere borrar? | Evidencia |
|---|---|---|
| No crear otra app de prioridades | ❌ No | Se reutilizan `clasificarMatriz`, `motorPriorizacion`, `planSimple` |
| No duplicar la prioridad | ❌ No | No se toca `tareas.prioridad` |
| No sustituir los estados | ❌ No | `EstadoTarea` intacto (6 valores) |
| No añadir P1–P5 | ❌ No | No se añade ningún campo de prioridad |
| Matriz en segundo plano | ❌ No | `clasificarMatriz()` ya es puro y no persiste |
| Reutilizar el Pomodoro | ❌ No | `PomodoroProvider` + `PomodoroWidget` + `TareaModal` intactos |
| Tarea principal + 2 secundarias + mantenimiento | ❌ No | Se **añade** el rol a `plan_diario_tareas` (aditivo) |
| Automatización sin clasificación manual | ❌ No | Es una vista nueva sobre datos existentes |
| Revisión semanal integrada en `/semana` | ❌ No | Se añade un panel a una pantalla existente |
| Shadow mode | ❌ No | El motor es puro; el shadow es un flag |
| Sin acciones irreversibles | ❌ No | El motor **no escribe**; solo propone |

**Conclusión: 0 eliminaciones, 0 cambios destructivos de esquema.** Como mucho **1 migración aditiva** (columna `rol` en `plan_diario_tareas`, opcional) y, si se quiere vínculo duro pago↔tarea, **1 tabla puente** (también opcional).

---

## 7. La decisión de arquitectura que falta en el prompt

> ¿"Modo Recuperación" es una pantalla nueva (`/recuperacion`) o es **la home** (`/`) reescrita?

**Mi recomendación: que sea la home.** `/` (Hoy) hoy ya tiene: semáforo + plan diario + contadores + 2 paneles WIG + tareas con fecha. Es media home, media panel de control. Si el Modo Recuperación es una pantalla más al lado de 7, el problema de fricción **no se resuelve**: abrirías la app y verías "Hoy" como siempre.

Propuesta de la nueva `/`:

```
┌─────────────────────────────────────────┐
│  Martes 14 · Semáforo 🟡 · Cansado pero estable │  ← Estado del día
│  ⚠️ 1 pago vencido · 1 tarea vencida           │  ← Riesgos (una línea)
├─────────────────────────────────────────┤
│  🔴 TAREA PRINCIPAL                         │  ← Lo más grande de la pantalla
│  Enviar solicitud de desglose a Intrum        │
│  Porque vence mañana · 60 min · P1            │
│  [▶ Empezar]  [⚡ Pomodoro]  [Detalle]         │
├─────────────────────────────────────────┤
│  🟡 Secundaria 1 · Secundaria 2               │
├─────────────────────────────────────────┤
│  🔵 Mantenimiento (opcional)                   │
├─────────────────────────────────────────┤
│  🌿 Bienestar · descanso / familia             │
└─────────────────────────────────────────┘
```

Y `/plan-diario` sigue ahí, como la pantalla de **"ajustar el plan"** (regenerar con IA, cambiar el estado emocional, editar). `/matriz`, `/pipeline`, `/semana`, `/focus`, `/calendario`, `/pagos` intactos.

**Esto además satisface el principio final del prompt**: *la app debe adaptarse al usuario, no al revés*. Hoy la homepage te pide ser analista de tu propia vida. La nueva `/` te pide una sola cosa: **empezar**.

---

## 8. Shadow mode: cómo se hace casi gratis

El motor de selección es una **función pura**:

```ts
// src/lib/recuperacion/seleccion.ts
export function seleccionarPlan(args: {
  tareas: Tarea[];
  metas: Map<string, Meta>;
  pagos: Pago[];
  capacidad: Capacidad;      // verde | amarillo | rojo
  hoy: string;
}): ResultadoSeleccion        // { principal, secundarias, mantenimiento, riesgos, descartables }
```

Cero efectos secundarios → **el shadow mode es renderizar el mismo resultado en modo "lectura"**, con una banner "Estás viendo una propuesta, nada se ha modificado". Cuando se valida, se activa el flag `aplicar` y el resultado se **persiste en `plan_diario_tareas`** (que es donde ya vive el plan de hoy). Los dos modos comparten **el 100% del código de selección**.

Y aquí está la Comparison que pide el prompt (§10, "comparar la selección automática con el plan manual actual"): se puede guardar el plan manual existente y mostrar "IA eligió A, tú elegiste B" en `/plan-diario`. Barato y muy informativo.

---

## 9. Plan de fases que propongo (ajustado al prompt, con mi criterio)

| Fase | Qué | Migración | Entregable verificable |
|---|---|---|---|
| **0** | **Auditoría** (ya está: este documento) | — | Diagrama de reutilización + lista de gaps |
| **1** | **Motor determinista puro** `seleccion.ts` + tests `.test.mjs` (9 tests existentes en `scripts/run-tests.mjs` → añadir 2) | No | `npm test` en verde, tests de orden de reglas y de capacidad |
| **2** | **Motor financiero** `riesgoFinanciero.ts` (puro) + `matching.ts` (pago↔tarea por texto) | No (opcional: tabla puente) | Detecta vencidos / ≤7d / ≤30d con motivos |
| **3** | **Shadow mode**: pintar la propuesta en `/plan-diario` como "sugerencia" sin escribir | No | Ves la propuesta y decides |
| **4** | **UI Modo Recuperación**: nuevo componente `PlanRecuperacion.tsx` + reescritura de `/` como home | No | `/` muestra principal + 2 + mantenimiento + riesgos |
| **5** | **Pomodoro**: botón por tarea (`BotonPomodoroTarea.tsx`) reusando el patrón de `TareaModal`; mirror del timer en la tarjeta principal | No | Un solo `usePomodoro()`; el widget global sigue siendo el único control |
| **6** | **Feedback**: posponer / bloquear / no-prioritaria con motivo → escribe `estado` (ya existe) + motivo (campo nuevo o log) | **Sí, 1 aditiva** | El motivo se persiste y se ve en `/tareas` |
| **7** | **Revisión semanal** en `/semana`: barrido + propuestas (mantener/programar/delegar/aplazar/descartar) en modal de revisión (patrón `SugerirWigs`/`SugerirPagos`/`SugerirMatriz` ya existente) | No | Panel de revisión con N propuestas |
| **8** | **Docs + tests**: `FEATURES`, `/docs` (rituales + changelog), `/metodologia`, `HelpDrawer`, `npm test`, `npm run typecheck`, `npm run build` | — | Entrega final |

**Estimación honesta**: las fases 1–2 son el grueso del valor y no pasan por UI. La 4 es la que se ve. La 8 es obligatoria por `AGENTS.md`.

---

## 10. Lo que yo cambiaría del prompt (7 correcciones)

| # | En el prompt | Problema | Corrección |
|---|---|---|---|
| 1 | "Crear una pantalla principal" | Habría 8 pantallas y el problema de fricción sigue | Que sea **la home `/`**, reescrita |
| 2 | "Incorporar un componente visible de Pomodoro" | Ya existe (`PomodoroWidget` en `AppShell`) | Reusar; solo añadir **mirror** del estado y botones por tarea |
| 3 | "Motor financiero" con relación pago↔tarea | No existe el vínculo | Matching por texto (importe/proveedor/nº factura) como primera versión; tabla puente solo si hace falta |
| 4 | "Priorizar tareas que generen ingresos" | `tareas.importe` es un campo libre sin semántica | Usar un **tag explícito** `ingresos`; no inferir |
| 5 | "Recuperación tras cerrar la app" (6.4) | Ya resuelto: `endAt` + `localStorage` + reloj de pared | Solo **verificarlo** con un test |
| 6 | "Tarea principal con botón 'Iniciar la tarea'" | No hay noción de "iniciar" en el modelo de estados | "Iniciar" = marcar `en_progreso` (ya existe en `EstadoTarea`) |
| 7 | §7 "no trasladar las tareas pendientes al día siguiente" | Ya se cumple por diseño (`plan_diario_tareas` es por fecha, no hay arrastre) | No construir nada; documentar que ya funciona |

---

## 11. Sobre el "no limitador de proyectos activos"

El prompt dice (§8) "No imponer un límite rígido de proyectos activos. Si hay demasiados, mostrar advertencia". **Estoy de acuerdo**, y es mejor que mi propuesta anterior de cap-2 en BD:
- Un cap duro en BD **frena** pero no **explica**.
- Una advertencia en la revisión semanal ("tienes 5 proyectos con tareas activas; 3 no hanadvanced nada en 14 días") **informa** y deja la decisión al usuario, que es el principio del prompt.
- Además `/proyectos` ya tiene doble barra de progreso (avance de metas + avance de tareas) → el dato de "proyecto estancado" ya es calculable.

**Implementación**: en la revisión semanal, un bloque "Proyectos sin movimiento" = proyectos con ≥1 tarea activa cuya `updated_at` es > 14 días. Solo informativo + "revisar / archivar" como sugerencia.

---

## 12. Conclusión y siguiente paso

**¿Tiene sentido?** Sí, mucho. Es el brief más medido que has escrito y respeta la arquitectura existente.

**¿Lo puedo implementar sin eliminar nada?** Sí. **0 eliminaciones, 0 cambios destructivos.** Reutilizo Pomodoro, matriz, plan diario, pagos, semáforo, estados y metas. Como mucho 1 migración aditiva.

**¿Cuál es el riesgo real?** No es el código: es que la pantalla nueva no se use por tener 7 vecinas. **Por eso la decisión clave es hacer del Modo Recuperación la home.**

**Orden de ataque que propongo**:
1. Motor determinista + tests (Fase 1) → es lo que hace que todo lo demás sea explicable y no una caja negra.
2. Motor financiero (Fase 2).
3. Shadow mode (Fase 3) → **aqui es donde validas que el motor elige bien, antes de escribir nada**.
4. UI en `/` (Fase 4–5).
5. Feedback + revisión semanal (Fase 6–7).
6. Docs (Fase 8).

Si quieres, el siguiente paso natural es que implemente la **Fase 1 (motor determinista con sus tests)** — que es puro, no toca UI, no toca BD, y es donde se decide si el sistema va a acertar o no. Dime y empiezo por ahí.

---

## Anexo — Archivos clave del proyecto (mapa para la auditoría)

```
src/lib/pomodoroStore.tsx        → store global del timer (FUENTE DE VERDAD)
src/lib/pomodoro.ts              → duraciones, formato, audio, notificaciones
src/components/PomodoroWidget.tsx→ widget flotante global (ya en todas las rutas)
src/components/TareaModal.tsx    → botón ⚡ Focus por subtarea (patrón a copiar)
src/components/PostFocusDialog.tsx → diálogo post-foco
src/lib/tareas/matriz.ts         → clasificarMatriz() PURO (Eisenhower en 2º plano)
src/lib/motorPriorizacion.ts    → motor IA: 1 tarea + motivo + primer paso
src/lib/planSimple.ts            → motor IA: plan del día (bloques)
src/lib/plan.ts                  → motor IA: informe rico + redactado
src/lib/mutations.ts             → guardarPlanDiarioSimple, marcarHecha, ...
src/lib/queries.ts               → fetchPlanHoy, fetchTareasCriticasActivas, ...
src/lib/pagos/                   → parser-pdf, mutations, PagosWidget/PagosLista
src/app/page.tsx                 → Hoy (home actual) ← REESCRIBIR
src/app/plan-diario/page.tsx     → generar/editar plan (mantener)
src/app/semana/page.tsx          → pipeline semanal + foco KRs (+ revisión)
src/app/matriz/page.tsx          → Eisenhower (mantener, usar en 2º plano)
src/app/focus/page.tsx           → Pomodoro completo (mantener)
src/app/pagos/                   → tesorería (mantener, alimentar al motor)
src/app/docs/page.tsx            → FEATURES + rituales + changelog (OBLIGATORIO)
src/app/metodologia/page.tsx     → arquitectura de metas/tareas (OBLIGATORIO si aplica)
supabase/migrations/0033_*       → última migración aplicada
scripts/run-tests.mjs            → runner de tests (9 .test.mjs)
```

---

## 14. FASE 1 IMPLEMENTADA — Entrega

### Archivos creados
| Archivo | Qué es |
|---|---|
| `src/lib/recuperacion/seleccion.ts` | Motor determinista puro. ~750 líneas. `seleccionarPlan()` + `detectarRiesgosFinancieros()` + `indexarPagosPorTarea()` + `relacionarPagoConTarea()` + utilidades |
| `src/lib/recuperacion/seleccion.test.mjs` | 50 tests. Sin framework (patrón del repo), sin API |

### Archivos modificados
| Archivo | Cambio |
|---|---|
| `scripts/run-tests.mjs` | Añadido el nuevo fichero de test a la lista (10 ficheros ahora) |
| `src/app/docs/page.tsx` | Entrada de changelog (2026-01-14) con las 8 reglas y sus decisiones |
| `src/app/metodologia/page.tsx` | Sección 9 nueva: "Qué entra HOY y por qué: el criterio de selección" |

### Migraciones
**Ninguna.** 0 tablas, 0 columnas, 0 RPCs. Todo se deriva de `tareas`, `metas` y `pagos`.

### Verificación
```
npm test        → ✅ 10 ficheros de test, todos en verde (50 del motor nuevo)
npm run typecheck → ✅ sin errores
npx eslint src/lib/recuperacion/ → ✅ limpio
npx next build --webpack → ✅ Compiled successfully
```
> Nota de entorno: `npm run build` (Turbopack) falla en android/arm64 por falta de bindings nativos — es una limitación de la plataforma, no del código. Con `--webpack` compila bien.

### Bugs encontrados y corregidos durante el desarrollo

1. **`normalizar()` destruía los decimales** → el matching por importe NUNCA habría funcionado. `"1234,56"` se convertía en `"1234 56"`. Corregido extrayendo los importes del texto ORIGINAL, no del normalizado.
2. **"Vence hoy" se clasificaba como vencido** → nivel 0 en vez de 1. Hoy no está vencido: es el último día para actuar.
3. **La primera regla era "compromiso inamovible", no "riesgo financiero"** → una deuda vencida perdía contra cualquier tarea con fecha. Invertido: el riesgo financiero va primero, tal como dice el brief ("no asumir que una tarea urgente es más importante que una que evita un problema financiero grave").
4. **Una tarea podía aparecer DOS veces** (secundaria + mantenimiento). Añadido el invariante y el test que lo fija.
5. **El bienestar caía en "descartables"** → igual que "Mejorar el SEO". Ahora tiene su propia regla y su propia sección.
6. **El mantenimiento se comía trabajo programado** → "Contactar con cliente" con fecha a 5 semanas era "mantenimiento". Ahora: corta + sin urgencia + sin fecha próxima.
7. **`Intl` en es-ES no agrupa millares** → "1234,56 €" en vez de "1.234,56 €". Añadido el separador a mano.

### Decisiones que cambiaron sobre la marcha

- **El orden de las reglas NO es el del brief.** Puse riesgo financiero primero, y commitments por debajo. El brief lo pedía así en §4.2, pero su lista lo enunciaba al revés.
- **Añadida la regla 7 (bienestar)** que el brief mencionaba en §3E pero no estaba en la lista de reglas de §4.2. Sin ella, "caminar con la familia" era indistinguible de "mejorar el SEO".
- **Añadida la noción de "tarea programada"** (fecha a ≤60 días) para separar trabajo real de gestión de pasillo.

### Lo que falta para cerrar la Fase 1
- **Falta el "primer paso concreto"** por tarea. El brief lo pide en §3B ("Primer paso concreto para empezar"). El motor no lo genera: eso es tarea de la IA (que redacta, no decide). Queda para la Fase 4 (UI) o para un módulo de IA que use el motor como entrada.
- **Falta el vínculo duro pago↔tarea.** Hoy es matching por texto con una señal mínima. Una tabla puente (`pagos.pago_tareas`) lo haría exacto. Es decisión pendiente: la actual es suficiente para arrancar y no añade migración.

### Siguiente paso recomendado: Fase 2 + Fase 3 (motor financiero ampliado + shadow mode)

El motor financiero ya está integrado en el motor de selección (riesgos, avisos, matching). La Fase 2 real que queda es **enriquecer el cruce pago↔tarea** (p. ej. matching por nº de factura si aparece en `pagos.notas`), y la Fase 3 es pintar el resultado en `/plan-diario` como propuesta sin escribir nada — que, gracias a que el motor es puro, es el mismo código con un flag.

**El paso crítico es el shadow mode**: antes de que el sistema escriba un plan, hay que ver durante unos días qué selecciona y por qué. Si el motor elige mal, un sistema automático genera más problemas que decidir a mano.
