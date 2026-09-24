"use client";

import { useMemo, useState } from "react";
import {
  fetchTareas,
  fetchHistorialEmocional,
} from "@/lib/queries";
import {
  guardarPlanDiario,
  guardarNotasPlan,
  guardarBorrador,
  BLOQUES_FIJOS,
} from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import {
  generarPlan,
  redactarBorrador,
  informeToMarkdown,
  type EstadoEmocional,
  type PlanGeneradoLigero,
} from "@/lib/plan";
import type {
  InformePlan,
  PlanDiario,
  PlanDiarioBorrador,
  Tarea,
} from "@/lib/types";

// ----------------------------------------------------------------------------
// Constantes UI
// ----------------------------------------------------------------------------

const DESPIERTAR = ["Con energía", "Cansado pero estable", "Agotado", "Ansioso"];
const MENTE = ["Relativamente clara", "Acelerada", "Nublada", "Oscura"];
const CUERPO = ["Liviano", "Tenso", "Dolorido", "Me cuesta habitarlo"];
const RUEDA = ["No, estoy presente", "Un poco", "Sí, todo me arrastra", "Totalmente sobrepasado"];
const NECESIDAD = ["Calma", "Claridad", "Contención", "Esperanza", "Nada"];

const SEM: Record<string, string> = {
  verde: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amarillo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  rojo: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const SEM_FUERTE: Record<string, string> = {
  verde: "border-emerald-500/40 bg-emerald-500/5",
  amarillo: "border-amber-500/40 bg-amber-500/5",
  rojo: "border-red-500/40 bg-red-500/5",
};

// ----------------------------------------------------------------------------
// Tipos locales
// ----------------------------------------------------------------------------

type RedactarEstado = {
  idLocal: string;
  titulo: string;
  tipoTarea: string;
  tipo: "email" | "whatsapp" | "documento" | "otro";
  destinatario: string;
  contexto: string;
  asunto: string;
  cuerpo: string;
  prompt_usado: string;
  guardando: boolean;
  generando: boolean;
  error: string | null;
};

type TareaLocal = {
  idLocal: string;
  titulo: string;
  borradores: PlanDiarioBorrador[];
};

type PlanLocal = {
  id: string;
  fecha: string;
  fecha_larga: string;
  num_generacion: number;
  semaforo: "verde" | "amarillo" | "rojo";
  despertar: string;
  mente: string;
  cuerpo: string;
  rueda: string;
  necesidad: string;
  resumen: string;
  recomendacion: string;
  reflexion: string;
  contextoExtra: string;
  informe: InformePlan;
  tareas: TareaLocal[];
  notas: string;
};

// ----------------------------------------------------------------------------
// Página principal
// ----------------------------------------------------------------------------

export default function PlanDiarioPage() {
  const config = useConfig();
  const tareasQ = useData<Tarea[]>(() => fetchTareas("pendiente"), []);
  const historialQ = useData<PlanDiario[]>(() => fetchHistorialEmocional(5), []);

  const [estado, setEstado] = useState<EstadoEmocional>({
    despertar: "Cansado pero estable",
    mente: "Acelerada",
    cuerpo: "Tenso",
    rueda: "Sí, todo me arrastra",
    necesidad: "Claridad",
  });
  const [reflexion, setReflexion] = useState("");
  const [contextoExtra, setContextoExtra] = useState("");
  const [tareasLibres, setTareasLibres] = useState("");
  const [generando, setGenerando] = useState(false);
  const [planLocal, setPlanLocal] = useState<PlanLocal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notasEstado, setNotasEstado] = useState<
    | { status: "idle" }
    | { status: "guardando" }
    | { status: "guardado"; timestamp: number }
    | { status: "error"; mensaje: string }
  >({ status: "idle" });

  const [redactar, setRedactar] = useState<RedactarEstado | null>(null);

  async function generar() {
    if (!config.data.minimax_api_key) {
      setError("Configura primero tu API key en /configuracion.");
      return;
    }
    setGenerando(true);
    setError(null);
    try {
      const libres = tareasLibres
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const fecha = new Date().toISOString().slice(0, 10);

      const r: PlanGeneradoLigero = await generarPlan(
        config.data.base_url,
        config.data.minimax_api_key,
        config.data.model,
        {
          fecha,
          estado,
          tareas: tareasQ.data,
          tareasLibres: libres,
          reflexion,
          contextoExtra,
          historial: historialQ.data,
        },
      );

      const planId = await guardarPlanDiario({
        fecha,
        fecha_larga: fechaToLargaLocal(fecha),
        semaforo: r.semaforo,
        ...estado,
        resumen: r.resumen,
        recomendacion: r.recomendacion,
        reflexion: reflexion || undefined,
        contexto_extra: contextoExtra || undefined,
        tareas: r.tareas.map((t) => ({
          tipo: t.tipo,
          titulo_libre: t.titulo_libre,
          es_ia: t.es_ia,
          bloque_energia: t.bloque_energia,
          bloque_cognitivo: t.bloque_cognitivo,
          es_tarea_libre: false,
          subtareas: t.subtareas.map((s) => ({
            descripcion: s.descripcion,
            tiempo_estimado_min: s.tiempo_estimado_min,
          })),
        })),
        informe: r.informe,
      });

      setPlanLocal({
        id: planId,
        fecha,
        fecha_larga: fechaToLargaLocal(fecha),
        num_generacion:
          (historialQ.data[historialQ.data.length - 1]?.num_generacion ?? 0) + 1,
        semaforo: r.semaforo,
        ...estado,
        resumen: r.resumen,
        recomendacion: r.recomendacion,
        reflexion,
        contextoExtra,
        informe: r.informe,
        tareas: r.tareas.map((t, i) => ({
          idLocal: `local-${planId}-${i}`,
          titulo: t.titulo_libre,
          borradores: [],
        })),
        notas: "",
      });
      tareasQ.reload();
      historialQ.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerando(false);
    }
  }

  async function guardarNotas() {
    if (!planLocal) return;
    setNotasEstado({ status: "guardando" });
    try {
      await guardarNotasPlan(planLocal.id, planLocal.notas);
      setNotasEstado({ status: "guardado", timestamp: Date.now() });
    } catch (e) {
      setNotasEstado({ status: "error", mensaje: (e as Error).message });
    }
  }

  function abrirRedactar(t: TareaLocal) {
    setRedactar({
      idLocal: t.idLocal,
      titulo: t.titulo,
      tipoTarea: "imprescindible",
      tipo: "email",
      destinatario: "",
      contexto: "",
      asunto: "",
      cuerpo: "",
      prompt_usado: "",
      guardando: false,
      generando: false,
      error: null,
    });
  }

  async function generarBorrador() {
    if (!redactar || !config.data.minimax_api_key) return;
    setRedactar({ ...redactar, generando: true, error: null });
    try {
      const r = await redactarBorrador(
        config.data.base_url,
        config.data.minimax_api_key,
        config.data.model,
        {
          tarea: { titulo_libre: redactar.titulo, tipo: redactar.tipoTarea },
          tipo: redactar.tipo,
          contextoUsuario: redactar.contexto,
          destinatario: redactar.destinatario || undefined,
        },
      );
      setRedactar({
        ...redactar,
        asunto: r.asunto,
        cuerpo: r.cuerpo,
        prompt_usado: r.prompt_usado,
        generando: false,
      });
    } catch (e) {
      setRedactar({ ...redactar, generando: false, error: (e as Error).message });
    }
  }

  async function persistirBorrador() {
    if (!redactar || !planLocal) return;
    const tarea = planLocal.tareas.find((t) => t.idLocal === redactar.idLocal);
    if (!tarea) return;
    const idReal = await resolverIdRealTarea(planLocal.id, tarea.titulo);
    if (!idReal) {
      setRedactar({ ...redactar, error: "No se encontró la tarea en BD" });
      return;
    }
    setRedactar({ ...redactar, guardando: true, error: null });
    try {
      const borradorId = await guardarBorrador({
        plan_diario_tarea_id: idReal,
        tipo: redactar.tipo,
        contenido: redactar.asunto
          ? `Asunto: ${redactar.asunto}\n\n${redactar.cuerpo}`
          : redactar.cuerpo,
        prompt_usado: redactar.prompt_usado || undefined,
      });
      const nuevo: PlanDiarioBorrador = {
        id: borradorId,
        plan_diario_tarea_id: idReal,
        tipo: redactar.tipo,
        contenido: redactar.cuerpo,
        prompt_usado: redactar.prompt_usado || null,
        created_at: new Date().toISOString(),
      };
      setPlanLocal({
        ...planLocal,
        tareas: planLocal.tareas.map((t) =>
          t.idLocal === redactar.idLocal ? { ...t, borradores: [nuevo, ...t.borradores] } : t,
        ),
      });
      setRedactar(null);
    } catch (e) {
      setRedactar({ ...redactar, guardando: false, error: (e as Error).message });
    }
  }

  function copiarCuerpo() {
    if (!redactar) return;
    const txt = redactar.asunto
      ? `Asunto: ${redactar.asunto}\n\n${redactar.cuerpo}`
      : redactar.cuerpo;
    navigator.clipboard?.writeText(txt).catch(() => {});
  }

  function descargarMarkdown() {
    if (!planLocal) return;
    const md = informeToMarkdown(
      planLocal.fecha,
      planLocal.fecha_larga,
      planLocal.informe,
      planLocal.semaforo,
      planLocal.despertar,
      planLocal.mente,
      planLocal.cuerpo,
      planLocal.rueda,
      planLocal.necesidad,
      planLocal.resumen,
      planLocal.recomendacion,
      planLocal.notas,
      planLocal.reflexion,
    );
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${planLocal.fecha}-planificacion-diaria.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const select =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  const textareaCls =
    "min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan diario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado emocional + IA = informe completo (psicología + operativa + nutrición).
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <a
            href="/plan-diario/historico"
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            📋 Histórico
          </a>
          <a
            href="/dashboard-emocional"
            className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
          >
            💚 Dashboard
          </a>
        </div>
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

      {/* Histórico mini-cards */}
      {historialQ.data.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">
            📈 Últimos {historialQ.data.length} días
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {historialQ.data.map((h) => (
              <div key={h.id} className="rounded-lg border border-border bg-background p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{h.fecha.slice(5)}</span>
                  {h.semaforo && (
                    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${SEM[h.semaforo]}`}>
                      {h.semaforo}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {h.despertar?.split(" ")[0] ?? "—"} · {h.mente?.split(" ")[0] ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formulario */}
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

        <details className="mt-5 rounded-md border border-border">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium hover:bg-muted/50">
            ➕ Inputs opcionales (reflexión, contexto, tareas adicionales)
          </summary>
          <div className="space-y-3 p-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Reflexión / desahogo (opcional)
              </span>
              <textarea
                className={textareaCls}
                value={reflexion}
                onChange={(e) => setReflexion(e.target.value)}
                placeholder="¿Qué tienes en la cabeza hoy? Sin filtro."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Contexto extra (opcional)
              </span>
              <textarea
                className={textareaCls}
                value={contextoExtra}
                onChange={(e) => setContextoExtra(e.target.value)}
                placeholder="Cita médica, evento familiar, deadline que se acerca…"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Tareas adicionales (1 por línea, no están en BD)
              </span>
              <textarea
                className={textareaCls}
                value={tareasLibres}
                onChange={(e) => setTareasLibres(e.target.value)}
                placeholder={"Llamar a María\nLlevar coche al taller"}
              />
            </label>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={generar}
            disabled={generando || !config.data.minimax_api_key}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {generando ? "Generando informe con IA…" : "Generar plan"}
          </button>
          <span className="text-xs text-muted-foreground">
            {tareasQ.data.length} tareas pendientes de BD
          </span>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </section>

      {/* Plan generado: informe rico */}
      {planLocal && (
        <InformeRender planLocal={planLocal} onAbrirRedactar={abrirRedactar} onDescargar={descargarMarkdown} />
      )}

      {/* Notas del día */}
      {planLocal && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold tracking-tight">📓 Notas del día</h3>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <textarea
                className="min-h-[80px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={planLocal.notas}
                onChange={(e) => {
                  setPlanLocal({ ...planLocal, notas: e.target.value });
                  if (notasEstado.status === "guardado") setNotasEstado({ status: "idle" });
                }}
                placeholder="Reflexiones al final del día, qué salió bien, qué ajustar mañana…"
              />
              <button
                onClick={guardarNotas}
                disabled={notasEstado.status === "guardando"}
                className="h-fit rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                {notasEstado.status === "guardando" ? "Guardando…" : "Guardar"}
              </button>
            </div>
            {notasEstado.status === "guardado" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                ✅ Guardado a las{" "}
                {new Date(notasEstado.timestamp).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {notasEstado.status === "error" && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ❌ Error: {notasEstado.mensaje}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Modal de redacción */}
      {redactar && (
        <RedactarModal
          estado={redactar}
          onChange={setRedactar}
          onGenerar={generarBorrador}
          onCopiar={copiarCuerpo}
          onGuardar={persistirBorrador}
          onCerrar={() => setRedactar(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Render del informe rico
// ============================================================================

function InformeRender({
  planLocal,
  onAbrirRedactar,
  onDescargar,
}: {
  planLocal: PlanLocal;
  onAbrirRedactar: (t: TareaLocal) => void;
  onDescargar: () => void;
}) {
  const inf = planLocal.informe;
  return (
    <section className={`space-y-6 rounded-2xl border-2 bg-card p-6 ${SEM_FUERTE[planLocal.semaforo]}`}>
      {/* Cabecera + semáforo */}
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              📅 {planLocal.fecha_larga}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Generación #{planLocal.num_generacion} · guardado en Supabase
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${SEM[planLocal.semaforo]}`}
            >
              {planLocal.semaforo.toUpperCase()}
            </span>
            <button
              onClick={onDescargar}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              📄 Descargar .md
            </button>
          </div>
        </div>
        <blockquote className="mt-3 rounded-md border-l-4 border-primary/60 bg-muted/30 px-4 py-2 text-sm italic">
          {inf.cabecera}
        </blockquote>
      </header>

      {/* Estado hoy */}
      <Section titulo="🌡️ Tu Estado Hoy">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border/60">
              {inf.estado_hoy.tabla.map((f, i) => (
                <tr key={i}>
                  <td className="w-40 bg-muted/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {f.campo}
                  </td>
                  <td className="px-4 py-2">
                    <span className="mr-2 text-base">{f.emoji}</span>
                    {f.valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {inf.estado_hoy.conexion_emocional && (
          <div className="mt-3 rounded-md border-l-4 border-violet-500/50 bg-violet-500/5 px-4 py-2 text-sm leading-relaxed">
            <strong>Conexión emocional:</strong> {inf.estado_hoy.conexion_emocional}
          </div>
        )}
      </Section>

      {/* Tendencia */}
      {inf.tendencia.registros.length > 0 && (
        <Section titulo="📈 Tendencia vs últimos registros">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Indicador</th>
                  {inf.tendencia.registros.map((r, i) => (
                    <th key={i} className="px-3 py-2 text-center">
                      {r.fecha}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(["despertar", "mente", "cuerpo", "rueda", "necesita"] as const).map((campo) => (
                  <tr key={campo}>
                    <td className="bg-muted/30 px-3 py-2 font-medium capitalize">{campo}</td>
                    {inf.tendencia.registros.map((r, i) => {
                      const rec = r as unknown as Record<string, unknown>;
                      return (
                        <td key={i} className="px-3 py-2 text-center text-[11px]">
                          {String(rec[campo] ?? "—")}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {inf.tendencia.registros[inf.tendencia.registros.length - 1]
                        ?.tendencia_despertar ?? "—"}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td className="px-3 py-2 font-medium">Semáforo</td>
                  {inf.tendencia.registros.map((r, i) => (
                    <td key={i} className="px-3 py-2 text-center">
                      {r.semaforo}
                    </td>
                  ))}
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          {inf.tendencia.lectura && (
            <p className="mt-3 text-sm leading-relaxed">{inf.tendencia.lectura}</p>
          )}
        </Section>
      )}

      {/* Lectura Psicológica */}
      <Section titulo="🧠 Lectura Psicológica">
        {inf.lectura_psicologica.estado_actual && (
          <SubSection titulo="Estado actual">
            <p className="text-sm leading-relaxed">{inf.lectura_psicologica.estado_actual}</p>
          </SubSection>
        )}
        {inf.lectura_psicologica.analisis_emocional && (
          <SubSection titulo="Análisis emocional">
            <p className="text-sm leading-relaxed">{inf.lectura_psicologica.analisis_emocional}</p>
          </SubSection>
        )}
        {inf.lectura_psicologica.recomendaciones_hoy.length > 0 && (
          <SubSection titulo="Recomendación psicológica — Para hoy">
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
              {inf.lectura_psicologica.recomendaciones_hoy.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </SubSection>
        )}
        {inf.lectura_psicologica.si_sobrepasado.length > 0 && (
          <SubSection titulo="Si te sentís sobrepasado">
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {inf.lectura_psicologica.si_sobrepasado.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </SubSection>
        )}
        {inf.lectura_psicologica.si_cuerpo_empeora.length > 0 && (
          <SubSection titulo="Si el cuerpo empeora antes de las 17:00">
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-red-700 dark:text-red-400">
              {inf.lectura_psicologica.si_cuerpo_empeora.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </SubSection>
        )}
        {inf.lectura_psicologica.para_esta_semana.length > 0 && (
          <SubSection titulo="Para tener en cuenta (esta semana)">
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {inf.lectura_psicologica.para_esta_semana.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </SubSection>
        )}
      </Section>

      {/* Conexión con tareas */}
      {inf.conexion_tareas.analisis_realismo.length > 0 && (
        <Section titulo="🎯 Cómo afecta a tus tareas">
          <SubSection titulo="Análisis de realismo">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Tarea reportada</th>
                    <th className="px-3 py-2">¿Realista hoy?</th>
                    <th className="px-3 py-2">Por qué</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {inf.conexion_tareas.analisis_realismo.map((x, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium">
                        {x.tarea}
                        {x.origen && <span className="ml-1 text-[10px] text-muted-foreground">({x.origen})</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {x.realista_hoy === "si" ? "✅ Sí" : x.realista_hoy === "si_condiciones" ? "⚠️ Con cond." : "❌ No"}
                      </td>
                      <td className="px-3 py-2 text-[11px]">{x.por_que}</td>
                      <td className="px-3 py-2 text-[11px] font-medium">{x.accion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubSection>
          {inf.conexion_tareas.justificacion_3_tareas && (
            <div className="mt-3 rounded-md border-l-4 border-amber-500/50 bg-amber-500/5 px-4 py-2 text-sm leading-relaxed">
              {inf.conexion_tareas.justificacion_3_tareas}
            </div>
          )}
        </Section>
      )}

      {/* Día optimizado */}
      <Section titulo="📋 Tu Día Optimizado">
        {inf.dia_optimizado.energia_disponible && (
          <p className="mb-2 text-sm">
            <strong>ENERGÍA DISPONIBLE:</strong> {inf.dia_optimizado.energia_disponible}
          </p>
        )}
        {inf.dia_optimizado.principio_hoy && (
          <p className="mb-3 text-sm italic text-muted-foreground">
            <strong>Principio hoy:</strong> {inf.dia_optimizado.principio_hoy}
          </p>
        )}
        {inf.dia_optimizado.horario.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Horario</th>
                  <th className="px-3 py-2">Bloque</th>
                  <th className="px-3 py-2">Tarea</th>
                  <th className="px-3 py-2">Por qué</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {inf.dia_optimizado.horario.map((h, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{h.horario}</td>
                    <td className="px-3 py-2 text-[11px]">{h.bloque}</td>
                    <td className="px-3 py-2">{h.tarea}</td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">{h.por_que}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {inf.dia_optimizado.delegacion_ia.length > 0 && (
          <div className="mt-3 rounded-md border-l-4 border-fuchsia-500/50 bg-fuchsia-500/5 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
              🤖 Delegación IA
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {inf.dia_optimizado.delegacion_ia.map((d, i) => (
                <li key={i}>
                  <strong>🔧 {d.que}</strong> — <span className="text-muted-foreground">{d.cuando_listo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {inf.dia_optimizado.patron_detectado && (
          <p className="mt-3 text-xs italic text-muted-foreground">
            {inf.dia_optimizado.patron_detectado}
          </p>
        )}
      </Section>

      {/* Clasificación de tareas */}
      <Section titulo="📊 Clasificación de Todas las tareas">
        {inf.clasificacion_tareas.del_dia.length > 0 && (
          <SubSection titulo={`🔴 Tareas del día (${inf.clasificacion_tareas.del_dia.length})`}>
            <TareasTablaDelDia
              tareas={inf.clasificacion_tareas.del_dia}
              tareasLocal={planLocal.tareas}
              onAbrirRedactar={onAbrirRedactar}
            />
          </SubSection>
        )}
        {inf.clasificacion_tareas.pendientes_criticas.length > 0 && (
          <SubSection titulo="🟠 Pendientes críticas (próximos 7 días)">
            <TablaSencilla
              headers={["Tarea", "Deadline", "Notas"]}
              filas={inf.clasificacion_tareas.pendientes_criticas.map((t) => [
                t.titulo,
                t.deadline ?? "—",
                t.notas ?? "—",
              ])}
            />
          </SubSection>
        )}
        {inf.clasificacion_tareas.programables.length > 0 && (
          <SubSection titulo="🟡 Programables (próxima semana)">
            <TablaSencilla
              headers={["Tarea", "Esfuerzo"]}
              filas={inf.clasificacion_tareas.programables.map((t) => [t.titulo, t.esfuerzo ?? "—"])}
            />
          </SubSection>
        )}
        {inf.clasificacion_tareas.backlog.length > 0 && (
          <SubSection titulo="⚪ Backlog">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {inf.clasificacion_tareas.backlog.map((t, i) => (
                <li key={i}>{t.titulo}</li>
              ))}
            </ul>
          </SubSection>
        )}
      </Section>

      {/* Recomendación estratégica */}
      {inf.recomendacion_estrategica.vs_plan_largo.length > 0 && (
        <Section titulo="🎯 Recomendación Estratégica del Día">
          <SubSection titulo="vs Plan a largo plazo">
            <TablaSencilla
              headers={["Tarea de hoy", "Meta estratégica", "Conexión"]}
              filas={inf.recomendacion_estrategica.vs_plan_largo.map((r) => [r.tarea, r.meta, r.conexion])}
            />
          </SubSection>
          {inf.recomendacion_estrategica.si_estancas && (
            <SubSection titulo="Si te estancás">
              <p className="text-sm leading-relaxed">{inf.recomendacion_estrategica.si_estancas}</p>
            </SubSection>
          )}
          {inf.recomendacion_estrategica.cierre_dia.length > 0 && (
            <SubSection titulo="Cierre del día">
              <ul className="space-y-1 text-sm">
                {inf.recomendacion_estrategica.cierre_dia.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span>☐</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </SubSection>
          )}
        </Section>
      )}

      {/* Notas */}
      {inf.notas.length > 0 && (
        <Section titulo="📝 Notas">
          <div className="space-y-4">
            {inf.notas.map((n, i) => (
              <div key={i} className="rounded-md border border-border bg-background p-3">
                <h4 className="text-sm font-semibold">
                  {i + 1}. {n.titulo}
                </h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {n.texto}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Comida */}
      <Section titulo="🍽️ Propuesta de Comida">
        <SubSection titulo="🥗 Plato Base 1 — Desayuno">
          <PlatoBaseView pb={inf.comida.plato_base_desayuno} />
        </SubSection>
        <SubSection titulo="🥗 Plato Base 2 — Comida">
          <PlatoBaseView pb={inf.comida.plato_base_comida} />
        </SubSection>
        {(inf.comida.cambio_20_80.propuesto || inf.comida.cambio_20_80.impacto) && (
          <SubSection titulo="🎯 Cambio 20/80">
            <ul className="space-y-1 text-sm">
              {inf.comida.cambio_20_80.propuesto && (
                <li><strong>Propuesto:</strong> {inf.comida.cambio_20_80.propuesto}</li>
              )}
              {inf.comida.cambio_20_80.impacto && (
                <li><strong>Impacto:</strong> {inf.comida.cambio_20_80.impacto}</li>
              )}
              {inf.comida.cambio_20_80.implementacion && (
                <li><strong>Implementación:</strong> {inf.comida.cambio_20_80.implementacion}</li>
              )}
            </ul>
          </SubSection>
        )}
        {inf.comida.merienda && (
          <SubSection titulo="🥜 Merienda">
            <p className="text-sm">{inf.comida.merienda}</p>
          </SubSection>
        )}
        {inf.comida.cena && (
          <SubSection titulo="🍲 Cena">
            <p className="text-sm">{inf.comida.cena}</p>
          </SubSection>
        )}

        {inf.comida.menu_familiar.length > 0 && (
          <SubSection titulo="🍴 Menú Familiar (MAÑANA y resto de semana)">
            <TablaSencilla
              headers={["Día", "Comida", "Cena"]}
              filas={inf.comida.menu_familiar.map((m) => [m.dia, m.comida, m.cena])}
            />
          </SubSection>
        )}

        {inf.comida.lista_compra.length > 0 && (
          <SubSection titulo="🛒 Lista de la Compra">
            <div className="space-y-2">
              {inf.comida.lista_compra.map((l, i) => (
                <div key={i} className="rounded-md border border-border bg-background p-3">
                  <h5 className="text-sm font-semibold">{l.categoria}</h5>
                  <p className="mt-1 text-sm text-muted-foreground">{l.items}</p>
                </div>
              ))}
            </div>
          </SubSection>
        )}

        {inf.comida.plan_domingo && (
          <SubSection titulo="📋 Plan Domingo (batch cooking)">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {inf.comida.plan_domingo}
            </p>
          </SubSection>
        )}
      </Section>
    </section>
  );
}

// ============================================================================
// Sub-componentes de presentación
// ============================================================================

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{titulo}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SubSection({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function TablaSencilla({ headers, filas }: { headers: string[]; filas: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlatoBaseView({ pb }: { pb: { estructura: string; tiempo: string; variaciones: string[]; base_metabolica: string } }) {
  return (
    <div>
      <p className="text-sm"><strong>Estructura:</strong> {pb.estructura}</p>
      <p className="text-sm"><strong>Tiempo:</strong> {pb.tiempo}</p>
      {pb.variaciones.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-sm">
          {pb.variaciones.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ul>
      )}
      {pb.base_metabolica && (
        <p className="mt-2 text-xs italic text-muted-foreground">{pb.base_metabolica}</p>
      )}
    </div>
  );
}

function TareasTablaDelDia({
  tareas,
  tareasLocal,
  onAbrirRedactar,
}: {
  tareas: InformePlan["clasificacion_tareas"]["del_dia"];
  tareasLocal: TareaLocal[];
  onAbrirRedactar: (t: TareaLocal) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Tarea</th>
            <th className="px-3 py-2">Origen</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Bloque</th>
            <th className="px-3 py-2 text-right">Tiempo</th>
            <th className="px-3 py-2">IA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {tareas.map((t, i) => {
            const tl = tareasLocal[i];
            return (
              <tr key={i}>
                <td className="px-3 py-2 font-bold">{t.id ?? `T${i + 1}`}</td>
                <td className="px-3 py-2 font-medium">{t.titulo}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.origen ?? "—"}</td>
                <td className="px-3 py-2">{t.tipo ?? "—"}</td>
                <td className="px-3 py-2">{t.bloque_energia ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {t.tiempo_min ? `${t.tiempo_min} min` : "—"}
                </td>
                <td className="px-3 py-2">
                  {tl && (
                    <button
                      onClick={() => onAbrirRedactar(tl)}
                      className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700 hover:opacity-90 dark:text-fuchsia-300"
                    >
                      ✍️ Redactar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Modal de redacción (Parte 2)
// ============================================================================

function RedactarModal({
  estado,
  onChange,
  onGenerar,
  onCopiar,
  onGuardar,
  onCerrar,
}: {
  estado: RedactarEstado;
  onChange: (n: RedactarEstado) => void;
  onGenerar: () => void;
  onCopiar: () => void;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCerrar}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">✍️ Redactar borrador</h2>
            <p className="text-xs text-muted-foreground">Tarea: {estado.titulo}</p>
          </div>
          <button onClick={onCerrar} className="text-xl text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Tipo</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={estado.tipo}
                onChange={(e) =>
                  onChange({ ...estado, tipo: e.target.value as RedactarEstado["tipo"] })
                }
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="documento">Documento</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                Destinatario (opcional)
              </span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={estado.destinatario}
                onChange={(e) => onChange({ ...estado, destinatario: e.target.value })}
                placeholder="Tania, gestoría, etc."
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">¿Qué quieres redactar?</span>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={estado.contexto}
              onChange={(e) => onChange({ ...estado, contexto: e.target.value })}
              placeholder="Contexto, puntos a incluir, tono…"
            />
          </label>

          <button
            onClick={onGenerar}
            disabled={estado.generando || !estado.contexto.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {estado.generando ? "Redactando con IA…" : "✨ Generar borrador"}
          </button>

          {estado.error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {estado.error}
            </div>
          )}

          {(estado.asunto || estado.cuerpo) && (
            <div className="space-y-2 border-t border-border pt-3">
              {estado.tipo === "email" && (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">Asunto</span>
                  <input
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    value={estado.asunto}
                    onChange={(e) => onChange({ ...estado, asunto: e.target.value })}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Cuerpo (editable antes de guardar/enviar)
                </span>
                <textarea
                  className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={estado.cuerpo}
                  onChange={(e) => onChange({ ...estado, cuerpo: e.target.value })}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onCopiar}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  📋 Copiar
                </button>
                <button
                  onClick={onGuardar}
                  disabled={estado.guardando}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {estado.guardando ? "Guardando…" : "💾 Guardar borrador"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

async function resolverIdRealTarea(planId: string, titulo: string): Promise<string | null> {
  const supabase = (await import("@/lib/supabase/client")).createClient();
  const { data } = await supabase
    .from("plan_diario_tareas")
    .select("id,titulo_libre")
    .eq("plan_diario_id", planId)
    .order("orden");
  if (!data) return null;
  const match = data.find((t) => t.titulo_libre === titulo);
  return (match?.id as string) ?? null;
}

function fechaToLargaLocal(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}