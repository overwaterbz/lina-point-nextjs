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

const ALLOWED_CATEGORIES = [
  "water",
  "culture",
  "nature",
  "adventure",
  "wellness",
  "dining",
];

/** GET /api/admin/tours — list all tours with OTA prices */
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const supabase = getService();
  const { data, error } = await supabase
    .from("tours")
    .select("*, tour_ota_prices(*)")
    .order("category")
    .order("name");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tours: data });
}

/** POST /api/admin/tours — create a new tour */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const {
    name,
    description,
    price,
    duration_hours,
    category,
    max_guests,
    image_url,
    active,
  } = body;

  if (
    !name?.trim() ||
    !description?.trim() ||
    !price ||
    !duration_hours ||
    !category
  ) {
    return NextResponse.json(
      {
        error:
          "name, description, price, duration_hours, and category are required",
      },
      { status: 400 },
    );
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (price <= 0 || duration_hours <= 0) {
    return NextResponse.json(
      { error: "price and duration_hours must be positive" },
      { status: 400 },
    );
  }

  const supabase = getService();
  const { data, error } = await supabase
    .from("tours")
    .insert({
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      duration_hours: Number(duration_hours),
      category,
      max_guests: max_guests ? Number(max_guests) : null,
      image_url: image_url || null,
      active: active !== false,
    })
    .select("id, name, category, price, active")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tour: data }, { status: 201 });
}

/** PATCH /api/admin/tours?id=<tourId> — update a tour */
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await request.json();
  const allowed = [
    "name",
    "description",
    "price",
    "duration_hours",
    "category",
    "max_guests",
    "image_url",
    "active",
  ] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (
    "category" in update &&
    !ALLOWED_CATEGORIES.includes(update.category as string)
  ) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );

  const supabase = getService();
  const { error } = await supabase.from("tours").update(update).eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
