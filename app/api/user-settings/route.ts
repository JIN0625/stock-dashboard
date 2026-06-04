import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// GET /api/user-settings → { dividend_reinvest_enabled: boolean }
export async function GET() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await sb
    .from("user_settings")
    .select("dividend_reinvest_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    dividend_reinvest_enabled: data?.dividend_reinvest_enabled ?? false,
  });
}

// PATCH /api/user-settings → body: { dividend_reinvest_enabled: boolean }
export async function PATCH(req: NextRequest) {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: { dividend_reinvest_enabled?: boolean } = await req.json().catch(() => ({}));

  const { error } = await sb
    .from("user_settings")
    .upsert(
      {
        user_id:                   user.id,
        dividend_reinvest_enabled: body.dividend_reinvest_enabled ?? false,
        updated_at:                new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    dividend_reinvest_enabled: body.dividend_reinvest_enabled ?? false,
  });
}
