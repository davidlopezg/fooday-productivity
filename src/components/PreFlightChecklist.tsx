"use client";

// ============================================================================
// PreFlightChecklist
// Pantalla previa al pomodoro de foco. Tres preguntas rápidas para forzar
// el "ritual de arranque" que recomienda la ciencia del Deep Work [10-12]:
//
//   1. ¿He silenciado las notificaciones del móvil?
//   2. ¿He cerrado email / Slack / WhatsApp?
//   3. ¿Cómo sabré que he avanzado? (criterio de éxito, texto libre)
//
// Diseño:
//   * El primer foco del día pide intención genuina: bloque 1 lleno.
//   * Es un formulario modal — no se sale de /focus para usarlo.
//   * "Iniciar foco" está DESHABILITADO hasta marcar los 2 checks.
//   * El criterio de éxito es opcional (placeholder amigable).
//   * Si el usuario pulsa "Saltar pre-flight" se inicia sin registrar nada
//     (compatibilidad: nadie debe quedar bloqueado, solo empujado).
// ============================================================================

import { useState } from "react";
import type { PreFlightCheck } from "@/lib/types";
import { IconBolt, IconCheck, IconShield } from "@/components/icons";

export function PreFlightChecklist({
  tareaTitulo,
  subtareaDescripcion,
  onConfirm,
  onSkip,
}: {
  tareaTitulo: string;
  subtareaDescripcion: string | null;
  onConfirm: (check: PreFlightCheck) => void;
  onSkip: () => void;
}) {
  const [silencioNotif, setSilencioNotif] = useState(false);
  const [cerreEmail, setCerreEmail] = useState(false);
  const [criterioExito, setCriterioExito] = useState("");

  const listo = silencioNotif && cerreEmail;

  return (
    <div
      className="space-y-6 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-6 sm:p-8"
      role="dialog"
      aria-labelledby="preflight-title"
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <IconShield className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="preflight-title"
            className="text-lg font-semibold tracking-tight"
          >
            Ritual de arranque · Pre-vuelo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Antes de empezar tu foco, confirma que has despejado las distracciones.
            Esto es lo que separa un pomodoro cualquiera de uno de alta intensidad.
          </p>
        </div>
      </header>

      {/* Objetivo del pomodoro (recordatorio) */}
      <div className="rounded-lg border border-border bg-card p-3 text-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Vas a trabajar en
        </div>
        <div className="mt-1 font-medium">{tareaTitulo}</div>
        {subtareaDescripcion && (
          <div className="mt-1 text-xs text-muted-foreground">
            🎯 {subtareaDescripcion}
          </div>
        )}
      </div>

      {/* Checklist */}
      <ul className="space-y-2">
        <CheckItem
          marcado={silencioNotif}
          onToggle={() => setSilencioNotif((v) => !v)}
          emoji="🔕"
          titulo="He silenciado las notificaciones del móvil"
          detalle="Lo pondremos en No Molestar o boca abajo. Si suena, el pomodoro se rompe."
        />
        <CheckItem
          marcado={cerreEmail}
          onToggle={() => setCerreEmail((v) => !v)}
          emoji="📭"
          titulo="He cerrado email, Slack y WhatsApp Web"
          detalle="No respondas hasta el descanso. Si entran mensajes ahí, se quedan ahí."
        />
      </ul>

      {/* Criterio de éxito */}
      <label className="block">
        <span className="block text-sm font-medium">
          ¿Cómo sabré que he avanzado?{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (opcional pero útil)
          </span>
        </span>
        <input
          type="text"
          value={criterioExito}
          onChange={(e) => setCriterioExito(e.target.value)}
          placeholder="p.ej. 'Terminar el borrador del email a María' o 'Resolver 3 issues del backlog'"
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Escribirlo activa el efecto de "punto de referencia" (pilar 2): tu cerebro
          trabaja más duro cuando tiene un objetivo concreto al final del bloque.
        </p>
      </label>

      {/* Botones */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Saltar pre-flight (no recomendado)
        </button>
        <button
          type="button"
          onClick={() =>
            onConfirm({
              silencioNotif,
              cerreEmail,
              criterioExito: criterioExito.trim(),
            })
          }
          disabled={!listo}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-violet-700 active:scale-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          <IconBolt className="h-4 w-4" />
          Iniciar foco
        </button>
      </div>
    </div>
  );
}

function CheckItem({
  marcado,
  onToggle,
  emoji,
  titulo,
  detalle,
}: {
  marcado: boolean;
  onToggle: () => void;
  emoji: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={marcado}
        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
          marcado
            ? "border-emerald-500/40 bg-emerald-500/10"
            : "border-border bg-card hover:bg-accent"
        }`}
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs ${
            marcado
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border bg-background"
          }`}
          aria-hidden
        >
          {marcado ? <IconCheck className="h-3.5 w-3.5" /> : emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-medium ${marcado ? "text-emerald-700 dark:text-emerald-300" : ""}`}
          >
            {titulo}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{detalle}</div>
        </div>
      </button>
    </li>
  );
}