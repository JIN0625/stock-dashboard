"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase";
import { useAuth } from "./AuthGuard";

export default function UserMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router  = useRouter();
  const supabase = createSupabaseBrowser();

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
    );
  }

  if (!user) return null;

  // 取頭像首字（email 或 Google display name）
  const displayName = user.user_metadata?.full_name ?? user.email ?? "U";
  const initial     = displayName.charAt(0).toUpperCase();
  const avatar      = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 active:scale-95 transition-transform"
      >
        {/* 頭像 */}
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-xs font-bold text-red-500">{initial}</span>
          </div>
        )}
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* 下拉選單 */}
      {open && (
        <>
          {/* 點擊遮罩關閉 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
            {/* 使用者資訊 */}
            <div className="px-4 py-3.5 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={displayName} className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <User size={16} className="text-red-400" />
                  </div>
                )}
                <div className="min-w-0">
                  {user.user_metadata?.full_name && (
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.user_metadata.full_name}
                    </p>
                  )}
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* 登出 */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
            >
              {loggingOut
                ? <Loader2 size={15} className="animate-spin" />
                : <LogOut size={15} />
              }
              {loggingOut ? "登出中…" : "登出"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
