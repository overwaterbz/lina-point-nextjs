export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10" as any,
});

export async function POST(req: NextRequest) {
  try {
    const limited = checkRateLimit(rateLimitKey(req), 10);
    if (limited) return limited;

    const body = await req.json();
    const {
      tourName,
      tourType, // "tour" | "dinner" | "addon"
      priceUsd,
      guestName,
      guestEmail,
      guestPhone,
      experienceDate,
      guests,
      notes,
    } = body;

    // Validate required fields
    if (!tourName || typeof tourName !== "string") {
      return NextResponse.json(
        { error: "Tour name is required" },
        { status: 400 },
      );
    }
    if (!guestName || typeof guestName !== "string") {
      return NextResponse.json(
        { error: "Guest name is required" },
        { status: 400 },
      );
    }
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }
    if (
      !priceUsd ||
      typeof priceUsd !== "number" ||
      priceUsd <= 0 ||
      priceUsd > 50000
    ) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const amountCents = Math.round(priceUsd * 100);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: `${tourName} — Lina Point Resort`,
      receipt_email: guestEmail,
      metadata: {
        type: "experience",
        tourType: tourType ?? "tour",
        tourName,
        guestName,
        guestEmail,
        guestPhone: guestPhone ?? "",
        experienceDate: experienceDate ?? "",
        guests: String(guests ?? 1),
        notes: notes ?? "",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: any) {
    console.error("[BookExperience] Error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to create booking. Please try again." },
      { status: 500 },
    );
  }
}
