import { NextRequest, NextResponse } from "next/server";
import type { ConstituentData, TopHolding, WeightItem } from "@/types";

// ── 安全回傳空資料的預設值 ────────────────────────────────────
function empty(symbol: string): ConstituentData {
  return {
    symbol,
    source:      "Yahoo股市",
    holdingDate: "",
    industryDate:"",
    assetDate:   "",
    topHoldings: [],
    industries:  [],
    assets:      [],
  };
}

// ── 遞迴深搜：找第一個讓 predicate 傳非 null 的值 ─────────────
function deepFind<T>(
  obj: unknown,
  predicate: (v: unknown) => T | null,
  maxDepth = 10,
  depth = 0
): T | null {
  if (depth > maxDepth || obj === null || obj === undefined) return null;
  const hit = predicate(obj);
  if (hit !== null) return hit;
  if (typeof obj !== "object") return null;
  for (const val of Object.values(obj as Record<string, unknown>)) {
    const r = deepFind(val, predicate, maxDepth, depth + 1);
    if (r !== null) return r;
  }
  return null;
}

// ── 判斷一個值是否為「持股陣列」─────────────────────────────
// Yahoo Finance Taiwan 的 __NEXT_DATA__ 可能有多種 key 命名方式，
// 共通特徵：array of objects，每個 object 有 name-like 和 weight-like 欄位
function asHoldingArray(val: unknown): TopHolding[] | null {
  if (!Array.isArray(val) || val.length < 3 || val.length > 50) return null;
  const first = val[0];
  if (typeof first !== "object" || first === null) return null;

  const keys = Object.keys(first as object);
  const nameKey = keys.find((k) =>
    /^(name|stock_name|holdingName|stockName|etf_name|label|title)$/i.test(k)
  );
  const weightKey = keys.find((k) =>
    /^(percent|weight|holdingPercent|percentage|ratio|value|占比|比重)$/i.test(k)
  );
  if (!nameKey || !weightKey) return null;

  const result: TopHolding[] = (val as Record<string, unknown>[])
    .map((item, i) => ({
      rank:   i + 1,
      name:   String(item[nameKey] ?? "").trim(),
      weight: parseFloat(String(item[weightKey] ?? "0")) || 0,
    }))
    .filter((h) => h.name && h.weight > 0);

  return result.length >= 3 ? result : null;
}

// ── 判斷是否為行業 / 資產陣列 ──────────────────────────────
// 相同結構，但通常有 type / sector / category 之類的 key
function asWeightArray(val: unknown): WeightItem[] | null {
  if (!Array.isArray(val) || val.length < 2 || val.length > 40) return null;
  const first = val[0];
  if (typeof first !== "object" || first === null) return null;

  const keys = Object.keys(first as object);
  const nameKey = keys.find((k) =>
    /^(type|sector|category|name|label|industry|asset|行業|類型|資產)$/i.test(k)
  );
  const weightKey = keys.find((k) =>
    /^(percent|weight|percentage|ratio|value|占比|比重)$/i.test(k)
  );
  if (!nameKey || !weightKey) return null;

  const result: WeightItem[] = (val as Record<string, unknown>[])
    .map((item) => ({
      name:   String(item[nameKey] ?? "").trim(),
      weight: parseFloat(String(item[weightKey] ?? "0")) || 0,
    }))
    .filter((h) => h.name && h.weight > 0);

  return result.length >= 2 ? result : null;
}

// ── 從 __NEXT_DATA__ JSON 解析 ETF 資料 ─────────────────────
function parseNextData(json: unknown): Partial<ConstituentData> {
  const result: Partial<ConstituentData> = {};

  // 依序嘗試找：前十大持股、行業比重、資產分佈
  // Yahoo Finance Taiwan 通常在 pageProps 下的各 component data 裡
  const holdings = deepFind(json, asHoldingArray);
  if (holdings) result.topHoldings = holdings.slice(0, 10);

  // 嘗試找行業與資產（使用同一個陣列結構，但內容不同）
  // 行業的 weight 總和通常接近 100，資產也是
  // 為了區分兩者，先找所有符合的陣列，再依 key 名稱分辨
  const candidates: WeightItem[][] = [];
  function collectWeightArrays(obj: unknown, d = 0): void {
    if (d > 10 || obj === null || obj === undefined) return;
    const hit = asWeightArray(obj);
    if (hit) { candidates.push(hit); return; }
    if (typeof obj === "object") {
      for (const v of Object.values(obj as Record<string, unknown>)) {
        collectWeightArrays(v, d + 1);
      }
    }
  }
  collectWeightArrays(json);

  // 行業比重：name 通常含「業」或是英文業別；資產：name 含「股票」「債券」「現金」
  for (const arr of candidates) {
    const names = arr.map((a) => a.name).join(",");
    const isIndustry = /業|sector|industry|tech|finance|energy/i.test(names);
    const isAsset    = /股票|現金|cash|bond|債|equity|fixed/i.test(names);
    if (isIndustry && !result.industries) result.industries = arr;
    else if (isAsset && !result.assets)   result.assets = arr;
  }

  // 嘗試提取日期字串（格式 YYYY/MM/DD 或 YYYY-MM-DD）
  function findDates(obj: unknown, d = 0): string[] {
    if (d > 12 || typeof obj === "function") return [];
    if (typeof obj === "string") {
      return /^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(obj.trim()) ? [obj.trim()] : [];
    }
    if (typeof obj !== "object" || obj === null) return [];
    return Object.values(obj as Record<string, unknown>).flatMap((v) => findDates(v, d + 1));
  }
  const dates = [...new Set(findDates(json))].sort().reverse();
  if (dates[0]) {
    const d = dates[0].replace(/-/g, "/");
    result.holdingDate  = d;
    result.industryDate = d;
    result.assetDate    = d;
  }

  return result;
}

// ── GET /api/constituents?symbol=0056 ────────────────────────
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json(empty(""), { status: 200 });

  const base = empty(symbol);

  try {
    // Yahoo Finance Taiwan ETF holding URL
    const url = `https://tw.stock.yahoo.com/quote/${encodeURIComponent(symbol)}.TW/holding`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer":         "https://tw.stock.yahoo.com/",
      },
      // Cache 4 小時：ETF 成分股不常更新
      next: { revalidate: 14400 },
    });

    if (!res.ok) return NextResponse.json(base, { status: 200 });

    const html = await res.text();

    // ── 方法 1：解析 __NEXT_DATA__ ─────────────────────────
    const ndMatch = html.match(
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]+?)<\/script>/
    );
    if (ndMatch) {
      let jsonObj: unknown;
      try { jsonObj = JSON.parse(ndMatch[1]); } catch { jsonObj = null; }

      if (jsonObj) {
        const parsed = parseNextData(jsonObj);
        if ((parsed.topHoldings?.length ?? 0) > 0) {
          return NextResponse.json({
            ...base,
            ...parsed,
          } satisfies ConstituentData);
        }
      }
    }

    // ── 方法 2：搜尋 HTML 內任何 JSON-like 的持股資料 ─────
    // Yahoo 有時會把資料放在 window.__Y_STORE__ 或類似 var 裡
    const storeMatches = [
      ...html.matchAll(/(?:window\.__[A-Z_]+__|var\s+\w+)\s*=\s*(\{[\s\S]{200,}?\});?\s*(?:<\/script>|$)/gm),
    ];
    for (const m of storeMatches) {
      let jsonObj: unknown = null;
      try { jsonObj = JSON.parse(m[1]); } catch { continue; }
      const parsed = parseNextData(jsonObj);
      if ((parsed.topHoldings?.length ?? 0) > 0) {
        return NextResponse.json({ ...base, ...parsed } satisfies ConstituentData);
      }
    }

    // 無法解析，回傳空資料（不 500）
    return NextResponse.json(base, { status: 200 });
  } catch (err) {
    console.warn("[GET /api/constituents]", symbol, err);
    return NextResponse.json(base, { status: 200 });
  }
}
