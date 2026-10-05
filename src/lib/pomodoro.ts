// ============================================================================
// Pomodoro helpers — puros, sin estado, sin React.
// Audio: Web Audio API (sin dependencias, sin archivos externos).
// Notifications: API estándar del navegador (PWA la respeta).
// ============================================================================

import type { PomodoroFase, PomodoroObjetivo } from "@/lib/types";

export const DURACIONES_SEG: Record<PomodoroFase, number> = {
  focus: 25 * 60,
  descanso_corto: 5 * 60,
  descanso_largo: 15 * 60,
};

export const ETIQUETAS_FASE: Record<PomodoroFase, string> = {
  focus: "Foco",
  descanso_corto: "Descanso corto",
  descanso_largo: "Descanso largo",
};

/** Formatea segundos a "MM:SS" (o "HH:MM:SS" si >= 1h). */
export function formatTiempo(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

// ----------------------------------------------------------------------------
// Audio — beep de doble tono cuando termina una fase.
// Se inicializa un AudioContext perezoso (los navegadores lo bloquean hasta
// la primera interacción del usuario, así que lo creamos on-demand).
// ----------------------------------------------------------------------------
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

/** Beep corto a 880 Hz (lalala) — duración 180ms. */
function beep(freq: number, durMs: number, when: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  // Curva ADSR simple para evitar clicks
  const t0 = ctx.currentTime + when;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.4, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + durMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000);
}

/** Tres pitidos ascendentes al terminar el foco. */
export function sonarFinFase() {
  beep(880, 180, 0);
  beep(1175, 180, 0.22);
  beep(1568, 280, 0.44);
}

/** Un pitido grave al terminar un descanso. */
export function sonarFinDescanso() {
  beep(440, 260, 0);
}

/** Llamar tras la primera interacción del usuario para "despertar" el audio. */
export function desbloquearAudio() {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}

// ----------------------------------------------------------------------------
// Notifications — pide permiso la primera vez y dispara la notificación.
// ----------------------------------------------------------------------------
export async function pedirPermisoNotificaciones(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function notificar(
  titulo: string,
  cuerpo: string,
  objetivo: PomodoroObjetivo | null,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(titulo, {
      body: cuerpo,
      tag: "pomodoro-fooday",
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (e) {
    console.warn("[pomodoro] notification falló:", e);
  }
  void objetivo; // referencia para futuro (icono personalizado, etc.)
}
