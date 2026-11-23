import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Key Results", template: "%s · fooday" },
  description: "Inventario completo de KRs del sistema con su meta, entrega y progreso.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
