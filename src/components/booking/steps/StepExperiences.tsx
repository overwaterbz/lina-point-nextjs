"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ActivityLevel } from "@/hooks/useBookingWizard";

// ── Tour catalogue ────────────────────────────────────────────────────────────

const TOURS = [
  {
    slug: "half-day-snorkeling",
    name: "Half-Day Snorkeling & Coral Reef",
    cat: "water",
    icon: "🤿",
    desc: "Explore the pristine barrier reef — the largest living reef in the Western Hemisphere.",
    duration: "4 hrs",
    group: 4,
    price: 95,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/greatwhiteshark-19.jpg",
    interest: "snorkeling",
  },
  {
    slug: "guided-sport-fishing",
    name: "Guided Sport Fishing Adventure",
    cat: "water",
    icon: "🎣",
    desc: "Catch tarpon, permit, or bonefish with expert local guides.",
    duration: "6 hrs",
    group: 2,
    price: 350,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-64.jpg",
    interest: "fishing",
  },
  {
    slug: "mainland-jungle-ruins",
    name: "Mainland Jungle & Mayan Ruins",
    cat: "land",
    icon: "🏛️",
    desc: "Visit ancient Mayan ruins and explore the jungle canopy on the mainland.",
    duration: "8 hrs",
    group: 6,
    price: 120,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/LinaPoint-39.jpg",
    interest: "mainland",
  },
  {
    slug: "cenote-swimming",
    name: "Cenote Swimming & Cave Exploration",
    cat: "land",
    icon: "💦",
    desc: "Swim in crystal-clear underground cenotes and explore ancient cave systems.",
    duration: "5 hrs",
    group: 8,
    price: 130,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/spa-5.jpg",
    interest: "cenote",
  },
  {
    slug: "mangrove-kayaking",
    name: "Mangrove Kayaking & Wildlife",
    cat: "water",
    icon: "🛶",
    desc: "Paddle through lush mangroves, spot crocodiles, birds, and manatees.",
    duration: "3 hrs",
    group: 4,
    price: 85,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-3-scaled.jpg",
    interest: "kayaking",
  },
  {
    slug: "scuba-blue-hole",
    name: "Scuba Diving — Blue Hole Day Trip",
    cat: "water",
    icon: "🐙",
    desc: "Dive the world-famous Great Blue Hole, a UNESCO World Heritage Site.",
    duration: "8 hrs",
    group: 6,
    price: 280,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/drone-4-1-scaled.jpg",
    interest: "snorkeling",
  },
  {
    slug: "island-hopping",
    name: "Island Hopping & Beach Picnic",
    cat: "water",
    icon: "🏝️",
    desc: "Visit multiple islands around Ambergris Caye with a gourmet beach lunch.",
    duration: "6 hrs",
    group: 8,
    price: 95,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/day-view.jpg",
    interest: "snorkeling",
  },
];

const DINNERS = [
  {
    slug: "beachfront-bbq",
    name: "Beachfront Seafood BBQ",
    cat: "dining",
    icon: "🔥",
    desc: "Fresh grilled fish, lobster, and conch right on the beach with live music.",
    duration: "Evening",
    group: 10,
    price: 55,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/conch-21-1.jpg",
    interest: "dining",
  },
  {
    slug: "overwater-dining",
    name: "Candlelit Overwater Dining",
    cat: "dining",
    icon: "🕯️",
    desc: "Private dinner on the dock at sunset — the most romantic experience in Belize.",
    duration: "Evening",
    group: 2,
    price: 120,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/night-view.jpg",
    interest: "dining",
  },
  {
    slug: "belizean-feast",
    name: "Belizean Traditional Feast",
    cat: "dining",
    icon: "🍲",
    desc: "Authentic Creole and Maya cuisine — a cultural journey through Belize.",
    duration: "Evening",
    group: 12,
    price: 65,
    image:
      "https://seonmgpsyyzbpcsrzjxi.supabase.co/storage/v1/object/public/LP/21557862_842375785930679_1662415238731283244_n.jpg",
    interest: "dining",
  },
];

const ALL_ITEMS = [...TOURS, ...DINNERS];
type Cat = "all" | "water" | "land" | "dining";

// ── Live OTA price fetcher ────────────────────────────────────────────────────

function useLiveOTAPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch("/api/tour-ota-prices")
      .then((r) => r.json())
      .then((data: Array<{ slug: string; ourBestPrice: number }>) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, number> = {};
        for (const row of data) {
          if (row.slug) map[row.slug] = row.ourBestPrice;
        }
        setPrices(map);
      })
      .catch(() => {});
  }, []);
  return prices;
}

// ── Props (unchanged — BookingWizard.tsx needs no edits) ─────────────────────

interface StepExperiencesProps {
  activityLevel: ActivityLevel;
  tourBudget: number;
  interests: string[];
  isLoading: boolean;
  onSetActivityLevel: (level: ActivityLevel) => void;
  onSetTourBudget: (n: number) => void;
  onToggleInterest: (interest: string) => void;
  onGeneratePackage: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StepExperiences({
  isLoading,
  onToggleInterest,
  onGeneratePackage,
  onSkip,
  onBack,
}: StepExperiencesProps) {
  const [filter, setFilter] = useState<Cat>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const livePrices = useLiveOTAPrices();

  const filtered =
    filter === "all" ? ALL_ITEMS : ALL_ITEMS.filter((t) => t.cat === filter);

  function toggle(slug: string, interest: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
    onToggleInterest(interest);
  }

  const selectedItems = ALL_ITEMS.filter((t) => selected.has(t.slug));
  const totalPerPerson = selectedItems.reduce(
    (s, t) => s + (livePrices[t.slug] ?? t.price),
    0,
  );
  const anyLive = selectedItems.some((t) => livePrices[t.slug] != null);

  const CAT_TABS: { key: Cat; label: string }[] = [
    { key: "all", label: "All" },
    { key: "water", label: "💧 Water" },
    { key: "land", label: "🌿 Land" },
    { key: "dining", label: "🍽️ Dining" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Add Experiences to Your Stay
          </h2>
          <p className="text-gray-500 text-sm">
            Every price beats Viator &amp; GetYourGuide — no OTA commission
            fees.
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {CAT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition ${
              filter === tab.key
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tour / Dining cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isSelected = selected.has(item.slug);
          const livePrice = livePrices[item.slug];
          const price = livePrice ?? item.price;
          const otaPrice = Math.round(price / 0.94);
          const hasLive = livePrice != null;

          return (
            <div
              key={item.slug}
              onClick={() => toggle(item.slug, item.interest)}
              className={`relative rounded-xl border-2 cursor-pointer transition-all overflow-hidden group ${
                isSelected
                  ? "border-teal-500 shadow-lg"
                  : "border-gray-200 hover:border-teal-300"
              }`}
            >
              {/* Photo */}
              <div className="relative h-36 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />

                {/* Duration badge */}
                <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                  {item.duration}
                </span>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}

                {/* Price overlay */}
                <div className="absolute bottom-2 left-2">
                  {hasLive ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white/60 text-[10px] line-through leading-none">
                        Viator ${otaPrice}
                      </span>
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full leading-snug">
                        ✓ Direct ${price}
                      </span>
                    </div>
                  ) : (
                    <span className="bg-white/90 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                      From ${price}/person
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div
                className={`p-3 transition-colors ${
                  isSelected ? "bg-teal-50" : "bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 text-sm leading-snug">
                      {item.name}
                    </h4>
                    <p className="text-gray-500 text-xs mt-0.5 leading-snug line-clamp-2">
                      {item.desc}
                    </p>
                    <div className="flex items-center mt-1.5 gap-2 text-[10px] text-gray-400">
                      <span>👥 Up to {item.group}</span>
                      <Link
                        href={`/experiences/book?tour=${encodeURIComponent(item.slug)}&type=${
                          item.cat === "dining" ? "dinner" : "tour"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto text-teal-600 hover:underline font-semibold"
                      >
                        Details →
                      </Link>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(item.slug, item.interest);
                  }}
                  className={`w-full mt-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                    isSelected
                      ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                      : "bg-teal-600 text-white hover:bg-teal-700"
                  }`}
                >
                  {isSelected
                    ? "✓ Added — tap to remove"
                    : `+ Add to Stay · $${price}/person`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue / AI CTA */}
      {selected.size > 0 ? (
        <div className="bg-teal-600 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-base">
                {selected.size} experience{selected.size !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <p className="text-teal-100 text-sm">
                ~${totalPerPerson}/person
                {anyLive
                  ? " · Live prices — 6% below OTA"
                  : " · Direct booking prices"}
              </p>
            </div>
            <span className="text-3xl">🎉</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {selectedItems.map((t) => (
              <span
                key={t.slug}
                className="bg-teal-500/60 text-white text-[11px] px-2.5 py-1 rounded-full font-medium"
              >
                {t.icon} {t.name.split(" ").slice(0, 3).join(" ")}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onGeneratePackage}
            disabled={isLoading}
            className="w-full py-3 bg-white text-teal-800 font-bold rounded-xl hover:bg-teal-50 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                Building your package…
              </>
            ) : (
              "Confirm Experiences & Continue →"
            )}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-bold text-sm">Not sure where to start?</p>
              <p className="text-teal-100 text-xs mt-0.5">
                Let our AI pick the best combination based on your room &amp;
                stay length.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGeneratePackage}
            disabled={isLoading}
            className="w-full py-3 bg-white text-teal-800 font-bold rounded-xl hover:bg-teal-50 disabled:opacity-60 transition flex items-center justify-center gap-2 text-sm"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                AI Agents Working…
              </>
            ) : (
              "✨ Auto-Pick Best Package for Me"
            )}
          </button>
          {isLoading && (
            <p className="text-center text-xs text-teal-200 mt-2 animate-pulse">
              Price Scout scanning OTAs · Experience Curator building your
              itinerary…
            </p>
          )}
        </div>
      )}

      {/* Skip */}
      <div className="text-center pb-1">
        <p className="text-xs text-gray-400 mb-1.5">
          Not interested in tours or dining?
        </p>
        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium underline decoration-dotted underline-offset-2 disabled:opacity-40 transition"
        >
          Skip — just the room reservation →
        </button>
      </div>
    </div>
  );
}
