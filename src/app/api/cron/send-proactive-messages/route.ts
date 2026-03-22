export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { verifyCronSecret } from "@/lib/cronAuth";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

// Vercel Cron endpoint: sends proactive messages at 6 PM UTC daily
export async function GET(req: NextRequest) {
  try {
    // Verify Vercel Cron signature
    const denied = verifyCronSecret(req.headers.get("authorization"));
    if (denied) return denied;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Find users with:
    // 1. opt_in_magic = true
    // 2. phone_number not null
    // 3. Upcoming bookings (checkout_date > now)
    const { data: activeUsers, error: queryError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        phone_number,
        maya_interests,
        music_style,
        birthday,
        tour_bookings!inner(
          id,
          checkout_date
        )
      `,
      )
      .eq("opt_in_magic", true)
      .not("phone_number", "is", null)
      .gt("tour_bookings.checkout_date", new Date().toISOString());

    if (queryError) {
      console.error("[Cron] Query error:", queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    if (!activeUsers || activeUsers.length === 0) {
      debugLog("[Cron] No eligible users for proactive messages");
      return NextResponse.json({
        success: true,
        message: "No eligible users",
        sent: 0,
      });
    }

    debugLog(`[Cron] Found ${activeUsers.length} users for proactive messages`);

    // Sample proactive messages based on user preferences
    const messageTemplates = [
      "Have you considered booking a romantic overwater experience? 🏝️",
      "New magical experiences available! Check out our latest offerings ✨",
      "Your next adventure awaits. Would you like personalized recommendations? 🌟",
      "Exclusive deals on premium rooms this week! Book now for 15% off 🎁",
    ];

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Send messages concurrently with rate limiting
    for (const user of activeUsers) {
      try {
        if (!user.phone_number) continue;

        // Select random template
        const template =
          messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

        // Personalize if possible
        let message = template;
        if (user.maya_interests && user.maya_interests.length > 0) {
          message = `Hi! Based on your interest in ${user.maya_interests[0]}, we have something special for you. ✨`;
        }

        await sendWhatsAppMessage(user.phone_number, message);

        // Log outbound message
        await supabase.from("whatsapp_messages").insert({
          user_id: user.id,
          phone_number: user.phone_number,
          direction: "outbound",
          body: message,
          twilio_sid: `cron-${Date.now()}`,
        });

        successCount++;
      } catch (err) {
        failureCount++;
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`User ${user.id}: ${errMsg}`);
        console.error(`[Cron] Failed to send to ${user.phone_number}:`, err);
      }

      // Rate limit: 10ms between sends
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    debugLog(`[Cron] Sent: ${successCount}, Failed: ${failureCount}`);

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Cron] Unhandled error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
