import { createBrowserClient } from "@supabase/ssr";

/**
 * 瀏覽器端 Supabase client（Client Components 使用）
 * 每次呼叫回傳同一個 singleton，不會重複建立。
 */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
