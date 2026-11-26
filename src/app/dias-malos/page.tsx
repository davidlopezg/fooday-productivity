"use client";

// ============================================================================
// /dias-malos — el protocolo de emergencia para los días malos (issue #86).
// ----------------------------------------------------------------------------
// QUÉ ES
//   Los 6 pasos del protocolo, en orden, con un checklist de HOY. El
//   checklist vive en el navegador (localStorage) y se reinicia cada día:
//   es un estado de un día, no un dato del sistema (no va a la BD).
//
// POR QUÉ ES UNA PÁGINA Y NO UN BOTÓN EN /estatus
//   Porque en un día malo no se abre el Estatus: no se está cerrando el
//   día, se está rescatando. La página se abre, se lee y se ejecuta.
//
// LO QUE NO HACE
//   No juzga, no puntúa y no avisa de nada. El único "aviso" es el texto
//   final: si esto lleva tiempo, hay que pedir ayuda profesional.
// ============================================================================

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import {
  CLAVE_CHECKLIST_DIAS_MALOS,
  PROTOCOLO_DIAS_MALOS,
} from "@/lib/diasMalos";

// ── Almacén local (checklist de hoy) ────────────────────────────────────────
// Mismo patrón que RecordatorioMarco: un store externo leído con
// useSyncExternalStore (sin setState dentro de un efecto).

type Estado = { fecha: string; pasos: number[] };

let cache: Estado | undefined;
let suscriptores: (() => void)[] = [];

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function leer(): Estado {
  const hoy = hoyISO();
  try {
    const crudo = window.localStorage.getItem(CLAVE_CHECKLIST_DIAS_MALOS);
    if (!crudo) return { fecha: hoy, pasos: [] };
    const parsed = JSON.parse(crudo) as Estado;
    // Un checklist de otro día no sirve: se empieza de cero.
    if (!parsed || parsed.fecha !== hoy || !Array.isArray(parsed.pasos)) {
      return { fecha: hoy, pasos: [] };
    }
    return { fecha: hoy, pasos: parsed.pasos };
  } catch {
    return { fecha: hoy, pasos: [] };
  }
}

function getSnapshot(): Estado {
  if (cache === undefined) cache = leer();
  return cache;
}

function getServerSnapshot(): Estado {
  return { fecha: "", pasos: [] };
}

function suscribir(cb: () => void): () => void {
  suscriptores.push(cb);
  return () => {
    suscriptores = suscriptores.filter((s) => s !== cb);
  };
}

function alternar(numero: number) {
  const actual = getSnapshot();
  const pasos = actual.pasos.includes(numero)
    ? actual.pasos.filter((p) => p !== numero)
    : [...actual.pasos, numero].sort((a, b) => a - b);
  cache = { fecha: hoyISO(), pasos };
  try {
    window.localStorage.setItem(CLAVE_CHECKLIST_DIAS_MALOS, JSON.stringify(cache));
  } catch {
    // Sin almacenamiento: el checklist solo vive en esta sesión.
  }
  suscriptores.forEach((s) => s());
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function DiasMalosPage() {
  const estado = useSyncExternalStore(suscribir, getSnapshot, getServerSnapshot);
  const hechos = estado.pasos.length;
  const total = PROTOCOLO_DIAS_MALOS.pasos.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
        <h1 className="text-2xl font-bold tracking-tight">
          🛟 {PROTOCOLO_DIAS_MALOS.titulo}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {PROTOCOLO_DIAS_MALOS.intro}
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Protocolo de recuperación
          </h2>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {hechos} de {total} pasos
          </span>
        </div>

        <ol className="space-y-2">
          {PROTOCOLO_DIAS_MALOS.pasos.map((paso) => {
            const hecho = estado.pasos.includes(paso.numero);
            return (
              <li key={paso.numero}>
                <button
                  type="button"
                  onClick={() => alternar(paso.numero)}
                  aria-pressed={hecho}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    hecho
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm ${
                      hecho
                        ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {hecho ? "✓" : paso.numero}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      <span className="mr-1.5">{paso.emoji}</span>
                      {paso.titulo}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {paso.accion}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-medium leading-relaxed">
          {PROTOCOLO_DIAS_MALOS.cierre}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {PROTOCOLO_DIAS_MALOS.nota}
        </p>
        <p className="text-xs text-muted-foreground">
          El checklist se borra al día siguiente: mañana vuelves a empezar
          desde el paso 1. No guarda nada en tu base de datos.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Volver a Hoy
          </Link>
          <Link
            href="/estatus"
            className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            Ir al Estatus
          </Link>
        </div>
      </section>

      <HelpDrawer title="Días malos" items={AYUDA_POR_RUTA["/dias-malos"]?.items ?? []} />
    </div>
  );
}
