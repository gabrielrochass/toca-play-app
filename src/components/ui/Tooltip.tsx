import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Minimal hover/focus tooltip — no dependency. Wrap a trigger; the real control
 * keeps its own `aria-label` (tooltips don't show on touch, so meaning must not
 * live here alone). Shows above the trigger by default.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      {/* `hidden` (not opacity-0) so the off-screen tooltip never contributes to
          document width — otherwise it forces horizontal scroll near edges. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-night-700 bg-night-950 px-2 py-1 text-xs font-medium text-ink shadow-md group-hover/tt:block group-focus-within/tt:block"
      >
        {label}
      </span>
    </span>
  );
}
