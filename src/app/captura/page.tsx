"use client";

import { useState } from "react";
import { fetchCapturasPendientes } from "@/lib/queries";
import {
  crearCaptura,
  eliminarCaptura,
  marcarCapturaProcesada,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { PagoFormModal } from "@/components/pagos/PagoFormModal";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { IconTrash, IconWallet, IconX } from "@/components/icons";
import { errorMessage } from "@/lib/errors";
import type { Captura } from "@/lib/types";

type Rama = NonNullable<Captura["rama"]>;

const RAMAS: { key: Rama | ""; label: string; emoji: string }[] = [
  { key: "", label: "Sin clasificar", emoji: "📥" },
  { key: "tarea", label: "Tarea", emoji: "✅" },
  { key: "pago", label: "Pago", emoji: "💸" },
  { key: "problema", label: "Problema", emoji: "⚠️" },
  { key: "reflexion", label: "Reflexión", emoji: "💭" },
  { key: "idea", label: "Idea", emoji: "💡" },
  { key: "maria", label: "María", emoji: "👤" },
];

export default function CapturaPage() {
  const { data: capturas, loading, reload } = useData<Captura[]>(
    fetchCapturasPendientes,
    [],
  );
  const [texto, setTexto] = useState("");
  const [rama, setRama] = useState<Rama | "">("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturaParaPago, setCapturaParaPago] = useState<Captura | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await crearCaptura(texto, rama === "" ? undefined : rama);
      setTexto("");
      // No reseteo la rama: si estás metiendo 3 pagos seguidos, no tener
      // que volver a elegir "pago" cada vez.
      reload();
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setGuardando(false);
    }
  }

  async function onEliminar(id: string) {
    if (!confirm("¿Eliminar esta captura?")) return;
    try {
      await eliminarCaptura(id);
      reload();
    } catch (e: unknown) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Captura</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vuelca lo que tengas en la cabeza. Si es un pago, se creará
              directamente en /pagos.
            </p>
          </div>
          <HelpDrawer title="Captura" items={AYUDA_POR_RUTA["/captura"]?.items ?? []} />
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-border bg-card p-5"
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          required
          rows={3}
          placeholder="Escribe aquí… (tarea, problema, pago, reflexión…)"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Rama:</span>
          <div className="flex flex-wrap gap-1">
            {RAMAS.map((r) => (
              <button
                key={r.key || "none"}
                type="button"
                onClick={() => setRama(r.key as Rama | "")}
                className={`rounded-md border px-2 py-1 text-xs ${
                  rama === r.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-accent"
                }`}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar captura"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Pendientes de procesar ({capturas.length})
        </h2>
        <ul className="space-y-2">
          {capturas.map((c) => (
            <li
              key={c.id}
              className={`rounded-xl border bg-card p-4 text-sm ${
                c.rama === "pago"
                  ? "border-amber-500/30"
                  : "border-border"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{c.fecha}</span>
                  {c.rama && (
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5">
                      {RAMAS.find((r) => r.key === c.rama)?.emoji}{" "}
                      {RAMAS.find((r) => r.key === c.rama)?.label ?? c.rama}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {c.rama === "pago" && (
                    <button
                      type="button"
                      onClick={() => setCapturaParaPago(c)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <IconWallet className="h-3 w-3" />
                      Crear pago
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onEliminar(c.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Eliminar"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{c.texto}</p>
            </li>
          ))}
          {!loading && capturas.length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Inbox vacío.
            </li>
          )}
        </ul>
      </section>

      {/* Modal para crear pago desde una captura */}
      {capturaParaPago && (
        <PagoFormModal
          modo="crear"
          onClose={() => setCapturaParaPago(null)}
          onSaved={async () => {
            try {
              await marcarCapturaProcesada(
                capturaParaPago.id,
                `pago`,
              );
            } catch (e) {
              console.warn("No se pudo marcar la captura como procesada:", e);
            }
            reload();
          }}
          // Pasamos un initialContexto para pre-rellenar el formulario
          initialConcepto={capturaParaPago.texto}
        />
      )}
    </div>
  );
}
