"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import type { PricePoint } from "@/types";

interface SparklineProps {
  data: PricePoint[];
  positive?: boolean; // determines line color
  height?: number;
}

export default function Sparkline({ data, positive, height = 40 }: SparklineProps) {
  if (!data || data.length < 2) return <div style={{ height }} />;

  const color = positive ? "#ef4444" : "#22c55e";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <YAxis domain={["dataMin", "dataMax"]} hide />
        <Line
          type="monotone"
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
