import { NextRequest, NextResponse } from "next/server";

// ── 遞迴搜尋：找包含指定欄位的物件，回傳路徑 ─────────────────
const TARGET_KEYS = new Set([
  "name", "symbol", "weight", "percent", "holding",
  "holdings", "industry", "sector", "asset", "assets",
  "percentage", "ratio", "stockName", "holdingName",
]);

interface PathHit {
  path:  string;
  keys:  string[];
  value: unknown;      // 前 200 字元的 JSON，方便人讀
}

function walk(
  obj:     unknown,
  path:    string,
  hits:    PathHit[],
  maxHits: number,
  depth:   number,
): void {
  if (hits.length >= maxHits || depth > 12) return;
  if (obj === null || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    // 只深入前 3 個元素（節省時間），標記 [0]
    for (let i = 0; i < Math.min(obj.length, 3); i++) {
      walk(obj[i], `${path}[${i}]`, hits, maxHits, depth + 1);
    }
    return;
  }

  // Plain object：檢查 key 是否命中
  const objKeys  = Object.keys(obj as Record<string, unknown>);
  const hitKeys  = objKeys.filter((k) => TARGET_KEYS.has(k.toLowerCase()));

  if (hitKeys.length >= 2) {
    // 至少 2 個命中 key 才記錄（減少雜訊）
    const snippet = JSON.stringify(obj).slice(0, 200);
    hits.push({ path, keys: hitKeys, value: snippet });
    if (hits.length >= maxHits) return;
  }

  // 繼續往下走
  for (const k of objKeys) {
    walk(
      (obj as Record<string, unknown>)[k],
      path ? `${path}.${k}` : k,
      hits,
      maxHits,
      depth + 1,
    );
    if (hits.length >= maxHits) return;
  }
}

// ── 找前 N 個陣列（長度 >= 3）及前 N 個純物件 ───────────────
function collectSamples(
  obj:      unknown,
  arrays:   Array<{ path: string; length: number; sample: unknown }>,
  objects:  Array<{ path: string; keys: string[] }>,
  path:     string,
  depth:    number,
): void {
  if (depth > 8 || obj === null || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    if (obj.length >= 3 && arrays.length < 30) {
      arrays.push({
        path,
        length: obj.length,
        sample: JSON.stringify(obj[0]).slice(0, 200),
      });
    }
    for (let i = 0; i < Math.min(obj.length, 2); i++) {
      collectSamples(obj[i], arrays, objects, `${path}[${i}]`, depth + 1);
    }
    return;
  }

  const keys = Object.keys(obj as Record<string, unknown>);
  if (objects.length < 30) {
    objects.push({ path: path || "(root)", keys });
  }
  for (const k of keys) {
    collectSamples(
      (obj as Record<string, unknown>)[k],
      arrays, objects,
      path ? `${path}.${k}` : k,
      depth + 1,
    );
  }
}

// ── GET /api/debug-nextdata?symbol=0056 ──────────────────────
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? "0056";
  const url    = `https://tw.stock.yahoo.com/quote/${encodeURIComponent(symbol)}.TW/holding`;

  // 抓頁面
  let html = "";
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
      cache: "no-store",
    });
    html = await res.text();
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 200 });
  }

  // 取出 __NEXT_DATA__
  const match = html.match(
    /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]+?)<\/script>/
  );
  if (!match) {
    return NextResponse.json({
      error:      "__NEXT_DATA__ not found",
      htmlLength: html.length,
      htmlHead:   html.slice(0, 500),
    });
  }

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch (e) {
    return NextResponse.json({
      error:       "JSON.parse failed: " + String(e),
      rawLength:   match[1].length,
      rawPreview:  match[1].slice(0, 500),
    });
  }

  const root      = data as Record<string, unknown>;
  const props     = root.props      as Record<string, unknown> | undefined;
  const pageProps = props?.pageProps as Record<string, unknown> | undefined;

  // ── 基本 key 結構 ───────────────────────────────────────
  const topLevelKeys  = Object.keys(root);
  const propsKeys     = props      ? Object.keys(props)      : [];
  const pagePropsKeys = pageProps  ? Object.keys(pageProps)  : [];

  // ── 遞迴找命中目標欄位的路徑（最多 20 筆）──────────────
  const hits: PathHit[] = [];
  walk(data, "", hits, 20, 0);

  // ── 收集陣列與物件樣本 ──────────────────────────────────
  const sampleArrays:  Array<{ path: string; length: number; sample: unknown }> = [];
  const sampleObjects: Array<{ path: string; keys: string[] }>                  = [];
  collectSamples(data, sampleArrays, sampleObjects, "", 0);

  return NextResponse.json({
    symbol,
    nextDataLength: match[1].length,
    topLevelKeys,
    propsKeys,
    pagePropsKeys,
    // 命中目標欄位的路徑（最重要）
    keywordHits: hits,
    // 所有陣列（含長度與第一個元素 sample）
    sampleArrays,
    // 所有物件（含 key 名稱）
    sampleObjects,
  });
}
