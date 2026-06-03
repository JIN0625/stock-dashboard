import { NextRequest, NextResponse } from "next/server";

// ── GET /api/debug-yahoo?symbol=0056 ─────────────────────────
// 診斷用：確認 Yahoo Finance Taiwan HTML 的實際內容
// 部署後可直接在瀏覽器呼叫查看
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? "0056";
  const url    = `https://tw.stock.yahoo.com/quote/${encodeURIComponent(symbol)}.TW/holding`;

  let status      = 0;
  let contentType = "";
  let htmlLength  = 0;
  let hasNextData = false;
  let htmlPreview = "";
  let error       = "";

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer":         "https://tw.stock.yahoo.com/",
      },
      // 不快取，每次都重新抓
      cache: "no-store",
    });

    status      = res.status;
    contentType = res.headers.get("content-type") ?? "";

    const html  = await res.text();
    htmlLength  = html.length;
    hasNextData = html.includes("__NEXT_DATA__");
    htmlPreview = html.slice(0, 3000);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    symbol,
    url,
    status,
    contentType,
    htmlLength,
    hasNextData,
    htmlPreview,
    error: error || undefined,
  });
}
