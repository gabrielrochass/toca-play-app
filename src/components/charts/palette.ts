// Plain module (NOT "use client") so Server Components import the real values.
// Exporting these from the "use client" Charts module would hand server code a
// client reference, and CHART_COLORS.grass would read as undefined.
//
// Values are CSS vars resolved per theme in globals.css (each pair validated by
// the dataviz validator on its own surface — dark and light). Recharts applies
// them as SVG stroke/fill, so var() resolves client-side per data-theme.
//
// Single-series charts: one brand accent each. Identity comes from the card
// title, not color, so no categorical palette is needed.
export const CHART_COLORS = {
  grass: "var(--chart-grass)",
  gold: "var(--chart-gold)",
  diamond: "var(--chart-diamond)",
  terra: "var(--chart-terra)",
} as const;

// Categorical pair for the by-sex chart (M vs F). Both surfaces validated for
// CVD via the dataviz validator; bars are also legend-labelled, so identity
// never rests on color alone.
export const SEX_COLORS = {
  M: "var(--sex-m)", // meninos — teal
  F: "var(--sex-f)", // meninas — terracotta
} as const;
