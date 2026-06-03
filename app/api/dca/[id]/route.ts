import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

type Ctx = { params: Promise<{ id: string }> };

// ── PATCH /api/dca/[id] ───────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (body.symbol         !== undefined) allowed.symbol         = String(body.symbol).toUpperCase().trim();
  if (body.name           !== undefined) allowed.name           = String(body.name).trim();
  if (body.type           !== undefined) allowed.type           = body.type === "etf" ? "etf" : "stock";
  if (body.day_of_month   !== undefined) allowed.day_of_month   = Number(body.day_of_month);
  if (body.monthly_amount !== undefined) allowed.monthly_amount = Number(body.monthly_amount);
  if (body.is_active      !== undefined) allowed.is_active      = Boolean(body.is_active);

  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  const { data, error } = await sb
    .from("dca_plans")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE /api/dca/[id] ──────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await sb
    .from("dca_plans")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
