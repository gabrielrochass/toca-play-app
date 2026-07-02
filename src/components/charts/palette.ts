// Plain module (NOT "use client") so Server Components import the real values.
// Exporting these from the "use client" Charts module would hand server code a
// client reference, and CHART_COLORS.grass would read as undefined.
//
// Single-series charts: one brand accent each. Identity comes from the card
// title, not color, so no categorical palette is needed.
export const CHART_COLORS = {
  grass: "#6fb03c",
  gold: "#ecb93c",
  diamond: "#3bb6ae",
  terra: "#cf6c3a",
} as const;
