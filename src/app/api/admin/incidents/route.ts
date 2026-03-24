export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

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

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let query = supabase
    .from("incidents")
    .select(
      "id, room_id, title, description, severity, status, incident_date, resolved_at, resolution_notes, created_at, reported_by, rooms(room_number, room_type)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const body = await req.json();
  const { title, description, room_id, severity, incident_date, reported_by } =
    body;
  if (!title)
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title,
      description,
      room_id: room_id || null,
      severity: severity || "low",
      incident_date: incident_date || new Date().toISOString().split("T")[0],
      reported_by: reported_by || null,
    })
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify manager via WhatsApp for critical incidents
  if ((severity || "low") === "critical" && process.env.MANAGER_PHONE) {
    try {
      await sendWhatsAppMessage(
        process.env.MANAGER_PHONE,
        `🚨 CRITICAL INCIDENT: ${title}\n${description || ""}\nLogged: ${new Date().toLocaleString()}`,
      );
    } catch (waErr) {
      console.error("[Incidents] WhatsApp alert failed:", waErr);
    }
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const supabase = await createServerSupabaseClient();
  const body = await req.json();
  const {
    id,
    status,
    resolution_notes,
    title,
    description,
    severity,
    room_id,
  } = body;
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (status) {
    updates.status = status;
    if (status === "resolved" || status === "closed") {
      updates.resolved_at = new Date().toISOString();
    }
  }
  if (resolution_notes !== undefined)
    updates.resolution_notes = resolution_notes;
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (severity !== undefined) updates.severity = severity;
  if (room_id !== undefined) updates.room_id = room_id;
  const { data, error } = await supabase
    .from("incidents")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
