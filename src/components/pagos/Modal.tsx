"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconX } from "@/components/icons";

/**
 * Modal ligero sobre el <dialog> nativo de HTML. Cierra con Escape y
 * haciendo click fuera del contenido. Estilado consistente con el
 * tema del proyecto.
 *
 * Uso:
 *   const ref = useRef<HTMLDialogElement>(null);
 *   useEffect(() => { ref.current?.showModal(); }, []);
 *   <Modal ref={ref} title="..." onClose={() => ref.current?.close()}>
 *     contenido
 *   </Modal>
 */
export function Modal({
  title,
  children,
  onClose,
  size = "md",
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal al montar.
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Cierra con Escape automáticamente.
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dlg.addEventListener("cancel", handleCancel);
    return () => dlg.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const widths: Record<"sm" | "md" | "lg", string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // click en el backdrop (fuera del contenido) cierra
        if (e.target === ref.current) onClose();
      }}
      className="w-full max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className={`${widths[size]} mx-auto flex max-h-[calc(100vh-4rem)] flex-col`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {/* Footer opcional */}
        {footer && (
          <div className="shrink-0 border-t border-border px-5 py-3">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
