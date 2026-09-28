"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type SVGProps } from "react";
import {
  IconCalendar,
  IconCheck,
  IconCompass,
  IconFlag,
  IconHeart,
  IconHistory,
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

type IconComponent = (p: SVGProps<SVGSVGElement>) => React.ReactElement;
type NavItem = { href: string; label: string; Icon: IconComponent };
type NavSection = { label?: string; items: NavItem[] };

// Items sueltos fuera de la sección Tareas
const TOP_ITEMS: NavItem[] = [
  { href: "/", label: "Hoy", Icon: IconHome },
  { href: "/captura", label: "Capturar", Icon: IconInbox },
  { href: "/norte", label: "Norte", Icon: IconCompass },
  { href: "/metas", label: "Metas", Icon: IconTarget },
  { href: "/semana", label: "Semana", Icon: IconCalendar },
];

// Sección Tareas
const TASKS_SECTION: NavSection = {
  label: "Tareas",
  items: [
    { href: "/tareas", label: "Tareas", Icon: IconList },
    { href: "/tareas/completadas", label: "Completadas", Icon: IconCheck },
    { href: "/pipeline", label: "Prioridad", Icon: IconFlag },
    { href: "/plan-diario", label: "Plan diario", Icon: IconSparkles },
    { href: "/plan-diario/historico", label: "Histórico de planes", Icon: IconHistory },
  ],
};

// Utilidades al final
const UTIL_ITEMS: NavItem[] = [
  { href: "/dashboard-emocional", label: "Dashboard emocional", Icon: IconHeart },
  { href: "/configuracion", label: "Configuración", Icon: IconSettings },
];

function NavLink({
  href,
  label,
  Icon,
  active,
  onNavigate,
}: NavItem & { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}

function NavSection({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {section.label && (
        <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {section.label}
        </h3>
      )}
      {section.items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <NavLink
            key={item.href}
            {...item}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5">
      <NavSection section={{ items: TOP_ITEMS }} pathname={pathname} onNavigate={onNavigate} />
      <NavSection section={TASKS_SECTION} pathname={pathname} onNavigate={onNavigate} />
      <div className="border-t border-border pt-4">
        <NavSection section={{ items: UTIL_ITEMS }} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior (móvil) */}
      <div className="safe-t sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="-ml-2 rounded-md p-2 hover:bg-accent active:bg-accent"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="font-semibold tracking-tight">fooday·productivity</span>
        </div>
      </div>

      {/* Drawer (móvil) */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="safe-t safe-b absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-card px-4 pb-4">
            <div className="flex h-14 shrink-0 items-center justify-between">
              <span className="font-semibold tracking-tight">
                fooday·productivity
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="-mr-2 rounded-md p-2 hover:bg-accent active:bg-accent"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <NavItems onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-border pt-4">
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
