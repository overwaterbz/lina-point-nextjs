export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("unsub_token", token)
    .eq("status", "active")
    .select("email")
    .single();

  if (error || !data) {
    // Redirect to unsubscribe page regardless (don't leak subscription status)
    return NextResponse.redirect(
      new URL("/unsubscribe?status=done", request.nextUrl.origin),
    );
  }

  return NextResponse.redirect(
    new URL("/unsubscribe?status=done", request.nextUrl.origin),
  );
}
