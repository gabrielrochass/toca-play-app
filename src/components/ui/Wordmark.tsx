import { cn } from "@/lib/utils";

/**
 * TocaPlay wordmark — a little "screen" block (nodding to the TV in the welcome
 * card that shows TOCA / PLAY) next to the name in the pixel display face.
 */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const glyph =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text =
    size === "lg" ? "text-xl" : size === "sm" ? "text-[0.7rem]" : "text-sm";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "block-flat grid shrink-0 place-items-center bg-night-950",
          glyph,
        )}
        aria-hidden
      >
        <span className="grid grid-cols-2 gap-0.5">
          <span className="h-1.5 w-1.5 bg-orange" />
          <span className="h-1.5 w-1.5 bg-diamond" />
          <span className="h-1.5 w-1.5 bg-diamond" />
          <span className="h-1.5 w-1.5 bg-orange" />
        </span>
      </span>
      <span
        className={cn(
          "font-display leading-none [word-spacing:-0.1em]",
          text,
        )}
      >
        <span className="text-orange">Toca</span>
        <span className="text-diamond">Play</span>
      </span>
    </span>
  );
}
