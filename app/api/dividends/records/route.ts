import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

// GET /api/dividends/records — 回傳登入者所有配息紀錄
export async function GET() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await sb
    .from("dividend_records")
    .select("*")
    .eq("user_id", user.id)
    .order("ex_dividend_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
