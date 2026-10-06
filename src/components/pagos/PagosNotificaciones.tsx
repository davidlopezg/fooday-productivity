"use client";

import { useEffect, useState } from "react";
import { useData } from "@/lib/useData";
import {
  fetchPagosPorFechaProgramada,
} from "@/lib/pagos/queries";
import type { PagoConUrgencia } from "@/lib/pagos/types";

/** Componente "invisible": se monta en la home y, si es domingo por la
 *  noche, dispara una notificación local PWA recordando los pagos del lunes.
 *
 *  Limitaciones honestas:
 *  · Solo notifica si el usuario ABRE la app (no es push real).
 *  · Si el usuario nunca abre la app el domingo, no notifica.
 *  · Pide permiso la primera vez (botón del navegador).
 *  · Usa localStorage para no notificar más de una vez al día.
 *
 *  Para tener push real (que avise aunque no abras la app), haría falta
 *  un backend con Web Push + VAPID. Lo dejamos fuera del MVP. */
export function PagosNotificaciones() {
  const [lunesISO, setLunesISO] = useState<string | null>(null);

  // Calcula el próximo lunes una sola vez al montar
  useEffect(() => {
    const hoy = new Date();
    const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
    const diff = (8 - dow) % 7; // 0 si ya es lunes
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    setLunesISO(lunes.toISOString().slice(0, 10));
  }, []);

  // Carga los pagos del próximo lunes
  const pagosQ = useData(
    async () => (lunesISO ? fetchPagosPorFechaProgramada(lunesISO) : []),
    [] as PagoConUrgencia[],
    [lunesISO],
  );

  // Lanza la notificación si toca
  useEffect(() => {
    if (!lunesISO) return;
    if (pagosQ.loading) return;
    if (pagosQ.data.length === 0) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return; // navegador sin soporte

    const ahora = new Date();
    const diaSemana = ahora.getDay(); // 0=domingo, 1=lunes
    const hora = ahora.getHours();

    // Solo notifica en DOMINGO entre 18:00 y 23:59
    if (diaSemana !== 0 || hora < 18) return;

    // Anti-spam: máximo 1 vez por día
    const lastKey = "pagos_notif_last";
    const last = localStorage.getItem(lastKey);
    const hoyISO = ahora.toISOString().slice(0, 10);
    if (last === hoyISO) return;

    void notificar(pagosQ.data, lunesISO).then((ok) => {
      if (ok) localStorage.setItem(lastKey, hoyISO);
    });
  }, [lunesISO, pagosQ.loading, pagosQ.data]);

  return null;
}

async function notificar(
  pagos: PagoConUrgencia[],
  lunesISO: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;

  let permiso = Notification.permission;
  if (permiso === "default") {
    permiso = await Notification.requestPermission();
  }
  if (permiso !== "granted") return false;

  const total = pagos.reduce(
    (acc, p) => acc + (p.importe_total - p.importe_pagado),
    0,
  );
  const fmtEUR = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(total);

  const lunes = new Date(lunesISO + "T00:00:00");
  const lunesLabel = lunes.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
  });

  const n = pagos.length;
  const title = `Mañana ${lunesLabel} pagas ${fmtEUR}`;
  const body =
    n === 1
      ? `1 recibo pendiente. Revísalo en /pagos.`
      : `${n} recibos pendientes. Revísalos en /pagos.`;

  try {
    new Notification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "pagos-lunes",
      requireInteraction: false,
    });
    return true;
  } catch (e) {
    console.warn("[pagos] fallo al notificar:", e);
    return false;
  }
}
