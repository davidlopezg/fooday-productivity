"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  asignarTareaResultado,
  crearTarea,
  marcarHecha,
  reabrirTarea,
} from "@/lib/mutations";
import {
  fetchMetasConProgreso,
  fetchProyectos,
  fetchTareasSinMeta,
} from "@/lib/queries";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import {
  sugerirTareasDesdeContextoIA,
  type SugerenciaTarea,
} from "@/lib/iaSugerencias";
import type {
  MetaConPlan,
  Proyecto,
  ResultadoConTareas,
  TareaSinMeta,
} from "@/lib/types";
import {
  IconArrowLeft,
  IconInbox,
  IconPlus,
  IconSparkles,
} from "@/components/icons";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import {
  SugerenciasTareasModal,
  type SugerenciaEditada,
} from "@/components/SugerenciasTareasModal";

export default function InboxPage() {
  const inboxQ = useData<TareaSinMeta[]>(fetchTareasSinMeta, [], []);
  const metasQ = useData<MetaConPlan[]>(fetchMetasConProgreso, [], []);
  // Proyectos activos para que la IA pueda asociar las tareas extraídas
  // del email/contexto a uno existente si tiene sentido.
  const proyectosQ = useData<Proyecto[]>(() => fetchProyectos(), []);
  const cfg = useConfig();

  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sugerencias IA a partir del textarea de contexto
  const [contextoIA, setContextoIA] = useState("");
  const [sugerenciasIA, setSugerenciasIA] = useState<SugerenciaTarea[] | null>(null);
  const [sugiriendoIA, setSugiriendoIA] = useState(false);
  const [errorSugIA, setErrorSugIA] = useState<string | null>(null);
  const [aplicandoSugIA, setAplicandoSugIA] = useState(false);

  async function crearYCapturar() {
    if (!nuevoTitulo.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await crearTarea({ titulo: nuevoTitulo.trim(), prioridad: "media" });
      setNuevoTitulo("");
      await inboxQ.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la tarea.");
    } finally {
      setBusy(false);
    }
  }

  async function pedirSugerenciasIA() {
    if (!contextoIA.trim()) {
      setErrorSugIA("Pega primero un email o contexto en el campo de arriba.");
      return;
    }
    if (!cfg.data.minimax_api_key) {
      setErrorSugIA("Configura la clave de IA en /configuracion primero.");
      setSugerenciasIA([]);
      return;
    }
    setSugiriendoIA(true);
    setErrorSugIA(null);
    setSugerenciasIA(null);
    try {
      const proyectosActivos = (proyectosQ.data ?? []).filter(
        (p) => !p.archivado,
      );
      const res = await sugerirTareasDesdeContextoIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        {
          contexto: contextoIA,
          proyectos: proyectosActivos.map((p) => ({ id: p.id, nombre: p.nombre })),
          maxSugerencias: 8,
        },
      );
      setSugerenciasIA(res.sugerencias);
    } catch (e) {
      setErrorSugIA(
        e instanceof Error
          ? e.message
          : "La IA no pudo sugerir tareas a partir de ese texto.",
      );
      setSugerenciasIA([]);
    } finally {
      setSugiriendoIA(false);
    }
  }

  async function aplicarSugerenciasIA(seleccionadas: SugerenciaEditada[]) {
    if (seleccionadas.length === 0) {
      setSugerenciasIA(null);
      return;
    }
    setAplicandoSugIA(true);
    setErrorSugIA(null);
    let creadas = 0;
    const fallidas: string[] = [];
    for (const s of seleccionadas) {
      try {
        await crearTarea({
          titulo: s.titulo.trim(),
          descripcion: s.descripcion.trim() || null,
          prioridad: s.prioridad ?? "media",
        });
        creadas++;
      } catch (e) {
        fallidas.push(s.titulo);
        console.error("[Inbox] fallo creando tarea IA:", s.titulo, e);
      }
    }
    setAplicandoSugIA(false);
    if (creadas > 0) {
      // Si todo fue bien, limpiamos modal + textarea. Si hubo fallos,
      // dejamos el modal abierto con el motivo para que el usuario decida.
      if (fallidas.length === 0) {
        setSugerenciasIA(null);
        setContextoIA("");
        await inboxQ.reload();
      } else {
        setErrorSugIA(
          `Se crearon ${creadas}, pero fallaron: ${fallidas.join(", ")}. Puedes reintentarlas desde el formulario de arriba.`,
        );
        await inboxQ.reload();
      }
    }
  }

  const sinNada = (inboxQ.data ?? []).filter((x) => !x.tiene_meta_sin_resultado);
  const conMetaSinResultado = (inboxQ.data ?? []).filter((x) => x.tiene_meta_sin_resultado);

  return (
    <div className="space-y-6">
      <Link
        href="/tareas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="h-4 w-4" />
        Todas las tareas
      </Link>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <IconInbox className="h-5 w-5" />
              Inbox de tareas
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tareas que o no tienen meta asignada, o tienen meta pero ningún trimestre/resultado concreto. Distínguelo del <Link href="/captura" className="font-medium text-foreground underline-offset-4 hover:underline">/captura</Link> (que es para pensamiento suelto, no para tareas).
            </p>
          </div>
          <HelpDrawer title="Inbox de tareas" items={AYUDA_POR_RUTA["/tareas/inbox"]?.items ?? []} />
        </div>
      </header>

      {/* Captura rápida */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Captura rápida</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Se crea como tarea suelta (sin meta). Luego la asignas a un resultado
          o la dejas aquí.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Título de la nueva tarea"
            className="h-9 min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") crearYCapturar();
            }}
          />
          <button
            onClick={crearYCapturar}
            disabled={busy || !nuevoTitulo.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            Crear
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {/* Sugerir tareas con IA desde un email / contexto */}
      <section className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-4">
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <IconSparkles className="h-4 w-4 text-violet-500" />
              Sugerir tareas con IA
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pega un email, un mensaje o un contexto. La IA extrae las
              tareas accionables y te las muestra para que las edites antes
              de añadirlas al inbox.
            </p>
          </div>
        </header>
        <textarea
          value={contextoIA}
          onChange={(e) => setContextoIA(e.target.value)}
          rows={5}
          placeholder="Pega aquí el email, mensaje o contexto del que quieres extraer tareas…"
          className="mt-3 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={pedirSugerenciasIA}
            disabled={sugiriendoIA || !contextoIA.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            title="La IA lee el texto y propone tareas editables"
          >
            <IconSparkles className="h-4 w-4" />
            {sugiriendoIA ? "Pensando…" : "Sugerir tareas"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            {cfg.data.minimax_api_key
              ? `Modelo: ${cfg.data.model}. La IA solo sugiere; tú decides qué entra.`
              : "⚠️ Configura primero la clave de IA en /configuracion."}
          </p>
        </div>
      </section>

      {/* Listado */}
      {inboxQ.loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Sin meta ({sinNada.length})
            </h2>
            {sinNada.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                No hay tareas sueltas sin meta.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border bg-card">
                {sinNada.map(({ tarea }) => (
                  <TareaInboxRow
                    key={tarea.id}
                    tarea={tarea}
                    metas={metasQ.data ?? []}
                    onChanged={async () => {
                      await inboxQ.reload();
                      await metasQ.reload();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Con meta, sin trimestre ({conMetaSinResultado.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tareas que ya están en una meta pero aún no repartidas por trimestre.
            </p>
            {conMetaSinResultado.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                Todas las tareas de tus metas tienen un trimestre asignado.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border bg-card">
                {conMetaSinResultado.map(({ tarea }) => (
                  <TareaInboxRow
                    key={tarea.id}
                    tarea={tarea}
                    metas={metasQ.data ?? []}
                    onChanged={async () => {
                      await inboxQ.reload();
                      await metasQ.reload();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {sugerenciasIA !== null && (
        <SugerenciasTareasModal
          titulo="Tareas extraídas por la IA"
          subtitulo="Mira el contexto y propone tareas accionables."
          sugerencias={sugerenciasIA}
          busy={aplicandoSugIA}
          error={errorSugIA}
          textoBotonConfirmar={
            `Añadir ${sugerenciasIA.length} tarea${sugerenciasIA.length === 1 ? "" : "s"} al inbox`
          }
          onCancel={() => {
            setSugerenciasIA(null);
            setErrorSugIA(null);
          }}
          onConfirmar={aplicarSugerenciasIA}
        />
      )}
    </div>
  );
}

function TareaInboxRow({
  tarea,
  metas,
  onChanged,
}: {
  tarea: { id: string; titulo: string; estado: string; prioridad: string | null };
  metas: MetaConPlan[];
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const opciones: Array<{
    metaId: string;
    metaTitulo: string;
    resultado: ResultadoConTareas;
  }> = useMemo(() => {
    const out: Array<{
      metaId: string;
      metaTitulo: string;
      resultado: ResultadoConTareas;
    }> = [];
    for (const mp of metas) {
      if (mp.meta.estado === "archivada") continue;
      for (const r of mp.resultados) {
        out.push({
          metaId: mp.meta.id,
          metaTitulo: `${mp.meta.codigo ?? "—"} · ${mp.meta.titulo}`,
          resultado: r,
        });
      }
    }
    return out.sort((a, b) =>
      a.metaTitulo.localeCompare(b.metaTitulo) ||
      a.resultado.periodo.anio - b.resultado.periodo.anio ||
      a.resultado.periodo.numero - b.resultado.periodo.numero,
    );
  }, [metas]);

  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={async () => {
            if (tarea.estado === "hecha") await reabrirTarea(tarea.id);
            else await marcarHecha(tarea.id);
            await onChanged();
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border hover:border-primary"
          title={tarea.estado === "hecha" ? "Reabrir" : "Marcar hecha"}
        >
          {tarea.estado === "hecha" ? "✅" : ""}
        </button>
        <span
          className={`min-w-0 flex-1 ${
            tarea.estado === "hecha" ? "text-muted-foreground line-through" : ""
          }`}
        >
          {tarea.titulo}
        </span>
        {tarea.prioridad && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
            {tarea.prioridad}
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent"
        >
          {open ? "Cerrar" : "Asignar a…"}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-2">
          {opciones.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay resultados. Crea una meta y añade resultados por trimestre.
            </p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {opciones.map((o) => (
                <li key={o.resultado.id}>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await asignarTareaResultado(tarea.id, o.resultado.id);
                        await onChanged();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <span className="block font-medium">{o.resultado.titulo}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {o.metaTitulo} · {o.resultado.periodo.nombre}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}