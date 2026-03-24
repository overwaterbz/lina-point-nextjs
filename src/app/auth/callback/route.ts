import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Supabase Auth Callback Handler
 *
 * Processes the ?code= parameter from email confirmation links and magic links.
 * Exchanges the one-time code for a persistent session, then redirects the user.
 *
 * Default Supabase redirect URL should be set to: <SITE_URL>/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to go after confirming — defaults to dashboard, or follow ?next= param
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure the redirect stays on the same origin (prevent open-redirect)
      const safeNext = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(new URL(safeNext, origin));
    }
  }

  // Code missing or exchange failed — send back to login with an error hint
  return NextResponse.redirect(
    new URL("/auth/login?error=confirmation_failed", origin),
  );
}
