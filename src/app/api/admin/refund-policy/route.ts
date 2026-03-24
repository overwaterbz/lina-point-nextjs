export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`
  )
    return null;
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();
    if (user && isAdminEmail(user.email)) return null;
  } catch {
    /* session check failed */
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("refund_policies")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const body = await req.json();
  const { name, days_before, refund_pct, notes, sort_order } = body;
  if (!name || days_before == null || refund_pct == null) {
    return NextResponse.json(
      { error: "name, days_before, refund_pct are required" },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("refund_policies")
    .insert({
      name,
      days_before,
      refund_pct,
      notes,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await req.json();
  const { id, name, days_before, refund_pct, notes, active, sort_order } = body;
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (name !== undefined) updates.name = name;
  if (days_before !== undefined) updates.days_before = days_before;
  if (refund_pct !== undefined) updates.refund_pct = refund_pct;
  if (notes !== undefined) updates.notes = notes;
  if (active !== undefined) updates.active = active;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  const { data, error } = await supabase
    .from("refund_policies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { error } = await supabase
    .from("refund_policies")
    .delete()
    .eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
