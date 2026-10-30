"use client";

// ============================================================================
// usePropuestaRecuperacion.ts — el hook que alimenta el Modo Recuperación.
// ----------------------------------------------------------------------------
// QUÉ ES
//   Un único sitio que:
//     1. carga los datos que el motor necesita (tareas, metas, pagos, plan
//        de hoy, estado emocional),
//     2. calcula la propuesta determinista,
//     3. expone los avisos y las descartables agrupadas.
//
// POR QUÉ UN HOOK Y NO UN COMPONENTE
//   Porque la propuesta se pinta en DOS sitios: la home `/` (Fase 4) y
//   `/plan-diario` (Fase 3, el modo sombra). Si cada uno montara su propia
//   lógica de carga, acabarían divergiendo. El motor es el mismo; la
//   carga también.
//
// LO QUE NO HACE
//   · No escribe nada en la base de datos. Esto es LECTURA.
//   · No llama a la IA: la selección es determinista.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { fetchMetas, fetchPlanHoy, fetchTareas } from "@/lib/queries";
import { fetchPagosConUrgencia } from "@/lib/pagos/queries";
import { fetchAparcamientos } from "@/lib/recuperacion/feedback";
import { calcularPropuestaShadow, type PropuestaShadow } from "@/lib/recuperacion/shadow";
import { localYMD } from "@/lib/semana";

export type EstadoPropuesta = {
  propuesta: PropuestaShadow | null;
  cargando: boolean;
  error: string | null;
  /** Recarga los datos y recalcula la propuesta. */
  recargar: () => Promise<void>;
};

/**
 * Calcula la propuesta del Modo Recuperación para hoy.
 *
 * @param enabled  Si es false, no carga nada (útil para no gastar consultas
 *                 hasta que el usuario abre el panel).
 */
export function usePropuestaRecuperacion(enabled = true): EstadoPropuesta {
  const [propuesta, setPropuesta] = useState<PropuestaShadow | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const hoy = localYMD(new Date());

      const [tareas, metas, pagos, planActual, apartados] = await Promise.all([
        fetchTareas("pendiente"),
        fetchMetas(),
        fetchPagosConUrgencia(),
        fetchPlanHoy(),
        fetchAparcamientos(),
      ]);

      // El estado emocional de HOY: si el plan ya existe, trae su semáforo;
      // si no, se estimate a partir de los 5 selects.
      const estado = planActual
        ? {
            despertar: planActual.despertar ?? null,
            rueda: planActual.rueda ?? null,
            necesidad: planActual.necesidad ?? null,
          }
        : null;

      const p = calcularPropuestaShadow({
        tareas,
        metas,
        pagos: pagos as never,
        planActual: planActual as never,
        estado,
        hoy,
      });

      // Las tareas apartadas por el usuario no se proponen. Se calculan
      // AQUÍ (fuera del motor) para que el motor siga siendo puro.
      const filtrada = aplicarApartados(p, apartados);

      setPropuesta(filtrada);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo calcular la propuesta.",
      );
      setPropuesta(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void recargar();
  }, [enabled, recargar]);

  return { propuesta, cargando, error, recargar };
}

/**
 * Aplica los apartados (feedback del usuario) a la propuesta.
 *
 * No se hace dentro del motor a propósito: `seleccionarPlan()` es puro y
 * determinista, y meterle una BD dentro lo convertiría en algo imposible
 * de testear. El filtro es una capa fina encima.
 */
function aplicarApartados(
  propuesta: PropuestaShadow,
  apartados: { bloqueadas: Set<string>; pospuestasHasta: Map<string, string> },
): PropuestaShadow {
  const { bloqueadas, pospuestasHasta } = apartados;
  const hoy = new Date().toISOString().slice(0, 10);

  const fuera = (id: string) =>
    bloqueadas.has(id) ||
    (pospuestasHasta.has(id) && (pospuestasHasta.get(id) as string) > hoy);

  const r = propuesta.resultado;
  const plan = r.plan.filter((s) => !fuera(s.tarea.id));
  const principal = r.principal && !fuera(r.principal.tarea.id) ? r.principal : null;
  const secundarias = r.secundarias.filter((s) => !fuera(s.tarea.id));
  const mantenimiento =
    r.mantenimiento && !fuera(r.mantenimiento.tarea.id) ? r.mantenimiento : null;
  const bienestar = r.bienestar && !fuera(r.bienestar.tarea.id) ? r.bienestar : null;

  // Los descartables son las que NO entran: si el usuario la apartó, sale
  // de aquí (ya está en "apartadas", no en el inventario del día).
  const descartables = r.descartables.filter((d) => !fuera(d.tarea.id));

  const resultado = {
    ...r,
    plan,
    principal,
    secundarias,
    mantenimiento,
    bienestar,
    descartables,
  };

  return {
    ...propuesta,
    resultado,
    resumen: construirResumenLocal(resultado, propuesta.nivel),
  };
}

/** Copia local de `construirResumen` (evita una dependencia circular). */
function construirResumenLocal(
  r: PropuestaShadow["resultado"],
  nivel: PropuestaShadow["nivel"],
): string {
  const n = r.plan.length;
  if (n === 0) {
    return "No hay nada que el sistema proponga para hoy con estos datos.";
  }
  const partes = [`${n} tarea${n === 1 ? "" : "s"}`];
  if (r.principal) partes.push("1 principal");
  if (r.secundarias.length) {
    partes.push(`${r.secundarias.length} secundaria${r.secundarias.length === 1 ? "" : "s"}`);
  }
  if (r.mantenimiento) partes.push("1 mantenimiento");
  if (r.bienestar) partes.push("1 de bienestar");
  const sufijo =
    nivel === "alta" ? "carga completa" : nivel === "media" ? "carga media" : "carga mínima";
  return `${partes.join(" · ")} (${sufijo})`;
}
