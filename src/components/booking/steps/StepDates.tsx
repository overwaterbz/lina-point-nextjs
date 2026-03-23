"use client";

interface StepDatesProps {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  groupSize: number;
  availLoading: boolean;
  availableCount?: number;
  onSetCheckIn: (date: string) => void;
  onSetCheckOut: (date: string) => void;
  onSetGroupSize: (n: number) => void;
  onNext: () => void;
}

export default function StepDates({
  checkInDate,
  checkOutDate,
  nights,
  groupSize,
  availLoading,
  availableCount,
  onSetCheckIn,
  onSetCheckOut,
  onSetGroupSize,
  onNext,
}: StepDatesProps) {
  const today = new Date().toISOString().split("T")[0];

  const datesError =
    checkInDate && checkOutDate && nights <= 0
      ? "Check-out must be after check-in"
      : checkInDate && checkOutDate && nights > 0 && nights < 2
        ? "Minimum stay is 2 nights"
        : null;

  const canProceed = !!(checkInDate && checkOutDate && nights >= 2);

  const aiTip = availLoading
    ? "Checking availability for your dates…"
    : availableCount !== undefined
      ? availableCount > 5
        ? `${availableCount} rooms available — great selection for these dates`
        : availableCount > 0
          ? `Only ${availableCount} room${availableCount !== 1 ? "s" : ""} left — book soon!`
          : "Fully booked for these dates — try different dates"
      : null;

  const tipColor =
    availLoading || availableCount === undefined
      ? "bg-gray-50 text-gray-500"
      : availableCount === 0
        ? "bg-red-50 text-red-700 border border-red-200"
        : availableCount <= 3
          ? "bg-amber-50 text-amber-800 border border-amber-200"
          : "bg-green-50 text-green-800 border border-green-200";

  const tipIcon =
    availLoading || availableCount === undefined
      ? "⏳"
      : availableCount === 0
        ? "🔴"
        : availableCount <= 3
          ? "⚠️"
          : "🟢";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          When are you visiting?
        </h2>
        <p className="text-gray-500 text-sm">
          Select your dates and group size to see real-time availability &
          pricing.
        </p>
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Check-in Date
          </label>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => onSetCheckIn(e.target.value)}
            min={today}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 font-medium"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Check-out Date
          </label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => onSetCheckOut(e.target.value)}
            min={checkInDate || today}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 font-medium"
          />
        </div>
      </div>

      {datesError && (
        <p className="text-sm text-red-500 font-medium -mt-2">{datesError}</p>
      )}

      {nights >= 2 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-800 font-semibold -mt-2">
          📅 {nights} night{nights !== 1 ? "s" : ""} selected
        </div>
      )}

      {/* Guest stepper */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Number of Guests
        </label>
        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 w-fit">
          <button
            type="button"
            onClick={() => onSetGroupSize(Math.max(1, groupSize - 1))}
            aria-label="Remove guest"
            className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-all"
          >
            −
          </button>
          <span className="text-2xl font-bold text-gray-900 w-16 text-center">
            {groupSize}
          </span>
          <button
            type="button"
            onClick={() => onSetGroupSize(Math.min(8, groupSize + 1))}
            aria-label="Add guest"
            className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 hover:border-teal-400 hover:text-teal-600 transition-all"
          >
            +
          </button>
          <span className="text-sm text-gray-500 ml-2">
            guest{groupSize !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* AI availability tip */}
      {aiTip && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${tipColor}`}
        >
          <span>{tipIcon}</span>
          <span>{aiTip}</span>
        </div>
      )}

      {/* Why book direct teaser */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "🏆", text: "Best Price Guaranteed" },
          { icon: "🚫", text: "No OTA Fees" },
          { icon: "🤖", text: "AI Curated Experiences" },
          { icon: "💬", text: "Direct Concierge" },
        ].map((b) => (
          <div
            key={b.text}
            className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm"
          >
            <div className="text-2xl mb-1">{b.icon}</div>
            <p className="text-[11px] font-medium text-gray-600 leading-tight">
              {b.text}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-xl hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg disabled:shadow-none"
      >
        {canProceed
          ? "Continue — Choose Your Room →"
          : "Select dates to continue"}
      </button>
    </div>
  );
}
