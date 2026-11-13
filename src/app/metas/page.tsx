"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchMetasConProgreso, fetchProyectos } from "@/lib/queries";
import { archivarMeta, eliminarMeta, marcarWig } from "@/lib/mutations";
import { useData } from "@/lib/useData";
import { useConfig } from "@/lib/configStore";
import { HelpDrawer, AYUDA_POR_RUTA } from "@/components/HelpDrawer";
import { EditarMetaModal } from "@/components/EditarMetaModal";
import { SugerirWigsModal } from "@/components/SugerirWigsModal";
import { PanelWigMetas } from "@/components/PanelWigMetas";
import { IconSearch } from "@/components/icons";
import { sugerirWigsIA, type SugerirWigsResultado } from "@/lib/plan";
import type { AmbitoMeta, MetaConPlan, Proyecto } from "@/lib/types";
import {
  IconArchive,
  IconColumns,
  IconInbox,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconTarget,
  IconTrash,
} from "@/components/icons";

const ESTADO: Record<string, string> = {
  sin_empezar: "bg-muted text-muted-foreground border-border",
  en_progreso: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  bloqueada: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  completada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  archivada: "bg-muted text-muted-foreground border-border",
};

const ESTADO_DOT: Record<string, string> = {
  sin_empezar: "bg-slate-400",
  en_progreso: "bg-amber-500",
  bloqueada: "bg-red-500",
  completada: "bg-emerald-500",
  archivada: "bg-slate-300",
};

const AMBITO_BADGE: Record<AmbitoMeta, string> = {
  personal:
    "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
  profesional:
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
};

const AMBITO_LABEL: Record<AmbitoMeta, string> = {
  personal: "👤 Personal",
  profesional: "💼 Profesional",
};

type Filtro = "todas" | AmbitoMeta | "archivadas";

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export default function MetasPage() {
  const { data: metas, loading, reload, error } = useData<MetaConPlan[]>(
    fetchMetasConProgreso,
    [],
  );
  // Proyectos: para mostrar de qué proyecto es cada meta (migration 0024).
  // La meta guarda `proyecto_id`; el nombre y color viven en `proyectos`.
  const { data: proyectos } = useData<Proyecto[]>(() => fetchProyectos(), []);
  const proyectosById = useMemo(
    () => new Map((proyectos ?? []).map((p) => [p.id, p])),
    [proyectos],
  );
  const cfg = useConfig();

  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [tagsSel, setTagsSel] = useState<Set<string>>(new Set());
  /** Texto del buscador de la tabla (título, código, descripción, tags,
   *  KRs y proyecto). */
  const [q, setQ] = useState("");
  /** Filtro por proyecto: "" = todos, "sin" = sin proyecto, o un id. */
  const [proyectoSel, setProyectoSel] = useState<string>("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [errorWig, setErrorWig] = useState<string | null>(null);
  const [editando, setEditando] = useState<MetaConPlan | null>(null);
  /** ID de la meta que estamos eliminando (spinner del botón papelera). */
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Sugerencias IA
  const [sugerencias, setSugerencias] = useState<SugerirWigsResultado | null>(null);
  const [sugiriendo, setSugiriendo] = useState(false);
  const [errorSug, setErrorSug] = useState<string | null>(null);
  const [applyingSugId, setApplyingSugId] = useState<string | null>(null);

  const wigs = useMemo(
    () =>
      metas
        .filter((m) => m.meta.es_wig)
        .sort((a, b) => (a.meta.wig_orden ?? 9) - (b.meta.wig_orden ?? 9)),
    [metas],
  );

  /** Todos los tags únicos de las metas del usuario, ordenados alfabéticamente. */
  const todosLosTags = useMemo(() => {
    const s = new Set<string>();
    for (const m of metas) {
      for (const t of m.meta.tags ?? []) s.add(t);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "es"));
  }, [metas]);

  const filtradas = useMemo(() => {
    let res = metas;
    // Por defecto ocultamos las archivadas. Si el filtro 'archivadas'
    // está activo, mostramos solo esas. Esto se sincroniza con la barra
    // de filtro de ámbito (todas / personal / profesional / archivadas).
    if (filtro === "archivadas") {
      res = res.filter((m) => m.meta.estado === "archivada");
    } else {
      res = res.filter((m) => m.meta.estado !== "archivada");
      if (filtro !== "todas") res = res.filter((m) => m.meta.ambito === filtro);
    }
    if (tagsSel.size > 0) {
      res = res.filter((m) =>
        (m.meta.tags ?? []).some((t) => tagsSel.has(t)),
      );
    }
    // Filtro por proyecto ("" = todos, "sin" = metas sin proyecto).
    if (proyectoSel) {
      res = res.filter((m) =>
        proyectoSel === "sin"
          ? !m.meta.proyecto_id
          : m.meta.proyecto_id === proyectoSel,
      );
    }
    // Buscador de texto: mira en TODO lo que identifica a una meta.
    const texto = q.trim().toLowerCase();
    if (texto) {
      const palabras = texto.split(/\s+/).filter(Boolean);
      res = res.filter((m) => {
        const proyecto = m.meta.proyecto_id
          ? proyectosById.get(m.meta.proyecto_id)?.nombre ?? ""
          : "";
        const heno = [
          m.meta.titulo,
          m.meta.codigo ?? "",
          m.meta.descripcion ?? "",
          m.meta.plazo ?? "",
          proyecto,
          ...(m.meta.tags ?? []),
          ...m.resultados.map((r) => r.titulo),
        ]
          .join(" ")
          .toLowerCase();
        // Todas las palabras tienen que aparecer (AND): "sol meta" acota
        // más que "sol o meta".
        return palabras.every((p) => heno.includes(p));
      });
    }
    return res;
  }, [metas, filtro, tagsSel, proyectoSel, q, proyectosById]);

  function toggleTag(t: string) {
    setTagsSel((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function toggleWig(mp: MetaConPlan) {
    setErrorWig(null);
    setGuardandoId(mp.meta.id);
    try {
      const ok = await marcarWig(mp.meta.id, !mp.meta.es_wig);
      if (!ok) {
        setErrorWig(
          "Ya tienes 3 WIG activos. Quita uno antes de añadir otro.",
        );
      } else {
        await reload();
      }
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoId(null);
    }
  }

  async function archivarMetaCard(mp: MetaConPlan) {
    const archivando = mp.meta.estado !== "archivada";
    const accion = archivando ? "archivar" : "desarchivar";
    const krsCount = mp.resultados.length;
    const tareasCount = mp.total_tareas;
    let msg = `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${mp.meta.titulo}"?`;
    if (archivando) {
      msg += `\n\nLa meta deja de contar para WIGs y se oculta de /metas (sigue visible en el filtro “🗄️ Archivadas”).`;
      if (krsCount > 0 || tareasCount > 0) {
        msg += `\nSus ${krsCount} KR${krsCount === 1 ? "" : "s"} y ${tareasCount} tarea${tareasCount === 1 ? "" : "s"} NO se archivan automáticamente — se hace desde sus propias pantallas si quieres arrastrar la cascada.`;
      }
      msg += `\n\nPuedes desarchivar la meta después para revertir.`;
    } else {
      msg += `\n\nVolverá a estar activa en /metas.`;
    }
    if (!confirm(msg)) return;
    setGuardandoId(mp.meta.id);
    try {
      await archivarMeta(mp.meta.id, archivando);
      await reload();
    } catch (e) {
      setErrorWig(
        e instanceof Error ? e.message : `No se pudo ${accion}`,
      );
    } finally {
      setGuardandoId(null);
    }
  }

  async function eliminarMetaCard(mp: MetaConPlan) {
    const krsCount = mp.resultados.length;
    const tareasCount = mp.total_tareas;
    // Estimación de tareas activas (las no hechas): lo que da el campo
    // derivado mp.total_tareas - mp.tareas_hechas. Las archivadas también
    // dejarán de tener meta al borrar (el SET NULL es universal), así que
    // el aviso cubre el total sin distinguir.
    const tareasActivas = Math.max(0, tareasCount - mp.tareas_hechas);
    let msg = `¿Eliminar la meta "${mp.meta.titulo}"?`;
    msg += `\n\nEsta acción NO se puede deshacer. Impacto:`;
    if (krsCount > 0) {
      msg += `\n  · ${krsCount} KR${krsCount === 1 ? "" : "s"} quedará${krsCount === 1 ? "á" : "án"} huérfano${krsCount === 1 ? "" : "s"} (siguen vivos, sin meta padre)`;
    }
    if (tareasCount > 0) {
      msg += `\n  · ${tareasCount} tarea${tareasCount === 1 ? "" : "s"} (${tareasActivas} activa${tareasActivas === 1 ? "" : "s"} + ${tareasCount - tareasActivas} hecha${tareasCount - tareasActivas === 1 ? "" : "s"}/archivada${tareasCount - tareasActivas === 1 ? "" : "s"}) quedará${tareasCount === 1 ? "á" : "án"} sin meta asignada`;
    }
    if (mp.meta.es_wig) {
      msg += `\n  · la meta dejará de ser WIG (se libera el slot)`;
    }
    if (krsCount === 0 && tareasCount === 0) {
      msg += `\n  · esta meta no tiene KRs ni tareas, así que el borrado es limpio`;
    }
    msg += `\n\n💡 Si solo quieres dejarla de lado pero poder recuperarla, usa el botón Archivar (junto a este).`;
    if (!confirm(msg)) return;
    setEliminandoId(mp.meta.id);
    try {
      await eliminarMeta(mp.meta.id);
      await reload();
    } catch (e) {
      alert(`No se pudo eliminar: ${e instanceof Error ? e.message : "error desconocido"}`);
    } finally {
      setEliminandoId(null);
    }
  }

  async function abrirSugerencias() {
    if (!cfg.data.minimax_api_key) {
      setErrorSug("Configura la clave de IA en /configuracion primero.");
      setSugerencias({ sugerencias: [], prompt_usado: "" });
      return;
    }
    setSugiriendo(true);
    setErrorSug(null);
    setSugerencias(null);
    try {
      const metasActivas = metas.filter(
        (m) =>
          m.meta.estado !== "archivada" &&
          m.meta.estado !== "completada",
      );
      const wigsActuales = wigs.map((w) => w.meta.id);
      const res = await sugerirWigsIA(
        cfg.data.base_url,
        cfg.data.minimax_api_key,
        cfg.data.model,
        {
          metas: metasActivas.map((m) => ({
            id: m.meta.id,
            codigo: m.meta.codigo,
            titulo: m.meta.titulo,
            descripcion: m.meta.descripcion,
            ambito: m.meta.ambito,
            estado: m.meta.estado,
            prioridad: m.meta.prioridad,
            plazo: m.meta.plazo,
            tags: m.meta.tags,
            num_krs: m.resultados.length,
            num_tareas: m.total_tareas,
            num_tareas_hechas: m.tareas_hechas,
          })),
          wigs_ya_marcados: wigsActuales,
        },
      );
      setSugerencias(res);
    } catch (e) {
      setErrorSug(
        e instanceof Error ? e.message : "La IA no pudo sugerir WIGs.",
      );
    } finally {
      setSugiriendo(false);
    }
  }

  async function aplicarSugerencia(metaId: string): Promise<boolean> {
    if (wigs.some((w) => w.meta.id === metaId)) return true;
    setApplyingSugId(metaId);
    try {
      const ok = await marcarWig(metaId, true);
      if (!ok) {
        setErrorWig("Ya tienes 3 WIG activos. Quita uno antes de añadir otro.");
        return false;
      }
      await reload();
      return true;
    } catch (e) {
      setErrorWig(e instanceof Error ? e.message : "No se pudo aplicar");
      return false;
    } finally {
      setApplyingSugId(null);
    }
  }

  const conteoPersonal = metas.filter((m) => m.meta.ambito === "personal").length;
  const conteoProfesional = metas.filter(
    (m) => m.meta.ambito === "profesional",
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas / OKR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "…" : metas.length} metas ·{" "}
            {wigs.length} marcada{wigs.length === 1 ? "" : "s"} como WIG (foco).{" "}
            <span className="text-[11px] text-muted-foreground/80">
              “OKR” = la fila completa (meta + KRs + tareas). “WIG” = la meta a la que le dedicas energía desproporcionada.
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpDrawer title="Metas" items={AYUDA_POR_RUTA["/metas"]?.items ?? []} />
          <button
            type="button"
            onClick={abrirSugerencias}
            disabled={sugiriendo}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
            title="La IA analiza tus metas y sugiere 3 WIGs con razones"
          >
            <IconSparkles className="h-4 w-4" />
            {sugiriendo ? "Pensando…" : "Sugerir 3 WIGs"}
          </button>
          <Link
            href="/agente"
            className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-card px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
          >
            <IconSparkles className="h-4 w-4" />
            Agente
          </Link>
          <Link
            href="/metas/auditoria"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-card px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
            title="Ver qué metas les falta contexto, proyecto, fecha objetivo…"
          >
            <IconSparkles className="h-4 w-4" />
            Auditoría
          </Link>
          <Link
            href="/tareas/inbox"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconInbox className="h-4 w-4" />
            Inbox
          </Link>
          <Link
            href="/metas/plan"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <IconColumns className="h-4 w-4" />
            Plan trimestral
          </Link>
          <Link
            href="/metas/nueva"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nueva meta
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <p className="font-medium">No se pudieron cargar las metas.</p>
          <p className="mt-1 break-words text-xs opacity-90">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center justify-center min-h-10 mt-2 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-medium hover:bg-red-500/10"
          >
            Reintentar
          </button>
        </div>
      )}

      {errorWig && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {errorWig}
        </p>
      )}

      {/* Panel WIG — siempre arriba, antes del listado.
          Issue #47: aquí solo las 3 metas WIG (sin los KRs debajo): en
          /metas los KRs se consultan al abrir la meta y el panel se
          quedaba enorme sin aportar nada. En /tareas sí se muestran,
          porque es donde se ejecuta y necesitas ver el KR que mueves. */}
      <PanelWigMetas
        wigs={wigs}
        onQuitar={(id) => toggleWig(metas.find((m) => m.meta.id === id)!)}
        guardandoId={guardandoId}
        mostrarKRs={false}
        compacto
      />

      {/* Buscador + filtro por proyecto. En una tabla de 15+ metas esto
          es lo que hace que se pueda encontrar una sin recorrerla a ojo. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar meta… (título, código, descripción, tags, KRs)"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {/* Issue #52: mismo problema que en /krs — un <select> se
            dimensiona con la opción más larga y no puede encogerse, así
            que en el móvil el filtro de proyecto se salía de la pantalla.
            w-full en móvil + sm:w-auto en escritorio. */}
        <select
          value={proyectoSel}
          onChange={(e) => setProyectoSel(e.target.value)}
          className="h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          title="Filtrar por proyecto"
        >
          <option value="">Todos los proyectos</option>
          <option value="sin">Sin proyecto</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.archivado ? " (archivado)" : ""}
            </option>
          ))}
        </select>
        {(q.trim() || proyectoSel) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setProyectoSel("");
            }}
            className="h-9 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            limpiar
          </button>
        )}
        <span className="text-xs tabular-nums text-muted-foreground">
          {filtradas.length} de {metas.length}
        </span>
      </div>

      {/* Filtro por ámbito */}
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1 text-xs">
        {(
          [
            { id: "todas", label: `Todas (${metas.length})` },
            { id: "personal", label: `👤 Personales (${conteoPersonal})` },
            { id: "profesional", label: `💼 Profesionales (${conteoProfesional})` },
            {
              id: "archivadas",
              label: `🗄️ Archivadas (${metas.filter((mm) => mm.meta.estado === "archivada").length})`,
            },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id as Filtro)}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              filtro === f.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtro por tags (AND con el filtro de ámbito) */}
      {todosLosTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-2 text-xs">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          {todosLosTags.map((t) => {
            const activo = tagsSel.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                aria-pressed={activo}
                className={`rounded-full border px-2.5 py-1 transition-colors ${
                  activo
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                #{t}
                {activo && <span className="ml-1">×</span>}
              </button>
            );
          })}
          {tagsSel.size > 0 && (
            <button
              type="button"
              onClick={() => setTagsSel(new Set())}
              className="ml-auto text-[11px] text-muted-foreground underline-offset-4 hover:underline"
            >
              limpiar ({tagsSel.size})
            </button>
          )}
        </div>
      )}

      {/* ==================================================================
          LISTADO — TABLA (escritorio) + filas compactas (móvil)

          POR QUÉ TABLA Y NO TARJETAS (petición de David: "más operativo")
          Las tarjetas obligaban a hacer scroll para comparar 15 metas: cada
          una ocupaba media pantalla y solo se veían 4 a la vez. En tabla,
          las 15 metas caben de un vistazo y se comparan por COLUMNA (estado,
          proyecto, KRs, progreso). Es la vista de gestión; el detalle
         Following sigue en /metas/detalle.
          ================================================================== */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-9 px-2 py-2.5" title="WIG (foco)">
                <span className="sr-only">WIG</span>
              </th>
              <th className="px-3 py-2.5 font-medium">Meta</th>
              <th className="px-3 py-2.5 font-medium">Estado</th>
              <th className="px-3 py-2.5 font-medium">Ámbito</th>
              <th className="px-3 py-2.5 font-medium">Proyecto</th>
              <th className="px-3 py-2.5 font-medium">KRs (resultados)</th>
              <th className="px-3 py-2.5 font-medium">Progreso</th>
              <th className="px-3 py-2.5 font-medium">Plazo</th>
              <th className="px-3 py-2.5 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((mp) => {
              const m = mp.meta;
              const proyecto = m.proyecto_id
                ? proyectosById.get(m.proyecto_id)
                : null;
              const periodosUnicos = new Set(
                mp.resultados.flatMap((r) =>
                  r.periodos.length > 0
                    ? r.periodos.map((p) => p.id)
                    : r.periodo.id
                      ? [r.periodo.id]
                      : [],
                ),
              );
              return (
                <tr
                  key={m.id}
                  className={`group border-b border-border/60 last:border-0 hover:bg-accent/40 ${
                    m.es_wig ? "bg-violet-500/[0.04]" : ""
                  }`}
                >
                  {/* ── WIG (toggle) ── */}
                  <td className="px-2 py-2.5 align-top">
                    <button
                      type="button"
                      onClick={() => toggleWig(mp)}
                      disabled={guardandoId === m.id}
                      className={`rounded-full p-1 transition-colors disabled:opacity-50 ${
                        m.es_wig
                          ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                          : "text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground"
                      }`}
                      title={
                        m.es_wig
                          ? `Quitar de Enormemente Importantes (WIG #${m.wig_orden ?? "?"})`
                          : "Marcar como WIG"
                      }
                      aria-label={m.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                      aria-pressed={m.es_wig}
                    >
                      {guardandoId === m.id ? (
                        <span className="block h-4 w-4 text-center text-[10px]">…</span>
                      ) : (
                        <IconTarget className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  {/* ── Meta (código, título, descripción, tags) ── */}
                  <td className="max-w-[300px] px-3 py-2.5 align-top">
                    <Link href={`/metas/detalle?id=${m.id}`} className="block">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {m.codigo ?? "—"}
                        </span>
                        {m.es_wig && (
                          <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                            🎯 WIG #{m.wig_orden ?? "?"}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-medium leading-snug group-hover:underline">
                        {m.titulo}
                      </div>
                      {m.descripcion && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {m.descripcion}
                        </div>
                      )}
                      {m.tags?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {m.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  </td>

                  {/* ── Estado ── */}
                  <td className="px-3 py-2.5 align-top">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        ESTADO[m.estado] ?? ESTADO.sin_empezar
                      }`}
                    >
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                          ESTADO_DOT[m.estado] ?? ESTADO_DOT.sin_empezar
                        }`}
                      />
                      {m.estado.replace("_", " ")}
                    </span>
                  </td>

                  {/* ── Ámbito ── */}
                  <td className="px-3 py-2.5 align-top">
                    {m.ambito ? (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          AMBITO_BADGE[m.ambito]
                        }`}
                      >
                        {AMBITO_LABEL[m.ambito]}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">
                        —
                      </span>
                    )}
                  </td>

                  {/* ── Proyecto ── */}
                  <td className="px-3 py-2.5 align-top">
                    {proyecto ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium"
                        title="Proyecto al que pertenece la meta"
                      >
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: proyecto.color ?? "#64748b" }}
                        />
                        {proyecto.nombre}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/60">
                        —
                      </span>
                    )}
                  </td>

                  {/* ── KRs (resultados) ── */}
                  <td className="max-w-[260px] px-3 py-2.5 align-top">
                    {mp.resultados.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground/60">
                        sin KR
                      </span>
                    ) : (
                      <>
                        <ul className="space-y-0.5">
                          {mp.resultados.slice(0, 4).map((r) => {
                            const periodos = (
                              r.periodos.length > 0
                                ? r.periodos
                                : r.periodo.id
                                  ? [r.periodo]
                                  : []
                            )
                              .map((p) => p.nombre)
                              .filter(Boolean)
                              .join(" · ");
                            return (
                              <li
                                key={r.id}
                                className="flex items-baseline gap-1 text-[11px] leading-snug"
                              >
                                <span className="text-violet-500">▪</span>
                                <span className="min-w-0 truncate text-foreground/90">
                                  {r.titulo}
                                </span>
                                {periodos && (
                                  <span className="shrink-0 text-muted-foreground/70">
                                    {periodos}
                                  </span>
                                )}
                                {r.valor_objetivo != null && (
                                  <span className="shrink-0 tabular-nums text-muted-foreground/70">
                                    {r.valor_actual ?? 0}/{r.valor_objetivo}
                                    {r.unidad ?? ""}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {mp.resultados.length > 4 && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                            +{mp.resultados.length - 4} KR
                            {mp.resultados.length - 4 === 1 ? "" : "s"} ·{" "}
                            {periodosUnicos.size} periodo
                            {periodosUnicos.size === 1 ? "" : "s"}
                          </p>
                        )}
                      </>
                    )}
                  </td>

                  {/* ── Progreso ── */}
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            mp.progreso < 0.3
                              ? "bg-red-500"
                              : mp.progreso < 0.7
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.round(mp.progreso * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium tabular-nums">
                        {Math.round(mp.progreso * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {mp.tareas_hechas}/{mp.total_tareas} tareas
                    </span>
                  </td>

                  {/* ── Plazo / fecha objetivo ── */}
                  <td className="px-3 py-2.5 align-top text-[11px]">
                    {m.fecha_objetivo ? (
                      <span className="tabular-nums">
                        {m.fecha_objetivo}
                        {m.fecha_fin_bloqueada && (
                          <span title="Fecha crítica: no se puede mover">
                            {" "}
                            🔒
                          </span>
                        )}
                      </span>
                    ) : m.plazo ? (
                      <span className="text-muted-foreground">{m.plazo}</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>

                  {/* ── Acciones ── */}
                  <td className="px-3 py-2.5 text-right align-top">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => setEditando(mp)}
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Editar meta"
                        aria-label={`Editar ${m.titulo}`}
                      >
                        <IconPencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archivarMetaCard(mp)}
                        disabled={guardandoId === m.id}
                        className="rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                        title={
                          m.estado === "archivada"
                            ? "Desarchivar meta"
                            : "Archivar meta"
                        }
                        aria-label={
                          m.estado === "archivada"
                            ? "Desarchivar meta"
                            : "Archivar meta"
                        }
                      >
                        <IconArchive className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarMetaCard(mp)}
                        disabled={eliminandoId === m.id}
                        className="rounded-full p-1.5 text-red-500/70 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                        title="Eliminar meta (acción irreversible: tareas y KRs se desvinculan)"
                        aria-label={`Eliminar ${m.titulo}`}
                      >
                        {eliminandoId === m.id ? (
                          <span className="block h-4 w-4 text-center text-[10px]">
                            …
                          </span>
                        ) : (
                          <IconTrash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Móvil: filas compactas (la tabla de 920px obligaría a scroll) ── */}
      <ul className="space-y-2 md:hidden">
        {filtradas.map((mp) => {
          const m = mp.meta;
          const proyecto = m.proyecto_id
            ? proyectosById.get(m.proyecto_id)
            : null;
          return (
            <li
              key={m.id}
              className={`rounded-xl border bg-card p-3 ${
                m.es_wig ? "border-violet-500/40" : "border-border"
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleWig(mp)}
                  disabled={guardandoId === m.id}
                  className={`shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${
                    m.es_wig
                      ? "bg-violet-500/20 text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground/40 hover:bg-accent"
                  }`}
                  title={m.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                  aria-label={m.es_wig ? "Quitar de WIG" : "Marcar como WIG"}
                  aria-pressed={m.es_wig}
                >
                  {guardandoId === m.id ? (
                    <span className="block text-center text-[10px]">…</span>
                  ) : (
                    <IconTarget className="h-4 w-4" />
                  )}
                </button>
                <Link href={`/metas/detalle?id=${m.id}`} className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {m.codigo ?? "—"}
                    </span>
                    {m.es_wig && (
                      <span className="text-[10px] font-semibold text-violet-600">
                        🎯 WIG #{m.wig_orden ?? "?"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium leading-snug">{m.titulo}</div>
                  {m.descripcion && (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                      {m.descripcion}
                    </div>
                  )}
                </Link>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditando(mp)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
                    title="Editar meta"
                    aria-label={`Editar ${m.titulo}`}
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => archivarMetaCard(mp)}
                    disabled={guardandoId === m.id}
                    className="rounded-full p-1.5 text-muted-foreground/50 hover:bg-accent disabled:opacity-50"
                    title="Archivar meta"
                    aria-label="Archivar meta"
                  >
                    <IconArchive className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarMetaCard(mp)}
                    disabled={eliminandoId === m.id}
                    className="rounded-full p-1.5 text-red-500/70 hover:bg-red-500/10 disabled:opacity-50"
                    title="Eliminar meta"
                    aria-label={`Eliminar ${m.titulo}`}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    ESTADO[m.estado] ?? ESTADO.sin_empezar
                  }`}
                >
                  {m.estado.replace("_", " ")}
                </span>
                {m.ambito && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      AMBITO_BADGE[m.ambito]
                    }`}
                  >
                    {AMBITO_LABEL[m.ambito]}
                  </span>
                )}
                {proyecto && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px]">
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: proyecto.color ?? "#64748b" }}
                    />
                    {proyecto.nombre}
                  </span>
                )}
                {(m.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  {mp.tareas_hechas}/{mp.total_tareas} ·{" "}
                  {Math.round(mp.progreso * 100)}%
                </span>
              </div>

              {mp.resultados.length > 0 && (
                <ul className="mt-2 space-y-0.5 border-t border-border pt-2">
                  {mp.resultados.slice(0, 4).map((r) => {
                    const periodos = (
                      r.periodos.length > 0
                        ? r.periodos
                        : r.periodo.id
                          ? [r.periodo]
                          : []
                    )
                      .map((p) => p.nombre)
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-baseline gap-x-1 text-[11px] leading-snug text-muted-foreground"
                      >
                        <span className="text-violet-500">▪</span>
                        <span className="text-foreground/90">{r.titulo}</span>
                        {periodos && <span>· {periodos}</span>}
                        {r.valor_objetivo != null && (
                          <span>
                            · {r.valor_actual ?? 0}/{r.valor_objetivo}
                            {r.unidad ?? ""}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {mp.resultados.length > 4 && (
                    <li className="text-[10px] text-muted-foreground/70">
                      +{mp.resultados.length - 4} KR
                      {mp.resultados.length - 4 === 1 ? "" : "s"}
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {!loading && metas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no tienes metas. Crea la primera con{" "}
            <Link
              href="/metas/nueva"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Nueva meta
            </Link>
            .
          </p>
        </div>
      )}
      {!loading && metas.length > 0 && filtradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {tagsSel.size > 0
            ? `No hay metas con los tags seleccionados${filtro !== "todas" ? ` en el ámbito ${filtro}` : ""}.`
            : q.trim() || proyectoSel
              ? "Ninguna meta coincide con la búsqueda o el filtro de proyecto."
              : `No hay metas en este ámbito.`}
        </div>
      )}

      {editando && (
        <EditarMetaModal
          meta={editando.meta}
          onClose={() => setEditando(null)}
          onChanged={reload}
        />
      )}

      {sugerencias && (
        <SugerirWigsModal
          resultado={sugerencias}
          metas={metas}
          busy={sugiriendo}
          error={errorSug}
          wigsActuales={wigs.map((w) => w.meta.id)}
          onCancel={() => {
            setSugerencias(null);
            setErrorSug(null);
          }}
          onAplicarWig={aplicarSugerencia}
          applyingId={applyingSugId}
        />
      )}
    </div>
  );
}