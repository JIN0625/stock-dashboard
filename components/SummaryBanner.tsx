"use client";

import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { PortfolioSummary } from "@/types";

export default function SummaryBanner({ summary: s }: { summary: PortfolioSummary }) {
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl">
      {/* Total assets */}
      <p className="text-sm text-gray-400 mb-1">總資產</p>
      <p className="text-4xl font-bold tracking-tight mb-4">
        ${formatCurrency(s.total_assets)}
      </p>

      {/* Daily P&L */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`text-xl font-semibold ${s.daily_pnl >= 0 ? "text-red-400" : "text-green-400"}`}
        >
          {formatChange(s.daily_pnl, 0)}
        </span>
        <span
          className={`text-sm px-2 py-0.5 rounded-full font-medium ${
            s.daily_pnl >= 0 ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"
          }`}
        >
          {formatPct(s.daily_pnl_pct)} 今日
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-gray-400">總損益</p>
            <p className={`text-base font-semibold ${s.total_pnl >= 0 ? "text-red-400" : "text-green-400"}`}>
              {formatChange(s.total_pnl, 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">總報酬率</p>
            <p className={`text-base font-semibold ${s.total_pnl_pct >= 0 ? "text-red-400" : "text-green-400"}`}>
              {formatPct(s.total_pnl_pct)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">投入成本</p>
            <p className="text-base font-semibold text-gray-200">
              ${formatCurrency(s.total_cost)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
