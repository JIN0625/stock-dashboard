import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

interface SellItem {
  symbol:  string;
  name:    string;
  shares:  number;
  price:   number;
  avgCost: number;
}

interface BuyItem {
  symbol: string;
  name:   string;
  shares: number;
  price:  number;
  type:   "stock" | "etf";
}

interface ApplyBody {
  mode: "buy" | "sell" | "swap";
  sell?: SellItem;
  buy?:  BuyItem;
}

// POST /api/simulator/apply
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: ApplyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sell, buy } = body;
  if (!sell && !buy) {
    return NextResponse.json({ error: "No operation provided" }, { status: 400 });
  }

  // ── 1. 驗證並處理賣出 ─────────────────────────────────────────
  let actualAvgCost = sell?.avgCost ?? 0;

  if (sell) {
    const { data: holding, error: fetchErr } = await sb
      .from("holdings")
      .select("id, shares, avg_cost")
      .eq("user_id", user.id)
      .eq("symbol", sell.symbol)
      .single();

    if (fetchErr || !holding) {
      return NextResponse.json({ error: `找不到 ${sell.symbol} 的持股` }, { status: 400 });
    }
    if (sell.shares > holding.shares) {
      return NextResponse.json(
        { error: `賣出股數不可超過持有股數（${holding.shares} 股）` },
        { status: 400 },
      );
    }

    actualAvgCost = holding.avg_cost;
    const remainShares = holding.shares - sell.shares;

    if (remainShares === 0) {
      const { error } = await sb
        .from("holdings")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", sell.symbol);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await sb
        .from("holdings")
        .update({ shares: remainShares })
        .eq("user_id", user.id)
        .eq("symbol", sell.symbol);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── 2. 處理買入 ───────────────────────────────────────────────
  if (buy) {
    const { data: existing } = await sb
      .from("holdings")
      .select("id, shares, avg_cost")
      .eq("user_id", user.id)
      .eq("symbol", buy.symbol)
      .maybeSingle();

    if (existing) {
      const newShares  = existing.shares + buy.shares;
      const newAvgCost =
        Math.round(
          ((existing.avg_cost * existing.shares) + (buy.price * buy.shares)) / newShares * 100,
        ) / 100;

      const { error } = await sb
        .from("holdings")
        .update({ shares: newShares, avg_cost: newAvgCost })
        .eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await sb.from("holdings").insert({
        user_id:  user.id,
        symbol:   buy.symbol,
        name:     buy.name,
        shares:   buy.shares,
        avg_cost: buy.price,
        type:     buy.type,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // ── 3. 寫入 trade_records ─────────────────────────────────────
  const groupId = sell && buy ? crypto.randomUUID() : null;
  const records: Record<string, unknown>[] = [];

  if (sell) {
    records.push({
      user_id:      user.id,
      group_id:     groupId,
      source:       "SIMULATOR",
      type:         "SELL",
      symbol:       sell.symbol,
      name:         sell.name,
      shares:       sell.shares,
      price:        sell.price,
      amount:       sell.shares * sell.price,
      realized_pnl: (sell.price - actualAvgCost) * sell.shares,
    });
  }

  if (buy) {
    records.push({
      user_id:  user.id,
      group_id: groupId,
      source:   "SIMULATOR",
      type:     "BUY",
      symbol:   buy.symbol,
      name:     buy.name,
      shares:   buy.shares,
      price:    buy.price,
      amount:   buy.shares * buy.price,
    });
  }

  const { error: tradeErr } = await sb.from("trade_records").insert(records);
  if (tradeErr) {
    console.error("[simulator/apply] trade_records insert failed:", tradeErr);
    return NextResponse.json(
      { error: `庫存已更新，但交易紀錄寫入失敗：${tradeErr.message}` },
      { status: 500 },
    );
  }

  // ── 4. 更新 account_summary ───────────────────────────────────
  // cash_balance：賣出 +、買入 -
  // realized_pnl_today：SELL 交易累加
  const sellAmount  = sell ? sell.shares * sell.price  : 0;
  const buyAmount   = buy  ? buy.shares  * buy.price   : 0;
  const cashDelta   = sellAmount - buyAmount;
  const pnlDelta    = sell ? (sell.price - actualAvgCost) * sell.shares : 0;

  const { data: acct } = await sb
    .from("account_summary")
    .select("cash_balance, realized_pnl_today")
    .eq("user_id", user.id)
    .maybeSingle();

  const newCash = (acct?.cash_balance        ?? 0) + cashDelta;
  const newPnl  = (acct?.realized_pnl_today  ?? 0) + pnlDelta;

  const { error: acctErr } = await sb
    .from("account_summary")
    .upsert(
      {
        user_id:            user.id,
        cash_balance:       newCash,
        realized_pnl_today: newPnl,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (acctErr) {
    // 主要操作已完成，記錄錯誤但不讓整筆交易失敗
    console.error("[simulator/apply] account_summary upsert failed:", acctErr);
  }

  return NextResponse.json({ ok: true });
}
