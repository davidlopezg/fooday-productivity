import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Estatus diario", template: "%s · fooday" },
  description: "9 hábitos, auditoría 20/80 y cierre cognitivo.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
