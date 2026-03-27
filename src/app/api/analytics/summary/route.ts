import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Example: Aggregate booking_analytics for summary
  const { data, error } = await supabase
    .from("booking_analytics")
    .select("id, booking_completed, completed_at, user_id")
    .order("completed_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = data?.length || 0;
  const bookings = (data || []).filter((b: any) => b.booking_completed).length;
  const conversionRate =
    sessions > 0 ? ((bookings / sessions) * 100).toFixed(1) : "0.0";

  // Placeholder values for response time and errors
  const responseTime = 3000;
  const errors = 0;
  const highlights = bookings >= 5 ? "🔥 High booking volume!" : undefined;

  return NextResponse.json({
    summary: {
      sessions,
      bookings,
      conversionRate,
      responseTime,
      errors,
      highlights,
    },
  });
}
