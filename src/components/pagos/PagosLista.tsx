"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/useData";
import {
  fetchPagosConUrgencia,
  fetchPagosHistorico,
  fetchPagosPorFechaProgramada,
  fetchPagosUrgentes,
} from "@/lib/pagos/queries";
import { refreshPagosVencidos } from "@/lib/pagos/mutations";
import { PagoCard } from "@/components/pagos/PagoCard";
import {
  type EstadoPago,
  type PagoConUrgencia,
} from "@/lib/pagos/types";
import { IconPlus } from "@/components/icons";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const fmtFechaLarga = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

/** Devuelve el próximo lunes (o el de hoy si ya es lunes). */
function proximoLunesISO(): string {
  const hoy = new Date();
  const dow = hoy.getDay() === 0 ? 7 : hoy.getDay(); // ISO: 1=lun, 7=dom
  const diff = (8 - dow) % 7; // 0 si ya es lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  return lunes.toISOString().slice(0, 10);
}

type Tab = "lunes" | "pendientes" | "historico";

const TABS: { key: Tab; label: string }[] = [
  { key: "lunes", label: "Este lunes" },
  { key: "pendientes", label: "Pendientes" },
  { key: "historico", label: "Histórico" },
];

export function PagosLista({ onNuevo }: { onNuevo?: () => void }) {
  const [tab, setTab] = useState<Tab>("lunes");
  const [refreshKey, setRefreshKey] = useState(0);

  // Datos del tab "lunes": programado para el próximo lunes + urgentes pr. 7d
  const lunesISO = useMemo(() => proximoLunesISO(), []);
  const lunesDate = useMemo(() => new Date(lunesISO + "T00:00:00"), [lunesISO]);

  // Cargamos los 3 conjuntos en paralelo (1 query por conjunto).
  // La pantalla es client-side: cambiar de tab no recarga nada.
  const lunesQ = useData(
    () => fetchPagosPorFechaProgramada(lunesISO),
    [] as PagoConUrgencia[],
    [lunesISO, refreshKey],
  );
  const urgentesQ = useData(
    () => fetchPagosUrgentes(7),
    [] as PagoConUrgencia[],
    [refreshKey],
  );
  const pendientesQ = useData(
    () =>
      fetchPagosConUrgencia({
        estados: ["pendiente", "programado", "vencido", "pagado_parcial"],
      }),
    [] as PagoConUrgencia[],
    [refreshKey],
  );
  const historicoQ = useData(
    () => fetchPagosHistorico(200),
    [] as PagoConUrgencia[],
    [refreshKey],
  );

  // Al montar, refresca vencidos (1 query idempotente).
  useEffect(() => {
    refreshPagosVencidos()
      .then((n) => {
        if (n > 0) setRefreshKey((k) => k + 1);
      })
      .catch((e) => console.warn("[pagos] refresh_vencidos falló:", e));
  }, []);

  const reload = () => setRefreshKey((k) => k + 1);

  const isLoading =
    lunesQ.loading ||
    urgentesQ.loading ||
    pendientesQ.loading ||
    historicoQ.loading;
  const error =
    lunesQ.error || urgentesQ.error || pendientesQ.error || historicoQ.error;

  // Totales
  const totalLunes = lunesQ.data.reduce(
    (acc, p) => acc + (p.importe_total - p.importe_pagado),
    0,
  );
  const totalUrgentes = urgentesQ.data.reduce(
    (acc, p) => acc + (p.importe_total - p.importe_pagado),
    0,
  );
  const totalPendientes = pendientesQ.data.reduce(
    (acc, p) => acc + (p.importe_total - p.importe_pagado),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Cabecera con tabs + botón nuevo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onNuevo && (
          <button
            type="button"
            onClick={onNuevo}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo pago
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm">
          <p className="font-medium text-red-600 dark:text-red-400">
            Error al cargar pagos
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      )}

      {tab === "lunes" && (
        <TabEsteLunes
          lunesISO={lunesISO}
          lunesDate={lunesDate}
          pagosLunes={lunesQ.data}
          pagosUrgentes={urgentesQ.data}
          totalLunes={totalLunes}
          totalUrgentes={totalUrgentes}
          onChanged={reload}
          loading={lunesQ.loading || urgentesQ.loading}
        />
      )}

      {tab === "pendientes" && (
        <TabPendientes
          pagos={pendientesQ.data}
          total={totalPendientes}
          onChanged={reload}
          loading={pendientesQ.loading}
        />
      )}

      {tab === "historico" && (
        <TabHistorico
          pagos={historicoQ.data}
          loading={historicoQ.loading}
        />
      )}

      {isLoading && !error && (
        <p className="text-center text-xs text-muted-foreground">Cargando…</p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-componentes por tab
// ----------------------------------------------------------------------------

function TabEsteLunes({
  lunesISO,
  lunesDate,
  pagosLunes,
  pagosUrgentes,
  totalLunes,
  totalUrgentes,
  onChanged,
  loading,
}: {
  lunesISO: string;
  lunesDate: Date;
  pagosLunes: PagoConUrgencia[];
  pagosUrgentes: PagoConUrgencia[];
  totalLunes: number;
  totalUrgentes: number;
  onChanged: () => void;
  loading: boolean;
}) {
  // Urgentes que NO están ya en el lunes (para no duplicar).
  const urgentesFueraDeLunes = pagosUrgentes.filter(
    (u) => !pagosLunes.some((l) => l.id === u.id),
  );

  return (
    <div className="space-y-6">
      {/* Bloque rojo "Este lunes" */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">
            <span className="mr-2">🔴</span>
            {lunesDate.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              A pagar
            </div>
            <div className="font-mono text-xl font-bold tabular-nums">
              {fmtEUR(totalLunes)}
            </div>
          </div>
        </div>
        {pagosLunes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No tienes pagos programados para el lunes. ✨
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Los pagos que muevas a esta fecha con el botón "⏩ Al lunes siguiente" aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagosLunes.map((p) => (
              <PagoCard key={p.id} pago={p} onChanged={onChanged} />
            ))}
          </div>
        )}
      </section>

      {/* Bloque amarillo "Urgencia" */}
      {urgentesFueraDeLunes.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">
              <span className="mr-2">⚠️</span>
              Vence esta semana
            </h2>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Importe
              </div>
              <div className="font-mono text-base font-semibold tabular-nums">
                {fmtEUR(totalUrgentes)}
              </div>
            </div>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Pagos que vencen en los próximos 7 días y aún no están programados para este lunes. Si tu tesorería lo permite, considera moverlos.
          </p>
          <div className="space-y-2">
            {urgentesFueraDeLunes.map((p) => (
              <PagoCard key={p.id} pago={p} onChanged={onChanged} />
            ))}
          </div>
        </section>
      )}

      {loading && pagosLunes.length === 0 && pagosUrgentes.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">Cargando…</p>
      )}
    </div>
  );
}

function TabPendientes({
  pagos,
  total,
  onChanged,
  loading,
}: {
  pagos: PagoConUrgencia[];
  total: number;
  onChanged: () => void;
  loading: boolean;
}) {
  if (!loading && pagos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-lg">🎉</p>
        <p className="mt-2 text-sm font-medium">No tienes pagos pendientes</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Todo al día. Cuando llegue una factura, la verás aquí.
        </p>
      </div>
    );
  }

  // Agrupa por estado
  const porEstado = new Map<EstadoPago, PagoConUrgencia[]>();
  for (const p of pagos) {
    const arr = porEstado.get(p.estado_efectivo) ?? [];
    arr.push(p);
    porEstado.set(p.estado_efectivo, arr);
  }
  const ordenEstados: EstadoPago[] = [
    "vencido",
    "pagado_parcial",
    "programado",
    "pendiente",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Pendientes</h2>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Total pendiente
          </div>
          <div className="font-mono text-xl font-bold tabular-nums">
            {fmtEUR(total)}
          </div>
        </div>
      </div>

      {ordenEstados.map((est) => {
        const lista = porEstado.get(est) ?? [];
        if (lista.length === 0) return null;
        return (
          <section key={est}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {est === "vencido"
                ? `🔴 Vencidos (${lista.length})`
                : est === "pagado_parcial"
                ? `🟡 Pagados parcialmente (${lista.length})`
                : est === "programado"
                ? `🔵 Programados (${lista.length})`
                : `⚪ Pendientes (${lista.length})`}
            </h3>
            <div className="space-y-2">
              {lista.map((p) => (
                <PagoCard key={p.id} pago={p} onChanged={onChanged} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TabHistorico({
  pagos,
  loading,
}: {
  pagos: PagoConUrgencia[];
  loading: boolean;
}) {
  if (!loading && pagos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm font-medium">Aún no hay pagos registrados</p>
        <p className="mt-1 text-xs text-muted-foreground">
          El histórico se va rellenando según vas pagando.
        </p>
      </div>
    );
  }

  // Agrupa por mes (YYYY-MM)
  const porMes = new Map<string, PagoConUrgencia[]>();
  for (const p of pagos) {
    const fecha = p.fecha_pago_real ?? p.updated_at;
    const key = fecha.slice(0, 7); // YYYY-MM
    const arr = porMes.get(key) ?? [];
    arr.push(p);
    porMes.set(key, arr);
  }
  const meses = Array.from(porMes.keys()).sort().reverse();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Histórico</h2>
      {meses.map((mes) => {
        const lista = porMes.get(mes) ?? [];
        const total = lista.reduce(
          (acc, p) => acc + p.importe_pagado,
          0,
        );
        const [anio, numMes] = mes.split("-");
        const mesLabel = new Date(
          Number(anio),
          Number(numMes) - 1,
          1,
        ).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        return (
          <section key={mes}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mesLabel}
              </h3>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {fmtEUR(total)}
              </span>
            </div>
            <div className="space-y-2">
              {lista.map((p) => (
                <PagoCard
                  key={p.id}
                  pago={p}
                  onChanged={() => {}}
                  sinAcciones
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Estado vacío global (cuando no hay NINGÚN pago en absoluto)
// ----------------------------------------------------------------------------
export function PagosEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
      <p className="text-2xl">💸</p>
      <p className="mt-3 text-sm font-medium">Aún no has dado de alta ningún pago</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Crea tu primer pago con el botón "Nuevo pago" de arriba, o sube el PDF
        de una factura y autocompletaremos los datos.
      </p>
    </div>
  );
}
