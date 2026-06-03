import { NextRequest, NextResponse } from "next/server";
import type { ConstituentData, TopHolding, WeightItem } from "@/types";

// ════════════════════════════════════════════════════════════
// 基本 helpers
// ════════════════════════════════════════════════════════════

function empty(symbol: string): ConstituentData {
  return {
    symbol,
    source:       "Yahoo股市",
    holdingDate:  "",
    industryDate: "",
    assetDate:    "",
    topHoldings:  [],
    industries:   [],
    assets:       [],
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
  const NAME_KEYS   = ["name", "industry", "sector", "category", "assetName", "label", "type"];
  const WEIGHT_KEYS = ["weight", "percent", "ratio", "value", "percentage"];
  const result: WeightItem[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const nameKey   = NAME_KEYS.find((k)   => typeof o[k] === "string" && (o[k] as string).trim());
    const weightKey = WEIGHT_KEYS.find((k) => o[k] !== undefined && o[k] !== null);
    if (!nameKey || !weightKey) continue;
    const w = Number(o[weightKey]);
    if (isNaN(w) || w <= 0) continue;
    result.push({ name: (o[nameKey] as string).trim(), weight: w });
  }
  return result.sort((a, b) => b.weight - a.weight);
}

// ════════════════════════════════════════════════════════════
// HTML 文字 fallback 解析器
// ════════════════════════════════════════════════════════════

/** 移除 HTML tags、script/style 區塊，解碼常用 HTML entity */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi,  " ")
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

/**
 * 從純文字中擷取某個 section 的名稱+百分比列表。
 *
 * @param text        stripHtml 後的全文
 * @param sectionTitle  要找的標題，例如 "前十大持股"
 * @param stopTitles    遇到這些標題就停止，例如 ["行業比重","資產分佈","資產分布"]
 */
function extractSectionItems(
  text:         string,
  sectionTitle: string,
  stopTitles:   string[],
): WeightItem[] {
  const startIdx = text.indexOf(sectionTitle);
  if (startIdx === -1) return [];

  // 找到下一個 stopTitle 之前的範圍（最多取 3000 字元）
  let endIdx = Math.min(text.length, startIdx + sectionTitle.length + 3000);
  for (const stop of stopTitles) {
    const idx = text.indexOf(stop, startIdx + sectionTitle.length);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  const section = text.slice(startIdx + sectionTitle.length, endIdx);
  const items: WeightItem[] = [];

  /**
   * 匹配模式優先序：
   * A) 名稱 + 空白 + 數字%   e.g. "台積電 8.97%"
   * B) 名稱 + 數字%          e.g. "台積電8.97%"  (無空白)
   *
   * 名稱：2~15 個 中文字 / 英數 / 常見符號（去除純數字）
   * 百分比：1~3 位整數 + 可選小數點
   */
  const RE = /([一-鿿][一-鿿\w（）【】&.-]{0,14})\s{0,4}([\d]{1,3}(?:\.[\d]{1,4}))%/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((m = RE.exec(section)) !== null) {
    const name   = m[1].trim();
    const weight = parseFloat(m[2]);
    if (!name || weight <= 0 || weight > 100) continue;
    if (seen.has(name)) continue; // 去重
    seen.add(name);
    items.push({ name, weight });
  }

  // 依 weight 大到小排序，最多回傳 20 筆
  return items.sort((a, b) => b.weight - a.weight).slice(0, 20);
}

/** 從純文字中找第一個符合 YYYY/MM/DD 或 YYYY-MM-DD 的日期 */
function extractDate(text: string): string {
  const m = text.match(/\d{4}[\/\-]\d{2}[\/\-]\d{2}/);
  return m ? m[0].replace(/-/g, "/") : "";
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
  try { data = JSON.parse(ndMatch[1]); }
  catch { return null; }

  const root      = data as Record<string, unknown>;
  const props     = root.props      as Record<string, unknown> | undefined;
  const pageProps = props?.pageProps as Record<string, unknown> | undefined;
  const quote     = pageProps?.quote as Record<string, unknown> | undefined;
  if (!quote) return null;

  // topHoldings
  const holdingsRaw = pickArr(quote, "holdings", "topHoldings", "holding");
  const topHoldings: TopHolding[] = holdingsRaw
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

  const holdingDate  = pickStr(quote, "holdingsDate","holdingDate","holding_date","date");
  const industryDate = pickStr(quote, "industryDate","industry_date","date");
  const assetDate    = pickStr(quote, "assetDate","asset_date","date");

  if (topHoldings.length === 0 && industries.length === 0 && assets.length === 0) return null;

  return { symbol, source:"Yahoo股市", holdingDate, industryDate, assetDate, topHoldings, industries, assets };
}

// ════════════════════════════════════════════════════════════
// 方法 2：HTML 文字 fallback 解析
// ════════════════════════════════════════════════════════════

function parseFromHtmlText(html: string, symbol: string): ConstituentData {
  const text = stripHtml(html);

  // 前十大持股
  const holdingItems = extractSectionItems(
    text,
    "前十大持股",
    ["行業比重", "行業比例", "產業比重", "資產分佈", "資產分布", "資產配置"],
  );
  const topHoldings: TopHolding[] = holdingItems.map((item, i) => ({
    rank:   i + 1,
    name:   item.name,
    symbol: "",
    weight: item.weight,
  }));

  // 行業比重（多種標題寫法）
  const industries = extractSectionItems(
    text,
    text.includes("行業比重") ? "行業比重"
      : text.includes("行業比例") ? "行業比例"
      : "產業比重",
    ["資產分佈", "資產分布", "資產配置", "前十大"],
  );

  // 資產分佈（多種標題寫法）
  const assets = extractSectionItems(
    text,
    text.includes("資產分佈") ? "資產分佈"
      : text.includes("資產分布") ? "資產分布"
      : "資產配置",
    ["前十大", "行業", "產業"],
  );

  // 日期（從整個 HTML 找第一個日期）
  const date = extractDate(text);

  return {
    symbol,
    source:       "Yahoo股市",
    holdingDate:  date,
    industryDate: date,
    assetDate:    date,
    topHoldings,
    industries,
    assets,
  };
}

// ════════════════════════════════════════════════════════════
// GET /api/constituents?symbol=0056
// ════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json(empty(""), { status: 200 });

  try {
    const url = `https://tw.stock.yahoo.com/quote/${encodeURIComponent(symbol)}.TW/holding`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Referer":         "https://tw.stock.yahoo.com/",
      },
      next: { revalidate: 14400 },
    });

    if (!res.ok) return NextResponse.json(empty(symbol), { status: 200 });

    const html = await res.text();

    // ── 方法 1：__NEXT_DATA__ ───────────────────────────
    const fromNextData = parseFromNextData(html, symbol);
    if (fromNextData) return NextResponse.json(fromNextData);

    // ── 方法 2：HTML 文字 fallback ──────────────────────
    const fromHtml = parseFromHtmlText(html, symbol);
    return NextResponse.json(fromHtml);

  } catch (err) {
    console.warn("[GET /api/constituents]", symbol, err);
    return NextResponse.json(empty(symbol), { status: 200 });
  }
}
