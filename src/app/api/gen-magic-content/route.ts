export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMagicContent } from "@/lib/magicContent";
import { createAgentRun, finishAgentRun } from "@/lib/agents/agentRunLogger";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

// Server-only Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/gen-magic-content
 * Generate personalized song/video for a reservation
 *
 * Request body:
 * {
 *   "reservationId": "uuid",
 *   "occasion": "birthday|anniversary|proposal|renewal",
 *   "musicStyle": "ambient|edm|tropical|reggae|calypso" (default: ambient)
 *   "mood": "romantic|energetic|peaceful|celebratory" (default: romantic)
 *   "recipientName": "string",
 *   "giftYouName": "string",
 *   "message": "string"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const {
      reservationId,
      occasion,
      musicStyle,
      mood,
      recipientName,
      giftYouName,
      message,
    } = await request.json();

    if (!reservationId || !occasion) {
      return NextResponse.json(
        { error: "Missing reservationId or occasion" },
        { status: 400 },
      );
    }

    // Fetch reservation and verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from("tour_bookings")
      .select("*")
      .eq("id", reservationId)
      .eq("user_id", user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // Check if reservation includes "magic" add-on
    const magicIncluded = Array.isArray((booking as any)?.add_ons)
      ? (booking as any).add_ons.includes("magic")
      : true;
    if (!magicIncluded) {
      return NextResponse.json(
        { error: "Magic add-on not included in reservation" },
        { status: 400 },
      );
    }

    // Fetch user preferences/profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.warn("Could not fetch profile:", profileError);
    }

    if (!profile?.opt_in_magic) {
      return NextResponse.json(
        { error: "Magic agent not enabled in profile" },
        { status: 403 },
      );
    }

    debugLog(`[API] Generating magic content for ${reservationId}`);
    debugLog(`[API] Occasion: ${occasion}`);

    // Run ContentAgent
    let contentResult: Awaited<ReturnType<typeof generateMagicContent>> | null =
      null;
    let runId: string | null = null;
    const runStart = Date.now();

    try {
      try {
        runId = await createAgentRun(supabase as any, {
          user_id: user.id,
          agent_name: "content_magic",
          request_id: reservationId,
          input: {
            reservationId,
            occasion,
            musicStyle,
            mood,
            recipientName,
            giftYouName,
            message,
          },
        });
      } catch (logError) {
        console.warn("Failed to create agent run:", logError);
      }

      contentResult = await generateMagicContent(
        supabase as any,
        {
          userId: user.id,
          reservationId,
          occasion,
          musicStyle,
          mood,
          recipientName,
          giftYouName,
          message,
          userEmail: user.email,
        },
        profile,
      );

      if (runId) {
        try {
          await finishAgentRun(supabase as any, runId, {
            status: "completed",
            output: contentResult as any,
            duration_ms: Date.now() - runStart,
          });
        } catch (logError) {
          console.warn("Failed to finalize agent run:", logError);
        }
      }
    } catch (agentError) {
      if (runId) {
        try {
          await finishAgentRun(supabase as any, runId, {
            status: "failed",
            error_message:
              agentError instanceof Error
                ? agentError.message
                : String(agentError),
            duration_ms: Date.now() - runStart,
          });
        } catch (logError) {
          console.warn("Failed to finalize agent run:", logError);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Content generation failed",
          message:
            agentError instanceof Error
              ? agentError.message
              : String(agentError),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      items: contentResult?.items || [],
      message: "Magic content generation started",
    });
  } catch (error) {
    console.error("[API] Error in gen-magic-content:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
