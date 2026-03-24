"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type {
  BookingResult,
  GuestDetails,
  PromoResult,
} from "@/hooks/useBookingWizard";

const BENEFITS = [
  {
    icon: "🎵",
    title: "Custom AI Song",
    desc: "Composed from your Mayan cosmic blueprint",
  },
  {
    icon: "💌",
    title: "Personalized Welcome Letter",
    desc: "Waiting in your room at check-in",
  },
  {
    icon: "🎂",
    title: "Birthday & Anniversary Magic",
    desc: "Surprise setups & private upgrades",
  },
  {
    icon: "🌿",
    title: "Curated Daily Experiences",
    desc: "Itinerary shaped around your energy",
  },
  {
    icon: "🏅",
    title: "Loyalty Rewards",
    desc: "1 point per $1 spent — redeemable on stays",
  },
  {
    icon: "📱",
    title: "WhatsApp Concierge",
    desc: "Transfers, dining & housekeeping pre-arranged",
  },
  {
    icon: "✨",
    title: "Free Magic Is You Access",
    desc: "Dreamweaver subscription during your stay",
  },
  {
    icon: "🔄",
    title: "Priority Rebooking",
    desc: "Exclusive discounts for returning members",
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
  guestDetails: GuestDetails;
  onSetGuestDetails: (d: GuestDetails) => void;
  onAuthComplete: () => void;
  onGuestCheckout: () => void;
  onBack: () => void;
}

export default function StepMagicFamily({
  packageResult,
  checkInDate,
  checkOutDate,
  nights,
  bundleSelected,
  promoResult,
  guestDetails,
  onSetGuestDetails,
  onAuthComplete,
  onGuestCheckout,
  onBack,
}: StepMagicFamilyProps) {
  const { signIn, signUp } = useAuth();

  const [fullName, setFullName] = useState(guestDetails.name);
  const [email, setEmail] = useState(guestDetails.email);
  const [phone, setPhone] = useState(guestDetails.phone);
  const [specialRequests, setSpecialRequests] = useState(
    guestDetails.specialRequests,
  );

  const [signingIn, setSigningIn] = useState(false);
  const [password, setPassword] = useState("");

  const [joinMagic, setJoinMagic] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [musicStyle, setMusicStyle] = useState("Tropical");
  const [birthplace, setBirthplace] = useState("");
  const [optInMagic, setOptInMagic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const baseTotal = bundleSelected
    ? packageResult.curated_package.total
    : packageResult.curated_package.room.room_total;
  const finalTotal =
    promoResult?.valid && promoResult?.discount
      ? Math.max(0, baseTotal - promoResult.discount)
      : baseTotal;

  const nameInvalid = attempted && !fullName.trim();
  const emailInvalid = attempted && (!email.trim() || !email.includes("@"));
  const passwordInvalid = attempted && (signingIn || joinMagic) && !password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setError(null);
    if (!fullName.trim() || !email.trim() || !email.includes("@")) return;
    if ((signingIn || joinMagic) && !password) return;

    onSetGuestDetails({ name: fullName, email, phone, specialRequests });

    setLoading(true);
    try {
      if (signingIn) {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message || "Invalid email or password");
          return;
        }
        onAuthComplete();
      } else if (joinMagic) {
        const { error: err } = await signUp(email, password, fullName, {
          birthday: birthday || null,
          anniversary: anniversary || null,
          music_style: musicStyle,
          birthplace: birthplace || null,
          opt_in_magic: optInMagic,
        } as any);
        if (err) {
          setError(err.message || "Failed to create account");
          return;
        }
        onAuthComplete();
      } else {
        onGuestCheckout();
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading
    ? signingIn
      ? "Signing in..."
      : joinMagic
        ? "Creating your account..."
        : "Continuing..."
    : signingIn
      ? "Sign In & Continue →"
      : joinMagic
        ? "Join The Magic Family & Continue →"
        : "Continue to Checkout →";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Reserve Your Stay
          </h2>
          <p className="text-gray-500 text-sm">
            Enter your details to secure your reservation.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          &larr; Back
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <div className="space-y-4">
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
                  placeholder="Your full name"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    nameInvalid ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {nameInvalid && (
                  <p className="text-xs text-red-500 mt-1">Name is required</p>
                )}
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
                  placeholder="you@example.com"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    emailInvalid ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {emailInvalid && (
                  <p className="text-xs text-red-500 mt-1">
                    Valid email required
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Special Requests{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Dietary restrictions, accessibility, honeymoon, anniversary..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {!joinMagic &&
            (!signingIn ? (
              <button
                type="button"
                onClick={() => {
                  setSigningIn(true);
                  setError(null);
                }}
                className="text-sm text-teal-600 hover:text-teal-800 font-medium underline decoration-dotted underline-offset-2"
              >
                Already a Lina Point member? Sign in
              </button>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    Sign In to Your Account
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSigningIn(false);
                      setPassword("");
                      setError(null);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      passwordInvalid ? "border-red-400" : "border-gray-300"
                    }`}
                  />
                  {passwordInvalid && (
                    <p className="text-xs text-red-500 mt-1">
                      Password is required
                    </p>
                  )}
                </div>
              </div>
            ))}

          {!signingIn && (
            <div
              className={`rounded-2xl border-2 transition-all overflow-hidden ${
                joinMagic
                  ? "border-teal-400 bg-teal-50/40"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setJoinMagic(!joinMagic);
                  setPassword("");
                  setError(null);
                }}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      joinMagic
                        ? "bg-teal-600 border-teal-600"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {joinMagic && (
                      <span className="text-white text-[10px] font-bold">
                        &#10003;
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                      Join The Magic Family
                      <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                        Free
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Create your free account &mdash; unlock 8 exclusive
                      benefits including a personalized song, loyalty rewards
                      &amp; concierge access
                    </p>
                  </div>
                </div>
              </button>

              {joinMagic && (
                <div className="px-4 pb-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {BENEFITS.map((b) => (
                      <div
                        key={b.title}
                        className="flex items-start gap-1.5 bg-white rounded-lg p-2 border border-teal-100"
                      >
                        <span className="text-sm shrink-0">{b.icon}</span>
                        <div>
                          <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                            {b.title}
                          </p>
                          <p className="text-[10px] text-gray-500 leading-snug">
                            {b.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      minLength={6}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        passwordInvalid ? "border-red-400" : "border-gray-300"
                      }`}
                    />
                    {passwordInvalid && (
                      <p className="text-xs text-red-500 mt-1">
                        Password is required to create your account
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold text-teal-800">
                      Personalize your stay{" "}
                      <span className="font-normal text-teal-600">
                        (optional &mdash; powers your custom song &amp;
                        itinerary)
                      </span>
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Birthday
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
                          Anniversary
                        </label>
                        <input
                          type="date"
                          value={anniversary}
                          onChange={(e) => setAnniversary(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Birthplace
                        </label>
                        <input
                          type="text"
                          value={birthplace}
                          onChange={(e) => setBirthplace(e.target.value)}
                          placeholder="City, Country"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Music Style
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
                          Enable Magic content
                        </span>{" "}
                        &mdash; let our team compose your personalized song and
                        welcome letter before your arrival
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-600 text-white text-base font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-300 transition-all shadow-lg"
          >
            {buttonLabel}
          </button>

          {!joinMagic && !signingIn && (
            <p className="text-xs text-center text-gray-400">
              You&apos;ll proceed as a guest. You can always{" "}
              <a
                href="/auth/signup"
                className="text-teal-600 hover:text-teal-800 underline"
              >
                create an account
              </a>{" "}
              after booking.
            </p>
          )}
        </div>

        <div className="lg:col-span-2 order-first lg:order-last">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sticky top-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">
              Your Reservation
            </h3>
            <div className="space-y-2 text-sm">
              <SummaryRow label="Check-in" value={checkInDate} />
              <SummaryRow label="Check-out" value={checkOutDate} />
              <SummaryRow label="Nights" value={String(nights)} />
              <SummaryRow
                label="Package"
                value={bundleSelected ? "Room + Experiences" : "Room Only"}
              />
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-teal-700">${finalTotal} USD</span>
              </div>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
              <p className="text-xs text-teal-800 font-semibold">
                Earn {finalTotal} loyalty points
              </p>
              <p className="text-xs text-teal-600 mt-0.5">
                Join the Magic Family above to unlock rewards on this booking
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
