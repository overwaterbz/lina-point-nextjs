"use client";

import dynamic from "next/dynamic";
import {
  BookingResult,
  PromoResult,
  AvailabilityItem,
  RoomType,
} from "@/hooks/useBookingWizard";

const OTAPriceComparison = dynamic(
  () => import("@/components/OTAPriceComparison"),
  {
    loading: () => <div className="animate-pulse h-48 bg-teal-50 rounded-xl" />,
  },
);

interface StepReviewProps {
  packageResult: BookingResult;
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  selectedRoom: AvailabilityItem | null;
  bundleSelected: boolean;
  promoCode: string;
  promoResult: PromoResult | null;
  promoLoading: boolean;
  showPromo: boolean;
  onSetBundleSelected: (v: boolean) => void;
  onSetPromoCode: (code: string) => void;
  onValidatePromo: () => Promise<void>;
  onClearPromo: () => void;
  onSetShowPromo: (show: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepReview({
  packageResult,
  roomType,
  checkInDate,
  checkOutDate,
  nights,
  selectedRoom,
  bundleSelected,
  promoCode,
  promoResult,
  promoLoading,
  showPromo,
  onSetBundleSelected,
  onSetPromoCode,
  onValidatePromo,
  onClearPromo,
  onSetShowPromo,
  onNext,
  onBack,
}: StepReviewProps) {
  const hasExperiences =
    packageResult.curated_package.tours.length > 0 ||
    packageResult.curated_package.dinner.price > 0;

  const promoDiscount =
    promoResult?.valid && promoResult?.discount ? promoResult.discount : 0;

  const roomOnlyTotal = Math.max(
    0,
    packageResult.curated_package.room.room_total - promoDiscount,
  );
  const bundleTotal = Math.max(
    0,
    packageResult.curated_package.total - promoDiscount,
  );
  const finalTotal = bundleSelected ? bundleTotal : roomOnlyTotal;

  const remaining = selectedRoom?.availableRooms ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Review Your Package
          </h2>
          <p className="text-gray-500 text-sm">
            Confirm your perfect Belize getaway before checkout.
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      {/* Urgency signal */}
      {remaining !== null && remaining <= 3 && remaining > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800 font-medium">
          ⚠️ Only {remaining} room{remaining !== 1 ? "s" : ""} left at this
          price — secure yours now
        </div>
      )}

      {/* Package tier selector */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Choose What to Include
        </p>
        {hasExperiences ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Room Only card */}
            <button
              type="button"
              onClick={() => onSetBundleSelected(false)}
              className={[
                "text-left rounded-2xl border-2 p-4 transition-all",
                !bundleSelected
                  ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base">🏨</span>
                {!bundleSelected && (
                  <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">
                    Selected
                  </span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">Room Only</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Accommodation only — no tours or dining
              </p>
              <p className="text-xl font-bold text-teal-700 mt-2">
                ${packageResult.curated_package.room.room_total}{" "}
                <span className="text-sm font-normal text-gray-400">USD</span>
              </p>
              <p className="text-xs text-gray-400">
                {nights} night{nights !== 1 ? "s" : ""}
              </p>
            </button>

            {/* Room + Experiences card */}
            <button
              type="button"
              onClick={() => onSetBundleSelected(true)}
              className={[
                "text-left rounded-2xl border-2 p-4 transition-all",
                bundleSelected
                  ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-base">🌴</span>
                {bundleSelected && (
                  <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-medium">
                    Selected
                  </span>
                )}
              </div>
              <p className="font-bold text-gray-900 text-sm">
                Room + Experiences
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {packageResult.curated_package.tours.length} tour
                {packageResult.curated_package.tours.length !== 1 ? "s" : ""} +
                dining included
              </p>
              <p className="text-xl font-bold text-teal-700 mt-2">
                ${packageResult.curated_package.total}{" "}
                <span className="text-sm font-normal text-gray-400">USD</span>
              </p>
              <p className="text-xs text-gray-400">Room + tours + dining</p>
            </button>
          </div>
        ) : (
          /* Skip path — room only, no selector needed */
          <div className="bg-teal-50 border-2 border-teal-500 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏨</span>
              <div>
                <p className="font-bold text-gray-900">Room Only Reservation</p>
                <p className="text-xs text-gray-500">
                  No tours or dining — want to add experiences?{" "}
                  <button
                    type="button"
                    onClick={onBack}
                    className="text-teal-600 underline hover:text-teal-800"
                  >
                    Go back
                  </button>
                </p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-xl font-bold text-teal-700">
                  ${packageResult.curated_package.room.room_total}{" "}
                  <span className="text-sm font-normal text-gray-400">USD</span>
                </p>
                <p className="text-xs text-gray-400">
                  {nights} night{nights !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* OTA price comparison widget */}
      <OTAPriceComparison
        roomType={roomType}
        checkIn={checkInDate}
        checkOut={checkOutDate}
        nights={nights}
      />

      {/* Package breakdown */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 text-sm">Package Breakdown</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {roomType.replace(/_/g, " ")} × {nights} night
                {nights !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-400">
                {packageResult.curated_package.room.ota}
              </p>
            </div>
            <span className="font-semibold text-gray-900 text-sm">
              ${packageResult.curated_package.room.room_total}
            </span>
          </div>
          {bundleSelected &&
            packageResult.curated_package.tours.map((tour, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {tour.name}
                  </p>
                  <p className="text-xs text-gray-400">{tour.duration}</p>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  ${tour.price}
                </span>
              </div>
            ))}
          {bundleSelected && packageResult.curated_package.dinner.price > 0 && (
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-medium text-gray-900 text-sm">
                {packageResult.curated_package.dinner.name}
              </p>
              <span className="font-semibold text-gray-900 text-sm">
                ${packageResult.curated_package.dinner.price}
              </span>
            </div>
          )}
          {promoResult?.valid && promoResult?.discount && (
            <div className="flex items-center justify-between px-5 py-3 bg-green-50">
              <p className="font-medium text-green-700 text-sm">
                Promo: {promoResult.description}
              </p>
              <span className="font-semibold text-green-700 text-sm">
                −${promoResult.discount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 font-bold">
            <p className="text-gray-900">Total</p>
            <span className="text-gray-900 text-lg">
              ${finalTotal}{" "}
              <span className="text-sm font-normal text-gray-400">USD</span>
            </span>
          </div>
        </div>
      </div>

      {/* AI recommendations */}
      {packageResult.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">
            🤖 AI Recommendations
          </h3>
          <ul className="space-y-1.5">
            {packageResult.recommendations.map((rec, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="text-blue-500 font-bold mt-0.5">✓</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Promo code */}
      <div>
        {!showPromo ? (
          <button
            type="button"
            onClick={() => onSetShowPromo(true)}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            Have a promo code? →
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => onSetPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <button
              type="button"
              onClick={onValidatePromo}
              disabled={promoLoading || !promoCode.trim()}
              className="px-5 py-2.5 bg-teal-600 text-white text-sm rounded-xl font-medium hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
            >
              {promoLoading ? "…" : "Apply"}
            </button>
          </div>
        )}
        {promoResult?.valid && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-green-800">
              {promoResult.description} (−${promoResult.discount?.toFixed(2)})
            </p>
            <button
              type="button"
              onClick={onClearPromo}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Remove
            </button>
          </div>
        )}
        {promoResult && !promoResult.valid && (
          <p className="mt-1 text-xs text-red-500">{promoResult.error}</p>
        )}
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: "🔒", text: "Secure Payment" },
          { icon: "💰", text: "Price Match Guarantee" },
          { icon: "✅", text: "Instant Confirmation" },
        ].map((badge) => (
          <div key={badge.text} className="bg-gray-50 rounded-xl py-3 px-2">
            <div className="text-2xl mb-1">{badge.icon}</div>
            <p className="text-xs font-medium text-gray-600">{badge.text}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onNext}
        className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg"
      >
        {bundleSelected && hasExperiences
          ? `Continue with Room + Experiences — $${finalTotal} USD →`
          : `Continue with Room Only — $${finalTotal} USD →`}
      </button>
    </div>
  );
}
