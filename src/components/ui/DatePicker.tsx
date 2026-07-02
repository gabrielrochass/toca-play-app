"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";
import { cn, formatDateBR, toISODate } from "@/lib/utils";

/**
 * Date picker: a button that opens a calendar popover. Writes the ISO date to a
 * hidden input named `name` so server actions read it from FormData. For
 * birthdates, pass `dropdownYears` to show month/year dropdowns.
 */
export function DatePicker({
  name,
  defaultValue,
  value,
  onChange,
  placeholder = "Escolher data",
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
  const [internal, setInternal] = useState<Date | undefined>(
    defaultValue ? new Date(`${defaultValue}T00:00:00`) : undefined,
  );
  const selected = controlled
    ? value
      ? new Date(`${value}T00:00:00`)
      : undefined
    : internal;
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const iso = selected ? toISODate(selected) : "";

  return (
    <div className="relative" ref={wrapRef}>
      {name ? <input type="hidden" name={name} value={iso} readOnly /> : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("mc-input flex items-center gap-2 text-left", className)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
        <span className={selected ? "text-ink" : "text-muted"}>
          {selected ? formatDateBR(iso) : placeholder}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          className="absolute left-0 top-[calc(100%+6px)] z-50 rounded-md border border-night-600 bg-night-850 p-2 shadow-xl"
        >
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              if (controlled) onChange?.(d ? toISODate(d) : "");
              else setInternal(d);
              if (d) setOpen(false);
            }}
            captionLayout={dropdownYears ? "dropdown" : "label"}
            startMonth={
              dropdownYears ? new Date(dropdownYears.from, 0) : undefined
            }
            endMonth={dropdownYears ? new Date(dropdownYears.to, 11) : undefined}
            styles={{
              root: {
                "--rdp-accent-color": "var(--color-grass)",
                "--rdp-accent-background-color": "var(--color-grass)",
                margin: "0",
              } as React.CSSProperties,
            }}
            className="rdp-toca text-ink [--rdp-day-width:2.1rem] [--rdp-day-height:2.1rem]"
          />
        </div>
      ) : null}
    </div>
  );
}
