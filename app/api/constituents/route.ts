import { NextRequest, NextResponse } from "next/server";

const BASE  = "https://api.finmindtrade.com/api/v4/data";
const TOKEN = process.env.FINMIND_API_TOKEN ?? "";

// ── GET /api/constituents?symbol=0050 ────────────────────────
// 嘗試從 FinMind 取得 ETF 成分股；查不到回傳空陣列，不讓頁面壞掉
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json([], { status: 200 });

  try {
    const params = new URLSearchParams({
      dataset: "TaiwanETFHolding",
      data_id: symbol,
      token:   TOKEN,
    });

    const res = await fetch(`${BASE}?${params}`, {
      next: { revalidate: 86400 }, // 24hr cache
    });

    if (!res.ok) return NextResponse.json([], { status: 200 });

    const json = await res.json();
    const records: Array<{
      date:        string;
      stock_id:    string;
      stock_name:  string;
      percentage:  number;
      hold_stock:  number;
    }> = json.data ?? [];

    if (records.length === 0) return NextResponse.json([], { status: 200 });

    // 取最新日期的成分股
    records.sort((a, b) => b.date.localeCompare(a.date));
    const latestDate = records[0].date;
    const latest = records
      .filter((r) => r.date === latestDate)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 30) // 最多 30 檔
      .map((r) => ({
        symbol:     r.stock_id,
        name:       r.stock_name,
        percentage: r.percentage,
        shares:     r.hold_stock,
        date:       r.date,
      }));

    return NextResponse.json(latest);
  } catch {
    // 任何錯誤都回傳空陣列，不讓頁面壞掉
    return NextResponse.json([], { status: 200 });
  }
}
