import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { fetchAllDividends, fetchLatestQuote } from "@/lib/finmind";
import type { DivSyncItem, DivSyncResponse } from "@/types";

// POST /api/dividends/sync
// body: { reinvest?: boolean }
//
// 掃描所有持股已過除息日的配息。
// paymentDate 未到 → not_yet_payable
// 已有紀錄      → already_recorded
// 新建紀錄      → recorded（reinvest=false）或 reinvested（reinvest=true）
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read reinvest flag from body; fall back to user_settings
  const body: { reinvest?: boolean } = await req.json().catch(() => ({}));
  let reinvest = body.reinvest;
  if (reinvest === undefined) {
    const { data: settings } = await sb
      .from("user_settings")
      .select("dividend_reinvest_enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    reinvest = settings?.dividend_reinvest_enabled ?? false;
  }

  const { data: holdings, error: hErr } = await sb
    .from("holdings")
    .select("id, symbol, name, shares, avg_cost, type")
    .eq("user_id", user.id);

  if (hErr || !holdings) {
    return NextResponse.json({ error: "Failed to load holdings" }, { status: 500 });
  }

  const todayStr  = new Date().toISOString().slice(0, 10);
  const results: DivSyncItem[] = [];
  let newlyRecorded = 0;

  for (const holding of holdings) {
    const all = await fetchAllDividends(holding.symbol);

    // Only dividends where ex-date has already passed
    const postEx = all.filter(d => d.exDividendDate && d.exDividendDate <= todayStr);

    let currentShares   = Number(holding.shares);
    let currentAvgCost  = Number(holding.avg_cost);

    for (const div of postEx) {
      // Case 1: paymentDate hasn't arrived yet
      if (!div.paymentDate || div.paymentDate > todayStr) {
        results.push({
          symbol:           holding.symbol,
          name:             holding.name,
          ex_dividend_date: div.exDividendDate!,
          payment_date:     div.paymentDate,
          cash_dividend:    div.cashDividend,
          cash_received:    currentShares * div.cashDividend,
          status:           "not_yet_payable",
          message:          "尚未到發放日，不會入帳",
        });
        continue;
      }

      // Case 2: already recorded
      const { data: existing } = await sb
        .from("dividend_records")
        .select("id, reinvested, shares_bought, reinvest_price, cash_received")
        .eq("user_id", user.id)
        .eq("symbol", holding.symbol)
        .eq("ex_dividend_date", div.exDividendDate!)
        .maybeSingle();

      if (existing) {
        results.push({
          symbol:           holding.symbol,
          name:             holding.name,
          ex_dividend_date: div.exDividendDate!,
          payment_date:     div.paymentDate,
          cash_dividend:    div.cashDividend,
          cash_received:    Number(existing.cash_received),
          status:           "already_recorded",
          message:          "已入帳，不會重複執行",
          shares_bought:    existing.shares_bought ?? undefined,
          reinvest_price:   existing.reinvest_price ?? undefined,
        });
        continue;
      }

      // Case 3: new record
      const cash_received = currentShares * div.cashDividend;

      const { data: record, error: insErr } = await sb
        .from("dividend_records")
        .insert({
          user_id:          user.id,
          symbol:           holding.symbol,
          name:             holding.name,
          ex_dividend_date: div.exDividendDate!,
          payment_date:     div.paymentDate,
          cash_dividend:    div.cashDividend,
          stock_dividend:   div.stockDividend,
          shares_owned:     currentShares,
          cash_received,
          reinvested:       false,
        })
        .select()
        .single();

      if (insErr || !record) continue;

      newlyRecorded++;

      // Case 3a: reinvest
      if (reinvest && cash_received > 0) {
        const quote = await fetchLatestQuote(holding.symbol);
        const price = quote?.price;

        if (price && price > 0) {
          const shares_bought = cash_received / price;
          const new_shares    = currentShares + shares_bought;
          const new_avg_cost  = (currentShares * currentAvgCost + cash_received) / new_shares;

          await sb.from("holdings")
            .update({ shares: new_shares, avg_cost: new_avg_cost })
            .eq("id", holding.id)
            .eq("user_id", user.id);

          await sb.from("dividend_records")
            .update({ reinvested: true, shares_bought, reinvest_price: price })
            .eq("id", record.id)
            .eq("user_id", user.id);

          currentShares  = new_shares;
          currentAvgCost = new_avg_cost;

          results.push({
            symbol:           holding.symbol,
            name:             holding.name,
            ex_dividend_date: div.exDividendDate!,
            payment_date:     div.paymentDate,
            cash_dividend:    div.cashDividend,
            cash_received,
            status:           "reinvested",
            message:          `買入 ${shares_bought.toFixed(4)} 股，更新平均成本 $${new_avg_cost.toFixed(2)}`,
            shares_bought,
            reinvest_price:   price,
            new_shares,
            new_avg_cost,
          });
          continue;
        }
      }

      // Case 3b: cash only
      results.push({
        symbol:           holding.symbol,
        name:             holding.name,
        ex_dividend_date: div.exDividendDate!,
        payment_date:     div.paymentDate,
        cash_dividend:    div.cashDividend,
        cash_received,
        status:           "recorded",
        message:          "現金入帳",
      });
    }
  }

  const newItems = results.filter(r => r.status === "recorded" || r.status === "reinvested");
  const total_cash = newItems.reduce((s, r) => s + r.cash_received, 0);

  const response: DivSyncResponse = {
    synced:     newlyRecorded,
    total_cash,
    results,
  };

  return NextResponse.json(response);
}
