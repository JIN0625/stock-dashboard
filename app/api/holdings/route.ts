import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// ── GET /api/holdings ─────────────────────────────────────────
// 只回傳目前登入者的持股（RLS + user_id 雙重保護）
export async function GET() {
  const sb = await createSupabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await sb
    .from("holdings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/holdings]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// ── POST /api/holdings ────────────────────────────────────────
// 新增持股，自動寫入目前登入者的 user_id
export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { symbol, name, shares, avg_cost, type } = body;
  if (!symbol || !name || !shares || !avg_cost) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("holdings")
    .insert({
      user_id:  user.id,
      symbol:   String(symbol).toUpperCase().trim(),
      name:     String(name).trim(),
      shares:   Number(shares),
      avg_cost: Number(avg_cost),
      type:     type === "etf" ? "etf" : "stock",
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/holdings]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
