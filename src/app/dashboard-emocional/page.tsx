"use client";

import { useMemo, useState } from "react";
import { fetchEmocionalStats } from "@/lib/queries";
import { useData } from "@/lib/useData";

// Mapeo etiqueta → número (1-4) para poder graficar tendencia
const MAPAS = {
  despertar: {
    "Con energía": 4,
    "Cansado pero estable": 3,
    Agotado: 2,
    Ansioso: 1,
  },
  mente: {
    "Relativamente clara": 4,
    Acelerada: 3,
    Nublada: 2,
    Oscura: 1,
  },
  cuerpo: {
    Liviano: 4,
    Tenso: 3,
    Dolorido: 2,
    "Me cuesta habitarlo": 1,
  },
  rueda: {
    "No, estoy presente": 4,
    "Un poco": 3,
    "Sí, todo me arrastra": 2,
    "Totalmente sobrepasado": 1,
  },
} as const;

type Dimension = keyof typeof MAPAS;
const DIMENSIONES: { key: Dimension; label: string; emoji: string }[] = [
  { key: "despertar", label: "Despertar", emoji: "🌅" },
  { key: "mente", label: "Mente", emoji: "🧠" },
  { key: "cuerpo", label: "Cuerpo", emoji: "💪" },
  { key: "rueda", label: "Rueda del ratón", emoji: "🌀" },
];

type Rango = "7" | "30" | "90" | "365";

export default function DashboardEmocionalPage() {
  const [rango, setRango] = useState<Rango>("30");

  const statsQ = useData(() => fetchEmocionalStats(parseInt(rango, 10)), {
    serie: [],
    totalDias: 0,
    distSem: { verde: 0, amarillo: 0, rojo: 0, sin_definir: 0 },
  });

  // Cálculos agregados
  const medias = useMemo(() => {
    const acc: Record<Dimension, { sum: number; n: number }> = {
      despertar: { sum: 0, n: 0 },
      mente: { sum: 0, n: 0 },
      cuerpo: { sum: 0, n: 0 },
      rueda: { sum: 0, n: 0 },
    };
    for (const p of statsQ.data.serie) {
      for (const dim of DIMENSIONES) {
        const m = MAPAS[dim.key] as Record<string, number>;
        const v = m[p[dim.key] ?? ""];
        if (typeof v === "number") {
          acc[dim.key].sum += v;
          acc[dim.key].n++;
        }
      }
    }
    return acc;
  }, [statsQ.data.serie]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">💚 Dashboard emocional</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evolución de tu estado emocional en el tiempo.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Rango:</span>
          {(["7", "30", "90", "365"] as Rango[]).map((r) => (
            <button
              key={r}
              onClick={() => setRango(r)}
              className={`rounded-md border px-3 py-1 text-xs ${
                rango === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              Últimos {r}d
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {statsQ.loading ? "Cargando…" : `${statsQ.data.totalDias} días con plan`}
          </span>
        </div>
      </section>

      {/* Distribución semáforo */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">
          🚦 Distribución de semáforos
        </h2>
        <SemaforoBarras dist={statsQ.data.distSem} />
      </section>

      {/* 4 mini-gráficos */}
      <section className="grid gap-4 sm:grid-cols-2">
        {DIMENSIONES.map((dim) => (
          <article key={dim.key} className="rounded-xl border border-border bg-card p-5">
            <header className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">
                {dim.emoji} {dim.label}
              </h2>
              <span className="text-xs text-muted-foreground">
                media{" "}
                {medias[dim.key].n > 0
                  ? (medias[dim.key].sum / medias[dim.key].n).toFixed(1)
                  : "—"}
                /4
              </span>
            </header>
            <SparkLine
              values={statsQ.data.serie.map((p) => {
                const m = MAPAS[dim.key] as Record<string, number>;
                const v = m[p[dim.key] ?? ""];
                return typeof v === "number" ? v : null;
              })}
              labels={statsQ.data.serie.map((p) => p.fecha.slice(5))}
            />
          </article>
        ))}
      </section>

      {/* Reflexiones recientes */}
      {statsQ.data.serie.some((p) => p.reflexion) && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">📝 Reflexiones recientes</h2>
          <ul className="space-y-3">
            {statsQ.data.serie
              .filter((p) => p.reflexion)
              .slice(-10)
              .reverse()
              .map((p) => (
                <li key={p.fecha} className="border-l-2 border-primary/40 pl-3">
                  <div className="text-xs font-medium text-muted-foreground">{p.fecha}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{p.reflexion}</p>
                </li>
              ))}
          </ul>
        </section>
      )}

      {statsQ.data.totalDias === 0 && !statsQ.loading && (
        <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no hay datos. Ve a{" "}
            <a href="/plan-diario" className="font-medium text-foreground underline underline-offset-4">
              Plan diario
            </a>{" "}
            y genera tu primer plan para empezar a ver tu evolución.
          </p>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// Sub-componentes (SVG inline, sin libs externas)
// ============================================================================

function SemaforoBarras({ dist }: { dist: { verde: number; amarillo: number; rojo: number; sin_definir: number } }) {
  const total = dist.verde + dist.amarillo + dist.rojo + dist.sin_definir;
  if (total === 0) return <p className="text-xs text-muted-foreground">Sin datos.</p>;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const rows = [
    { label: "🟢 Verde", value: dist.verde, color: "bg-emerald-500" },
    { label: "🟡 Amarillo", value: dist.amarillo, color: "bg-amber-500" },
    { label: "🔴 Rojo", value: dist.rojo, color: "bg-red-500" },
    ...(dist.sin_definir > 0
      ? [{ label: "Sin definir", value: dist.sin_definir, color: "bg-muted-foreground/40" }]
      : []),
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-xs">
          <span className="w-24 shrink-0 font-medium">{r.label}</span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${r.color}`}
              style={{ width: `${pct(r.value)}%`, transition: "width 0.3s" }}
            />
          </div>
          <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
            {r.value} · {pct(r.value).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mini-gráfico de línea (sparkline) con puntos y etiquetas */
function SparkLine({
  values,
  labels,
}: {
  values: (number | null)[];
  labels: string[];
}) {
  const W = 280;
  const H = 80;
  const PAD = 8;

  // Filtra null
  const puntos = values
    .map((v, i) => ({ x: i, y: v, label: labels[i] }))
    .filter((p) => p.y !== null) as { x: number; y: number; label: string }[];

  if (puntos.length === 0) {
    return <p className="text-xs text-muted-foreground">Sin datos.</p>;
  }

  const stepX = puntos.length > 1 ? (W - PAD * 2) / (puntos.length - 1) : 0;
  const yToPx = (y: number) => H - PAD - ((y - 1) / 3) * (H - PAD * 2);

  const path = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${PAD + p.x * stepX} ${yToPx(p.y)}`).join(" ");

  // área bajo la curva
  const areaPath =
    puntos.length > 1
      ? `${path} L ${PAD + (puntos.length - 1) * stepX} ${H - PAD} L ${PAD} ${H - PAD} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-20 w-full"
      role="img"
      aria-label="Tendencia emocional"
    >
      {/* Líneas de referencia 1,2,3,4 */}
      {[1, 2, 3, 4].map((y) => (
        <line
          key={y}
          x1={PAD}
          x2={W - PAD}
          y1={yToPx(y)}
          y2={yToPx(y)}
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeDasharray="2,3"
        />
      ))}
      {/* área */}
      {areaPath && <path d={areaPath} fill="currentColor" fillOpacity={0.08} />}
      {/* línea */}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      {/* puntos */}
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={PAD + p.x * stepX} cy={yToPx(p.y)} r={2.5} fill="currentColor" />
          <title>{`${p.label}: ${p.y}/4`}</title>
        </g>
      ))}
    </svg>
  );
}