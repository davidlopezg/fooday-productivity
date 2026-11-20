"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useConfig } from "@/lib/configStore";
import { fetchProyectos, fetchTareas } from "@/lib/queries";
import {
  aplicarPropuesta, asignarTarea, crearConversacion, crearPropuesta,
  guardarAgente, guardarLinks, guardarMensaje, guardarParticipantes,
  guardarSkill, listarAgentes, listarAsignaciones, listarConversaciones,
  listarLinks, listarMensajes, listarPropuestas, listarSkills,
  participants, registrarActividad, rechazarPropuesta, responder, toggleAgente,
  toggleSkill, type Agente, type Asignacion, type Conversacion, type Mensaje,
  type Propuesta, type Skill,
} from "@/lib/agentes/mvp";
import type { Proyecto, Tarea } from "@/lib/types";
import { IconCheck, IconMessage, IconPlus, IconX } from "@/components/icons";

type Vista = "equipo" | "conversaciones" | "configuracion";
const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
const btn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

type EstadoAgente = "disponible" | "ocupado" | "revision";

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>;
}

function Avatar({ agente, tam = "md" }: { agente: Agente; tam?: "sm" | "md" | "lg" }) {
  const t = tam === "lg" ? "h-14 w-14 text-2xl" : tam === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg";
  return <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-violet-500/10 ring-1 ring-violet-500/20 ${t}`}>{agente.icono || "🤖"}</span>;
}

function EstadoChip({ estado }: { estado: EstadoAgente }) {
  const bg = {
    disponible: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    ocupado: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    revision: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  }[estado];
  const label = { disponible: "Disponible", ocupado: "Trabajando", revision: "En revisión" }[estado];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${bg}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

export default function AgentesPage() {
  const cfg = useConfig();
  const [vista, setVista] = useState<Vista>("equipo");
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<string[]>([]);
  const [proyectoId, setProyectoId] = useState("");
  const [entrada, setEntrada] = useState("");
  const [borrador, setBorrador] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agenteEdit, setAgenteEdit] = useState<Partial<Agente>>({});
  const [skillEdit, setSkillEdit] = useState<Partial<Skill>>({});
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [tareaAsignar, setTareaAsignar] = useState("");
  const [agenteAsignar, setAgenteAsignar] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  const cargar = useCallback(async () => {
    try {
      const [a, s, c, p, x, ps, ts] = await Promise.all([
        listarAgentes(), listarSkills(), listarConversaciones(), listarPropuestas(),
        listarAsignaciones(), fetchProyectos(), fetchTareas("pendiente"),
      ]);
      setAgentes(a); setSkills(s); setConversaciones(c); setPropuestas(p);
      setAsignaciones(x); setProyectos(ps); setTareas(ts);
      setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el centro de agentes"); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const agenteActual = useMemo(() => participantes.length === 1 ? agentes.find((a) => a.id === participantes[0]) : null, [participantes, agentes]);
  const activa = agentes.filter((a) => a.activo);
  const pendientes = propuestas.filter((p) => p.estado === "pendiente");
  const orquestador = activa.find((a) => /orquest/i.test(a.nombre)) ?? activa[0];

  // Estado derivado de datos reales: nunca finge actividad que no exista.
  function estadoDe(a: Agente): EstadoAgente {
    if (pendientes.some((p) => p.agent_id === a.id)) return "revision";
    if (asignaciones.some((x) => x.agent_id === a.id)) return "ocupado";
    return "disponible";
  }

  async function abrirConversacion(c: Conversacion) {
    setConversationId(c.id); setProyectoId(c.proyecto_id ?? ""); setMensajes(await listarMensajes(c.id)); setParticipantes(await participants(c.id));
  }
  async function nuevaConversacion(agentId?: string) {
    const c = await crearConversacion("Nueva conversación", proyectoId || null, agentId ? [agentId] : []);
    setConversaciones((x) => [c, ...x]); await abrirConversacion(c);
  }
  async function guardarAgenteForm(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try { await guardarAgente(agenteEdit); setAgenteEdit({}); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
  }
  async function guardarSkillForm(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try { await guardarSkill(skillEdit); setSkillEdit({}); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar"); }
  }
  async function editarAgente(a: Agente) {
    setAgenteEdit(a); setSkillIds(await listarLinks(a.id)); setVista("configuracion");
  }
  async function enviar() {
    const pregunta = entrada.trim(); const agent = agenteActual;
    if (!pregunta || !agent) return;
    if (!cfg.data.minimax_api_key) { setError("Configura la clave de IA antes de usar el chat."); return; }
    let convId = conversationId;
    setEnviando(true); setEntrada(""); setBorrador(""); setError(null);
    try {
      if (!convId) { const c = await crearConversacion(pregunta.slice(0, 70), proyectoId || null, [agent.id]); convId = c.id; setConversaciones((x) => [c, ...x]); setConversationId(c.id); setParticipantes([agent.id]); }
      const userMsg = await guardarMensaje(convId, null, "user", pregunta); setMensajes((x) => [...x, userMsg]);
      const skillsAgente = await listarLinks(agent.id); const fullSkills = skills.filter((s) => skillsAgente.includes(s.id));
      const r = await responder(convId, agent, fullSkills, pregunta, mensajes, { base_url: cfg.data.base_url, minimax_api_key: cfg.data.minimax_api_key, model: cfg.data.model }, (t) => setBorrador(t));
      const msg = await guardarMensaje(convId, agent.id, "agent", r.contenido, r.propuesta); setMensajes((x) => [...x, msg]);
      if (r.propuesta) { await crearPropuesta(convId, agent.id, r.propuesta); await registrarActividad("propuesta_creada", agent.id, convId); await cargar(); }
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la respuesta"); }
    finally { setEnviando(false); setBorrador(""); }
  }

  async function aplicar(p: Propuesta) {
    try { await aplicarPropuesta(p); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo aplicar"); }
  }
  async function asignar(e: React.FormEvent) {
    e.preventDefault(); if (!tareaAsignar || !agenteAsignar) return;
    try { const t = tareas.find((x) => x.id === tareaAsignar); if (!t) throw new Error("Tarea no encontrada"); await asignarTarea(t, agenteAsignar, instrucciones, conversationId); setInstrucciones(""); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo asignar"); }
  }

  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Centro de mando</p>
        <h1 className="text-2xl font-bold">Tu equipo de agentes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activa.length} agentes activos · {pendientes.length} propuestas esperando tu revisión.
        </p>
      </div>
      {orquestador && <button className={primary} onClick={() => { setVista("conversaciones"); setParticipantes([orquestador.id]); void nuevaConversacion(orquestador.id); }}><IconMessage className="h-4 w-4" />Hablar con {orquestador.nombre}</button>}
    </header>

    <nav aria-label="Secciones de agentes" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1">
      {([[ "equipo", "Equipo" ], [ "conversaciones", "Conversaciones" ], [ "configuracion", "Configuración" ]] as Array<[Vista, string]>).map(([k, label]) => <button key={k} onClick={() => setVista(k)} aria-current={vista === k ? "page" : undefined} className={`min-h-10 flex-1 whitespace-nowrap rounded-md px-3 text-sm ${vista === k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>{label}</button>)}
    </nav>
    <ErrorBox error={error} />

    {vista === "equipo" && <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
        <h2 className="font-semibold">Resumen del equipo</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted p-3"><b className="block text-xl">{conversaciones.filter((c) => c.estado === "activa").length}</b><span className="text-xs text-muted-foreground">Conversaciones</span></div>
          <div className="rounded-lg bg-muted p-3"><b className="block text-xl">{pendientes.length}</b><span className="text-xs text-muted-foreground">Propuestas</span></div>
          <div className="rounded-lg bg-muted p-3"><b className="block text-xl">{asignaciones.length}</b><span className="text-xs text-muted-foreground">Asignaciones</span></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Agentes disponibles</h2>
        <div className="mt-3 space-y-2">
          {activa.length ? activa.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Avatar agente={a} tam="sm" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{a.nombre}</h2>
                  <p className="text-xs text-muted-foreground">{a.especialidad || "Sin especialidad"}</p>
                </div>
                <EstadoChip estado={estadoDe(a)} />
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{a.descripcion}</p>
              <div className="mt-3 flex gap-2">
                <button className={btn} onClick={() => void editarAgente(a)}>Editar</button>
                <button className={btn} onClick={async () => { await toggleAgente(a); await cargar(); }}>{a.activo ? "Desactivar" : "Activar"}</button>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">Crea un agente para empezar.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Propuestas pendientes</h2>
        <div className="mt-3 space-y-3">
          {pendientes.map((p) => (
            <div key={p.id} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <b className="text-sm">{p.payload.titulo}</b>
              {p.payload.descripcion && <p className="mt-1 text-xs text-muted-foreground">{p.payload.descripcion}</p>}
              <div className="mt-2 flex gap-2">
                <button className={primary} onClick={() => aplicar(p)}><IconCheck className="h-4 w-4" />Crear tarea</button>
                <button className={btn} onClick={async () => { await rechazarPropuesta(p.id); await cargar(); }}><IconX className="h-4 w-4" />Rechazar</button>
              </div>
            </div>
          ))}
          {!pendientes.length && <p className="text-sm text-muted-foreground">No hay cambios pendientes.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">Asignar una tarea</h2>
        <form onSubmit={asignar} className="mt-3 space-y-2">
          <label className="block text-xs">Tarea<select className={field} value={tareaAsignar} onChange={(e) => setTareaAsignar(e.target.value)} required>
            <option value="">Elige una tarea…</option>
            {tareas.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
          </select></label>
          <label className="block text-xs">Agente<select className={field} value={agenteAsignar} onChange={(e) => setAgenteAsignar(e.target.value)} required>
            <option value="">Elige un agente…</option>
            {activa.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select></label>
          <label className="block text-xs">Instrucciones<textarea className={field} value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} /></label>
          <button className={primary} type="submit">Asignar</button>
        </form>
      </div>
    </section>}

    {vista === "conversaciones" && <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between"><b>Conversaciones</b><button className="rounded-md p-2 hover:bg-accent" aria-label="Nueva conversación" onClick={() => void nuevaConversacion()}><IconPlus className="h-4 w-4" /></button></div>
        <div className="mt-2 space-y-1">
          {conversaciones.map((c) => <button key={c.id} onClick={() => void abrirConversacion(c)} className={`w-full rounded-md p-2 text-left text-sm ${conversationId === c.id ? "bg-accent" : "hover:bg-accent"}`}>{c.titulo}</button>)}
        </div>
      </aside>
      <div className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="flex flex-wrap gap-2">
            <select aria-label="Proyecto de la conversación" className={field} value={proyectoId} onChange={(e) => { setProyectoId(e.target.value); if (conversationId) void createClientUpdate(conversationId, e.target.value || null); }}>
              <option value="">Sin proyecto</option>
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <select aria-label="Participantes" multiple className={field} value={participantes} onChange={(e) => { const ids = Array.from(e.target.selectedOptions, (o) => o.value); setParticipantes(ids); if (conversationId) void guardarParticipantes(conversationId, ids); }}>
              {activa.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {mensajes.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-lg p-3 text-sm ${m.autor === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="mb-1 text-[10px] font-semibold uppercase opacity-70">{m.autor === "user" ? "Tú" : agentes.find((a) => a.id === m.agent_id)?.nombre ?? "Agente"}</div>
              {m.contenido}
              {m.propuesta && <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">Propuesta pendiente: <b>{m.propuesta.titulo}</b></div>}
            </div>
          ))}
          {borrador && <div className="max-w-[85%] rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{borrador}</div>}
          {!mensajes.length && !borrador && <p className="text-sm text-muted-foreground">Elige un agente y escribe tu petición.</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void enviar(); }} className="flex gap-2 border-t border-border p-3">
          <textarea aria-label="Mensaje al agente" className={field} value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder={participantes.length === 1 ? "Escribe a tu agente…" : "Selecciona un participante para hablar…"} disabled={participantes.length !== 1 || enviando} />
          <button className={primary} disabled={enviando || participantes.length !== 1}>{enviando ? "Pensando…" : "Enviar"}</button>
        </form>
      </div>
    </section>}

    {vista === "configuracion" && <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {agentes.map((a) => (
          <article key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{a.icono}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{a.nombre}</h2>
                <p className="text-xs text-muted-foreground">{a.especialidad || "Sin especialidad"}</p>
              </div>
              <EstadoChip estado={estadoDe(a)} />
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{a.descripcion}</p>
            <div className="mt-3 flex gap-2">
              <button className={btn} onClick={() => void editarAgente(a)}>Editar</button>
              <button className={btn} onClick={async () => { await toggleAgente(a); await cargar(); }}>{a.activo ? "Desactivar" : "Activar"}</button>
            </div>
          </article>
        ))}
      </div>
      <form onSubmit={guardarAgenteForm} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">{agenteEdit.id ? "Editar agente" : "Nuevo agente"}</h2>
        <label className="block text-xs">Nombre<input className={field} value={agenteEdit.nombre ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, nombre: e.target.value })} required /></label>
        <label className="block text-xs">Icono<input className={field} value={agenteEdit.icono ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, icono: e.target.value })} placeholder="🤖" /></label>
        <label className="block text-xs">Especialidad<input className={field} value={agenteEdit.especialidad ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, especialidad: e.target.value })} /></label>
        <label className="block text-xs">Descripción<textarea className={field} value={agenteEdit.descripcion ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, descripcion: e.target.value })} /></label>
        <label className="block text-xs">Objetivo<textarea className={`${field} min-h-32`} value={agenteEdit.objetivo ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, objetivo: e.target.value })} /></label>
        <label className="block text-xs">Prompt<textarea className={`${field} min-h-32`} value={agenteEdit.prompt ?? ""} onChange={(e) => setAgenteEdit({ ...agenteEdit, prompt: e.target.value })} /></label>
        {agenteEdit.id && <fieldset><legend className="text-xs font-semibold">Skills compartidas</legend><div className="mt-1 space-y-1">{skills.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skillIds.includes(s.id)} onChange={(e) => setSkillIds(e.target.checked ? [...skillIds, s.id] : skillIds.filter((x) => x !== s.id))} />{s.nombre}</label>)}</div></fieldset>}
        <button className={primary} type="submit">Guardar agente</button>
        {agenteEdit.id && <button type="button" className={btn} onClick={async () => { await guardarLinks(agenteEdit.id!, skillIds); await cargar(); }}>Guardar skills</button>}
      </form>
    </section>}
  </div>;
}

async function createClientUpdate(conversationId: string, proyectoId: string | null) {
  const { createClient } = await import("@/lib/supabase/client");
  const { error } = await createClient().from("agent_conversations_mvp").update({ proyecto_id: proyectoId }).eq("id", conversationId);
  if (error) throw new Error(error.message);
}

function PropuestaCard({ p, onApply, onReject }: { p: Propuesta; onApply: (p: Propuesta) => void; onReject: () => void }) {
  return <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><b className="text-sm">{p.payload.titulo}</b>{p.payload.descripcion && <p className="mt-1 text-xs text-muted-foreground">{p.payload.descripcion}</p>}<div className="mt-2 flex gap-2"><button className={primary} onClick={() => onApply(p)}><IconCheck className="h-4 w-4" />Crear tarea</button><button className={btn} onClick={onReject}><IconX className="h-4 w-4" />Rechazar</button></div></div>;
}
