import type { Metadata } from "next";

// Título propio de la ruta: el layout raíz añade el sufijo de la marca
// ("%s · fooday"), así cada pestaña, marcador e historial dice dónde estás.
export const metadata: Metadata = {
  title: { default: "Configuración", template: "%s · fooday" },
  description: "IA, tema, prompt de pagos y tu perfil.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
