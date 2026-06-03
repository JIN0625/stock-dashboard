import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchStockInfo } from "@/lib/finmind";

// ── Supabase client（server-side）────────────────────────────
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── GET /api/stock-info?symbol=2330 ──────────────────────────
/**
 * 查詢流程：
 *  1. Supabase stock_info_cache  → 命中直接回傳，0 額外費用
 *  2. FinMind TaiwanStockInfo    → Cache miss 才呼叫外部 API
 *  3. 寫入 Supabase 快取          → 下次查相同代號免費命中
 *  4. 404                        → 查無此代號，讓前端改手動輸入
 *
 * 回傳格式：{ symbol, name, type, market }
 */
export async function GET(req: NextRequest) {
  // ── 參數驗證 ────────────────────────────────────────────────
  const raw    = req.nextUrl.searchParams.get("symbol") ?? "";
  const symbol = raw.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      { error: "請提供 symbol 參數" },
      { status: 400 }
    );
  }

  const sb = getSupabase();

  // ── 1. 查 Supabase 快取 ─────────────────────────────────────
  const { data: cached, error: cacheErr } = await sb
    .from("stock_info_cache")
    .select("symbol, name, type, market")
    .eq("symbol", symbol)
    .maybeSingle();

  if (cacheErr) {
    // 快取查詢失敗不中斷流程，繼續往 FinMind 查
    console.warn("[stock-info] cache read error:", cacheErr.message);
  }

  if (cached) {
    // Cache hit
    return NextResponse.json(cached);
  }

  // ── 2. 查 FinMind API ───────────────────────────────────────
  const info = await fetchStockInfo(symbol);

  if (!info) {
    return NextResponse.json(
      { error: `查無股票代號「${symbol}」` },
      { status: 404 }
    );
  }

  // ── 3. 寫入快取（非阻塞，失敗不影響回傳）──────────────────────
  sb.from("stock_info_cache")
    .upsert(
      {
        symbol:     info.symbol,
        name:       info.name,
        type:       info.type,
        market:     info.market,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "symbol" }
    )
    .then(({ error }) => {
      if (error) {
        console.warn("[stock-info] cache write error:", error.message);
      }
    });

  // ── 4. 回傳結果 ─────────────────────────────────────────────
  return NextResponse.json({
    symbol: info.symbol,
    name:   info.name,
    type:   info.type,
    market: info.market,
  });
}
