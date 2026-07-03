import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  error,
  children,
  hint,
  required,
  optional,
}: {
  label: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
  /** Shows a subtle orange asterisk. */
  required?: boolean;
  /** Shows a muted "(opcional)" tag. */
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-sm font-medium text-muted">
        {label}
        {required ? (
          <span className="ml-0.5 text-orange" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? (
          <span className="ml-1 text-xs font-normal text-muted/70">
            (opcional)
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error?.length ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
      {error?.length ? (
        <span className="mt-1 block text-xs font-medium text-redstone">
          {error[0]}
        </span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  // min-w-0 lets inputs shrink inside grids (avoids mobile horizontal scroll).
  return <input className={cn("mc-input min-w-0", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("mc-input min-w-0", className)} {...props} />;
}
