"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearMeta, ensurePeriodosAnio } from "@/lib/mutations";
import { fetchAreas } from "@/lib/queries";
import { useData } from "@/lib/useData";
import type { AmbitoMeta, Area } from "@/lib/types";
import { IconX } from "@/components/icons";

const ESTADOS = [
  "sin_empezar",
  "en_progreso",
  "bloqueada",
  "completada",
] as const;
const PRIORIDADES = ["critica", "alta", "media", "baja"] as const;

const AMBITOS: Array<{ id: AmbitoMeta; label: string }> = [
  { id: "personal", label: "👤 Personal" },
  { id: "profesional", label: "💼 Profesional" },
];

export default function NuevaMetaPage() {
  const router = useRouter();
  const { data: areas } = useData<Area[]>(fetchAreas, []);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>("sin_empezar");
  const [prioridad, setPrioridad] = useState<(typeof PRIORIDADES)[number]>("media");
  const [plazo, setPlazo] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [ambito, setAmbito] = useState<AmbitoMeta | "">("");
  const [tags, setTags] = useState("");
  const [autoTrimestres, setAutoTrimestres] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const meta = await crearMeta({
        titulo,
        descripcion: descripcion.trim() || null,
        estado,
        prioridad,
        area_id: areaId || null,
        plazo: plazo.trim() || null,
        ambito: ambito || null,
        tags: tags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
      });
      if (autoTrimestres) {
        // Mejor esfuerzo: si falla, no bloquea la creación de la meta.
        try {
          await ensurePeriodosAnio(new Date().getFullYear());
        } catch (e) {
          console.warn("[NuevaMeta] auto-generar trimestres falló:", e);
        }
      }
      router.push(`/metas/detalle?id=${meta.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la meta.");
    } finally {
      setGuardando(false);
    }
  }

  const field =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva meta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea una meta. Opcionalmente genera los 4 trimestres del año actual.
          </p>
        </div>
        <Link
          href="/metas"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <IconX className="h-4 w-4" /> Cancelar
        </Link>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">Título *</span>
            <input
              className={field}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="p.ej. Migrar app a PWA con GitHub Pages"
              autoFocus
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">Descripción</span>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Estado</span>
            <select
              className={field}
              value={estado}
              onChange={(e) => setEstado(e.target.value as (typeof ESTADOS)[number])}
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Prioridad</span>
            <select
              className={field}
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as (typeof PRIORIDADES)[number])}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Área</span>
            <select
              className={field}
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">— Sin área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Plazo (nota libre)</span>
            <input
              className={field}
              value={plazo}
              onChange={(e) => setPlazo(e.target.value)}
              placeholder="p.ej. 2026-Q3"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">Ámbito</span>
            <select
              className={field}
              value={ambito}
              onChange={(e) => setAmbito(e.target.value as AmbitoMeta | "")}
            >
              <option value="">— Sin clasificar —</option>
              {AMBITOS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium">
              Tags{" "}
              <span className="font-normal text-muted-foreground">
                (separadas por coma, sin #)
              </span>
            </span>
            <input
              className={field}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="p.ej. salud, ansiedad, hábitos"
            />
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoTrimestres}
            onChange={(e) => setAutoTrimestres(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="font-medium">Auto-generar 4 trimestres del {new Date().getFullYear()}</span>
            <span className="block text-xs text-muted-foreground">
              Crea los periodos Q1–Q4 del año actual. Luego podrás añadir
              resultados esperados por trimestre.
            </span>
          </span>
        </label>

        {error && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={guardar}
            disabled={guardando}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Crear meta"}
          </button>
          <Link
            href="/metas"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancelar
          </Link>
        </div>
      </section>
    </div>
  );
}
