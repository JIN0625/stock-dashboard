"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus, RefreshCcw, Pencil, Trash2, Check,
  Loader2, CheckCircle2, AlertCircle, PenLine, X,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DcaPlan, DcaExecution, DcaRunResult } from "@/types";

// ════════════════════════════════════════════════════════════
// 工具函式
// ════════════════════════════════════════════════════════════

function getTaiwanToday(): { dateStr: string; day: number } {
  const tw  = new Date(Date.now() + 8 * 3600 * 1000);
  const y   = tw.getUTCFullYear();
  const m   = tw.getUTCMonth() + 1;
  const d   = tw.getUTCDate();
  return {
    dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    day: d,
  };
}

function getNextExecutionDate(dayOfMonth: number): string {
  const tw          = new Date(Date.now() + 8 * 3600 * 1000);
  const year        = tw.getUTCFullYear();
  const month       = tw.getUTCMonth(); // 0-indexed
  const todayDay    = tw.getUTCDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const effective   = Math.min(dayOfMonth, daysInMonth);

  if (todayDay <= effective) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(effective).padStart(2, "0")}`;
  }
  const nextM       = month + 1;
  const nextY       = nextM > 11 ? year + 1 : year;
  const realNextM   = nextM > 11 ? 0 : nextM;
  const daysNext    = new Date(nextY, realNextM + 1, 0).getDate();
  const effectiveN  = Math.min(dayOfMonth, daysNext);
  return `${nextY}-${String(realNextM + 1).padStart(2, "0")}-${String(effectiveN).padStart(2, "0")}`;
}

type NameStatus = "idle" | "fetching" | "found" | "not_found" | "manual";

interface PlanForm {
  symbol:         string;
  name:           string;
  type:           "stock" | "etf";
  day_of_month:   string;
  monthly_amount: string;
  is_active:      boolean;
}
const EMPTY_FORM: PlanForm = {
  symbol: "", name: "", type: "stock",
  day_of_month: "", monthly_amount: "", is_active: true,
};

type PlanWithExecs = DcaPlan & { recent_executions?: DcaExecution[] };

// ════════════════════════════════════════════════════════════
// 主頁面
// ════════════════════════════════════════════════════════════

export default function DcaPage() {
  const [plans, setPlans]         = useState<PlanWithExecs[]>([]);
  const [loading, setLoading]     = useState(true);
  const [pageError, setPageError] = useState("");

  // 展開執行紀錄的 plan id set
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 新增 / 編輯 Modal
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<PlanForm>(EMPTY_FORM);
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [formMarket, setFormMarket] = useState("");
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const debounceTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 刪除確認
  const [deleteTarget, setDeleteTarget] = useState<PlanWithExecs | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // 執行結果
  const [running, setRunning]         = useState(false);
  const [runResults, setRunResults]   = useState<DcaRunResult[] | null>(null);
  const [runDate, setRunDate]         = useState("");
  const [showResults, setShowResults] = useState(false);

  // ── 載入 ────────────────────────────────────────────────
  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setLoading(true);
    setPageError("");
    try {
      const res = await fetch("/api/dca");
      if (!res.ok) throw new Error((await res.json()).error ?? "載入失敗");
      setPlans(await res.json());
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  // ── 執行今日 DCA ─────────────────────────────────────────
  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/dca/run", { method: "POST" });
      const data = await res.json();
      setRunResults(data.results ?? []);
      setRunDate(data.date ?? "");
      setShowResults(true);
      // 執行後重新載入計畫（更新最近執行紀錄）
      await loadPlans();
    } catch {
      setPageError("執行定期定額時發生錯誤");
    } finally {
      setRunning(false);
    }
  }

  // ── 切換 is_active ────────────────────────────────────────
  async function toggleActive(plan: PlanWithExecs) {
    await fetch(`/api/dca/${plan.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !plan.is_active }),
    });
    setPlans((prev) =>
      prev.map((p) => p.id === plan.id ? { ...p, is_active: !p.is_active } : p)
    );
  }

  // ── 開啟新增 Modal ────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNameStatus("idle");
    setFormMarket("");
    setFormError("");
    setShowModal(true);
  }

  // ── 開啟編輯 Modal ────────────────────────────────────────
  function openEdit(plan: PlanWithExecs) {
    setEditingId(plan.id);
    setForm({
      symbol:         plan.symbol,
      name:           plan.name,
      type:           plan.type,
      day_of_month:   String(plan.day_of_month),
      monthly_amount: String(plan.monthly_amount),
      is_active:      plan.is_active,
    });
    setNameStatus("found");
    setFormMarket("");
    setFormError("");
    setShowModal(true);
  }

  // ── 代號 debounce 查詢 ────────────────────────────────────
  function handleSymbolChange(value: string) {
    setForm((f) => ({ ...f, symbol: value, name: "" }));
    setNameStatus("idle");
    setFormMarket("");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length < 4) return;
    debounceTimer.current = setTimeout(() => lookupSymbol(trimmed), 600);
  }

  async function lookupSymbol(sym: string) {
    setNameStatus("fetching");
    try {
      const res = await fetch(`/api/stock-info?symbol=${encodeURIComponent(sym)}`);
      if (res.ok) {
        const d = await res.json();
        setForm((f) => ({ ...f, name: d.name, type: d.type }));
        setFormMarket(d.market ?? "");
        setNameStatus("found");
      } else {
        setNameStatus("not_found");
      }
    } catch {
      setNameStatus("not_found");
    }
  }

  // ── 儲存計畫 ─────────────────────────────────────────────
  async function handleSave() {
    setFormError("");
    if (!form.symbol.trim())              { setFormError("請輸入股票代號"); return; }
    if (!form.name.trim())                { setFormError("請輸入股票名稱"); return; }
    if (!form.day_of_month)               { setFormError("請輸入每月扣款日"); return; }
    if (!form.monthly_amount)             { setFormError("請輸入每月投入金額"); return; }
    const dom = Number(form.day_of_month);
    if (isNaN(dom) || dom < 1 || dom > 31) { setFormError("扣款日須在 1–31 之間"); return; }
    if (Number(form.monthly_amount) <= 0)  { setFormError("投入金額須大於 0"); return; }

    setSaving(true);
    try {
      const payload = {
        symbol:         form.symbol.trim().toUpperCase(),
        name:           form.name.trim(),
        type:           form.type,
        day_of_month:   dom,
        monthly_amount: Number(form.monthly_amount),
        is_active:      form.is_active,
      };

      if (editingId) {
        const res = await fetch(`/api/dca/${editingId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "儲存失敗");
      } else {
        const res = await fetch("/api/dca", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "新增失敗");
      }

      setShowModal(false);
      await loadPlans();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  // ── 刪除計畫 ─────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/dca/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadPlans();
    } finally {
      setDeleting(false);
    }
  }

  // ── 執行狀態 icon ────────────────────────────────────────
  function StatusIcon({ status }: { status: DcaRunResult["status"] }) {
    if (status === "executed")
      return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />;
    if (status === "already_executed")
      return <Check size={14} className="text-blue-400 shrink-0" />;
    if (status === "error" || status === "no_price")
      return <AlertCircle size={14} className="text-red-400 shrink-0" />;
    return <RefreshCcw size={14} className="text-gray-300 shrink-0" />;
  }

  const nameEditable = nameStatus === "not_found" || nameStatus === "manual";
  const today = getTaiwanToday();

  return (
    <>
      <div className="px-4 pt-12 pb-8 space-y-4">
        {/* ── 標題 + 執行按鈕 ──────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">定期定額</h1>
            <p className="text-xs text-muted">今天是 {today.day} 日</p>
          </div>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-2xl shadow-sm active:scale-95 transition-transform disabled:opacity-60"
          >
            {running
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCcw size={14} />
            }
            {running ? "執行中…" : "檢查今日定期定額"}
          </button>
        </div>

        {/* 頁面錯誤 */}
        {pageError && (
          <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            <AlertCircle size={14} />
            {pageError}
          </div>
        )}

        {/* ── 計畫卡片列表 ──────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm">
            <p className="text-3xl mb-2">🔄</p>
            <p>尚無定期定額計畫</p>
            <p className="mt-1 text-xs">點下方「新增」開始設定</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => {
              const nextDate   = getNextExecutionDate(plan.day_of_month);
              const isToday    = nextDate === today.dateStr;
              const isOpen     = expanded.has(plan.id);
              const executions = plan.recent_executions ?? [];

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm transition-opacity ${plan.is_active ? "" : "opacity-60"}`}
                >
                  {/* 上排 */}
                  <div className="flex items-start justify-between mb-3">
                    {/* 左：代號 icon + 名稱 */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-500">{plan.symbol.slice(0, 4)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{plan.name}</p>
                        <p className="text-xs text-muted">{plan.symbol} · {plan.type === "etf" ? "ETF" : "個股"}</p>
                      </div>
                    </div>
                    {/* 右：toggle + actions */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleActive(plan)} className="active:scale-95 transition-transform">
                        {plan.is_active
                          ? <ToggleRight size={28} className="text-red-500" />
                          : <ToggleLeft  size={28} className="text-gray-300" />
                        }
                      </button>
                      <button
                        onClick={() => openEdit(plan)}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 active:scale-95"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(plan)}
                        className="w-7 h-7 flex items-center justify-center text-gray-300 active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 中排：金額 + 日期 */}
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      ${plan.monthly_amount.toLocaleString("zh-TW")}
                    </span>
                    <span className="text-xs text-muted">每月 {plan.day_of_month} 日</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isToday ? "bg-red-50 text-red-500" : "bg-gray-100 text-muted"
                    }`}>
                      {isToday ? "今日執行" : `下次 ${nextDate}`}
                    </span>
                  </div>

                  {/* 執行紀錄（可展開）*/}
                  {executions.length > 0 && (
                    <>
                      <button
                        onClick={() => setExpanded((s) => {
                          const n = new Set(s);
                          n.has(plan.id) ? n.delete(plan.id) : n.add(plan.id);
                          return n;
                        })}
                        className="flex items-center gap-1 text-xs text-muted mt-2 active:opacity-60"
                      >
                        最近執行 ({executions.length})
                        {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                      </button>
                      {isOpen && (
                        <div className="mt-2 space-y-1.5 border-t border-gray-50 pt-2">
                          {executions.map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-xs">
                              <span className="text-muted">{e.execution_date}</span>
                              <span className="text-gray-600">
                                {Number(e.shares_bought).toFixed(4)} 股 @ ${e.price.toLocaleString()}
                              </span>
                              <span className="text-gray-500">
                                ${Number(e.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 新增按鈕 ──────────────────────────────────── */}
        <button
          onClick={openAdd}
          className="w-full flex items-center justify-center gap-2 bg-white rounded-2xl py-3.5 text-sm font-semibold text-red-500 shadow-sm border border-dashed border-red-200 active:scale-[0.98] transition-transform"
        >
          <Plus size={16} />
          新增定期定額
        </button>
      </div>

      {/* ══════════════════════════════════════════════════
          新增 / 編輯 Modal（底部拉起）
      ══════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               onClick={() => !saving && setShowModal(false)} />

          {/* Sheet：flex-col，header + 可捲內容 + 固定按鈕 */}
          <div className="relative w-full max-w-md bg-surface rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden">

            {/* ── 拖曳條 + 標題（不捲動）────────────────── */}
            <div className="px-4 pt-4 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingId ? "編輯定期定額" : "新增定期定額"}
                </h2>
                <button onClick={() => !saving && setShowModal(false)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* ── 可捲動的表單欄位 ─────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="space-y-4">

                {/* 股票代號 */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">股票代號 *</label>
                  <input
                    type="text" inputMode="text" autoCapitalize="characters"
                    placeholder="例：2330、0050、00878"
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
                          {formMarket && <span className="ml-1 text-gray-400 font-normal">· {formMarket}</span>}
                        </span>
                      )}
                      {nameStatus === "not_found" && (
                        <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                          <AlertCircle size={11} /> 查無此代號
                        </span>
                      )}
                      {(nameStatus === "found" || nameStatus === "fetching") && (
                        <button type="button" onClick={() => setNameStatus("manual")}
                                className="flex items-center gap-0.5 text-xs text-gray-400 underline underline-offset-2">
                          <PenLine size={10} /> 手動輸入
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={nameStatus === "idle" ? "輸入代號後自動填入" : nameStatus === "fetching" ? "查詢中…" : "請輸入股票名稱"}
                      value={form.name}
                      readOnly={!nameEditable}
                      onChange={(e) => nameEditable && setForm((f) => ({ ...f, name: e.target.value }))}
                      className={`w-full rounded-2xl px-4 py-3.5 text-base shadow-sm outline-none border transition-all
                        ${nameEditable ? "bg-white text-gray-900 placeholder-gray-300 border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300" : "bg-gray-50 text-gray-500 border-transparent cursor-default select-none"}
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

                {/* 每月扣款日 */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">每月扣款日 *（1–31）</label>
                  <input
                    type="number" inputMode="numeric" min={1} max={31}
                    placeholder="例：6、15、25"
                    value={form.day_of_month}
                    onChange={(e) => setForm((f) => ({ ...f, day_of_month: e.target.value }))}
                    className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                  />
                </div>

                {/* 每月投入金額 */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block">每月投入金額（元）*</label>
                  <input
                    type="number" inputMode="decimal"
                    placeholder="例：3000"
                    value={form.monthly_amount}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_amount: e.target.value }))}
                    className="w-full bg-white rounded-2xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-300 shadow-sm outline-none border border-transparent focus:ring-2 focus:ring-red-400/30 focus:border-red-300 transition-all"
                  />
                </div>

                {/* 類型 */}
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 flex items-center gap-2">
                    類型
                    {nameStatus === "found" && <span className="text-emerald-600 font-normal">（已自動判斷）</span>}
                  </label>
                  <div className="flex gap-2">
                    {(["stock", "etf"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                              className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm
                                ${form.type === t ? "bg-red-500 text-white" : "bg-white text-gray-500"}`}>
                        {form.type === t && <Check size={14} />}
                        {t === "stock" ? "個股" : "ETF"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 啟用 */}
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3.5">
                  <span className="text-sm text-gray-700 font-medium">立即啟用</span>
                  <button onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))} type="button">
                    {form.is_active
                      ? <ToggleRight size={30} className="text-red-500" />
                      : <ToggleLeft  size={30} className="text-gray-300" />}
                  </button>
                </div>

                {/* 錯誤 */}
                {formError && (
                  <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
                    <AlertCircle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}

              </div>
            </div>

            {/* ── 固定在底部的確認按鈕（不被 BottomNav 蓋住）── */}
            <div
              className="shrink-0 px-4 pt-3 bg-surface border-t border-gray-100"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
            >
              <button
                type="button" onClick={handleSave}
                disabled={saving || nameStatus === "fetching"}
                className="w-full bg-red-500 text-white rounded-2xl py-4 font-semibold text-base shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "儲存中…" : editingId ? "儲存變更" : "確認新增"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          刪除確認 Modal
      ══════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">確定要刪除此計畫？</h3>
              <p className="text-sm text-muted">
                將刪除 <span className="font-semibold text-gray-800">{deleteTarget.name}（{deleteTarget.symbol}）</span> 的定期定額設定與所有執行紀錄，此操作無法復原。
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm disabled:opacity-60">
                取消
              </button>
              <button onClick={handleDelete} disabled={deleting}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60">
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "刪除中…" : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          執行結果 Modal（底部拉起）
      ══════════════════════════════════════════════════ */}
      {showResults && runResults && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               onClick={() => setShowResults(false)} />
          <div className="relative w-full max-w-md bg-surface rounded-t-3xl px-4 pt-4 pb-10 overflow-y-auto max-h-[85vh]">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">執行結果</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{runDate}</span>
                <button onClick={() => setShowResults(false)}
                        className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {runResults.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">
                <p className="text-2xl mb-2">✅</p>
                <p>目前沒有啟用中的定期定額計畫</p>
              </div>
            ) : (
              <div className="space-y-3">
                {runResults.map((r) => (
                  <div key={r.plan_id}
                       className={`rounded-2xl p-4 ${r.status === "executed" ? "bg-emerald-50" : r.status === "error" || r.status === "no_price" ? "bg-red-50" : "bg-gray-50"}`}>
                    <div className="flex items-start gap-2">
                      <StatusIcon status={r.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          {r.name} <span className="text-muted font-normal text-xs">({r.symbol})</span>
                        </p>
                        <p className="text-xs text-muted mt-0.5">{r.message}</p>
                        {r.execution && (
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div><span className="text-muted">買入股數</span> <span className="font-semibold text-gray-800">{r.execution.shares_bought.toFixed(4)}</span></div>
                            <div><span className="text-muted">買入價格</span> <span className="font-semibold text-gray-800">${r.execution.price.toLocaleString()}</span></div>
                            <div><span className="text-muted">累計股數</span> <span className="font-semibold text-gray-800">{r.execution.new_shares.toFixed(4)}</span></div>
                            <div><span className="text-muted">新均成本</span> <span className="font-semibold text-gray-800">${r.execution.new_avg_cost}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
