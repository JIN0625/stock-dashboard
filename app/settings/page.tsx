"use client";

import { useEffect, useState } from "react";
import { Database, Wifi, Info, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [dataSource, setDataSource] = useState<"mock" | "live">("mock");

  // Dividend reinvest setting
  const [reinvestEnabled, setReinvestEnabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving]   = useState(false);

  useEffect(() => {
    fetch("/api/user-settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setReinvestEnabled(d.dividend_reinvest_enabled ?? false);
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  }, []);

  async function toggleReinvest(val: boolean) {
    setReinvestEnabled(val);
    setSettingsSaving(true);
    try {
      await fetch("/api/user-settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ dividend_reinvest_enabled: val }),
      });
    } catch { /* ignore */ } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">設定</h1>

      {/* Dividend settings */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">配息設定</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-800">股息自動再投入</p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                開啟後，執行「檢查配息入帳」時，發放日已到的配息會自動以當前股價買入該股票並更新持股成本。
              </p>
            </div>
            {settingsLoading ? (
              <div className="w-12 h-6 bg-gray-100 rounded-full animate-pulse shrink-0" />
            ) : (
              <button
                onClick={() => toggleReinvest(!reinvestEnabled)}
                disabled={settingsSaving}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                  reinvestEnabled ? "bg-red-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    reinvestEnabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            )}
          </div>
          <div className="px-4 pb-3 pt-0">
            <div className={`text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${
              reinvestEnabled
                ? "bg-red-50 text-red-600"
                : "bg-gray-100 text-gray-500"
            }`}>
              {reinvestEnabled ? (
                <><span className="font-semibold">自動再投入</span> — 配息以當前股價買回股票</>
              ) : (
                <><span className="font-semibold">只記錄現金</span> — 配息寫入紀錄，不更新持股</>
              )}
              {settingsSaving && <RefreshCw size={11} className="animate-spin ml-1" />}
            </div>
          </div>
        </div>
      </section>

      {/* Data source */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">資料來源</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setDataSource("mock")}
            className="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Database size={15} className="text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">模擬資料</p>
                <p className="text-xs text-muted">使用假資料預覽 UI</p>
              </div>
            </div>
            {dataSource === "mock" && <div className="w-4 h-4 bg-red-500 rounded-full" />}
          </button>
          <button
            onClick={() => setDataSource("live")}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                <Wifi size={15} className="text-green-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">即時報價</p>
                <p className="text-xs text-muted">連接 FinMind API + Supabase</p>
              </div>
            </div>
            {dataSource === "live" && <div className="w-4 h-4 bg-red-500 rounded-full" />}
          </button>
        </div>
      </section>

      {/* API status */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">API 狀態</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <span className="text-sm text-gray-700">FinMind API</span>
            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium">未設定</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-700">Supabase</span>
            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium">未設定</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">關於</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <Info size={15} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">版本</p>
              <p className="text-xs text-muted">v0.1.0 · 個人損益追蹤</p>
            </div>
          </div>
          <div className="px-4 py-3.5">
            <p className="text-xs text-muted leading-relaxed">
              僅供查詢持股損益，不含任何交易功能。<br />
              台股習慣：上漲紅色 / 下跌綠色。
            </p>
          </div>
        </div>
      </section>

      {/* Setup instructions */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">設定說明</p>
        <div className="bg-gray-800 rounded-2xl p-4 text-xs font-mono text-green-300 space-y-1 leading-relaxed">
          <p className="text-gray-400"># .env.local</p>
          <p>NEXT_PUBLIC_SUPABASE_URL=...</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
          <p>FINMIND_API_TOKEN=...</p>
        </div>
        <p className="text-xs text-muted mt-2 px-1">
          完成設定後，將各頁面的 <code className="bg-gray-100 px-1 rounded">USE_MOCK = true</code> 改為{" "}
          <code className="bg-gray-100 px-1 rounded">false</code>
        </p>
      </section>
    </div>
  );
}
