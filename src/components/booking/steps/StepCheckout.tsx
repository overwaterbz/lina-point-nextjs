"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Script from "next/script";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { logClientError } from "@/lib/logClientError";
import {
  BookingResult,
  PromoResult,
  GuestDetails,
} from "@/hooks/useBookingWizard";

// ---- Stripe inline checkout form ----
function StripeForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error("Stripe not ready — please refresh.");
      return;
    }
    setLoading(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      } as any);
      if (error) {
        toast.error(`Payment failed: ${error.message}`);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        onSuccess();
      } else {
        toast.error("Payment did not complete. Please try again.");
      }
    } catch (err: any) {
      toast.error(`Payment error: ${err?.message ?? "Unknown error"}`);
      logClientError("stripe-checkout", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-300 transition-all"
      >
        {loading ? "Processing…" : "Confirm & Pay"}
      </button>
    </form>
  );
}

// ---- Square Web Payments SDK card form (PRIMARY) ----
function SquareWebPaymentsForm({
  applicationId,
  amount,
  onSuccess,
  onFallbackToStripe,
}: {
  applicationId: string;
  amount: number;
  onSuccess: () => void;
  onFallbackToStripe: (clientSecret?: string) => void;
}) {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Get Square location ID from server
        const locRes = await fetch("/api/square/location");
        if (!locRes.ok) throw new Error("Square setup failed");
        const { locationId } = await locRes.json();
        if (!locationId) throw new Error("No Square location found");

        // Wait for Square.js SDK to be ready (loaded via Script tag below)
        let attempts = 0;
        while (!(window as any).Square && attempts < 150) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }
        if (!(window as any).Square) throw new Error("Square SDK unavailable");

        const payments = (window as any).Square.payments(
          applicationId,
          locationId,
        );
        const card = await payments.card();

        if (!mounted || !cardContainerRef.current) return;
        await card.attach(cardContainerRef.current);
        cardRef.current = card;
      } catch (err: any) {
        if (!mounted) return;
        setInitError(err.message);
        // Auto-fallback to Stripe if Square can't initialize
        onFallbackToStripe();
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [applicationId]);

  const handlePay = async () => {
    if (!cardRef.current || loading) return;
    setLoading(true);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK") {
        const msg = result.errors?.[0]?.message ?? "Card tokenization failed";
        toast.error(msg);
        return;
      }

      const resp = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "usd",
          metadata: { booking: "lina-point" },
          sourceId: result.token,
          useStripe: false,
        }),
      });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        toast.error(
          (data.error ?? "Square payment failed") + " — switching to Stripe",
        );
        onFallbackToStripe();
        return;
      }

      if (data.processor === "square") {
        onSuccess();
      } else if (data.processor === "stripe" && data.client_secret) {
        // Square failed server-side, auto-fell to Stripe — pass client secret
        onFallbackToStripe(data.client_secret);
      } else {
        onFallbackToStripe();
      }
    } catch (err: any) {
      toast.error((err?.message ?? "Payment error") + " — switching to Stripe");
      logClientError("square-checkout", err);
      onFallbackToStripe();
    } finally {
      setLoading(false);
    }
  };

  if (initError) return null; // Already called onFallbackToStripe

  return (
    <div className="space-y-4">
      {initializing && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
          Loading secure payment form…
        </div>
      )}
      <div
        ref={cardContainerRef}
        id="square-card-container"
        className={initializing ? "hidden" : ""}
      />
      {!initializing && (
        <>
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-300 transition-all"
          >
            {loading ? "Processing…" : "Confirm & Pay"}
          </button>
          <button
            type="button"
            onClick={() => onFallbackToStripe()}
            className="w-full text-sm text-gray-500 hover:text-gray-700 mt-1"
          >
            Switch to Stripe payment
          </button>
        </>
      )}
    </div>
  );
}

// ---- Main step component ----

interface StepCheckoutProps {
  packageResult: BookingResult;
  promoResult: PromoResult | null;
  nights: number;
  bundleSelected: boolean;
  guestMode: boolean;
  guestDetails: GuestDetails;
  paymentOptions: { clientSecret: string } | null;
  paymentMode: "square" | "stripe";
  hasSquare: boolean;
  onSetGuestDetails: (details: GuestDetails) => void;
  onHandlePay: (user: any) => Promise<void>;
  onPaymentSuccess: (method: "square" | "stripe") => void;
  onFallbackToStripe: (clientSecret?: string) => Promise<void>;
  onSetPaymentMode: (mode: "square" | "stripe") => void;
  onBack: () => void;
  user: any;
}

export default function StepCheckout({
  packageResult,
  promoResult,
  nights,
  bundleSelected,
  guestMode,
  guestDetails,
  paymentOptions,
  paymentMode,
  hasSquare,
  onSetGuestDetails,
  onHandlePay,
  onPaymentSuccess,
  onFallbackToStripe,
  onSetPaymentMode,
  onBack,
  user,
}: StepCheckoutProps) {
  const [attempted, setAttempted] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const baseTotal = bundleSelected
    ? packageResult.curated_package.total
    : packageResult.curated_package.room.room_total;
  const finalTotal =
    promoResult?.valid && promoResult?.discount
      ? Math.max(0, baseTotal - promoResult.discount)
      : baseTotal;

  const stripePromise = useMemo(
    () =>
      typeof window !== "undefined" &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        : null,
    [],
  );

  const handleField =
    (field: keyof GuestDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onSetGuestDetails({ ...guestDetails, [field]: e.target.value });
    };

  const handleContinueToPayment = async () => {
    setAttempted(true);
    if (
      !guestDetails.name.trim() ||
      !guestDetails.email.trim() ||
      !guestDetails.email.includes("@")
    ) {
      toast.error("Please enter your name and a valid email address.");
      return;
    }
    setPaymentInitiated(true);
    await onHandlePay(user);
  };

  const nameInvalid = attempted && !guestDetails.name.trim();
  const emailInvalid =
    attempted &&
    (!guestDetails.email.trim() || !guestDetails.email.includes("@"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Complete Your Reservation
          </h2>
          <p className="text-gray-500 text-sm">
            Secure checkout — your card details are encrypted and never stored.
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      {guestMode && !user && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 mt-0.5">👤</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Booking as Guest
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Enter your details below to complete your reservation. You can{" "}
              <a
                href="/auth/signup"
                className="underline font-medium hover:text-amber-900"
              >
                create a free Lina Point account
              </a>{" "}
              after booking to unlock your personalized song, loyalty rewards,
              and concierge access.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: guest form + payment */}
        <div className="lg:col-span-3 space-y-5">
          {/* Guest info card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-gray-900">Your Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={guestDetails.name}
                  onChange={handleField("name")}
                  placeholder="Jane Smith"
                  className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${nameInvalid ? "border-red-400" : "border-gray-200"}`}
                />
                {nameInvalid && (
                  <p className="text-xs text-red-500 mt-1">Name is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={guestDetails.email}
                  onChange={handleField("email")}
                  placeholder="jane@example.com"
                  className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${emailInvalid ? "border-red-400" : "border-gray-200"}`}
                />
                {emailInvalid && (
                  <p className="text-xs text-red-500 mt-1">
                    Valid email required
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={guestDetails.phone}
                  onChange={handleField("phone")}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Special Requests (optional)
              </label>
              <textarea
                value={guestDetails.specialRequests}
                onChange={(e) =>
                  onSetGuestDetails({
                    ...guestDetails,
                    specialRequests: e.target.value,
                  })
                }
                placeholder="Dietary restrictions, accessibility needs, anniversaries, honeymoons…"
                rows={3}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>
          </div>

          {/* Payment section */}
          {!paymentInitiated ? (
            // Step 1: Proceed button (validates guest details first)
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              🔒 Proceed to Payment — ${finalTotal} USD
            </button>
          ) : paymentMode === "square" && !paymentOptions ? (
            // Step 2a: Square Web Payments card form (PRIMARY)
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Secure Payment</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  Square
                </span>
              </div>
              <SquareWebPaymentsForm
                applicationId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID!}
                amount={finalTotal}
                onSuccess={() => onPaymentSuccess("square")}
                onFallbackToStripe={onFallbackToStripe}
              />
            </div>
          ) : !paymentOptions ? (
            // Step 2b: Stripe intent loading
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
              Setting up payment…
            </div>
          ) : (
            // Step 2c: Stripe Elements (fallback or when Square not available)
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Secure Payment</h3>
                <div className="flex items-center gap-2">
                  {hasSquare && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetPaymentMode("square");
                        setPaymentInitiated(false); // reset to re-init Square
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        paymentMode === "square"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Square
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSetPaymentMode("stripe")}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      paymentMode === "stripe"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Stripe
                  </button>
                </div>
              </div>
              {stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: paymentOptions.clientSecret }}
                >
                  <StripeForm onSuccess={() => onPaymentSuccess("stripe")} />
                </Elements>
              ) : (
                <div className="text-sm text-red-500 bg-red-50 rounded-xl p-3">
                  <p className="font-semibold mb-1">Stripe not configured</p>
                  <p>
                    Please contact us at{" "}
                    <a href="mailto:info@linapoint.com" className="underline">
                      info@linapoint.com
                    </a>{" "}
                    to complete your booking.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: order summary sidebar */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 sticky top-6">
            <h3 className="font-bold text-gray-900 text-sm">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Room × {nights} night{nights !== 1 ? "s" : ""}
                </span>
                <span className="font-medium">
                  ${packageResult.curated_package.room.room_total}
                </span>
              </div>
              {bundleSelected &&
                packageResult.curated_package.tours.map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600 truncate mr-2">
                      {t.name}
                    </span>
                    <span className="font-medium shrink-0">${t.price}</span>
                  </div>
                ))}
              {bundleSelected &&
                packageResult.curated_package.dinner.price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 truncate mr-2">
                      {packageResult.curated_package.dinner.name}
                    </span>
                    <span className="font-medium shrink-0">
                      ${packageResult.curated_package.dinner.price}
                    </span>
                  </div>
                )}
              {promoResult?.valid && promoResult?.discount && (
                <div className="flex justify-between text-green-600">
                  <span>Promo discount</span>
                  <span>−${promoResult.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${finalTotal} USD</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 pt-1 space-y-1 border-t border-gray-200 mt-2">
              <p>🔒 256-bit SSL encryption</p>
              <p>💯 Best price guaranteed</p>
              <p>
                📧 Confirmation →{" "}
                {guestDetails.email ? (
                  <span className="text-gray-700">{guestDetails.email}</span>
                ) : (
                  "your email"
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Square SDK (loaded eagerly when Square is configured) */}
      {hasSquare && (
        <Script
          src={
            process.env.NODE_ENV === "production"
              ? "https://web.squarecdn.com/v1/square.js"
              : "https://sandbox.web.squarecdn.com/v1/square.js"
          }
          strategy="afterInteractive"
        />
      )}
    </div>
  );
}
