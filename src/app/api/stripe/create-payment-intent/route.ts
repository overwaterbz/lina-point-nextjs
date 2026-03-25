export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

const isProd = process.env.NODE_ENV === "production";

// Cache the Square location ID after first lookup
let cachedSquareLocationId: string | null = null;

/**
 * Payment Intent Creation with Dual Processor Support
 * PRIMARY: Square (The Mayan — your main billing system)
 * FALLBACK: Stripe (automatic if Square unavailable)
 */
export async function POST(req: NextRequest) {
  try {
    const limited = checkRateLimit(rateLimitKey(req), 20); // 20 payment intents/min per IP
    if (limited) return limited;

    // Optionally get user for metadata (guests allowed)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const {
      amount,
      currency = "usd",
      metadata,
      useStripe = false,
      sourceId,
    } = body;

    if (
      !amount ||
      typeof amount !== "number" ||
      amount <= 0 ||
      amount > 1000000
    ) {
      return NextResponse.json(
        { error: "Invalid amount (must be between $0.01 and $10,000)" },
        { status: 400 },
      );
    }

    // Try Square first (PRIMARY)
    if (!useStripe) {
      const squareAttempt = await trySquarePayment(
        amount,
        currency,
        { ...metadata, user_id: user?.id ?? "guest" },
        sourceId,
      );
      if (squareAttempt.success) {
        if (!isProd)
          console.log("[Payment] Square payment created successfully");
        return NextResponse.json({
          processor: "square",
          payment_id: squareAttempt.paymentId,
          status: squareAttempt.status,
        });
      }
      if (!isProd)
        console.log(
          "[Payment] Square failed, falling back to Stripe:",
          squareAttempt.error,
        );
    }

    // Fallback to Stripe
    const stripeResult = await tryStripePayment(amount, currency, {
      ...metadata,
      user_id: user?.id ?? "guest",
    });
    if (stripeResult.success) {
      if (!isProd) console.log("[Payment] Stripe payment created as fallback");
      return NextResponse.json({
        client_secret: stripeResult.clientSecret,
        processor: "stripe",
      });
    }

    return NextResponse.json(
      { error: `Both payment processors failed: ${stripeResult.error}` },
      { status: 500 },
    );
  } catch (err: any) {
    if (!isProd) console.error("[Payment] Error:", err);
    return NextResponse.json(
      { error: "Payment processing failed" },
      { status: 500 },
    );
  }
}

/**
 * Resolve Square Location ID (auto-discover "The Mayan" location, cached)
 */
async function getSquareLocationId(client: any): Promise<string | null> {
  if (cachedSquareLocationId) return cachedSquareLocationId;

  try {
    const page = await client.locations.list();
    const locations = page.data || [];
    const active = locations.find((l: any) => l.status === "ACTIVE");
    if (active) {
      cachedSquareLocationId = active.id;
      if (!isProd)
        console.log("[Square] Resolved location:", active.name, active.id);
      return active.id;
    }
  } catch (err) {
    console.error("[Square] Failed to list locations:", err);
  }
  return null;
}

/**
 * Attempt payment via Square (PRIMARY)
 * Uses Square Payments API with a tokenized card nonce from the frontend
 */
async function trySquarePayment(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
  sourceId?: string,
): Promise<{
  success: boolean;
  paymentId?: string;
  status?: string;
  error?: string;
}> {
  try {
    const squareToken = process.env.SQUARE_ACCESS_TOKEN;
    if (!squareToken) {
      return { success: false, error: "Square credentials not configured" };
    }

    if (!sourceId) {
      return {
        success: false,
        error: "No card token (sourceId) provided for Square payment",
      };
    }

    const { SquareClient, SquareEnvironment } = await import("square");
    const client = new SquareClient({
      token: squareToken,
      environment: isProd
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });

    const locationId = await getSquareLocationId(client);
    if (!locationId) {
      return { success: false, error: "Could not resolve Square location" };
    }

    const idempotencyKey = `${metadata?.booking_id || "booking"}-${Date.now()}`;

    const response = await client.payments.create({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: Math.round(amount * 100),
        currency: currency.toUpperCase() as any,
      },
      locationId,
      referenceId: metadata?.booking_id || undefined,
      note: `Lina Point Resort — Booking ${metadata?.booking_id || "direct"}`,
    });

    const payment = response?.payment;
    if (!payment) {
      return { success: false, error: "Square returned no payment object" };
    }

    return {
      success: true,
      paymentId: payment.id,
      status: payment.status,
    };
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.detail || err?.message || "Square payment failed";
    return { success: false, error: message };
  }
}

/**
 * Attempt payment via Stripe (FALLBACK)
 */
async function tryStripePayment(
  amount: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
  try {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return { success: false, error: "Stripe not configured" };
    }

    const StripeLib = (await import("stripe")).default;
    const stripe = new StripeLib(stripeSecret);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { ...metadata, processor: "stripe" },
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret || "",
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
