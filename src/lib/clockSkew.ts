"use client";

// ============================================================================
// Reloj desincronizado (PGRST303) — store global + detector.
// ============================================================================
// Síntoma: Supabase rechaza peticiones con PGRST303 / "JWT issued at
// future" porque el reloj del navegador de David está adelantado respecto
// al servidor PostgREST. Esto rompe TODAS las queries autenticadas (RLS
// evalúa auth.uid() = null durante el rechazo) y, en consecuencia, el
// agente falla en cascada: fase 1 (metas) puede pasar (algunos INSERTs
// no se ven afectados), pero la fase 2 (KRs+tareas) y los SELECTs fallan
// todos.
//
// Solución real: arreglar el reloj del dispositivo (Ajustes → Fecha y
// hora → Automático). Esta página solo detecta y avisa.
//
// Implementación: un store global de Zustand-style manual (un objeto con
// subscribers). Cualquier capa puede marcar el reloj como desincronizado
// y un banner en AppShell lo muestra sin importar la pantalla.
// ============================================================================

type Listener = (desincronizado: boolean) => void;

class ClockSkewStore {
  private desincronizado = false;
  private listeners: Set<Listener> = new Set();

  /** Llamar cuando una query de Supabase devuelve PGRST303 / JWT future. */
  reportar(): void {
    if (this.desincronizado) return;
    this.desincronizado = true;
    for (const l of this.listeners) l(true);
  }

  /** Llamar tras signOut/signIn exitoso con JWT nuevo (reloj OK otra vez). */
  limpiar(): void {
    if (!this.desincronizado) return;
    this.desincronizado = false;
    for (const l of this.listeners) l(false);
  }

  isDesincronizado(): boolean {
    return this.desincronizado;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

let _store: ClockSkewStore | null = null;

export function getClockSkewStore(): ClockSkewStore {
  if (typeof window === "undefined") {
    // SSR: store vacío que no hace nada.
    return {
      reportar: () => {},
      limpiar: () => {},
      isDesincronizado: () => false,
      subscribe: () => () => {},
    } as unknown as ClockSkewStore;
  }
  if (!_store) _store = new ClockSkewStore();
  return _store;
}

/** Helper para usar desde cualquier punto: devuelve true si el mensaje
 *  de error de Supabase indica PGRST303 / JWT future / clock skew. */
export function esErrorClockSkew(msg: string | null | undefined): boolean {
  if (!msg) return false;
  return (
    msg.includes("PGRST303") ||
    msg.includes("JWT issued at future") ||
    msg.toLowerCase().includes("clock skew")
  );
}
