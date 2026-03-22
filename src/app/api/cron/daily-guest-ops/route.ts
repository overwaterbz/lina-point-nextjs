export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/cron/daily-guest-ops
 *
 * Consolidated daily cron that handles:
 * 1. Pre-arrival packets (7 days before check-in)
 * 2. 48-hour pre-arrival follow-up
 * 3. During-stay morning greetings
 * 4. Auto-checkout & housekeeping
 * 5. Auto check-in
 * 6. Pre-arrival inspections
 * 7. Post-checkout follow-up & intelligence update
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  findUpcomingArrivals,
  generatePreArrivalPacket,
  sendPreArrivalPacket,
} from "@/lib/agents/preArrivalAgent";
import {
  updateGuestIntelligence,
  logInteraction,
} from "@/lib/agents/guestIntelligenceAgent";
import { generateUpsellOffers, sendUpsellOffer } from "@/lib/upsellEngine";
import { runPostStayFlow } from "@/lib/agents/postStayLoyaltyAgent";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { verifyCronSecret } from "@/lib/cronAuth";
import type { RoomType } from "@/lib/inventory";

export async function GET(request: NextRequest) {
  try {
    const denied = verifyCronSecret(request.headers.get("authorization"));
    if (denied) return denied;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const results = {
      preArrival: { sent: 0, errors: 0 },
      followUp48h: { sent: 0, errors: 0 },
      upsells: { offered: 0 },
      morningGreeting: { sent: 0, errors: 0 },
      autoCheckout: { processed: 0, housekeeping: 0 },
      autoCheckin: { processed: 0 },
      inspections: { created: 0 },
      postCheckout: { processed: 0, loyalty: 0, reviewsSent: 0 } as Record<
        string,
        number
      >,
    };

    // ── 1. Pre-arrival packets (7 days out) ─────────────────
    const arrivals = await findUpcomingArrivals(supabase, 7);

    for (const res of arrivals) {
      try {
        // Check if already sent
        const { data: existing } = await supabase
          .from("pre_arrival_packets")
          .select("id")
          .eq("reservation_id", res.id)
          .maybeSingle();

        if (existing) continue;

        const packet = await generatePreArrivalPacket(supabase, res);

        // Get guest contact info
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, full_name")
          .eq("user_id", res.guest_id)
          .maybeSingle();

        // Get email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(
          res.guest_id,
        );
        const email = authUser?.user?.email || null;

        await sendPreArrivalPacket(
          supabase,
          packet,
          profile?.phone_number || null,
          email,
        );
        results.preArrival.sent++;

        // Generate and send one upsell offer with the pre-arrival packet
        try {
          const nights = Math.round(
            (new Date(res.check_out_date).getTime() -
              new Date(res.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          const offers = await generateUpsellOffers(supabase, {
            userId: res.guest_id,
            reservationId: res.id,
            roomType: (res.room_type || "suite_1st_floor") as RoomType,
            checkIn: res.check_in_date,
            checkOut: res.check_out_date,
            nights,
          });
          if (offers.length > 0 && profile?.phone_number) {
            const topOffer = offers[0];
            await sendUpsellOffer(supabase, topOffer, {
              reservationId: res.id,
              userId: res.guest_id,
            });
            await sendWhatsAppMessage(
              profile.phone_number,
              topOffer.whatsAppPitch,
            );
            results.upsells.offered++;
          }
        } catch (upsellErr) {
          console.error(
            `[DailyGuestOps] Upsell error for ${res.id}:`,
            upsellErr,
          );
        }
      } catch (err) {
        console.error(`[DailyGuestOps] Pre-arrival error for ${res.id}:`, err);
        results.preArrival.errors++;
      }
    }

    // ── 2. 48-hour pre-arrival follow-up ──────────────────
    const arrivals48h = await findUpcomingArrivals(supabase, 2);

    for (const res of arrivals48h) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, full_name")
          .eq("user_id", res.guest_id)
          .maybeSingle();

        if (!profile?.phone_number) continue;

        // Only send if not already messaged in last 24h
        const oneDayAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: recentMsg } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("phone_number", profile.phone_number)
          .eq("direction", "outbound")
          .gte("created_at", oneDayAgo)
          .limit(1);

        if (recentMsg && recentMsg.length > 0) continue;

        const firstName = profile.full_name?.split(" ")[0] || "there";
        const roomLabel = (res.room_type || "room").replace(/_/g, " ");
        const msg = `Hi ${firstName}! 🌊 Your Lina Point stay is just 2 days away! Your ${roomLabel} is being prepared. Any last-minute requests or questions? Just reply here — I'm Maya, your AI concierge. 🌴`;

        await sendWhatsAppMessage(profile.phone_number, msg);
        results.followUp48h.sent++;
      } catch (err) {
        console.error(
          `[DailyGuestOps] 48h follow-up error for ${res.id}:`,
          err,
        );
        results.followUp48h.errors++;
      }
    }

    // ── 3. During-stay morning greetings ────────────────────
    const today = new Date().toISOString().split("T")[0];

    const { data: inHouseGuests } = await supabase
      .from("reservations")
      .select("id, guest_id, check_in_date, check_out_date, room_type")
      .eq("status", "confirmed")
      .lte("check_in_date", today)
      .gt("check_out_date", today);

    for (const stay of inHouseGuests || []) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, full_name, ai_preferences")
          .eq("user_id", stay.guest_id)
          .maybeSingle();

        if (!profile?.phone_number) continue;

        // Only send once per day — check recent outbound
        const oneDayAgo = new Date(
          Date.now() - 24 * 60 * 60 * 1000,
        ).toISOString();
        const { data: recentMsg } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("phone_number", profile.phone_number)
          .eq("direction", "outbound")
          .gte("created_at", oneDayAgo)
          .limit(1);

        // Skip if we already messaged today
        if (recentMsg && recentMsg.length > 0) continue;

        const dayNumber =
          Math.floor(
            (new Date(today).getTime() -
              new Date(stay.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1;

        const firstName = profile.full_name?.split(" ")[0] || "there";
        const aiPrefs = (profile.ai_preferences as any) || {};
        const interests = aiPrefs.activityInterests || [];

        let tip = "Enjoy complementary kayaks and paddleboards!";
        if (interests.includes("snorkeling"))
          tip = "Great snorkeling conditions today at Hol Chan!";
        if (interests.includes("fishing"))
          tip = "Fishing charters still have morning slots.";
        if (interests.includes("diving"))
          tip = "Dive shop opens at 7:30 AM for gear rentals.";

        const greeting = `Good morning ${firstName}! ☀️ Day ${dayNumber} of your stay. ${tip} Need anything? Just reply here.`;

        await sendWhatsAppMessage(profile.phone_number, greeting);
        results.morningGreeting.sent++;
      } catch (err) {
        console.error(
          `[DailyGuestOps] Morning greeting error for ${stay.id}:`,
          err,
        );
        results.morningGreeting.errors++;
      }
    }

    // ── 4. Auto-checkout & housekeeping tasks ─────────────────
    // Mark as checked_out + create turnover housekeeping tasks
    const { data: departures } = await supabase
      .from("reservations")
      .select(
        "id, guest_id, room_id, total_amount, check_out_date, confirmation_number",
      )
      .eq("check_out_date", today)
      .in("status", ["confirmed", "checked_in"]);

    for (const res of departures || []) {
      try {
        // Transition to checked_out
        await supabase
          .from("reservations")
          .update({
            status: "checked_out",
            updated_at: new Date().toISOString(),
          })
          .eq("id", res.id);

        // Create turnover housekeeping task
        if (res.room_id) {
          await supabase.from("housekeeping_tasks").insert({
            room_id: res.room_id,
            date: today,
            task_type: "turnover",
            status: "pending",
            priority: "high",
            notes: `Auto-created: checkout ${res.confirmation_number}`,
          });
          results.autoCheckout.housekeeping++;
        }

        results.autoCheckout.processed++;
      } catch (err) {
        console.error(
          `[DailyGuestOps] Auto-checkout error for ${res.id}:`,
          err,
        );
      }
    }

    // ── 5. Auto check-in ────────────────────────────────────
    // Transition confirmed reservations arriving today to checked_in
    const { data: arrivals2 } = await supabase
      .from("reservations")
      .select("id")
      .eq("check_in_date", today)
      .eq("status", "confirmed")
      .eq("payment_status", "paid");

    const autoCheckins = 0;
    for (const res of arrivals2 || []) {
      await supabase
        .from("reservations")
        .update({ status: "checked_in", updated_at: new Date().toISOString() })
        .eq("id", res.id);
      results.autoCheckin.processed++;

      // Create inspection task for arriving room
    }

    // ── 6. Create inspection tasks for tomorrow's arrivals ──
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: tomorrowArrivals } = await supabase
      .from("reservations")
      .select("room_id")
      .eq("check_in_date", tomorrowStr)
      .in("status", ["confirmed"]);

    const inspections = 0;
    for (const res of tomorrowArrivals || []) {
      if (res.room_id) {
        // Check if inspection already exists for this room tomorrow
        const { data: existing } = await supabase
          .from("housekeeping_tasks")
          .select("id")
          .eq("room_id", res.room_id)
          .eq("date", tomorrowStr)
          .eq("task_type", "inspection")
          .maybeSingle();

        if (!existing) {
          await supabase.from("housekeeping_tasks").insert({
            room_id: res.room_id,
            date: tomorrowStr,
            task_type: "inspection",
            status: "pending",
            priority: "normal",
            notes: "Auto-created: pre-arrival inspection",
          });
          results.inspections.created++;
        }
      }
    }

    // ── 7. Post-checkout intelligence update ────────────────
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: checkedOut } = await supabase
      .from("reservations")
      .select("id, guest_id, total_amount")
      .eq("check_out_date", yesterdayStr)
      .eq("status", "checked_out");

    for (const res of checkedOut || []) {
      try {
        await updateGuestIntelligence(supabase, res.guest_id);
        await logInteraction(supabase, {
          userId: res.guest_id,
          type: "checkout",
          channel: "system",
          summary: "Post-checkout intelligence profile updated",
          sentiment: "neutral",
          reservationId: res.id,
        });

        // Run post-stay loyalty flow: points, review request, referral offer
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_number, full_name")
          .eq("user_id", res.guest_id)
          .maybeSingle();

        const { data: authUser } = await supabase.auth.admin.getUserById(
          res.guest_id,
        );

        try {
          const postStay = await runPostStayFlow(supabase, {
            guestId: res.guest_id,
            reservationId: res.id,
            guestName: profile?.full_name || "Guest",
            phone: profile?.phone_number || null,
            email: authUser?.user?.email || null,
            totalAmount: Number(res.total_amount) || 0,
          });
          results.postCheckout.loyalty =
            (results.postCheckout.loyalty || 0) + postStay.pointsAccrued;
          results.postCheckout.reviewsSent =
            (results.postCheckout.reviewsSent || 0) +
            (postStay.reviewSent ? 1 : 0);
        } catch (loyaltyErr) {
          console.error(
            `[DailyGuestOps] Post-stay loyalty error for ${res.id}:`,
            loyaltyErr,
          );
        }

        results.postCheckout.processed++;
      } catch (err) {
        console.error(
          `[DailyGuestOps] Post-checkout error for ${res.id}:`,
          err,
        );
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DailyGuestOps] Cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cron failed",
      },
      { status: 500 },
    );
  }
}
