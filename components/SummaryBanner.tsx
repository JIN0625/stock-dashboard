"use client";

import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { PortfolioSummary } from "@/types";

export default function SummaryBanner({ summary: s }: { summary: PortfolioSummary }) {
  const hasDividends =
    (s.ytd_dividends !== undefined && s.ytd_dividends > 0) ||
    (s.estimated_dividends !== undefined && s.estimated_dividends > 0);

  const totalPnlWithDiv = s.total_pnl + (s.ytd_dividends ?? 0);

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

      {/* P&L row */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between items-start">

          {/* 左欄：總損益 ＋（今日已實現） */}
          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-gray-400">總損益</p>
              <p className={`text-base font-semibold ${s.total_pnl >= 0 ? "text-red-400" : "text-green-400"}`}>
                {formatChange(s.total_pnl, 0)}
              </p>
            </div>
            {s.realized_pnl_today !== undefined && (
              <div>
                <p className="text-xs text-gray-400">今日已實現</p>
                <p className={`text-sm font-semibold ${
                  s.realized_pnl_today > 0  ? "text-red-400"
                  : s.realized_pnl_today < 0 ? "text-green-400"
                  : "text-gray-400"
                }`}>
                  {s.realized_pnl_today > 0 ? "+" : ""}
                  {s.realized_pnl_today === 0
                    ? "$0"
                    : `${s.realized_pnl_today < 0 ? "-" : ""}$${formatCurrency(Math.abs(s.realized_pnl_today))}`}
                </p>
              </div>
            )}
          </div>

          {/* 中欄：總報酬率 */}
          <div className="text-center">
            <p className="text-xs text-gray-400">總報酬率</p>
            <p className={`text-base font-semibold ${s.total_pnl_pct >= 0 ? "text-red-400" : "text-green-400"}`}>
              {formatPct(s.total_pnl_pct)}
            </p>
          </div>

          {/* 右欄：投入成本 ＋（帳戶餘額） */}
          <div className="text-right space-y-2.5">
            <div>
              <p className="text-xs text-gray-400">投入成本</p>
              <p className="text-base font-semibold text-gray-200">
                ${formatCurrency(s.total_cost)}
              </p>
            </div>
            {s.cash_balance !== undefined && (
              <div>
                <p className="text-xs text-gray-400">帳戶餘額</p>
                <p className="text-sm font-semibold text-gray-200">
                  ${formatCurrency(s.cash_balance)}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Dividend row — shown only when there's data */}
      {hasDividends && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-400">今年已領股息</p>
              <p className="text-base font-semibold text-yellow-300">
                +${formatCurrency(s.ytd_dividends ?? 0, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">預估未來配息</p>
              <p className="text-base font-semibold text-blue-300">
                ${formatCurrency(s.estimated_dividends ?? 0, 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">含股息總損益</p>
              <p className={`text-base font-semibold ${pnlColor(totalPnlWithDiv)}`}>
                {formatChange(totalPnlWithDiv, 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
