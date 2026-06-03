import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

type RouteContext = { params: Promise<{ id: string }> };

// ── 共用：取得已驗證的 Supabase client + user ─────────────────
async function getAuthContext() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return { sb, user };
}

// ── GET /api/holdings/[id] ────────────────────────────────────
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { sb, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await sb
    .from("holdings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)   // 只能看自己的
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}

// ── PATCH /api/holdings/[id] ──────────────────────────────────
// 只允許更新 symbol / name / shares / avg_cost / type
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { sb, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 只接受允許更新的欄位
  const allowed: Record<string, unknown> = {};
  if (body.symbol   !== undefined) allowed.symbol   = String(body.symbol).toUpperCase().trim();
  if (body.name     !== undefined) allowed.name      = String(body.name).trim();
  if (body.shares   !== undefined) allowed.shares    = Number(body.shares);
  if (body.avg_cost !== undefined) allowed.avg_cost  = Number(body.avg_cost);
  if (body.type     !== undefined) allowed.type      = body.type === "etf" ? "etf" : "stock";

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("holdings")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)   // 只能更新自己的
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/holdings/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// ── DELETE /api/holdings/[id] ─────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { sb, user } = await getAuthContext();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await sb
    .from("holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);  // 只能刪除自己的

  if (error) {
    console.error("[DELETE /api/holdings/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
