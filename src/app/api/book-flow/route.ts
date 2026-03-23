export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { runPriceScout } from "@/lib/priceScoutAgent";
import { runExperienceCurator } from "@/lib/experienceCuratorAgent";
import type { UserPreferences } from "@/lib/experienceCuratorAgent";
import { randomUUID } from "crypto";
import { createAgentRun, finishAgentRun } from "@/lib/agents/agentRunLogger";
import { generateMagicContent } from "@/lib/magicContent";
import { createReservation } from "@/lib/bookingFulfillment";
import {
  confirmationEmailHtml,
  adminNotificationHtml,
} from "@/lib/emailTemplates";

export const maxDuration = 60; // Vercel Hobby plan max

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

const BookFlowRequestSchema = z.object({
  roomType: z.string().min(2).max(64),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().min(2).max(64),
  groupSize: z.number().int().min(1).max(20),
  tourBudget: z.number().min(0).max(10000),
  interests: z.array(z.string()).optional(),
  activityLevel: z.enum(["low", "medium", "high"]).optional(),
  addOns: z.array(z.string()).optional(),
});
type BookFlowRequest = z.infer<typeof BookFlowRequestSchema>;

interface BookFlowResponse {
  success: boolean;
  beat_price: number;
  beat_price_per_night: number;
  savings_percent: number;
  nights: number;
  curated_package: {
    room: {
      price_per_night: number;
      room_total: number;
      ota: string;
      url: string;
    };
    tours: Array<{
      name: string;
      type: string;
      price: number;
      duration: string;
      affiliateUrl?: string | null;
    }>;
    dinner: {
      name: string;
      price: number;
    };
    total: number;
    affiliate_links: Array<{
      provider: string;
      url: string;
      commission: number;
    }>;
  };
  recommendations: string[];
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<BookFlowResponse>> {
  try {
    // Get user session
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Get and validate request body
    let body: BookFlowRequest;
    try {
      const json = await request.json();
      body = BookFlowRequestSchema.parse(json);
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          beat_price: 0,
          beat_price_per_night: 0,
          savings_percent: 0,
          nights: 0,
          curated_package: {
            room: { price_per_night: 0, room_total: 0, ota: "", url: "" },
            tours: [],
            dinner: { name: "", price: 0 },
            total: 0,
            affiliate_links: [],
          },
          recommendations: [],
          error:
            "Invalid booking request: " +
            (err instanceof z.ZodError
              ? err.errors.map((e) => e.message).join(", ")
              : "Malformed JSON"),
        },
        { status: 400 },
      );
    }

    // If user is authenticated, fetch preferences from profile; else use defaults
    let userPreferences: UserPreferences;
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("interests, activity_level")
        .eq("id", user.id)
        .single();
      userPreferences = {
        interests: body.interests ||
          profile?.interests || ["snorkeling", "dining"],
        activityLevel:
          body.activityLevel || profile?.activity_level || "medium",
        budget:
          body.tourBudget > 500
            ? "luxury"
            : body.tourBudget > 300
              ? "mid"
              : "budget",
      };
    } else {
      userPreferences = {
        interests: body.interests || ["snorkeling", "dining"],
        activityLevel: body.activityLevel || "medium",
        budget:
          body.tourBudget > 500
            ? "luxury"
            : body.tourBudget > 300
              ? "mid"
              : "budget",
      };
    }

    debugLog("[BookFlow] Starting agents for user:", user?.id || "guest");
    debugLog("[BookFlow] Room Query:", body.roomType);
    debugLog("[BookFlow] User Preferences:", userPreferences);

    const requestId = randomUUID();
    // Only log agent runs if user is authenticated
    let priceRunId: string | null = null;
    let curatorRunId: string | null = null;
    const priceRunStart = Date.now();
    const curatorRunStart = Date.now();
    if (user) {
      try {
        priceRunId = await createAgentRun(supabase as any, {
          user_id: user.id,
          agent_name: "price_scout",
          request_id: requestId,
          input: JSON.stringify({
            roomType: body.roomType,
            checkInDate: body.checkInDate,
            checkOutDate: body.checkOutDate,
            location: body.location,
          }) as any,
        });
      } catch (logError) {
        console.warn("[BookFlow] Failed to create PriceScout run:", logError);
      }
      try {
        curatorRunId = await createAgentRun(supabase as any, {
          user_id: user.id,
          agent_name: "experience_curator",
          request_id: requestId,
          input: JSON.stringify({
            userPreferences,
            groupSize: body.groupSize,
            tourBudget: body.tourBudget,
          }) as any,
        });
      } catch (logError) {
        console.warn("[BookFlow] Failed to create Curator run:", logError);
      }
    }

    // Run both agents in parallel with a hard timeout so slow AI calls
    // never cause the overall request to exceed Vercel's 60s limit.
    const agentTimeout = (ms: number) =>
      new Promise<never>((_, reject) => {
        const t = setTimeout(
          () => reject(new Error(`Agent timeout after ${ms}ms`)),
          ms,
        );
        t.unref(); // don't block Node from exiting during tests
      });

    const [priceScoutSettled, curatorSettled] = await Promise.allSettled([
      Promise.race([
        runPriceScout(
          body.roomType,
          body.checkInDate,
          body.checkOutDate,
          body.location,
        ),
        agentTimeout(12000),
      ]),
      Promise.race([
        runExperienceCurator(userPreferences, body.groupSize, body.tourBudget),
        agentTimeout(12000),
      ]),
    ]);

    // Extract results (with fallbacks)
    let priceScoutResult: Awaited<ReturnType<typeof runPriceScout>>;
    if (priceScoutSettled.status === "fulfilled") {
      priceScoutResult = priceScoutSettled.value;
      if (priceRunId) {
        try {
          await finishAgentRun(supabase as any, priceRunId, {
            status: "completed",
            output: JSON.stringify(priceScoutResult) as any,
            duration_ms: Date.now() - priceRunStart,
          });
        } catch (logError) {
          console.warn(
            "[BookFlow] Failed to finalize PriceScout run:",
            logError,
          );
        }
      }
    } else {
      console.error("[BookFlow] PriceScout failed:", priceScoutSettled.reason);
      if (priceRunId) {
        try {
          await finishAgentRun(supabase as any, priceRunId, {
            status: "failed",
            error_message: String(priceScoutSettled.reason),
            duration_ms: Date.now() - priceRunStart,
          });
        } catch (logError) {
          console.warn(
            "[BookFlow] Failed to finalize PriceScout run:",
            logError,
          );
        }
      }
      // Fallback pricing
      priceScoutResult = {
        bestPrice: 250,
        bestOTA: "direct",
        beatPrice: 235,
        savingsPercent: 6,
        savings: 15,
        iterations: 0,
        priceUrl: `https://linapoint.com/book?room_type=${encodeURIComponent(body.roomType)}`,
        allPrices: { direct: 250 },
      };
    }

    let curatorResult: Awaited<ReturnType<typeof runExperienceCurator>>;
    if (curatorSettled.status === "fulfilled") {
      curatorResult = curatorSettled.value;
      if (curatorRunId) {
        try {
          await finishAgentRun(supabase as any, curatorRunId, {
            status: "completed",
            output: JSON.stringify(curatorResult) as any,
            duration_ms: Date.now() - curatorRunStart,
          });
        } catch (logError) {
          console.warn("[BookFlow] Failed to finalize Curator run:", logError);
        }
      }
    } else {
      console.error("[BookFlow] Curator failed:", curatorSettled.reason);
      if (curatorRunId) {
        try {
          await finishAgentRun(supabase as any, curatorRunId, {
            status: "failed",
            error_message: String(curatorSettled.reason),
            duration_ms: Date.now() - curatorRunStart,
          });
        } catch (logError) {
          console.warn("[BookFlow] Failed to finalize Curator run:", logError);
        }
      }
      // Fallback experience
      curatorResult = {
        tours: [],
        dinner: {
          name: "Beachfront Seafood BBQ",
          type: "casual",
          price: 55,
          affiliateUrl: "",
        },
        addons: [],
        totalPrice: 55,
        recommendations: ["Explore the famous Barrier Reef at sunset."],
        affiliateLinks: [],
      };
    }

    debugLog("[BookFlow] PriceScout Result:", priceScoutResult);
    debugLog("[BookFlow] Curator Result:", curatorResult);

    // Save prices to database only if user is authenticated
    if (user) {
      await supabase.from("prices").insert({
        room_type: body.roomType,
        check_in_date: body.checkInDate,
        check_out_date: body.checkOutDate,
        location: body.location,
        ota_name: priceScoutResult.bestOTA,
        price: priceScoutResult.bestPrice,
        beat_price: priceScoutResult.beatPrice,
        url: priceScoutResult.priceUrl,
        user_id: user.id,
      });
    }

    // Only create bookings/reservations if user is authenticated
    let bookingId: string | null = null;
    let reservationId: string | null = null;
    if (user) {
      bookingId = randomUUID();
      // Save tour bookings and attach booking id
      const tourInserts = curatorResult.tours.map((tour: any) => ({
        user_id: user.id,
        booking_id: bookingId,
        tour_name: tour.name,
        tour_type: tour.type,
        price: tour.price,
        affiliate_link: tour.url,
        commission_earned: tour.price * 0.1, // 10% commission
        status: "pending_payment",
      }));

      const { data: tourRows, error: tourInsertError } = await supabase
        .from("tour_bookings")
        .insert(tourInserts)
        .select("id");
      if (tourInsertError) {
        console.warn(
          "[BookFlow] Failed to insert tour_bookings:",
          tourInsertError.message,
        );
      }

      reservationId = tourRows?.[0]?.id || null;

      if (body.addOns?.includes("magic") && reservationId) {
        try {
          const { data: magicProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          await generateMagicContent(
            supabase as any,
            {
              userId: user.id,
              reservationId,
              occasion: "celebration",
              musicStyle: magicProfile?.music_style || undefined,
              userEmail: user.email,
            },
            magicProfile,
          );
        } catch (magicError) {
          console.warn(
            "[BookFlow] Magic content generation failed:",
            magicError,
          );
        }
      }
    }

    // Calculate nights and dining price
    const nights = Math.max(
      1,
      Math.round(
        (new Date(body.checkOutDate).getTime() -
          new Date(body.checkInDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
    const diningTour = curatorResult.tours.find(
      (t: any) => t.type === "dining",
    );
    const diningPrice = diningTour?.price || 85;
    const roomTotal =
      Math.round(priceScoutResult.bestPrice * nights * 100) / 100;
    const packageTotal =
      roomTotal + curatorResult.totalPrice + (diningTour ? 0 : diningPrice);

    // Only create reservation and send emails if user is authenticated
    let confirmationNumber: string | null = null;
    if (user && bookingId) {
      try {
        const reservation = await createReservation(supabase as any, {
          guestId: user.id,
          roomTypeInput: body.roomType,
          checkIn: body.checkInDate,
          checkOut: body.checkOutDate,
          guestsCount: body.groupSize,
          totalAmount: packageTotal,
          bookingId,
          specialRequests: (body as any).specialRequests || undefined,
        });
        confirmationNumber = reservation.confirmationNumber;
        debugLog(`[BookFlow] Reservation created: ${confirmationNumber}`);

        // Log conversion event for self-improvement agent's feedback loop.
        // "booking_conversion" entries let the weekly self-improvement job
        // see which pricing/curation runs led to actual confirmed bookings.
        void (async () => {
          try {
            await supabase.from("agent_runs").insert({
              user_id: user.id,
              agent_name: "booking_conversion",
              status: "success",
              input: JSON.stringify({
                room_type: body.roomType,
                nights,
                total_amount: packageTotal,
                price_scout_run_id: priceRunId,
                curator_run_id: curatorRunId,
              }),
              output: JSON.stringify({
                confirmation_number: confirmationNumber,
                outcome: "converted",
              }),
              duration_ms: 0,
            });
          } catch {
            // Non-fatal — don't break the booking flow
          }
        })();

        // Send confirmation email
        try {
          const { Resend } = await import("resend");
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey && user.email) {
            const resend = new Resend(resendKey);
            const tours = curatorResult.tours
              .filter((t: any) => t.type !== "dining")
              .map((t: any) => ({ name: t.name, price: t.price }));

            await resend.emails.send({
              from:
                process.env.MAGIC_FROM_EMAIL || "reservations@linapoint.com",
              to: user.email,
              subject: `\u{1F334} Booking Confirmed — ${confirmationNumber}`,
              html: confirmationEmailHtml({
                guestName:
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "Guest",
                confirmation: reservation,
                tours,
                dinnerName: diningTour?.name || "Sunset Beachfront Dinner",
                dinnerPrice: diningPrice,
                totalAmount: packageTotal,
                checkIn: body.checkInDate,
                checkOut: body.checkOutDate,
              }),
            });
            debugLog(`[BookFlow] Confirmation email sent to ${user.email}`);

            // Admin notification
            const adminEmails = (process.env.ADMIN_EMAILS || "")
              .split(",")
              .filter(Boolean);
            if (adminEmails.length > 0) {
              await resend.emails.send({
                from:
                  process.env.MAGIC_FROM_EMAIL || "reservations@linapoint.com",
                to: adminEmails,
                subject: `New Booking: ${confirmationNumber} — ${reservation.roomName}`,
                html: adminNotificationHtml({
                  confirmationNumber: reservation.confirmationNumber,
                  guestEmail: user.email || "unknown",
                  roomName: reservation.roomName,
                  checkIn: body.checkInDate,
                  checkOut: body.checkOutDate,
                  nights: reservation.nights,
                  totalAmount: packageTotal,
                  guestsCount: body.groupSize,
                }),
              });
            }
          }
        } catch (emailErr) {
          console.warn("[BookFlow] Email send failed:", emailErr);
        }
      } catch (resErr) {
        console.warn("[BookFlow] Reservation creation failed:", resErr);
        // Don't fail the entire flow — continue with response
      }
    }

    // Compile response
    const response: BookFlowResponse = {
      success: true,
      beat_price: Math.round(priceScoutResult.beatPrice * nights * 100) / 100,
      beat_price_per_night: priceScoutResult.beatPrice,
      savings_percent: priceScoutResult.savingsPercent,
      nights,
      curated_package: {
        room: {
          price_per_night: priceScoutResult.bestPrice,
          room_total: roomTotal,
          ota: priceScoutResult.bestOTA,
          url: priceScoutResult.priceUrl,
        },
        tours: curatorResult.tours
          .filter((t: any) => t.type !== "dining")
          .map((t: any) => ({
            name: t.name,
            type: t.type,
            price: t.price,
            duration: t.duration,
            affiliateUrl: t.affiliateUrl || null,
          })),
        dinner: {
          name: diningTour?.name || "Sunset Beachfront Dinner",
          price: diningPrice,
        },
        total: packageTotal,
        affiliate_links: curatorResult.affiliateLinks,
      },
      recommendations: curatorResult.recommendations,
    };

    // 📊 Track analytics for booking analysis
    const totalAffiliateCommission = curatorResult.affiliateLinks.reduce(
      (sum: number, link: any) => sum + (link.commission || 0),
      0,
    );

    // A/B testing variant selection (based on user ID)
    const experimentVariants = ["control", "variant_a", "variant_b"];
    let experimentVariant = experimentVariants[0];
    if (user && user.id) {
      experimentVariant =
        experimentVariants[user.id.charCodeAt(0) % experimentVariants.length];
    }

    try {
      const { error: analyticsError } = await supabase
        .from("booking_analytics")
        .insert({
          user_id: user?.id ?? null,
          room_type: body.roomType,
          check_in_date: body.checkInDate,
          check_out_date: body.checkOutDate,
          original_price: priceScoutResult.bestPrice,
          original_price_total: roomTotal,
          beat_price: priceScoutResult.beatPrice,
          nights,
          savings_percent: priceScoutResult.savingsPercent,
          best_ota: priceScoutResult.bestOTA,
          selected_tours: curatorResult.tours.map((t: any) => t.name),
          total_cost: response.curated_package.total,
          affiliate_commission: totalAffiliateCommission,
          experiment_variant: experimentVariant,
          grok_used: !!process.env.GROK_API_KEY,
          created_at: new Date(),
        });

      if (analyticsError) {
        console.warn(
          "[BookFlow] Analytics tracking failed:",
          analyticsError.message,
        );
      } else {
        debugLog(
          `[BookFlow] Analytics tracked for user ${user?.id ?? "unknown"}`,
        );
      }
    } catch (analyticsErr) {
      console.warn("[BookFlow] Error saving analytics:", analyticsErr);
      // Don't fail the response if analytics fails
    }

    // Only create PaymentIntent if user is authenticated and booking exists
    let clientSecret: string | null = null;
    if (user && bookingId) {
      try {
        const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
        if (stripeSecret) {
          // Verify that tour_bookings were inserted and belong to this user/booking
          const { data: existingTours, error: existingErr } = await supabase
            .from("tour_bookings")
            .select("id")
            .eq("booking_id", bookingId)
            .eq("user_id", user.id)
            .limit(1);

          if (existingErr) {
            console.warn(
              "[BookFlow] Error checking tour_bookings before creating PaymentIntent:",
              existingErr.message,
            );
          }

          if (existingTours && existingTours.length > 0) {
            const StripeLib = (await import("stripe")).default;
            const stripe = new StripeLib(stripeSecret);

            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(response.curated_package.total * 100),
              currency: "usd",
              metadata: {
                booking_id: bookingId,
                user_id: user.id,
              },
            });

            clientSecret = paymentIntent.client_secret || null;
          } else {
            console.warn(
              "[BookFlow] No tour_bookings found for booking, skipping PaymentIntent creation",
            );
          }
        }
      } catch (stripeErr: any) {
        console.warn(
          "[BookFlow] Stripe PaymentIntent creation failed:",
          stripeErr?.message || stripeErr,
        );
      }
    }

    // Include client_secret and bookingId in response only if user is authenticated
    const responseWithPayment = { ...response } as any;
    if (user && clientSecret) responseWithPayment.client_secret = clientSecret;
    if (user && confirmationNumber)
      responseWithPayment.confirmationNumber = confirmationNumber;
    if (user && bookingId) responseWithPayment.bookingId = bookingId;

    return NextResponse.json(responseWithPayment, { status: 200 });
  } catch (error) {
    console.error("[BookFlow] Error:", error);

    return NextResponse.json(
      {
        success: false,
        beat_price: 0,
        beat_price_per_night: 0,
        savings_percent: 0,
        nights: 0,
        curated_package: {
          room: { price_per_night: 0, room_total: 0, ota: "", url: "" },
          tours: [],
          dinner: { name: "", price: 0 },
          total: 0,
          affiliate_links: [],
        },
        recommendations: [],
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
