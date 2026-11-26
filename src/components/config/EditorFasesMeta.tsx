"use client";

// ============================================================================
// EditorFasesMeta — el catálogo de FASES de meta (migration 0043).
// ----------------------------------------------------------------------------
// QUÉ ES
//   El editor de la lista configurable "fases_meta". El ritual semanal
//   pregunta "¿en qué fase está esta meta?" y las respuestas tienen que
//   salir de algún sitio: aquí se edita ese catálogo.
//
// POR QUÉ NO ES UN SELECT FIJO EN EL CÓDIGO
//   Las fases son Vocabulary del usuario, no reglas de la app. Si mañana
//   quieres "fase 1 / fase 2 / fase 3" o "hipótesis / validación", se
//   cambia aquí y no se toca el código.
//
// QUÉ NO HACE
//   No borra una fase que ya usa alguna meta: el catálogo que se ofrece
//   siempre incluye las fases ya usadas (src/lib/ritualSemanal.ts).
// ============================================================================

import { useState } from "react";
import { useData } from "@/lib/useData";
import { fetchConfigLista } from "@/lib/queries";
import { guardarConfigLista } from "@/lib/mutations";
import {
  CLAVE_FASES_META,
  FASES_META_POR_DEFECTO,
  normalizarFases,
} from "@/lib/ritualSemanal";

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

export function EditorFasesMeta() {
  const { data, loading, error } = useData<string[]>(
    () => fetchConfigLista(CLAVE_FASES_META),
    [],
  );

  const [nueva, setNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Lo que hay en BD + el catálogo por defecto (si el usuario no ha
  // configurado nada, la app usa el de código).
  const configuradas = normalizarFases(data);
  const lista = configuradas.length > 0 ? configuradas : [...FASES_META_POR_DEFECTO];

  async function guardar(valores: string[]) {
    setGuardando(true);
    setErrorLocal(null);
    setMensaje(null);
    try {
      await guardarConfigLista(CLAVE_FASES_META, valores);
      setMensaje("Fases guardadas.");
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  function anadir() {
    const v = nueva.trim().toLowerCase();
    if (!v) return;
    if (lista.some((f) => f.toLowerCase() === v)) {
      setErrorLocal("Esa fase ya está en la lista.");
      return;
    }
    setNueva("");
    void guardar([...lista, v]);
  }

  function quitar(v: string) {
    void guardar(lista.filter((f) => f !== v));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">Fases de meta</h2>
        <p className="text-xs text-muted-foreground">
          Las opciones de la pregunta del ritual semanal «¿en qué fase está?».
          Si no guardas nada, se usa el catálogo por defecto:{" "}
          {FASES_META_POR_DEFECTO.join(", ")}.
        </p>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      )}
      {error && (
        <p className="text-xs text-muted-foreground">
          No se pudo leer la lista guardada ({error}). Se usa el catálogo por defecto.
        </p>
      )}

      <ul className="flex flex-wrap gap-2">
        {lista.map((f) => (
          <li
            key={f}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs"
          >
            {f}
            <button
              type="button"
              onClick={() => quitar(f)}
              aria-label={`Quitar la fase ${f}`}
              className="text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="nueva-fase" className="text-xs font-medium">
            Nueva fase
          </label>
          <input
            id="nueva-fase"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                anadir();
              }
            }}
            placeholder="p. ej. validación"
            className={`${field} mt-1`}
          />
        </div>
        <button
          type="button"
          onClick={anadir}
          disabled={guardando}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      {errorLocal && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {errorLocal}
        </p>
      )}
      {mensaje && (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          {mensaje}
        </p>
      )}
    </section>
  );
}
