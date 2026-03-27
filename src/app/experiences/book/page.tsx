"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { EXPERIENCES } from "@/lib/experiencesData";

/* ───── Helpers ───── */
function parseBasePrice(raw: string): number {
  const parts = raw.split("\n").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const m = last.match(/\$(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ───── Payment Form ───── */
function PaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError("");

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeErr) {
      setError(stripeErr.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full py-4 bg-cyan-700 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition shadow-md"
      >
        {paying ? "Processing…" : "Confirm & Pay"}
      </button>
      <p className="text-xs text-center text-gray-400">
        Payments are secured by Stripe. Your card details are never stored.
      </p>
    </form>
  );
}

/* ───── Step Indicator ───── */
function StepIndicator({ currentStep }: { currentStep: "details" | "pay" }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {(["details", "pay"] as const).map((s, idx) => (
        <div key={s} className="flex items-center gap-2">
          {idx > 0 && <div className="w-10 h-px bg-gray-200" />}
          <div
            className={`flex items-center gap-2 text-sm font-semibold ${
              currentStep === s ? "text-cyan-700" : "text-gray-400"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                currentStep === s
                  ? "border-cyan-700 bg-cyan-700 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {idx + 1}
            </span>
            {s === "details" ? "Your Details" : "Payment"}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── Summary Component ───── */
interface SummaryProps {
  experience: any; // TODO: Replace with proper type later
  date: string;
  guests: number;
  basePrice: number;
  totalPrice: number;
  parsedDuration: string;
}

function Summary({
  experience,
  date,
  guests,
  basePrice,
  totalPrice,
  parsedDuration,
}: SummaryProps) {
  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 lg:sticky lg:top-6">
      <div className="relative w-full aspect-video">
        <Image
          src={experience.image}
          alt={experience.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
      <div className="p-5">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-cyan-700 mb-2">
          {experience.description}
        </p>
        <h2 className="font-bold text-gray-900 text-base leading-snug mb-4">
          {experience.title}
        </h2>
        <div className="space-y-1.5 text-sm text-gray-600">
          <p>
            📅{" "}
            {new Date(date + "T12:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p>
            👥 {guests} guest{guests !== 1 ? "s" : ""}
          </p>
          {parsedDuration && <p>⏱ {parsedDuration}</p>}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-gray-500">
              ${basePrice} × {guests} guest{guests !== 1 ? "s" : ""}
            </span>
            <span className="text-2xl font-bold text-green-700">
              ${totalPrice}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            ✓ Best price — booked direct at Lina Point
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Booking Inner ───── */
function BookingPageInner() {
  const searchParams = useSearchParams();
  const tourId = decodeURIComponent(searchParams.get("tour") ?? "");

  const experience =
    EXPERIENCES.find((e) => e.id === tourId) ??
    EXPERIENCES.find(
      (e) => tourId && e.id.toLowerCase().includes(tourId.toLowerCase()),
    );

  // All hooks must be called at the top level, before any early returns
  const basePrice = experience ? parseBasePrice(experience.price) : 0;
  const [step, setStep] = useState<"details" | "pay" | "success">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(getTomorrow());
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [stripePromise] = useState(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return key ? loadStripe(key) : null;
  });

  const totalPrice = basePrice * guests;
  const parsedDuration = experience
    ? (experience.duration.split("\n").filter(Boolean).at(-1) ?? "")
    : "";

  // Early return AFTER all hooks
  if (!experience) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-5xl mb-4">🤔</p>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Experience not found
        </h2>
        <p className="text-gray-500 mb-6 text-sm">
          We couldn&apos;t match that experience. Browse all available
          activities below.
        </p>
        <Link
          href="/experiences"
          className="inline-block px-6 py-3 bg-cyan-700 text-white font-semibold rounded-xl hover:bg-cyan-600 transition text-sm"
        >
          ← Browse Experiences
        </Link>
      </div>
    );
  }

  const handleDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/book-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourName: experience.title,
          tourType: "tour",
          priceUsd: totalPrice,
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          experienceDate: date,
          guests,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        setFormError(
          data.error ?? "Unable to start checkout. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setStep("pay");
    } catch {
      setFormError(
        "Network error. Please check your connection and try again.",
      );
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          You&apos;re all set!
        </h2>
        <p className="text-gray-700 font-semibold text-base mb-1">
          {experience.title}
        </p>
        <p className="text-gray-500 text-sm mb-1">
          {new Date(date + "T12:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          · {guests} guest{guests !== 1 ? "s" : ""}
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Confirmation sent to{" "}
          <span className="text-gray-600 font-medium">{email}</span>
        </p>

        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-3 text-left">
          <h3 className="font-bold text-gray-900 mb-1">
            🏝️ Make it a full getaway
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Stay overwater at Lina Point and wake up to the reef steps from your
            door.
          </p>
          <Link
            href="/booking"
            className="inline-block px-5 py-2.5 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition"
          >
            Book a Room →
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Link
            href="/experiences"
            className="px-8 py-3 bg-cyan-700 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 transition"
          >
            Browse More Experiences
          </Link>
          <Link
            href="/"
            className="px-8 py-3 border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:border-gray-300 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/experiences"
        className="text-sm text-gray-400 hover:text-cyan-700 transition mb-6 inline-block"
      >
        ← Back to Experiences
      </Link>

      <StepIndicator currentStep={step} />

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Summary
            experience={experience}
            date={date}
            guests={guests}
            basePrice={basePrice}
            totalPrice={totalPrice}
            parsedDuration={parsedDuration}
          />
        </div>

        <div className="lg:col-span-3 order-1 lg:order-2">
          {step === "details" && (
            <form onSubmit={handleDetails} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-5">
                Your Details
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={getTomorrow()}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                    Guests
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-xl leading-none select-none"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-bold text-gray-800">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => g + 1)}
                      className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-xl leading-none select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Phone / WhatsApp{" "}
                  <span className="normal-case font-normal text-gray-400">
                    (optional)
                  </span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Special Requests{" "}
                  <span className="normal-case font-normal text-gray-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  placeholder="Dietary requirements, accessibility needs, or anything else we should know…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-cyan-700 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition shadow-md mt-2"
              >
                {submitting
                  ? "Setting up payment…"
                  : `Continue to Payment — $${totalPrice} USD`}
              </button>
            </form>
          )}

          {step === "pay" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                <button
                  onClick={() => setStep("details")}
                  className="text-sm text-gray-400 hover:text-cyan-700 transition"
                >
                  ← Edit details
                </button>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3 text-sm">
                <p className="font-semibold text-gray-900">
                  {experience.title}
                </p>
                <p className="text-cyan-700 mt-0.5">
                  {new Date(date + "T12:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {guests} guest{guests !== 1 ? "s" : ""} ·{" "}
                  <span className="font-bold">${totalPrice} USD</span>
                </p>
              </div>

              {clientSecret && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: "stripe" } }}
                >
                  <PaymentForm onSuccess={() => setStep("success")} />
                </Elements>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Page Export ───── */
export default function ExperienceBookPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        }
      >
        <BookingPageInner />
      </Suspense>
      <Footer />
    </main>
  );
}
