import { NextRequest, NextResponse } from "next/server";
import type { ConstituentData, TopHolding, WeightItem } from "@/types";

// ════════════════════════════════════════════════════════════
// helpers
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

/**
 * 從 quote 物件裡取第一個存在的字串欄位
 */
function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * 從 quote 物件裡取第一個非空 array 欄位
 */
function pickArr(obj: Record<string, unknown>, ...keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

/**
 * 把任意陣列正規化成 WeightItem[]
 * - name  : name / industry / sector / category / assetName / label / type
 * - weight: weight / percent / ratio / value / percentage
 * 過濾 weight <= 0，依 weight 大到小排序
 */
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

    result.push({
      name:   (o[nameKey] as string).trim(),
      weight: w,
    });
  }

  return result.sort((a, b) => b.weight - a.weight);
}

// ════════════════════════════════════════════════════════════
// GET /api/constituents?symbol=0056
// ════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json(empty(""), { status: 200 });

  const base = empty(symbol);

  try {
    // ── 1. Fetch Yahoo Finance Taiwan ETF holding 頁 ─────
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
      next: { revalidate: 14400 }, // cache 4 小時
    });

    if (!res.ok) return NextResponse.json(base, { status: 200 });

    const html = await res.text();

    // ── 2. 取出 <script id="__NEXT_DATA__"> ─────────────
    const ndMatch = html.match(
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]+?)<\/script>/
    );
    if (!ndMatch) return NextResponse.json(base, { status: 200 });

    // ── 3. JSON.parse ───────────────────────────────────
    let data: unknown;
    try {
      data = JSON.parse(ndMatch[1]);
    } catch {
      return NextResponse.json(base, { status: 200 });
    }

    // ── 4. 讀取 props.pageProps.quote ───────────────────
    const root      = data as Record<string, unknown>;
    const props     = root.props      as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    const quote     = pageProps?.quote as Record<string, unknown> | undefined;

    if (!quote) return NextResponse.json(base, { status: 200 });

    // ── 5. 解析 topHoldings（quote.holdings）────────────
    const holdingsRaw = pickArr(quote, "holdings", "topHoldings", "holding");

    const topHoldings: TopHolding[] = holdingsRaw
      .filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
      )
      .map((item, i) => ({
        rank:   i + 1,
        name:   typeof item.name   === "string" ? item.name.trim() : String(item.name ?? ""),
        symbol: typeof item.symbol === "string" ? item.symbol.trim() : "",
        weight: Number(item.weight ?? item.percent ?? 0),
      }))
      .filter((h) => h.name && h.weight > 0);

    // ── 6. 解析 industries ───────────────────────────────
    const industriesRaw = pickArr(
      quote,
      "industryRatios", "industries", "industryRatio",
      "sectors", "sectorRatios", "sectorWeightings",
    );
    const industries = normalizeWeightItems(industriesRaw);

    // ── 7. 解析 assets ────────────────────────────────────
    const assetsRaw = pickArr(
      quote,
      "assetRatios", "assets", "assetAllocation",
      "assetRatio", "assetDistribution",
    );
    const assets = normalizeWeightItems(assetsRaw);

    // ── 8. 日期 ───────────────────────────────────────────
    const holdingDate  = pickStr(quote, "holdingsDate", "holdingDate", "holding_date", "date");
    const industryDate = pickStr(quote, "industryDate", "industry_date", "date");
    const assetDate    = pickStr(quote, "assetDate",    "asset_date",    "date");

    // ── 9. 回傳（topHoldings 若有資料就回傳，不因部分缺失而整個空掉）
    return NextResponse.json({
      symbol,
      source:       "Yahoo股市",
      holdingDate:  holdingDate  || "",
      industryDate: industryDate || "",
      assetDate:    assetDate    || "",
      topHoldings,
      industries,
      assets,
    } satisfies ConstituentData);

  } catch (err) {
    // 任何未預期的錯誤都不 500
    console.warn("[GET /api/constituents]", symbol, err);
    return NextResponse.json(base, { status: 200 });
  }
}
