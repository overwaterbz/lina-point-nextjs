"use client";

import { useState, useMemo } from "react";
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

// ---- Square form (wraps Stripe Elements) ----
function SquareForm({
  onSuccess,
  onFallbackToStripe,
}: {
  onSuccess: () => void;
  onFallbackToStripe: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
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
      logClientError("square-checkout", err);
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
      <button
        type="button"
        onClick={onFallbackToStripe}
        className="w-full text-sm text-gray-500 hover:text-gray-700 mt-1"
      >
        Switch to Stripe payment
      </button>
    </form>
  );
}

// ---- Main step component ----

interface StepCheckoutProps {
  packageResult: BookingResult;
  promoResult: PromoResult | null;
  nights: number;
  bundleSelected: boolean;
  guestDetails: GuestDetails;
  paymentOptions: { clientSecret: string } | null;
  paymentMode: "square" | "stripe";
  squareSdkReady: boolean;
  hasSquare: boolean;
  onSetGuestDetails: (details: GuestDetails) => void;
  onHandlePay: (user: any) => Promise<void>;
  onPaymentSuccess: (method: "square" | "stripe") => void;
  onFallbackToStripe: () => Promise<void>;
  onSetSquareSdkReady: (ready: boolean) => void;
  onSetPaymentMode: (mode: "square" | "stripe") => void;
  onBack: () => void;
  user: any;
}

export default function StepCheckout({
  packageResult,
  promoResult,
  nights,
  bundleSelected,
  guestDetails,
  paymentOptions,
  paymentMode,
  squareSdkReady,
  hasSquare,
  onSetGuestDetails,
  onHandlePay,
  onPaymentSuccess,
  onFallbackToStripe,
  onSetSquareSdkReady,
  onSetPaymentMode,
  onBack,
  user,
}: StepCheckoutProps) {
  const [attempted, setAttempted] = useState(false);

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
          {!paymentOptions ? (
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              🔒 Proceed to Payment — ${finalTotal} USD
            </button>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Secure Payment</h3>
                <div className="flex items-center gap-2">
                  {hasSquare && (
                    <button
                      type="button"
                      onClick={() => onSetPaymentMode("square")}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${paymentMode === "square" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      Square
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSetPaymentMode("stripe");
                      if (!paymentOptions) onFallbackToStripe();
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${paymentMode === "stripe" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    Stripe
                  </button>
                </div>
              </div>

              {paymentMode === "square" && hasSquare && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: paymentOptions.clientSecret }}
                >
                  <SquareForm
                    onSuccess={() => onPaymentSuccess("square")}
                    onFallbackToStripe={onFallbackToStripe}
                  />
                </Elements>
              )}

              {paymentMode === "stripe" && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: paymentOptions.clientSecret }}
                >
                  <StripeForm onSuccess={() => onPaymentSuccess("stripe")} />
                </Elements>
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

      {/* Square SDK (loaded lazily) */}
      {hasSquare && (
        <Script
          src={
            process.env.NODE_ENV === "production"
              ? "https://web.squarecdn.com/v1/square.js"
              : "https://sandbox.web.squarecdn.com/v1/square.js"
          }
          strategy="lazyOnload"
          onLoad={() => onSetSquareSdkReady(true)}
        />
      )}
    </div>
  );
}
