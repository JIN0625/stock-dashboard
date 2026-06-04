import { NextRequest, NextResponse } from "next/server";
import type { ConstituentData, TopHolding, WeightItem } from "@/types";

// ════════════════════════════════════════════════════════════
// 基本 helpers
// ════════════════════════════════════════════════════════════

function empty(symbol: string): ConstituentData {
  return {
    symbol,
    source:            "Yahoo股市",
    holdingDate:       "",
    industryDate:      "",
    assetDate:         "",
    topHoldings:       [],
    industries:        [],
    assets:            [],
    topHoldingsWeight: 0,
    otherWeight:       0,
  };
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickArr(obj: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

function normalizeWeightItems(arr: unknown[]): WeightItem[] {
  const NAME_KEYS   = ["name","industry","sector","category","assetName","label","type"];
  const WEIGHT_KEYS = ["weight","percent","ratio","value","percentage"];
  const result: WeightItem[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const nk = NAME_KEYS.find((k)   => typeof o[k] === "string" && (o[k] as string).trim());
    const wk = WEIGHT_KEYS.find((k) => o[k] !== undefined && o[k] !== null);
    if (!nk || !wk) continue;
    const w = Number(o[wk]);
    if (isNaN(w) || w <= 0) continue;
    result.push({ name: (o[nk] as string).trim(), weight: w });
  }
  return result.sort((a, b) => b.weight - a.weight);
}

// ════════════════════════════════════════════════════════════
// URL 策略：台股 → 先試 .TW，再試裸代號；美股反之
// ════════════════════════════════════════════════════════════

function buildUrls(symbol: string): string[] {
  const base  = "https://tw.stock.yahoo.com/quote";
  const tw    = `${base}/${encodeURIComponent(symbol)}.TW/holding`;
  const bare  = `${base}/${encodeURIComponent(symbol)}/holding`;
  // 以數字開頭 → 台股
  return /^\d/.test(symbol) ? [tw, bare] : [bare, tw];
}

async function fetchHtml(symbol: string): Promise<string | null> {
  const urls = buildUrls(symbol);
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
          "Referer":         "https://tw.stock.yahoo.com/",
        },
        next: { revalidate: 14400 }, // 4 小時
      });
      if (!res.ok) continue;
      const html = await res.text();
      // 確認有實質 ETF 資料才算成功（頁面有 holding/percentage 關鍵字）
      if (html.length > 5000) return html;
    } catch { /* try next url */ }
  }
  return null;
}

// ════════════════════════════════════════════════════════════
// 計算 topHoldingsWeight / otherWeight，並補 Other 條目
// ════════════════════════════════════════════════════════════

function applyOther(topHoldings: TopHolding[]): {
  topHoldings:       TopHolding[];
  topHoldingsWeight: number;
  otherWeight:       number;
} {
  // 只保留前 10（Other 還沒加進來）
  const top10 = topHoldings.slice(0, 10);
  const sum   = top10.reduce((s, h) => s + h.weight, 0);
  const topHoldingsWeight = Math.round(sum * 100) / 100;
  const otherWeight       = Math.max(0, Math.round((100 - topHoldingsWeight) * 100) / 100);

  // topHoldings 為空時不補 Other，避免顯示 "Other 100%"
  if (top10.length > 0 && otherWeight > 0.01) {
    top10.push({ rank: 11, name: "Other", symbol: "", weight: otherWeight });
  }
  return { topHoldings: top10, topHoldingsWeight, otherWeight };
}

// ════════════════════════════════════════════════════════════
// 方法 1：__NEXT_DATA__ 解析
// ════════════════════════════════════════════════════════════

function parseFromNextData(html: string, symbol: string): ConstituentData | null {
  const ndMatch = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]+?)<\/script>/
  );
  if (!ndMatch) return null;
  let data: unknown;
  try { data = JSON.parse(ndMatch[1]); } catch { return null; }

  const root      = data as Record<string, unknown>;
  const props     = root.props      as Record<string, unknown> | undefined;
  const pageProps = props?.pageProps as Record<string, unknown> | undefined;
  const quote     = pageProps?.quote as Record<string, unknown> | undefined;
  if (!quote) return null;

  const rawHoldings = pickArr(quote, "holdings","topHoldings","holding");
  const rawTop: TopHolding[] = rawHoldings
    .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
    .map((item, i) => ({
      rank:   i + 1,
      name:   String(item.name   ?? "").trim(),
      symbol: String(item.symbol ?? "").trim(),
      weight: Number(item.weight ?? item.percent ?? 0),
    }))
    .filter((h) => h.name && h.weight > 0);

  const industries = normalizeWeightItems(
    pickArr(quote, "industryRatios","industries","industryRatio","sectors","sectorRatios","sectorWeightings")
  );
  const assets = normalizeWeightItems(
    pickArr(quote, "assetRatios","assets","assetAllocation","assetRatio","assetDistribution")
  );

  if (rawTop.length === 0 && industries.length === 0 && assets.length === 0) return null;

  const { topHoldings, topHoldingsWeight, otherWeight } = applyOther(rawTop);

  return {
    symbol,
    source:       "Yahoo股市",
    holdingDate:  pickStr(quote,"holdingsDate","holdingDate","holding_date","date"),
    industryDate: pickStr(quote,"industryDate","industry_date","date"),
    assetDate:    pickStr(quote,"assetDate","asset_date","date"),
    topHoldings,
    industries,
    assets,
    topHoldingsWeight,
    otherWeight,
  };
}

// ════════════════════════════════════════════════════════════
// 方法 2：HTML 文字 fallback 解析（NoJS 頁面）
// ════════════════════════════════════════════════════════════

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi,   " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g,  " ")
    .replace(/&amp;/g,   "&")
    .replace(/&lt;/g,    "<")
    .replace(/&gt;/g,    ">")
    .replace(/&quot;/g,  '"')
    .replace(/&#x27;/g,  "'")
    .replace(/\s+/g,     " ")
    .trim();
}

// 在「前十大持股」區塊中應排除的非持股名稱（資產類別 / 地理區域 / 產業等）
const HOLDING_SECTION_EXCLUDES = new Set([
  // 資產類別
  "股票","現金","債券","其他","其他持股","其他產業","其他地區",
  "OTHER","CASH","BONDS","EQUITY","FIXED INCOME",
  "Fixed Income","Cash & Equivalents","Cash and Equivalents",
  // 地理區域
  "北美","南美","歐洲","亞太","非洲","中東",
  "NORTH AMERICA","SOUTH AMERICA","EUROPE","ASIA PACIFIC",
  "North America","South America","Europe","Asia Pacific",
  "Latin America","LATIN AMERICA","Middle East","MIDDLE EAST",
  // 常見產業詞（不太可能是公司名）
  "科技","金融","能源","醫療","工業","材料","通訊",
  "Technology","Financials","Health Care","Energy",
  "Materials","Utilities","Industrials","Communication",
  "TECHNOLOGY","FINANCIALS","HEALTH CARE","ENERGY",
  "MATERIALS","UTILITIES","INDUSTRIALS","COMMUNICATION",
]);

function extractSectionItems(
  text:         string,
  sectionTitle: string,
  stopTitles:   string[],
  filterFn?:    (name: string) => boolean,
): WeightItem[] {
  const startIdx = text.indexOf(sectionTitle);
  if (startIdx === -1) return [];

  let endIdx = Math.min(text.length, startIdx + sectionTitle.length + 4000);
  for (const stop of stopTitles) {
    const idx = text.indexOf(stop, startIdx + sectionTitle.length);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  const section = text.slice(startIdx + sectionTitle.length, endIdx);
  const items:   WeightItem[] = [];

  /**
   * 支援中英文持股名稱格式：
   *   台積電 8.97%
   *   NVIDIA CORP 10.38%
   *   KLA-TENCOR CORP 3.53%
   *   ADVANCED MICRO DEVICES 5.44%
   *
   * 規則：
   * - 首字必須是字母（中英文），不能是數字，避免誤抓日期或代號
   * - 名稱允許空格、.、,、-、&、()、/ 等常見符號
   * - 懶惰量詞 {1,60}? 搭配後方 \s{0,6}\d+% 確保名稱不吞掉數字
   */
  const RE = /([A-Za-z一-鿿][A-Za-z0-9一-鿿\s.,&()／\-]{1,60}?)\s{0,6}(\d{1,3}(?:\.\d{1,4})?)%/g;

  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = RE.exec(section)) !== null) {
    // 清除名稱尾部多餘空白
    const name = m[1].replace(/\s+$/, "").trim();
    const w    = parseFloat(m[2]);

    if (!name || w <= 0 || w > 100 || seen.has(name)) continue;
    // 外部過濾函式（例如持股區塊的排除清單）
    if (filterFn && !filterFn(name)) continue;

    seen.add(name);
    items.push({ name, weight: w });
  }

  return items.sort((a, b) => b.weight - a.weight).slice(0, 20);
}

function extractDate(text: string): string {
  const m = text.match(/\d{4}[\/\-]\d{2}[\/\-]\d{2}/);
  return m ? m[0].replace(/-/g, "/") : "";
}

function parseFromHtmlText(html: string, symbol: string): ConstituentData {
  const text = stripHtml(html);

  // 前十大持股：傳入過濾函式，排除資產/地區/產業類名稱
  const holdingItems = extractSectionItems(
    text,
    "前十大持股",
    [
      "行業比重","行業比例","產業比重",
      "資產分佈","資產分布","資產配置",
      "績效表現","相關ETF","相關 ETF",
    ],
    (name) => {
      // 1. 太短的詞跳過（單一中文字或 1-2 個英文字母）
      if (name.length < 3) return false;
      // 2. 在排除清單中
      if (HOLDING_SECTION_EXCLUDES.has(name.trim())) return false;
      // 3. 純數字或日期格式
      if (/^\d+$/.test(name)) return false;
      if (/^\d{4}[\/\-]/.test(name)) return false;
      return true;
    },
  );
  // 前十大取前 10
  const rawTop: TopHolding[] = holdingItems.slice(0, 10).map((item, i) => ({
    rank: i + 1, name: item.name, symbol: "", weight: item.weight,
  }));

  // 行業比重
  const industries = extractSectionItems(
    text,
    text.includes("行業比重") ? "行業比重"
      : text.includes("行業比例") ? "行業比例"
      : "產業比重",
    ["資產分佈","資產分布","資產配置","前十大","績效表現","相關ETF"],
  );

  // 資產分佈
  const assets = extractSectionItems(
    text,
    text.includes("資產分佈") ? "資產分佈"
      : text.includes("資產分布") ? "資產分布"
      : "資產配置",
    ["前十大","行業","產業","績效表現","相關ETF"],
  );

  const date = extractDate(text);
  const { topHoldings, topHoldingsWeight, otherWeight } = applyOther(rawTop);

  return {
    symbol,
    source:       "Yahoo股市",
    holdingDate:  date,
    industryDate: date,
    assetDate:    date,
    topHoldings,
    industries,
    assets,
    topHoldingsWeight,
    otherWeight,
  };
}

// ════════════════════════════════════════════════════════════
// GET /api/constituents?symbol=0056 or VOO
// ════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json(empty(""), { status: 200 });

  try {
    const html = await fetchHtml(symbol);
    if (!html) return NextResponse.json(empty(symbol), { status: 200 });

    // 方法 1: __NEXT_DATA__
    const fromNextData = parseFromNextData(html, symbol);
    if (fromNextData) return NextResponse.json(fromNextData);

    // 方法 2: HTML 文字 fallback
    const fromHtml = parseFromHtmlText(html, symbol);
    return NextResponse.json(fromHtml);

  } catch (err) {
    console.warn("[GET /api/constituents]", symbol, err);
    return NextResponse.json(empty(symbol), { status: 200 });
  }
}
