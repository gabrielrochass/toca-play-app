"use client";

// Lazy wrappers so recharts is split into its own chunk and only fetched when a
// chart actually mounts (ChartCard renders children only when there IS data).
// Client-only (ssr:false) — these are below-the-fold analytics; the loading
// placeholder reserves height to avoid layout shift.
import dynamic from "next/dynamic";

const loading = () => (
  <div className="h-[220px] animate-pulse rounded bg-night-800/40" aria-hidden />
);

export const LineChartMc = dynamic(
  () => import("./Charts").then((m) => m.LineChartMc),
  { ssr: false, loading },
) as typeof import("./Charts").LineChartMc;

export const BarChartMc = dynamic(
  () => import("./Charts").then((m) => m.BarChartMc),
  { ssr: false, loading },
) as typeof import("./Charts").BarChartMc;

export const GroupedBarChartMc = dynamic(
  () => import("./Charts").then((m) => m.GroupedBarChartMc),
  { ssr: false, loading },
) as typeof import("./Charts").GroupedBarChartMc;

export const MultiLineChartMc = dynamic(
  () => import("./Charts").then((m) => m.MultiLineChartMc),
  { ssr: false, loading },
) as typeof import("./Charts").MultiLineChartMc;
