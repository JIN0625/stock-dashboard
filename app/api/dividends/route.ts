import { NextRequest, NextResponse } from "next/server";
import { fetchDividendInfo } from "@/lib/finmind";

// GET /api/dividends?symbol=0056
// GET /api/dividends?symbols=0056,2330
export async function GET(req: NextRequest) {
  const symbol  = req.nextUrl.searchParams.get("symbol");
  const symbols = req.nextUrl.searchParams.get("symbols");

  if (symbol) {
    const info = await fetchDividendInfo(symbol);
    return NextResponse.json(info);
  }

  if (symbols) {
    const list = symbols.split(",").map(s => s.trim()).filter(Boolean);
    const results = await Promise.all(list.map(s => fetchDividendInfo(s)));
    const map: Record<string, unknown> = {};
    results.forEach(r => { map[r.symbol] = r; });
    return NextResponse.json(map);
  }

  return NextResponse.json({ error: "symbol or symbols required" }, { status: 400 });
}
