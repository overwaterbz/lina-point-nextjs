import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  // Auth check (optional: add stricter admin check)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Brand filter
  const url = new URL(request.url);
  const brand = url.searchParams.get("brand");

  let query = supabase
    .from("content_calendar")
    .select("id, title, body, platform, scheduled_at, status, brand")
    .in("status", ["draft", "suggested"]);
  if (brand) query = query.eq("brand", brand);
  query = query.order("scheduled_at", { ascending: true });

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to frontend format
  const suggestions = (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    content: item.body,
    platform: item.platform,
    scheduled_at: item.scheduled_at,
    status: item.status,
    brand: item.brand,
  }));

  return NextResponse.json({ suggestions });
}
