import { cn } from "@/lib/utils";

/**
 * TocaPlay wordmark — the name set in the pixel display face (Toca orange · Play
 * teal). No mark/glyph: just the name.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "lg" ? "text-xl" : size === "sm" ? "text-[0.7rem]" : "text-sm";

  return (
    <span
      className={cn(
        "font-display leading-none [word-spacing:-0.1em]",
        text,
        className,
      )}
    >
      <span className="text-orange">Toca</span>
      <span className="text-diamond">Play</span>
    </span>
  );
}
