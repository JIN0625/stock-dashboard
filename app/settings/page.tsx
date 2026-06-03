"use client";

import { useState } from "react";
import { ChevronRight, RefreshCw, Database, Wifi, Info } from "lucide-react";

export default function SettingsPage() {
  const [dataSource, setDataSource] = useState<"mock" | "live">("mock");

  return (
    <div className="px-4 pt-12 pb-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">設定</h1>

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
            {dataSource === "mock" && (
              <div className="w-4 h-4 bg-red-500 rounded-full" />
            )}
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
            {dataSource === "live" && (
              <div className="w-4 h-4 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      </section>

      {/* API status */}
      <section>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 px-1">API 狀態</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">FinMind API</span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium">
              未設定
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-700">Supabase</span>
            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full font-medium">
              未設定
            </span>
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
          完成設定後，將各頁面的 <code className="bg-gray-100 px-1 rounded">USE_MOCK = true</code> 改為 <code className="bg-gray-100 px-1 rounded">false</code>
        </p>
      </section>
    </div>
  );
}
