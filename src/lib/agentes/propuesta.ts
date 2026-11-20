import type { Prioridad } from "@/lib/types";

export type PropuestaTarea = {
  titulo: string;
  descripcion?: string;
  prioridad?: Prioridad;
  fecha_fin?: string | null;
};

/** Extrae respuesta y propuesta de la salida del agente. */
export function parsearRespuestaAgente(texto: string): {
  contenido: string;
  propuesta: PropuestaTarea | null;
} {
  try {
    const obj = JSON.parse(texto) as {
      respuesta?: string;
      propuesta?: PropuestaTarea;
    };
    if (!obj.respuesta) throw new Error("sin respuesta");
    const p = obj.propuesta;
    const valida = p && typeof p.titulo === "string" && p.titulo.trim();
    return {
      contenido: obj.respuesta,
      propuesta: valida
        ? { ...p, titulo: p.titulo.trim() }
        : null,
    };
  } catch {
    return { contenido: texto.trim(), propuesta: null };
  }
}
