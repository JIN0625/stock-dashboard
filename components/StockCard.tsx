"use client";

import Link from "next/link";
import Sparkline from "./Sparkline";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { HoldingWithQuote } from "@/types";

function fmtDivDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function daysDiff(from: string, to: string): number {
  return Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 86400)
  );
}

export default function StockCard({ holding: h }: { holding: HoldingWithQuote }) {
  const isUp     = h.change >= 0;
  const div      = h.dividend;
  const rec      = h.dividendRecord;
  const todayStr = new Date().toISOString().slice(0, 10);

  const showUpcoming =
    div?.exDividendDate && div.exDividendDate >= todayStr && div.cashDividend > 0;

  const showRecent =
    !showUpcoming && div?.cashDividend && div.cashDividend > 0 &&
    div.exDividendDate && div.exDividendDate < todayStr;

  const daysToEx  = showUpcoming ? daysDiff(todayStr, div!.exDividendDate!) : null;
  const daysToPay = showUpcoming && div?.paymentDate
    ? daysDiff(todayStr, div.paymentDate)
    : null;

  const exSoon  = daysToEx  !== null && daysToEx  <= 14;
  const paySoon = daysToPay !== null && daysToPay <= 14;

  // Dividend status
  let divStatus: { label: string; color: string } | null = null;
  if (div?.exDividendDate) {
    if (div.exDividendDate > todayStr) {
      divStatus = { label: "等待除息", color: "bg-gray-100 text-gray-500" };
    } else if (div.paymentDate && div.paymentDate > todayStr) {
      divStatus = { label: "等待發放", color: "bg-blue-50 text-blue-500" };
    } else if (rec) {
      divStatus = rec.reinvested
        ? { label: "已再投入", color: "bg-green-100 text-green-700" }
        : { label: "已入帳", color: "bg-green-100 text-green-700" };
    } else if (div.paymentDate && div.paymentDate <= todayStr) {
      divStatus = { label: "可入帳", color: "bg-amber-100 text-amber-600" };
    }
  }

  return (
    <Link href={`/stock/${h.symbol}`} className="block">
      <div className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer">

        {/* 上排：股票標識 + 即時價格 */}
        <div className="flex items-start justify-between mb-3">
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

              {/* 配息日期 */}
              {showUpcoming && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    exSoon ? "bg-orange-100 text-orange-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    📅 {fmtDivDate(div!.exDividendDate!)} 除息{exSoon ? " · 即將除息" : ""}
                  </span>
                  {div?.paymentDate && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      paySoon ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600"
                    }`}>
                      💰 {fmtDivDate(div.paymentDate)} 發放{paySoon ? " · 即將入帳" : ""}
                    </span>
                  )}
                </div>
              )}
              {showRecent && (
                <div className="mt-1">
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    最近配息 {div!.cashDividend}
                  </span>
                </div>
              )}

              {/* 配息狀態 */}
              {divStatus && (
                <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded font-medium ${divStatus.color}`}>
                  {divStatus.label}
                </span>
              )}
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
