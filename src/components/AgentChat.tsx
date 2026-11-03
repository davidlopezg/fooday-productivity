"use client";

// ============================================================================
// AgentChat.tsx — el chat del AGENTE, presente en TODA la app.
//
// QUÉ ES
//   Un botón flotante (abajo a la derecha) que abre un panel de chat. Desde
//   ahí preguntas cualquier cosa sobre tus datos reales: "qué está en
//   riesgo", "resume el proyecto X", "qué hago hoy". El agente responde
//   con el estado real del sistema (ver src/lib/agente/contexto.ts) y las
//   conversaciones SE GUARDAN (migration 0035) para poder retomarlas.
//
// ALCANCE
//   · SOLO LECTURA: no crea metas, no completa tareas, no toca el plan.
//     Escribir es cosa de /agente, que ya tiene su flujo de revisión.
//   · Un mensaje = UNA llamada a la IA (con el snapshot dentro). Sin
//     tool-calling: la app es una SPA estática, no hay backend.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfig } from "@/lib/configStore";
import { usePomodoro } from "@/lib/pomodoroStore";
import { construirContexto } from "@/lib/agente/contexto";
import { responderAgente, type Turno } from "@/lib/agente/chatIA";
import {
  borrarConversacion,
  cargarMensajes,
  crearConversacion,
  guardarMensaje,
  listarConversaciones,
  rutaDeRef,
  type Conversacion,
  type MensajeChat,
  type RefEntidad,
} from "@/lib/agente/chatStore";
import {
  IconHistory,
  IconMessage,
  IconPlus,
  IconSparkles,
  IconTrash,
  IconX,
} from "@/components/icons";

/** Preguntas sugeridas para arrancar (chips). */
const SUGERENCIAS = [
  "¿Qué está en riesgo ahora mismo?",
  "Resume mis metas y sus KRs",
  "¿Qué debería hacer hoy?",
  "Dime qué tareas están bloqueadas o esperando respuesta",
];

/**
 * Convierte un error en algo accionable. El caso que más marea es la
 * migration 0035 sin aplicar: Supabase responde "Could not find the
 * table 'public.agente_conversaciones'" y el usuario no tiene ni idea de
 * qué hacer con eso.
 */
function mensajeAmigable(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  if (
    /agente_conversaciones|agente_mensajes|PGRST205|does not exist/i.test(msg)
  ) {
    return (
      "Falta la migración 0035 en Supabase (tablas del chat). " +
      "Ejecuta `npx supabase db push` (o pega el SQL en el editor de Supabase)."
    );
  }
  return msg || fallback;
}

/** Texto de la IA con **negritas** (marcado mínimo, sin librerías). */
function TextoIA({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="whitespace-pre-wrap break-words">
      {partes.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}

/** Chips con las entidades que menciona la respuesta (enlaces). */
function ChipsRefs({ refs }: { refs: RefEntidad[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {refs.map((r) => {
        const href = rutaDeRef(r);
        const contenido = (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-700 dark:text-violet-300">
            {r.tipo}: {r.etiqueta}
          </span>
        );
        return href ? (
          <Link key={`${r.tipo}-${r.id}`} href={href}>
            {contenido}
          </Link>
        ) : (
          <span key={`${r.tipo}-${r.id}`}>{contenido}</span>
        );
      })}
    </div>
  );
}

export function AgentChat() {
  const cfg = useConfig();
  const pathname = usePathname();
  const pomodoro = usePomodoro();

  const [abierto, setAbierto] = useState(false);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [entrada, setEntrada] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const finRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  /** true si ya se ha hecho la primera carga del historial (para no
   *  re-seleccionar la conversación reciente al reabrir el panel). */
  const primeraCargaRef = useRef(false);

  const apiKeyOk = !!cfg.data.minimax_api_key;

  // El widget del pomodoro también vive abajo a la derecha: si hay un
  // temporizador activo, el botón del chat sube para no taparlo.
  const pomodoroVisible =
    pathname !== "/focus" &&
    !(pomodoro.fase === "focus" && !pomodoro.corriendo && !pomodoro.objetivo);

  // ── Cargar el historial la primera vez que se abre el panel ──
  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    try {
      const lista = await listarConversaciones();
      setConversaciones(lista);
      return lista;
    } catch (e) {
      console.warn("[AgentChat] no se pudo leer el historial:", e);
      setError(mensajeAmigable(e, "No se pudo leer el historial de conversaciones"));
      return [];
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    if (!abierto) return;
    void (async () => {
      const lista = await cargarHistorial();
      // La PRIMERA vez que se abre, retomamos la conversación más reciente.
      // Después no: si el usuario ha pedido una nueva, se respeta.
      if (!primeraCargaRef.current) {
        primeraCargaRef.current = true;
        if (lista.length > 0 && conversacionId === null) {
          setConversacionId(lista[0].id);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // ── Cargar los mensajes al cambiar de conversación ──
  useEffect(() => {
    if (!conversacionId) return;
    let alive = true;
    void (async () => {
      try {
        const ms = await cargarMensajes(conversacionId);
        if (alive) setMensajes(ms);
      } catch (e) {
        console.warn("[AgentChat] no se pudieron leer los mensajes:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [conversacionId]);

  // ── Autoscroll al final cuando llega algo ──
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length, pensando]);

  async function abrirConversacion(id: string) {
    setConversacionId(id);
    setMostrarHistorial(false);
    setError(null);
  }

  async function nuevaConversacion() {
    setConversacionId(null);
    setMensajes([]);
    setMostrarHistorial(false);
    setError(null);
    setEntrada("");
    areaRef.current?.focus();
  }

  async function eliminarConversacion(id: string) {
    try {
      await borrarConversacion(id);
      setConversaciones((prev) => prev.filter((c) => c.id !== id));
      if (id === conversacionId) await nuevaConversacion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar la conversación");
    }
  }

  async function enviar(pregunta: string) {
    const texto = pregunta.trim();
    if (!texto || pensando) return;
    if (!apiKeyOk) {
      setError(
        "Configura la clave de IA en /configuracion para usar el agente.",
      );
      return;
    }

    setEntrada("");
    setError(null);
    setPensando(true);

    // 1) Si no hay conversación, se crea con el título del 1er mensaje.
    let idConv = conversacionId;
    const esNueva = !idConv;
    try {
      if (!idConv) {
        const conv = await crearConversacion(
          texto.slice(0, 70) + (texto.length > 70 ? "…" : ""),
        );
        idConv = conv.id;
        setConversacionId(conv.id);
        setConversaciones((prev) => [conv, ...prev]);
      }

      // 2) Se guarda el mensaje del usuario.
      const msgUsuario = await guardarMensaje(idConv, "user", texto);
      setMensajes((prev) => [...prev, msgUsuario]);

      // 3) Se arma el snapshot y se pregunta a la IA.
      const historial: Turno[] = mensajes.map((m) => ({
        rol: m.rol,
        contenido: m.contenido,
      }));
      const { texto: snapshot, catalogo } = await construirContexto(texto);
      const { respuesta, refs } = await responderAgente(
        {
          base_url: cfg.data.base_url,
          minimax_api_key: cfg.data.minimax_api_key!,
          model: cfg.data.model,
        },
        {
          snapshot,
          catalogo,
          historial,
          pregunta: texto,
          perfil: cfg.data,
        },
      );

      // 4) Se guarda la respuesta de la IA.
      const msgIA = await guardarMensaje(idConv, "assistant", respuesta, refs);
      setMensajes((prev) => [...prev, msgIA]);
    } catch (e) {
      console.error("[AgentChat] fallo al enviar:", e);
      setError(
        mensajeAmigable(e, "No se pudo completar la respuesta"),
      );
    } finally {
      setPensando(false);
      // Si acabamos de crear la conversación, recargamos la lista para el título.
      if (esNueva) void cargarHistorial();
    }
  }

  function alPulsarEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void enviar(entrada);
    }
  }

  // No mostrar en /login (AppShell ni siquiera monta el panel allí, pero
  // por si acaso se usa el componente suelto).
  if (pathname === "/login") return null;

  // ── Botón flotante ──
  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir el agente"
        title="Pregunta al agente"
        className={
          "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full " +
          "bg-violet-500 text-white shadow-lg shadow-violet-500/30 transition-transform " +
          "hover:scale-105 active:scale-95 md:right-6 " +
          (pomodoroVisible ? "bottom-[11rem] md:bottom-[11rem]" : "bottom-5 md:bottom-6")
        }
      >
        <IconMessage className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl " +
        // Móvil: hoja inferior a pantalla casi completa.
        "inset-x-0 bottom-0 top-14 rounded-t-2xl " +
        // Escritorio: panel flotante a la derecha.
        "md:inset-x-auto md:bottom-6 md:right-6 md:top-6 md:h-[min(38rem,calc(100vh-3rem))] md:w-[26rem] md:rounded-2xl"
      }
      role="dialog"
      aria-label="Agente"
    >
      {/* ── Cabecera ── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-3 py-2.5">
        <IconSparkles className="h-4 w-4 shrink-0 text-violet-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Agente</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {conversaciones.find((c) => c.id === conversacionId)?.titulo ??
              "Pregúntame por tus metas, KRs, proyectos o tareas"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarHistorial((v) => !v)}
          aria-label="Historial de conversaciones"
          title="Historial"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <IconHistory className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void nuevaConversacion()}
          aria-label="Nueva conversación"
          title="Nueva conversación"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <IconPlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar el agente"
          title="Cerrar"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <IconX className="h-4 w-4" />
        </button>
      </header>

      {/* ── Historial ── */}
      {mostrarHistorial && (
        <div className="max-h-56 shrink-0 overflow-y-auto border-b border-border bg-background/60">
          <button
            type="button"
            onClick={() => void nuevaConversacion()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-violet-600 hover:bg-accent dark:text-violet-300"
          >
            <IconPlus className="h-3.5 w-3.5" />
            Nueva conversación
          </button>
          {cargandoHistorial && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">Cargando…</p>
          )}
          {!cargandoHistorial && conversaciones.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              Todavía no hay conversaciones guardadas.
            </p>
          )}
          {conversaciones.map((c) => (
            <div
              key={c.id}
              className={
                "flex items-center gap-2 px-3 py-1.5 " +
                (c.id === conversacionId ? "bg-accent/60" : "")
              }
            >
              <button
                type="button"
                onClick={() => void abrirConversacion(c.id)}
                className="min-w-0 flex-1 truncate text-left text-xs text-foreground hover:underline"
              >
                {c.titulo ?? "(sin título)"}
              </button>
              <button
                type="button"
                onClick={() => void eliminarConversacion(c.id)}
                aria-label={`Borrar ${c.titulo ?? "conversación"}`}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-600"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Mensajes ── */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {mensajes.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Soy tu agente. Veo el estado real de tu sistema (metas, KRs,
              proyectos, tareas, plan de hoy y foco semanal) y{" "}
              <strong className="text-foreground">
                conozco el método de la app
              </strong>{" "}
              (los 5 pilares, los rituales, el criterio de selección): te
              respondo con tus datos y con las reglas del sistema. Las
              conversaciones se guardan solas.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void enviar(s)}
                  className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m) => (
          <div
            key={m.id}
            className={
              m.rol === "user"
                ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-violet-500 px-3 py-2 text-sm text-white"
                : "w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm"
            }
          >
            {m.rol === "assistant" ? (
              <>
                <TextoIA texto={m.contenido} />
                <ChipsRefs refs={m.refs ?? []} />
              </>
            ) : (
              <span className="whitespace-pre-wrap break-words">{m.contenido}</span>
            )}
          </div>
        ))}

        {pensando && (
          <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
            Consultando tu sistema…
          </div>
        )}

        <div ref={finRef} />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="shrink-0 border-t border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Entrada ── */}
      <div className="shrink-0 border-t border-border bg-muted/20 p-2.5">
        {!apiKeyOk && (
          <p className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
            ⚠️ Falta la clave de IA. Configúrala en{" "}
            <Link href="/configuracion" className="underline">
              /configuracion
            </Link>
            .
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={areaRef}
            rows={1}
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={alPulsarEnter}
            placeholder="Pregúntame por tus metas, KRs, proyectos o tareas…"
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => void enviar(entrada)}
            disabled={!entrada.trim() || pensando || !apiKeyOk}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-500 px-3 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconMessage className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Enter para enviar · Shift+Enter para salto de línea. El agente solo
          LEE: no crea ni modifica nada.
        </p>
      </div>
    </div>
  );
}
