"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, ChevronRight } from "lucide-react";
import Image from "next/image";
import UserMenu from "@/components/UserMenu";
import SummaryBanner from "@/components/SummaryBanner";
import StockCard from "@/components/StockCard";
import { getMockHoldingsWithQuotes, getMockSummary } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import type {
  HoldingWithQuote, PortfolioSummary, DividendRecord,
  DividendInfo, DivSyncResponse, DivSyncItem, UserSettings,
} from "@/types";

const USE_MOCK = false;

// ── 配息狀態顏色 ─────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  recorded:         "bg-green-100 text-green-700",
  reinvested:       "bg-green-100 text-green-700",
  already_recorded: "bg-gray-100 text-gray-500",
  not_yet_payable:  "bg-blue-50 text-blue-500",
};
const STATUS_LABEL: Record<string, string> = {
  recorded:         "已入帳",
  reinvested:       "已再投入",
  already_recorded: "已入帳",
  not_yet_payable:  "等待發放",
};

function fmtDate(s: string) {
  const [, m, d] = s.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

// ── 配息 Sync 結果 Sheet ──────────────────────────────────────
function SyncResultSheet({
  result,
  reinvest,
  onClose,
}: {
  result: DivSyncResponse;
  reinvest: boolean;
  onClose: () => void;
}) {
  const newItems = result.results.filter(
    r => r.status === "recorded" || r.status === "reinvested"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl pb-8 max-h-[85vh] flex flex-col">
        {/* 拖曳指示條 */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* 標題 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 shrink-0">
          <h2 className="text-base font-bold text-gray-900">配息入帳結果</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>

        {/* 摘要 */}
        <div className="px-5 py-3 bg-gray-50 shrink-0">
          {newItems.length > 0 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  本次入帳 {newItems.length} 筆
                </p>
                <p className="text-xs text-muted mt-0.5">
                  處理方式：{reinvest ? "自動再投入" : "只記錄現金"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">現金股息合計</p>
                <p className="text-base font-bold text-green-700">
                  +${formatCurrency(result.total_cash, 0)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-1">
              {result.results.length > 0
                ? "目前無新的可入帳配息"
                : "持股無配息資料"}
            </p>
          )}
        </div>

        {/* 明細列表 */}
        <div className="overflow-y-auto flex-1">
          {result.results.map((item, i) => (
            <SyncResultRow key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SyncResultRow({ item: r }: { item: DivSyncItem }) {
  const style = STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-500";
  const label = STATUS_LABEL[r.status] ?? r.status;

  return (
    <div className="px-5 py-3.5 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {r.symbol} {r.name}
          </p>
          <p className="text-xs text-muted mt-0.5">
            📅 {fmtDate(r.ex_dividend_date)} 除息
            {r.payment_date && ` · 💰 ${fmtDate(r.payment_date)} 發放`}
          </p>
          {/* Detail rows */}
          {(r.status === "recorded" || r.status === "reinvested") && (
            <div className="mt-1.5 space-y-0.5">
              <p className="text-xs text-gray-600">
                現金入帳 <span className="font-semibold text-green-700">+${formatCurrency(r.cash_received, 0)}</span>
                <span className="text-muted ml-1">（每股 {r.cash_dividend}）</span>
              </p>
              {r.status === "reinvested" && r.shares_bought !== undefined && (
                <>
                  <p className="text-xs text-gray-600">
                    買入 <span className="font-semibold">{r.shares_bought.toFixed(4)}</span> 股
                    {r.reinvest_price !== undefined && (
                      <span className="text-muted"> @ ${r.reinvest_price}</span>
                    )}
                  </p>
                  {r.new_avg_cost !== undefined && (
                    <p className="text-xs text-gray-600">
                      更新後平均成本 <span className="font-semibold">${r.new_avg_cost.toFixed(2)}</span>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          {r.status === "already_recorded" && r.shares_bought && (
            <p className="text-xs text-muted mt-1">
              曾再投入 {r.shares_bought.toFixed(4)} 股
              {r.reinvest_price !== undefined && ` @ $${r.reinvest_price}`}
            </p>
          )}
          {(r.status === "not_yet_payable" || r.status === "already_recorded") && (
            <p className="text-xs text-muted mt-1 italic">{r.message}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${style}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

export default function OverviewPage() {
  const [holdings, setHoldings]   = useState<HoldingWithQuote[]>([]);
  const [summary, setSummary]     = useState<PortfolioSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const [userSettings, setUserSettings] = useState<UserSettings>({ dividend_reinvest_enabled: false });
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState<DivSyncResponse | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      if (USE_MOCK) {
        await new Promise(r => setTimeout(r, 400));
        setHoldings(getMockHoldingsWithQuotes());
        setSummary(getMockSummary());
      } else {
        const holdingsRes = await fetch("/api/holdings");
        const holdingsData = await holdingsRes.json();

        if (!holdingsRes.ok) {
          setHoldings([]);
          setSummary({ total_assets: 0, total_cost: 0, total_pnl: 0, total_pnl_pct: 0, daily_pnl: 0, daily_pnl_pct: 0 });
          return;
        }

        if (!Array.isArray(holdingsData) || holdingsData.length === 0) {
          setHoldings([]);
          setSummary({ total_assets: 0, total_cost: 0, total_pnl: 0, total_pnl_pct: 0, daily_pnl: 0, daily_pnl_pct: 0 });
          return;
        }

        const symbols = holdingsData.map((h: { symbol: string }) => h.symbol).join(",");

        const [quotesRes, dividendsRes, recordsRes, settingsRes, acctRes] = await Promise.all([
          fetch(`/api/quotes?symbols=${symbols}`),
          fetch(`/api/dividends?symbols=${symbols}`),
          fetch("/api/dividends/records"),
          fetch("/api/user-settings"),
          fetch("/api/account-summary"),
        ]);

        const quotes        = quotesRes.ok      ? await quotesRes.json()    : {};
        const dividendsMap: Record<string, DividendInfo>
                            = dividendsRes.ok   ? await dividendsRes.json() : {};
        const records: DividendRecord[]
                            = recordsRes.ok     ? await recordsRes.json()   : [];
        const settings: UserSettings
                            = settingsRes.ok    ? await settingsRes.json()  : { dividend_reinvest_enabled: false };
        const acct          = acctRes.ok        ? await acctRes.json()      : null;

        setUserSettings(settings);

        const enriched: HoldingWithQuote[] = holdingsData.map(
          (h: { symbol: string; shares: number; avg_cost: number; id: string; name: string; type: "stock" | "etf" }) => {
            const q            = quotes[h.symbol];
            const price        = q?.price      ?? h.avg_cost;
            const change       = q?.change     ?? 0;
            const change_pct   = q?.change_pct ?? 0;
            const market_value = price * h.shares;
            const cost_basis   = h.avg_cost * h.shares;
            const total_pnl    = market_value - cost_basis;
            const total_pnl_pct = cost_basis > 0 ? (total_pnl / cost_basis) * 100 : 0;
            const daily_pnl    = change * h.shares;
            const dividend     = dividendsMap[h.symbol] ?? null;
            const dividendRecord = records.find(
              r => r.symbol === h.symbol && r.ex_dividend_date === dividend?.exDividendDate
            ) ?? null;
            return {
              ...h, current_price: price, change, change_pct,
              market_value, cost_basis, total_pnl, total_pnl_pct, daily_pnl,
              dividend, dividendRecord,
              source:     q?.source,
              isRealtime: q?.isRealtime,
            };
          }
        );
        setHoldings(enriched);

        const total_assets = enriched.reduce((s, h) => s + h.market_value, 0);
        const total_cost   = enriched.reduce((s, h) => s + h.cost_basis, 0);
        const total_pnl    = total_assets - total_cost;
        const daily_pnl    = enriched.reduce((s, h) => s + h.daily_pnl, 0);

        const thisYear = new Date().getFullYear().toString();
        const ytd_dividends = records
          .filter(r => r.ex_dividend_date?.startsWith(thisYear))
          .reduce((sum, r) => sum + Number(r.cash_received ?? 0), 0);

        const todayStr2 = new Date().toISOString().slice(0, 10);
        const estimated_dividends = enriched.reduce((sum, h) => {
          const div = h.dividend;
          if (div?.exDividendDate && div.exDividendDate >= todayStr2 && div.cashDividend > 0) {
            return sum + div.cashDividend * h.shares;
          }
          return sum;
        }, 0);

        setSummary({
          total_assets, total_cost, total_pnl,
          total_pnl_pct:      total_cost > 0 ? (total_pnl / total_cost) * 100 : 0,
          daily_pnl,
          daily_pnl_pct:      (total_assets - daily_pnl) > 0 ? (daily_pnl / (total_assets - daily_pnl)) * 100 : 0,
          ytd_dividends,
          estimated_dividends,
          cash_balance:        acct?.cash_balance       ?? 0,
          realized_pnl_today:  acct?.realized_pnl_today ?? 0,
        });
      }
      setLastUpdated(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/dividends/sync", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reinvest: userSettings.dividend_reinvest_enabled }),
      });
      if (res.ok) {
        const data: DivSyncResponse = await res.json();
        setSyncResult(data);
        // Reload page data if anything changed
        if (data.synced > 0) loadData();
      }
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const today    = new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric", weekday: "short" });
  const todayStr = new Date().toISOString().slice(0, 10);
  const cutoffStr = (() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().slice(0, 10); })();

  const upcomingDividends: (DividendInfo & { name: string; symbol: string; shares: number })[] =
    holdings
      .filter(h =>
        h.dividend?.exDividendDate &&
        h.dividend.exDividendDate >= todayStr &&
        h.dividend.exDividendDate <= cutoffStr &&
        h.dividend.cashDividend > 0
      )
      .map(h => ({ ...h.dividend!, name: h.name, symbol: h.symbol, shares: h.shares }))
      .sort((a, b) => (a.exDividendDate ?? "").localeCompare(b.exDividendDate ?? ""));

  return (
    <>
      <div className="px-4 pt-8 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Image
              src="/icon2-512.png"
              alt="Daily Stock"
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain shrink-0"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">我的投資組合</h1>
              <p className="text-xs text-muted mt-0.5">{today}</p>
            </div>
          </div>
          <UserMenu />
        </header>

        {/* Summary banner */}
        {loading ? (
          <div className="bg-gray-800 rounded-3xl h-48 animate-pulse" />
        ) : summary ? (
          <SummaryBanner summary={summary} />
        ) : null}

        {/* 近期配息提醒 */}
        {!loading && upcomingDividends.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-800">近期配息提醒</h2>
              <span className="text-xs text-muted">未來 90 天</span>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingDividends.map(d => {
                const [, m, day] = (d.exDividendDate ?? "").split("-");
                const exLabel  = `${parseInt(m)}/${parseInt(day)} 除息`;
                const daysLeft = Math.ceil(
                  (new Date(d.exDividendDate!).getTime() - Date.now()) / (1000 * 86400)
                );
                const soon = daysLeft <= 14;
                return (
                  <div key={d.symbol} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {d.symbol} {d.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        📅 {exLabel}
                        {d.paymentDate && (() => {
                          const [, pm, pd] = d.paymentDate!.split("-");
                          return ` · 💰 ${parseInt(pm)}/${parseInt(pd)} 發放`;
                        })()}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-600 font-medium">
                        現金股利 {d.cashDividend}
                      </span>
                      {soon ? (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                          即將除息
                        </span>
                      ) : (
                        <span className="text-xs text-muted">{daysLeft} 天後</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Holdings header + sync button */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-base font-semibold text-gray-700">持股清單</h2>
          {lastUpdated && (
            <span className="text-xs text-muted">更新 {lastUpdated}</span>
          )}
        </div>

        {/* 檢查配息入帳按鈕 */}
        {!loading && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-base">💰</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">檢查配息入帳</p>
                <p className="text-xs text-muted">
                  {userSettings.dividend_reinvest_enabled ? "自動再投入模式" : "只記錄現金模式"}
                </p>
              </div>
            </div>
            {syncing ? (
              <RefreshCw size={16} className="text-gray-400 animate-spin" />
            ) : (
              <ChevronRight size={16} className="text-gray-300" />
            )}
          </button>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {holdings.map(h => (
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

      {/* Sync result sheet */}
      {syncResult && (
        <SyncResultSheet
          result={syncResult}
          reinvest={userSettings.dividend_reinvest_enabled}
          onClose={() => setSyncResult(null)}
        />
      )}
    </>
  );
}
