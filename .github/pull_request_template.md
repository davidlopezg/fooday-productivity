<!--
  Plantilla de Pull Request del flujo de trabajo con agentes.
  Las casillas son el checklist de verificación: el revisor automático
  (ux-audit · review.mjs) las comprueba. Si una casilla no aplica, márcala
  y explica por qué en la misma línea.
-->

Closes #

## Qué cambia

<!-- Qué hace el cambio, en 2-4 frases. Sin jerga. -->

## Por qué

<!-- Qué problema resuelve. Enlace al issue si no cabe arriba. -->

## Verificación

- [ ] `npm run typecheck` en verde
- [ ] `npm test` en verde
- [ ] `npm run lint` sin errores nuevos
- [ ] Probado en la pantalla afectada (¿cuál?)

## Documentación (obligatorio según `AGENTS.md`)

- [ ] Índice de features en `src/app/docs/page.tsx` actualizado (si cambió una pantalla)
- [ ] Sección correspondiente de `/docs` actualizada
- [ ] `/metodologia` actualizada (si afecta a la arquitectura de metas o tareas)
- [ ] Registro de cambios de `/docs` con la fecha del cambio

## Plan

- [ ] El issue tiene el plan escrito (`<!-- ux-plan:start -->`)
- [ ] El diff no toca ficheros fuera del plan

## Riesgo

<!-- Qué puede romperse al fusionar. Si hay migración: "hay que aplicar
     `npm run db:push` antes de fusionar". -->
