import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Plan de metas", template: "%s · fooday" },
  description: "Scorecard trimestral de KRs con proyección.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
