"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EarningsChartProps {
  data: { month: string; earnings: number }[];
}

export function EarningsChart({ data }: EarningsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
        No earnings data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4883A" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4883A" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border-subtle)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            background: "var(--background)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(value) => [
            `$${Number(value ?? 0).toFixed(2)}`,
            "Estimated",
          ]}
        />
        <Area
          type="monotone"
          dataKey="earnings"
          stroke="#D4883A"
          strokeWidth={2}
          fill="url(#earningsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
