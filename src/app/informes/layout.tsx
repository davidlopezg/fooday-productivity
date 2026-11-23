import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Informes", template: "%s · fooday" },
  description: "KPIs, heatmap de actividad y reparto por proyecto y ámbito.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
