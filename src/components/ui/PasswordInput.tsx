"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Field";

/** Password field with a show/hide toggle. Works controlled or uncontrolled. */
export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={show ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted transition-colors hover:text-ink"
      >
        {show ? (
          <EyeOff className="h-4 w-4" strokeWidth={2.25} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}
