"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/resort/Navbar";
import Footer from "@/components/resort/Footer";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import TourOTAComparison from "@/components/TourOTAComparison";

/* ── All bookable experiences data ── */
const ALL_EXPERIENCES = [
  {
    slug: "half-day-snorkeling",
    name: "Half-Day Snorkeling & Coral Reef",
    type: "tour" as const,
    icon: "🤿",
    duration: "4 hours",
    group: 4,
    prices: { budget: 65, mid: 95, luxury: 150 },
    priceLabels: { budget: "Small Group", mid: "Standard", luxury: "Private" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/room-photos/cabana-2br-exterior.jpg",
    description:
      "Explore the pristine barrier reef teeming with marine life — the largest living reef in the Western Hemisphere.",
  },
  {
    slug: "guided-sport-fishing",
    name: "Guided Sport Fishing Adventure",
    type: "tour" as const,
    icon: "🎣",
    duration: "6 hours",
    group: 2,
    prices: { budget: 250, mid: 350, luxury: 500 },
    priceLabels: {
      budget: "Shared",
      mid: "Semi-Private",
      luxury: "Private Charter",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-64.jpg",
    description:
      "Catch tarpon, permit, or bonefish with expert local guides on a world-class fishing excursion.",
  },
  {
    slug: "mainland-jungle-ruins",
    name: "Mainland Jungle & Mayan Ruins",
    type: "tour" as const,
    icon: "🏛️",
    duration: "8 hours",
    group: 6,
    prices: { budget: 75, mid: 120, luxury: 200 },
    priceLabels: {
      budget: "Group Tour",
      mid: "Small Group",
      luxury: "Private Guide",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-39.jpg",
    description:
      "Visit ancient Mayan ruins and explore the jungle canopy on the mainland.",
  },
  {
    slug: "cenote-swimming",
    name: "Cenote Swimming & Cave Exploration",
    type: "tour" as const,
    icon: "🌊",
    duration: "5 hours",
    group: 8,
    prices: { budget: 80, mid: 130, luxury: 180 },
    priceLabels: { budget: "Group", mid: "Small Group", luxury: "Private" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/spa-5.jpg",
    description:
      "Swim in crystal-clear underground cenotes and explore ancient cave systems.",
  },
  {
    slug: "mangrove-kayaking",
    name: "Mangrove Kayaking & Wildlife",
    type: "tour" as const,
    icon: "🛶",
    duration: "3 hours",
    group: 4,
    prices: { budget: 50, mid: 85, luxury: 140 },
    priceLabels: {
      budget: "Group",
      mid: "Small Group",
      luxury: "Private Guide",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-3-scaled.jpg",
    description:
      "Paddle through lush mangroves, spot crocodiles, exotic birds, and manatees.",
  },
  {
    slug: "scuba-blue-hole",
    name: "Scuba Diving — Blue Hole Day Trip",
    type: "tour" as const,
    icon: "🐙",
    duration: "8 hours",
    group: 6,
    prices: { budget: 180, mid: 280, luxury: 450 },
    priceLabels: {
      budget: "Group Dive",
      mid: "Semi-Private",
      luxury: "Private Boat",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-4-1-scaled.jpg",
    description:
      "Dive the world-famous Great Blue Hole, a UNESCO World Heritage Site over 400 feet deep.",
  },
  {
    slug: "island-hopping",
    name: "Island Hopping & Beach Picnic",
    type: "tour" as const,
    icon: "🏝️",
    duration: "6 hours",
    group: 8,
    prices: { budget: 55, mid: 95, luxury: 150 },
    priceLabels: {
      budget: "Group",
      mid: "Small Group",
      luxury: "Private Charter",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/day-view.jpg",
    description:
      "Visit multiple islands around Ambergris Caye with a gourmet beach lunch on a pristine sandbar.",
  },
  {
    slug: "beachfront-bbq",
    name: "Beachfront Seafood BBQ",
    type: "dinner" as const,
    icon: "🔥",
    duration: "Evening",
    group: 10,
    prices: { budget: 35, mid: 55, luxury: 85 },
    priceLabels: {
      budget: "Per Person",
      mid: "Per Person (premium)",
      luxury: "Private Dining",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/conch-21-1.jpg",
    description:
      "Fresh grilled fish, lobster, and conch right on the beach with tropical sides and live music.",
  },
  {
    slug: "overwater-dining",
    name: "Candlelit Overwater Dining",
    type: "dinner" as const,
    icon: "🕯️",
    duration: "Evening",
    group: 2,
    prices: { budget: 75, mid: 120, luxury: 200 },
    priceLabels: {
      budget: "Per Person",
      mid: "Per Person (chef's tasting)",
      luxury: "Full Private Dinner",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/night-view.jpg",
    description:
      "Private dinner on the dock at sunset — the most romantic dining experience in Belize.",
  },
  {
    slug: "belizean-feast",
    name: "Belizean Traditional Feast",
    type: "dinner" as const,
    icon: "🍲",
    duration: "Evening",
    group: 12,
    prices: { budget: 40, mid: 65, luxury: 110 },
    priceLabels: {
      budget: "Per Person",
      mid: "Per Person (extended)",
      luxury: "Private Event",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/21557862_842375785930679_1662415238731283244_n.jpg",
    description:
      "Authentic Creole and Maya cuisine — a culinary journey through Belize's rich cultural heritage.",
  },
  /* ── Add-ons (flat price, shown without tier picker) ── */
  {
    slug: "private-cabana-rental",
    name: "Private Cabana Rental",
    type: "addon" as const,
    icon: "🏖️",
    duration: "Per Day",
    group: 6,
    prices: { budget: 150, mid: 150, luxury: 150 },
    priceLabels: { budget: "Per Day", mid: "Per Day", luxury: "Per Day" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/day-view.jpg",
    description:
      "Reserve an exclusive private cabana for the day — complete privacy on the water.",
  },
  {
    slug: "spa-massage",
    name: "Spa Massage",
    type: "addon" as const,
    icon: "💆",
    duration: "Per Hour",
    group: 2,
    prices: { budget: 80, mid: 80, luxury: 80 },
    priceLabels: { budget: "Per Hour", mid: "Per Hour", luxury: "Per Hour" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/spa-5.jpg",
    description: "Rejuvenating massage therapy overlooking the Caribbean Sea.",
  },
  {
    slug: "romantic-setup",
    name: "Romantic Setup",
    type: "addon" as const,
    icon: "🌹",
    duration: "Package",
    group: 2,
    prices: { budget: 120, mid: 120, luxury: 120 },
    priceLabels: { budget: "Package", mid: "Package", luxury: "Package" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/night-view.jpg",
    description:
      "Flower petals, candles, champagne, and a curated ambiance for a special moment.",
  },
  {
    slug: "kids-club-activity-pack",
    name: "Kids Club Activity Pack",
    type: "addon" as const,
    icon: "🎨",
    duration: "4 Activities",
    group: 8,
    prices: { budget: 60, mid: 60, luxury: 60 },
    priceLabels: {
      budget: "4 Activities",
      mid: "4 Activities",
      luxury: "4 Activities",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-3-scaled.jpg",
    description:
      "A curated bundle of fun, age-appropriate activities for younger guests.",
  },
  {
    slug: "sunrise-yoga-class",
    name: "Sunrise Yoga Class",
    type: "addon" as const,
    icon: "🧘",
    duration: "Per Session",
    group: 10,
    prices: { budget: 40, mid: 40, luxury: 40 },
    priceLabels: {
      budget: "Per Session",
      mid: "Per Session",
      luxury: "Per Session",
    },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-2-scaled.jpg",
    description:
      "Start your day with a guided sunrise yoga practice on the resort deck.",
  },
  {
    slug: "bakery-delivery",
    name: "Bakery Delivery",
    type: "addon" as const,
    icon: "🥐",
    duration: "Daily",
    group: 6,
    prices: { budget: 25, mid: 25, luxury: 25 },
    priceLabels: { budget: "Daily", mid: "Daily", luxury: "Daily" },
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/conch-21-1.jpg",
    description:
      "Fresh-baked pastries and breads delivered to your cabana each morning.",
  },
];

// Slug map for OTA comparison — matches tourScoutAgent + API route
const TOUR_SLUG_MAP: Record<string, string> = {
  "half-day-snorkeling": "half-day-snorkeling",
  "guided-sport-fishing": "guided-sport-fishing",
  "mainland-jungle-ruins": "mainland-jungle-ruins",
  "cenote-swimming": "cenote-swimming",
  "mangrove-kayaking": "mangrove-kayaking",
  "scuba-blue-hole": "scuba-blue-hole",
  "island-hopping": "island-hopping",
};

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ── Stripe payment form ── */
function PaymentForm({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: () => void;
}) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full py-4 bg-cyan-700 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition"
      >
        {paying ? "Processing…" : "Complete Booking"}
      </button>
    </form>
  );
}

/* ── Booking form (step 1) ── */
function BookingFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tourSlug = searchParams.get("tour") ?? "";
  const experience =
    ALL_EXPERIENCES.find((e) => e.slug === tourSlug) ??
    ALL_EXPERIENCES.find((e) =>
      e.name.toLowerCase().includes(tourSlug.toLowerCase()),
    );

  const [tier, setTier] = useState<"budget" | "mid" | "luxury">("mid");
  const [otaBestPrice, setOtaBestPrice] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(getTomorrow());
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  const [clientSecret, setClientSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [stripePromise] = useState(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    return key ? loadStripe(key) : null;
  });

  // Fetch OTA best price for tour types so checkout uses the OTA-beater price
  useEffect(() => {
    if (!experience || experience.type !== "tour") return;
    const slug = TOUR_SLUG_MAP[experience.slug] ?? experience.slug;
    fetch(`/api/tour-ota-prices?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ourBestPrice) setOtaBestPrice(d.ourBestPrice);
      })
      .catch(() => {
        /* keep fallback mid-tier price */
      });
  }, [experience?.slug]);

  if (!experience) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="text-gray-500 mb-4">Experience not found.</p>
        <Link
          href="/experiences"
          className="text-cyan-700 font-semibold hover:underline"
        >
          ← Back to Experiences
        </Link>
      </div>
    );
  }

  // For tour types: prefer the live OTA-beater price; fall back to mid-tier static
  const isTour = experience.type === "tour";
  const basePrice = isTour
    ? (otaBestPrice ?? experience.prices.mid)
    : experience.prices[tier];
  const price = basePrice;
  const totalPrice = price * guests;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/book-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourName: experience.name,
          tourType: experience.type,
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
          data.error ?? "Failed to create booking. Please try again.",
        );
        setSubmitting(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch {
      setFormError(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Booking Confirmed!
        </h2>
        <p className="text-gray-600 mb-1">
          <strong>{experience.name}</strong> on{" "}
          {new Date(date + "T12:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="text-gray-600 mb-8">
          A confirmation has been sent to <strong>{email}</strong>.
        </p>

        {/* Room add-on CTA */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 mb-4 text-left">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🏝️</span>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Make it a full getaway — add a room
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Stay overwater at Lina Point and wake up to the Caribbean reef
                steps from your door. Book direct for our best price — no OTA
                fees.
              </p>
              <Link
                href="/booking"
                className="inline-block px-6 py-2.5 bg-teal-700 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition"
              >
                Book a Room &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Magic Is You CTA */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-start gap-4">
            <span className="text-3xl">✨</span>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                Join Magic Is You — earn rewards
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Create your free account to earn loyalty points on every
                experience and stay, unlock member discounts, and get a
                personalized Lina Point experience.
              </p>
              <Link
                href={`/auth/signup?returnTo=/experiences&ref=experience-booking`}
                className="inline-block px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-500 transition"
              >
                Create Free Account &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
        <Link href="/experiences" className="hover:text-cyan-700 transition">
          Experiences
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{experience.name}</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src={experience.image}
              alt={experience.name}
              className="w-full aspect-video object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/images/fallback-experience.jpg";
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{experience.icon}</span>
              <h1 className="text-xl font-bold text-gray-900">
                {experience.name}
              </h1>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {experience.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full font-medium">
                ⏱ {experience.duration}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
                👥 Group &amp; private available
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium capitalize">
                {experience.type === "dinner" ? "🍽 Dining" : "🗺 Tour"}
              </span>
            </div>
          </div>

          {/* Price summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
              Your Total
            </p>
            <p className="text-3xl font-bold text-green-800">${totalPrice}</p>
            <p className="text-sm text-green-600">
              ${price} × {guests} guest{guests !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Right: Form or Payment */}
        <div className="lg:col-span-3">
          {step === "form" ? (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">
                Book Your Experience
              </h2>

              {/* OTA comparison for tours — tier picker for dinners — hidden for add-ons */}
              {experience.type === "tour" && (
                <TourOTAComparison
                  tourSlug={TOUR_SLUG_MAP[experience.slug] ?? experience.slug}
                  tourName={experience.name}
                  fallbackPrice={experience.prices.mid}
                />
              )}

              {experience.type === "dinner" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Dining Experience
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(["budget", "mid", "luxury"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTier(t)}
                        className={`p-3 rounded-xl border-2 text-center transition ${
                          tier === t
                            ? "border-cyan-600 bg-cyan-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="text-xs text-gray-500 mb-1">
                          {experience.priceLabels[t]}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          ${experience.prices[t]}
                        </p>
                        <p className="text-[10px] text-gray-400">per person</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date + Guests */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Experience Date
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Number of Guests
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-semibold">
                      {guests}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => g + 1)}
                      className="px-4 py-3 text-gray-500 hover:bg-gray-100 text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Guest info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Your Details
                </h3>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional, for WhatsApp coordination)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <textarea
                  placeholder="Special requests, dietary requirements, accessibility needs…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-cyan-700 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition shadow-lg"
              >
                {submitting
                  ? "Preparing Payment…"
                  : `Continue to Payment — $${totalPrice}`}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Secure payment powered by Stripe · No account required
              </p>
              <p className="text-xs text-center text-gray-500">
                Want to save your booking &amp; earn rewards?{" "}
                <Link
                  href={`/auth/signup?returnTo=/experiences/book?tour=${encodeURIComponent(tourSlug)}&type=${experience.type}`}
                  className="text-cyan-700 hover:underline font-medium"
                >
                  Create a free account
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                <button
                  onClick={() => setStep("form")}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
                <p className="font-semibold">{experience.name}</p>
                <p className="text-gray-500">
                  {new Date(date + "T12:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {guests} guest{guests !== 1 ? "s" : ""}
                </p>
                <p className="text-lg font-bold text-cyan-700 mt-2">
                  ${totalPrice} USD
                </p>
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={() => setStep("success")}
                />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
        <BookingFormInner />
      </Suspense>
      <Footer />
    </main>
  );
}
