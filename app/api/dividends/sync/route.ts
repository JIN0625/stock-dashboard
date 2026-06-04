import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { fetchAllDividends, fetchLatestQuote } from "@/lib/finmind";

// POST /api/dividends/sync
// body: { reinvest?: boolean }
//
// 掃描所有持股的歷史配息，對已過發放日且未建立紀錄者寫入 dividend_records。
// 若 reinvest=true，用當前股價計算再投入股數並更新 holdings。
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: { reinvest?: boolean } = await req.json().catch(() => ({}));
  const reinvest = body.reinvest === true;

  const { data: holdings, error: hErr } = await sb
    .from("holdings")
    .select("id, symbol, name, shares, avg_cost, type")
    .eq("user_id", user.id);

  if (hErr || !holdings) {
    return NextResponse.json({ error: "Failed to load holdings" }, { status: 500 });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const results: Array<{
    symbol: string;
    ex_dividend_date: string;
    status: string;
    cash_received: number;
    shares_bought?: number;
  }> = [];

  for (const holding of holdings) {
    const all = await fetchAllDividends(holding.symbol);

    // Only process dividends where payment date has passed
    const payable = all.filter(
      d => d.cashDividend > 0 && d.exDividendDate && d.paymentDate && d.paymentDate <= todayStr
    );

    // Maintain mutable local state for this holding in case of multi-dividend reinvest
    let currentShares = Number(holding.shares);
    let currentAvgCost = Number(holding.avg_cost);

    for (const div of payable) {
      const { data: existing } = await sb
        .from("dividend_records")
        .select("id")
        .eq("user_id", user.id)
        .eq("symbol", holding.symbol)
        .eq("ex_dividend_date", div.exDividendDate!)
        .maybeSingle();

      if (existing) continue;

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
            .update({ reinvested: true })
            .eq("id", record.id)
            .eq("user_id", user.id);

          currentShares   = new_shares;
          currentAvgCost  = new_avg_cost;

          results.push({
            symbol:           holding.symbol,
            ex_dividend_date: div.exDividendDate!,
            status:           "reinvested",
            cash_received,
            shares_bought,
          });
          continue;
        }
      }

      results.push({
        symbol:           holding.symbol,
        ex_dividend_date: div.exDividendDate!,
        status:           "recorded",
        cash_received,
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
