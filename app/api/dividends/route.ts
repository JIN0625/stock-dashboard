import { NextRequest, NextResponse } from "next/server";
import { fetchDividendInfo } from "@/lib/finmind";
import { createSupabaseServer } from "@/lib/supabaseServer";

// GET /api/dividends                  → user's holdings, upcoming 90-day dividends (auth required)
// GET /api/dividends?symbol=0056      → single symbol
// GET /api/dividends?symbols=0056,2330 → batch
export async function GET(req: NextRequest) {
  const symbol  = req.nextUrl.searchParams.get("symbol");
  const symbols = req.nextUrl.searchParams.get("symbols");

  if (symbol) {
    const info = await fetchDividendInfo(symbol);
    return NextResponse.json(info);
  }

  if (symbols) {
    const list    = symbols.split(",").map(s => s.trim()).filter(Boolean);
    const results = await Promise.all(list.map(s => fetchDividendInfo(s)));
    const map: Record<string, unknown> = {};
    results.forEach(r => { map[r.symbol] = r; });
    return NextResponse.json(map);
  }

  // No params → return user's upcoming 90-day dividends
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: holdings } = await sb
    .from("holdings")
    .select("symbol, name")
    .eq("user_id", user.id);

  if (!holdings || holdings.length === 0) return NextResponse.json([]);

  const today   = new Date();
  const cutoff  = new Date(today);
  cutoff.setDate(today.getDate() + 90);
  const todayStr  = today.toISOString().slice(0, 10);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const infos = await Promise.all(
    holdings.map(async h => {
      const div = await fetchDividendInfo(h.symbol);
      return { ...div, name: h.name };
    })
  );

  const upcoming = infos
    .filter(d => d.exDividendDate && d.exDividendDate >= todayStr && d.exDividendDate <= cutoffStr)
    .sort((a, b) => (a.exDividendDate ?? "").localeCompare(b.exDividendDate ?? ""));

  return NextResponse.json(upcoming);
}
