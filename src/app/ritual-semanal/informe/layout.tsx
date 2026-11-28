import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Informe del ritual", template: "%s · fooday" },
  description:
    "El informe de una semana de ritual semanal, listo para descargar en PDF.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
