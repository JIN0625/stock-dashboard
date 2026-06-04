"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2,
  Check, Loader2, CheckCircle2, AlertCircle, PenLine, X,
} from "lucide-react";
import StockChart from "@/components/StockChart";
import { formatCurrency, formatPct, formatChange, pnlColor } from "@/lib/utils";
import type { Holding, HoldingWithQuote, ConstituentData, DividendInfo } from "@/types";

// ════════════════════════════════════════════════════════════
// 小工具元件
// ════════════════════════════════════════════════════════════

function InfoRow({
  label,
  value,
  valueClass = "text-gray-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ETF 組成資料卡片
// ════════════════════════════════════════════════════════════

function WeightBar({ weight, max }: { weight: number; max: number }) {
  const pct = max > 0 ? Math.round((weight / max) * 100) : 0;
  return (
    <div className="flex-1 mx-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-red-400 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EtfConstituentCard({
  data,
  tab,
  setTab,
}: {
  data: ConstituentData | null;
  tab:  "holdings" | "industry" | "assets";
  setTab: (t: "holdings" | "industry" | "assets") => void;
}) {
  const noData =
    !data ||
    (data.topHoldings.length === 0 &&
     data.industries.length  === 0 &&
     data.assets.length      === 0);

  if (noData) {
    return (
      <div className="bg-white rounded-2xl px-4 py-5 shadow-sm text-center">
        <p className="text-xs text-muted">目前 Yahoo 股市尚無此 ETF 的成分股資料</p>
      </div>
    );
  }

  const TABS = [
    { key: "holdings" as const, label: "前十大持股", date: data.holdingDate  },
    { key: "industry" as const, label: "行業比重",   date: data.industryDate },
    { key: "assets"   as const, label: "資產分佈",   date: data.assetDate    },
  ] as const;

  // 目前顯示的資料列表（holdings 含 Other 已由 API 帶入）
  const activeList =
    tab === "holdings" ? data.topHoldings.map((h) => ({ name: h.name, weight: h.weight })) :
    tab === "industry" ? data.industries :
    data.assets;

  const activeDate = TABS.find((t) => t.key === tab)?.date ?? "";
  // Other 權重很小，以最大的真實持股為 bar 基準
  const realHoldings = data.topHoldings.filter((h) => h.name !== "Other");
  const maxWeight    = realHoldings.length > 0
    ? Math.max(...realHoldings.map((h) => h.weight))
    : (activeList.length > 0 ? Math.max(...activeList.map((i) => i.weight)) : 1);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 標題列 */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-800">ETF 組成</p>
          {activeDate && (
            <span className="text-xs text-muted bg-gray-50 px-2 py-0.5 rounded-full">
              {activeDate}
            </span>
          )}
        </div>
        {/* 持股佔比 chips（只在 holdings tab 且有資料時顯示）*/}
        {tab === "holdings" && data.topHoldingsWeight > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              前十大佔比 {data.topHoldingsWeight}%
            </span>
            {data.otherWeight > 0.01 && (
              <span className="text-xs bg-gray-100 text-muted px-2 py-0.5 rounded-full">
                其他持股 {data.otherWeight}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* 分頁 Tab */}
      <div className="flex gap-1 mx-4 mb-3 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label }) => {
          const list =
            key === "holdings" ? data.topHoldings :
            key === "industry" ? data.industries  : data.assets;
          if (list.length === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 列表 */}
      <div className="px-4 pb-4 space-y-2.5">
        {activeList.length === 0 ? (
          <p className="text-xs text-muted text-center py-3">無資料</p>
        ) : (
          activeList.map((item, i) => {
            const isOther = item.name === "Other";
            return (
              <div key={i} className="flex items-center">
                {tab === "holdings" ? (
                  <span className={`text-xs w-5 shrink-0 text-right ${isOther ? "text-gray-300" : "text-muted"}`}>
                    {isOther ? "—" : i + 1}
                  </span>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-300 shrink-0"
                        style={{ opacity: Math.max(0.15, 1 - i * 0.07) }} />
                )}
                <span className={`text-xs ml-2 w-24 shrink-0 truncate ${isOther ? "text-gray-400" : "text-gray-700"}`}>
                  {item.name}
                </span>
                <WeightBar weight={item.weight} max={maxWeight} />
                <span className={`text-xs font-semibold w-12 text-right shrink-0 ${isOther ? "text-gray-400" : "text-gray-700"}`}>
                  {item.weight.toFixed(2)}%
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 資料來源 */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-gray-300 text-right">{data.source}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 配息資訊卡片
// ════════════════════════════════════════════════════════════

function DividendCard({
  dividend: d,
  currentPrice,
}: {
  dividend: DividendInfo;
  currentPrice: number;
}) {
  const todayStr    = new Date().toISOString().slice(0, 10);
  const hasUpcoming = !!d.exDividendDate && d.exDividendDate >= todayStr;
  const yield_      = currentPrice > 0 && d.cashDividend > 0
    ? (d.cashDividend / currentPrice) * 100
    : null;

  const daysToEx  = d.exDividendDate
    ? Math.ceil((new Date(d.exDividendDate).getTime() - Date.now()) / (1000 * 86400))
    : null;
  const daysToPay = d.paymentDate
    ? Math.ceil((new Date(d.paymentDate).getTime() - Date.now()) / (1000 * 86400))
    : null;

  const exSoon  = daysToEx  !== null && daysToEx  >= 0 && daysToEx  <= 14;
  const paySoon = daysToPay !== null && daysToPay >= 0 && daysToPay <= 14;

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return s.replace(/-/g, "/");
  }

  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-800">配息資訊</p>
        <span className="text-xs text-gray-300">{d.source}</span>
      </div>

      {(exSoon || paySoon) && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {exSoon && (
            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
              即將除息 · {daysToEx} 天後
            </span>
          )}
          {paySoon && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              即將入帳 · {daysToPay} 天後
            </span>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-50">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted">現金股利</span>
          <span className="text-sm font-semibold text-gray-800">
            ${d.cashDividend > 0 ? d.cashDividend : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted">除息日</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{fmtDate(d.exDividendDate)}</span>
            {!hasUpcoming && d.exDividendDate && (
              <span className="text-xs text-muted bg-gray-100 px-1.5 py-0.5 rounded">已過</span>
            )}
          </div>
        </div>
        {d.paymentDate && (
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted">發放日</span>
            <span className="text-sm font-semibold text-gray-800">{fmtDate(d.paymentDate)}</span>
          </div>
        )}
        {yield_ !== null && (
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted">殖利率（估）</span>
            <span className="text-sm font-semibold text-amber-600">{yield_.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// 編輯 Modal 型別
// ════════════════════════════════════════════════════════════

type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

interface EditForm {
  symbol:   string;
  name:     string;
  shares:   string;
  avg_cost: string;
  type:     "stock" | "etf";
}

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

export default function StockDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const router     = useRouter();

  const [holding, setHolding]     = useState<HoldingWithQuote | null>(null);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState("");

  // 成分股
  const [constituents, setConstituents] = useState<ConstituentData | null>(null);
  const [constituentTab, setConstituentTab] = useState<"holdings" | "industry" | "assets">("holdings");

  // 配息
  const [dividend, setDividend] = useState<DividendInfo | null>(null);

  // 編輯 Modal 狀態

  const [showEdit, setShowEdit]         = useState(false);
  const [editForm, setEditForm]         = useState<EditForm>({ symbol: "", name: "", shares: "", avg_cost: "", type: "stock" });
  const [nameStatus, setNameStatus]     = useState<NameStatus>("found");
  const [editMarket, setEditMarket]     = useState("");
  const [saving, setSaving]             = useState(false);
  const [editError, setEditError]       = useState("");
  const debounceTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 刪除確認 Modal 狀態
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);

  // ── 載入持股資料 ──────────────────────────────────────────
  useEffect(() => {
    loadHolding();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function loadHolding() {
    setLoading(true);
    setPageError("");
    try {
      // 1. 取得此 symbol 的持股（先拿全部再篩，避免需要知道 id）
      const holdingsRes = await fetch("/api/holdings");
      const holdingsData: Holding[] = await holdingsRes.json();
      const matched = holdingsData.find((h) => h.symbol === symbol);

      if (!matched) {
        setHolding(null);
        setLoading(false);
        return;
      }

      // 2. 取得即時報價
      const quotesRes = await fetch(`/api/quotes?symbols=${symbol}`);
      const quotes    = await quotesRes.json();
      const q         = quotes[symbol];

      const price         = q?.price      ?? matched.avg_cost;
      const change        = q?.change     ?? 0;
      const change_pct    = q?.change_pct ?? 0;
      const quote_date    = q?.date       ?? "";
      const market_value  = price * matched.shares;
      const cost_basis    = matched.avg_cost * matched.shares;
      const total_pnl     = market_value - cost_basis;
      const total_pnl_pct = cost_basis > 0 ? (total_pnl / cost_basis) * 100 : 0;
      const daily_pnl     = change * matched.shares;

      // 3. 取得歷史走勢
      const histRes  = await fetch(`/api/quotes/history?symbol=${symbol}&days=90`);
      const history  = histRes.ok ? await histRes.json() : [];

      // 4. 取得 stock_info_cache market 標籤（非必要，查不到不影響）
      let market = "";
      try {
        const infoRes = await fetch(`/api/stock-info?symbol=${symbol}`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          market = info.market ?? "";
        }
      } catch { /* ignore */ }

      // 5. 成分股（ETF 才有，查不到也不影響頁面）
      try {
        const cRes = await fetch(`/api/constituents?symbol=${symbol}`);
        if (cRes.ok) {
          const cData: ConstituentData = await cRes.json();
          setConstituents(cData);
        }
      } catch { /* ignore */ }

      // 6. 配息資料
      try {
        const dRes = await fetch(`/api/dividends?symbol=${symbol}`);
        if (dRes.ok) {
          const dData: DividendInfo = await dRes.json();
          if (dData.cashDividend > 0 || dData.exDividendDate) setDividend(dData);
        }
      } catch { /* ignore */ }

      setHolding({
        ...matched,
        current_price: price,
        change,
        change_pct,
        market_value,
        cost_basis,
        total_pnl,
        total_pnl_pct,
        daily_pnl,
        quote_date,
        market,
        history,
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  // ── 開啟編輯 Modal ────────────────────────────────────────
  function openEdit() {
    if (!holding) return;
    setEditForm({
      symbol:   holding.symbol,
      name:     holding.name,
      shares:   String(holding.shares),
      avg_cost: String(holding.avg_cost),
      type:     holding.type,
    });
    setEditMarket(holding.market ?? "");
    setNameStatus("found"); // 名稱已知，預設 found 狀態
    setEditError("");
    setShowEdit(true);
  }

  // ── 編輯代號輸入（600ms debounce 重查名稱）────────────────
  function handleEditSymbolChange(value: string) {
    setEditForm((f) => ({ ...f, symbol: value, name: "" }));
    setNameStatus("idle");
    setEditMarket("");
    setEditError("");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length < 4) return;

    debounceTimer.current = setTimeout(() => lookupEditSymbol(trimmed), 600);
  }

  async function lookupEditSymbol(sym: string) {
    setNameStatus("fetching");
    try {
      const res = await fetch(`/api/stock-info?symbol=${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data: { symbol: string; name: string; type: "stock" | "etf"; market: string } =
          await res.json();
        setEditForm((f) => ({ ...f, name: data.name, type: data.type }));
        setEditMarket(data.market ?? "");
        setNameStatus("found");
      } else {
        setNameStatus("not_found");
      }
    } catch {
      setNameStatus("not_found");
    }
  }

  // ── 儲存編輯 ─────────────────────────────────────────────
  async function handleSave() {
    setEditError("");

    if (!editForm.symbol.trim())                              { setEditError("請輸入股票代號"); return; }
    if (!editForm.name.trim())                                { setEditError("請輸入股票名稱"); return; }
    if (!editForm.shares || Number(editForm.shares) <= 0)     { setEditError("請輸入持有股數"); return; }
    if (!editForm.avg_cost || Number(editForm.avg_cost) <= 0) { setEditError("請輸入平均成本"); return; }

    if (!holding) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol:   editForm.symbol.trim().toUpperCase(),
          name:     editForm.name.trim(),
          shares:   Number(editForm.shares),
          avg_cost: Number(editForm.avg_cost),
          type:     editForm.type,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "儲存失敗");
      }
      setShowEdit(false);
      // 若代號改變，導向新代號詳情頁；否則原地重新載入
      const newSymbol = editForm.symbol.trim().toUpperCase();
      if (newSymbol !== symbol) {
        router.replace(`/stock/${newSymbol}`);
      } else {
        await loadHolding();
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "儲存失敗，請再試一次");
    } finally {
      setSaving(false);
    }
  }

  // ── 刪除 ─────────────────────────────────────────────────
  async function handleDelete() {
    if (!holding) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "刪除失敗");
      }
      router.push("/holdings");
    } catch (err) {
      setShowDeleteConfirm(false);
      setPageError(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setDeleting(false);
    }
  }

  // ── Loading 骨架 ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-4 pt-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-56 bg-white rounded-3xl animate-pulse" />
        <div className="h-20 bg-red-50 rounded-2xl animate-pulse" />
        <div className="h-52 bg-white rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (pageError && !holding) {
    return (
      <div className="px-4 pt-20 text-center">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="text-sm text-muted">{pageError}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-red-500 font-medium">
          返回
        </button>
      </div>
    );
  }

  if (!holding) {
    return (
      <div className="px-4 pt-20 text-center text-muted">
        <p className="text-3xl mb-2">🔍</p>
        <p>找不到此持股</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-red-500 font-medium">
          返回
        </button>
      </div>
    );
  }

  const isUp          = holding.change >= 0;
  const nameEditable  = nameStatus === "not_found" || nameStatus === "manual";
  const editPreview   =
    editForm.shares && editForm.avg_cost &&
    Number(editForm.shares) > 0 && Number(editForm.avg_cost) > 0
      ? Number(editForm.shares) * Number(editForm.avg_cost)
      : null;

  return (
    <>
      <div className="px-4 pt-10 pb-8 space-y-4">

        {/* ── 頂部操作列 ────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            >
              <Pencil size={15} className="text-gray-500" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-9 h-9 bg-white rounded-full shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            >
              <Trash2 size={15} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* 全域錯誤 */}
        {pageError && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} />
            {pageError}
          </div>
        )}

        {/* ── 股票名稱 + 價格 + 走勢圖 ─────────────────── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                  {holding.symbol}
                </span>
                <span className="text-xs font-medium text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                  {holding.type === "etf" ? "ETF" : "個股"}
                </span>
                {holding.market && (
                  <span className="text-xs font-medium text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                    {holding.market}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{holding.name}</h1>
              {holding.quote_date && (
                <p className="text-xs text-muted mt-0.5">報價日期 {holding.quote_date}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(holding.current_price, holding.current_price < 100 ? 2 : 0)}
              </p>
              <p className={`text-sm font-semibold ${pnlColor(holding.change)}`}>
                {formatChange(holding.change)} ({formatPct(holding.change_pct)})
              </p>
            </div>
          </div>
          <StockChart data={holding.history ?? []} positive={holding.total_pnl >= 0} />
        </div>

        {/* ── 今日損益 highlight ────────────────────────── */}
        <div
          className={`rounded-2xl px-5 py-4 flex items-center justify-between ${
            isUp ? "bg-red-50" : "bg-green-50"
          }`}
        >
          <div>
            <p className="text-xs text-muted">今日損益</p>
            <p className={`text-xl font-bold ${isUp ? "text-up" : "text-down"}`}>
              {formatChange(holding.daily_pnl, 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">今日漲跌</p>
            <p className={`text-xl font-bold ${isUp ? "text-up" : "text-down"}`}>
              {formatChange(holding.change)} ({formatPct(holding.change_pct)})
            </p>
          </div>
        </div>

        {/* ── 詳細資料列表 ──────────────────────────────── */}
        <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
          <InfoRow label="持有股數"  value={`${holding.shares.toLocaleString()} 股`} />
          <InfoRow label="平均成本"  value={`$${holding.avg_cost}`} />
          <InfoRow label="投入成本"  value={`$${formatCurrency(holding.cost_basis)}`} />
          <InfoRow label="目前市值"  value={`$${formatCurrency(holding.market_value)}`} />
          <InfoRow
            label="今日損益"
            value={formatChange(holding.daily_pnl, 0)}
            valueClass={pnlColor(holding.daily_pnl)}
          />
          <InfoRow
            label="總損益"
            value={formatChange(holding.total_pnl, 0)}
            valueClass={pnlColor(holding.total_pnl)}
          />
          <InfoRow
            label="總報酬率"
            value={formatPct(holding.total_pnl_pct)}
            valueClass={pnlColor(holding.total_pnl_pct)}
          />
        </div>

        {/* ── 配息資訊 ──────────────────────────────── */}
        {dividend && (
          <DividendCard dividend={dividend} currentPrice={holding.current_price} />
        )}

        {/* ── ETF 組成資料（ETF 才顯示）──────────────── */}
        {holding.type === "etf" && (
          <EtfConstituentCard
            data={constituents}
            tab={constituentTab}
            setTab={setConstituentTab}
          />
        )}

      </div>

      {/* ════════════════════════════════════════════════════
          編輯 Modal
      ════════════════════════════════════════════════════ */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !saving && setShowEdit(false)}
          />

          {/* Modal 面板（底部拉起） */}
          <div className="relative w-full max-w-md bg-surface rounded-t-3xl px-4 pt-4 pb-10 overflow-y-auto max-h-[92vh]">
            {/* 拖曳指示條 */}
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

            {/* 標題列 */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">編輯持股</h2>
              <button
                onClick={() => !saving && setShowEdit(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">

              {/* 股票代號 */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">股票代號 *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="例：2330"
                  value={editForm.symbol}
                  onChange={(e) => handleEditSymbolChange(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                />
              </div>

              {/* 股票名稱 */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[18px]">
                  <label className="text-xs font-medium text-muted">股票名稱 *</label>
                  <span className="flex items-center gap-2">
                    {nameStatus === "fetching" && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 size={11} className="animate-spin" /> 查詢中…
                      </span>
                    )}
                    {nameStatus === "found" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 size={11} /> 已填入
                        {editMarket && (
                          <span className="ml-1 text-gray-400 font-normal">· {editMarket}</span>
                        )}
                      </span>
                    )}
                    {nameStatus === "not_found" && (
                      <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                        <AlertCircle size={11} /> 查無代號
                      </span>
                    )}
                    {(nameStatus === "found" || nameStatus === "fetching") && (
                      <button
                        type="button"
                        onClick={() => setNameStatus("manual")}
                        className="flex items-center gap-0.5 text-xs text-gray-400 underline underline-offset-2"
                      >
                        <PenLine size={10} /> 手動修改
                      </button>
                    )}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="股票名稱"
                    value={editForm.name}
                    readOnly={!nameEditable}
                    onChange={(e) =>
                      nameEditable && setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className={`w-full rounded-2xl px-4 py-3.5 text-base shadow-sm outline-none border transition-all
                      ${nameEditable
                        ? "bg-white text-gray-900 placeholder-gray-300 border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300"
                        : "bg-gray-50 text-gray-500 border-transparent cursor-default select-none"}
                      ${nameStatus === "found" ? "font-medium text-gray-800" : ""}`}
                  />
                  {nameStatus === "fetching" && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <Loader2 size={16} className="text-gray-300 animate-spin" />
                    </div>
                  )}
                  {nameStatus === "found" && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Check size={11} className="text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* 持有股數 */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">持有股數 *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="例：1000"
                  value={editForm.shares}
                  onChange={(e) => { setEditForm((f) => ({ ...f, shares: e.target.value })); setEditError(""); }}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                />
              </div>

              {/* 平均成本 */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block">平均成本（元）*</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="例：680"
                  value={editForm.avg_cost}
                  onChange={(e) => { setEditForm((f) => ({ ...f, avg_cost: e.target.value })); setEditError(""); }}
                  className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                />
              </div>

              {/* 類型 */}
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 flex items-center gap-2">
                  類型
                  {nameStatus === "found" && (
                    <span className="text-emerald-600 font-normal">（已自動判斷）</span>
                  )}
                </label>
                <div className="flex gap-2">
                  {(["stock", "etf"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm
                        ${editForm.type === t ? "bg-red-500 text-white" : "bg-white text-gray-500"}`}
                    >
                      {editForm.type === t && <Check size={14} />}
                      {t === "stock" ? "個股" : "ETF"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 成本預覽 */}
              {editPreview !== null && (
                <div className="bg-gray-50 rounded-2xl px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted">投入成本預覽</p>
                    <p className="font-bold text-gray-900 text-sm">
                      ${editPreview.toLocaleString("zh-TW")}
                    </p>
                  </div>
                  {editForm.name && (
                    <p className="text-xs text-muted mt-1">
                      {editForm.name} × {Number(editForm.shares).toLocaleString()} 股 × ${editForm.avg_cost}
                    </p>
                  )}
                </div>
              )}

              {/* 錯誤訊息 */}
              {editError && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
                  <AlertCircle size={14} className="shrink-0" />
                  {editError}
                </div>
              )}

              {/* 儲存按鈕 */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || nameStatus === "fetching"}
                className="w-full bg-red-500 text-white rounded-2xl py-4 font-semibold text-base shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "儲存中…" : "儲存變更"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          刪除確認 Modal
      ════════════════════════════════════════════════════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          {/* 對話框 */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">確定要刪除此持股？</h3>
              <p className="text-sm text-muted">
                將刪除 <span className="font-semibold text-gray-800">{holding.name}（{holding.symbol}）</span>，此操作無法復原。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
