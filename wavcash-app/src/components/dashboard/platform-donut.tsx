"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface PlatformDonutProps {
  data: { platform: string; earnings: number; color: string }[];
}

export function PlatformDonut({ data }: PlatformDonutProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-[var(--text-tertiary)]">
        No platform data yet
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="earnings"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, "Earnings"]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {data.map((entry) => (
          <div key={entry.platform} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--text-secondary)]">{entry.platform}</span>
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[var(--text-primary)]">
              ${entry.earnings.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
