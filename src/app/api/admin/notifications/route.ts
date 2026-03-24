export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
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

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * PATCH /api/admin/notifications
 * Body: { ids: string[] }     — mark specific IDs as read
 *       { all: true, user_id: string } — mark all for user as read
 */
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const supabase = getService();

  if (body.all === true) {
    // Mark all unread notifications as read for a given user (or global null-user_id ones)
    const userId = body.user_id as string | undefined;
    if (!userId)
      return NextResponse.json(
        { error: "user_id required when all=true" },
        { status: 400 },
      );

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false)
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Mark specific IDs as read
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0)
    return NextResponse.json({ error: "ids array required" }, { status: 400 });

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", ids);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
