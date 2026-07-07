// Per-unit visual identity, shared so the badge, list chips and chart series
// all color a unit the same way. Unit codes are DB-constrained to BV/CF/RA.
export type UnitTone = "grass" | "diamond" | "terra" | "night";

const UNIT_TONE: Record<string, UnitTone> = {
  CF: "grass",
  BV: "diamond",
  RA: "terra",
};

export function unitTone(code?: string | null): UnitTone {
  return (code && UNIT_TONE[code]) || "night";
}
