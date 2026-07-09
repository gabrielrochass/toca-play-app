import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Tone =
  | "night"
  | "grass"
  | "terra"
  | "gold"
  | "amber"
  | "orange"
  | "diamond"
  | "danger";

// Colored chips use the fixed bright FILL token (identical in both themes) so
// the dark embedded text stays legible; "night" is structural and flips.
const TONE: Record<Tone, string> = {
  night: "bg-night-700 text-ink",
  grass: "bg-(--color-grass-fill) text-[#0c1f07]",
  terra: "bg-(--color-terra-fill) text-[#2a1206]",
  gold: "bg-(--color-gold-fill) text-[#2a2005]",
  amber: "bg-(--color-amber-fill) text-[#2a1705]",
  orange: "bg-(--color-orange-fill) text-[#2a1505]",
  diamond: "bg-(--color-diamond-fill) text-[#04201e]",
  danger: "bg-(--color-redstone-fill) text-[#1a0503]",
};

export function Chip({
  tone = "night",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("chip", TONE[tone], className)} {...props} />;
}
