# El flujo de trabajo con agentes

Este documento explica, en lenguaje sencillo, **cómo se trabaja en este repo
cuando lo hacen los agentes**. No hace falta saber nada de IA: solo hay que
saber en qué fase está cada cosa y qué se espera de ti.

---

## La idea en 30 segundos

```
   1. AUDITORÍA      los agentes miran la app y anotan los problemas      → issues
   2. EVALUACIÓN     otro agente intenta demostrar que no son reales     → veredicto
   3. PLANIFICACIÓN  los problemas buenos se convierten en planes         → plan en el issue
   4. DESARROLLO     el agente crea una rama y escribe el arreglo          → rama ux/…
   5. VERIFICACIÓN   tests, typecheck, lint y revisión del diff          → checks + comentario
   6. PULL REQUEST   el agente presenta el cambio y explica qué hizo      → PR con Closes #N
   7. APROBACIÓN     tú decides si se integra en main                      → merge
   8. APRENDIZAJE    el sistema anota qué funcionó y qué falló             → docs/lecciones.md
```

**Una regla lo resume todo: el agente escribe el arreglo, tú fusionas.**

---

## Quién hace qué

| Momento | 👤 Tú | 🤖 El agente |
|---|---|---|
| **1. Auditoría** | Escribes «audita la app» | Recorre la app, encuentra problemas y te enseña una tabla |
| **2. Evaluación** | Nada (puedes leer el resumen) | Otro agente intenta desmontar cada hallazgo y dictamina |
| **3. Planificación** | Dices qué issues se arreglan | Escribe el plan (pasos, ficheros, criterios de aceptación) en el issue |
| **4. Desarrollo** | Dices «arregla el #21» | Crea la rama, escribe el código y actualiza la documentación |
| **5. Verificación** | Nada | Pasa los tests, el typecheck y el lint; revisa su propio diff |
| **6. Pull Request** | Lo lees | Abre el PR con la explicación y la checklist |
| **7. Aprobación** | **Fusionas o pides cambios** | Espera (nunca fusiona) |
| **8. Aprendizaje** | Pides el informe | Escribe las lecciones y propone ajustes |

Son **4 frases tuyas por ciclo**:

```
audita la app                    → fase 1-3
aprueba el #21                   → fase 3
arregla el #21                   → fase 4-6
(pulsas Merge en GitHub)         → fase 7
```

---

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Los problemas | **Issues** de GitHub (con categoría, gravedad, veredicto y plan) |
| Los cambios | **Pull Requests** de GitHub |
| El plan de cada arreglo | Dentro del issue, entre `<!-- ux-plan:start -->` y `<!-- ux-plan:end -->` |
| Las auditorías y informes | `~/.cache/ux-audit/<proyecto>/…` (fuera del repo) |
| Las lecciones | `docs/lecciones.md` de este repo |

---

## Las etiquetas: el estado de cada issue

Cada issue lleva **una** etiqueta de fase. Se ve de un vistazo:

| Etiqueta | Qué significa |
|---|---|
| `estado:auditado` | La auditoría lo encontró y está publicado |
| `estado:evaluado` | El evaluador ya lo ha dictaminado (confirmado / degradado / rechazado) |
| `estado:aprobado` | Tú has decidido que se arregla |
| `estado:planificado` | Tiene plan escrito con criterios de aceptación |
| `estado:en-desarrollo` | Hay rama y PR abierto |
| `estado:verificado` | Los tests pasan y el cambio ha sido revisado |

Y dos etiquetas extra:

- `evaluacion:confirmado` · `evaluacion:degradado` · `evaluacion:rechazado`
- `aprendizaje:acierto` · `aprendizaje:falso-positivo` · `aprendizaje:deuda-consciente`

Para ver qué toca:

```bash
gh issue list --label "estado:aprobado"
```

---

## Las reglas de oro

1. **Nunca se edita con `main` activa.** Antes de tocar nada:
   `git branch --show-current` y, si dice `main`, se crea la rama:
   `git checkout -b ux/<nombre>`.
2. **Todo arreglo es una rama + un PR.** Sin excepción.
3. **El PR lleva `Closes #N`.** Al fusionar, el issue se cierra solo.
4. **Antes del PR, la aduana técnica:** `npm run typecheck`, `npm test` y el
   lint de lo cambiado. En CI esto es automático y bloquea el merge.
5. **Si el cambio toca una pantalla, la documentación se actualiza en el mismo
   PR** (ver `AGENTS.md`): índice de features, sección de `/docs` y registro de
   cambios.
6. **El merge es tuyo.** Ni el agente ni la herramienta fusionan nada.

---

## Ejemplo: un ciclo completo

```bash
# 1 · Auditar
/skill:ux-audit audita la usabilidad de la app
#   → tabla de hallazgos → eliges → se publican los issues

# 2 · Evaluar (lo hace el agente)
node ~/.pi/agent/skills/ux-audit/scripts/evaluate.mjs run --findings <hallazgos>.json
#   → veredicto escrito en cada issue

# 3 · Aprobar y planificar
/skill:ux-audit aprueba el #21
#   → etiqueta estado:aprobado + plan escrito en el issue

# 4-6 · Arreglar
/skill:ux-audit arregla el #21
#   → rama ux/… + código + docs + tests + PR con Closes #21
#   → el revisor deja su informe en el PR

# 7 · Aprobar (tú)
gh pr checks 21          # ver que todo está en verde
#   → "Merge pull request" en GitHub

# 8 · Aprender
/skill:ux-audit genera el informe de aprendizaje
#   → docs/lecciones.md
```

---

## Configuración recomendada del repo

En *Settings → Branches → Add rule* para `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass: `test`, `typecheck` (los jobs del workflow
  *Tests*)
- ✅ Require approvals: 1
- ❌ Do not allow force pushes
- ✅ Delete head branches when merging

Con eso, la fase 7 es imposible de saltarse por accidente.

---

## Documentos relacionados

| Documento | Para qué |
|---|---|
| `AGENTS.md` | Reglas obligatorias para los agentes (docs ↔ app) |
| `docs/lecciones.md` | Lo que el sistema ha aprendido de los ciclos anteriores |
| `README.md` | Instalación, pantallas y demás |
| `~/.pi/agent/skills/ux-audit/MANUAL.md` | El manual completo del ciclo (para la persona) |
| `~/.pi/agent/skills/ux-audit/COMANDOS.md` | Todos los comandos, listos para copiar |
