// ============================================================================
// diasMalos.ts — el PROTOCOLO DE DÍAS MALOS (issue #86).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El protocolo de emergencia para los días en los que no consigues hacer
//   nada: 6 pasos, del "interrumpe el ciclo" al "recupera el día".
//
// POR QUÉ ES UN FICHERO A PARTE
//   El texto es contenido, no lógica: lo usan la página /dias-malos y la
//   documentación. Si estuviera dentro del componente, no se podría
//   reutilizar ni revisar sin tocar JSX.
//
// LO QUE NO HACE
//   No guarda nada en la base de datos. El checklist de HOY se guarda en el
//   navegador (localStorage): es un estado de un día, no un dato del
//   sistema.
// ============================================================================

/** Un paso del protocolo. */
export interface PasoDiasMalos {
  numero: number;
  titulo: string;
  /** Qué hacer, en una frase. */
  accion: string;
  /** Emoji para el icono del paso. */
  emoji: string;
}

export const PROTOCOLO_DIAS_MALOS: {
  titulo: string;
  intro: string;
  pasos: PasoDiasMalos[];
  cierre: string;
  nota: string;
} = {
  titulo: "Tu protocolo para los días en los que no consigues hacer nada",
  intro:
    "Hay días en los que pasas la mañana mirando el móvil, aunque sabes perfectamente qué tienes pendiente. La culpa no ayuda: solo convierte un mal día en dos. Este protocolo existe para romper el ciclo, no para juzgarte. Un día malo no es una falta de disciplina: es un día malo, y los días malos tienen plan.",
  pasos: [
    {
      numero: 1,
      titulo: "Interrumpe el ciclo",
      accion: "Levántate, deja el móvil fuera de la habitación y bebe agua.",
      emoji: "🚿",
    },
    {
      numero: 2,
      titulo: "Muévete",
      accion: "Camina 10 minutos, preferiblemente al aire libre.",
      emoji: "🚶",
    },
    {
      numero: 3,
      titulo: "Reduce el trabajo",
      accion:
        "No pienses en terminar una tarea. Identifica una acción que puedas completar en 10 minutos.",
      emoji: "🎯",
    },
    {
      numero: 4,
      titulo: "Empieza",
      accion:
        "Abre el documento, escribe el primer párrafo, revisa el primer dato o realiza la primera llamada.",
      emoji: "▶️",
    },
    {
      numero: 5,
      titulo: "Continúa si puedes",
      accion:
        "Si consigues trabajar 10 minutos, intenta otros 20. Y si no puedes, también está bien: lo que cuenta es haber roto la inactividad.",
      emoji: "⏱️",
    },
    {
      numero: 6,
      titulo: "Recupera el día",
      accion:
        "No intentes compensar las horas perdidas. Continúa con tu vida normalmente.",
      emoji: "🌤️",
    },
  ],
  cierre:
    "Hay días en los que tu objetivo será simplemente romper la inactividad. Eso también cuenta.",
  nota:
    "Si esta dificultad para empezar continúa afectando de forma importante a tu vida, merece la pena abordarla profesionalmente, además de cambiar tus hábitos. No debemos asumir que todo es una cuestión de disciplina.",
};

/** Clave del almacenamiento local del checklist de hoy. */
export const CLAVE_CHECKLIST_DIAS_MALOS = "fooday:dias-malos:checklist";
