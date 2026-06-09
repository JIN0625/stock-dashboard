import { NextRequest, NextResponse } from "next/server";
import { fetchYahooQuote } from "@/lib/yahoo";
import { fetchLatestQuote } from "@/lib/finmind";

// GET /api/quotes?symbols=2330,0050,2317,VOO
// Priority: Yahoo Finance (isRealtime=true) → FinMind fallback (isRealtime=false)
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({ error: "symbols required" }, { status: 400 });

  const list = symbols.split(",").map((s) => s.trim()).filter(Boolean);

  const results = await Promise.allSettled(
    list.map(async (sym) => {
      // 1. Try Yahoo Finance first (real-time / delayed 15 min)
      const yahooQuote = await fetchYahooQuote(sym);
      if (yahooQuote) return yahooQuote;

      // 2. Fallback to FinMind (most recent trading day close)
      const finmindQuote = await fetchLatestQuote(sym);
      if (finmindQuote) {
        return { ...finmindQuote, source: "FinMind" as const, isRealtime: false };
      }

      return null;
    })
  );

  const quotes: Record<string, object | null> = {};
  list.forEach((sym, i) => {
    const r = results[i];
    quotes[sym] = r.status === "fulfilled" ? r.value : null;
  });

  return NextResponse.json(quotes);
}
