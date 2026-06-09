// ============================================================
// Server-side only — Yahoo Finance quote fetcher
// Used as primary quote source; FinMind is fallback.
// ============================================================

export interface YahooQuote {
  symbol:     string;
  price:      number;
  change:     number;
  change_pct: number;
  date:       string;
  source:     "Yahoo";
  isRealtime: true;
}

/**
 * Taiwan stock symbols contain digits (e.g. "0056", "2330", "00981A").
 * US stock/ETF tickers are all letters (e.g. "VOO", "QQQ", "SCHD").
 * We use the same heuristic as fetchDividendInfo in finmind.ts:
 *   /^[A-Z]{1,6}$/ → US (no suffix), anything else → TW (.TW suffix)
 */
function toYahooSymbol(normalized: string): string {
  return /^[A-Z]{1,6}$/.test(normalized) ? normalized : `${normalized}.TW`;
}

/**
 * Fetch the latest quote for a single symbol from Yahoo Finance.
 * Returns null on any failure so callers can fall back to FinMind.
 */
export async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const normalized = symbol.trim().toUpperCase();
  const yahooSym   = toYahooSymbol(normalized);

  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}` +
      `?interval=1d&range=5d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 }, // always fetch fresh
    });

    if (!res.ok) return null;

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta as Record<string, unknown>;

    const price = typeof meta.regularMarketPrice === "number"
      ? meta.regularMarketPrice
      : null;
    if (!price) return null;

    // previousClose is preferred; fall back to chartPreviousClose
    const prevClose =
      typeof meta.previousClose === "number"        ? meta.previousClose :
      typeof meta.chartPreviousClose === "number"   ? meta.chartPreviousClose :
      null;

    const change     = prevClose !== null ? Math.round((price - prevClose) * 100) / 100 : 0;
    const change_pct = prevClose          ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : 0;

    const ts: number | undefined =
      typeof meta.regularMarketTime === "number" ? meta.regularMarketTime : undefined;
    const date = ts
      ? new Date(ts * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    return { symbol: normalized, price, change, change_pct, date, source: "Yahoo", isRealtime: true };
  } catch {
    return null;
  }
}
