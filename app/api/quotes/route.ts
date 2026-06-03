import { NextRequest, NextResponse } from "next/server";
import { fetchLatestQuote } from "@/lib/finmind";

// GET /api/quotes?symbols=2330,0050,2317
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({ error: "symbols required" }, { status: 400 });

  const list = symbols.split(",").map((s) => s.trim()).filter(Boolean);

  const results = await Promise.allSettled(list.map((sym) => fetchLatestQuote(sym)));

  const quotes: Record<string, object | null> = {};
  list.forEach((sym, i) => {
    const r = results[i];
    quotes[sym] = r.status === "fulfilled" ? r.value : null;
  });

  return NextResponse.json(quotes);
}
