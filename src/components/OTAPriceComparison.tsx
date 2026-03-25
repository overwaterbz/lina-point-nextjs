"use client";

import { useState, useEffect } from "react";

interface OTAPriceData {
  ota: string;
  price: number;
  currency: string;
  url: string;
  source: string;
}

interface OTAPriceResponse {
  otaPrices: OTAPriceData[];
  lowestOTA: { ota: string; price: number };
  ourDirectPrice: number;
  baseRate: number;
  savingsAmount: number;
  savingsPercent: number;
  guaranteeBadge: boolean;
  beatPercentage: number;
}

const OTA_DISPLAY: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  expedia: { label: "Expedia", color: "text-yellow-700", bg: "bg-yellow-50" },
  booking: { label: "Booking.com", color: "text-blue-700", bg: "bg-blue-50" },
  agoda: { label: "Agoda", color: "text-red-700", bg: "bg-red-50" },
  hotels: { label: "Hotels.com", color: "text-red-800", bg: "bg-red-50" },
  tripadvisor: {
    label: "TripAdvisor",
    color: "text-green-700",
    bg: "bg-green-50",
  },
  airbnb: { label: "Airbnb", color: "text-pink-700", bg: "bg-pink-50" },
  hostelworld: {
    label: "Hostelworld",
    color: "text-orange-700",
    bg: "bg-orange-50",
  },
};

const ROOM_NAMES: Record<string, string> = {
  suite_2nd_floor: "2nd Floor Hotel Suite",
  suite_1st_floor: "1st Floor Hotel Suite",
  cabana_duplex: "1 Bed Overwater Cabana (Duplex)",
  cabana_1br: "1 Bedroom Overwater Cabana",
  cabana_2br: "2 Bedroom Overwater Cabana",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function OTAPriceComparison({
  roomType,
  checkIn,
  checkOut,
  nights,
}: {
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
}) {
  const [data, setData] = useState<OTAPriceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomType || !checkIn || !checkOut) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(
      `/api/ota-prices?roomType=${roomType}&checkIn=${checkIn}&checkOut=${checkOut}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (d.error) setError(d.error);
          else setData(d);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to fetch OTA prices");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomType, checkIn, checkOut]);

  if (!checkIn || !checkOut) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
          ))}
          <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
            <div className="h-5 bg-gray-200 rounded w-36" />
            <div className="h-6 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Robust fallback: Always show direct booking guarantee and fallback price info
    return (
      <div
        className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800"
        role="alert"
      >
        <strong>Price comparison temporarily unavailable.</strong>
        <br />
        You&apos;re still guaranteed our best direct rate.
        <br />
        <span className="block mt-2">
          If you need a price match or have questions,{" "}
          <a
            href="mailto:info@linapoint.com"
            className="underline text-blue-700"
          >
            contact support
          </a>{" "}
          for the best available rate.
        </span>
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <span className="font-bold text-green-800 text-base">
            Book Direct at Lina Point
          </span>
          <span className="ml-2 text-xs text-green-600 font-medium">
            Best Price Guarantee
          </span>
          <div className="text-green-800 font-bold text-xl mt-2">
            Contact us for your best rate!
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.otaPrices.length === 0) return null;

  const sortedPrices = [...data.otaPrices].sort((a, b) => a.price - b.price);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
        <h3 className="text-white font-bold text-lg">
          Compare Prices — We Beat Every Online Travel Site
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          {roomType && ROOM_NAMES[roomType] && (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {ROOM_NAMES[roomType]}
            </span>
          )}
          {checkIn && checkOut && (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night
              {nights !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-2">
        {/* OTA rows */}
        {sortedPrices.map((p) => {
          const display = OTA_DISPLAY[p.ota] || {
            label: p.ota,
            color: "text-gray-700",
            bg: "bg-gray-50",
          };
          return (
            <div
              key={p.ota}
              className={`flex items-center justify-between p-3 ${display.bg} rounded-lg`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-semibold text-sm ${display.color}`}>
                  {display.label}
                </span>
                {p.source === "fallback" && (
                  <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                    est.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-800 font-semibold">
                  ${p.price.toFixed(0)}
                  <span className="text-xs text-gray-500">/night</span>
                </span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Visit &rarr;
                </a>
              </div>
            </div>
          );
        })}

        {/* Our direct price — highlighted */}
        <div className="relative mt-3">
          {data.guaranteeBadge && (
            <div className="absolute -top-3 left-4 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Best Price Guaranteed
            </div>
          )}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl">
            <div>
              <span className="font-bold text-green-800 text-base">
                Book Direct at Lina Point
              </span>
              {data.savingsPercent > 0 ? (
                <span className="ml-2 text-xs text-green-600 font-medium">
                  Save {data.savingsPercent}%
                </span>
              ) : (
                <span className="ml-2 text-xs text-green-600 font-medium">
                  No Booking Fees
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-green-800 font-bold text-xl">
                ${data.ourDirectPrice.toFixed(0)}
              </span>
              <span className="text-xs text-green-600">/night</span>
              {data.savingsAmount > 0 && (
                <p className="text-xs text-green-600 mt-0.5">
                  Save ${(data.savingsAmount * nights).toFixed(0)} total
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
            <svg
              className="w-3.5 h-3.5 mr-1.5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Price Match Guarantee
          </span>
          <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
            <svg
              className="w-3.5 h-3.5 mr-1.5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            No Hidden Fees
          </span>
          <span className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full">
            <svg
              className="w-3.5 h-3.5 mr-1.5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Earn Loyalty Points
          </span>
        </div>

        <p className="text-[10px] text-gray-400 mt-3">
          Prices based on publicly available rates at time of search. Excludes
          member-only or flash sale pricing.
        </p>
      </div>
    </div>
  );
}
