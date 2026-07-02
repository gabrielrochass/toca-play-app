import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "grass" | "terra" | "gold" | "amber" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "",
  grass: "mc-btn-grass",
  terra: "mc-btn-terra",
  gold: "mc-btn-gold",
  amber: "mc-btn-amber",
  danger: "mc-btn-danger",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "mc-btn",
        VARIANT_CLASS[variant],
        size === "sm" && "mc-btn-sm",
        className,
      )}
      {...props}
    />
  );
}
