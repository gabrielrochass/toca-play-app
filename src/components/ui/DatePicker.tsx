"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarDays } from "lucide-react";
import { cn, brToISO, formatDateBR, maskDateBR, toISODate } from "@/lib/utils";
import { Input } from "@/components/ui/Field";

// react-day-picker (+ its CSS) is only needed once a calendar opens — load it lazily.
const DayPickerPopover = dynamic(() => import("./DayPickerPopover"), {
  ssr: false,
  loading: () => <div className="h-64 w-64 animate-pulse rounded bg-night-800/40" />,
});

/**
 * Date field: type it (dd/mm/aaaa, live-masked) OR pick it in a calendar popover
 * opened by the trailing icon. Either way it writes the ISO date (YYYY-MM-DD) to
 * a hidden input named `name` so server actions read it from FormData. For
 * controlled use (filters) pass `value` + `onChange`. Birthdates pass
 * `dropdownYears` for month/year dropdowns.
 */
export function DatePicker({
  name,
  defaultValue,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  dropdownYears,
  className,
}: {
  name?: string; // when set, writes a hidden input for form submission
  defaultValue?: string;
  value?: string; // controlled ISO value (for filters)
  onChange?: (iso: string) => void; // controlled callback
  placeholder?: string;
  dropdownYears?: { from: number; to: number };
  className?: string;
}) {
  const controlled = onChange !== undefined;
  const [open, setOpen] = useState(false);
  // The visible, masked BR text. Seeded from the initial ISO (value or default).
  const [text, setText] = useState(() => {
    const iso = (controlled ? value : defaultValue) ?? "";
    return iso ? formatDateBR(iso) : "";
  });
  // Reflect external (controlled) value changes during render — React's
  // adjust-state-on-prop-change pattern — without clobbering in-progress typing
  // (only resync when the incoming value differs from what we currently parse).
  const [prevValue, setPrevValue] = useState(value);
  if (controlled && value !== prevValue) {
    setPrevValue(value);
    if ((value ?? "") !== brToISO(text)) setText(value ? formatDateBR(value) : "");
  }
  const wrapRef = useRef<HTMLDivElement>(null);

  const iso = brToISO(text);
  const selected = iso ? new Date(`${iso}T00:00:00`) : undefined;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(next: string) {
    setText(next);
    if (controlled) onChange?.(brToISO(next));
  }

  return (
    <div className="relative" ref={wrapRef}>
      {name ? <input type="hidden" name={name} value={iso} readOnly /> : null}
      <Input
        value={text}
        onChange={(e) => commit(maskDateBR(e.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        aria-label="Data (dd/mm/aaaa)"
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir calendário"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-ink"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-md border border-night-600 bg-night-850 p-2 shadow-xl"
        >
          <DayPickerPopover
            selected={selected}
            dropdownYears={dropdownYears}
            onSelect={(d) => {
              commit(d ? formatDateBR(toISODate(d)) : "");
              if (d) setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
