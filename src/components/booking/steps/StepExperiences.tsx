"use client";

import { ActivityLevel } from "@/hooks/useBookingWizard";

const INTERESTS = [
  {
    value: "snorkeling",
    label: "🤿 Snorkeling & Reef",
    description: "Belize Barrier Reef exploration",
  },
  {
    value: "fishing",
    label: "🎣 Sport Fishing",
    description: "Tarpon, bonefish & permit",
  },
  {
    value: "mainland",
    label: "🏛️ Mayan Ruins",
    description: "Altun Ha, Lamanai day trips",
  },
  {
    value: "cenote",
    label: "💦 Cenote Swimming",
    description: "Crystal-clear cave pools",
  },
  {
    value: "kayaking",
    label: "🛶 Mangrove Kayaking",
    description: "Wildlife & serenity",
  },
  {
    value: "dining",
    label: "🍽️ Culinary Dining",
    description: "Local & fine dining experiences",
  },
];

const ACTIVITY_LEVELS: {
  value: ActivityLevel;
  label: string;
  desc: string;
}[] = [
  {
    value: "low",
    label: "😌 Relaxed",
    desc: "Beach days, spa & gentle excursions",
  },
  {
    value: "medium",
    label: "⚡ Balanced",
    desc: "Mix of adventure and downtime",
  },
  {
    value: "high",
    label: "🔥 Active",
    desc: "Jam-packed adventures every day",
  },
];

interface StepExperiencesProps {
  activityLevel: ActivityLevel;
  tourBudget: number;
  interests: string[];
  isLoading: boolean;
  onSetActivityLevel: (level: ActivityLevel) => void;
  onSetTourBudget: (n: number) => void;
  onToggleInterest: (interest: string) => void;
  onGeneratePackage: () => Promise<void>;
  onBack: () => void;
}

export default function StepExperiences({
  activityLevel,
  tourBudget,
  interests,
  isLoading,
  onSetActivityLevel,
  onSetTourBudget,
  onToggleInterest,
  onGeneratePackage,
  onBack,
}: StepExperiencesProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Customize Your Experience
          </h2>
          <p className="text-gray-500 text-sm">
            Our AI agents will build a personalized package — beating every OTA
            by 6% and curating your ideal itinerary.
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      {/* Activity level */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Activity Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          {ACTIVITY_LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => onSetActivityLevel(lvl.value)}
              className={[
                "rounded-xl p-4 text-left border-2 transition-all",
                activityLevel === lvl.value
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 bg-white",
              ].join(" ")}
            >
              <div className="font-semibold text-sm text-gray-900 mb-1">
                {lvl.label}
              </div>
              <div className="text-xs text-gray-500 leading-snug">
                {lvl.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tour budget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-700">
            Tour Budget
          </label>
          <span className="text-lg font-bold text-teal-700">
            ${tourBudget}{" "}
            <span className="text-sm font-normal text-gray-400">USD</span>
          </span>
        </div>
        <input
          type="range"
          min={100}
          max={2000}
          step={50}
          value={tourBudget}
          onChange={(e) => onSetTourBudget(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-teal-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>$100</span>
          <span>$2,000</span>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Tour Interests{" "}
          <span className="text-gray-400 font-normal">
            (select all that apply)
          </span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {INTERESTS.map((interest) => {
            const isSelected = interests.includes(interest.value);
            return (
              <button
                key={interest.value}
                type="button"
                onClick={() => onToggleInterest(interest.value)}
                className={[
                  "rounded-xl p-4 text-left border-2 transition-all",
                  isSelected
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white",
                ].join(" ")}
              >
                <div className="font-semibold text-sm text-gray-900">
                  {interest.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {interest.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI package CTA */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🤖</span>
          <div>
            <h3 className="text-lg font-bold">Ready to Build Your Package?</h3>
            <p className="text-teal-100 text-sm">
              Price Scout scans Expedia, Agoda & Booking.com · Experience
              Curator designs your itinerary
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGeneratePackage}
          disabled={isLoading}
          className="w-full py-3.5 bg-white text-teal-800 font-bold rounded-xl hover:bg-teal-50 disabled:opacity-60 transition-all flex items-center justify-center gap-2 text-base mt-2"
        >
          {isLoading ? (
            <>
              <span className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              AI Agents Working…
            </>
          ) : (
            "✨ Generate My Package"
          )}
        </button>
        {isLoading && (
          <p className="text-center text-xs text-teal-200 mt-3 animate-pulse">
            Price Scout scanning OTAs · Experience Curator building itinerary…
          </p>
        )}
      </div>
    </div>
  );
}
