import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Metas", template: "%s · fooday" },
  description: "Gestión de metas, sus KRs y su progreso.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
