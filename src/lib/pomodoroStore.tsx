"use client";

// ============================================================================
// PomodoroProvider — store global del temporizador.
//
// Responsabilidad única: mantener el estado del timer (fase, corriendo,
// tiempo restante, objetivo) accesible desde CUALQUIER punto de la app:
//   - la página /focus (vista completa)
//   - el widget flotante (mini-vista)
//   - el botón "Focus" en cada subtarea (inicia)
//
// Decisiones:
//   * Persistimos `endAt` (timestamp) en localStorage. Sobrevive a recargas
//     y al throttling de pestañas (cuando una pestaña pasa a background, los
//     setInterval se pausan; calculamos siempre contra el reloj de pared).
//   * El tick es un setInterval(1s) que recalcula `restante = endAt - now`.
//   * La sesión persistida en Supabase se inserta al TERMINAR un pomodoro
//     de foco (no al iniciarlo). Si abortas, no se cuenta.
//   * Los descansos NO se persisten: solo los focos valen.
// ============================================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DURACIONES_SEG,
  ETIQUETAS_FASE,
  desbloquearAudio,
  notificar,
  pedirPermisoNotificaciones,
  sonarFinDescanso,
  sonarFinFase,
} from "@/lib/pomodoro";
import type { PomodoroFase, PomodoroObjetivo } from "@/lib/types";

// ----------------------------------------------------------------------------
// Estado persistido en localStorage
// ----------------------------------------------------------------------------
type EstadoGuardado = {
  fase: PomodoroFase;
  endAt: number; // epoch ms
  corriendo: boolean;
  objetivo: PomodoroObjetivo | null;
  pomodorosHoy: number; // contador cliente, se rehidrata desde Supabase
  fechaContador: string; // YYYY-MM-DD — si cambia, el contador se resetea
};

const LS_KEY = "fooday.pomodoro.v1";
const DURACION_FOCO_DEFECTO_SEG = 25 * 60;

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function readLS(): EstadoGuardado | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EstadoGuardado>;
    if (
      typeof parsed.fase !== "string" ||
      typeof parsed.endAt !== "number" ||
      typeof parsed.corriendo !== "boolean"
    ) {
      return null;
    }
    return {
      fase: parsed.fase as PomodoroFase,
      endAt: parsed.endAt,
      corriendo: parsed.corriendo,
      objetivo: (parsed.objetivo as PomodoroObjetivo | null) ?? null,
      pomodorosHoy: typeof parsed.pomodorosHoy === "number" ? parsed.pomodorosHoy : 0,
      fechaContador: typeof parsed.fechaContador === "string" ? parsed.fechaContador : hoy(),
    };
  } catch {
    return null;
  }
}

function writeLS(s: EstadoGuardado) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

/** Resuelve el estado inicial leyendo localStorage. Si expiró, salta de fase. */
function estadoInicial(): {
  fase: PomodoroFase;
  endAt: number;
  corriendo: boolean;
  objetivo: PomodoroObjetivo | null;
  pomodorosHoy: number;
  fechaContador: string;
  restante: number;
} {
  const saved = readLS();
  if (!saved) {
    return {
      fase: "focus",
      endAt: 0,
      corriendo: false,
      objetivo: null,
      pomodorosHoy: 0,
      fechaContador: hoy(),
      restante: DURACION_FOCO_DEFECTO_SEG,
    };
  }
  // Si cambió el día, resetea el contador cliente
  const pomodorosHoy = saved.fechaContador === hoy() ? saved.pomodorosHoy : 0;
  const fechaContador = hoy();
  // Si estaba corriendo y no ha expirado, mantenemos endAt y corriendo.
  if (saved.corriendo && saved.endAt > Date.now()) {
    return {
      ...saved,
      pomodorosHoy,
      fechaContador,
      restante: Math.ceil((saved.endAt - Date.now()) / 1000),
    };
  }
  // Si estaba corriendo pero expiró, saltamos a la siguiente fase (en pausa).
  if (saved.corriendo && saved.endAt <= Date.now()) {
    const next: PomodoroFase = saved.fase === "focus" ? "descanso_corto" : "focus";
    return {
      ...saved,
      fase: next,
      endAt: 0,
      corriendo: false,
      pomodorosHoy,
      fechaContador,
      restante: DURACIONES_SEG[next],
    };
  }
  // En pausa: restaurar el restante congelado.
  return {
    ...saved,
    pomodorosHoy,
    fechaContador,
    restante: Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000)),
  };
}

// ----------------------------------------------------------------------------
// Contexto
// ----------------------------------------------------------------------------
type PomodoroContextValue = {
  fase: PomodoroFase;
  restante: number; // segundos que faltan
  corriendo: boolean;
  objetivo: PomodoroObjetivo | null;
  pomodorosHoy: number;

  /** Inicia un pomodoro de foco para una subtarea concreta. */
  iniciar: (objetivo: PomodoroObjetivo) => void;
  /** Pausa (no graba nada). Reanuda con reanudar(). */
  pausar: () => void;
  reanudar: () => void;
  /** Aborta la fase actual sin guardar nada. */
  abortar: () => void;
  /** Salta a la siguiente fase manualmente (sí graba si era focus). */
  saltar: () => void;
  /** Cambia la duración del foco (en minutos, 1..60). */
  setDuracionFocoMin: (min: number) => void;
  /** Inicia un descanso sin objetivo (libre). */
  descansar: (largo?: boolean) => void;
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

export function usePomodoro(): PomodoroContextValue {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro debe usarse dentro de <PomodoroProvider>");
  }
  return ctx;
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  // Inicialización síncrona desde localStorage — evita el setState-en-effect.
  const [initial] = useState(estadoInicial);
  const [fase, setFase] = useState<PomodoroFase>(initial.fase);
  const [endAt, setEndAt] = useState<number>(initial.endAt);
  const [corriendo, setCorriendo] = useState<boolean>(initial.corriendo);
  const [objetivo, setObjetivo] = useState<PomodoroObjetivo | null>(initial.objetivo);
  const [pomodorosHoy, setPomodorosHoy] = useState<number>(initial.pomodorosHoy);
  const [fechaContador, setFechaContador] = useState<string>(initial.fechaContador);
  const [restante, setRestante] = useState<number>(initial.restante);

  // Para no disparar el "fin" varias veces si el efecto se re-ejecuta.
  const endedRef = useRef(false);
  // Para no perder la duración personalizada al recargar.
  const duracionFocoRef = useRef<number>(DURACION_FOCO_DEFECTO_SEG);

  // --------------------------------------------------------------------------
  // onFaseTerminada — declaramos ANTES del effect del tick.
  // --------------------------------------------------------------------------
  const onFaseTerminada = useCallback(() => {
    const eraFocus = fase === "focus";
    const durSeg = eraFocus ? duracionFocoRef.current : DURACIONES_SEG[fase];
    const startedAt = new Date(endAt - durSeg * 1000);

    if (eraFocus) {
      sonarFinFase();
      notificar(
        "🎯 Foco terminado",
        objetivo?.subtarea_descripcion
          ? `Subtarea: ${objetivo.subtarea_descripcion}`
          : "Tómate un descanso",
        objetivo,
      );
      if (objetivo) {
        void grabarSesion({
          tarea_id: objetivo.tarea_id,
          subtarea_id: objetivo.subtarea_id,
          started_at: startedAt.toISOString(),
          ended_at: new Date().toISOString(),
          duracion_seg: durSeg,
        });
        setPomodorosHoy((p) => p + 1);
      }
    } else {
      sonarFinDescanso();
      notificar("☕ Descanso terminado", "Vuelve al foco cuando puedas.", objetivo);
    }

    // Avanza a la siguiente fase. focus → descanso_corto, descanso → focus.
    // (No implementamos descanso_largo automático cada 4 — queda en la UI.)
    const next: PomodoroFase = eraFocus ? "descanso_corto" : "focus";
    setFase(next);
    setEndAt(0);
    setCorriendo(false);
    endedRef.current = false;
    setRestante(DURACIONES_SEG[next]);
  }, [fase, endAt, objetivo]);

  // --------------------------------------------------------------------------
  // Tick del timer (1s). Recalcula contra el reloj de pared para que
  // sobreviva a throttling/background.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!corriendo) return;
    const id = setInterval(() => {
      const r = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRestante(r);
      if (r <= 0 && !endedRef.current) {
        endedRef.current = true;
        onFaseTerminada();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [corriendo, endAt, onFaseTerminada]);

  // --------------------------------------------------------------------------
  // Persistencia automática en localStorage cuando cambia algo relevante.
  // --------------------------------------------------------------------------
  useEffect(() => {
    writeLS({
      fase,
      endAt,
      corriendo,
      objetivo,
      pomodorosHoy,
      fechaContador,
    });
  }, [fase, endAt, corriendo, objetivo, pomodorosHoy, fechaContador]);

  // --------------------------------------------------------------------------
  // Carga el contador de hoy desde Supabase (fuente de verdad cross-device).
  // Solo si el día actual coincide con fechaContador.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (fechaContador !== hoy()) return;
    let alive = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("pomodoro_sesiones")
          .select("id")
          .eq("fase", "focus")
          .gte("started_at", `${hoy()}T00:00:00.000Z`)
          .lte("started_at", `${hoy()}T23:59:59.999Z`);
        if (error) throw error;
        if (alive) setPomodorosHoy((data ?? []).length);
      } catch (e) {
        // Silencioso: el contador de cliente es fallback.
        console.warn("[pomodoro] cargarContadorHoy:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fechaContador]);

  // --------------------------------------------------------------------------
  // Reset diario automático (cuando el día cambia con la app abierta)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      if (hoy() !== fechaContador) {
        setPomodorosHoy(0);
        setFechaContador(hoy());
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [fechaContador]);

  // --------------------------------------------------------------------------
  // Visibilidad de pestaña — al volver, recalcula inmediatamente
  // --------------------------------------------------------------------------
  useEffect(() => {
    const onVis = () => {
      if (corriendo) {
        const r = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        setRestante(r);
        if (r <= 0 && !endedRef.current) {
          endedRef.current = true;
          onFaseTerminada();
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [corriendo, endAt, onFaseTerminada]);

  // --------------------------------------------------------------------------
  // API pública
  // --------------------------------------------------------------------------
  const iniciar = useCallback((obj: PomodoroObjetivo) => {
    void desbloquearAudio();
    void pedirPermisoNotificaciones();
    const end = Date.now() + duracionFocoRef.current * 1000;
    endedRef.current = false;
    setFase("focus");
    setObjetivo(obj);
    setEndAt(end);
    setCorriendo(true);
    setRestante(Math.ceil(duracionFocoRef.current));
  }, []);

  const descansar = useCallback((largo = false) => {
    void desbloquearAudio();
    const dur = largo ? DURACIONES_SEG.descanso_largo : DURACIONES_SEG.descanso_corto;
    const end = Date.now() + dur * 1000;
    endedRef.current = false;
    setFase(largo ? "descanso_largo" : "descanso_corto");
    setEndAt(end);
    setCorriendo(true);
    setRestante(dur);
  }, []);

  const pausar = useCallback(() => {
    if (!corriendo) return;
    const r = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    setEndAt(Date.now() + r * 1000);
    setCorriendo(false);
    setRestante(r);
  }, [corriendo, endAt]);

  const reanudar = useCallback(() => {
    if (corriendo) return;
    if (endAt <= Date.now()) {
      endedRef.current = true;
      onFaseTerminada();
      return;
    }
    setCorriendo(true);
  }, [corriendo, endAt, onFaseTerminada]);

  const abortar = useCallback(() => {
    endedRef.current = false;
    setFase("focus");
    setEndAt(0);
    setCorriendo(false);
    setObjetivo(null);
    setRestante(duracionFocoRef.current);
  }, []);

  const saltar = useCallback(() => {
    if (!corriendo && endAt <= 0) return;
    endedRef.current = true;
    onFaseTerminada();
  }, [corriendo, endAt, onFaseTerminada]);

  const setDuracionFocoMin = useCallback(
    (min: number) => {
      const seg = Math.max(60, Math.min(60 * 60, Math.round(min * 60)));
      duracionFocoRef.current = seg;
      if (!corriendo && fase === "focus") {
        setEndAt(Date.now() + seg * 1000);
        setRestante(seg);
      }
    },
    [corriendo, fase],
  );

  // --------------------------------------------------------------------------
  // Valor del contexto
  // --------------------------------------------------------------------------
  const value = useMemo<PomodoroContextValue>(
    () => ({
      fase,
      restante,
      corriendo,
      objetivo,
      pomodorosHoy,
      iniciar,
      pausar,
      reanudar,
      abortar,
      saltar,
      setDuracionFocoMin,
      descansar,
    }),
    [
      fase,
      restante,
      corriendo,
      objetivo,
      pomodorosHoy,
      iniciar,
      pausar,
      reanudar,
      abortar,
      saltar,
      setDuracionFocoMin,
      descansar,
    ],
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

// ----------------------------------------------------------------------------
// Helpers de Supabase (best-effort — no bloquean la UI)
// ----------------------------------------------------------------------------
type SesionInsert = {
  tarea_id: string;
  subtarea_id: string | null;
  started_at: string;
  ended_at: string;
  duracion_seg: number;
};

async function grabarSesion(row: SesionInsert) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.warn("[pomodoro] sin sesión, no se grabó la sesión");
      return;
    }
    // Ignorar pomodoros "libres" (tarea_id="libre" es sentinel del UI)
    if (row.tarea_id === "libre") return;
    const { error } = await supabase.from("pomodoro_sesiones").insert({
      owner_id: session.user.id,
      tarea_id: row.tarea_id,
      subtarea_id: row.subtarea_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duracion_seg: row.duracion_seg,
      fase: "focus",
    });
    if (error) throw error;
  } catch (e) {
    console.warn("[pomodoro] grabarSesion falló:", e);
  }
}

// Re-export para la página /focus
export { ETIQUETAS_FASE };
