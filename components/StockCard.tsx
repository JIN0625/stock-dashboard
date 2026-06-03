"use client";

import Link from "next/link";
import Sparkline from "./Sparkline";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { HoldingWithQuote } from "@/types";

interface StockCardProps {
  holding: HoldingWithQuote;
}

export default function StockCard({ holding: h }: StockCardProps) {
  const isUp = h.change >= 0;

  return (
    <Link href={`/stock/${h.symbol}`} className="block">
      <div className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">

        {/* 上排：股票標識 + 即時價格 */}
        <div className="flex items-start justify-between mb-3">
          {/* 左：代號 icon + 名稱 */}
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: isUp ? "#ef4444" : "#22c55e" }}
            >
              {h.symbol.slice(0, 4)}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-tight">{h.name}</p>
              <p className="text-xs text-muted">
                {h.symbol} · {h.type === "etf" ? "ETF" : "個股"}
              </p>
            </div>
          </div>

          {/* 右：價格 + 今日漲跌 */}
          <div className="text-right">
            <p className="font-bold text-gray-900 text-base">
              {formatCurrency(h.current_price, h.current_price < 100 ? 2 : 0)}
            </p>
            <p className={`text-xs font-medium ${pnlColor(h.change)}`}>
              {formatChange(h.change)} ({formatPct(h.change_pct)})
            </p>
          </div>
        </div>

        {/* 下排：損益資訊 + Sparkline */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex gap-3">
              <span className="text-xs text-muted">持有 {h.shares.toLocaleString()} 股</span>
              <span className="text-xs text-muted">成本 {h.avg_cost}</span>
            </div>
            <div className="flex gap-3">
              <div>
                <span className="text-xs text-muted">今日 </span>
                <span className={`text-xs font-semibold ${pnlColor(h.daily_pnl)}`}>
                  {formatChange(h.daily_pnl, 0)}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted">總損益 </span>
                <span className={`text-xs font-semibold ${pnlColor(h.total_pnl)}`}>
                  {formatChange(h.total_pnl, 0)} ({formatPct(h.total_pnl_pct)})
                </span>
              </div>
            </div>
          </div>

          <div className="w-20 h-10">
            {h.history && <Sparkline data={h.history} positive={h.total_pnl >= 0} />}
          </div>
        </div>

      </div>
    </Link>
  );
}
