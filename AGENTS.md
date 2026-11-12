<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Flujo de trabajo con agentes

Este repo se trabaja con el flujo que explica `docs/proceso.md`. En corto:

1. **Nunca** se edita con `main` activa. Antes de tocar nada:
   `git branch --show-current` y, si dice `main`, `git checkout -b ux/<nombre>`.
2. Todo arreglo sale en un **PR con `Closes #N`**, usando la plantilla de
   `.github/pull_request_template.md` (la checklist de verificación y de
   documentación es obligatoria).
3. Antes del PR pasan la aduana técnica: `npm run typecheck`, `npm test` y el
   lint de los ficheros cambiados (en CI es automático y bloquea el merge).
4. Si el cambio toca una pantalla, se actualiza la documentación (regla de
   abajo, en la misma sesión).
5. **El merge lo pulsa la persona.** Ni el agente ni las herramientas de
   auditoría fusionan nada.

Las herramientas del ciclo (auditoría, evaluación adversarial, planificación,
revisión del PR y aprendizaje) están en `~/.pi/agent/skills/ux-audit/`; su
`MANUAL.md` explica el ciclo entero y `COMANDOS.md` trae todos los comandos.

## Flujo corto (arreglos pequeños)

Si el cambio es **visual o de texto** (alineación, rótulo, color) y **no toca
lógica, datos ni migraciones**, no hace falta todo el ciclo:

- **Sin** plan en el issue: el plan va resumido en el cuerpo del PR.
- **Sin** `review.mjs`: no hace falta revisar un diff de una línea.
- Checks: `npm run typecheck` + lint del diff
  (`BASE_SHA=$(git rev-parse origin/main) node .github/scripts/lint-diff.mjs`).
  `npm test` **solo si el cambio toca lógica**.
- PR con `gh pr create` y la checklist de `.github/pull_request_template.md`.

La **documentación se actualiza igual** (índice FEATURES, sección de `/docs` y
registro de cambios con la fecha): el atajo es de proceso, no de docs.

Si el cambio toca lógica de negocio, base de datos, migraciones, permisos o
accesibilidad → flujo completo (plan, tests y revisión). Detalle en
`docs/proceso.md`.

# Regla de sincronización docs ↔ app

Cualquier cambio que añada o modifique una **pantalla**, un **hábito**, un
**ritual** o una **regla de metodología** debe actualizar **en la misma
sesión**:

1. El **índice de features** en `src/app/docs/page.tsx` (constante `FEATURES`
   y tabla "Índice de features documentadas"). Añadir o modificar la fila
   correspondiente.
2. La **sección correspondiente** de `/docs` (ritual diario/semanal/mensual,
   pilar, apéndice o bloque "Aplicación en la app").
3. La página `/metodologia` si el cambio afecta a la arquitectura de metas
   o tareas (WIGs, GTD, Próxima Acción, dos inboxes).
4. El **registro de cambios** al final de `/docs` con la fecha del cambio.

**Si la documentación no se actualiza en la misma sesión, el trabajo no
está terminado.** Esto se aplica tanto a cambios de código como a cambios
de metodología: si modificas un pilar o un apéndice, también entras aquí.

