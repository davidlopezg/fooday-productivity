# Diagnóstico de problemas — fooday·productivity

> Auditoría completa del código (marzo 2025).  
> Cada fase agrupa problemas por urgencia: desde crashes hasta mejoras arquitectónicas.

---

## ✅ Ya corregido (23 issues)

| # | Problema | Archivo | Fix |
|---|----------|---------|-----|
| 0.X | 9 hábitos nunca se persistían (claves sin prefijo `habito_` en el spread del submit) | `components/EstatusForm.tsx:105` | Prefijar `habito_${k}` al construir el payload en `onSubmit` |
| 0.1 | `useData` sin `.catch()` | `useData.ts` | Añadido `.catch()` + campo `error` |
| 0.2 | `guardar()` sin try/catch (CrearModal) | `TasksTable.tsx` | try/catch + error en footer |
| 0.3 | `guardar()` sin try/catch (EditarModal) | `TasksTable.tsx` | Idem |
| 0.4 | `run()` sin try/catch (tabla) | `TasksTable.tsx` | Idem |
| 0.5 | `fetchTareas` sin error propagation | `queries.ts` | `if (error) throw error` |
| 0.6 | `crearTarea` sin `owner_id` explícito | `mutations.ts` | Añadido `user.id` |
| 0.7 | Closure stale en `addFiles`/`quitarCola` | `TasksTable.tsx` | Functional updater |
| 1.1 | `BoltIcon` inline (remontajes) | `plan-diario/page.tsx` | Extraído a `icons.tsx` |
| 1.2 | `response_format` no compatible | `planSimple.ts` | Condicional por provider |
| 1.3 | `crearCaptura` sin try/catch | `captura/page.tsx` | try/catch + UI error |
| 1.4 | `router.refresh()` en static export | `login/page.tsx` | try/catch + fallback |
| 1.5 | `as Tarea` con campos faltantes | `plan-diario/page.tsx` | Objeto completo con nulls |
| 2.1 | `reload()` post-unmount | `captura/page.tsx` | Flag `alive` |
| 2.4 | Campos config sin inicializar | `configuracion/page.tsx` | `useState` con valores actuales |
| 2.5 | IA sin timeout | `planSimple.ts` + `plan.ts` | AbortController 45s |
| 2.6 | Histórico sin affordance expandible | `historico/page.tsx` | Columna ▶/▼ |
| 2.7 | Diagnóstico "sin sesión" falso | `configuracion/page.tsx` | Indicador de carga |
| 3.1 | `createClient()` sin singleton | `client.ts` | Singleton módulo |
| 3.6 | `handleFiles` sin try/finally | `TasksTable.tsx` | try/finally + catch |
| 3.7 | `crypto.randomUUID()` no disponible | `mutations.ts` | `generarUUID()` con fallback |
| 3.8 | Token expirado en fetchRemote | `configStore.tsx` | `refreshSession()` previo |

---

## Pendientes (6 issues)

| # | Problema | Archivo | Prioridad | Fix |
|---|----------|---------|-----------|-----|
| 2.2 | Validación duplicados redundante en `anadirTareaLibre` | `plan-diario/page.tsx:112` | Baja | Confiar solo en RPC |
| 2.3 | Flash "Cargando…" en auth check | `AppShell.tsx` | Media | SSR session o middleware |
| 3.2 | `llamarLLM` duplicado en dos módulos | `plan.ts` + `planSimple.ts` | Media | Extraer a `src/lib/llm.ts` |
| 3.3 | `extractFirstJSON` + `sanearJSONComun` duplicados | `plan.ts` + `planSimple.ts` | Baja | Incluir en el helper común |
| 3.4 | `fechaToLarga` duplicada | `plan.ts` + `planSimple.ts` | Baja | Incluir en helper común |
| 3.9 | Saltos de línea literales en prompt | `planSimple.ts:63-165` | Baja | Escapar a `\\n` |

---

## Fase 4 — 🏗️ Arquitectura / Mejores prácticas (no planificado)

| # | Problema | Fix sugerido |
|---|----------|-------------|
| 4.1 | No hay Error Boundary React | Crear `<ErrorBoundary>` |
| 4.2 | No hay skeletons de carga | Componente `<Skeleton>` compartido |
| 4.3 | No hay caché de datos | React Query o SWR |
| 4.4 | No hay estado de red (offline) | `navigator.onLine` + cola reintentos |
| 4.5 | No hay tests | Vitest + MSW |
| 4.6 | No hay tipos generados de Supabase | `supabase gen types typescript --local` |

---

## Resumen

```
Corregidos:  23/29  (79%)
Pendientes:   6/29  (21%) — todos de prioridad baja/media
Fase 4:       6     — debt técnico, no urgente
```