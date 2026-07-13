"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Theme-aware: resolved from CSS vars set per data-theme in globals.css.
const GRID = "var(--chart-grid)";
const AXIS = "var(--chart-axis)";
const CURSOR = "var(--chart-cursor)";

interface TooltipEntry {
  color?: string;
  value?: number;
  name?: string;
}
function McTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="block-flat px-2.5 py-1.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-mono text-xl leading-none" style={{ color: p.color }}>
        {p.value}
      </div>
    </div>
  );
}

/** Tooltip for multi-series charts — one line per series. */
function McMultiTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="block-flat px-2.5 py-1.5">
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: p.color }}
            />
            <span className="text-xs text-muted">{p.name}</span>
            <span
              className="ml-auto font-mono text-sm leading-none"
              style={{ color: p.color }}
            >
              {p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const axisProps = {
  tick: { fontSize: 11, fill: AXIS },
  tickLine: false,
  axisLine: { stroke: GRID },
} as const;

export function LineChartMc<T extends object>({
  data,
  dataKey,
  color,
}: {
  data: T[];
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis width={34} allowDecimals={false} {...axisProps} axisLine={false} />
        <Tooltip content={<McTooltip />} cursor={{ stroke: color, strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarChartMc<T extends object>({
  data,
  dataKey,
  color,
}: {
  data: T[];
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
        <YAxis width={34} allowDecimals={false} {...axisProps} axisLine={false} />
        <Tooltip content={<McTooltip />} cursor={{ fill: CURSOR }} />
        <Bar dataKey={dataKey} fill={color} maxBarSize={40} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Multiple lines (one per named series) with a legend — e.g. compare units. */
export function MultiLineChartMc<T extends object>({
  data,
  series,
}: {
  data: T[];
  series: { key: string; name: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis width={34} allowDecimals={false} {...axisProps} axisLine={false} />
        <Tooltip content={<McMultiTooltip />} cursor={{ stroke: AXIS, strokeWidth: 1 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} iconType="plainline" iconSize={14} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Grouped (side-by-side) bars for a small set of named series with a legend. */
export function GroupedBarChartMc<T extends object>({
  data,
  series,
}: {
  data: T[];
  series: { key: string; name: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
        <YAxis width={34} allowDecimals={false} {...axisProps} axisLine={false} />
        <Tooltip content={<McMultiTooltip />} cursor={{ fill: CURSOR }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: AXIS }}
          iconType="square"
          iconSize={10}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            maxBarSize={22}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
