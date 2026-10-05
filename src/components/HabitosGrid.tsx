"use client";

import { HABITOS_META, type HabitoEstado, type HabitoId, type HabitoMeta } from "@/lib/types";

/** Estado actual de los 9 hábitos. */
export type HabitosValue = Record<HabitoId, HabitoEstado | null>;

export const HABITOS_VACIO: HabitosValue = {
  qigong: null,
  caminar: null,
  ducha: null,
  meditacion: null,
  desayuno: null,
  vaciado_mental: null,
  comida_siesta: null,
  estatus: null,
  tres_cosas_buenas: null,
};

/** Extrae los hábitos de una fila persistida a la forma del grid. */
export function habitosDeEstatus(e: {
  habito_qigong: HabitoEstado | null;
  habito_caminar: HabitoEstado | null;
  habito_ducha: HabitoEstado | null;
  habito_meditacion: HabitoEstado | null;
  habito_desayuno: HabitoEstado | null;
  habito_vaciado_mental: HabitoEstado | null;
  habito_comida_siesta: HabitoEstado | null;
  habito_estatus: HabitoEstado | null;
  habito_3_cosas_buenas: HabitoEstado | null;
}): HabitosValue {
  return {
    qigong: e.habito_qigong,
    caminar: e.habito_caminar,
    ducha: e.habito_ducha,
    meditacion: e.habito_meditacion,
    desayuno: e.habito_desayuno,
    vaciado_mental: e.habito_vaciado_mental,
    comida_siesta: e.habito_comida_siesta,
    estatus: e.habito_estatus,
    tres_cosas_buenas: e.habito_3_cosas_buenas,
  };
}

const BOTONES: Array<{ valor: HabitoEstado; emoji: string; label: string; color: string }> = [
  { valor: "hecho", emoji: "✓", label: "Hecho", color: "emerald" },
  { valor: "parcial", emoji: "~", label: "Parcial", color: "amber" },
  { valor: "no", emoji: "✗", label: "No", color: "red" },
];

function colorBoton(c: string, activo: boolean) {
  if (!activo) {
    return "border-border bg-background text-muted-foreground hover:bg-accent";
  }
  switch (c) {
    case "emerald":
      return "border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "amber":
      return "border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "red":
      return "border-red-500/60 bg-red-500/15 text-red-700 dark:text-red-300";
  }
  return "";
}

/** Grid editable de los 9 hábitos con 3 estados (✓ / ~ / ✗) + clear. */
export function HabitosGrid({
  value,
  onChange,
}: {
  value: HabitosValue;
  onChange: (v: HabitosValue) => void;
}) {
  function set(id: HabitoId, estado: HabitoEstado | null) {
    onChange({ ...value, [id]: estado });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {HABITOS_META.map((m) => (
        <HabitoCard
          key={m.id}
          meta={m}
          estado={value[m.id]}
          onChange={(e) => set(m.id, e)}
        />
      ))}
    </div>
  );
}

function HabitoCard({
  meta,
  estado,
  onChange,
}: {
  meta: HabitoMeta;
  estado: HabitoEstado | null;
  onChange: (e: HabitoEstado | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <span>{meta.emoji}</span>
          <span>{meta.nombre}</span>
          {meta.opcional && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              opcional
            </span>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {meta.momento}
        </span>
      </div>
      <div className="flex gap-1.5">
        {BOTONES.map((b) => {
          const activo = estado === b.valor;
          return (
            <button
              key={b.valor}
              type="button"
              onClick={() => onChange(activo ? null : b.valor)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-sm font-semibold transition-colors ${colorBoton(b.color, activo)}`}
              aria-label={`${meta.nombre}: ${b.label}`}
              aria-pressed={activo}
            >
              {b.emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
