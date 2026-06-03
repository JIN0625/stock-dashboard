"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase";

// ── Auth Context ──────────────────────────────────────────────
interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

// ── AuthGuard ─────────────────────────────────────────────────
/**
 * 包在 layout 裡，負責：
 * 1. 監聽 Supabase auth 狀態變化
 * 2. 未登入時導向 /login（middleware 已做了伺服器端保護，這裡是客戶端補強）
 * 3. 透過 Context 提供 user 給子元件使用
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    // 1. 初次取得 session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (!user && pathname !== "/login") {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });

    // 2. 監聽登入 / 登出事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser && pathname !== "/login") {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
