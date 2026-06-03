"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import SummaryBanner from "@/components/SummaryBanner";
import StockCard from "@/components/StockCard";
import { getMockHoldingsWithQuotes, getMockSummary } from "@/lib/mockData";
import type { HoldingWithQuote, PortfolioSummary } from "@/types";

// Switch to false when Supabase + FinMind are set up
const USE_MOCK = false;

export default function OverviewPage() {
  const [holdings, setHoldings] = useState<HoldingWithQuote[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  async function loadData() {
    setLoading(true);
    try {
      if (USE_MOCK) {
        // Simulate slight delay for realism
        await new Promise((r) => setTimeout(r, 400));
        setHoldings(getMockHoldingsWithQuotes());
        setSummary(getMockSummary());
      } else {
        // Real data path: fetch holdings from Supabase, then quotes from FinMind via our API
        const [holdingsRes] = await Promise.all([fetch("/api/holdings")]);
        const holdingsData = await holdingsRes.json();
        if (!holdingsRes.ok) {
  console.error("Failed to load holdings:", holdingsData);

  setHoldings([]);
  setSummary({
    total_assets: 0,
    total_cost: 0,
    total_pnl: 0,
    total_pnl_pct: 0,
    daily_pnl: 0,
    daily_pnl_pct: 0,
  });

  return;
}

if (!Array.isArray(holdingsData) || holdingsData.length === 0) {
  setHoldings([]);

  setSummary({
    total_assets: 0,
    total_cost: 0,
    total_pnl: 0,
    total_pnl_pct: 0,
    daily_pnl: 0,
    daily_pnl_pct: 0,
  });

  return;
}
        const symbols = holdingsData.map((h: { symbol: string }) => h.symbol).join(",");
        const quotesRes = await fetch(`/api/quotes?symbols=${symbols}`);
        const quotes = await quotesRes.json();

        const enriched: HoldingWithQuote[] = holdingsData.map(
          (h: { symbol: string; shares: number; avg_cost: number; id: string; name: string; type: "stock" | "etf" }) => {
            const q = quotes[h.symbol];
            const price = q?.price ?? h.avg_cost;
            const change = q?.change ?? 0;
            const change_pct = q?.change_pct ?? 0;
            const market_value = price * h.shares;
            const cost_basis = h.avg_cost * h.shares;
            const total_pnl = market_value - cost_basis;
            const total_pnl_pct = (total_pnl / cost_basis) * 100;
            const daily_pnl = change * h.shares;
            return { ...h, current_price: price, change, change_pct, market_value, cost_basis, total_pnl, total_pnl_pct, daily_pnl };
          }
        );
        setHoldings(enriched);

        const total_assets = enriched.reduce((s, h) => s + h.market_value, 0);
        const total_cost = enriched.reduce((s, h) => s + h.cost_basis, 0);
        const total_pnl = total_assets - total_cost;
        const daily_pnl = enriched.reduce((s, h) => s + h.daily_pnl, 0);
        setSummary({
          total_assets, total_cost, total_pnl,
          total_pnl_pct: (total_pnl / total_cost) * 100,
          daily_pnl,
          daily_pnl_pct: (daily_pnl / (total_assets - daily_pnl)) * 100,
        });
      }
      setLastUpdated(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const today = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="px-4 pt-12 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">我的投資組合</h1>
          <p className="text-xs text-muted">{today}</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <RefreshCw size={16} className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary banner */}
      {loading ? (
        <div className="bg-gray-800 rounded-3xl h-48 animate-pulse" />
      ) : summary ? (
        <SummaryBanner summary={summary} />
      ) : null}

      {/* Holdings */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-base font-semibold text-gray-700">持股清單</h2>
        {lastUpdated && (
          <span className="text-xs text-muted">更新 {lastUpdated}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {holdings.map((h) => (
            <StockCard key={h.id} holding={h} />
          ))}
          {holdings.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <p className="text-4xl mb-3">📭</p>
              <p>尚無持股，點下方「新增」開始追蹤</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
