"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type SVGProps } from "react";
import {
  IconBolt,
  IconBook,
  IconCalendar,
  IconChart,
  IconCheck,
  IconClipboardCheck,
  IconCompass,
  IconFlag,
  IconFolder,
  IconHeart,
  IconHistory,
  IconHome,
  IconInbox,
  IconList,
  IconLogout,
  IconMenu,
  IconSettings,
  IconSparkles,
  IconTarget,
  IconWallet,
  IconX,
} from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

type IconComponent = (p: SVGProps<SVGSVGElement>) => React.ReactElement;
type NavItem = { href: string; label: string; Icon: IconComponent };
type NavSection = { label?: string; items: NavItem[] };

// Bloque 1 — Acción y Captura Rápida (el día a día)
const QUICK_ITEMS: NavItem[] = [
  { href: "/", label: "Hoy", Icon: IconHome },
  { href: "/captura", label: "Capturar", Icon: IconInbox },
];

// Bloque 2 — Dirección y Planificación Estratégica
const STRATEGY_ITEMS: NavItem[] = [
  { href: "/norte", label: "Norte", Icon: IconCompass },
  { href: "/metas", label: "Metas", Icon: IconTarget },
  { href: "/metas/plan", label: "Plan trimestral", Icon: IconCalendar },
  { href: "/proyectos", label: "Proyectos", Icon: IconFolder },
];

// Bloque 3 — Ejecución y Organización
const EXEC_ITEMS: NavItem[] = [
  { href: "/semana", label: "Semana", Icon: IconCalendar },
  { href: "/tareas", label: "Tareas", Icon: IconList },
  { href: "/tareas/inbox", label: "Inbox", Icon: IconInbox },
  { href: "/pipeline", label: "Prioridad", Icon: IconFlag },
  { href: "/pagos", label: "Pagos", Icon: IconWallet },
  { href: "/plan-diario", label: "Plan diario", Icon: IconSparkles },
  { href: "/plan-diario/historico", label: "Histórico de planes", Icon: IconHistory },
];

// Bloque 4 — Revisión, Bienestar y Sistema
const REVIEW_ITEMS: NavItem[] = [
  { href: "/tareas/completadas", label: "Completadas", Icon: IconCheck },
  { href: "/calendario", label: "Calendario", Icon: IconCalendar },
  { href: "/focus", label: "Focus", Icon: IconBolt },
  { href: "/estatus", label: "Estatus diario", Icon: IconClipboardCheck },
];

// Bloque 5 — Informes
const REPORTS_ITEMS: NavItem[] = [
  { href: "/dashboard-emocional", label: "Dashboard emocional", Icon: IconHeart },
  { href: "/informes", label: "Informes", Icon: IconChart },
];

// Otros — config, ayuda y salida
const OTHER_ITEMS: NavItem[] = [
  { href: "/metodologia", label: "Arquitectura (WIGs/GTD)", Icon: IconTarget },
  { href: "/docs", label: "Los 5 pilares", Icon: IconBook },
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

function SignOutButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
        onNavigate?.();
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
    >
      <IconLogout className="h-4 w-4" aria-hidden />
      Salir
    </button>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 -mr-1 overscroll-contain">
      {/* Bloque 1 — Acción y captura rápida */}
      <NavSection section={{ items: QUICK_ITEMS }} pathname={pathname} onNavigate={onNavigate} />

      {/* Bloque 2 — Dirección y planificación estratégica */}
      <NavSection
        section={{ label: "Estrategia", items: STRATEGY_ITEMS }}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Bloque 3 — Ejecución y organización */}
      <NavSection
        section={{ label: "Ejecución", items: EXEC_ITEMS }}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Bloque 4 — Revisión, bienestar y sistema */}
      <NavSection
        section={{ label: "Revisión", items: REVIEW_ITEMS }}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Bloque 5 — Informes */}
      <NavSection
        section={{ label: "Informes", items: REPORTS_ITEMS }}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      {/* Otros — config + salir */}
      <div className="border-t border-border pt-4">
        <NavSection
          section={{ items: OTHER_ITEMS }}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <div className="mt-1">
          <SignOutButton onNavigate={onNavigate} />
        </div>
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
          <aside className="safe-t safe-b absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border bg-card px-4 pb-4 overscroll-contain">
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
          </aside>
        </div>
      )}

      {/* Sidebar (escritorio) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card/40 px-3 py-5 md:flex">
        <div className="mb-4 shrink-0 px-3 font-semibold tracking-tight">
          fooday<span className="text-muted-foreground">·productivity</span>
        </div>
        <NavItems />
      </aside>
    </>
  );
}