"use client";

// The actual react-day-picker calendar + its CSS. Split out so DatePicker can
// dynamic-import it (ssr:false) — the library only loads when a picker opens.
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import "react-day-picker/style.css";

export default function DayPickerPopover({
  selected,
  dropdownYears,
  onSelect,
}: {
  selected?: Date;
  dropdownYears?: { from: number; to: number };
  onSelect: (d?: Date) => void;
}) {
  return (
    <DayPicker
      mode="single"
      locale={ptBR}
      selected={selected}
      defaultMonth={selected}
      onSelect={(d) => onSelect(d)}
      captionLayout={dropdownYears ? "dropdown" : "label"}
      startMonth={dropdownYears ? new Date(dropdownYears.from, 0) : undefined}
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
  );
}
