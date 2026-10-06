"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/lib/useData";
import {
  fetchPagosConUrgencia,
  fetchPagosHistorico,
  fetchPagosPorFechaProgramada,
  fetchPagosUrgentes,
} from "@/lib/pagos/queries";
import { refreshPagosVencidos } from "@/lib/pagos/mutations";
import { PagoCard } from "@/components/pagos/PagoCard";
import { PagoFormModal } from "@/components/pagos/PagoFormModal";
import { PagoPagarParcialModal } from "@/components/pagos/PagoPagarParcialModal";
import { RecurrentesManager } from "@/components/pagos/RecurrentesManager";
import {
  type EstadoPago,
  type PagoConUrgencia,
} from "@/lib/pagos/types";
import { IconPlus, IconRepeat, IconSearch, IconX } from "@/components/icons";

/** Estado del modal activo. Solo uno a la vez. */
type ModalState =
  | { tipo: "crear" }
  | { tipo: "editar"; pago: PagoConUrgencia }
  | { tipo: "parcial"; pago: PagoConUrgencia }
  | { tipo: "recurrentes" }
  | null;

/** Filtra una lista de pagos por texto libre (proveedor o concepto).
 *  Case-insensitive, ignora acentos. */
function filtrarPagos(
  pagos: PagoConUrgencia[],
  busqueda: string,
): PagoConUrgencia[] {
  if (!busqueda.trim()) return pagos;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(busqueda.trim());
  return pagos.filter(
    (p) => norm(p.proveedor).includes(q) || norm(p.concepto).includes(q),
  );
}

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

const TABS: { key: Tab; label: string; descripcion: string }[] = [
  { key: "lunes", label: "Este lunes", descripcion: "¿Qué hago esta semana?" },
  { key: "pendientes", label: "Pendientes", descripcion: "¿Qué me queda por hacer en total?" },
  { key: "historico", label: "Histórico", descripcion: "¿Qué ya está cerrado?" },
];

export function PagosLista() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("lunes");
  const [refreshKey, setRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState>(null);
  const [busqueda, setBusqueda] = useState("");

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

  /** Refresco robusto: actualiza `vencido` en la BD + cambia el key
   *  para que `useData` revalide + fuerza un router.refresh() de Next.js
   *  para que el servidor también recargue. Devuelve Promise para que
   *  el caller pueda hacer `await reload()`. */
  const reload = async () => {
    try {
      await refreshPagosVencidos();
    } catch (e) {
      console.warn("[pagos] refresh_vencidos falló:", e);
    }
    setRefreshKey((k) => k + 1);
    router.refresh();
  };

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

  // Filtrado por búsqueda (cliente, sin query nueva)
  const lunesFiltrados = useMemo(
    () => filtrarPagos(lunesQ.data, busqueda),
    [lunesQ.data, busqueda],
  );
  const urgentesFiltrados = useMemo(
    () => filtrarPagos(urgentesQ.data, busqueda),
    [urgentesQ.data, busqueda],
  );
  const pendientesFiltrados = useMemo(
    () => filtrarPagos(pendientesQ.data, busqueda),
    [pendientesQ.data, busqueda],
  );
  const historicoFiltrado = useMemo(
    () => filtrarPagos(historicoQ.data, busqueda),
    [historicoQ.data, busqueda],
  );

  return (
    <div className="space-y-4">
      {/* Cabecera con tabs + botón nuevo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
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
          <p className="mt-1.5 px-1 text-xs italic text-muted-foreground">
            {TABS.find((t) => t.key === tab)?.descripcion}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Buscador */}
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar proveedor o concepto…"
              className="h-9 w-56 rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModal({ tipo: "recurrentes" })}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            title="Gestionar reglas recurrentes"
          >
            <IconRepeat className="h-4 w-4" />
            Reglas
          </button>
          <button
            type="button"
            onClick={() => setModal({ tipo: "crear" })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <IconPlus className="h-4 w-4" />
            Nuevo pago
          </button>
        </div>
      </div>

      {/* Banner "filtrando" */}
      {busqueda && (
        <div className="flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs">
          <span>
            Filtrando por &quot;<strong>{busqueda}</strong>&quot;:{" "}
            {tab === "lunes"
              ? `${lunesFiltrados.length} del lunes + ${urgentesFiltrados.length} urgentes`
              : tab === "pendientes"
              ? `${pendientesFiltrados.length} pendientes`
              : `${historicoFiltrado.length} históricos`}
          </span>
          <button
            type="button"
            onClick={() => setBusqueda("")}
            className="rounded px-2 py-0.5 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300"
          >
            Limpiar
          </button>
        </div>
      )}

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
          pagosLunes={lunesFiltrados}
          pagosUrgentes={urgentesFiltrados}
          totalLunes={totalLunes}
          totalUrgentes={totalUrgentes}
          onChanged={reload}
          onEdit={(pago) => setModal({ tipo: "editar", pago })}
          onPagoParcial={(pago) => setModal({ tipo: "parcial", pago })}
          loading={lunesQ.loading || urgentesQ.loading}
        />
      )}

      {tab === "pendientes" && (
        <TabPendientes
          pagos={pendientesFiltrados}
          total={totalPendientes}
          onChanged={reload}
          onEdit={(pago) => setModal({ tipo: "editar", pago })}
          onPagoParcial={(pago) => setModal({ tipo: "parcial", pago })}
          loading={pendientesQ.loading}
        />
      )}

      {tab === "historico" && (
        <TabHistorico
          pagos={historicoFiltrado}
          onEdit={(pago) => setModal({ tipo: "editar", pago })}
          loading={historicoQ.loading}
        />
      )}

      {isLoading && !error && (
        <p className="text-center text-xs text-muted-foreground">Cargando…</p>
      )}

      {/* Modales (solo uno a la vez) */}
      {modal?.tipo === "crear" && (
        <PagoFormModal
          modo="crear"
          onClose={() => setModal(null)}
          // Al crear, saltamos a "Pendientes" para que el usuario vea el
          // pago recién hecho. Por defecto, un pago nuevo sin fecha_pago_programada
          // y con fecha_vencimiento > 7 días no aparece en "Este lunes".
          onSaved={async () => {
            await reload();
            setTab("pendientes");
          }}
        />
      )}
      {modal?.tipo === "editar" && (
        <PagoFormModal
          modo="editar"
          pago={modal.pago}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.tipo === "parcial" && (
        <PagoPagarParcialModal
          pago={modal.pago}
          onClose={() => setModal(null)}
          onSaved={reload}
        />
      )}
      {modal?.tipo === "recurrentes" && (
        <RecurrentesManager
          onClose={() => setModal(null)}
          onChanged={reload}
        />
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
  onEdit,
  onPagoParcial,
  loading,
}: {
  lunesISO: string;
  lunesDate: Date;
  pagosLunes: PagoConUrgencia[];
  pagosUrgentes: PagoConUrgencia[];
  totalLunes: number;
  totalUrgentes: number;
  onChanged: () => void;
  onEdit: (pago: PagoConUrgencia) => void;
  onPagoParcial: (pago: PagoConUrgencia) => void;
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
              <PagoCard
                key={p.id}
                pago={p}
                onChanged={onChanged}
                onEdit={onEdit}
                onPagoParcial={onPagoParcial}
              />
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
              <PagoCard
                key={p.id}
                pago={p}
                onChanged={onChanged}
                onEdit={onEdit}
                onPagoParcial={onPagoParcial}
              />
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
  onEdit,
  onPagoParcial,
  loading,
}: {
  pagos: PagoConUrgencia[];
  total: number;
  onChanged: () => void;
  onEdit: (pago: PagoConUrgencia) => void;
  onPagoParcial: (pago: PagoConUrgencia) => void;
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
                <PagoCard
                  key={p.id}
                  pago={p}
                  onChanged={onChanged}
                  onEdit={onEdit}
                  onPagoParcial={onPagoParcial}
                />
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
  onEdit,
  loading,
}: {
  pagos: PagoConUrgencia[];
  onEdit: (pago: PagoConUrgencia) => void;
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
                  onEdit={onEdit}
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
