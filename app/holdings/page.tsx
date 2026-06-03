"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import StockCard from "@/components/StockCard";
import { getMockHoldingsWithQuotes } from "@/lib/mockData";
import { formatCurrency, formatPct } from "@/lib/utils";
import type { HoldingWithQuote } from "@/types";

const USE_MOCK = false;

export default function HoldingsPage() {
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "stock" | "etf">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        if (USE_MOCK) {
          setHoldings(getMockHoldingsWithQuotes());
        } else {
          const holdingsRes = await fetch("/api/holdings");
          const holdingsData = await holdingsRes.json();

          if (!Array.isArray(holdingsData) || holdingsData.length === 0) {
            setHoldings([]);
            return;
          }

          const symbols = holdingsData
            .map((h: { symbol: string }) => h.symbol)
            .join(",");

          const quotesRes = await fetch(`/api/quotes?symbols=${symbols}`);
          const quotes = await quotesRes.json();

          const enriched: HoldingWithQuote[] = holdingsData.map(
            (h: {
              id: string;
              symbol: string;
              name: string;
              shares: number;
              avg_cost: number;
              type: "stock" | "etf";
            }) => {
              const q = quotes[h.symbol];

              const price = q?.price ?? h.avg_cost;
              const change = q?.change ?? 0;
              const change_pct = q?.change_pct ?? 0;

              const market_value = price * h.shares;
              const cost_basis = h.avg_cost * h.shares;
              const total_pnl = market_value - cost_basis;
              const total_pnl_pct =
                cost_basis > 0 ? (total_pnl / cost_basis) * 100 : 0;
              const daily_pnl = change * h.shares;

              return {
                ...h,
                current_price: price,
                change,
                change_pct,
                market_value,
                cost_basis,
                total_pnl,
                total_pnl_pct,
                daily_pnl,
              };
            }
          );

          setHoldings(enriched);
        }
      } catch (error) {
        console.error("Failed to load holdings:", error);
        setHoldings([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered =
    filter === "all" ? holdings : holdings.filter((h) => h.type === filter);

  const winners = holdings.filter((h) => h.total_pnl > 0).length;
  const losers = holdings.filter((h) => h.total_pnl < 0).length;

  return (
    <div className="px-4 pt-12 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">持股明細</h1>

      {!loading && holdings.length > 0 && (
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-1.5">
            <TrendingUp size={13} className="text-up" />
            <span className="text-xs font-medium text-up">{winners} 獲利</span>
          </div>

          <div className="flex items-center gap-1.5 bg-green-50 rounded-full px-3 py-1.5">
            <TrendingDown size={13} className="text-down" />
            <span className="text-xs font-medium text-down">{losers} 虧損</span>
          </div>

          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1.5">
            <span className="text-xs text-muted">共 {holdings.length} 檔</span>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {(["all", "stock", "etf"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500"
            }`}
          >
            {f === "all" ? "全部" : f === "stock" ? "個股" : "ETF"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {filtered.map((h) => (
            <StockCard key={h.id} holding={h} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <p className="text-3xl mb-2">📋</p>
              <p>此分類尚無持股</p>
            </div>
          )}
        </div>
      )}

      {!loading && holdings.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-muted mb-2">持股摘要</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">總市值</p>
              <p className="font-semibold text-gray-800 text-sm">
                ${formatCurrency(holdings.reduce((s, h) => s + h.market_value, 0))}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">總成本</p>
              <p className="font-semibold text-gray-800 text-sm">
                ${formatCurrency(holdings.reduce((s, h) => s + h.cost_basis, 0))}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">總損益</p>
              {(() => {
                const pnl = holdings.reduce((s, h) => s + h.total_pnl, 0);

                return (
                  <p
                    className={`font-semibold text-sm ${
                      pnl >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {formatCurrency(pnl)}
                  </p>
                );
              })()}
            </div>

            <div>
              <p className="text-xs text-muted">報酬率</p>
              {(() => {
                const cost = holdings.reduce((s, h) => s + h.cost_basis, 0);
                const pnl = holdings.reduce((s, h) => s + h.total_pnl, 0);
                const pct = cost > 0 ? (pnl / cost) * 100 : 0;

                return (
                  <p
                    className={`font-semibold text-sm ${
                      pct >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {formatPct(pct)}
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}