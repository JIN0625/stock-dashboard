import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// ── GET /api/account-summary ──────────────────────────────────
// 取得帳戶餘額與今日已實現損益；若尚無紀錄自動建立預設值
export async function GET() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("account_summary")
    .select("cash_balance, realized_pnl_today, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[GET /api/account-summary]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    // 第一次存取，自動建立預設紀錄
    const { data: created, error: insertErr } = await sb
      .from("account_summary")
      .insert({ user_id: user.id, cash_balance: 0, realized_pnl_today: 0 })
      .select("cash_balance, realized_pnl_today, updated_at")
      .single();

    if (insertErr) {
      console.error("[GET /api/account-summary] insert default:", insertErr);
      return NextResponse.json({ cash_balance: 0, realized_pnl_today: 0, updated_at: null });
    }
    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

// ── PATCH /api/account-summary ────────────────────────────────
// 僅允許手動更新 cash_balance
// realized_pnl_today 只由交易 API 自動累加，不開放前端直接修改
export async function PATCH(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { cash_balance } = body;
  if (cash_balance === undefined || typeof cash_balance !== "number") {
    return NextResponse.json({ error: "cash_balance (number) is required" }, { status: 400 });
  }

  // ── 先查是否已有紀錄 ──────────────────────────────────────────
  const { data: existing, error: fetchErr } = await sb
    .from("account_summary")
    .select("cash_balance, realized_pnl_today, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[PATCH /api/account-summary] fetch:", fetchErr);
    return NextResponse.json(
      { error: `查詢帳戶失敗：${fetchErr.message}` },
      { status: 500 },
    );
  }

  // ── 有紀錄 → UPDATE；無紀錄 → INSERT ─────────────────────────
  if (existing) {
    const { data: updated, error: updateErr } = await sb
      .from("account_summary")
      .update({ cash_balance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("cash_balance, realized_pnl_today, updated_at")
      .single();

    if (updateErr) {
      console.error("[PATCH /api/account-summary] update:", updateErr);
      return NextResponse.json(
        { error: `更新失敗：${updateErr.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json(updated);
  } else {
    const { data: inserted, error: insertErr } = await sb
      .from("account_summary")
      .insert({ user_id: user.id, cash_balance, realized_pnl_today: 0 })
      .select("cash_balance, realized_pnl_today, updated_at")
      .single();

    if (insertErr) {
      console.error("[PATCH /api/account-summary] insert:", insertErr);
      return NextResponse.json(
        { error: `建立帳戶失敗：${insertErr.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json(inserted);
  }
}
