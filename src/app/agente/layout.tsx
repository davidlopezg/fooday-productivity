import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Agente", template: "%s · fooday" },
  description: "Agente IA: cuenta un contexto y la IA propone proyecto, meta o captura.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
