"use client";

import Link from "next/link";
import { useData } from "@/lib/useData";
import {
  fetchPagosPorFechaProgramada,
  fetchPagosUrgentes,
} from "@/lib/pagos/queries";
import type { PagoConUrgencia } from "@/lib/pagos/types";
import { IconWallet } from "@/components/icons";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/** Calcula el próximo lunes (o el de hoy si ya es lunes). */
function proximoLunes(): Date {
  const hoy = new Date();
  const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
  const diff = (8 - dow) % 7; // 0 si ya es lunes
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function esLunes(): boolean {
  const dow = new Date().getDay();
  return dow === 1;
}

/** Widget compacto para la home ("/"). Muestra:
 *   · Si es lunes: "Hoy pagas N recibos por X €" (bloque destacado)
 *   · Si no: "El lunes X pagas N recibos por Y €" + urgentes
 *   · Si no hay nada: "No tienes pagos pendientes" (compacto)
 */
export function PagosWidget() {
  const lunes = proximoLunes();
  const lunesISO = lunes.toISOString().slice(0, 10);
  const hoy = esLunes();

  const lunesQ = useData(
    () => fetchPagosPorFechaProgramada(lunesISO),
    [] as PagoConUrgencia[],
    [lunesISO],
  );
  const urgentesQ = useData(() => fetchPagosUrgentes(7), [] as PagoConUrgencia[], []);

  const pagos = lunesQ.data;
  const urgentesFueraDeLunes = urgentesQ.data.filter(
    (u) => !pagos.some((l) => l.id === u.id),
  );

  const total = pagos.reduce(
    (acc, p) => acc + (p.importe_total - p.importe_pagado),
    0,
  );

  if (lunesQ.loading && lunesQ.data.length === 0) {
    return null; // evita flash antes de cargar
  }

  // Si no hay nada ni el lunes ni en urgentes, mensaje tranquilo
  if (pagos.length === 0 && urgentesFueraDeLunes.length === 0) {
    return (
      <Link
        href="/pagos"
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-accent"
      >
        <span className="flex items-center gap-2">
          <IconWallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Sin pagos pendientes esta semana</span>
        </span>
        <span className="text-xs text-muted-foreground">→ /pagos</span>
      </Link>
    );
  }

  // Tono: rojo si es lunes, ámbar si vencen esta semana
  const tone = hoy
    ? "border-red-500/30 bg-red-500/5"
    : urgentesFueraDeLunes.length > 0
    ? "border-amber-500/30 bg-amber-500/5"
    : "border-border bg-card";

  return (
    <Link
      href="/pagos"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 ${tone}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-lg">{hoy ? "🔴" : "💸"}</span>
        <span className="text-sm">
          {hoy ? (
            <>
              <strong>Hoy pagas {pagos.length}</strong>{" "}
              {pagos.length === 1 ? "recibo" : "recibos"}
            </>
          ) : (
            <>
              <strong>
                El {lunes.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                })}
              </strong>{" "}
              pagas {pagos.length}
              {pagos.length === 1 ? " recibo" : " recibos"}
              {urgentesFueraDeLunes.length > 0 && (
                <span className="text-amber-700 dark:text-amber-300">
                  {" "}
                  + {urgentesFueraDeLunes.length} urgentes esta semana
                </span>
              )}
            </>
          )}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <span className="font-mono text-base font-semibold tabular-nums">
          {fmtEUR(total)}
        </span>
        <span className="text-xs text-muted-foreground">→ /pagos</span>
      </span>
    </Link>
  );
}
