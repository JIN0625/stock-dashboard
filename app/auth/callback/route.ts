import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

/**
 * Google OAuth / Magic Link 回調處理
 * Supabase 會把 code 帶到這個 URL，這裡負責交換成 session
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 確保 next 是相對路徑，防止 open redirect
      const safeNext = next.startsWith("/") ? next : "/";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // 發生錯誤時導向登入頁
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
