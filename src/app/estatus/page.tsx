"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchEstatusList } from "@/lib/queries";
import { useData } from "@/lib/useData";
import { calcularScoreHabitos } from "@/lib/estatus";
import { ScoreHabitos } from "@/components/ScoreHabitos";
import { IconClipboardCheck, IconPlus } from "@/components/icons";
import type { EstatusConComidas } from "@/lib/types";

const DIAS_OPCIONES = [7, 30, 90, 365];

export default function EstatusListadoPage() {
  const [dias, setDias] = useState(30);

  const { data: entradas, loading, error, reload } = useData<EstatusConComidas[]>(
    () => fetchEstatusList({ limit: 1000 }),
    [],
  );

  // Filtra por rango de días
  const desde = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d.toISOString().slice(0, 10);
  }, [dias]);
  const filtradas = useMemo(
    () => entradas.filter((e) => e.fecha >= desde),
    [entradas, desde],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <IconClipboardCheck className="h-6 w-6" />
            Estatus diario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu diario de reflexión. Una entrada por día, con hábitos, auditoría
            20/80 y cierre cognitivo. {loading ? "Cargando…" : null}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs">
            {DIAS_OPCIONES.map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  dias === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === 365 ? "1 año" : `${d}d`}
              </button>
            ))}
          </div>
          <Link
            href="/estatus/nuevo"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo estatus
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error al cargar estatus
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={reload}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Entradas"
          value={loading ? "—" : filtradas.length.toString()}
          sub={`últimos ${dias} días`}
        />
        <Kpi
          label="Score medio hábitos"
          value={
            loading
              ? "—"
              : filtradas.length === 0
                ? "—"
                : Math.round(
                    filtradas.reduce(
                      (acc, e) => acc + calcularScoreHabitos(e).score,
                      0,
                    ) / filtradas.length,
                  ).toString() + "/100"
          }
          sub="promedio del rango"
        />
        <Kpi
          label="Días verdes 🟢"
          value={
            loading
              ? "—"
              : filtradas
                  .filter((e) => e.semaforo === "verde")
                  .length.toString()
          }
          sub="semáforo verde"
        />
        <Kpi
          label="Días rojos 🔴"
          value={
            loading
              ? "—"
              : filtradas
                  .filter((e) => e.semaforo === "rojo")
                  .length.toString()
          }
          sub="semáforo rojo"
        />
      </section>

      {/* Listado */}
      <section>
        {loading && filtradas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Cargando…
          </p>
        ) : filtradas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sin entradas en los últimos {dias} días.
            </p>
            <Link
              href="/estatus/nuevo"
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              <IconPlus className="h-4 w-4" />
              Crear la primera
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtradas.map((e) => (
              <EstatusCard key={e.id} estatus={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EstatusCard({ estatus }: { estatus: EstatusConComidas }) {
  const { score } = calcularScoreHabitos(estatus);
  const semaforoBg = {
    verde: "bg-emerald-500",
    amarillo: "bg-amber-500",
    rojo: "bg-red-500",
  }[estatus.semaforo ?? "amarillo"] ?? "bg-muted";

  // Resumen: estado emocional + primera tarea no terminada
  const resumen =
    estatus.estado_emocional?.trim() ||
    estatus.cierre_que_consigo?.trim() ||
    "Sin reflexión";

  return (
    <li>
      <Link
        href={`/estatus/ver?fecha=${estatus.fecha}`}
        className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${semaforoBg}`}
                aria-label={`Semáforo ${estatus.semaforo ?? "sin definir"}`}
              />
              <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">
                {estatus.fecha.slice(8, 10)}
              </div>
              <div className="text-[10px] uppercase text-muted-foreground">
                {nombreMesCorto(estatus.fecha)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {formatFechaLarga(estatus.fecha)}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {resumen}
              </p>
              {estatus.cierre_primer_problema_manana && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Mañana:</span>{" "}
                  {estatus.cierre_primer_problema_manana.slice(0, 80)}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ScoreHabitos estatus={estatus} />
            <div className="text-[10px] text-muted-foreground">
              {estatus.comidas?.length ?? 0} comidas
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function nombreMesCorto(fecha: string): string {
  const m = Number.parseInt(fecha.slice(5, 7), 10);
  return MESES[m - 1] ?? "";
}

function formatFechaLarga(fecha: string): string {
  // "2026-08-26" → "Miércoles 26 ago 2026" (es-ES, simple)
  const d = new Date(fecha + "T00:00:00");
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${dias[d.getDay()]} ${fecha.slice(8, 10)} ${nombreMesCorto(fecha)} ${fecha.slice(0, 4)}`;
}
