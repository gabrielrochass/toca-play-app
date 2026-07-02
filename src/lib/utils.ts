import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, de-duping conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SEX_LABELS: Record<"M" | "F", string> = {
  M: "Masculino",
  F: "Feminino",
};

export const ROLE_LABELS: Record<string, string> = {
  global_admin: "Admin geral",
  unit_admin: "Admin da unidade",
  volunteer: "Voluntário",
};

/** "2026-07-02" -> "02/07/2026" without timezone drift. */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-07-01" -> "07/26" (short month label for chart axes). */
export function formatMonthShort(iso: string): string {
  const [y, m] = iso.slice(0, 10).split("-");
  return `${m}/${y.slice(2)}`;
}

/** ISO date (YYYY-MM-DD) for a Date in local time, no UTC shift. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
