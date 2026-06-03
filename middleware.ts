import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── 建立 middleware 用的 Supabase client ─────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
          // 同時更新 request & response cookie（刷新 session 必要）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 取得目前使用者（同時刷新過期的 session token）──────────
  // 注意：不要用 getSession()，要用 getUser() 才能防偽造
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── 已登入 → 不需要再看 /login，導向首頁 ──────────────────
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── 未登入 → 只允許 /login，其餘全部導向 /login ─────────────
  if (!user && pathname !== "/login" && pathname !== "/auth/callback") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname); // 登入後可回原頁
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

// 只對前端路由生效，排除靜態資源與 API
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|api).*)",
  ],
};
