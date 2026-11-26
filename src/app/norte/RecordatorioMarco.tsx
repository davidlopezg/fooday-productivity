"use client";

import { useSyncExternalStore } from "react";
import { MARCO_RECORDATORIO } from "@/lib/norte/marcoPersonal";

// ============================================================================
// Recordatorio de lectura del Marco Personal.
//
// No guarda nada en la base de datos: solo la fecha de la última lectura en
// el navegador (localStorage), que es lo único que hace falta para saber si
// toca releer el documento.
//
// El valor se lee con useSyncExternalStore para no tener setState dentro de
// un efecto (y para que no haya diferencias entre servidor y navegador).
// ============================================================================

const CLAVE = "fooday:marco-personal:lectura";

let cache: string | null | undefined; // undefined = aún no leído
let suscriptores: (() => void)[] = [];

function leer(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    // Modo privado / almacenamiento bloqueado: se juega sin recordar.
    return null;
  }
}

function getSnapshot(): string | null {
  if (cache === undefined) cache = leer();
  return cache;
}

function getServerSnapshot(): string | null {
  return null;
}

function suscribir(cb: () => void): () => void {
  suscriptores.push(cb);
  return () => {
    suscriptores = suscriptores.filter((s) => s !== cb);
  };
}

function guardar(hoy: string) {
  cache = hoy;
  try {
    window.localStorage.setItem(CLAVE, hoy);
  } catch {
    // Sin almacenamiento: la fecha solo vive en esta sesión.
  }
  suscriptores.forEach((s) => s());
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso + "T00:00:00").getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Qué toca según cuánto tiempo pasó desde la última lectura. */
function siguienteLectura(dias: number | null): string {
  if (dias === null) return "No lo has leído todavía: empieza por el §1 (2 min).";
  if (dias === 0) return "Lo has leído hoy. Vuelve en tu próxima revisión semanal.";
  if (dias < 7) return `Última lectura hace ${dias} días: toca la lectura semanal (15 min).`;
  if (dias < 30)
    return `Última lectura hace ${dias} días: toca la revisión mensual (30 min).`;
  return `Última lectura hace ${dias} días: toca la lectura trimestral completa (45 min).`;
}

export default function RecordatorioMarco() {
  const ultima = useSyncExternalStore(suscribir, getSnapshot, getServerSnapshot);
  const dias = ultima ? diasDesde(ultima) : null;

  return (
    <section className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">
            ⏰ {MARCO_RECORDATORIO.titulo}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {MARCO_RECORDATORIO.intro}
          </p>
        </div>
        <button
          type="button"
          onClick={() => guardar(hoyISO())}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          {dias === 0 ? "✓ Leído hoy" : "Marcar lectura de hoy"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Cuándo", "Cuánto", "En qué momento", "Qué leer"].map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MARCO_RECORDATORIO.momentos.map((m) => (
              <tr key={m.cuando} className="border-t border-border">
                <td className="px-3 py-2 align-top font-medium text-foreground">
                  {m.cuando}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">{m.cuanto}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{m.donde}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">{m.que}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm font-medium">{siguienteLectura(dias)}</p>
    </section>
  );
}
