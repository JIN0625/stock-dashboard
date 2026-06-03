// ============================================================
// Server-side only
// FINMIND_API_TOKEN 僅存在 .env.local，永遠不會傳到瀏覽器
// ============================================================

const BASE  = "https://api.finmindtrade.com/api/v4/data";
const TOKEN = process.env.FINMIND_API_TOKEN ?? "";

// ── 型別定義 ─────────────────────────────────────────────────

export interface FinMindQuote {
  symbol:     string;
  price:      number;
  change:     number;
  change_pct: number;
  date:       string;
}

export interface StockInfo {
  symbol: string;           // 股票代號，e.g. "2330"
  name:   string;           // 股票名稱，e.g. "台積電"
  type:   "stock" | "etf"; // 個股 or ETF
  market: string;           // "上市" | "上櫃" | "ETF" | ...
}

// ── 工具函式 ─────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── fetchStockInfo ────────────────────────────────────────────
/**
 * 用 FinMind TaiwanStockInfo dataset 查詢股票基本資料（名稱、市場）。
 *
 * FinMind 回傳欄位範例：
 *   stock_id:          "2330"
 *   stock_name:        "台積電"
 *   type:              "股票"  | "ETF" | "上市" | "上市ETF" | "上櫃" | ...
 *   industry_category: "半導體"
 *   market:            "TWSE" | "OTC" | ...
 *
 * 回傳 null 代表查無此代號或 API 失敗，由上層決定是否讓使用者手動輸入。
 */
export async function fetchStockInfo(symbol: string): Promise<StockInfo | null> {
  const params = new URLSearchParams({
    dataset: "TaiwanStockInfo",
    data_id: symbol,
    token:   TOKEN,
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}?${params}`, {
      // 股票名稱幾乎不變，快取 24 小時
      next: { revalidate: 86400 },
    });
  } catch {
    // 網路錯誤
    return null;
  }

  if (!res.ok) return null;

  const json = await res.json();

  // FinMind 回傳格式： { status: 200, data: [...] }
  const records: Array<{
    stock_id:          string;
    stock_name:        string;
    type:              string;
    industry_category?: string;
    market?:           string;
  }> = json.data ?? [];

  if (records.length === 0) return null;

  const r = records[0];

  // 判斷 ETF：FinMind type 欄位可能是 "ETF"、"上市ETF"、"指數股票型基金" 等
  const typeRaw = r.type ?? "";
  const nameRaw = r.stock_name ?? "";
  const isEtf =
    typeRaw.includes("ETF") ||
    typeRaw.includes("指數") ||
    nameRaw.includes("ETF");

  // market 欄位：FinMind 有時給 "TWSE"/"OTC"，有時給中文，統一整理
  const marketRaw = r.market ?? typeRaw;
  let market = marketRaw;
  if (marketRaw === "TWSE" || marketRaw.includes("上市")) market = "上市";
  else if (marketRaw === "OTC"  || marketRaw.includes("上櫃")) market = "上櫃";
  else if (isEtf) market = "ETF";

  return {
    symbol: r.stock_id,
    name:   r.stock_name,
    type:   isEtf ? "etf" : "stock",
    market,
  };
}

// ── fetchLatestQuote ──────────────────────────────────────────
/**
 * 查最近一個交易日的收盤價與漲跌。
 * 往前查 7 個日曆日，確保週末/假日也能拿到最新數據。
 */
export async function fetchLatestQuote(symbol: string): Promise<FinMindQuote | null> {
  const today     = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7);

  const params = new URLSearchParams({
    dataset:    "TaiwanStockPrice",
    data_id:    symbol,
    start_date: toDateStr(startDate),
    end_date:   toDateStr(today),
    token:      TOKEN,
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}?${params}`, { next: { revalidate: 0 } });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const json = await res.json();
  const records: Array<{
    date:     string;
    stock_id: string;
    close:    number;
    spread:   number; // 漲跌（元）
  }> = json.data ?? [];

  if (records.length === 0) return null;

  records.sort((a, b) => b.date.localeCompare(a.date));
  const latest = records[0];
  const prev   = records[1];

  const change      = latest.spread ?? 0;
  const prev_close  = prev ? prev.close : latest.close - change;
  const change_pct  = prev_close !== 0 ? (change / prev_close) * 100 : 0;

  return {
    symbol,
    price: latest.close,
    change,
    change_pct,
    date: latest.date,
  };
}

// ── fetchPriceHistory ─────────────────────────────────────────
/**
 * 查最近 N 天的每日收盤價，供走勢圖使用。
 */
export async function fetchPriceHistory(
  symbol: string,
  days = 90
): Promise<Array<{ date: string; close: number }>> {
  const today     = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const params = new URLSearchParams({
    dataset:    "TaiwanStockPrice",
    data_id:    symbol,
    start_date: toDateStr(startDate),
    end_date:   toDateStr(today),
    token:      TOKEN,
  });

  let res: Response;
  try {
    res = await fetch(`${BASE}?${params}`, { next: { revalidate: 3600 } });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const json = await res.json();
  return (json.data ?? []).map((r: { date: string; close: number }) => ({
    date:  r.date,
    close: r.close,
  }));
}
