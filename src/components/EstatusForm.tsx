"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertEstatus, type EstatusInput } from "@/lib/mutations";
import {
  ComidasEditor,
  comidasDeEstatus,
} from "@/components/ComidasEditor";
import {
  HABITOS_VACIO,
  HabitosGrid,
  habitosDeEstatus,
  type HabitosValue,
} from "@/components/HabitosGrid";
import type { ComidaInput, EstatusConComidas } from "@/lib/types";

/** Formulario completo de Estatus Diario (modo crear o editar). */
export function EstatusForm({
  fecha,
  estatusInicial,
  modo,
}: {
  fecha: string;
  estatusInicial?: EstatusConComidas | null;
  modo: "nuevo" | "editar";
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario (un solo objeto plano)
  const [datos, setDatos] = useState<EstatusInput>(() => {
    if (estatusInicial) {
      return {
        ...estatusInicial,
        // Las comidas del editor usan la forma "wire" (hora "HH:MM")
        comidas: comidasDeEstatus(estatusInicial.comidas ?? []),
      } as EstatusInput;
    }
    return {
      fecha,
      tareas_profesionales: "",
      tareas_personales: "",
      trabajo_futuro_ideal: "",
      tareas_nuevas: "",
      correos_importantes: "",
      tareas_no_terminadas: "",
      estado_emocional: "",
      pensamientos_emociones: "",
      bloqueos_procrastinacion: "",
      ideas_nuevas: "",
      agradecimientos: "",
      lo_que_hiciste_bien: "",
      tiempo_pareja: "",
      tiempo_hija: "",
      tareas_hogar: "",
      uso_movil_min: null,
      acto_de_bondad: "",
      cuido_cuerpo: "",
      mente_subconsciente: "",
      habito_qigong: null,
      habito_caminar: null,
      habito_ducha: null,
      habito_meditacion: null,
      habito_desayuno: null,
      habito_vaciado_mental: null,
      habito_comida_siesta: null,
      habito_estatus: null,
      habito_3_cosas_buenas: null,
      audit_tareas_criticas: null,
      audit_termino_3_principales: null,
      audit_anadio_sin_terminar: null,
      audit_eran_20_80: null,
      audit_sintio: null,
      cierre_que_consigo: "",
      cierre_queda_abierto: "",
      cierre_decisiones_tomadas: "",
      cierre_carga_mental: "",
      cierre_primer_problema_manana: "",
      podes_soltar: "",
      micro_accion_manana: "",
      semaforo: null,
      reflexion_agente: "",
      comidas: [],
    };
  });

  const [habitos, setHabitos] = useState<HabitosValue>(() =>
    estatusInicial ? habitosDeEstatus(estatusInicial) : HABITOS_VACIO,
  );
  const [comidas, setComidas] = useState<ComidaInput[]>(
    () => datos.comidas ?? [],
  );

  function set<K extends keyof EstatusInput>(key: K, value: EstatusInput[K]) {
    setDatos((d) => ({ ...d, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    let alive = true;
    try {
      // Los 9 hábitos viven en `habitos` con claves cortas (qigong, caminar,
      // ducha, …) pero las columnas de Supabase son `habito_qigong`,
      // `habito_caminar`, `habito_ducha`, … Hay que prefijar al mezclar
      // con el resto del payload, si no Postgres los ignora silenciosamente
      // y siempre quedan en NULL.
      const habitosPrefijados = Object.fromEntries(
        Object.entries(habitos).map(([k, v]) => [`habito_${k}`, v]),
      );
      const payload: EstatusInput = {
        ...datos,
        fecha,
        ...habitosPrefijados, // 9 campos habito_*
        comidas,
      };
      await upsertEstatus(fecha, payload);
      if (!alive) return;
      router.push(`/estatus/ver?fecha=${fecha}`);
      router.refresh();
    } catch (e: unknown) {
      if (!alive) return;
      setError(e instanceof Error ? e.message : "Error al guardar el estatus");
    } finally {
      if (alive) setGuardando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* === Semáforo del día === */}
      <Section titulo="Semáforo del día" emoji="🚦">
        <div className="flex flex-wrap gap-2">
          {([
            ["verde", "🟢 Verde", "bg-emerald-500/15 border-emerald-500/60 text-emerald-700 dark:text-emerald-300"],
            ["amarillo", "🟡 Amarillo", "bg-amber-500/15 border-amber-500/60 text-amber-700 dark:text-amber-300"],
            ["rojo", "🔴 Rojo", "bg-red-500/15 border-red-500/60 text-red-700 dark:text-red-300"],
          ] as const).map(([val, label, cls]) => {
            const activo = datos.semaforo === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => set("semaforo", activo ? null : val)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activo ? cls : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
                aria-pressed={activo}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* === Productividad === */}
      <Section titulo="Productividad" emoji="📊">
        <Grid2>
          <Textarea
            label="Tareas profesionales realizadas"
            value={datos.tareas_profesionales ?? ""}
            onChange={(v) => set("tareas_profesionales", v || null)}
            placeholder="Una por línea"
            rows={3}
          />
          <Textarea
            label="Tareas personales realizadas"
            value={datos.tareas_personales ?? ""}
            onChange={(v) => set("tareas_personales", v || null)}
            placeholder="Una por línea"
            rows={3}
          />
          <Textarea
            label="¿Trabajaste hoy en tu futuro ideal?"
            value={datos.trabajo_futuro_ideal ?? ""}
            onChange={(v) => set("trabajo_futuro_ideal", v || null)}
            rows={2}
          />
          <Textarea
            label="Tareas nuevas que entraron"
            value={datos.tareas_nuevas ?? ""}
            onChange={(v) => set("tareas_nuevas", v || null)}
            rows={2}
          />
          <Textarea
            label="Correos o mensajes importantes"
            value={datos.correos_importantes ?? ""}
            onChange={(v) => set("correos_importantes", v || null)}
            rows={2}
          />
          <Textarea
            label="Tareas que no pudiste terminar"
            value={datos.tareas_no_terminadas ?? ""}
            onChange={(v) => set("tareas_no_terminadas", v || null)}
            rows={2}
          />
        </Grid2>
      </Section>

      {/* === Estado emocional === */}
      <Section titulo="Estado emocional y mental" emoji="💭">
        <Grid2>
          <Input
            label="¿Cómo te sentís ahora mismo?"
            value={datos.estado_emocional ?? ""}
            onChange={(v) => set("estado_emocional", v || null)}
          />
          <Textarea
            label="¿Qué pensamientos/emociones predominan?"
            value={datos.pensamientos_emociones ?? ""}
            onChange={(v) => set("pensamientos_emociones", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Hubo bloqueos o procrastinación?"
            value={datos.bloqueos_procrastinacion ?? ""}
            onChange={(v) => set("bloqueos_procrastinacion", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Ideas nuevas que tuviste hoy?"
            value={datos.ideas_nuevas ?? ""}
            onChange={(v) => set("ideas_nuevas", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Qué agradecés hoy?"
            value={datos.agradecimientos ?? ""}
            onChange={(v) => set("agradecimientos", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Qué hiciste bien hoy? (aunque sea algo mínimo)"
            value={datos.lo_que_hiciste_bien ?? ""}
            onChange={(v) => set("lo_que_hiciste_bien", v || null)}
            rows={2}
          />
        </Grid2>
      </Section>

      {/* === Relaciones === */}
      <Section titulo="Vida personal y relaciones" emoji="💚">
        <Grid2>
          <Textarea
            label="Tiempo con tu mujer"
            value={datos.tiempo_pareja ?? ""}
            onChange={(v) => set("tiempo_pareja", v || null)}
            rows={2}
          />
          <Textarea
            label="Tiempo con tu hija"
            value={datos.tiempo_hija ?? ""}
            onChange={(v) => set("tiempo_hija", v || null)}
            rows={2}
          />
          <Textarea
            label="Tareas del hogar / cuidado del espacio"
            value={datos.tareas_hogar ?? ""}
            onChange={(v) => set("tareas_hogar", v || null)}
            rows={2}
          />
        </Grid2>
      </Section>

      {/* === Bienestar === */}
      <Section titulo="Bienestar y hábitos" emoji="🏃">
        <Grid2>
          <Input
            label="Uso del móvil (minutos)"
            type="number"
            value={datos.uso_movil_min ?? ""}
            onChange={(v) => set("uso_movil_min", v ? Number(v) : null)}
            placeholder="0"
          />
          <Textarea
            label="¿Cuidado tu cuerpo hoy?"
            value={datos.cuido_cuerpo ?? ""}
            onChange={(v) => set("cuido_cuerpo", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Mente subconsciente? (meditación, escritura, conexión)"
            value={datos.mente_subconsciente ?? ""}
            onChange={(v) => set("mente_subconsciente", v || null)}
            rows={2}
          />
          <Textarea
            label="¿Hiciste algún acto de bondad?"
            value={datos.acto_de_bondad ?? ""}
            onChange={(v) => set("acto_de_bondad", v || null)}
            rows={2}
          />
        </Grid2>
      </Section>

      {/* === 9 hábitos === */}
      <Section
        titulo="9 hábitos personales"
        emoji="🧭"
        subtitulo="✓ hecho · ~ parcial · ✗ no"
      >
        <HabitosGrid value={habitos} onChange={setHabitos} />
      </Section>

      {/* === Comidas === */}
      <Section titulo="Comidas del día" emoji="🍽️">
        <ComidasEditor value={comidas} onChange={setComidas} />
      </Section>

      {/* === Auditoría 20/80 === */}
      <Section titulo="Auditoría 20/80" emoji="🎯">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Tareas críticas hechas (0-3)"
            type="number"
            value={datos.audit_tareas_criticas ?? ""}
            onChange={(v) =>
              set(
                "audit_tareas_criticas",
                v !== "" && v != null ? Math.min(3, Math.max(0, Number(v))) : null,
              )
            }
          />
          <Select
            label="¿Terminaste las 3 principales?"
            value={
              datos.audit_termino_3_principales === null
                ? ""
                : datos.audit_termino_3_principales
                  ? "si"
                  : "no"
            }
            onChange={(v) =>
              set("audit_termino_3_principales", v === "" ? null : v === "si")
            }
            opciones={[
              ["", "—"],
              ["si", "Sí"],
              ["no", "No"],
            ]}
          />
          <Select
            label="¿AÑADISTE tareas nuevas sin terminar las anteriores?"
            value={
              datos.audit_anadio_sin_terminar === null
                ? ""
                : datos.audit_anadio_sin_terminar
                  ? "si"
                  : "no"
            }
            onChange={(v) =>
              set("audit_anadio_sin_terminar", v === "" ? null : v === "si")
            }
            opciones={[
              ["", "—"],
              ["si", "Sí"],
              ["no", "No"],
            ]}
          />
          <Select
            label="¿Las tareas eran 20/80?"
            value={datos.audit_eran_20_80 ?? ""}
            onChange={(v) =>
              set(
                "audit_eran_20_80",
                v === ""
                  ? null
                  : (v as "si" | "no" | "parcial"),
              )
            }
            opciones={[
              ["", "—"],
              ["si", "Sí"],
              ["parcial", "Parcial"],
              ["no", "No (ruido)"],
            ]}
          />
          <Select
            label="¿Sientes que cumpliste o corriste?"
            value={datos.audit_sintio ?? ""}
            onChange={(v) =>
              set(
                "audit_sintio",
                v === ""
                  ? null
                  : (v as "cumpli" | "corri" | "nada"),
              )
            }
            opciones={[
              ["", "—"],
              ["cumpli", "Cumplí"],
              ["corri", "Corrí"],
              ["nada", "Nada"],
            ]}
          />
        </div>
      </Section>

      {/* === Cierre Cognitivo === */}
      <Section titulo="Cierre cognitivo (5 preguntas)" emoji="🧠">
        <div className="space-y-3">
          <Textarea
            label="1. ¿Qué he conseguido?"
            value={datos.cierre_que_consigo ?? ""}
            onChange={(v) => set("cierre_que_consigo", v || null)}
            rows={2}
          />
          <Textarea
            label="2. ¿Qué queda abierto?"
            value={datos.cierre_queda_abierto ?? ""}
            onChange={(v) => set("cierre_queda_abierto", v || null)}
            rows={2}
          />
          <Textarea
            label="3. ¿Qué decisiones he tomado?"
            value={datos.cierre_decisiones_tomadas ?? ""}
            onChange={(v) => set("cierre_decisiones_tomadas", v || null)}
            rows={2}
          />
          <Textarea
            label="4. ¿Qué problemas siguen ocupando espacio mental?"
            value={datos.cierre_carga_mental ?? ""}
            onChange={(v) => set("cierre_carga_mental", v || null)}
            rows={2}
          />
          <Textarea
            label="5. ¿Cuál debería ser el primer problema de mañana?"
            value={datos.cierre_primer_problema_manana ?? ""}
            onChange={(v) => set("cierre_primer_problema_manana", v || null)}
            rows={2}
          />
        </div>
      </Section>

      {/* === Salida emocional === */}
      <Section titulo="Cierre emocional" emoji="📝">
        <Grid2>
          <Textarea
            label="¿Qué podés soltar hoy?"
            value={datos.podes_soltar ?? ""}
            onChange={(v) => set("podes_soltar", v || null)}
            rows={2}
          />
          <Textarea
            label="Micro-acción priorizada para mañana (opcional — la app puede calcularla)"
            value={datos.micro_accion_manana ?? ""}
            onChange={(v) => set("micro_accion_manana", v || null)}
            rows={2}
          />
          <Textarea
            label="Reflexión del agente (veredicto narrativo — opcional)"
            value={datos.reflexion_agente ?? ""}
            onChange={(v) => set("reflexion_agente", v || null)}
            rows={3}
          />
        </Grid2>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {guardando
            ? "Guardando…"
            : modo === "nuevo"
              ? "Crear estatus"
              : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/estatus/ver?fecha=${fecha}`)}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Sub-componentes del form (para no repetir markup)
// ============================================================================

function Section({
  titulo,
  emoji,
  subtitulo,
  children,
}: {
  titulo: string;
  emoji: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-base font-semibold tracking-tight">
          <span className="mr-1.5">{emoji}</span>
          {titulo}
        </h2>
        {subtitulo && (
          <span className="text-xs text-muted-foreground">{subtitulo}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  opciones,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opciones: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {opciones.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </select>
    </label>
  );
}
