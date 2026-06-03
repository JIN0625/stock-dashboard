import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { fetchLatestQuote } from "@/lib/finmind";
import type { DcaRunResult } from "@/types";

// ── 取得台灣時間（UTC+8）的今日日期資訊 ──────────────────────
function getTaiwanToday(): { dateStr: string; day: number; daysInMonth: number } {
  const utcMs  = Date.now();
  const tw     = new Date(utcMs + 8 * 3600 * 1000); // shift to UTC+8
  const year   = tw.getUTCFullYear();
  const month  = tw.getUTCMonth();     // 0-indexed
  const day    = tw.getUTCDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { dateStr, day, daysInMonth };
}

// 判斷今天是否是該計畫的執行日
// 若計畫日 > 當月天數（e.g. day=31, 2月），則在當月最後一天執行
function isExecutionDay(planDay: number, todayDay: number, daysInMonth: number): boolean {
  if (planDay === todayDay) return true;
  if (planDay > daysInMonth && todayDay === daysInMonth) return true;
  return false;
}

// ── POST /api/dca/run ─────────────────────────────────────────
export async function POST() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = getTaiwanToday();
  const results: DcaRunResult[] = [];

  // 1. 取得此 user 所有啟用中的 DCA 計畫
  const { data: plans, error: plansErr } = await sb
    .from("dca_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (plansErr)
    return NextResponse.json({ error: plansErr.message }, { status: 500 });

  if (!plans || plans.length === 0) {
    return NextResponse.json({
      date:    today.dateStr,
      results: [],
      message: "目前沒有啟用中的定期定額計畫",
    });
  }

  for (const plan of plans) {
    // 2. 檢查今天是否是執行日
    if (!isExecutionDay(plan.day_of_month, today.day, today.daysInMonth)) {
      results.push({
        plan_id: plan.id,
        symbol:  plan.symbol,
        name:    plan.name,
        status:  "not_today",
        message: `執行日為每月 ${plan.day_of_month} 日，今天（${today.day} 日）不是執行日`,
      });
      continue;
    }

    // 3. 檢查今天是否已執行
    const { data: existing } = await sb
      .from("dca_executions")
      .select("id")
      .eq("dca_plan_id", plan.id)
      .eq("execution_date", today.dateStr)
      .maybeSingle();

    if (existing) {
      results.push({
        plan_id: plan.id,
        symbol:  plan.symbol,
        name:    plan.name,
        status:  "already_executed",
        message: `${today.dateStr} 已執行過，不重複執行`,
      });
      continue;
    }

    // 4. 抓最新股價
    let price: number;
    try {
      const q = await fetchLatestQuote(plan.symbol);
      if (!q || !q.price) throw new Error("no price");
      price = q.price;
    } catch {
      results.push({
        plan_id: plan.id,
        symbol:  plan.symbol,
        name:    plan.name,
        status:  "no_price",
        message: `無法取得 ${plan.symbol} 最新報價，請稍後再試`,
      });
      continue;
    }

    // 5. 計算買入股數（允許小數，保留 6 位）
    const shares_bought = Math.round((plan.monthly_amount / price) * 1_000_000) / 1_000_000;

    // 6. 寫入 dca_executions
    const { error: execErr } = await sb
      .from("dca_executions")
      .insert({
        user_id:        user.id,
        dca_plan_id:    plan.id,
        symbol:         plan.symbol,
        name:           plan.name,
        execution_date: today.dateStr,
        amount:         plan.monthly_amount,
        price,
        shares_bought,
      });

    if (execErr) {
      results.push({
        plan_id: plan.id,
        symbol:  plan.symbol,
        name:    plan.name,
        status:  "error",
        message: `寫入執行紀錄失敗：${execErr.message}`,
      });
      continue;
    }

    // 7. 更新 holdings
    let new_shares    = shares_bought;
    let new_avg_cost  = price;

    const { data: existingHolding } = await sb
      .from("holdings")
      .select("id, shares, avg_cost")
      .eq("user_id", user.id)
      .eq("symbol", plan.symbol)
      .maybeSingle();

    if (existingHolding) {
      // 加權平均計算新成本
      new_shares   = existingHolding.shares + shares_bought;
      new_avg_cost = Math.round(
        ((existingHolding.avg_cost * existingHolding.shares) + (price * shares_bought))
        / new_shares * 100
      ) / 100;

      await sb
        .from("holdings")
        .update({ shares: new_shares, avg_cost: new_avg_cost })
        .eq("id", existingHolding.id)
        .eq("user_id", user.id);
    } else {
      // 新增持股
      await sb
        .from("holdings")
        .insert({
          user_id:  user.id,
          symbol:   plan.symbol,
          name:     plan.name,
          shares:   shares_bought,
          avg_cost: price,
          type:     plan.type,
        });
      new_shares   = shares_bought;
      new_avg_cost = price;
    }

    results.push({
      plan_id: plan.id,
      symbol:  plan.symbol,
      name:    plan.name,
      status:  "executed",
      message: `成功買入 ${shares_bought.toFixed(4)} 股 @ $${price}`,
      execution: {
        price,
        shares_bought,
        amount:       plan.monthly_amount,
        new_shares,
        new_avg_cost,
      },
    });
  }

  return NextResponse.json({ date: today.dateStr, results });
}
