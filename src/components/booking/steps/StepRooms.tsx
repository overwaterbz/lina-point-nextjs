"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AvailabilityItem,
  RoomType,
  OTAPriceMap,
  OTAPriceResponse,
} from "@/hooks/useBookingWizard";
import OTAPriceComparison from "@/components/OTAPriceComparison";

interface RoomConfig {
  name: string;
  tagline: string;
  description: string;
  image: string;
  badge: string | null;
  badgeColor: string;
  borderColor: string;
  features: string[];
  maxGuests: number;
}

const ROOM_CONFIG: Record<RoomType, RoomConfig> = {
  suite_2nd_floor: {
    name: "2nd Floor Hotel Suite",
    tagline: "Best Value · Panoramic Reef Views",
    description:
      "Elevated luxury with floor-to-ceiling windows, private balcony overlooking the turquoise Caribbean, and soaking tub with ocean view.",
    image: "/rooms/suite-2nd-floor.jpg",
    badge: "Best Value",
    badgeColor: "bg-blue-500",
    borderColor: "border-blue-500",
    features: [
      "Panoramic reef views",
      "Private balcony",
      "Queen bed",
      "Soaking tub",
    ],
    maxGuests: 4,
  },
  suite_1st_floor: {
    name: "1st Floor Hotel Suite",
    tagline: "Spacious · Direct Beach Access",
    description:
      "Ground-floor suite with direct beach access, full kitchen, two bedrooms, and private patio — ideal for families.",
    image: "/rooms/suite-1st-floor.jpg",
    badge: null,
    badgeColor: "",
    borderColor: "border-teal-500",
    features: [
      "Direct beach access",
      "Full kitchen",
      "Two bedrooms",
      "Private patio",
    ],
    maxGuests: 4,
  },
  cabana_duplex: {
    name: "1 Bed Overwater Cabana (Duplex)",
    tagline: "Most Popular · Glass Bottom Floors",
    description:
      "Classic overwater experience with glass-bottom floor panels revealing the reef below, private deck, and direct sea ladder access.",
    image: "/rooms/cabana-duplex.jpg",
    badge: "Most Popular",
    badgeColor: "bg-amber-500",
    borderColor: "border-amber-500",
    features: [
      "Glass bottom panels",
      "Overwater deck",
      "Sea ladder access",
      "King bed",
    ],
    maxGuests: 2,
  },
  cabana_1br: {
    name: "1 Bedroom Overwater Cabana",
    tagline: "Romantic Pick · 360° Private Views",
    description:
      "The most private accommodation — a standalone overwater cabana with unobstructed 360° ocean views, large hammock deck, and rain shower.",
    image: "/rooms/cabana-1br.jpg",
    badge: "Romantic Pick",
    badgeColor: "bg-rose-500",
    borderColor: "border-rose-500",
    features: [
      "Standalone private",
      "360° ocean views",
      "Large hammock deck",
      "Outdoor rain shower",
    ],
    maxGuests: 2,
  },
  cabana_2br: {
    name: "2 Bedroom Overwater Cabana",
    tagline: "Family Favorite · Largest Deck",
    description:
      "The ultimate family overwater experience — two bedrooms, full kitchenette, and our largest private deck with glass bottom panels.",
    image: "/rooms/cabana-2br.jpeg",
    badge: "Family Fav",
    badgeColor: "bg-purple-500",
    borderColor: "border-purple-500",
    features: [
      "Two bedrooms",
      "Kitchenette",
      "Largest private deck",
      "Glass bottom panels",
    ],
    maxGuests: 4,
  },
};

const ROOM_ORDER: RoomType[] = [
  "suite_2nd_floor",
  "suite_1st_floor",
  "cabana_duplex",
  "cabana_1br",
  "cabana_2br",
];

interface StepRoomsProps {
  selectedRoomType: RoomType;
  groupSize: number;
  availability: AvailabilityItem[] | null;
  availLoading: boolean;
  nights: number;
  checkIn: string;
  checkOut: string;
  otaPriceMap: OTAPriceMap;
  otaPricesLoading: boolean;
  onSelectRoom: (rt: RoomType) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepRooms({
  selectedRoomType,
  groupSize,
  availability,
  availLoading,
  nights,
  checkIn,
  checkOut,
  otaPriceMap,
  otaPricesLoading,
  onSelectRoom,
  onNext,
  onBack,
}: StepRoomsProps) {
  // Sort rooms: available + cheapest unified price first (Google Hotels pattern)
  const sortedRooms = [...ROOM_ORDER].sort((a, b) => {
    const aAvail = availability?.find((r) => r.roomType === a);
    const bAvail = availability?.find((r) => r.roomType === b);
    const aOTA = otaPriceMap[a];
    const bOTA = otaPriceMap[b];

    // Sold-out rooms to the bottom
    const aOut = !!(availability && aAvail && !aAvail.available);
    const bOut = !!(availability && bAvail && !bAvail.available);
    if (aOut !== bOut) return aOut ? 1 : -1;

    // Sort by unified price: min(dynamicRate, otaDirectPrice)
    const aNightly = aAvail?.dynamicRate ?? aAvail?.baseRate ?? 9999;
    const bNightly = bAvail?.dynamicRate ?? bAvail?.baseRate ?? 9999;
    const aUnified = aOTA ? Math.min(aNightly, aOTA.ourDirectPrice) : aNightly;
    const bUnified = bOTA ? Math.min(bNightly, bOTA.ourDirectPrice) : bNightly;
    return aUnified - bUnified;
  });
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Choose Your Room
          </h2>
          <p className="text-gray-500 text-sm">
            {nights} night{nights !== 1 ? "s" : ""} · {groupSize} guest
            {groupSize !== 1 ? "s" : ""} · live availability
          </p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm text-teal-600 hover:text-teal-800 font-semibold mt-1"
        >
          ← Back
        </button>
      </div>

      {/* Book Direct banner */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
        <span className="text-green-700 font-semibold">
          ✓ Best Price Guaranteed
        </span>
        <span className="text-green-600">
          — prices below beat Booking.com, Expedia &amp; Airbnb by at least 6%
        </span>
      </div>

      {/* Room cards — sorted cheapest first */}
      <div className="space-y-4">
        {sortedRooms.map((rt) => {
          const config = ROOM_CONFIG[rt];
          const avail = availability?.find((a) => a.roomType === rt);
          const isSoldOut = !!(availability && avail && !avail.available);
          const isTooSmall = groupSize > config.maxGuests;
          const remaining = avail?.availableRooms ?? null;
          const dynamicNightly = avail?.dynamicRate ?? avail?.baseRate ?? 0;
          const otaData = otaPriceMap[rt] ?? null;
          // Unified price: best of our dynamic rate vs OTA-beat price
          const unifiedNightly =
            otaData && dynamicNightly > 0
              ? Math.min(dynamicNightly, otaData.ourDirectPrice)
              : dynamicNightly;
          const isSelected = selectedRoomType === rt;

          return (
            <RoomCard
              key={rt}
              roomType={rt}
              config={config}
              isSoldOut={isSoldOut}
              isTooSmall={isTooSmall}
              remaining={remaining}
              nightly={unifiedNightly}
              nights={nights}
              isSelected={isSelected}
              availLoading={availLoading}
              otaData={otaData}
              otaLoading={otaPricesLoading && !otaData}
              onClick={() => !isSoldOut && !isTooSmall && onSelectRoom(rt)}
            />
          );
        })}
      </div>

      {/* OTA Price Comparison — shows competitor pricing for selected room */}
      {checkIn && checkOut && (
        <OTAPriceComparison
          roomType={selectedRoomType}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
        />
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full py-4 bg-teal-600 text-white text-lg font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg"
      >
        Continue — Customize Experiences →
      </button>
    </div>
  );
}

interface RoomCardProps {
  roomType: RoomType;
  config: RoomConfig;
  isSoldOut: boolean;
  isTooSmall: boolean;
  remaining: number | null;
  nightly: number;
  nights: number;
  isSelected: boolean;
  availLoading: boolean;
  otaData: OTAPriceResponse | null;
  otaLoading: boolean;
  onClick: () => void;
}

function RoomCard({
  config,
  isSoldOut,
  isTooSmall,
  remaining,
  nightly,
  nights,
  isSelected,
  availLoading,
  otaData,
  otaLoading,
  onClick,
}: RoomCardProps) {
  const [imgError, setImgError] = useState(false);

  // Price anchoring: show competitor price (struck through) + our savings
  const lowestOTAPrice = otaData?.lowestOTA?.price ?? null;
  const lowestOTAName = otaData?.lowestOTA?.ota ?? null;
  const savingsTotal =
    lowestOTAPrice && nightly > 0 && nights > 0
      ? Math.round((lowestOTAPrice - nightly) * nights)
      : null;
  const savingsPct = otaData?.savingsPercent ?? null;

  // OTA display labels for anchor
  const OTA_LABELS: Record<string, string> = {
    booking: "Booking.com",
    expedia: "Expedia",
    airbnb: "Airbnb",
    agoda: "Agoda",
    hotels: "Hotels.com",
    tripadvisor: "TripAdvisor",
  };
  const otaLabel = lowestOTAName
    ? (OTA_LABELS[lowestOTAName] ?? lowestOTAName)
    : null;

  return (
    <div
      onClick={onClick}
      className={[
        "relative rounded-2xl border-2 overflow-hidden transition-all",
        isSoldOut || isTooSmall
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer",
        isSelected
          ? `${config.borderColor} shadow-xl ring-2 ring-offset-1 ring-teal-300`
          : "border-gray-200 hover:border-gray-300 hover:shadow-md",
      ].join(" ")}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Photo */}
        <div className="relative w-full sm:w-52 h-44 sm:h-48 shrink-0">
          {imgError ? (
            <div className="absolute inset-0 bg-gradient-to-br from-teal-700 to-emerald-900 flex items-center justify-center">
              <span className="text-4xl opacity-60">🏨</span>
            </div>
          ) : (
            <Image
              src={config.image}
              alt={config.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 208px"
              onError={() => setImgError(true)}
              unoptimized
            />
          )}
          {config.badge && (
            <span
              className={`absolute top-3 left-3 ${config.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow`}
            >
              {config.badge}
            </span>
          )}
          {/* Best value badge when savings are available */}
          {savingsTotal !== null && savingsTotal > 0 && (
            <span className="absolute bottom-3 left-3 bg-green-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow">
              Save ${savingsTotal}
            </span>
          )}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-sm bg-red-600 px-3 py-1.5 rounded-full">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Room info */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-lg font-bold text-gray-900 leading-snug">
                {config.name}
              </h3>

              {/* Price column: OTA anchor + our price */}
              <div className="text-right shrink-0 min-w-[110px]">
                {otaLoading ? (
                  /* Skeleton while OTA prices load */
                  <div className="animate-pulse space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-20 ml-auto" />
                    <div className="h-5 bg-gray-200 rounded w-16 ml-auto" />
                    <div className="h-3 bg-gray-200 rounded w-14 ml-auto" />
                  </div>
                ) : lowestOTAPrice && nightly > 0 ? (
                  <>
                    {/* OTA anchor price — struck through */}
                    <div className="text-[11px] text-gray-400 line-through">
                      ${Math.round(lowestOTAPrice)}
                      <span className="no-underline">/night</span>
                      {otaLabel && (
                        <span className="ml-1 text-[10px]">on {otaLabel}</span>
                      )}
                    </div>
                    {/* Our direct price — prominent green */}
                    <div className="text-xl font-bold text-green-700">
                      ${Math.round(nightly)}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        /night
                      </span>
                    </div>
                    {/* Total for stay + savings prompt */}
                    {nights > 0 && (
                      <div className="text-xs text-gray-400">
                        ${Math.round(nightly * nights)} total
                        {savingsPct !== null && savingsPct > 0 && (
                          <span className="ml-1 text-green-600 font-semibold">
                            · {savingsPct}% off
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : nightly > 0 ? (
                  /* No OTA data — show plain price */
                  <>
                    <div className="text-xl font-bold text-teal-700">
                      ${nightly}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        USD/night
                      </span>
                    </div>
                    {nights > 0 && (
                      <div className="text-xs text-gray-400">
                        ${nightly * nights} total
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <p className="text-xs font-semibold text-teal-600 mb-2">
              {config.tagline}
            </p>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {config.features.map((f) => (
                <span
                  key={f}
                  className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs font-medium">
              {availLoading ? (
                <span className="text-gray-400">Checking…</span>
              ) : isSoldOut ? (
                <span className="text-red-500">Sold out for these dates</span>
              ) : isTooSmall ? (
                <span className="text-amber-600">
                  Max {config.maxGuests} guests
                </span>
              ) : remaining !== null && remaining <= 3 ? (
                <span className="text-amber-600">⚠️ Only {remaining} left</span>
              ) : (
                <span className="text-green-600">✓ Available</span>
              )}
            </span>

            {isSelected && (
              <span className="flex items-center gap-1 text-sm font-bold text-teal-600">
                <span className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center text-white text-[10px]">
                  ✓
                </span>
                Selected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
