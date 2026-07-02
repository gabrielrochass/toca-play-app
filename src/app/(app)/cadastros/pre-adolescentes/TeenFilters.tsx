"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const SEX_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "F", label: "Fem." },
  { value: "M", label: "Masc." },
];

export function TeenFilters({ ages }: { ages: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();

  const sexo = params.get("sexo") ?? "";
  const idade = params.get("idade") ?? "";

  function setParam(key: string, val: string) {
    const next = new URLSearchParams(params.toString());
    if (val) next.set(key, val);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div className="flex h-10 overflow-hidden rounded-md border border-night-700">
        {SEX_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setParam("sexo", o.value)}
            aria-pressed={sexo === o.value}
            className={cn(
              "px-3 text-xs font-semibold transition-colors",
              sexo === o.value
                ? "bg-orange/15 text-orange"
                : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <select
        value={idade}
        onChange={(e) => setParam("idade", e.target.value)}
        className="h-10 rounded-md border border-night-700 bg-night-950 px-2.5 text-sm text-ink outline-none focus-visible:border-orange"
        aria-label="Filtrar por idade"
      >
        <option value="">Idade</option>
        {ages.map((a) => (
          <option key={a} value={a}>
            {a} anos
          </option>
        ))}
      </select>
    </div>
  );
}
