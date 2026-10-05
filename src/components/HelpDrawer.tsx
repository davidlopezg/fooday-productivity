"use client";

// ============================================================================
// HelpDrawer — Panel de ayuda contextual por sección.
// Click en el icono (i) → drawer con los puntos relevantes de la sección
// según la metodología de los 5 pilares (Deep Work, Metas, Tiempo,
// Hábitos, Descanso).
//
// Uso:
//   <HelpDrawer title="..." items={AYUDA_POR_RUTA["/ruta"]?.items ?? []} />
//
// `AYUDA_POR_RUTA` centraliza los textos para que la metodología viva en
// un solo sitio. Si cambias algo aquí, todas las pantallas lo reflejan.
// ============================================================================

import { useState } from "react";
import { IconHelp, IconX } from "@/components/icons";

export type HelpItem = {
  titulo: string;
  cuerpo: string;
  /** Pilar al que se vincula (1-5). Aparece como tag. */
  pilar?: 1 | 2 | 3 | 4 | 5;
};

const ETIQUETAS_PILAR: Record<NonNullable<HelpItem["pilar"]>, string> = {
  1: "🧠 Deep Work",
  2: "🎯 Metas",
  3: "⏱ Tiempo",
  4: "🔁 Hábitos",
  5: "🌙 Descanso",
};

// ============================================================================
// Mapa de ayuda por ruta — un solo sitio para toda la metodología.
// Cada entrada contiene los items que el drawer de esa ruta debe mostrar.
// ============================================================================
export const AYUDA_POR_RUTA: Record<
  string,
  { pilares: number[]; items: HelpItem[] }
> = {
  "/": {
    pilares: [1, 2, 5],
    items: [
      {
        titulo: "Tu día, en una sola pantalla",
        cuerpo:
          "El semáforo resume tu estado emocional; el plan de hoy lista las 3-4 tareas críticas; el contador de capturas te avisa si tu inbox se está saturando. Todo está aquí para que abras UNA pantalla y sepas por dónde empezar.",
        pilar: 1,
      },
      {
        titulo: "Si el plan está vacío, no hay brújula",
        cuerpo:
          "Sin metas concretas para hoy, el cerebro opera en piloto automático y entra en modo reactivo (responder mensajes, hacer lo fácil). Por eso /plan diario es la pantalla del mediodía: lo que escribas ahí guía el resto del día.",
        pilar: 2,
      },
      {
        titulo: "Dos paneles WIG: metas y tareas",
        cuerpo:
          "El panel violeta son los WIGs de METAS (qué resultados quieres). El panel fucsia son los WIGs de TAREAS (qué 3 tareas concretas los sostienen). Si los WIGs-metas no avanzan, mira primero las WIGs-tareas.",
        pilar: 2,
      },
    ],
  },
  "/captura": {
    pilares: [4],
    items: [
      {
        titulo: "Esto existe por el efecto Zeigarnik",
        cuerpo:
          "Tu cerebro NO deja en paz las tareas no terminadas: las mantiene activas ocupando atención hasta que las anotas. Capturar es vaciar la cabeza para liberar el cortex prefrontal. Regla: si lleva más de 15 segundos en tu cabeza, va aquí.",
        pilar: 4,
      },
      {
        titulo: "El inbox NO es la lista de tareas",
        cuerpo:
          "Es el parking temporal. Procesarlas (clasificarlas en tarea / problema / idea) debe hacerse en menos de 24h, idealmente al final de cada mañana o al iniciar el día siguiente. Si se acumulan más de 15, vuelve a procesarlas antes de añadir nuevas.",
        pilar: 4,
      },
      {
        titulo: "No confundir con /tareas/inbox",
        cuerpo:
          "/captura es el inbox de pensamiento suelto (cualquier texto: tareas, ideas, problemas, pagos). /tareas/inbox es distinto: solo contiene tareas (filas de la tabla) que aún no están vinculadas al plan trimestral.",
        pilar: 4,
      },
    ],
  },
  "/tareas/inbox": {
    pilares: [2, 4],
    items: [
      {
        titulo: "Conceptualmente hay DOS inboxes distintos",
        cuerpo:
          "/captura es el inbox de pensamiento suelto (efecto Zeigarnik): cualquier cosa que se te ocurra va como texto libre, sin estructura previa. ESTE inbox (/tareas/inbox) es distinto: solo contiene tareas (filas de la tabla tareas) que o no tienen meta asignada, o tienen meta pero ningún trimestre concreto. Es el triaje de tareas antes de meterlas en el plan trimestral.",
        pilar: 4,
      },
      {
        titulo: "Cuándo usarlo",
        cuerpo:
          "Cuando tengas tareas 'huérfanas' (sin meta) o tareas de una meta que aún no has repartido por trimestres. Procesarlas es meterlas en algún resultado_periodo o dejarlas como sueltas a propósito. La regla: este inbox debería estar cerca de cero. Si crece semana tras semana, tienes más trabajo del que tu plan puede ejecutar — replantéate prioridades.",
        pilar: 2,
      },
    ],
  },
  "/metas": {
    pilares: [2],
    items: [
      {
        titulo: "Enfoque en lo Enormemente Importante (WIG)",
        cuerpo:
          "Solo un pequeño número de metas de alto impacto a la vez — idealmente 1 a 3. La simplicidad en el número de objetivos permite concentrar la energía con la intensidad suficiente para generar resultados reales. Usa la diana 🎯 para ascender una meta a WIG. Si intentas sostener 10 metas 'importantes' a la vez, no sostienes ninguna.",
        pilar: 2,
      },
      {
        titulo: "Personal vs profesional: dos ámbitos, un solo tú",
        cuerpo:
          "Clasificar por ámbito te permite ver si estás descuidando una esfera (típico: todo profesional, nada personal, y a los 3 meses el cuerpo pasa factura). Filtra por ámbito para ver el balance. La meta de salud y la de familia compiten con la de negocio por tu energía: el panel WIG te obliga a elegir.",
        pilar: 2,
      },
      {
        titulo: "Cada meta debe tener Key Results medibles",
        cuerpo:
          "Una meta sin KR medible es un deseo. El Scorecard de /metas/plan te dice si vas en línea, por encima o por debajo del ritmo esperado para el trimestre. Si una meta no aparece en el scorecard, plantéate archivarla.",
        pilar: 2,
      },
    ],
  },
  "/metas/plan": {
    pilares: [2, 3],
    items: [
      {
        titulo: "El scorecard es tu punto de referencia",
        cuerpo:
          "Por cada KR verás: progreso actual vs esperado y una proyección al ritmo actual. ⚠️ Por debajo del ritmo = actúa esta semana. 🚀 Por encima = replantéate si el objetivo era demasiado fácil (subir el listón).",
        pilar: 2,
      },
      {
        titulo: "Los trimestres son ciclos de revisión",
        cuerpo:
          "No esperes al final para mirar el scorecard. Si llevas 6 semanas en ⚠️, el objetivo trimestral no se va a cumplir — ajusta el plan o el objetivo antes de que sea demasiado tarde.",
        pilar: 3,
      },
    ],
  },
  "/tareas": {
    pilares: [1, 2, 3],
    items: [
      {
        titulo: "Esta es tu lista, no tu plan",
        cuerpo:
          "El listado de tareas es la materia prima. El plan real está en /calendario (qué harás a qué hora) y en /plan-diario (qué harás hoy). Si la lista crece sin asignar bloques, vuelves al modo reactivo.",
        pilar: 1,
      },
      {
        titulo: "WIGs también sobre tareas (máx 3)",
        cuerpo:
          "Además de los WIGs de /metas, las tareas concretas que los ejecutan pueden ascender a WIG con la diana 🎯. Cap independiente de 3. Es la capa de ejecución: si no avanzan estas 3 tareas, tus WIGs de metas no avanzan.",
        pilar: 2,
      },
      {
        titulo: "Personal vs profesional",
        cuerpo:
          "Marca cada tarea como 👤 Personal o 💼 Profesional. Sirve para ver el balance (filtra por ámbito) y para que el plan diario sepa qué energía va a cada esfera. Sin clasificar = limbo.",
        pilar: 2,
      },
      {
        titulo: "Tags para agrupar, no para archivar",
        cuerpo:
          "Usa tags (#salud, #familia, #sol-de-nit) para filtrar y agrupar tareas transversales. Los chips bajo la barra de filtros son AND con el resto de filtros.",
        pilar: 3,
      },
      {
        titulo: "Auditoría 20/80: máximo 3 críticas por día",
        cuerpo:
          "Si tienes más de 3 tareas marcadas como 'crítica', ninguna lo es realmente. Resérvalo para lo que la sociedad rompe si no se hace hoy. El resto son 'altas' o 'medias'.",
        pilar: 3,
      },
    ],
  },
  "/focus": {
    pilares: [1, 5],
    items: [
      {
        titulo: "Pre-flight = ritual de entrada",
        cuerpo:
          "El checklist de 3 preguntas antes de iniciar (silenciar móvil, cerrar email, definir criterio de éxito) es la palanca más rentable que puedes tocar. Un pomodoro que empieza con notificaciones activas pierde el 40% de su intensidad.",
        pilar: 1,
      },
      {
        titulo: "Tu límite diario es 1-4h, no 8h",
        cuerpo:
          "Más allá de 4h de foco profundo tu rendimiento cae en picado. Mejor 4 pomodoros reales que 8 a medias. El descanso largo (15 min cada 4 pomodoros) es para que el cerebro descanse, no es opcional.",
        pilar: 5,
      },
    ],
  },
  "/calendario": {
    pilares: [3, 1],
    items: [
      {
        titulo: "Time-blocking: la palanca anti-cambio de contexto",
        cuerpo:
          "Asignar una tarea concreta a un bloque horario concreto (en lugar de 'hoy intento hacer X') reduce la pérdida de productividad por cambio de contexto hasta un 40%. La UI te recuerda si asignas más de 4 bloques/día.",
        pilar: 3,
      },
      {
        titulo: "Empieza el día desde el calendario, no desde la lista",
        cuerpo:
          "Cuando abras el día, mira primero /calendario: '¿qué toca en el bloque 1?'. Luego ve a /focus con esa tarea, completa el pre-flight y arranca. La lista de tareas (/tareas) es para inventario, no para ejecutar.",
        pilar: 1,
      },
    ],
  },
  "/plan-diario": {
    pilares: [1, 3, 5],
    items: [
      {
        titulo: "El estado emocional NO es opcional",
        cuerpo:
          "Tu cerebro gasta energía distinta según cómo te has despertado. Si estás en rojo, mejor hacer solo 1-2 bloques de foco profundo en lugar de los 4 planificados. La honestidad emocional es la única forma de que el plan funcione.",
        pilar: 5,
      },
      {
        titulo: "Máximo 4 bloques críticos",
        cuerpo:
          "La auditoría del Estatus Diario te recordará cada noche si hiciste más de 3 críticas. Si pasa, la planificación de mañana debe bajar a la mitad. La sostenibilidad gana a la heroicidad.",
        pilar: 3,
      },
    ],
  },
  "/estatus": {
    pilares: [4, 5],
    items: [
      {
        titulo: "El cierre cognitivo es el shutdown ritual",
        cuerpo:
          "Las 5 preguntas del cierre (¿qué conseguí? ¿qué queda abierto? ¿qué decisiones tomé? ¿qué me sigue ocupando? ¿cuál es el primer problema de mañana?) son tu ritual de desconexión. Sin él, tu cerebro sigue 'trabajando' mientras duermes.",
        pilar: 5,
      },
      {
        titulo: "Los hábitos son la base, no la guinda",
        cuerpo:
          "Los 9 hábitos no son 'el bonus', son el suelo sobre el que se construye todo lo demás. Sin ellos (sueño, comida, movimiento, vaciado mental), los bloques de foco se desmoronan. Revisa el score al final de cada semana.",
        pilar: 4,
      },
    ],
  },
  "/pipeline": {
    pilares: [3],
    items: [
      {
        titulo: "Esto NO es para hacer TODO, es para elegir UNA",
        cuerpo:
          "El motor de priorización con IA te devuelve una sola acción concreta (<45 min). El resto del tablero es inventario. Si te pasas el día moviendo tarjetas entre columnas sin hacerlas, el sistema no está cumpliendo su función.",
        pilar: 3,
      },
    ],
  },
  "/informes": {
    pilares: [1, 4, 5],
    items: [
      {
        titulo: "Mide lo que importa: foco profundo y hábitos",
        cuerpo:
          "La racha, los minutos de foco y el heatmap son las métricas que predicen resultados a 90 días. No mires el número de tareas hechas — un día con 2 críticas hechas vale más que uno con 12 tareas marcadas a medias.",
        pilar: 1,
      },
      {
        titulo: "El score de hábitos es tu suelo diario",
        cuerpo:
          "Si el score 7d está cayendo semana tras semana, no estás en modo sostenible: estás en modo heroicidad, que dura 3-4 semanas antes de quebrar. Mejor bajar el plan que romperte.",
        pilar: 4,
      },
    ],
  },
};

export function HelpDrawer({
  title,
  items,
}: {
  title: string;
  items: HelpItem[];
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Ayuda sobre ${title}`}
      >
        <IconHelp className="h-3.5 w-3.5" />
        Por qué existe esto
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={`Ayuda: ${title}`}
          onClick={() => setAbierto(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Por qué esto forma parte del sistema
                </p>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="rounded-md p-1.5 hover:bg-accent"
                aria-label="Cerrar"
              >
                <IconX className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              {items.map((item, i) => (
                <article
                  key={i}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <header className="mb-1.5 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold">{item.titulo}</h3>
                    {item.pilar && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {ETIQUETAS_PILAR[item.pilar]}
                      </span>
                    )}
                  </header>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.cuerpo}
                  </p>
                </article>
              ))}
            </div>

            <footer className="sticky bottom-0 border-t border-border bg-card px-5 py-3 text-center">
              <a
                href="/docs"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver los 5 pilares completos →
              </a>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}