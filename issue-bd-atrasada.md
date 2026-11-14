### Categoría

UX/UI (cat:ux-ui)

### Severidad

critical — bloquea la tarea o pierde datos (severity:critical)

### Módulo o área afectada

/krs (tabla de KRs)

### Descripción

Tras fusionar el PR #50 (WIG de KR, migration 0038) la página `/krs` **no carga nada**: sale el error

```
No se pudieron cargar los KRs.

column resultados_periodo.es_wig does not exist code: 42703
```

La migration 0038 (`resultados_periodo.es_wig` / `wig_orden` + RPC `toggle_kr_wig`) está en `main` pero **no está aplicada en la base de datos de Supabase**, así que el `select` que pide esas columnas revienta y la página entera se queda vacía.

### Pasos para reproducir

1. Abrir `/krs` con la BD sin la migration 0038 aplicada.
2. Leer el error de carga.
3. (También falla el botón 🎯: la RPC `toggle_kr_wig` tampoco existe.)

### Impacto en el usuario

La página de KRs es el inventario completo del sistema y queda **completamente inutilizable**: no se ve ni un KR. Es el peor caso posible de "la app se despliega antes que las migraciones" (el workflow de deploy solo hace build y publish; **no aplica migraciones**).

### Evidencia

```text
No se pudieron cargar los KRs.

column resultados_periodo.es_wig does not exist code: 42703

Reintentar
```

### Tipo de hallazgo

Bug demostrado (tipo:bug)

### Solución propuesta o regla esperada

Dos cosas:

1. **Arreglo de fondo**: aplicar `supabase/migrations/0038_kr_wig.sql` en la BD (es idempotente: `add column if not exists`, índices con `if not exists`, `create or replace function`).
2. **Que la app no se rompa mientras tanto**: cuando la BD va por detrás del código, `/krs` debe **degradar** (leer los KRs sin las columnas del WIG y avisar de lo que falta) en vez de reventar. Es el mismo patrón que ya usa el Modo Recuperación con la migration 0034 (`src/lib/supabase/esquema.ts` → `esEsquemaAusente`).

### Causa raíz

El código pide columnas que la BD todavía no tiene, y `fetchKrsOverview` lanza el error sin más: una columna que falta tumba la página entera.

### Criterios de aceptación

- [ ] `/krs` carga los KRs aunque falte la migration 0038 (degrada, no rompe).
- [ ] La página avisa de que falta la migration (qué falta y qué no funciona hasta aplicarla).
- [ ] El botón 🎯 no aparece como si funcionara cuando la BD va por detrás.
- [ ] Con la migration aplicada, todo funciona como antes (sin cambios de comportamiento).
- [ ] Test que fije el comportamiento de degradación.
- [ ] Documentación actualizada (FEATURES, "Aplicación en la app", registro de cambios de `/docs`) y lección en `docs/lecciones.md`.

### Plan de arreglo (opcional)

<!-- ux-plan:start -->
1. `src/lib/krsLectura.ts` (nuevo, puro y testeable): columnas de la tabla de KRs con y sin las del WIG, el aviso de la migration 0038 y `leerKrsConRespaldo(seleccionar)`, que reintenta sin las columnas del WIG si la BD no las tiene.
2. `src/lib/queries.ts`: `fetchKrsOverview` usa ese lector y devuelve `{ filas, aviso }`.
3. `src/app/krs/page.tsx`: banner con el aviso; el panel de WIG y el botón 🎯 se ocultan/deshabilitan si la migración no está aplicada.
4. `src/lib/mutations.ts`: `marcarKrWig` da un mensaje accionable cuando la RPC no existe.
5. Test en `src/lib/krsLectura.test.mjs` + registro en `scripts/run-tests.mjs`.
6. Docs: FEATURES (/krs), "Aplicación en la app" (pilar 2), registro de cambios de `/docs` y lección en `docs/lecciones.md`.
<!-- ux-plan:end -->
