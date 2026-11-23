import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Calendario", template: "%s · fooday" },
  description: "Time-blocking: 4 bloques fijos al día durante la semana.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
