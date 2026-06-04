// ============================================================
// Server-side only
// FINMIND_API_TOKEN 僅存在 .env.local / Vercel Env，永遠不會傳到瀏覽器
// ============================================================

const BASE = "https://api.finmindtrade.com/api/v4/data";
const TOKEN = process.env.FINMIND_API_TOKEN ?? "";

export interface FinMindQuote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  date: string;
}

export interface StockInfo {
  symbol: string;
  name: string;
  type: "stock" | "etf";
  market: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function parseQuote(
  symbol: string,
  records: Array<{
    date: string;
    stock_id: string;
    close: number;
    spread?: number;
  }>
): FinMindQuote | null {
  if (!records || records.length === 0) return null;

  records.sort((a, b) => b.date.localeCompare(a.date));

  const latest = records[0];
  const prev = records[1];

  const change =
    typeof latest.spread === "number"
      ? latest.spread
      : prev
        ? latest.close - prev.close
        : 0;

  const prevClose = prev ? prev.close : latest.close - change;
  const change_pct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    price: latest.close,
    change,
    change_pct,
    date: latest.date,
  };
}

async function fetchQuoteFromDataset(
  dataset: string,
  symbol: string,
  days = 14
): Promise<FinMindQuote | null> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const params = new URLSearchParams({
    dataset,
    data_id: symbol,
    start_date: toDateStr(startDate),
    end_date: toDateStr(today),
    token: TOKEN,
  });

  try {
    const res = await fetch(`${BASE}?${params}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;

    const json = await res.json();

    const records: Array<{
      date: string;
      stock_id: string;
      close: number;
      spread?: number;
    }> = json.data ?? [];

    return parseQuote(symbol, records);
  } catch {
    return null;
  }
}

async function fetchHistoryFromDataset(
  dataset: string,
  symbol: string,
  days = 90
): Promise<Array<{ date: string; close: number }>> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const params = new URLSearchParams({
    dataset,
    data_id: symbol,
    start_date: toDateStr(startDate),
    end_date: toDateStr(today),
    token: TOKEN,
  });

  try {
    const res = await fetch(`${BASE}?${params}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const json = await res.json();

    return (json.data ?? []).map((r: { date: string; close: number }) => ({
      date: r.date,
      close: r.close,
    }));
  } catch {
    return [];
  }
}

// ── 股票 / ETF 基本資料 ────────────────────────────────

export async function fetchStockInfo(symbol: string): Promise<StockInfo | null> {
  const normalized = normalizeSymbol(symbol);

  const params = new URLSearchParams({
    dataset: "TaiwanStockInfo",
    data_id: normalized,
    token: TOKEN,
  });

  try {
    const res = await fetch(`${BASE}?${params}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const json = await res.json();

    const records: Array<{
      stock_id: string;
      stock_name: string;
      type: string;
      industry_category?: string;
      market?: string;
    }> = json.data ?? [];

    if (records.length === 0) return null;

    const r = records[0];

    const typeRaw = r.type ?? "";
    const nameRaw = r.stock_name ?? "";

    const isEtf =
      typeRaw.includes("ETF") ||
      typeRaw.includes("指數") ||
      typeRaw.includes("基金") ||
      nameRaw.includes("ETF") ||
      /^[0-9]{4}[A-Z]?$/.test(r.stock_id) && nameRaw.includes("股息");

    const marketRaw = r.market ?? typeRaw;

    let market = marketRaw;
    if (marketRaw === "TWSE" || marketRaw.includes("上市")) market = "上市";
    else if (marketRaw === "OTC" || marketRaw.includes("上櫃")) market = "上櫃";
    else if (isEtf) market = "ETF";

    return {
      symbol: r.stock_id,
      name: r.stock_name,
      type: isEtf ? "etf" : "stock",
      market,
    };
  } catch {
    return null;
  }
}

// ── 最新報價 ────────────────────────────────

export async function fetchLatestQuote(symbol: string): Promise<FinMindQuote | null> {
  const normalized = normalizeSymbol(symbol);

  // 1. 先查一般台股
  const stockQuote = await fetchQuoteFromDataset(
    "TaiwanStockPrice",
    normalized
  );

  if (stockQuote) return stockQuote;

  // 2. 查不到再查 ETF
  const etfQuote = await fetchQuoteFromDataset(
    "TaiwanETFPrice",
    normalized
  );

  if (etfQuote) return etfQuote;

  // 3. 仍查不到才回 null
  return null;
}

// ── 配息資料 ────────────────────────────────

export interface DividendInfo {
  symbol:         string;
  exDividendDate: string | null;
  paymentDate:    string | null;
  cashDividend:   number;
  stockDividend:  number;
  dividendYield:  number | null;
  source:         string;
}

type RawDivRecord = Record<string, unknown>;

function getExDate(r: RawDivRecord): string {
  return String(r.ex_right_trading_day ?? r.ex_dividend_date ?? r.ExRightTradingDate ?? "");
}
function getPayDate(r: RawDivRecord): string {
  return String(r.cash_dividend_pay_date ?? r.payment_date ?? r.CashDividendPaymentDate ?? "");
}
function getCashDiv(r: RawDivRecord): number {
  return Number(r.cash_dividend ?? r.CashDividend ?? 0);
}
function getStockDiv(r: RawDivRecord): number {
  return Number(r.stock_dividend ?? r.StockDividend ?? 0);
}

export async function fetchAllDividends(symbol: string): Promise<DividendInfo[]> {
  const normalized = normalizeSymbol(symbol);
  const today = new Date();
  const twoYearsAgo = new Date(today);
  twoYearsAgo.setFullYear(today.getFullYear() - 2);

  const params = new URLSearchParams({
    dataset:    "TaiwanStockDividend",
    data_id:    normalized,
    start_date: toDateStr(twoYearsAgo),
    token:      TOKEN,
  });

  try {
    const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    const records: RawDivRecord[] = json.data ?? [];

    return records
      .filter(r => getExDate(r))
      .map(r => ({
        symbol:         normalized,
        exDividendDate: getExDate(r) || null,
        paymentDate:    getPayDate(r) || null,
        cashDividend:   getCashDiv(r),
        stockDividend:  getStockDiv(r),
        dividendYield:  null,
        source:         "FinMind",
      }));
  } catch {
    return [];
  }
}

export async function fetchDividendInfo(symbol: string): Promise<DividendInfo> {
  const normalized = normalizeSymbol(symbol);
  const todayStr = toDateStr(new Date());
  const empty: DividendInfo = {
    symbol: normalized,
    exDividendDate: null,
    paymentDate:    null,
    cashDividend:   0,
    stockDividend:  0,
    dividendYield:  null,
    source:         "FinMind",
  };

  const all = await fetchAllDividends(symbol);
  if (all.length === 0) return empty;

  const upcoming = all
    .filter(d => d.exDividendDate && d.exDividendDate >= todayStr)
    .sort((a, b) => (a.exDividendDate ?? "").localeCompare(b.exDividendDate ?? ""));

  const past = all
    .filter(d => d.exDividendDate && d.exDividendDate < todayStr)
    .sort((a, b) => (b.exDividendDate ?? "").localeCompare(a.exDividendDate ?? ""));

  return upcoming[0] ?? past[0] ?? empty;
}

// ── 歷史價格 ────────────────────────────────

export async function fetchPriceHistory(
  symbol: string,
  days = 90
): Promise<Array<{ date: string; close: number }>> {
  const normalized = normalizeSymbol(symbol);

  const stockHistory = await fetchHistoryFromDataset(
    "TaiwanStockPrice",
    normalized,
    days
  );

  if (stockHistory.length > 0) return stockHistory;

  const etfHistory = await fetchHistoryFromDataset(
    "TaiwanETFPrice",
    normalized,
    days
  );

  return etfHistory;
}