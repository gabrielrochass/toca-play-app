"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";

/**
 * Day / service filters for the Cultos screen. Writes ?dia and ?servico to the
 * URL. `services` are the labels for the unit in focus.
 */
export function PeriodFilters({ services }: { services: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();

  const dia = params.get("dia") ?? "";
  const servico = params.get("servico") ?? "";

  function setParam(key: string, val: string) {
    const next = new URLSearchParams(params.toString());
    if (val) next.set(key, val);
    else next.delete(key);
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }
  function clearAll() {
    const next = new URLSearchParams(params.toString());
    ["dia", "servico"].forEach((k) => next.delete(k));
    start(() => router.replace(`${pathname}?${next.toString()}`));
  }

  const labelCls = "mb-1 block text-xs font-semibold text-muted";
  const active = Boolean(dia || servico);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="min-w-44">
        <span className={labelCls}>Dia</span>
        <DatePicker
          value={dia}
          onChange={(v) => setParam("dia", v)}
          placeholder="Qualquer dia"
          className="h-10"
        />
      </label>

      {services.length > 0 ? (
        <label className="min-w-32">
          <span className={labelCls}>Horário</span>
          <Select
            value={servico}
            onChange={(e) => setParam("servico", e.target.value)}
            className="h-10"
          >
            <option value="">Todos os horários</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      {active ? (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-night-600 px-3 text-sm font-semibold text-muted transition-colors hover:border-redstone hover:text-redstone"
        >
          <X className="h-4 w-4" strokeWidth={2.5} /> Limpar
        </button>
      ) : null}
    </div>
  );
}
