import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Metodología", template: "%s · fooday" },
  description: "Los 5 pilares, los rituales y el índice de features.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
