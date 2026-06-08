"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw, ArrowDown, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";

// ════════════════════════════════════════════════════════════
// 共用型別
// ════════════════════════════════════════════════════════════

interface HoldingWithPrice {
  id:            string;
  symbol:        string;
  name:          string;
  shares:        number;
  avg_cost:      number;
  type:          "stock" | "etf";
  current_price: number;
}

type SimMode    = "buy" | "sell" | "swap";
type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

interface SellInfo {
  symbol:  string;
  name:    string;
  shares:  number;
  price:   number;
  avgCost: number;
}

interface BuyInfo {
  symbol: string;
  name:   string;
  shares: number;
  price:  number;
  type:   "stock" | "etf";
}

interface SimResult {
  mode:      SimMode;
  sell?:     SellInfo;
  buy?:      BuyInfo;
  sellAmt:   number;
  buyAmt:    number;
  remainCash: number;
}

// ════════════════════════════════════════════════════════════
// 共用小元件
// ════════════════════════════════════════════════════════════

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
      <h2 className="text-sm font-bold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-4 text-white space-y-2.5">
      {children}
    </div>
  );
}

function ResultRow({
  label, value, valueClass = "text-gray-200",
}: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/10" />;
}

/** 股票代號輸入框 + 自動查名稱 / 價格 */
function SymbolLookupInput({
  label, value, onChange, status, name, price, market,
}: {
  label:   string;
  value:   string;
  onChange:(v: string) => void;
  status:  NameStatus;
  name:    string;
  price:   number | null;
  market?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">{label}</label>
      <input
        type="text" inputMode="text" autoCapitalize="characters" autoComplete="off"
        placeholder="輸入代號自動查詢"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
      />
      {value.length >= 4 && (
        <div className="mt-1.5 flex items-center gap-2">
          {status === "fetching" && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Loader2 size={11} className="animate-spin" /> 查詢中…
            </span>
          )}
          {status === "found" && name && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={11} />
              {name}
              {market && <span className="text-gray-400 font-normal"> · {market}</span>}
              {price !== null && (
                <span className="ml-1 text-gray-700 font-semibold">${price.toLocaleString()}</span>
              )}
            </span>
          )}
          {status === "not_found" && (
            <span className="flex items-center gap-1 text-xs text-orange-500">
              <AlertCircle size={11} /> 查無此代號
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 自動查詢 hook（代號 → 名稱 + 報價 + 類型）
// ════════════════════════════════════════════════════════════

function useLookup() {
  const [symbol,     setSymbolRaw]  = useState("");
  const [name,       setName]       = useState("");
  const [price,      setPrice]      = useState<number | null>(null);
  const [market,     setMarket]     = useState("");
  const [stockType,  setStockType]  = useState<"stock" | "etf">("stock");
  const [status,     setStatus]     = useState<NameStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setSymbol(v: string) {
    setSymbolRaw(v);
    setName(""); setPrice(null); setMarket(""); setStatus("idle"); setStockType("stock");
    if (timer.current) clearTimeout(timer.current);
    const trimmed = v.trim().toUpperCase();
    if (trimmed.length < 4) return;
    timer.current = setTimeout(async () => {
      setStatus("fetching");
      try {
        const infoRes = await fetch(`/api/stock-info?symbol=${encodeURIComponent(trimmed)}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          setName(info.name ?? "");
          setMarket(info.market ?? "");
          setStockType(info.type === "etf" ? "etf" : "stock");
          setStatus("found");
        } else {
          setStatus("not_found");
        }
        const qRes = await fetch(`/api/quotes?symbols=${trimmed}`);
        if (qRes.ok) {
          const q = await qRes.json();
          setPrice(q[trimmed]?.price ?? null);
        }
      } catch {
        setStatus("not_found");
      }
    }, 600);
  }

  function reset() {
    setSymbolRaw(""); setName(""); setPrice(null); setMarket(""); setStatus("idle"); setStockType("stock");
  }

  return { symbol, name, price, market, stockType, status, setSymbol, reset };
}

// ════════════════════════════════════════════════════════════
// 確認套用 Modal
// ════════════════════════════════════════════════════════════

function ConfirmModal({
  result, applying, onConfirm, onCancel,
}: {
  result:    SimResult;
  applying:  boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl p-6 pb-10 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">確認套用試算結果</h3>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100">
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
          {result.sell && (
            <div className="flex justify-between">
              <span className="text-gray-500">賣出</span>
              <span className="font-semibold text-gray-900">
                {result.sell.name} ({result.sell.symbol}) {result.sell.shares} 股
              </span>
            </div>
          )}
          {result.buy && (
            <div className="flex justify-between">
              <span className="text-gray-500">買入</span>
              <span className="font-semibold text-gray-900">
                {result.buy.name} ({result.buy.symbol}) {result.buy.shares.toFixed(4)} 股
              </span>
            </div>
          )}
          {result.sellAmt > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">賣出金額</span>
              <span className="font-semibold">${formatCurrency(result.sellAmt)}</span>
            </div>
          )}
          {result.buyAmt > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">買入金額</span>
              <span className="font-semibold">${formatCurrency(result.buyAmt)}</span>
            </div>
          )}
          {result.remainCash > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">剩餘現金</span>
              <span className="font-semibold">${formatCurrency(result.remainCash)}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          此操作將直接更新您的庫存資料。
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={applying}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold active:scale-95 transition-transform"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className="flex-1 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {applying ? <Loader2 size={14} className="animate-spin" /> : null}
            確認套用
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 只買 Panel
// ════════════════════════════════════════════════════════════

function BuyPanel({
  holdings, onResult,
}: {
  holdings: HoldingWithPrice[];
  onResult: (r: SimResult | null) => void;
}) {
  const lookup = useLookup();
  const [inputMode, setInputMode]   = useState<"amount" | "shares">("amount");
  const [inputAmount, setInputAmount] = useState("");
  const [inputShares, setInputShares] = useState("");

  const sym      = lookup.symbol.toUpperCase();
  const price    = lookup.price;
  const existing = holdings.find((h) => h.symbol === sym);

  const computedShares = inputMode === "amount" && price && Number(inputAmount) > 0
    ? Number(inputAmount) / price : null;
  const computedAmount = inputMode === "shares" && price && Number(inputShares) > 0
    ? Number(inputShares) * price : null;

  const buyShares = inputMode === "amount" ? computedShares : Number(inputShares) || null;
  const buyCost   = inputMode === "shares" ? computedAmount : Number(inputAmount) || null;

  const hasResult = !!(price && buyShares && buyShares > 0);

  let newShares = 0, newAvgCost = 0;
  if (hasResult && price) {
    newShares  = (existing?.shares ?? 0) + buyShares!;
    newAvgCost = existing
      ? Math.round(((existing.avg_cost * existing.shares) + (price * buyShares!)) / newShares * 100) / 100
      : price;
  }

  const newMarketValue = hasResult && price ? newShares * price : 0;

  useEffect(() => {
    if (!hasResult || !price || !buyShares || !buyCost) { onResult(null); return; }
    onResult({
      mode:       "buy",
      buy:        { symbol: sym, name: lookup.name || sym, shares: buyShares, price, type: lookup.stockType },
      sellAmt:    0,
      buyAmt:     buyCost,
      remainCash: 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, sym, lookup.name, lookup.stockType, buyShares, buyCost, price]);

  return (
    <>
      <SectionCard title="買入設定">
        <SymbolLookupInput
          label="股票代號"
          value={lookup.symbol}
          onChange={lookup.setSymbol}
          status={lookup.status}
          name={lookup.name}
          price={lookup.price}
          market={lookup.market}
        />

        {lookup.status === "found" && price && (
          <>
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">買入方式</label>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {(["amount", "shares"] as const).map((m) => (
                  <button key={m} onClick={() => setInputMode(m)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            inputMode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                          }`}>
                    {m === "amount" ? "投入金額" : "買入股數"}
                  </button>
                ))}
              </div>
            </div>

            {inputMode === "amount" ? (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">投入金額（元）</label>
                <input type="number" inputMode="decimal" placeholder="例：50000"
                  value={inputAmount} onChange={(e) => setInputAmount(e.target.value)}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all" />
                {computedShares !== null && (
                  <p className="text-xs text-muted mt-1.5">
                    預計買入 <span className="font-semibold text-gray-800">{computedShares.toFixed(4)} 股</span>
                    （含小數零股）
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">買入股數</label>
                <input type="number" inputMode="decimal" placeholder="例：100"
                  value={inputShares} onChange={(e) => setInputShares(e.target.value)}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all" />
                {computedAmount !== null && (
                  <p className="text-xs text-muted mt-1.5">
                    預計投入 <span className="font-semibold text-gray-800">${formatCurrency(computedAmount)}</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </SectionCard>

      {hasResult && price && buyCost !== null && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">試算結果</p>
          <ResultRow label="買入股票"   value={`${lookup.name || sym} (${sym})`} />
          <ResultRow label="現價"       value={`$${price.toLocaleString()}`} />
          <ResultRow label="預計買入"   value={`${buyShares!.toFixed(4)} 股`} />
          <ResultRow label="預計投入"   value={`$${formatCurrency(buyCost)}`} />
          <Divider />
          {existing ? (
            <>
              <p className="text-xs text-gray-400">目前持倉 → 買入後</p>
              <ResultRow label="持有股數"
                value={`${existing.shares.toLocaleString()} → ${newShares.toFixed(4)} 股`} />
              <ResultRow label="平均成本"
                value={`$${existing.avg_cost} → $${newAvgCost}`}
                valueClass={newAvgCost > existing.avg_cost ? "text-red-300" : "text-green-300"} />
              <ResultRow label="持倉市值"   value={`$${formatCurrency(newMarketValue)}`} />
            </>
          ) : (
            <>
              <p className="text-xs text-blue-300 font-medium">💡 新增模擬持股</p>
              <ResultRow label="持有" value={`${buyShares!.toFixed(4)} 股 @ $${price.toLocaleString()}`} />
              <ResultRow label="市值" value={`$${formatCurrency(newMarketValue)}`} />
            </>
          )}
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 只賣 Panel
// ════════════════════════════════════════════════════════════

function SellPanel({
  holdings, onResult,
}: {
  holdings: HoldingWithPrice[];
  onResult: (r: SimResult | null) => void;
}) {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [sellSharesStr,  setSellSharesStr]   = useState("");

  const holding = holdings.find((h) => h.symbol === selectedSymbol) ?? null;
  const sellShares = Number(sellSharesStr);
  const isValid    = !!(holding && sellShares > 0 && sellShares <= holding.shares);

  const sellPrice     = holding?.current_price ?? 0;
  const sellAmount    = isValid ? sellShares * sellPrice : 0;
  const costSold      = isValid ? sellShares * (holding?.avg_cost ?? 0) : 0;
  const realizedPnl   = sellAmount - costSold;
  const realizedPct   = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;
  const remainShares  = (holding?.shares ?? 0) - sellShares;
  const remainValue   = remainShares > 0 ? remainShares * sellPrice : 0;
  const isFullSell    = isValid && sellShares >= (holding?.shares ?? 0);

  useEffect(() => {
    if (!isValid || !holding) { onResult(null); return; }
    onResult({
      mode:       "sell",
      sell:       { symbol: holding.symbol, name: holding.name, shares: sellShares, price: sellPrice, avgCost: holding.avg_cost },
      sellAmt:    sellAmount,
      buyAmt:     0,
      remainCash: 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, selectedSymbol, sellShares, sellPrice, sellAmount]);

  return (
    <>
      <SectionCard title="賣出設定">
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">選擇持股</label>
          <select value={selectedSymbol} onChange={(e) => { setSelectedSymbol(e.target.value); setSellSharesStr(""); }}
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm text-gray-900 outline-none border border-transparent appearance-none">
            <option value="">— 選擇要賣出的股票 —</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.symbol}>
                {h.symbol} {h.name}（{h.shares} 股 @ ${h.avg_cost} → 現價 ${h.current_price}）
              </option>
            ))}
          </select>
        </div>

        {holding && (
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 flex items-center justify-between">
              <span>賣出股數</span>
              <button onClick={() => setSellSharesStr(String(holding.shares))}
                      className="text-red-500 text-xs underline underline-offset-2">
                全部 ({holding.shares})
              </button>
            </label>
            <input type="number" inputMode="numeric" placeholder={`最多 ${holding.shares} 股`}
              value={sellSharesStr}
              onChange={(e) => setSellSharesStr(e.target.value)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all" />
            {sellShares > (holding?.shares ?? 0) && (
              <p className="text-xs text-red-400 mt-1">賣出股數不可超過持有股數 {holding.shares}</p>
            )}
          </div>
        )}
      </SectionCard>

      {isValid && holding && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">試算結果</p>
          {isFullSell && (
            <p className="text-sm font-bold text-yellow-300 mb-1">🏳 模擬清倉</p>
          )}
          <ResultRow label="賣出股票"   value={`${holding.name} (${holding.symbol})`} />
          <ResultRow label="賣出股數"   value={`${sellShares.toLocaleString()} 股`} />
          <ResultRow label="賣出價格"   value={`$${sellPrice.toLocaleString()}`} />
          <ResultRow label="賣出金額"   value={`$${formatCurrency(sellAmount)}`} />
          <Divider />
          <ResultRow
            label="已實現損益"
            value={`${formatChange(realizedPnl, 0)} (${formatPct(realizedPct)})`}
            valueClass={realizedPnl >= 0 ? "text-red-400" : "text-green-400"}
          />
          {!isFullSell && (
            <>
              <ResultRow label="賣出後剩餘" value={`${remainShares.toLocaleString()} 股`} />
              <ResultRow label="剩餘市值"   value={`$${formatCurrency(remainValue)}`} />
            </>
          )}
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 換股 Panel
// ════════════════════════════════════════════════════════════

function SwapPanel({
  holdings, onResult,
}: {
  holdings: HoldingWithPrice[];
  onResult: (r: SimResult | null) => void;
}) {
  const [sellSymbol,     setSellSymbol]     = useState("");
  const [sellSharesStr,  setSellSharesStr]  = useState("");
  const buyLookup = useLookup();

  const sellHolding   = holdings.find((h) => h.symbol === sellSymbol) ?? null;
  const sellSharesNum = Number(sellSharesStr);
  const sellPrice     = sellHolding?.current_price ?? 0;
  const sellAmount    = sellHolding && sellSharesNum > 0 ? sellSharesNum * sellPrice : 0;
  const costSold      = sellHolding && sellSharesNum > 0 ? sellSharesNum * sellHolding.avg_cost : 0;
  const realizedPnl   = sellAmount - costSold;
  const realizedPct   = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;
  const remainShares  = (sellHolding?.shares ?? 0) - sellSharesNum;
  const remainValue   = remainShares > 0 ? remainShares * sellPrice : 0;

  const hasValidSell = !!(sellHolding && sellSharesNum > 0 && sellSharesNum <= (sellHolding?.shares ?? 0));

  const buyPrice        = buyLookup.price;
  const buySharesWhole  = buyPrice && sellAmount > 0 ? Math.floor(sellAmount / buyPrice) : 0;
  const buyAmountWhole  = buySharesWhole * (buyPrice ?? 0);
  const remainCash      = sellAmount - buyAmountWhole;
  const hasValidBuy     = buyLookup.status === "found" && !!buyPrice;

  useEffect(() => {
    if (!hasValidSell || !hasValidBuy || !buyPrice || !sellHolding || buySharesWhole <= 0) {
      onResult(null); return;
    }
    onResult({
      mode: "swap",
      sell: {
        symbol:  sellHolding.symbol,
        name:    sellHolding.name,
        shares:  sellSharesNum,
        price:   sellPrice,
        avgCost: sellHolding.avg_cost,
      },
      buy: {
        symbol: buyLookup.symbol,
        name:   buyLookup.name || buyLookup.symbol,
        shares: buySharesWhole,
        price:  buyPrice,
        type:   buyLookup.stockType,
      },
      sellAmt:    sellAmount,
      buyAmt:     buyAmountWhole,
      remainCash,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidSell, hasValidBuy, sellSymbol, sellSharesNum, sellPrice, sellAmount,
      buyLookup.symbol, buyLookup.name, buyLookup.stockType, buyPrice, buySharesWhole, remainCash]);

  return (
    <>
      <SectionCard title="① 賣出股票">
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">選擇持股</label>
          <select value={sellSymbol} onChange={(e) => { setSellSymbol(e.target.value); setSellSharesStr(""); }}
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm text-gray-900 outline-none border border-transparent appearance-none">
            <option value="">— 選擇要賣出的股票 —</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.symbol}>
                {h.symbol} {h.name}（{h.shares} 股 @ ${h.avg_cost}）
              </option>
            ))}
          </select>
        </div>

        {sellHolding && (
          <div>
            <label className="text-xs font-medium text-muted mb-1.5 flex items-center justify-between">
              <span>賣出股數</span>
              <button onClick={() => setSellSharesStr(String(sellHolding.shares))}
                      className="text-red-500 text-xs underline underline-offset-2">
                全部 ({sellHolding.shares})
              </button>
            </label>
            <input type="number" inputMode="numeric" placeholder={`最多 ${sellHolding.shares} 股`}
              value={sellSharesStr} onChange={(e) => setSellSharesStr(e.target.value)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all" />
          </div>
        )}

        {hasValidSell && (
          <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted text-xs">賣出金額</span>
              <span className="font-bold text-gray-900">${formatCurrency(sellAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-xs">已實現損益</span>
              <span className={`font-semibold text-sm ${pnlColor(realizedPnl)}`}>
                {formatChange(realizedPnl, 0)} ({formatPct(realizedPct)})
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {hasValidSell && (
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowDown size={16} className="text-gray-400" />
          </div>
        </div>
      )}

      <SectionCard title="② 買入股票">
        <SymbolLookupInput
          label="股票代號"
          value={buyLookup.symbol}
          onChange={buyLookup.setSymbol}
          status={buyLookup.status}
          name={buyLookup.name}
          price={buyLookup.price}
          market={buyLookup.market}
        />
        {hasValidBuy && hasValidSell && buyPrice && (
          <div className="bg-blue-50 rounded-2xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-600 text-xs">可買整股數</span>
              <span className="font-bold text-blue-900">{buySharesWhole.toLocaleString()} 股</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600 text-xs">買入金額</span>
              <span className="font-semibold text-blue-800">${formatCurrency(buyAmountWhole)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600 text-xs">剩餘現金</span>
              <span className="font-semibold text-blue-800">${formatCurrency(remainCash)}</span>
            </div>
          </div>
        )}
      </SectionCard>

      {hasValidSell && hasValidBuy && buyPrice && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">換股後預估</p>
          {remainShares > 0 && (
            <ResultRow label={`${sellHolding?.name} 剩 ${remainShares} 股`}
              value={`$${formatCurrency(remainValue)}`} />
          )}
          <ResultRow label={`${buyLookup.name || buyLookup.symbol} 買入 ${buySharesWhole} 股`}
            value={`$${formatCurrency(buyAmountWhole)}`} />
          {remainCash > 0 && <ResultRow label="剩餘現金" value={`$${formatCurrency(remainCash)}`} />}
          <Divider />
          <ResultRow
            label="換股後預估市值"
            value={`$${formatCurrency(remainValue + buyAmountWhole + remainCash)}`}
            valueClass="text-white font-bold"
          />
          <ResultRow
            label="已實現損益"
            value={`${formatChange(realizedPnl, 0)} (${formatPct(realizedPct)})`}
            valueClass={realizedPnl >= 0 ? "text-red-400" : "text-green-400"}
          />
          <p className="text-[10px] text-gray-500 text-center pt-1">
            ⚠️ 試算不含手續費與交易稅，整股試算。
          </p>
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

const MODE_LABELS: Record<SimMode, string> = {
  buy:  "只買",
  sell: "只賣",
  swap: "換股",
};

type ToastState = { type: "success" | "error"; message: string } | null;

export default function SimulatorPage() {
  const [mode,        setMode]        = useState<SimMode>("buy");
  const [holdings,    setHoldings]    = useState<HoldingWithPrice[]>([]);
  const [loadingH,    setLoadingH]    = useState(true);
  const [simResult,   setSimResult]   = useState<SimResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying,    setApplying]    = useState(false);
  const [toast,       setToast]       = useState<ToastState>(null);

  useEffect(() => { loadHoldings(); }, []);

  // 切換模式時清除結果
  useEffect(() => { setSimResult(null); }, [mode]);

  // Toast 自動消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadHoldings() {
    setLoadingH(true);
    try {
      const res  = await fetch("/api/holdings");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) { setHoldings([]); return; }
      const symbols = data.map((h: { symbol: string }) => h.symbol).join(",");
      const qRes    = await fetch(`/api/quotes?symbols=${symbols}`);
      const quotes  = qRes.ok ? await qRes.json() : {};
      setHoldings(
        data.map((h: HoldingWithPrice) => ({
          ...h,
          current_price: quotes[h.symbol]?.price ?? h.avg_cost,
        }))
      );
    } finally {
      setLoadingH(false);
    }
  }

  const handleResult = useCallback((r: SimResult | null) => {
    setSimResult(r);
  }, []);

  async function applyToHoldings() {
    if (!simResult) return;
    setApplying(true);
    try {
      const res = await fetch("/api/simulator/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: simResult.mode,
          sell: simResult.sell,
          buy:  simResult.buy,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ type: "error", message: json.error ?? "套用失敗，請重試" });
      } else {
        setToast({ type: "success", message: "庫存已更新，交易紀錄已保存" });
        setConfirmOpen(false);
        setSimResult(null);
        await loadHoldings();
      }
    } catch {
      setToast({ type: "error", message: "網路錯誤，請重試" });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">試算</h1>
          <p className="text-xs text-muted">模擬計算，不寫入資料庫</p>
        </div>
        <button onClick={loadHoldings} disabled={loadingH}
                className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform">
          <RefreshCw size={15} className={`text-gray-400 ${loadingH ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 模式切換 */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {(Object.keys(MODE_LABELS) as SimMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    mode === m ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
                  }`}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* 持股載入中 */}
      {loadingH ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : (
        <>
          {mode === "buy"  && <BuyPanel  holdings={holdings} onResult={handleResult} />}
          {mode === "sell" && <SellPanel holdings={holdings} onResult={handleResult} />}
          {mode === "swap" && <SwapPanel holdings={holdings} onResult={handleResult} />}

          {(mode === "sell" || mode === "swap") && holdings.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <p className="text-3xl mb-2">📊</p>
              <p>尚無持股可供試算</p>
              <p className="text-xs mt-1">請先到「新增」加入持股</p>
            </div>
          )}

          {/* 確認加入庫存 按鈕 */}
          {simResult && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform shadow-md"
            >
              確認加入庫存
            </button>
          )}
        </>
      )}

      {/* 確認 Modal */}
      {confirmOpen && simResult && (
        <ConfirmModal
          result={simResult}
          applying={applying}
          onConfirm={applyToHoldings}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
          toast.type === "success" ? "bg-gray-900" : "bg-red-500"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
