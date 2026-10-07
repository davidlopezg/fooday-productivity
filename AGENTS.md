<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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

