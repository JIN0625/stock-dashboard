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
import type { PricePoint } from "@/types";

interface StockChartProps {
  data: PricePoint[];
  positive?: boolean;
}

export default function StockChart({ data, positive }: StockChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        暫無資料
      </div>
    );
  }

  const color = positive ? "#ef4444" : "#22c55e";
  const fillId = positive ? "fillUp" : "fillDown";

  const formatDate = (d: string) => {
    const parts = d.split("-");
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={["dataMin - 5", "dataMax + 5"]}
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          tickCount={4}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "none",
            borderRadius: 12,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            fontSize: 13,
          }}
          formatter={(v: number) => [`$${v.toLocaleString()}`, "收盤價"]}
          labelFormatter={(l) => l}
        />
        <Area
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
