"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DirectBookingBannerProps {
  checkIn?: string;
  checkOut?: string;
  roomType?: string;
  className?: string;
}

const STORAGE_KEY = "lp_banner_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function DirectBookingBanner({
  checkIn,
  checkOut,
  roomType,
  className = "",
}: DirectBookingBannerProps) {
  const [visible, setVisible] = useState(false);
  const [otaPrice, setOtaPrice] = useState<number | null>(null);
  const [directPrice, setDirectPrice] = useState<number | null>(null);

  useEffect(() => {
    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        if (Date.now() - dismissedAt < DISMISS_DURATION_MS) {
          return;
        }
      }
    } catch {
      // localStorage blocked (privacy mode) — show anyway
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible || !checkIn || !checkOut || !roomType) return;

    // Fetch live OTA comparison data when dates are provided
    const controller = new AbortController();
    fetch(
      `/api/ota-prices?checkIn=${checkIn}&checkOut=${checkOut}&roomType=${encodeURIComponent(roomType)}`,
      { signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.directPrice && data?.cheapestOtaPrice) {
          setDirectPrice(data.directPrice);
          setOtaPrice(data.cheapestOtaPrice);
        }
      })
      .catch(() => {
        /* ignore abort / network errors */
      });

    return () => controller.abort();
  }, [visible, checkIn, checkOut, roomType]);

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  const savings =
    otaPrice != null && directPrice != null
      ? Math.round(((otaPrice - directPrice) / otaPrice) * 100)
      : null;

  const savingsLabel =
    savings != null && savings > 0
      ? `Save ${savings}% vs OTAs`
      : "Best rates guaranteed direct";

  const atLeastAmount =
    otaPrice != null && directPrice != null && otaPrice > directPrice
      ? `Save $${(otaPrice - directPrice).toFixed(0)} per night`
      : null;

  return (
    <div
      role="banner"
      className={`relative flex items-center gap-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-white shadow-lg ${className}`}
    >
      {/* Pulse indicator */}
      <span className="flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{savingsLabel}</p>
        {atLeastAmount && (
          <p className="text-xs text-teal-100 mt-0.5">{atLeastAmount}</p>
        )}
        {!atLeastAmount && (
          <p className="text-xs text-teal-100 mt-0.5">
            No OTA markup · free cancellation · exclusive perks
          </p>
        )}
      </div>

      <Link
        href="/booking"
        className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Book Direct &amp; Save
      </Link>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}
