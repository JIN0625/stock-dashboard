"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw, ArrowDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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

type SimMode   = "buy" | "sell" | "swap";
type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

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
      {/* 狀態提示 */}
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
// 自動查詢 hook（代號 → 名稱 + 報價）
// ════════════════════════════════════════════════════════════

function useLookup() {
  const [symbol,     setSymbolRaw]  = useState("");
  const [name,       setName]       = useState("");
  const [price,      setPrice]      = useState<number | null>(null);
  const [market,     setMarket]     = useState("");
  const [status,     setStatus]     = useState<NameStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setSymbol(v: string) {
    setSymbolRaw(v);
    setName(""); setPrice(null); setMarket(""); setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    const trimmed = v.trim().toUpperCase();
    if (trimmed.length < 4) return;
    timer.current = setTimeout(async () => {
      setStatus("fetching");
      try {
        // 查名稱
        const infoRes = await fetch(`/api/stock-info?symbol=${encodeURIComponent(trimmed)}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          setName(info.name ?? "");
          setMarket(info.market ?? "");
          setStatus("found");
        } else {
          setStatus("not_found");
        }
        // 查報價
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
    setSymbolRaw(""); setName(""); setPrice(null); setMarket(""); setStatus("idle");
  }

  return { symbol, name, price, market, status, setSymbol, reset };
}

// ════════════════════════════════════════════════════════════
// 只買 Panel
// ════════════════════════════════════════════════════════════

function BuyPanel({ holdings }: { holdings: HoldingWithPrice[] }) {
  const lookup = useLookup();
  const [inputMode, setInputMode]   = useState<"amount" | "shares">("amount");
  const [inputAmount, setInputAmount] = useState("");
  const [inputShares, setInputShares] = useState("");

  // 計算
  const sym      = lookup.symbol.toUpperCase();
  const price    = lookup.price;
  const existing = holdings.find((h) => h.symbol === sym);

  const computedShares = inputMode === "amount" && price && Number(inputAmount) > 0
    ? Number(inputAmount) / price : null;
  const computedAmount = inputMode === "shares" && price && Number(inputShares) > 0
    ? Number(inputShares) * price : null;

  const buyShares = inputMode === "amount" ? computedShares : Number(inputShares) || null;
  const buyCost   = inputMode === "shares" ? computedAmount : Number(inputAmount) || null;

  const hasResult = price && buyShares && buyShares > 0;

  let newShares = 0, newAvgCost = 0;
  if (hasResult && price) {
    newShares  = (existing?.shares ?? 0) + buyShares;
    newAvgCost = existing
      ? Math.round(((existing.avg_cost * existing.shares) + (price * buyShares)) / newShares * 100) / 100
      : price;
  }

  const newMarketValue = hasResult && price ? newShares * price : 0;

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

        {/* 買入方式 */}
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

      {/* 試算結果 */}
      {hasResult && price && buyCost !== null && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">試算結果</p>
          <ResultRow label="買入股票"   value={`${lookup.name || sym} (${sym})`} />
          <ResultRow label="現價"       value={`$${price.toLocaleString()}`} />
          <ResultRow label="預計買入"   value={`${buyShares.toFixed(4)} 股`} />
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
              <ResultRow label="持有" value={`${buyShares.toFixed(4)} 股 @ $${price.toLocaleString()}`} />
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

function SellPanel({ holdings }: { holdings: HoldingWithPrice[] }) {
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [sellSharesStr,  setSellSharesStr]   = useState("");

  const holding = holdings.find((h) => h.symbol === selectedSymbol) ?? null;
  const sellShares = Number(sellSharesStr);
  const isValid    = holding && sellShares > 0 && sellShares <= holding.shares;

  const sellPrice     = holding?.current_price ?? 0;
  const sellAmount    = isValid ? sellShares * sellPrice : 0;
  const costSold      = isValid ? sellShares * (holding?.avg_cost ?? 0) : 0;
  const realizedPnl   = sellAmount - costSold;
  const realizedPct   = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;
  const remainShares  = (holding?.shares ?? 0) - sellShares;
  const remainValue   = remainShares > 0 ? remainShares * sellPrice : 0;
  const isFullSell    = isValid && sellShares >= (holding?.shares ?? 0);

  return (
    <>
      <SectionCard title="賣出設定">
        {/* 選擇股票 */}
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

        {/* 賣出股數 */}
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
              <p className="text-xs text-red-400 mt-1">不能超過持有股數 {holding.shares}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* 試算結果 */}
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

function SwapPanel({ holdings }: { holdings: HoldingWithPrice[] }) {
  // 賣出側
  const [sellSymbol,     setSellSymbol]     = useState("");
  const [sellSharesStr,  setSellSharesStr]  = useState("");
  // 買入側
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

  const hasValidSell = sellHolding && sellSharesNum > 0 && sellSharesNum <= (sellHolding?.shares ?? 0);

  const buyPrice        = buyLookup.price;
  const buySharesWhole  = buyPrice && sellAmount > 0 ? Math.floor(sellAmount / buyPrice) : 0;
  const buySharesFrac   = buyPrice && sellAmount > 0 ? sellAmount / buyPrice : 0;
  const buyAmountWhole  = buySharesWhole * (buyPrice ?? 0);
  const remainCash      = sellAmount - buyAmountWhole;
  const hasValidBuy     = buyLookup.status === "found" && buyPrice;

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

      {/* 換股後總覽 */}
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

export default function SimulatorPage() {
  const [mode,     setMode]     = useState<SimMode>("buy");
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loadingH, setLoadingH] = useState(true);

  useEffect(() => { loadHoldings(); }, []);

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
          {mode === "buy"  && <BuyPanel  holdings={holdings} />}
          {mode === "sell" && <SellPanel holdings={holdings} />}
          {mode === "swap" && <SwapPanel holdings={holdings} />}

          {(mode === "sell" || mode === "swap") && holdings.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <p className="text-3xl mb-2">📊</p>
              <p>尚無持股可供試算</p>
              <p className="text-xs mt-1">請先到「新增」加入持股</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
