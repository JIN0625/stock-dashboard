"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { RefreshCw, ArrowDown, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";

// ════════════════════════════════════════════════════════════
// 型別
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
type NameStatus = "idle" | "fetching" | "found" | "not_found";

interface SellInfo { symbol: string; name: string; shares: number; price: number; avgCost: number; }
interface BuyInfo  { symbol: string; name: string; shares: number; price: number; type: "stock" | "etf"; }

interface SimResult {
  mode:        SimMode;
  sell?:       SellInfo;
  buy?:        BuyInfo;
  sellAmt:     number;
  buyAmt:      number;
  remainCash:  number;
  realizedPnl: number;
}

// ════════════════════════════════════════════════════════════
// 工具函式
// ════════════════════════════════════════════════════════════

function toNum(s: string): number { return parseFloat(s) || 0; }

function calcNewAvgCost(oldShares: number, oldAvg: number, newShares: number, buyPrice: number): number {
  const total = oldShares + newShares;
  if (total <= 0) return buyPrice;
  return Math.round(((oldAvg * oldShares) + (buyPrice * newShares)) / total * 10000) / 10000;
}

// ════════════════════════════════════════════════════════════
// 共用 UI
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
  return <div className="bg-gray-900 rounded-2xl p-4 text-white space-y-2.5">{children}</div>;
}

function ResultRow({ label, value, valueClass = "text-gray-200" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function RDivider() { return <div className="border-t border-white/10" />; }

function PriceInput({ label, value, onChange, placeholder = "輸入均價" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">{label}</label>
      <input
        type="number" inputMode="decimal" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
      />
    </div>
  );
}

function SharesInput({ label, value, onChange, max, onMax }: {
  label: string; value: string; onChange: (v: string) => void; max?: number; onMax?: () => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {max != null && onMax && (
          <button onClick={onMax} className="text-red-500 text-xs underline underline-offset-2">
            全部 ({max})
          </button>
        )}
      </label>
      <input
        type="number" inputMode="decimal" placeholder="輸入股數"
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 自動查詢 hook（代號 → 名稱 + 參考報價 + 類型）
// ════════════════════════════════════════════════════════════

function useLookup() {
  const [symbol,    setSymbolRaw] = useState("");
  const [name,      setName]      = useState("");
  const [refPrice,  setRefPrice]  = useState<number | null>(null);
  const [market,    setMarket]    = useState("");
  const [stockType, setStockType] = useState<"stock" | "etf">("stock");
  const [status,    setStatus]    = useState<NameStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setSymbol(v: string) {
    setSymbolRaw(v);
    setName(""); setRefPrice(null); setMarket(""); setStatus("idle"); setStockType("stock");
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
          setRefPrice(q[trimmed]?.price ?? null);
        }
      } catch {
        setStatus("not_found");
      }
    }, 600);
  }

  return { symbol, name, refPrice, market, stockType, status, setSymbol };
}

// ════════════════════════════════════════════════════════════
// 代號查詢輸入框（含狀態提示）
// ════════════════════════════════════════════════════════════

function SymbolLookupInput({ label, value, onChange, status, name, refPrice, market }: {
  label: string; value: string; onChange: (v: string) => void;
  status: NameStatus; name: string; refPrice: number | null; market?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted mb-1.5 block">{label}</label>
      <input
        type="text" inputMode="text" autoCapitalize="characters" autoComplete="off"
        placeholder="輸入代號自動查詢"
        value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
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
              {refPrice !== null && (
                <span className="ml-1 text-gray-500 font-normal">參考 ${refPrice.toLocaleString()}</span>
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
// 確認 Modal
// ════════════════════════════════════════════════════════════

function BeforeAfterRow({ label, before, after, highlight }: {
  label: string; before: string; after: string; highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-right">
        <span className="text-gray-400 line-through">{before}</span>
        <span className="mx-1 text-gray-300">→</span>
        <span className={`font-semibold ${highlight ? "text-red-500" : "text-gray-900"}`}>{after}</span>
      </span>
    </div>
  );
}

function ConfirmModal({ result, holdings, cashBalance, applying, onConfirm, onCancel }: {
  result: SimResult; holdings: HoldingWithPrice[]; cashBalance: number; applying: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const sellHolding = result.sell ? holdings.find((h) => h.symbol === result.sell!.symbol) : null;
  const buyHolding  = result.buy  ? holdings.find((h) => h.symbol === result.buy!.symbol)  : null;

  // 計算賣出後
  const afterSellShares = sellHolding ? sellHolding.shares - (result.sell?.shares ?? 0) : 0;

  // 計算買入後
  const afterBuyShares  = (buyHolding?.shares ?? 0) + (result.buy?.shares ?? 0);
  const afterBuyAvgCost = buyHolding && result.buy
    ? calcNewAvgCost(buyHolding.shares, buyHolding.avg_cost, result.buy.shares, result.buy.price)
    : result.buy?.price ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* 底部 Sheet */}
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* 標題列 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h3 className="text-base font-bold text-gray-900">確認套用試算結果</h3>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100">
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* 可捲動內容 */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

          {/* 交易摘要 */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            {result.sell && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">賣出</span>
                <span className="font-semibold text-gray-900 text-right">
                  {result.sell.name} ({result.sell.symbol})<br />
                  <span className="text-xs font-normal text-gray-600">
                    {result.sell.shares.toLocaleString()} 股 @ ${result.sell.price.toFixed(2)}
                    ＝ ${formatCurrency(result.sellAmt)}
                  </span>
                </span>
              </div>
            )}
            {result.buy && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">買入</span>
                <span className="font-semibold text-gray-900 text-right">
                  {result.buy.name} ({result.buy.symbol})<br />
                  <span className="text-xs font-normal text-gray-600">
                    {result.buy.shares.toLocaleString()} 股 @ ${result.buy.price.toFixed(2)}
                    ＝ ${formatCurrency(result.buyAmt)}
                  </span>
                </span>
              </div>
            )}
            {result.remainCash !== 0 && (
              <div className="flex justify-between pt-1 border-t border-gray-200">
                <span className="text-gray-500">剩餘現金</span>
                <span className={`font-semibold ${result.remainCash < 0 ? "text-red-500" : "text-gray-900"}`}>
                  ${formatCurrency(result.remainCash)}
                </span>
              </div>
            )}
          </div>

          {/* 預計庫存變化 */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">預計更新庫存</p>
            <div className="space-y-3">

              {/* 賣出後庫存 */}
              {result.sell && sellHolding && (
                <div className="bg-orange-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-orange-700">
                    {sellHolding.name} ({sellHolding.symbol})
                  </p>
                  {afterSellShares > 0 ? (
                    <>
                      <BeforeAfterRow
                        label="股數"
                        before={`${sellHolding.shares.toLocaleString()} 股`}
                        after={`${afterSellShares.toLocaleString()} 股`}
                      />
                      <BeforeAfterRow
                        label="平均成本"
                        before={`$${sellHolding.avg_cost}`}
                        after={`$${sellHolding.avg_cost}`}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-orange-600 font-medium">全部賣出，將從庫存移除</p>
                  )}
                </div>
              )}

              {/* 買入後庫存 */}
              {result.buy && (
                <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-blue-700">
                    {result.buy.name} ({result.buy.symbol})
                  </p>
                  {buyHolding ? (
                    <>
                      <BeforeAfterRow
                        label="股數"
                        before={`${buyHolding.shares.toLocaleString()} 股`}
                        after={`${afterBuyShares.toLocaleString()} 股`}
                      />
                      <BeforeAfterRow
                        label="平均成本"
                        before={`$${buyHolding.avg_cost}`}
                        after={`$${afterBuyAvgCost.toFixed(4)}`}
                        highlight={afterBuyAvgCost > buyHolding.avg_cost}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-blue-600 font-medium">
                      新增持股：{result.buy.shares.toLocaleString()} 股，平均成本 ${result.buy.price.toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 帳戶餘額變化 */}
          {(() => {
            const afterCash = cashBalance + result.sellAmt - result.buyAmt;
            return (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">帳戶餘額變化</p>
                <BeforeAfterRow
                  label="帳戶餘額"
                  before={`$${formatCurrency(cashBalance)}`}
                  after={`$${formatCurrency(afterCash)}`}
                  highlight={afterCash < 0}
                />
                {result.realizedPnl !== 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                    <span className="text-xs text-gray-500">今日已實現損益累加</span>
                    <span className={`text-xs font-semibold ${result.realizedPnl >= 0 ? "text-red-500" : "text-green-600"}`}>
                      {result.realizedPnl >= 0 ? "+" : ""}{formatCurrency(result.realizedPnl)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          <p className="text-xs text-gray-400 text-center pb-2">此操作將直接更新您的庫存資料。</p>
        </div>

        {/* 固定底部操作列，預留 BottomNav 高度 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+88px)] shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onCancel} disabled={applying}
              className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold active:scale-95 transition-transform"
            >
              取消
            </button>
            <button
              onClick={onConfirm} disabled={applying}
              className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white text-sm font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-sm"
            >
              {applying && <Loader2 size={14} className="animate-spin" />}
              確認加入庫存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 只買 Panel
// ════════════════════════════════════════════════════════════

function BuyPanel({ holdings, cashBalance, onResult }: { holdings: HoldingWithPrice[]; cashBalance: number; onResult: (r: SimResult | null) => void }) {
  const lookup      = useLookup();
  const [sharesStr, setSharesStr] = useState("");
  const [priceStr,  setPriceStr]  = useState("");

  // 查到報價時預填價格
  useEffect(() => {
    if (lookup.refPrice !== null && !priceStr) setPriceStr(String(lookup.refPrice));
  }, [lookup.refPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const sym      = lookup.symbol.toUpperCase();
  const shares   = toNum(sharesStr);
  const price    = toNum(priceStr);
  const existing = holdings.find((h) => h.symbol === sym);
  const hasResult = lookup.status === "found" && shares > 0 && price > 0;

  const buyAmt      = hasResult ? shares * price : 0;
  const newShares   = hasResult ? (existing?.shares ?? 0) + shares : 0;
  const newAvgCost  = hasResult && existing
    ? calcNewAvgCost(existing.shares, existing.avg_cost, shares, price)
    : price;

  useEffect(() => {
    if (!hasResult) { onResult(null); return; }
    onResult({
      mode:        "buy",
      buy:         { symbol: sym, name: lookup.name || sym, shares, price, type: lookup.stockType },
      sellAmt:     0,
      buyAmt,
      remainCash:  0,
      realizedPnl: 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResult, sym, lookup.name, lookup.stockType, shares, price, buyAmt]);

  return (
    <>
      <SectionCard title="買入設定">
        <SymbolLookupInput
          label="股票代號" value={lookup.symbol} onChange={lookup.setSymbol}
          status={lookup.status} name={lookup.name} refPrice={lookup.refPrice} market={lookup.market}
        />
        {lookup.status === "found" && (
          <>
            <SharesInput label="買入股數" value={sharesStr} onChange={setSharesStr} />
            <PriceInput  label="買入均價（元）" value={priceStr} onChange={setPriceStr} />
          </>
        )}
      </SectionCard>

      {hasResult && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">試算結果</p>
          <ResultRow label="買入股票" value={`${lookup.name || sym} (${sym})`} />
          <ResultRow label="買入股數" value={`${shares.toLocaleString()} 股`} />
          <ResultRow label="買入均價" value={`$${price.toFixed(2)}`} />
          <ResultRow label="買入金額" value={`$${formatCurrency(buyAmt)}`} valueClass="text-white font-bold" />
          <RDivider />
          {existing ? (
            <>
              <p className="text-xs text-gray-400">持倉變化</p>
              <ResultRow label="原持有" value={`${existing.shares.toLocaleString()} 股 @ $${existing.avg_cost}`} />
              <ResultRow label="買入後股數" value={`${newShares.toLocaleString()} 股`} />
              <ResultRow
                label="買入後平均成本"
                value={`$${newAvgCost.toFixed(4)}`}
                valueClass={newAvgCost > existing.avg_cost ? "text-red-300" : "text-green-300"}
              />
            </>
          ) : (
            <>
              <p className="text-xs text-blue-300 font-medium">💡 新增持股</p>
              <ResultRow label="平均成本" value={`$${price.toFixed(2)}`} />
            </>
          )}
          <RDivider />
          <p className="text-xs text-gray-400">帳戶餘額</p>
          <ResultRow label="目前餘額" value={`$${formatCurrency(cashBalance)}`} />
          <ResultRow label="買入扣款" value={`-$${formatCurrency(buyAmt)}`} valueClass="text-red-300" />
          <ResultRow
            label="交易後餘額"
            value={`$${formatCurrency(cashBalance - buyAmt)}`}
            valueClass={(cashBalance - buyAmt) < 0 ? "text-red-400" : "text-gray-200"}
          />
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 只賣 Panel
// ════════════════════════════════════════════════════════════

function SellPanel({ holdings, cashBalance, onResult }: { holdings: HoldingWithPrice[]; cashBalance: number; onResult: (r: SimResult | null) => void }) {
  const [selectedSym, setSelectedSym] = useState("");
  const [sharesStr,   setSharesStr]   = useState("");
  const [priceStr,    setPriceStr]    = useState("");

  const holding  = holdings.find((h) => h.symbol === selectedSym) ?? null;
  const shares   = toNum(sharesStr);
  const price    = toNum(priceStr);
  const isValid  = !!(holding && shares > 0 && shares <= holding.shares && price > 0);

  const sellAmt     = isValid ? shares * price : 0;
  const costSold    = isValid ? shares * holding!.avg_cost : 0;
  const realizedPnl = sellAmt - costSold;
  const realizedPct = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;
  const remainShares = (holding?.shares ?? 0) - shares;
  const isFullSell   = isValid && shares >= (holding?.shares ?? 0);

  // 切換股票時預填報價
  useEffect(() => {
    if (holding) setPriceStr(String(holding.current_price));
    else { setPriceStr(""); setSharesStr(""); }
  }, [selectedSym]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isValid || !holding) { onResult(null); return; }
    onResult({
      mode:        "sell",
      sell:        { symbol: holding.symbol, name: holding.name, shares, price, avgCost: holding.avg_cost },
      sellAmt,
      buyAmt:      0,
      remainCash:  0,
      realizedPnl,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, selectedSym, shares, price, sellAmt, realizedPnl]);

  return (
    <>
      <SectionCard title="賣出設定">
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">選擇持股</label>
          <select value={selectedSym}
            onChange={(e) => { setSelectedSym(e.target.value); setSharesStr(""); }}
            className="w-full bg-gray-50 rounded-2xl px-4 py-3.5 text-sm text-gray-900 outline-none border border-transparent appearance-none">
            <option value="">— 選擇要賣出的股票 —</option>
            {holdings.map((h) => (
              <option key={h.id} value={h.symbol}>
                {h.symbol} {h.name}（{h.shares} 股 @ ${h.avg_cost}）
              </option>
            ))}
          </select>
        </div>

        {holding && (
          <>
            <SharesInput
              label="賣出股數" value={sharesStr} onChange={setSharesStr}
              max={holding.shares} onMax={() => setSharesStr(String(holding.shares))}
            />
            {shares > holding.shares && (
              <p className="text-xs text-red-400 -mt-1">賣出股數不可超過持有股數 {holding.shares}</p>
            )}
            <PriceInput label="賣出均價（元）" value={priceStr} onChange={setPriceStr} />
          </>
        )}
      </SectionCard>

      {isValid && holding && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">試算結果</p>
          {isFullSell && <p className="text-sm font-bold text-yellow-300 mb-1">🏳 模擬清倉</p>}
          <ResultRow label="賣出股票" value={`${holding.name} (${holding.symbol})`} />
          <ResultRow label="賣出股數" value={`${shares.toLocaleString()} 股`} />
          <ResultRow label="賣出均價" value={`$${price.toFixed(2)}`} />
          <ResultRow label="賣出金額" value={`$${formatCurrency(sellAmt)}`} valueClass="text-white font-bold" />
          <RDivider />
          <ResultRow
            label="已實現損益"
            value={`${formatChange(realizedPnl, 0)} (${formatPct(realizedPct)})`}
            valueClass={realizedPnl >= 0 ? "text-red-400" : "text-green-400"}
          />
          {!isFullSell && (
            <ResultRow label="賣出後剩餘" value={`${remainShares.toLocaleString()} 股`} />
          )}
          <RDivider />
          <p className="text-xs text-gray-400">帳戶餘額</p>
          <ResultRow label="目前餘額" value={`$${formatCurrency(cashBalance)}`} />
          <ResultRow label="賣出入帳" value={`+$${formatCurrency(sellAmt)}`} valueClass="text-green-300" />
          <ResultRow label="交易後餘額" value={`$${formatCurrency(cashBalance + sellAmt)}`} />
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 換股 Panel
// ════════════════════════════════════════════════════════════

function SwapPanel({ holdings, cashBalance, onResult }: { holdings: HoldingWithPrice[]; cashBalance: number; onResult: (r: SimResult | null) => void }) {
  // 賣出側
  const [sellSym,      setSellSym]      = useState("");
  const [sellSharesStr, setSellSharesStr] = useState("");
  const [sellPriceStr,  setSellPriceStr]  = useState("");
  // 買入側
  const buyLookup = useLookup();
  const [buySharesStr, setBuySharesStr] = useState("");
  const [buyPriceStr,  setBuyPriceStr]  = useState("");

  const sellHolding = holdings.find((h) => h.symbol === sellSym) ?? null;
  const sellShares  = toNum(sellSharesStr);
  const sellPrice   = toNum(sellPriceStr);
  const buyShares   = toNum(buySharesStr);
  const buyPrice    = toNum(buyPriceStr);

  // 切換賣出股票時預填報價
  useEffect(() => {
    if (sellHolding) setSellPriceStr(String(sellHolding.current_price));
    else { setSellPriceStr(""); setSellSharesStr(""); }
  }, [sellSym]); // eslint-disable-line react-hooks/exhaustive-deps

  // 查到買入報價時預填
  useEffect(() => {
    if (buyLookup.refPrice !== null && !buyPriceStr) setBuyPriceStr(String(buyLookup.refPrice));
  }, [buyLookup.refPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasValidSell = !!(sellHolding && sellShares > 0 && sellShares <= sellHolding.shares && sellPrice > 0);
  const hasValidBuy  = !!(buyLookup.status === "found" && buyShares > 0 && buyPrice > 0);

  const sellAmt     = hasValidSell ? sellShares * sellPrice : 0;
  const buyAmt      = hasValidBuy  ? buyShares  * buyPrice  : 0;
  const remainCash  = sellAmt - buyAmt;

  const costSold    = hasValidSell ? sellShares * (sellHolding?.avg_cost ?? 0) : 0;
  const realizedPnl = sellAmt - costSold;
  const realizedPct = costSold > 0 ? (realizedPnl / costSold) * 100 : 0;

  const existingBuy = holdings.find((h) => h.symbol === buyLookup.symbol.toUpperCase());
  const newAvgCost  = hasValidBuy && existingBuy
    ? calcNewAvgCost(existingBuy.shares, existingBuy.avg_cost, buyShares, buyPrice)
    : buyPrice;

  useEffect(() => {
    if (!hasValidSell || !hasValidBuy || !sellHolding) { onResult(null); return; }
    onResult({
      mode:        "swap",
      sell:        { symbol: sellHolding.symbol, name: sellHolding.name, shares: sellShares, price: sellPrice, avgCost: sellHolding.avg_cost },
      buy:         { symbol: buyLookup.symbol, name: buyLookup.name || buyLookup.symbol, shares: buyShares, price: buyPrice, type: buyLookup.stockType },
      sellAmt,
      buyAmt,
      remainCash,
      realizedPnl,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidSell, hasValidBuy, sellSym, sellShares, sellPrice, sellAmt,
      buyLookup.symbol, buyLookup.name, buyLookup.stockType, buyShares, buyPrice, buyAmt, remainCash, realizedPnl]);

  return (
    <>
      {/* 賣出側 */}
      <SectionCard title="① 賣出股票">
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">選擇持股</label>
          <select value={sellSym}
            onChange={(e) => { setSellSym(e.target.value); setSellSharesStr(""); }}
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
          <>
            <SharesInput
              label="賣出股數" value={sellSharesStr} onChange={setSellSharesStr}
              max={sellHolding.shares} onMax={() => setSellSharesStr(String(sellHolding.shares))}
            />
            {sellShares > sellHolding.shares && (
              <p className="text-xs text-red-400 -mt-1">賣出股數不可超過持有股數 {sellHolding.shares}</p>
            )}
            <PriceInput label="賣出均價（元）" value={sellPriceStr} onChange={setSellPriceStr} />
            {hasValidSell && (
              <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted text-xs">賣出金額</span>
                  <span className="font-bold text-gray-900">${formatCurrency(sellAmt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted text-xs">已實現損益</span>
                  <span className={`font-semibold text-sm ${pnlColor(realizedPnl)}`}>
                    {formatChange(realizedPnl, 0)} ({formatPct(realizedPct)})
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {hasValidSell && (
        <div className="flex justify-center">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowDown size={16} className="text-gray-400" />
          </div>
        </div>
      )}

      {/* 買入側 */}
      <SectionCard title="② 買入股票">
        <SymbolLookupInput
          label="股票代號" value={buyLookup.symbol} onChange={buyLookup.setSymbol}
          status={buyLookup.status} name={buyLookup.name} refPrice={buyLookup.refPrice} market={buyLookup.market}
        />
        {buyLookup.status === "found" && (
          <>
            <SharesInput label="買入股數" value={buySharesStr} onChange={setBuySharesStr} />
            <PriceInput  label="買入均價（元）" value={buyPriceStr} onChange={setBuyPriceStr} />
          </>
        )}
      </SectionCard>

      {/* 換股結果總覽 */}
      {hasValidSell && hasValidBuy && (
        <ResultCard>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">換股試算結果</p>

          {/* 賣出區塊 */}
          <p className="text-xs text-gray-500 font-medium">賣出</p>
          <ResultRow label={`${sellHolding?.name} (${sellHolding?.symbol})`} value={`${sellShares.toLocaleString()} 股 @ $${sellPrice.toFixed(2)}`} />
          <ResultRow label="賣出金額" value={`$${formatCurrency(sellAmt)}`} valueClass="text-white font-bold" />
          <ResultRow
            label="已實現損益"
            value={`${formatChange(realizedPnl, 0)} (${formatPct(realizedPct)})`}
            valueClass={realizedPnl >= 0 ? "text-red-400" : "text-green-400"}
          />

          <RDivider />

          {/* 買入區塊 */}
          <p className="text-xs text-gray-500 font-medium">買入</p>
          <ResultRow label={`${buyLookup.name || buyLookup.symbol} (${buyLookup.symbol})`} value={`${buyShares.toLocaleString()} 股 @ $${buyPrice.toFixed(2)}`} />
          <ResultRow label="買入金額" value={`$${formatCurrency(buyAmt)}`} valueClass="text-white font-bold" />
          {existingBuy ? (
            <ResultRow
              label="買入後平均成本"
              value={`$${newAvgCost.toFixed(4)}`}
              valueClass={newAvgCost > existingBuy.avg_cost ? "text-red-300" : "text-green-300"}
            />
          ) : (
            <ResultRow label="平均成本" value={`$${buyPrice.toFixed(2)}`} valueClass="text-blue-300" />
          )}

          <RDivider />

          <ResultRow
            label="剩餘現金（換股差額）"
            value={`$${formatCurrency(remainCash)}`}
            valueClass={remainCash >= 0 ? "text-gray-200" : "text-red-400"}
          />
          {remainCash < 0 && (
            <p className="text-[10px] text-red-400 text-right">⚠️ 買入金額超過賣出金額</p>
          )}

          <RDivider />
          <p className="text-xs text-gray-400">帳戶餘額</p>
          <ResultRow label="目前餘額"   value={`$${formatCurrency(cashBalance)}`} />
          <ResultRow label="賣出入帳"   value={`+$${formatCurrency(sellAmt)}`}  valueClass="text-green-300" />
          <ResultRow label="買入扣款"   value={`-$${formatCurrency(buyAmt)}`}   valueClass="text-red-300" />
          <ResultRow
            label="交易後餘額"
            value={`$${formatCurrency(cashBalance + sellAmt - buyAmt)}`}
            valueClass={(cashBalance + sellAmt - buyAmt) < 0 ? "text-red-400" : "text-gray-200"}
          />
          <p className="text-[10px] text-gray-500 text-center pt-1">
            ⚠️ 試算不含手續費與交易稅
          </p>
        </ResultCard>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

const MODE_LABELS: Record<SimMode, string> = { buy: "只買", sell: "只賣", swap: "換股" };

type ToastState = { type: "success" | "error"; message: string } | null;

export default function SimulatorPage() {
  const [mode,         setMode]         = useState<SimMode>("buy");
  const [holdings,     setHoldings]     = useState<HoldingWithPrice[]>([]);
  const [loadingH,     setLoadingH]     = useState(true);
  const [cashBalance,  setCashBalance]  = useState(0);
  const [simResult,    setSimResult]    = useState<SimResult | null>(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [applying,     setApplying]     = useState(false);
  const [toast,        setToast]        = useState<ToastState>(null);

  useEffect(() => { loadHoldings(); loadAccountSummary(); }, []);
  useEffect(() => { setSimResult(null); }, [mode]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadAccountSummary() {
    try {
      const res = await fetch("/api/account-summary");
      if (res.ok) { const d = await res.json(); setCashBalance(d.cash_balance ?? 0); }
    } catch { /* ignore */ }
  }

  async function loadHoldings() {
    setLoadingH(true);
    try {
      const res  = await fetch("/api/holdings");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) { setHoldings([]); return; }
      const symbols = data.map((h: { symbol: string }) => h.symbol).join(",");
      const qRes    = await fetch(`/api/quotes?symbols=${symbols}`);
      const quotes  = qRes.ok ? await qRes.json() : {};
      setHoldings(data.map((h: HoldingWithPrice) => ({
        ...h,
        current_price: quotes[h.symbol]?.price ?? h.avg_cost,
      })));
    } finally {
      setLoadingH(false);
    }
  }

  const handleResult = useCallback((r: SimResult | null) => setSimResult(r), []);

  async function applyToHoldings() {
    if (!simResult) return;
    setApplying(true);
    try {
      const res  = await fetch("/api/simulator/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: simResult.mode, sell: simResult.sell, buy: simResult.buy }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast({ type: "error", message: json.error ?? "套用失敗，請重試" });
      } else {
        setToast({ type: "success", message: "庫存已更新，交易紀錄已保存" });
        setConfirmOpen(false);
        setSimResult(null);
        await Promise.all([loadHoldings(), loadAccountSummary()]);
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
          <p className="text-xs text-muted">模擬計算，確認後可套用庫存</p>
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

      {loadingH ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : (
        <>
          {mode === "buy"  && <BuyPanel  holdings={holdings} cashBalance={cashBalance} onResult={handleResult} />}
          {mode === "sell" && <SellPanel holdings={holdings} cashBalance={cashBalance} onResult={handleResult} />}
          {mode === "swap" && <SwapPanel holdings={holdings} cashBalance={cashBalance} onResult={handleResult} />}

          {(mode === "sell" || mode === "swap") && holdings.length === 0 && (
            <div className="text-center py-16 text-muted text-sm">
              <p className="text-3xl mb-2">📊</p>
              <p>尚無持股可供試算</p>
              <p className="text-xs mt-1">請先到「新增」加入持股</p>
            </div>
          )}

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

      {confirmOpen && simResult && (
        <ConfirmModal
          result={simResult} holdings={holdings} cashBalance={cashBalance} applying={applying}
          onConfirm={applyToHoldings} onCancel={() => setConfirmOpen(false)}
        />
      )}

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
