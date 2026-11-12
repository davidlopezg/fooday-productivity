# Lecciones aprendidas — fooday-productivity

Repo: `davidlopezg/fooday-productivity` · generado el 2026-11-12

> Este fichero lo regenera el script de aprendizaje (`feedback.mjs --to`).
> Recoge lo que el sistema ha aprendido de los ciclos anteriores: qué falsos
> positivos se pararon, qué issues se descartaron y dónde está el cuello de
> botella. Se actualiza al cerrar el ciclo, no a mano.

## Lecciones

- 1 issue(s) se cerraron sin PR (#12). O no eran bugs o eran deuda que no se iba a arreglar. Cierra esos issues con la etiqueta `aprendizaje:falso-positivo` o `aprendizaje:deuda-consciente` para que el sistema aprenda de ellos la próxima vez.
- Un issue resuelto tarda de media 0 día(s) desde que se publica hasta que se fusiona su PR. Ese es el tiempo real del ciclo: de la auditoría al cambio en la app.

## Pendientes del flujo

- #31 Cuatro ficheros concentran casi 9.300 lineas de logica
- #30 Quedan 12 console.log de depuracion en el codigo de produccion
- #29 El fallback de pago parcial usa el prompt() nativo del navegador
- #28 Las mutaciones que escriben en Supabase no tienen ningun test automati
- #27 Todas las pantallas comparten el mismo titulo de documento
- #26 Las acciones destructivas usan confirm() nativo y no ofrecen deshacer
- #25 Los fallos de guardado se comunican con alert() nativo en 7 pantallas
- #24 Editar el importe de un pago ya pagado muestra un error tecnico de Pos
- #23 Si falla la sincronizacion del plan, el contador del dia queda descuad
- #22 La copia de una tarea recurrente se fecha desde hoy, no desde su fecha
- #21 Marcar una tarea recurrente como hecha puede no crear la siguiente cop
