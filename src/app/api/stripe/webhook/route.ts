export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

/**
 * Payment Webhook Handler
 * Processes events from both Stripe (fallback) and Square (primary)
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  const text = await req.text();

  const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!stripeSecret) {
    console.error("Stripe secret key not configured for webhook");
    return NextResponse.json({ received: false }, { status: 500 });
  }

  const StripeLib = (await import("stripe")).default;
  const stripe = new StripeLib(stripeSecret);

  let event: any;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(text, sig, webhookSecret);
    } else {
      event = JSON.parse(text);
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      const pi = event.data.object;
      debugLog(
        "PaymentIntent succeeded:",
        pi.id,
        "amount:",
        pi.amount,
        "processor:",
        pi.metadata?.processor || "stripe",
      );
      try {
        const bookingId = pi.metadata?.booking_id;
        const processor = pi.metadata?.processor || "stripe";

        if (bookingId) {
          const { createServerSupabaseClient } =
            await import("@/lib/supabase-server");
          const supabase = await createServerSupabaseClient();

          // Idempotency: check if already processed
          const { data: existing } = await supabase
            .from("tour_bookings")
            .select("status")
            .eq("booking_id", bookingId)
            .eq("status", "paid")
            .limit(1);
          if (existing && existing.length > 0) {
            debugLog(`[Webhook] Booking ${bookingId} already paid, skipping`);
            break;
          }

          const { error: updateErr } = await supabase
            .from("tour_bookings")
            .update({
              status: "paid",
              payment_intent: pi.id,
              payment_processor: processor,
            })
            .eq("booking_id", bookingId);

          if (updateErr)
            console.warn(
              "[Webhook] Failed to mark tours paid:",
              updateErr.message,
            );
          else
            debugLog(
              `[Webhook] Marked tour_bookings paid for booking ${bookingId} via ${processor}`,
            );

          // Mark reservation as paid
          const { markReservationPaid } =
            await import("@/lib/bookingFulfillment");
          await markReservationPaid(
            supabase as any,
            bookingId,
            pi.id,
            processor as "square" | "stripe",
          );

          // Send booking confirmation email
          await sendBookingConfirmation(supabase, bookingId, pi.id, processor);
        }
      } catch (webhookErr) {
        console.error(
          "Error handling payment_intent.succeeded webhook:",
          webhookErr,
        );
      }
      break;
    case "payment_intent.payment_failed":
      console.warn(
        "[Webhook] Payment failed:",
        event.data.object.id,
        "processor:",
        event.data.object.metadata?.processor || "stripe",
      );
      break;
    case "charge.refunded":
      try {
        const refundPi = event.data.object.payment_intent;
        if (refundPi) {
          const { createServerSupabaseClient } =
            await import("@/lib/supabase-server");
          const supabase = await createServerSupabaseClient();
          await supabase
            .from("reservations")
            .update({
              payment_status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("payment_id", refundPi);
          debugLog(
            `[Webhook] Marked reservation refunded for payment ${refundPi}`,
          );
        }
      } catch (refundErr) {
        console.error("[Webhook] Refund processing error:", refundErr);
      }
      break;
    default:
      debugLog(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function sendBookingConfirmation(
  supabase: any,
  bookingId: string,
  paymentId: string,
  processor: string,
) {
  try {
    const { data: bookings } = await supabase
      .from("tour_bookings")
      .select("user_id, tour_name, price")
      .eq("booking_id", bookingId);

    if (!bookings?.length) return;

    const userId = bookings[0].user_id;
    const {
      data: { user },
    } = await supabase.auth.admin.getUserById(userId);
    if (!user?.email) return;

    const total = bookings.reduce(
      (sum: number, b: any) => sum + (b.price || 0),
      0,
    );
    const tourList = bookings
      .map((b: any) => `• ${b.tour_name} — $${b.price}`)
      .join("\n");

    const { Resend } = await import("resend");
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;

    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: process.env.MAGIC_FROM_EMAIL || "magic@linapointresort.com",
      to: user.email,
      subject: "🌴 Lina Point Resort — Booking Confirmed!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0d9488;">Booking Confirmed!</h1>
          <p>Thank you for choosing Lina Point Resort. Your payment has been processed via ${processor}.</p>
          <h3>Your Experiences:</h3>
          <pre style="background: #f9fafb; padding: 16px; border-radius: 8px;">${tourList}</pre>
          <p><strong>Total: $${total.toFixed(2)}</strong></p>
          <p style="font-size: 12px; color: #6b7280;">Payment ID: ${paymentId} | Booking: ${bookingId}</p>
          <hr/>
          <p style="color: #6b7280;">Lina Point Resort — San Pedro, Ambergris Caye, Belize<br/>
          BZ +501.632.7767 | reservations@linapoint.com</p>
        </div>
      `,
    });

    debugLog(`[Stripe Webhook] Confirmation email sent to ${user.email}`);
  } catch (err) {
    console.warn("[Stripe Webhook] Email send failed:", err);
  }
}
