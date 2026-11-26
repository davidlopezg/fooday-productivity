import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Ritual semanal", template: "%s · fooday" },
  description:
    "El ritual semanal en 4 pasos: proyectos, metas, 3 WIGs y los KRs de la semana.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
