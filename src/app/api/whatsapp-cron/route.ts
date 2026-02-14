import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingReminder, sendWelcomeMessage } from "@/lib/whatsappHelper";

// Server-only Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/whatsapp-cron
 * Vercel Cron job that runs daily to send proactive WhatsApp messages
 * - Welcome messages for upcoming bookings
 * - Reminders for check-ins
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[WhatsApp Cron] Starting daily job");

    // Verify this is a cron request (Vercel sets this header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In production, verify the cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[WhatsApp Cron] Unauthorized request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const results = {
      upcomingReminders: 0,
      welcomeMessages: 0,
      errors: [] as string[],
    };

    // Get upcoming bookings (next 1-7 days)
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const { data: bookings, error: bookingsError } = await supabase
      .from("tour_bookings")
      .select(`
        id,
        user_id,
        check_in,
        check_out,
        room_type,
        status,
        profiles:user_id (
          user_id,
          name,
          phone_number
        )
      `)
      .gte("check_in", today.toISOString())
      .lte("check_in", sevenDaysFromNow.toISOString())
      .eq("status", "confirmed");

    if (bookingsError) {
      console.error("[WhatsApp Cron] Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    console.log(`[WhatsApp Cron] Found ${bookings?.length || 0} upcoming bookings`);

    // Process each booking
    for (const booking of bookings || []) {
      try {
        const profile = Array.isArray(booking.profiles) 
          ? booking.profiles[0] 
          : booking.profiles;

        if (!profile?.phone_number) {
          console.log(`[WhatsApp Cron] Skipping booking ${booking.id} - no phone number`);
          continue;
        }

        // Calculate days until check-in
        const checkInDate = new Date(booking.check_in);
        const daysUntil = Math.ceil(
          (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log(`[WhatsApp Cron] Booking ${booking.id} - ${daysUntil} days until check-in`);

        // Send reminders based on timing
        if (daysUntil === 7) {
          // 7 days before: Welcome message
          const result = await sendWelcomeMessage(
            profile.phone_number,
            profile.name || "Guest"
          );

          if (result.success) {
            results.welcomeMessages++;
            console.log(`[WhatsApp Cron] Sent welcome message to ${profile.phone_number}`);
          } else {
            results.errors.push(`Failed to send welcome to ${profile.phone_number}: ${result.error}`);
          }
        } else if (daysUntil === 3 || daysUntil === 1) {
          // 3 days or 1 day before: Reminder
          const result = await sendBookingReminder(profile.phone_number, {
            guestName: profile.name || "Guest",
            checkIn: checkInDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }),
            daysUntil,
          });

          if (result.success) {
            results.upcomingReminders++;
            console.log(`[WhatsApp Cron] Sent reminder to ${profile.phone_number}`);
          } else {
            results.errors.push(`Failed to send reminder to ${profile.phone_number}: ${result.error}`);
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[WhatsApp Cron] Error processing booking ${booking.id}:`, error);
        results.errors.push(`Booking ${booking.id}: ${errorMsg}`);
      }
    }

    console.log("[WhatsApp Cron] Job completed", results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("[WhatsApp Cron] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
