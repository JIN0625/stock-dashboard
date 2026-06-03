import { NextRequest, NextResponse } from "next/server";
import { fetchPriceHistory } from "@/lib/finmind";

// GET /api/quotes/history?symbol=2330&days=90
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "90");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const history = await fetchPriceHistory(symbol, days);
  return NextResponse.json(history);
}
