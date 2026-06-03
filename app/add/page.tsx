"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, CheckCircle2, AlertCircle, PenLine } from "lucide-react";

const USE_MOCK = false;

type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

interface FormState {
  symbol:   string;
  name:     string;
  shares:   string;
  avg_cost: string;
  type:     "stock" | "etf";
}

export default function AddPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    symbol: "", name: "", shares: "", avg_cost: "", type: "stock",
  });
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [market, setMarket]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const debounceTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 代號輸入 → 600ms 後查詢 ────────────────────────────────
  function handleSymbolChange(value: string) {
    setForm((f) => ({ ...f, symbol: value, name: "" }));
    setNameStatus("idle");
    setMarket("");
    setFormError("");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = value.trim().toUpperCase();
    if (trimmed.length < 4) return;

    debounceTimer.current = setTimeout(() => lookupSymbol(trimmed), 600);
  }

  async function lookupSymbol(symbol: string) {
    setNameStatus("fetching");
    try {
      const res = await fetch(`/api/stock-info?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data: { symbol: string; name: string; type: "stock" | "etf"; market: string } =
          await res.json();
        setForm((f) => ({ ...f, name: data.name, type: data.type }));
        setMarket(data.market ?? "");
        setNameStatus("found");
      } else {
        setNameStatus("not_found");
      }
    } catch {
      setNameStatus("not_found");
    }
  }

  // ── 送出 ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.symbol.trim())                                    { setFormError("請輸入股票代號"); return; }
    if (!form.name.trim())                                      { setFormError("請等待名稱查詢，或手動輸入股票名稱"); return; }
    if (!form.shares || Number(form.shares) <= 0)               { setFormError("請輸入持有股數"); return; }
    if (!form.avg_cost || Number(form.avg_cost) <= 0)           { setFormError("請輸入平均成本"); return; }

    setSubmitting(true);
    try {
      if (!USE_MOCK) {
        const res = await fetch("/api/holdings", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol:   form.symbol.trim().toUpperCase(),
            name:     form.name.trim(),
            shares:   Number(form.shares),
            avg_cost: Number(form.avg_cost),
            type:     form.type,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "新增失敗");
        }
      }
      router.push("/holdings");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "發生錯誤，請再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  const nameEditable = nameStatus === "not_found" || nameStatus === "manual";
  const previewCost  =
    form.shares && form.avg_cost && Number(form.shares) > 0 && Number(form.avg_cost) > 0
      ? Number(form.shares) * Number(form.avg_cost)
      : null;

  return (
    <div className="px-4 pt-12 pb-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">新增持股</h1>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* 股票代號 */}
        <div>
          <label className="text-xs font-medium text-muted mb-1.5 block">股票代號 *</label>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="例:2330、0050、00981A"
            value={form.symbol}
            onChange={(e) => handleSymbolChange(e.target.value.toUpperCase())}
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
                  <CheckCircle2 size={11} /> 已自動填入
                  {market && <span className="ml-1 text-gray-400 font-normal">· {market}</span>}
                </span>
              )}
              {nameStatus === "not_found" && (
                <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <AlertCircle size={11} /> 查無此代號
                </span>
              )}
              {(nameStatus === "found" || nameStatus === "fetching") && (
                <button
                  type="button"
                  onClick={() => setNameStatus("manual")}
                  className="flex items-center gap-0.5 text-xs text-gray-400 underline underline-offset-2"
                >
                  <PenLine size={10} /> 手動輸入
                </button>
              )}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder={
                nameStatus === "idle"     ? "輸入代號後自動填入" :
                nameStatus === "fetching" ? "查詢中…" :
                                            "請輸入股票名稱"
              }
              value={form.name}
              readOnly={!nameEditable}
              onChange={(e) => nameEditable && setForm((f) => ({ ...f, name: e.target.value }))}
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
            value={form.shares}
            onChange={(e) => { setForm((f) => ({ ...f, shares: e.target.value })); setFormError(""); }}
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
            value={form.avg_cost}
            onChange={(e) => { setForm((f) => ({ ...f, avg_cost: e.target.value })); setFormError(""); }}
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
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm
                  ${form.type === t ? "bg-red-500 text-white" : "bg-white text-gray-500"}`}
              >
                {form.type === t && <Check size={14} />}
                {t === "stock" ? "個股" : "ETF"}
              </button>
            ))}
          </div>
        </div>

        {/* 投入成本預覽 */}
        {previewCost !== null && (
          <div className="bg-gray-50 rounded-2xl px-4 py-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">投入成本預覽</p>
              <p className="font-bold text-gray-900 text-sm">
                ${previewCost.toLocaleString("zh-TW")}
              </p>
            </div>
            {form.name && (
              <p className="text-xs text-muted mt-1">
                {form.name} × {Number(form.shares).toLocaleString()} 股 × ${form.avg_cost}
              </p>
            )}
          </div>
        )}

        {/* 錯誤訊息 */}
        {formError && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} className="shrink-0" />
            {formError}
          </div>
        )}

        {/* 送出 */}
        <button
          type="submit"
          disabled={submitting || nameStatus === "fetching"}
          className="w-full bg-red-500 text-white rounded-2xl py-4 font-semibold text-base shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "新增中…" : "確認新增"}
        </button>

      </form>
    </div>
  );
}
