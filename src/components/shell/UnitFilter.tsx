"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { UNIT_COOKIE } from "@/lib/constants";
import type { Unit } from "@/types/database";

function persistUnit(code: string) {
  document.cookie = `${UNIT_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Global-admin only: focus one unit (or all). Persists in a cookie so the choice
 * survives navigation, then refreshes so server components re-query in scope.
 */
export function UnitFilter({
  units,
  current,
}: {
  units: Unit[];
  current: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(code: string) {
    persistUnit(code);
    startTransition(() => router.refresh());
  }

  const options = [{ code: "all", label: "Todas" }, ...units.map((u) => ({ code: u.code, label: u.code }))];
  const active = current ?? "all";

  return (
    <div className="flex items-center gap-1" aria-label="Filtrar por unidade">
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          disabled={pending}
          onClick={() => pick(o.code)}
          aria-pressed={active === o.code}
          className={cn(
            "border px-2.5 py-1 text-xs font-semibold transition-colors",
            active === o.code
              ? "border-orange/60 bg-orange/15 text-orange"
              : "border-night-600 text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
