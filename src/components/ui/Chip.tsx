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

const TONE: Record<Tone, string> = {
  night: "bg-night-700 text-ink",
  grass: "bg-grass text-[#0c1f07]",
  terra: "bg-terra text-[#2a1206]",
  gold: "bg-gold text-[#2a2005]",
  amber: "bg-amber text-[#2a1705]",
  orange: "bg-orange text-[#2a1505]",
  diamond: "bg-diamond text-[#04201e]",
  danger: "bg-redstone text-[#2a0806]",
};

export function Chip({
  tone = "night",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("chip", TONE[tone], className)} {...props} />;
}
