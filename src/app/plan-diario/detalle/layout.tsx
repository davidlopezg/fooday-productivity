import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Detalle del plan", template: "%s · fooday" },
  description: "Bloques, notas e informe de un plan diario.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
