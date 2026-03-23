"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { BookingResult, PromoResult } from "@/hooks/useBookingWizard";

const BENEFITS = [
  {
    icon: "🎵",
    title: "Your Custom Song",
    desc: "AI-composed from your Mayan cosmic blueprint — a melody uniquely yours",
  },
  {
    icon: "💌",
    title: "Personalized Welcome Letter",
    desc: "Written just for you, waiting in your room at check-in",
  },
  {
    icon: "🎂",
    title: "Birthday & Anniversary Magic",
    desc: "Surprise setups, private upgrades, and personal celebrations",
  },
  {
    icon: "🌿",
    title: "Curated Daily Experiences",
    desc: "Your itinerary shaped around your cosmic energy and interests",
  },
  {
    icon: "🏅",
    title: "Loyalty Rewards",
    desc: "Earn points every stay — unlock VIP perks, early check-in, and discounts",
  },
  {
    icon: "📱",
    title: "Direct WhatsApp Concierge",
    desc: "Transfers, dining, housekeeping — coordinated before you arrive",
  },
  {
    icon: "✨",
    title: "Free Magic Is You Access",
    desc: "Free Dreamweaver subscription ($19.99/mo value) active throughout your stay",
  },
  {
    icon: "🔄",
    title: "Priority Rebooking",
    desc: "Returning members get exclusive discounts and first-access room reservations",
  },
];

const MUSIC_STYLES = ["Tropical", "EDM", "Reggae", "Calypso", "Ambient"];

interface StepMagicFamilyProps {
  packageResult: BookingResult;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  bundleSelected: boolean;
  promoResult: PromoResult | null;
  onAuthComplete: () => void;
  onGuestCheckout: () => void;
  onBack: () => void;
}

type View = "pitch" | "signup" | "signin" | "guest";

export default function StepMagicFamily({
  packageResult,
  checkInDate,
  checkOutDate,
  nights,
  bundleSelected,
  promoResult,
  onAuthComplete,
  onGuestCheckout,
  onBack,
}: StepMagicFamilyProps) {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>("pitch");

  // Shared auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup-only fields
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [musicStyle, setMusicStyle] = useState("Tropical");
  const [optInMagic, setOptInMagic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived total for booking summary
  const baseTotal = bundleSelected
    ? packageResult.curated_package.total
    : packageResult.curated_package.room.room_total;
  const finalTotal =
    promoResult?.valid && promoResult?.discount
      ? Math.max(0, baseTotal - promoResult.discount)
      : baseTotal;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.message || "Invalid email or password");
        return;
      }
      onAuthComplete();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Name, email, and password are required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signUp(email, password, fullName, {
        birthday: birthday || null,
        anniversary: anniversary || null,
        music_style: musicStyle,
        opt_in_magic: optInMagic,
      } as any);
      if (err) {
        setError(err.message || "Failed to create account");
        return;
      }
      // Proceed to checkout regardless of email-verification status —
      // their Magic access and loyalty points are granted post-payment.
      onAuthComplete();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const headings: Record<View, string> = {
    pitch: "You're Almost There",
    signup: "Join The Magic Family",
    signin: "Welcome Back",
    guest: "Continue as Guest",
  };

  const subtitles: Record<View, string> = {
    pitch:
      "Create your free Lina Point account and unlock a stay designed entirely around you.",
    signup: "Your information creates a stay that's uniquely yours.",
    signin: "Sign in to load your preferences and loyalty rewards.",
    guest:
      "No account needed — we'll email your confirmation to the address you enter next.",
  };

  const goBack = () => {
    setView("pitch");
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">✨</span>
            <h2 className="text-2xl font-bold text-gray-900">
              {headings[view]}
            </h2>
          </div>
          <p className="text-gray-500 text-sm">{subtitles[view]}</p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: booking summary (shown last on mobile, first on desktop) */}
        <div className="lg:col-span-2 order-last lg:order-first">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sticky top-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">
              Your Reservation
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in</span>
                <span className="font-medium">{checkInDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out</span>
                <span className="font-medium">{checkOutDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nights</span>
                <span className="font-medium">{nights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Package</span>
                <span className="font-medium">
                  {bundleSelected ? "Room + Experiences" : "Room Only"}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-teal-700">${finalTotal} USD</span>
              </div>
            </div>

            {view === "pitch" && (
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                <p className="text-xs text-teal-800 font-semibold">
                  🏅 Earn {finalTotal} loyalty points on this booking
                </p>
                <p className="text-xs text-teal-600 mt-0.5">
                  Members earn 1 point per $1 spent, redeemable on future stays
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: pitch or auth view */}
        <div className="lg:col-span-3">
          {/* ── PITCH VIEW ── */}
          {view === "pitch" && (
            <div className="space-y-5">
              {/* Benefits grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {BENEFITS.map((b) => (
                  <div
                    key={b.title}
                    className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-teal-200 hover:shadow-md transition-all"
                  >
                    <div className="text-xl mb-1">{b.icon}</div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {b.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                      {b.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* 3 path cards */}
              <div className="space-y-3 pt-1">
                {/* Primary: Join */}
                <button
                  onClick={() => setView("signup")}
                  className="w-full relative bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-4 text-left transition-all shadow-lg shadow-teal-600/25 ring-2 ring-teal-400/30 animate-pulse"
                >
                  <span className="absolute top-3 right-3 text-xs bg-teal-500/60 text-teal-100 px-2 py-0.5 rounded-full font-semibold">
                    Recommended
                  </span>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🌴</span>
                    <div>
                      <p className="font-bold text-base">
                        Join The Magic Family
                      </p>
                      <p className="text-teal-100 text-sm mt-0.5">
                        Create your free account — unlock all 8 benefits above
                      </p>
                    </div>
                  </div>
                </button>

                {/* Secondary: Sign in */}
                <button
                  onClick={() => setView("signin")}
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl p-4 text-left transition-all hover:border-teal-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔑</span>
                    <div>
                      <p className="font-bold text-sm">Already a Member</p>
                      <p className="text-gray-500 text-sm mt-0.5">
                        Sign in and your preferences are already loaded
                      </p>
                    </div>
                  </div>
                </button>

                {/* Tertiary: Guest */}
                <button
                  onClick={() => setView("guest")}
                  className="w-full text-left px-2 py-2"
                >
                  <span className="text-sm text-gray-400 hover:text-gray-600 transition-colors underline decoration-dotted underline-offset-2">
                    👤 Continue as Guest — just the reservation, no account
                    needed
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── SIGN UP VIEW ── */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-teal-700 hover:text-teal-900 font-medium"
              >
                ← Back to options
              </button>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Min. 6 characters"
                />
              </div>

              {/* Personalization block */}
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-teal-900">
                  ✨ Personalize your experience{" "}
                  <span className="font-normal text-teal-700">
                    (optional — powers your custom song &amp; itinerary)
                  </span>
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      🎂 Birthday
                    </label>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      💍 Anniversary
                    </label>
                    <input
                      type="date"
                      value={anniversary}
                      onChange={(e) => setAnniversary(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    🎵 Music Style
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MUSIC_STYLES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMusicStyle(s)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                          musicStyle === s
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={optInMagic}
                    onChange={(e) => setOptInMagic(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs text-gray-700">
                    <span className="font-semibold">
                      ✨ Enable Magic content
                    </span>{" "}
                    — let our AI compose your personalized song and welcome
                    letter before your arrival
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-300 transition-all"
              >
                {loading ? "Creating your account…" : "Join The Magic Family →"}
              </button>

              <p className="text-xs text-center text-gray-500">
                Already a member?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setError(null);
                  }}
                  className="text-teal-600 hover:text-teal-800 font-medium underline"
                >
                  Sign in instead
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN IN VIEW ── */}
          {view === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-teal-700 hover:text-teal-900 font-medium"
              >
                ← Back to options
              </button>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Your password"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-300 transition-all"
              >
                {loading ? "Signing in…" : "Sign In & Continue →"}
              </button>

              <p className="text-xs text-center text-gray-500">
                New to Lina Point?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("signup");
                    setError(null);
                  }}
                  className="text-teal-600 hover:text-teal-800 font-medium underline"
                >
                  Join the Magic Family
                </button>
              </p>
            </form>
          )}

          {/* ── GUEST VIEW ── */}
          {view === "guest" && (
            <div className="space-y-5">
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-teal-700 hover:text-teal-900 font-medium"
              >
                ← Back to options
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Continuing as Guest
                </p>
                <p className="text-sm text-amber-700">
                  Your booking confirmation will be sent to the email you enter
                  on the next screen. No Lina Point account will be created.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700 mb-1.5">
                  What you&apos;ll miss without a Lina Point account:
                </p>
                {BENEFITS.slice(0, 4).map((b) => (
                  <div
                    key={b.title}
                    className="flex items-center gap-2 text-xs text-gray-400"
                  >
                    <span>○</span>
                    <span>
                      {b.icon} {b.title}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-gray-400 italic pt-0.5">
                  + 4 more Magic Family benefits
                </p>
              </div>

              <p className="text-xs text-center text-gray-500">
                You can always create your account after booking to unlock your
                personalized experience.
              </p>

              <button
                onClick={onGuestCheckout}
                className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all"
              >
                Continue to Payment →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
