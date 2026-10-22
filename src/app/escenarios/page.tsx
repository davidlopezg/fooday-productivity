"use client";

// ============================================================================
// /escenarios — Capa de escenarios de proyecto.
// ----------------------------------------------------------------------------
// Qué es (3 dimensiones que NO se solapan):
//   · CONTEXTO  = el pasado. Qué pasó. Cronología append-only.
//   · ESTADO    = el presente MEDIDO. Se calcula de las tareas en cada
//                 render (no es una tabla: si lo fuera, se pudriría).
//   · SITUACIÓN = el presente INTERPRETADO. La lectura que devuelve la IA
//                 + las notas manuales de tipo 'situacion'.
//
// Qué NO es: un oráculo. La IA devuelve escenarios con estrategia, no
// predicciones. La probabilidad es un dato secundario.
//
// Fricción (regla del diseño): UN solo punto de entrada. La lista de
// proyectos es el índice del ritual semanal; dentro de cada proyecto, 2
// acciones: registrar un hecho y pedir el análisis.
// ============================================================================

import { useMemo, useState } from "react";
import { useConfig } from "@/lib/configStore";
import { useData } from "@/lib/useData";
import {
  fetchAreas,
  fetchMetas,
  fetchProyectos,
  fetchProyectosAnalisis,
  fetchProyectosEventos,
  fetchTareas,
} from "@/lib/queries";
import {
  crearEventoProyecto,
  eliminarEventoProyecto,
  guardarAnalisisProyecto,
} from "@/lib/mutations";
import { analizarEscenariosIA } from "@/lib/escenarios/analizarEscenariosIA";
import {
  ESTADOS_ACTIVOS,
  estadoDeProyecto,
  haceCuanto,
} from "@/lib/escenarios/hipotesis";
import { errorMessage } from "@/lib/errors";
import { localYMD } from "@/lib/semana";
import type {
  Area,
  CategoriaHipotesis,
  Hipotesis,
  Meta,
  Proyecto,
  ProyectoAnalisis,
  ProyectoEvento,
  Tarea,
  TipoEventoProyecto,
} from "@/lib/types";
import { IconPlus, IconSparkles, IconTrash } from "@/components/icons";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const ETIQUETA_EVENTO: Record<TipoEventoProyecto, string> = {
  contexto: "Contexto",
  estado: "Estado",
  situacion: "Situación",
};

const TONO_EVENTO: Record<TipoEventoProyecto, string> = {
  contexto: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  estado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  situacion: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

const ETIQUETA_CATEGORIA: Record<CategoriaHipotesis, string> = {
  riesgo: "Riesgo",
  oportunidad: "Oportunidad",
  punto_ciego: "Punto ciego",
  wildcard: "Wildcard",
};

const TONO_CATEGORIA: Record<CategoriaHipotesis, string> = {
  riesgo: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  oportunidad: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  punto_ciego: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  wildcard: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
};

/** Chip informativo (estado, contadores). */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------------
// Tarjeta de hipótesis
// ----------------------------------------------------------------------------

function TarjetaHipotesis({
  h,
  destacada,
}: {
  h: Hipotesis;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        destacada
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background/60"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONO_CATEGORIA[h.categoria]}`}
        >
          {ETIQUETA_CATEGORIA[h.categoria]}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {Math.round(h.probabilidad)}% probable
        </span>
        {destacada && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Más probable
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm font-medium leading-snug">{h.titulo}</p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Qué hago: </span>
        {h.estrategia}
      </p>
      {h.indicador && (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">
          <span className="font-medium">Indicador: </span>
          {h.indicador}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Panel de un proyecto
// ----------------------------------------------------------------------------

function PanelProyecto({
  eventos,
  analisis,
  metas,
  tareas,
  hoy,
  busy,
  onAnalizar,
  onAddEvento,
  onDeleteEvento,
}: {
  eventos: ProyectoEvento[];
  analisis: ProyectoAnalisis[];
  metas: Meta[];
  tareas: Tarea[];
  hoy: string;
  busy: boolean;
  onAnalizar: () => void;
  onAddEvento: (tipo: TipoEventoProyecto, texto: string, fecha: string) => Promise<void>;
  onDeleteEvento: (id: string) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoEventoProyecto>("contexto");
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const estado = useMemo(() => estadoDeProyecto(tareas, hoy), [tareas, hoy]);
  const ultimo = analisis[0] ?? null;
  const anteriores = analisis.slice(1);

  // Hipótesis agrupadas por categoría (el orden de lectura es "qué hago").
  const porCategoria = useMemo(() => {
    if (!ultimo) return [] as Array<[CategoriaHipotesis, Hipotesis[]]>;
    const cats: CategoriaHipotesis[] = [
      "riesgo",
      "oportunidad",
      "punto_ciego",
      "wildcard",
    ];
    return cats
      .map((c) => [c, ultimo.hipotesis.filter((h) => h.categoria === c)] as [CategoriaHipotesis, Hipotesis[]])
      .filter(([, hs]) => hs.length > 0);
  }, [ultimo]);

  async function añadir() {
    if (!texto.trim()) {
      setErrorForm("Escribe qué ha pasado.");
      return;
    }
    setGuardando(true);
    setErrorForm(null);
    try {
      await onAddEvento(tipo, texto, fecha);
      setTexto("");
    } catch (e) {
      setErrorForm(errorMessage(e, "No se pudo guardar el evento"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-4 space-y-5 border-t border-border pt-4">
      {/* ── ESTADO (medido) ── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Estado · presente medido
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{estado.total} tareas</Chip>
          <Chip>{estado.hechas} hechas</Chip>
          <Chip>{estado.abiertas} abiertas</Chip>
          {estado.bloqueadas > 0 && <Chip>{estado.bloqueadas} bloqueadas</Chip>}
          {estado.vencidas > 0 && (
            <Chip>⚠ {estado.vencidas} vencidas</Chip>
          )}
          <Chip>{estado.avance}% avance</Chip>
          {estado.proximoVencimiento && (
            <Chip>próximo: {estado.proximoVencimiento}</Chip>
          )}
        </div>
      </section>

      {/* ── CRONOLOGÍA (contexto) ── */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Cronología · el pasado
        </h4>
        {eventos.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            Sin hechos registrados. La IA analiza mucho mejor con cronología:
            añade abajo lo que va pasando (o dicta el agente de voz).
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {eventos.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
              >
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {e.ocurrido_en}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${TONO_EVENTO[e.tipo]}`}
                >
                  {ETIQUETA_EVENTO[e.tipo]}
                </span>
                <span className="min-w-0 flex-1 text-sm leading-snug">{e.texto}</span>
                <button
                  type="button"
                  onClick={() => void onDeleteEvento(e.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Borrar evento"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Formulario de alta */}
        <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap gap-2">
            {(["contexto", "estado", "situacion"] as TipoEventoProyecto[]).map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    tipo === t
                      ? TONO_EVENTO[t]
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {ETIQUETA_EVENTO[t]}
                </button>
              ),
            )}
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="ml-auto h-8 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Fecha del hecho"
            />
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="¿Qué ha pasado? (una reunión, un email, un cambio de rumbo…)"
            className="w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {errorForm && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorForm}</p>
          )}
          <button
            type="button"
            onClick={() => void añadir()}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            <IconPlus className="h-3.5 w-3.5" />
            {guardando ? "Guardando…" : "Añadir a la cronología"}
          </button>
        </div>
      </section>

      {/* ── ESCENARIOS (futuro) ── */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Escenarios · qué puede pasar
          </h4>
          <button
            type="button"
            onClick={onAnalizar}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <IconSparkles className="h-3.5 w-3.5" />
            {busy ? "Analizando…" : "✨ Analizar escenarios"}
          </button>
        </div>

        {!ultimo ? (
          <p className="mt-2 rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            Sin análisis todavía. Cuando lo pidas, la IA lee la cronología, el
            estado y las metas, y devuelve los escenarios con su estrategia.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {ultimo.situacion && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  Situación · {haceCuanto(ultimo.generado_en, hoy)}
                </p>
                <p className="mt-1 text-sm leading-snug">{ultimo.situacion}</p>
              </div>
            )}

            {porCategoria.map(([cat, hs]) => (
              <div key={cat}>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] ${TONO_CATEGORIA[cat]}`}
                  >
                    {ETIQUETA_CATEGORIA[cat]}
                  </span>
                </p>
                <div className="space-y-2">
                  {hs.map((h, i) => (
                    <TarjetaHipotesis
                      key={`${cat}-${i}`}
                      h={h}
                      destacada={
                        h === ultimo.hipotesis[0] && ultimo.hipotesis.length > 1
                      }
                    />
                  ))}
                </div>
              </div>
            ))}

            {anteriores.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setVerHistorial((v) => !v)}
                  className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {verHistorial
                    ? "Ocultar historial"
                    : `Ver historial (${anteriores.length} análisis anteriores)`}
                </button>
                {verHistorial && (
                  <ul className="mt-2 space-y-1.5">
                    {anteriores.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
                      >
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.generado_en).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                          · {a.hipotesis.length} hipótesis
                        </p>
                        {a.situacion && (
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {a.situacion}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Metas del proyecto (contexto para la IA) ── */}
      {metas.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Metas del proyecto
          </h4>
          <ul className="mt-2 space-y-1.5">
            {metas.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
              >
                <p className="text-sm font-medium leading-snug">{m.titulo}</p>
                {m.situacion_actual && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.situacion_actual}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Página
// ----------------------------------------------------------------------------

export default function EscenariosPage() {
  const { data: cfg } = useConfig();
  const hoy = localYMD(new Date());

  const { data: proyectos } = useData<Proyecto[]>(() => fetchProyectos(), []);
  const { data: areas } = useData<Area[]>(fetchAreas, []);
  const { data: metas } = useData<Meta[]>(fetchMetas, []);
  const { data: tareas } = useData<Tarea[]>(() => fetchTareas(), []);
  const { data: eventos, reload: reloadEventos } = useData<ProyectoEvento[]>(
    fetchProyectosEventos,
    [],
  );
  const { data: analisis, reload: reloadAnalisis } = useData<ProyectoAnalisis[]>(
    fetchProyectosAnalisis,
    [],
  );

  const [abierto, setAbierto] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorIA, setErrorIA] = useState<string | null>(null);

  // Agrupados por proyecto (3-4 proyectos, agrupar en cliente es lo simple).
  const eventosPorProyecto = useMemo(() => {
    const m = new Map<string, ProyectoEvento[]>();
    for (const e of eventos ?? []) {
      const arr = m.get(e.proyecto_id) ?? [];
      arr.push(e);
      m.set(e.proyecto_id, arr);
    }
    return m;
  }, [eventos]);

  const analisisPorProyecto = useMemo(() => {
    const m = new Map<string, ProyectoAnalisis[]>();
    for (const a of analisis ?? []) {
      const arr = m.get(a.proyecto_id) ?? [];
      arr.push(a);
      m.set(a.proyecto_id, arr);
    }
    return m;
  }, [analisis]);

  const areaPorId = useMemo(
    () => new Map((areas ?? []).map((a) => [a.id, a])),
    [areas],
  );

  async function analizar(proyecto: Proyecto) {
    if (!cfg?.minimax_api_key) {
      setErrorIA("Falta la API key de la IA (Configuración).");
      return;
    }
    setBusy(proyecto.id);
    setErrorIA(null);
    try {
      const metasProyecto = (metas ?? []).filter(
        (m) => m.proyecto_id === proyecto.id,
      );
      const tareasProyecto = (tareas ?? []).filter(
        (t) => t.proyecto_id === proyecto.id,
      );
      const resultado = await analizarEscenariosIA(
        cfg.base_url,
        cfg.minimax_api_key,
        cfg.model,
        {
          proyecto: {
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion,
            area: proyecto.area_id
              ? (areaPorId.get(proyecto.area_id)?.nombre ?? null)
              : null,
          },
          eventos: eventosPorProyecto.get(proyecto.id) ?? [],
          estado: estadoDeProyecto(tareasProyecto, hoy),
          metas: metasProyecto.map((m) => ({
            titulo: m.titulo,
            contexto: m.contexto,
            situacion_actual: m.situacion_actual,
            fecha_objetivo: m.fecha_objetivo,
            avance: null,
          })),
          tareas: tareasProyecto
            .filter((t) => ESTADOS_ACTIVOS.includes(t.estado))
            .slice(0, 25)
            .map((t) => ({
              titulo: t.titulo,
              estado: t.estado,
              prioridad: t.prioridad,
              deadline: t.deadline,
            })),
          hoy,
        },
      );

      if (resultado.hipotesis.length === 0) {
        setErrorIA(
          "La IA no devolvió escenarios. Añade más cronología al proyecto e inténtalo de nuevo.",
        );
        return;
      }

      await guardarAnalisisProyecto({
        proyecto_id: proyecto.id,
        situacion: resultado.situacion || null,
        hipotesis: resultado.hipotesis,
        modelo: cfg.model,
      });
      reloadAnalisis();
    } catch (e) {
      setErrorIA(errorMessage(e, "No se pudo generar el análisis"));
    } finally {
      setBusy(null);
    }
  }

  async function addEvento(
    proyectoId: string,
    tipo: TipoEventoProyecto,
    texto: string,
    fecha: string,
  ) {
    await crearEventoProyecto({ proyecto_id: proyectoId, tipo, texto, ocurrido_en: fecha });
    reloadEventos();
  }

  async function borrarEvento(id: string) {
    await eliminarEventoProyecto(id);
    reloadEventos();
  }

  const lista = proyectos ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Escenarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un proyecto es vivo. Aquí queda lo que ya pasó, dónde está hoy y qué
          puede pasar — con la estrategia de cada caso. La IA no adivina: te
          devuelve los caminos que no estabas viendo.
        </p>
      </header>

      {errorIA && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {errorIA}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No hay proyectos activos. Créalos en{" "}
          <span className="font-mono">/proyectos</span>.
        </p>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => {
            const evs = eventosPorProyecto.get(p.id) ?? [];
            const ans = analisisPorProyecto.get(p.id) ?? [];
            const ultimo = ans[0] ?? null;
            const area = p.area_id ? (areaPorId.get(p.area_id) ?? null) : null;
            const estaAbierto = abierto === p.id;

            return (
              <article
                key={p.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAbierto(estaAbierto ? null : p.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color ?? "#64748b" }}
                      />
                      {p.nombre}
                      {area && (
                        <span className="text-[11px] font-normal text-muted-foreground">
                          · {area.nombre}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {evs.length} hecho(s) en la cronología ·{" "}
                      {ultimo
                        ? `último análisis ${haceCuanto(ultimo.generado_en, hoy)} (${ultimo.hipotesis.length} escenarios)`
                        : "sin análisis"}
                    </p>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void analizar(p)}
                      disabled={busy === p.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                    >
                      <IconSparkles className="h-3.5 w-3.5" />
                      {busy === p.id ? "Analizando…" : "Analizar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbierto(estaAbierto ? null : p.id)}
                      aria-label={estaAbierto ? "Cerrar" : "Abrir"}
                      className="rounded-md border border-border px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {estaAbierto ? "▴" : "▾"}
                    </button>
                  </div>
                </div>

                {estaAbierto && (
                  <PanelProyecto
                    eventos={evs}
                    analisis={ans}
                    metas={(metas ?? []).filter((m) => m.proyecto_id === p.id)}
                    tareas={(tareas ?? []).filter((t) => t.proyecto_id === p.id)}
                    hoy={hoy}
                    busy={busy === p.id}
                    onAnalizar={() => void analizar(p)}
                    onAddEvento={(tipo, texto, fecha) =>
                      addEvento(p.id, tipo, texto, fecha)
                    }
                    onDeleteEvento={(id) => borrarEvento(id)}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
