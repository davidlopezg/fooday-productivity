"use client";

import { useState } from "react";
import { fetchConfiguracion, fetchTareas } from "@/lib/queries";
import { guardarPlanDiario } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { generarPlan, type EstadoEmocional, type PlanGenerado } from "@/lib/plan";
import type { Tarea } from "@/lib/types";

const DESPIERTAR = ["Con energía", "Cansado pero estable", "Agotado", "Ansioso"];
const MENTE = ["Relativamente clara", "Acelerada", "Nublada", "Oscura"];
const CUERPO = ["Liviano", "Tenso", "Dolorido", "Me cuesta habitarlo"];
const RUEDA = ["No, estoy presente", "Un poco", "Sí, todo me arrastra", "Totalmente sobrepasado"];
const NECESIDAD = ["Calma", "Claridad", "Contención", "Esperanza", "Nada"];

export default function PlanDiarioPage() {
  const config = useData(fetchConfiguracion, {
    base_url: "https://api.minimax.io/v1",
    minimax_api_key: null as string | null,
    model: "Minimax-M3",
  });
  const tareasQ = useData<Tarea[]>(() => fetchTareas("pendiente"), []);

  const [estado, setEstado] = useState<EstadoEmocional>({
    despertar: "Cansado pero estable",
    mente: "Acelerada",
    cuerpo: "Tenso",
    rueda: "Sí, todo me arrastra",
    necesidad: "Claridad",
  });
  const [generando, setGenerando] = useState(false);
  const [plan, setPlan] = useState<PlanGenerado | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    if (!config.data.minimax_api_key) {
      setError("Configura primero tu API key en /configuracion.");
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const p = await generarPlan(
        config.data.base_url,
        config.data.minimax_api_key,
        config.data.model,
        estado,
        tareasQ.data,
      );
      setPlan(p);
      await guardarPlanDiario({
        fecha: new Date().toISOString().slice(0, 10),
        ...estado,
        semaforo: p.semaforo,
        resumen: p.resumen,
        recomendacion: p.recomendacion,
        tareas: p.tareas,
      });
      tareasQ.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerando(false);
    }
  }

  const select =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  const SEM: Record<string, string> = {
    verde: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amarillo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rojo: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Plan diario</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado emocional + IA = tu plan del día (misma lógica del agente local).
        </p>
      </header>

      {!config.data.minimax_api_key && !config.loading && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
          Aún no has configurado tu API key de MiniMax.{" "}
          <a href="/configuracion" className="underline underline-offset-4">
            Ir a Configuración
          </a>
          .
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold tracking-tight">Estado de hoy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            ["despertar", "¿Cómo te has despertado?", DESPIERTAR],
            ["mente", "¿Cómo está tu mente?", MENTE],
            ["cuerpo", "¿Cómo habita tu cuerpo?", CUERPO],
            ["rueda", "¿Rueda del ratón?", RUEDA],
            ["necesidad", "¿Qué necesitas hoy?", NECESIDAD],
          ] as const).map(([k, label, opts]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
              <select
                className={select}
                value={estado[k]}
                onChange={(e) => setEstado({ ...estado, [k]: e.target.value })}
              >
                {opts.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={generar}
            disabled={generando || !config.data.minimax_api_key}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {generando ? "Generando con IA…" : "Generar plan"}
          </button>
          <span className="text-xs text-muted-foreground">
            {tareasQ.data.length} tareas pendientes consideradas
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </section>

      {plan && (
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
                SEM[plan.semaforo]
              }`}
            >
              {plan.semaforo.toUpperCase()}
            </span>
            <span className="text-sm text-muted-foreground">Plan generado</span>
          </div>
          <p className="text-sm leading-relaxed">{plan.resumen}</p>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Recomendación</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{plan.recomendacion}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Tareas del día</h3>
            <ul className="space-y-2">
              {plan.tareas.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                    {t.tipo}
                  </span>
                  <span>{t.titulo_libre}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
