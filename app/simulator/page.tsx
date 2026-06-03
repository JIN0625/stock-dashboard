"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowDown, Loader2, CheckCircle2, AlertCircle, PenLine, Check, RefreshCw } from "lucide-react";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { Holding } from "@/types";

// ── 型別 ────────────────────────────────────────────────────

interface HoldingWithPrice extends Holding {
  current_price: number;
}

type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

// ════════════════════════════════════════════════════════════

export default function SimulatorPage() {
  // ── 持股清單（含即時報價）───────────────────────────────
  const [holdings, setHoldings]     = useState<HoldingWithPrice[]>([]);
  const [loadingH, setLoadingH]     = useState(true);

  // ── 賣出側 ───────────────────────────────────────────────
  const [sellSymbol, setSellSymbol] = useState("");
  const [sellShares, setSellShares] = useState("");

  // ── 買入側 ───────────────────────────────────────────────
  const [buySymbol, setBuySymbol]   = useState("");
  const [buyName, setBuyName]       = useState("");
  const [buyPrice, setBuyPrice]     = useState<number | null>(null);
  const [buyNameStatus, setBuyNameStatus] = useState<NameStatus>("idle");
  const [buyFetching, setBuyFetching]     = useState(false);
  const debounceTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceTimer                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 載入持股 ─────────────────────────────────────────────
  useEffect(() => { loadHoldings(); }, []);

  async function loadHoldings() {
    setLoadingH(true);
    try {
      const res     = await fetch("/api/holdings");
      const data: Holding[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) { setHoldings([]); return; }

      const symbols = data.map((h) => h.symbol).join(",");
      const qRes    = await fetch(`/api/quotes?symbols=${symbols}`);
      const quotes  = qRes.ok ? await qRes.json() : {};

      setHoldings(
        data.map((h) => ({
          ...h,
          current_price: quotes[h.symbol]?.price ?? h.avg_cost,
        }))
      );
    } finally {
      setLoadingH(false);
    }
  }

  // ── 買入側：代號 → 查名稱 + 價格 ────────────────────────
  function handleBuySymbolChange(value: string) {
    setBuySymbol(value);
    setBuyName("");
    setBuyPrice(null);
    setBuyNameStatus("idle");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (priceTimer.current)    clearTimeout(priceTimer.current);

    const trimmed = value.trim().toUpperCase();
    if (trimmed.length < 4) return;

    debounceTimer.current = setTimeout(async () => {
      setBuyNameStatus("fetching");
      setBuyFetching(true);
      try {
        // 查名稱
        const infoRes = await fetch(`/api/stock-info?symbol=${encodeURIComponent(trimmed)}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          setBuyName(info.name ?? "");
          setBuyNameStatus("found");
        } else {
          setBuyNameStatus("not_found");
        }
        // 查報價
        const qRes = await fetch(`/api/quotes?symbols=${trimmed}`);
        if (qRes.ok) {
          const q = await qRes.json();
          setBuyPrice(q[trimmed]?.price ?? null);
        }
      } catch {
        setBuyNameStatus("not_found");
      } finally {
        setBuyFetching(false);
      }
    }, 600);
  }

  // ── 計算試算結果 ─────────────────────────────────────────
  const sellHolding = holdings.find((h) => h.symbol === sellSymbol) ?? null;
  const sellSharesNum = Number(sellShares);

  const sellPrice     = sellHolding?.current_price  ?? 0;
  const sellAmount    = sellSharesNum > 0 ? sellSharesNum * sellPrice : 0;
  const costSold      = sellSharesNum > 0 ? sellSharesNum * (sellHolding?.avg_cost ?? 0) : 0;
  const realizedPnl   = sellAmount - costSold;
  const realizedPct   = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;
  const remainShares  = (sellHolding?.shares ?? 0) - sellSharesNum;
  const remainValue   = remainShares > 0 ? remainShares * sellPrice : 0;

  const buySharesTotalRaw = buyPrice && buyPrice > 0 && sellAmount > 0
    ? sellAmount / buyPrice : 0;
  const buySharesWhole    = Math.floor(buySharesTotalRaw);          // 整股
  const buySharesFrac     = buySharesTotalRaw;                       // 可含小數
  const buyAmountWhole    = buySharesWhole * (buyPrice ?? 0);
  const remainCashWhole   = sellAmount - buyAmountWhole;

  const hasValidSell = sellHolding && sellSharesNum > 0 && sellSharesNum <= (sellHolding?.shares ?? 0);
  const hasValidBuy  = buyPrice && buyPrice > 0 && buyName;

  return (
    <div className="px-4 pt-12 pb-8 space-y-5">
      {/* ── 標題 ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">換股試算</h1>
          <p className="text-xs text-muted">純模擬，不寫入資料庫</p>
        </div>
        <button
          onClick={loadHoldings}
          disabled={loadingH}
          className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform"
        >
          <RefreshCw size={15} className={`text-gray-400 ${loadingH ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          賣出設定
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-700">① 賣出股票</h2>

        {/* 選擇持股 */}
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">選擇持股</label>
          {loadingH ? (
            <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
          ) : (
            <select
              value={sellSymbol}
              onChange={(e) => { setSellSymbol(e.target.value); setSellShares(""); }}
              className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm text-gray-900 outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 appearance-none"
            >
              <option value="">— 選擇要賣出的股票 —</option>
              {holdings.map((h) => (
                <option key={h.id} value={h.symbol}>
                  {h.symbol} {h.name}（持有 {h.shares} 股 @ ${h.avg_cost}）
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 賣出股數 */}
        {sellHolding && (
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 flex items-center justify-between">
              <span>賣出股數</span>
              <button
                onClick={() => setSellShares(String(sellHolding.shares))}
                className="text-red-500 text-xs underline underline-offset-2"
              >
                全部賣出 ({sellHolding.shares})
              </button>
            </label>
            <input
              type="number" inputMode="numeric"
              placeholder={`最多 ${sellHolding.shares} 股`}
              value={sellShares}
              max={sellHolding.shares}
              onChange={(e) => setSellShares(e.target.value)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
            />
          </div>
        )}

        {/* 賣出試算結果 */}
        {hasValidSell && (
          <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">賣出股數</span>
              <span className="font-semibold text-gray-800">{sellSharesNum.toLocaleString()} 股</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">目前價格</span>
              <span className="font-semibold text-gray-800">${formatCurrency(sellPrice, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">賣出金額</span>
              <span className="font-bold text-gray-900">${formatCurrency(sellAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-muted">持有成本</span>
              <span className="text-gray-700">${formatCurrency(costSold)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">已實現損益</span>
              <span className={`font-bold ${pnlColor(realizedPnl)}`}>
                {formatChange(realizedPnl, 0)} ({formatPct(realizedPct)})
              </span>
            </div>
            {remainShares > 0 && (
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <span className="text-muted">剩餘 {remainShares} 股市值</span>
                <span className="text-gray-700">${formatCurrency(remainValue)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 中間箭頭 */}
      {hasValidSell && (
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowDown size={16} className="text-gray-400" />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          買入設定
      ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-gray-700">② 買入股票</h2>

        {/* 買入代號 */}
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">股票代號</label>
          <input
            type="text" inputMode="text" autoCapitalize="characters"
            placeholder="輸入代號自動查詢"
            value={buySymbol}
            onChange={(e) => handleBuySymbolChange(e.target.value.toUpperCase())}
            autoComplete="off"
            className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
          />
        </div>

        {/* 買入名稱 + 價格 */}
        {buySymbol.length >= 4 && (
          <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">股票名稱</span>
              {buyFetching ? (
                <Loader2 size={14} className="animate-spin text-gray-300" />
              ) : buyName ? (
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  {buyName}
                  {buyNameStatus === "found" && <CheckCircle2 size={12} className="text-emerald-500" />}
                </span>
              ) : buyNameStatus === "not_found" ? (
                <span className="text-xs text-orange-500 flex items-center gap-1">
                  <AlertCircle size={11} /> 查無此代號
                </span>
              ) : null}
            </div>
            {buyPrice !== null && (
              <div className="flex justify-between">
                <span className="text-muted">目前價格</span>
                <span className="font-bold text-gray-900">${buyPrice.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* 換股試算 */}
        {hasValidSell && hasValidBuy && buyPrice && (
          <div className="bg-blue-50 rounded-2xl p-3.5 space-y-2 text-sm">
            <p className="text-xs font-semibold text-blue-700 mb-2">換股試算（以賣出金額 ${formatCurrency(sellAmount)} 計）</p>
            <div className="flex justify-between">
              <span className="text-blue-600">可買整股數</span>
              <span className="font-bold text-blue-900">{buySharesWhole.toLocaleString()} 股</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">買入金額</span>
              <span className="font-semibold text-blue-800">${formatCurrency(buyAmountWhole)}</span>
            </div>
            <div className="flex justify-between border-t border-blue-100 pt-2">
              <span className="text-blue-600">剩餘現金</span>
              <span className="font-semibold text-blue-800">${formatCurrency(remainCashWhole)}</span>
            </div>
            <div className="border-t border-blue-100 pt-2">
              <p className="text-xs text-blue-500">
                （含小數零股：{buySharesFrac.toFixed(4)} 股，耗用 ${formatCurrency(sellAmount)}）
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          換股後總覽
      ══════════════════════════════════════════════════ */}
      {hasValidSell && hasValidBuy && buyPrice && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-3">③ 換股後預估</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">
                賣出後 {sellHolding?.name} 剩 {remainShares.toLocaleString()} 股
              </span>
              <span className="text-gray-700">${formatCurrency(remainValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                買入 {buyName} {buySharesWhole} 股
              </span>
              <span className="text-gray-700">${formatCurrency(buyAmountWhole)}</span>
            </div>
            {remainCashWhole > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">剩餘現金</span>
                <span className="text-gray-700">${formatCurrency(remainCashWhole)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-800">換股後預估市值</span>
              <span className="font-bold text-gray-900">
                ${formatCurrency(remainValue + buyAmountWhole + remainCashWhole)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-xs">已實現損益</span>
              <span className={`text-xs font-semibold ${pnlColor(realizedPnl)}`}>
                {formatChange(realizedPnl, 0)} ({formatPct(realizedPct)})
              </span>
            </div>
          </div>
          <p className="text-xs text-muted mt-3 text-center">
            ⚠️ 試算僅供參考，不包含手續費與交易稅
          </p>
        </div>
      )}

      {/* 空狀態 */}
      {!loadingH && holdings.length === 0 && (
        <div className="text-center py-16 text-muted text-sm">
          <p className="text-3xl mb-2">📊</p>
          <p>尚無持股可供試算</p>
          <p className="text-xs mt-1">請先到「新增」頁面加入持股</p>
        </div>
      )}
    </div>
  );
}
