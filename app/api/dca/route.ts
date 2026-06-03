import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// ── GET /api/dca ──────────────────────────────────────────────
// 回傳目前使用者的所有 DCA 計畫（含最近 5 筆執行紀錄）
export async function GET() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 同時撈計畫與執行紀錄
  const [plansRes, execsRes] = await Promise.all([
    sb
      .from("dca_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    sb
      .from("dca_executions")
      .select("*")
      .eq("user_id", user.id)
      .order("execution_date", { ascending: false })
      .limit(100),
  ]);

  if (plansRes.error)
    return NextResponse.json({ error: plansRes.error.message }, { status: 500 });

  const execsByPlan: Record<string, typeof execsRes.data> = {};
  for (const e of execsRes.data ?? []) {
    if (!execsByPlan[e.dca_plan_id]) execsByPlan[e.dca_plan_id] = [];
    execsByPlan[e.dca_plan_id]!.push(e);
  }

  const plans = (plansRes.data ?? []).map((p) => ({
    ...p,
    recent_executions: (execsByPlan[p.id] ?? []).slice(0, 5),
  }));

  return NextResponse.json(plans);
}

// ── POST /api/dca ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { symbol, name, type, day_of_month, monthly_amount, is_active } = body;
  if (!symbol || !name || !day_of_month || !monthly_amount)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const { data, error } = await sb
    .from("dca_plans")
    .insert({
      user_id:        user.id,
      symbol:         String(symbol).toUpperCase().trim(),
      name:           String(name).trim(),
      type:           type === "etf" ? "etf" : "stock",
      day_of_month:   Number(day_of_month),
      monthly_amount: Number(monthly_amount),
      is_active:      is_active !== false,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/dca]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
