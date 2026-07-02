import { Venus, Mars } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Sex } from "@/types/database";

/** Subtle sex indicator: Venus/Mars glyph with a soft tint. */
export function SexIcon({ sex, className }: { sex: Sex; className?: string }) {
  const Icon = sex === "F" ? Venus : Mars;
  return (
    <Icon
      className={cn(sex === "F" ? "text-terra" : "text-diamond", className)}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}
