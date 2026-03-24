"use client";

import Image from "next/image";
import { useState } from "react";
import { AvailabilityItem, RoomType } from "@/hooks/useBookingWizard";

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
    image: "/rooms/2nd%20Floor%20Hotel%20Suite.jpg",
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
    image: "/rooms/1st%20Floor%20Hotel%20Suite.jpg",
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
    image: "/rooms/1%20Bedroom%20Overwater%20Cabana%20(Duplex).jpg",
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
    image: "/rooms/1%20Bedroom%20Overwater%20Cabana.jpg",
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
    image: "/rooms/2%20Bedroom%20Overwater%20Cabana.jpeg",
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
  onSelectRoom,
  onNext,
  onBack,
}: StepRoomsProps) {
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

      {/* Room cards */}
      <div className="space-y-4">
        {ROOM_ORDER.map((rt) => {
          const config = ROOM_CONFIG[rt];
          const avail = availability?.find((a) => a.roomType === rt);
          const isSoldOut = !!(availability && avail && !avail.available);
          const isTooSmall = groupSize > config.maxGuests;
          const remaining = avail?.availableRooms ?? null;
          const nightly = avail?.dynamicRate ?? avail?.baseRate ?? 0;
          const isSelected = selectedRoomType === rt;

          return (
            <RoomCard
              key={rt}
              config={config}
              isSoldOut={isSoldOut}
              isTooSmall={isTooSmall}
              remaining={remaining}
              nightly={nightly}
              nights={nights}
              isSelected={isSelected}
              availLoading={availLoading}
              onClick={() => !isSoldOut && !isTooSmall && onSelectRoom(rt)}
            />
          );
        })}
      </div>

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
  config: RoomConfig;
  isSoldOut: boolean;
  isTooSmall: boolean;
  remaining: number | null;
  nightly: number;
  nights: number;
  isSelected: boolean;
  availLoading: boolean;
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
  onClick,
}: RoomCardProps) {
  const [imgError, setImgError] = useState(false);

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
            />
          )}
          {config.badge && (
            <span
              className={`absolute top-3 left-3 ${config.badgeColor} text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow`}
            >
              {config.badge}
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
              {nightly > 0 && (
                <div className="text-right shrink-0">
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
                </div>
              )}
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
