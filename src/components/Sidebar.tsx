"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconCalendar,
  IconCompass,
  IconHome,
  IconInbox,
  IconList,
  IconMenu,
  IconSettings,
  IconSparkles,
  IconTarget,
  IconX,
} from "@/components/icons";
import { SignOut } from "@/components/SignOut";

const LINKS = [
  { href: "/", label: "Hoy", Icon: IconHome },
  { href: "/captura", label: "Captura", Icon: IconInbox },
  { href: "/tareas", label: "Tareas", Icon: IconList },
  { href: "/plan-diario", label: "Plan diario", Icon: IconSparkles },
  { href: "/semana", label: "Semana", Icon: IconCalendar },
  { href: "/metas", label: "Metas", Icon: IconTarget },
  { href: "/norte", label: "Norte", Icon: IconCompass },
  { href: "/configuracion", label: "Configuración", Icon: IconSettings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior (móvil) */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md p-1.5 hover:bg-accent"
        >
          <IconMenu className="h-5 w-5" />
        </button>
        <span className="font-semibold tracking-tight">fooday·productivity</span>
      </div>

      {/* Drawer (móvil) */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-semibold tracking-tight">
                fooday·productivity
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-md p-1.5 hover:bg-accent"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <div className="mt-6 border-t border-border pt-4">
              <SignOut />
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-5 md:flex">
        <div className="mb-8 px-3 font-semibold tracking-tight">
          fooday<span className="text-muted-foreground">·productivity</span>
        </div>
        <NavItems />
        <div className="mt-auto border-t border-border px-3 pt-4">
          <SignOut />
        </div>
      </aside>
    </>
  );
}
