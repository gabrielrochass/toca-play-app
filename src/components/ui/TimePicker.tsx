"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Check } from "lucide-react";
import { cn, maskTimeBR } from "@/lib/utils";
import { Input } from "@/components/ui/Field";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Preset options for the dropdown: 06:00–22:00 in 30-min steps. Typing still
// allows any valid HH:MM outside this range.
const PRESETS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

/**
 * Time field: type it (HH:MM, live-masked) OR pick from a list of common times
 * opened by the trailing clock icon. Writes the "HH:MM" string (or "" when
 * empty/invalid) to a hidden input named `name` for form submission. Controlled
 * use (value + onChange) is supported, mirroring DatePicker.
 */
export function TimePicker({
  name,
  defaultValue,
  value,
  onChange,
  placeholder = "hh:mm",
  className,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const controlled = onChange !== undefined;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() =>
    maskTimeBR((controlled ? value : defaultValue) ?? ""),
  );
  const valid = TIME_RE.test(text) ? text : "";

  // Reflect external (controlled) value changes during render, without
  // clobbering in-progress typing (mirrors DatePicker).
  const [prevValue, setPrevValue] = useState(value);
  if (controlled && value !== prevValue) {
    setPrevValue(value);
    if ((value ?? "") !== valid) setText(maskTimeBR(value ?? ""));
  }
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

  function commit(next: string) {
    setText(next);
    if (controlled) onChange?.(TIME_RE.test(next) ? next : "");
  }

  return (
    <div className="relative" ref={wrapRef}>
      {name ? <input type="hidden" name={name} value={valid} readOnly /> : null}
      <Input
        value={text}
        onChange={(e) => commit(maskTimeBR(e.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
        aria-label="Horário (hh:mm)"
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Escolher horário"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-ink"
      >
        <Clock className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-60 w-full overflow-y-auto rounded-md border border-night-600 bg-night-850 p-1 shadow-xl"
        >
          {PRESETS.map((t) => {
            const active = t === valid;
            return (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  commit(t);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-mono text-sm transition-colors",
                  active
                    ? "bg-grass/15 text-grass"
                    : "text-ink hover:bg-night-800",
                )}
              >
                <Check
                  className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-0")}
                  strokeWidth={3}
                />
                {t}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
