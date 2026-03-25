"use client";

import { useState, useEffect } from "react";

interface TourPlatform {
  platform: string;
  label: string;
  otaName: string;
  otaUrl: string;
  otaPrice: number;
  otaRating: number | null;
  ourPrice: number;
  source: "live" | "fallback";
}

interface TourOTAData {
  tourId: string;
  tourName: string;
  slug: string;
  platforms: TourPlatform[];
  lowestOtaPrice: number;
  ourBestPrice: number;
  savings: number;
  savingsPercent: number;
  lastUpdated: string | null;
  source: "live" | "fallback";
}

const PLATFORM_STYLES: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  viator: { color: "text-cyan-700", bg: "bg-cyan-50", icon: "🌊" },
  getyourguide: { color: "text-orange-700", bg: "bg-orange-50", icon: "🗺️" },
  tripadvisor: { color: "text-green-700", bg: "bg-green-50", icon: "🦉" },
};

export default function TourOTAComparison({
  tourId,
  tourSlug,
  tourName,
  fallbackPrice,
}: {
  tourId?: string;
  tourSlug?: string;
  tourName: string;
  fallbackPrice: number;
}) {
  const [data, setData] = useState<TourOTAData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tourId && !tourSlug) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const param = tourId
      ? `tourId=${encodeURIComponent(tourId)}`
      : `slug=${encodeURIComponent(tourSlug!)}`;

    fetch(`/api/tour-ota-prices?${param}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to fetch prices");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tourId, tourSlug]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="h-4 bg-green-200 rounded w-32" />
            <div className="h-5 bg-green-200 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback on error
  if (error || !data) {
    const estimatedOta = Math.round((fallbackPrice / 0.94) * 100) / 100;
    const savings = Math.round((estimatedOta - fallbackPrice) * 100) / 100;
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <ComparisonHeader tourName={tourName} isEstimate />
        <div className="p-4 space-y-2">
          <PlatformRow
            label="Viator"
            styleKey="viator"
            price={estimatedOta}
            isEstimate
            url={`https://www.viator.com/searchResults/all?text=${encodeURIComponent(tourName + " belize")}`}
          />
          <PlatformRow
            label="GetYourGuide"
            styleKey="getyourguide"
            price={Math.round(estimatedOta * 1.03 * 100) / 100}
            isEstimate
            url={`https://www.getyourguide.com/s/?q=${encodeURIComponent(tourName + " belize")}`}
          />
          <DirectPriceRow price={fallbackPrice} savings={savings} />
          <TrustBadges />
        </div>
      </div>
    );
  }

  const sortedPlatforms = [...data.platforms].sort(
    (a, b) => a.otaPrice - b.otaPrice,
  );
  const ourDisplayPrice = data.ourBestPrice;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <ComparisonHeader
        tourName={tourName}
        isEstimate={data.source === "fallback"}
      />
      <div className="p-4 space-y-2">
        {sortedPlatforms.map((p) => {
          const style = PLATFORM_STYLES[p.platform] ?? {
            color: "text-gray-700",
            bg: "bg-gray-50",
            icon: "🌐",
          };
          return (
            <div
              key={p.platform}
              className={`flex items-center justify-between p-3 ${style.bg} rounded-lg`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{style.icon}</span>
                <span className={`font-semibold text-sm ${style.color}`}>
                  {p.label}
                </span>
                {p.otaRating && (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                    ★ {p.otaRating}
                  </span>
                )}
                {p.source === "fallback" && (
                  <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                    est.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-800 font-semibold text-sm">
                  ${p.otaPrice.toFixed(0)}
                  <span className="text-xs text-gray-400">/person</span>
                </span>
                <a
                  href={p.otaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition"
                >
                  View →
                </a>
              </div>
            </div>
          );
        })}

        <DirectPriceRow price={ourDisplayPrice} savings={data.savings} />
        <TrustBadges />

        {data.lastUpdated && (
          <p className="text-[10px] text-gray-400 text-center pt-1">
            Prices updated {new Date(data.lastUpdated).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function ComparisonHeader({
  tourName,
  isEstimate,
}: {
  tourName: string;
  isEstimate: boolean;
}) {
  return (
    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-3">
      <h3 className="text-white font-bold text-sm">
        Compare Prices — We Beat Every OTA
      </h3>
      <p className="text-white/70 text-xs mt-0.5">
        {tourName}
        {isEstimate && " · estimated prices"}
      </p>
    </div>
  );
}

function PlatformRow({
  label,
  styleKey,
  price,
  isEstimate,
  url,
}: {
  label: string;
  styleKey: string;
  price: number;
  isEstimate?: boolean;
  url: string;
}) {
  const style = PLATFORM_STYLES[styleKey] ?? {
    color: "text-gray-700",
    bg: "bg-gray-50",
    icon: "🌐",
  };
  return (
    <div
      className={`flex items-center justify-between p-3 ${style.bg} rounded-lg`}
    >
      <div className="flex items-center gap-2">
        <span className={`font-semibold text-sm ${style.color}`}>{label}</span>
        {isEstimate && (
          <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
            est.
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-800 font-semibold text-sm">
          ${price.toFixed(0)}
          <span className="text-xs text-gray-400">/person</span>
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-400 hover:text-gray-600 transition"
        >
          View →
        </a>
      </div>
    </div>
  );
}

function DirectPriceRow({
  price,
  savings,
}: {
  price: number;
  savings: number;
}) {
  return (
    <div className="relative mt-3">
      <div className="absolute -top-3 left-3 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
        Best Price Guaranteed
      </div>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-xl">
        <div>
          <span className="font-bold text-green-800 text-sm">
            Book Direct at Lina Point
          </span>
          <span className="ml-2 text-xs text-green-600 font-medium">
            No OTA Fees
          </span>
        </div>
        <div className="text-right">
          <span className="text-green-800 font-bold text-xl">
            ${price.toFixed(0)}
          </span>
          <span className="text-xs text-green-600">/person</span>
          {savings > 0 && (
            <p className="text-xs text-green-600 mt-0.5">
              Save ${savings.toFixed(0)} vs OTA
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
      {["6% Below OTA Prices", "No Booking Fees", "Local Expert Guides"].map(
        (badge) => (
          <span
            key={badge}
            className="inline-flex items-center text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full"
          >
            <svg
              className="w-3 h-3 mr-1 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {badge}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * Lightweight hook — bulk-fetch all tour OTA prices for the experiences listing page.
 * Returns a map of slug → ourBestPrice (or null while loading).
 */
export function useTourOTAPrices(): Record<string, number | null> {
  const [prices, setPrices] = useState<Record<string, number | null>>({});

  useEffect(() => {
    fetch("/api/tour-ota-prices")
      .then((r) => r.json())
      .then((data: TourOTAData[] | null) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, number> = {};
        for (const item of data) {
          if (item.slug) map[item.slug] = item.ourBestPrice;
        }
        setPrices(map);
      })
      .catch(() => {
        /* silently ignore — badges stay hidden */
      });
  }, []);

  return prices;
}
