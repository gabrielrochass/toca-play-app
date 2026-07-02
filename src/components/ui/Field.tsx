import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-sm font-medium text-muted">
        {label}
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
  return <input className={cn("mc-input", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("mc-input", className)} {...props} />;
}
