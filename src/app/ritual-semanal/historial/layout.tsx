import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Historial del ritual", template: "%s · fooday" },
  description:
    "Las semanas del ritual semanal: lo que decidiste cada semana, con su informe en PDF.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
