"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** Toggles the `?inativos=1` URL param. Aligns with the search-row filters. */
export function InactiveToggle({ label = "Inativos" }: { label?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const on = params.get("inativos") === "1";

  function toggle() {
    const next = new URLSearchParams(params.toString());
    if (on) next.delete("inativos");
    else next.set("inativos", "1");
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        "h-10 shrink-0 rounded-md border px-3 text-xs font-semibold transition-colors",
        on
          ? "border-redstone bg-redstone/15 text-redstone"
          : "border-night-700 text-muted hover:text-ink",
      )}
    >
      {on ? "Vendo inativos" : label}
    </button>
  );
}
