"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { captureUtmParams } from "@/lib/analytics";
import { RoomType } from "@/hooks/useBookingWizard";
import BookingWizard from "@/components/booking/BookingWizard";

const SocialProofCounter = dynamic(
  () => import("@/components/SocialProofCounter"),
  {
    loading: () => <div className="animate-pulse h-8 bg-teal-900/20 rounded" />,
  },
);

const SLUG_TO_ROOM_TYPE: Record<string, RoomType> = {
  "2nd-floor-suite": "suite_2nd_floor",
  "1st-floor-suite": "suite_1st_floor",
  "overwater-cabana-duplex": "cabana_duplex",
  "overwater-cabana": "cabana_1br",
  "2br-overwater-cabana": "cabana_2br",
};

function BookingPageInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureUtmParams();
  }, []);

  const roomSlug = searchParams.get("room") ?? "";
  const checkIn = searchParams.get("checkIn") ?? undefined;
  const checkOut = searchParams.get("checkOut") ?? undefined;
  const roomType: RoomType | undefined =
    roomSlug && SLUG_TO_ROOM_TYPE[roomSlug]
      ? SLUG_TO_ROOM_TYPE[roomSlug]
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Lina Point Resort Booking
          </h1>
          <SocialProofCounter />
          <p className="text-lg text-gray-600 mt-2">
            AI-powered price comparison &amp; experience curation — San Pedro,
            Belize
          </p>
        </div>

        <BookingWizard initialData={{ roomType, checkIn, checkOut }} />
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-teal-600 text-lg font-medium">
            Loading booking…
          </div>
        </div>
      }
    >
      <BookingPageInner />
    </Suspense>
  );
}
