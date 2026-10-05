"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchEstatusPorFecha,
  fetchHabitosHistorico,
} from "@/lib/queries";
import { eliminarEstatus } from "@/lib/mutations";
import {
  calcularRachas,
  calcularScoreHabitos,
  compararCon7Dias,
  detectarPatronSemanal,
  elegirMicroAccion,
  evaluarAuditoria20_80,
  estadoHabito,
  etiquetaHabito,
  nombreDia,
  validarCoherenciaCierre,
} from "@/lib/estatus";
import { ScoreHabitos } from "@/components/ScoreHabitos";
import { MicroAccionCard } from "@/components/MicroAccionCard";
import { Auditoria20_80 } from "@/components/Auditoria20_80";
import { CierreCognitivo } from "@/components/CierreCognitivo";
import { ComidasList } from "@/components/ComidasEditor";
import { HABITOS_META } from "@/lib/types";
import {
  IconClipboardCheck,
  IconPencil,
  IconTrash,
} from "@/components/icons";
import type { EstatusConComidas, Semaforo } from "@/lib/types";

export default function EstatusDetallePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <EstatusDetalleInner />
    </Suspense>
  );
}

function Cargando() {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      Cargando…
    </p>
  );
}

function EstatusDetalleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fecha = searchParams.get("fecha");
  const [estatus, setEstatus] = useState<EstatusConComidas | null | undefined>(
    undefined,
  );
  const [historico, setHistorico] = useState<EstatusConComidas[]>([]);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    if (!fecha) {
      setEstatus(null);
      return;
    }
    let alive = true;
    Promise.all([fetchEstatusPorFecha(fecha), fetchHabitosHistorico(60)])
      .then(([e, h]) => {
        if (!alive) return;
        setEstatus(e);
        setHistorico(h.filter((x) => x.fecha !== fecha));
      })
      .catch(() => {
        if (alive) setEstatus(null);
      });
    return () => {
      alive = false;
    };
  }, [fecha]);

  // Cálculos puros
  const calculos = useMemo(() => {
    if (!estatus) return null;
    const scoreObj = calcularScoreHabitos(estatus);
    const cmp = compararCon7Dias(estatus, historico.slice(0, 7));
    const rachas = calcularRachas(historico, estatus);
    const patron = detectarPatronSemanal(historico, estatus);
    const micro = elegirMicroAccion(estatus, rachas, patron, scoreObj.score);
    const audit = evaluarAuditoria20_80(estatus);
    const coherencia = validarCoherenciaCierre(estatus);
    return { scoreObj, cmp, rachas, patron, micro, audit, coherencia };
  }, [estatus, historico]);

  async function onEliminar() {
    if (!estatus) return;
    if (!window.confirm(`¿Eliminar el estatus del ${fecha}? Esta acción no se puede deshacer.`)) return;
    setBorrando(true);
    try {
      await eliminarEstatus(estatus.id);
      router.push("/estatus");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
      setBorrando(false);
    }
  }

  // === Estados de carga ===
  if (!fecha) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Falta el parámetro <code>?fecha=YYYY-MM-DD</code> en la URL.
        </p>
        <Link
          href="/estatus"
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ir al listado
        </Link>
      </div>
    );
  }
  if (estatus === undefined) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Cargando estatus del {fecha}…
      </p>
    );
  }
  if (estatus === null) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay estatus guardado para el {fecha}.
        </p>
        <Link
          href="/estatus/nuevo"
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Crearlo
        </Link>
      </div>
    );
  }

  if (!calculos) return null;
  const { scoreObj, cmp, rachas, patron, micro, audit, coherencia } = calculos;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <IconClipboardCheck className="h-6 w-6" />
            Estatus del {fecha}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {estatus.semaforo && (
              <SemaforoBadge s={estatus.semaforo} />
            )}
            <ScoreHabitos
              estatus={estatus}
              media7d={cmp.media}
              delta7d={cmp.delta}
              semaforo={cmp.semaforo}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/estatus/editar?fecha=${fecha}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <IconPencil className="h-3.5 w-3.5" />
            Editar
          </Link>
          <button
            onClick={onEliminar}
            disabled={borrando}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
          >
            <IconTrash className="h-3.5 w-3.5" />
            {borrando ? "Borrando…" : "Eliminar"}
          </button>
        </div>
      </header>

      {/* Advertencia de coherencia */}
      {!coherencia.ok && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Coherencia del cierre: {coherencia.motivo}
        </p>
      )}

      {/* === 1. Reflexión del agente (si existe) === */}
      <Seccion emoji="🌅" titulo="Reflexión del día">
        {estatus.reflexion_agente?.trim() ? (
          <p className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
            {estatus.reflexion_agente}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
            Sin reflexión del agente. Se rellenará cuando invoques al agente
            LLM desde el chat.
          </p>
        )}
      </Seccion>

      {/* === 2. Análisis de productividad === */}
      <Seccion emoji="📊" titulo="Análisis de productividad">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSimple label="Tareas profesionales" v={estatus.tareas_profesionales} />
          <CampoSimple label="Tareas personales" v={estatus.tareas_personales} />
          <CampoSimple label="¿Trabajaste en tu futuro ideal?" v={estatus.trabajo_futuro_ideal} />
          <CampoSimple label="Tareas nuevas que entraron" v={estatus.tareas_nuevas} />
          <CampoSimple label="Correos/mensajes importantes" v={estatus.correos_importantes} />
          <CampoSimple label="Tareas que no pudiste terminar" v={estatus.tareas_no_terminadas} />
        </div>
      </Seccion>

      {/* === 3. Vida personal y relaciones === */}
      <Seccion emoji="💚" titulo="Vida personal y relaciones">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSimple label="Tiempo con tu mujer" v={estatus.tiempo_pareja} />
          <CampoSimple label="Tiempo con tu hija" v={estatus.tiempo_hija} />
          <CampoSimple label="Tareas del hogar" v={estatus.tareas_hogar} />
          <CampoSimple label="Acto de bondad" v={estatus.acto_de_bondad} />
        </div>
      </Seccion>

      {/* === 4. Bienestar y hábitos (UNIFICADO) === */}
      <Seccion emoji="🏃" titulo="Bienestar y hábitos">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSimple
            label="Cuerpo"
            v={estatus.cuido_cuerpo}
          />
          <CampoSimple
            label="Mente subconsciente"
            v={estatus.mente_subconsciente}
          />
          <CampoSimple
            label="Móvil"
            v={
              estatus.uso_movil_min !== null
                ? `${estatus.uso_movil_min} min${
                    estatus.uso_movil_min > 90 ? " (> 1h30)" : ""
                  }`
                : null
            }
          />
        </div>
        {/* Comidas */}
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            🍽️ Comidas
          </h3>
          <ComidasList comidas={estatus.comidas ?? []} />
        </div>
      </Seccion>

      {/* === 5. Hábitos y comportamiento === */}
      <Seccion emoji="🧭" titulo="Hábitos y comportamiento">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left">Hábito</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2 text-center">Racha</th>
                <th className="px-3 py-2 text-left">Momento</th>
              </tr>
            </thead>
            <tbody>
              {HABITOS_META.map((m) => {
                const estado = estadoHabito(estatus, m.id);
                const racha = rachas.find((r) => r.id === m.id);
                return (
                  <tr key={m.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2">
                      <span className="mr-1">{m.emoji}</span>
                      {m.nombre}
                      {m.opcional && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          opcional
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-base">
                      {etiquetaHabito(estado)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {racha && racha.racha >= 3 ? (
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          🔥 {racha.racha}d
                        </span>
                      ) : racha?.rota ? (
                        <span className="text-red-600 dark:text-red-400">
                          💔 {racha.racha}d
                        </span>
                      ) : racha && racha.racha > 0 ? (
                        <span className="text-muted-foreground">{racha.racha}d</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {m.momento}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Comparativa + patrón */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Comparación 7 días
            </div>
            {cmp.suficiente ? (
              <p>
                Score hoy: <b>{scoreObj.score}/100</b> · media 7d:{" "}
                <b>{cmp.media}/100</b> · delta:{" "}
                <b>
                  {cmp.delta > 0 ? "+" : ""}
                  {cmp.delta}
                </b>{" "}
                {cmp.semaforo}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Primer registro — sin comparación posible.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Patrón semanal
            </div>
            {patron.suficiente && patron.peorDia !== null ? (
              <p>
                Tu peor día:{" "}
                <b className="capitalize">
                  {nombreDia(patron.peorDia)}
                </b>{" "}
                (score medio {patron.peorDiaScore}%).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Patrón insuficiente — faltan {28 - (patron.semanasCubiertas * 7)} días
                de histórico.
              </p>
            )}
          </div>
        </div>

        {/* Micro-acción priorizada */}
        <div className="mt-4">
          <MicroAccionCard micro={micro} />
        </div>
      </Seccion>

      {/* === 6. Lo que hiciste bien === */}
      <Seccion emoji="🌟" titulo="Lo que hiciste bien">
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoSimple label="Logros" v={estatus.lo_que_hiciste_bien} />
          <CampoSimple label="Agradeciste" v={estatus.agradecimientos} />
          <CampoSimple label="Ideas nuevas" v={estatus.ideas_nuevas} />
        </div>
      </Seccion>

      {/* === 7. Cierre cognitivo (5 preguntas) === */}
      <Seccion emoji="🧠" titulo="Cierre cognitivo (5 preguntas)">
        <CierreCognitivo estatus={estatus} />
      </Seccion>

      {/* === 8. Patrones a observar (heurística local) === */}
      <Seccion emoji="🔄" titulo="Patrones a observar">
        {audit.contras.length > 0 || (estatus.bloqueos_procrastinacion?.trim() ?? "").length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {estatus.bloqueos_procrastinacion?.trim() && (
              <li>
                <b>Bloqueo:</b> {estatus.bloqueos_procrastinacion}
              </li>
            )}
            {audit.contras.map((c, i) => (
              <li key={i}>
                <b>Contra:</b> {c}
              </li>
            ))}
            {patron.suficiente && patron.peorDia !== null && (
              <li>
                Patrón semanal: <b className="capitalize">{nombreDia(patron.peorDia)}</b>{" "}
                es tu peor día ({patron.peorDiaScore}%).
              </li>
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin patrones negativos detectados para este día.
          </p>
        )}
      </Seccion>

      {/* === 9. Análisis 20/80 + intenciones === */}
      <Seccion emoji="🎯" titulo="Análisis 20/80 + intenciones">
        <Auditoria20_80 estatus={estatus} />
        <h3 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">
          Criterios foco vs ruido
        </h3>
        <ul className="space-y-1 text-sm">
          {audit.criterios.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <span>{c.ok ? "✅" : c.parcial ? "⚠️" : "❌"}</span>
              <span className={c.ok ? "" : "text-muted-foreground"}>
                {c.label}
                {c.parcial && !c.ok && " (parcial)"}
              </span>
            </li>
          ))}
        </ul>
        <h3 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">
          Intenciones para mañana
        </h3>
        <CampoSimple
          label=""
          v={estatus.cierre_primer_problema_manana}
        />
      </Seccion>

      {/* === 10. Podés soltar hoy === */}
      <Seccion emoji="📝" titulo="Podés soltar hoy">
        <CampoSimple label="" v={estatus.podes_soltar} />
      </Seccion>

      {/* === 11. Cierre + ¿Ganó el día? === */}
      <Seccion emoji="💬" titulo="Cierre">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              A favor
            </div>
            {audit.pros.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {audit.pros.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              En contra
            </div>
            {audit.contras.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {audit.contras.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">—</p>
            )}
          </div>
          <div className="border-t border-border pt-3">
            <span className="text-base font-bold">
              ¿Ganó el día?{" "}
            </span>
            <VeredictoGanado audit={audit} />
          </div>
        </div>
      </Seccion>
    </div>
  );
}

// ============================================================================
// Sub-componentes del detalle
// ============================================================================

function Seccion({
  emoji,
  titulo,
  children,
}: {
  emoji: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">
        <span className="mr-1.5">{emoji}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function CampoSimple({ label, v }: { label: string; v: string | null | undefined }) {
  if (!v || !v.trim()) {
    if (!label) return null;
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">—</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      {label && (
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{v}</p>
    </div>
  );
}

function SemaforoBadge({ s }: { s: Semaforo }) {
  const map = {
    verde: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    amarillo: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    rojo: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  } as const;
  const label = { verde: "🟢 Verde", amarillo: "🟡 Amarillo", rojo: "🔴 Rojo" } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${map[s]}`}
    >
      {label[s]}
    </span>
  );
}

function VeredictoGanado({ audit }: { audit: ReturnType<typeof evaluarAuditoria20_80> }) {
  if (audit.ganoElDia === "sí") {
    return <span className="text-emerald-600 dark:text-emerald-400">✅ Sí</span>;
  }
  if (audit.ganoElDia === "parcial") {
    return <span className="text-amber-600 dark:text-amber-400">⚠️ Parcial</span>;
  }
  return <span className="text-red-600 dark:text-red-400">❌ No</span>;
}
