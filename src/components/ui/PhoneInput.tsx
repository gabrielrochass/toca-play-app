"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";

/** "(81) 99999-9999" mask (works for 8- and 9-digit numbers). */
export function maskPhoneBR(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Phone field with a live Brazilian mask. Submits the masked value via `name`. */
export function PhoneInput({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const [value, setValue] = useState(maskPhoneBR(defaultValue ?? ""));
  return (
    <Input
      name={name}
      inputMode="tel"
      autoComplete="tel"
      placeholder="(81) 99999-9999"
      required={required}
      value={value}
      onChange={(e) => setValue(maskPhoneBR(e.target.value))}
    />
  );
}
