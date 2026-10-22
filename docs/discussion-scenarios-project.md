# Conversación: escenarios de proyecto (contexto / estado / situación / hipótesis)

> Estado: **v1 IMPLEMENTADA** (2026-10-27). Ver §10-§13.
> La parte 1-9 es el registro original de la conversación (no se toca).
> Retomar desde §13: lo que queda abierto.

---

## 1. La idea que propone el usuario

Cada proyecto semanalmente tiene un **contexto**, un **estado** y/o una **situación**. El usuario
no tenía clara la diferencia entre los tres, pero sí la intuición correcta: **un proyecto es vivo,
suceden cosas**, y a partir de la situación actual habría que generar:

- todas las **hipótesis** posibles
- la **probabilidad** de cada una
- la **estrategia** a emplear en cada una

La reflexión era: **¿cómo implementar esto en una app de productividad?**

Base de datos relacional por proyecto, con **cronología** de lo que va pasando
(contexto / situación / estado), y a partir del análisis de toda esa cronología —con especial
importancia en la situación actual— generar hipótesis, probabilidades y estrategias.

El usuario pidió explícitamente: **"no hagas nada, piensa conmigo antes de hacer nada"**.

---

## 2. Mi valoración de la idea

### Lo bueno

- Mezcla un **diario cronológico del proyecto** con un **análisis situacional** que produce
  hipótesis/probabilidades/estrategias. Es exactamente cómo operan buenos estrategas o
  inversores (p. ej. el marco de Howard Marks).
- La IA leyendo cronología + situación actual para generar escenarios es, probablemente,
  **el uso más útil que se le puede dar a un LLM en una app de productividad** — mucho más que
  resumir emails o hacer listas.
- Separar **contexto, estado y situación** como tres dimensiones es una intuición correcta,
  aunque las dos últimas se solapaban en la mente del usuario.

### Lo conflictivo (advertido explícitamente)

1. **Coste cognitivo/emocional de "generar hipótesis de todo" cada semana.** Si cada proyecto
   genera 4-5 hipótesis con probabilidades y estrategias, hay que mantenerlo al día. Y si no se
   actualiza, se pudre. El enemigo de un buen sistema de productividad no es la falta de
   funciones: **es la fricción de uso**.
2. **Las hipótesis se inflan y se confunden con miedos disfrazados de análisis.** Mucha gente,
   al "analizar escenarios", está practicando ansiedad con formato de tabla.
3. **"Estado" y "Situación" se solapaban.** Hay que diferenciarlos de verdad o uno será redundante.
4. **Tentación de usar la IA como bola de cristal.** Puede inventar hipótesis plausibles pero
   falsas con mucha fluidez. Debe ser ayuda para pensar, no oráculo.

---

## 3. Propuesta de definición: contexto / estado / situación

| Concepto | Qué es | Marca temporal | Naturaleza | Cómo se actualiza |
|---|---|---|---|---|
| **Contexto** | Lo que **ya pasó** y condiciona el proyecto. La reunión con X el día 3, el email de Y, el descubrimiento de Z. | Pasado | Narrativo, acumulativo | No cambia retroactivamente. A mano / voz |
| **Estado** | Dónde **está el proyecto AHORA** en variables medibles: tareas abiertas, dinero gastado, % completado, bloqueos. | Presente | Cuantitativo | Casi automáticamente |
| **Situación** | La **lectura interpretativa** del estado. No son los hechos, es el significado que les das. | Presente | Cualitativo, subjetivo | A mano / con IA |
| **Hipótesis** | Proyección sobre futuros posibles a partir de los tres anteriores. | Futuro | — | Se regenera; no es permanente |

Regla mnemotécnica:

> **Contexto** = el pasado.
> **Estado** = el presente medido.
> **Situación** = el presente interpretado.

---

## 4. Decisiones ya tomadas por el usuario

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Opción A o B? | **Opción A** — manual, estructurada, con un solo "análisis IA" bajo demanda |
| 1b | ¿Cuántos proyectos activos? | **Entre 5 y 10** (rango crítico: con 5 es viable; con 10, unsustainable si el análisis es pesado) |
| 2 | ¿Quién escribe el contexto? | **Voz → Google Keep → un agente extrae, fecha y clasifica** (decisión inteligencia) |
| 3 | ¿Guardar hipótesis? | **Sí, todas**, siempre visible la última en el proyecto |
| 4 | ¿Qué muestra la IA? | **Las 5 primeras ordenadas por probabilidad** — "no quiero dejarme la que vaya a suceder" |
| 5 | ¿Capa sobre el ritual o lo reemplaza? | **Capa por encima** del ritual semanal existente |

---

## 5. Advertencias sobre la decisión 4 (la más importante)

El usuario quiere "la que vaya a suceder" en pantalla. Esto es **la trampa del sistema**, y hay que
debatirlo antes de implementar:

- Si la IA dice "la más probable es X" y X es lo aburrido (seguir igual, un riesgo menor), el
  usuario queda **pre-cargado hacia ella**. Y si acierta el 60% de las veces, el 40% restante duele.
- **El valor de un análisis de hipótesis no está en acertar el futuro, está en obligarte a pensar
  en los caminos que no estabas viendo.**
- La IA nunca puede saber más que el usuario sobre su proyecto. Lo mejor que puede hacer es
  **devolver las ideas dispersas del usuario, ordenadas y complementadas con lo olvidado**.

### Feature mala vs. feature buena

- **Feature mala**: "dame las 5 hipótesis más probables" → devuelve lo obvio, lo que ya sabía.
  Sensación de control, pero no se ha pensado nada nuevo.
- **Feature buena**: "dame 3 riesgos que no estás considerando, 2 oportunidades que no estás
  considerando" → devuelve lo que no estaba viendo. Ahora sí hay pensamiento nuevo.

### Rediseño propuesto

En vez de una lista ordenada solo por probabilidad, generar por **categorías**:

- **Riesgos** — qué puede salir mal y no se está viendo
- **Oportunidades** — qué puede salir mejor y no se está viendo
- **Puntos ciegos** — variables que se ignoran y podrían importar
- **Wildcard** — improbable pero de alto impacto

Con **estrategia concreta por hipótesis**. Y agrupado por *"qué hago en cada caso"* en lugar de solo
por probabilidad. La probabilidad se muestra, pero como **dato secundario**, no como protagonista.

**Pregunta abierta al usuario**: ¿la expectativa de "la que va a suceder" viene de miedo a
arrepentirse (→ parálisis, peor que no tener nada) o de que la más probable tiene la estrategia de
preparación más valiosa (→ entonces sí tiene sentido y se diseñará para eso)?

---

## 6. Diseño propuesto (pendiente de aprobación)

### Estructura por proyecto

- Registro cronológico que crece solo, alimentado por la voz del usuario
- Contexto / Estado / Situación diferenciados, con fecha
- Análisis de escenarios bajo demanda, guardado en el historial

### El análisis

- 4 categorías: Riesgos, Oportunidades, Puntos ciegos, Wildcard
- Por cada hipótesis: descripción + estrategia concreta
- Probabilidad como dato secundario
- Guardado en historial; siempre visible la última

### La fricción

- **Un solo punto de entrada semanal, no 10.** En la revisión semanal, una vista con todos los
  proyectos y una línea por proyecto ("Projecto Atlas: 2 escenarios nuevos"). Solo entra en los que
  interesen. Los demás se pueden mirar después o nunca, sin penalización.

> La diferencia entre "una capa que se integra en el flujo que ya tienes" y "una capa que se suma
> al flujo que ya tienes". Lo primero vive, lo segundo se muere.

---

## 7. Sobre el agente de voz

La decisión (voz → Google Keep → agente que extrae/fecha/clasifica) es probablemente **la más
inteligente de toda la conversación**: cero fricción, se piensa hablando.

**Pero**: el agente es un **punto de fallo silencioso**. Si falla, no se enteha enterado y se pierde
contexto. Requisitos:

- Debe poder mostrar **"esto es lo que he entendido"** para que el usuario corrija.
- **Nunca debe destruir lo que se escribió**, solo añadir la interpretación.

---

## 8. Preguntas abiertas (bloqueantes para implementar)

1. ¿El diseño por categorías (riesgos/oportunidades/puntos ciegos/wildcard) convence, o resulta
   demasiado *bulky* para lo que se quiere?
2. **¿Qué ritual semanal existe hoy exactamente?** Necesito entender cómo se integra esto sin
   añadir pasos.
3. ¿**Wildcard** da miedo o da curiosidad? (Es lo que más valor da y lo que más incomoda.)
4. ¿Esto es para **un proyecto puntual** o para **un sistema a usar durante meses**? El nivel de
   pulido y detalle es radicalmente distinto según la respuesta.
5. ¿Se implementa la **Opción A tal cual** o se acepta el rediseño por categorías del §5?

---

## 9. Criterio de diseño que quedó acordado

> Con 5-10 proyectos, la feature tiene que ser **brutalmente rápida de usar**, o en dos meses se
> abandona. Todo lo que añada pasos o mantenimiento recurrente es candidato a no existir.
---

## 10. Hallazgo al retomar: el sistema YA EXISTÍA en el core

Antes de escribir código, se miró `fooday-intelligence-core`. Resultado:

- **70 agentes** en `agents/`, tres de ellos son exactamente esta idea:
  - `agente-extractor-contexto.md` → genera `cronologia.md` + `analisis-situacion.md`
    + `hipotesis.md` + `estrategia.md` + `flujo-decision.md` (el "Sistema de Gestión
    de Contextos").
  - `agente-analizador-situaciones.md` → cronología + actores/restricciones/riesgos.
  - `agente-generador-hipotesis.md` → hipótesis con probabilidad 0-100,
    justificación, indicadores de validación/refutación e hipótesis alternativas.
- **~30 carpetas reales** en `docs/strategy/<proyecto>/` con esos 5 documentos
  (`conflicto-proveedor-bebidas`, `crisis-financiera-sol-nit-2026`,
  `banco-sabadell-conflicto-prestamos`…).
- En la app solo faltaba la **capa interactiva**: dónde leerlos, dónde pedir
  "analiza este proyecto ahora" y dónde guardar el historial.

**Conclusión:** el prompt de la app no se inventó — se adaptó del agente que
David ya usa (`agente-generador-hipotesis.md`). La app no sustituye al core:
lo complementa. El core sigue siendo el archivo profundo; la app es la capa
rápida de uso diario.

## 11. Preguntas abiertas que se respondieron al retomar

| # | Pregunta | Respuesta (con datos del repo) |
|---|---|---|
| 1 | ¿Opción A o B? | **A**, ya decidida. Se mantiene. |
| 2 | ¿Qué ritual semanal existe hoy? | El ritual semanal es **1 acción por día** (domingo /semana + /plan-diario, lunes /pagos *estricto*, miércoles /pipeline, viernes /informes, domingo /metas/plan). **Integración: fila nueva "Domingo (tras planificar)" → `/escenarios`** + un bloque-enlace en `/semana`. **Cero pasos nuevos**: es una capa encima, no un ritual aparte. |
| 3 | ¿Wildcard da miedo o curiosidad? | Se incluye **1 wildcard** por análisis, agrupado y al final de la lista. Da curiosidad: es el bloque de "alternativas de baja probabilidad pero alto cambio" que ya tenía el agente del core. |
| 4 | ¿Puntual o sistema de meses? | **Sistema mínimo**: un solo punto de entrada, análisis bajo demanda (nunca automático), historial acumulativo. Si no se usa en 2 meses, se abandona sin deuda (borrar la pantalla y las 2 tablas). |
| 5 | ¿Opción A tal cual o el rediseño por categorías? | **Rediseño por categorías (§5)**: riesgos / oportunidades / puntos ciegos / wildcard, con la probabilidad como dato secundario y **la hipótesis más probable destacada** (para no perder el "no quiero dejarme la que vaya a suceder"). La estrategia es lo que manda. |

## 12. Qué se ha implementado (v1)

**BD** — `supabase/migrations/0029_escenarios_proyecto.sql` (copia manual:
`supabase/APLICAR-0029.sql`):

- `proyecto_eventos` — cronología append-only: `tipo` ∈ {contexto, estado,
  situacion}, `texto`, `ocurrido_en`.
- `proyecto_analisis` — historial: `situacion`, `hipotesis` (jsonb), `modelo`.

**El "estado" no es una tabla**: se calcula de `tareas` en cada render. Una
tabla de estado se pudre y nadie la actualiza.

**App**:

- `src/app/escenarios/page.tsx` — la pantalla: lista de proyectos (1 línea
  cada uno) + panel por proyecto (estado medido, cronología, alta de hechos,
  escenarios, historial).
- `src/lib/escenarios/analizarEscenariosIA.ts` — el módulo IA (prompt
  adaptado del agente del core + categorías).
- `src/lib/escenarios/hipotesis.ts` — lógica pura (saneado, estado, fechas).
- `src/lib/llm.ts` — helper compartido de llamada al LLM (patrón nuevo, no
  toca los 5 módulos antiguos).
- `src/lib/queries.ts` / `src/lib/mutations.ts` — 3 queries + 3 mutaciones.
- `src/components/Sidebar.tsx` — entrada "Escenarios" (Estrategia).
- `src/app/semana/page.tsx` — bloque-enlace al pase de escenarios del domingo.
- `src/app/docs/page.tsx` — fila FEATURES, fila del ritual semanal, nota en
  "Aplicación en la app" (Pilar 2) y entrada en el registro de cambios.

**Test**: `node src/lib/escenarios/hipotesis.test.mjs` (13 casos, sin API).

## 13. Lo que queda abierto (para la próxima sesión)

1. **La voz.** La decisión nº2 (voz → Google Keep → agente que extrae, fecha y
   clasifica) sigue viva, pero el destino natural ahora es `proyecto_eventos`
   en vez de un Markdown. Falta decidir quién escribe: el agente del core
   (n8n/ETL) → Supabase, o un import desde `docs/strategy/*/cronologia.md`.
2. **Importar el core.** Hay ~30 carpetas con cronología ya escritas. Un ETL
   (`scripts/etl/import_from_core.py` ya existe para otras cosas) podría
   mapear carpeta → `proyecto` y sus `cronologia.md` → `proyecto_eventos`.
   Mapping por nombre: frágil, hay que decidir la clave.
3. **El wildcard y la honestidad.** Si la IA no ve datos suficientes, ¿qué
   hace? Ahora mismo dice "añade más cronología" (eso es correcto), pero
   conviene revisar si el prompt se autoengaña con 2 datos.
4. **Métrica de uso.** La feature vive o muere por el uso. Si en 4 semanas no
   hay ni un análisis, el problema no es la feature: es que el ritual no cabe.
   Pregunta para entonces: ¿dónde estorba?
