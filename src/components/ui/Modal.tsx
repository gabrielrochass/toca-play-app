"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Module-level DOM helpers (kept out of the component to satisfy the
// react-hooks immutability lint rule about assigning to DOM properties).
function lockScroll() {
  document.body.style.overflow = "hidden";
}
function unlockScroll() {
  document.body.style.overflow = "";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** md = form/dialog default; lg/xl = wider forms that use 2 columns. */
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
      />
      <div
        className={cn(
          // overflow-x-hidden: never scroll horizontally inside the modal
          // (overflow-y-auto alone would compute overflow-x to auto).
          "panel relative z-10 max-h-[88dvh] w-full overflow-y-auto overflow-x-hidden p-5",
          size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="modal-title" className="pixel text-sm text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
