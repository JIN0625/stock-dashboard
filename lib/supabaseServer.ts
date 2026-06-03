import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/**
 * 伺服器端 Supabase client（API Routes、Server Components 使用）
 *
 * 透過 Cookie 取得使用者 session，讓 RLS 正確套用。
 * 必須在 async 函式內呼叫（因為 cookies() 是 async）。
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 無法設定 cookie，忽略即可
          }
        },
      } satisfies CookieMethodsServer,
    }
  );
}
