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
} from "recharts";

const GRID = "#33265a";
const AXIS = "#ab9fce";

interface TooltipEntry {
  color?: string;
  value?: number;
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
        <Tooltip content={<McTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar dataKey={dataKey} fill={color} maxBarSize={40} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
