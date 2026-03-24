"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface ReservationSummary {
  confirmation_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_amount: number;
  payment_status: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BookConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get("booking_id");
  const confirmationParam = searchParams.get("confirmation");

  const [reservation, setReservation] = useState<ReservationSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId && !confirmationParam) {
      router.replace("/dashboard/reservations");
      return;
    }

    async function fetchReservation() {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login?next=/book-confirmation");
        return;
      }

      let query = supabase
        .from("reservations")
        .select(
          "confirmation_number, room_type, check_in, check_out, nights, total_amount, payment_status",
        )
        .eq("guest_id", user.id);

      if (bookingId) {
        query = query.eq("booking_id", bookingId);
      } else if (confirmationParam) {
        query = query.eq("confirmation_number", confirmationParam);
      }

      const { data, error: dbErr } = await query.maybeSingle();

      if (dbErr || !data) {
        setError(
          "We couldn't find your booking. Please check your email for confirmation details.",
        );
      } else {
        setReservation(data);
      }
      setLoading(false);
    }

    fetchReservation();
  }, [bookingId, confirmationParam, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🌊</div>
          <p className="text-stone-600">Loading your confirmation…</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sand-50 px-4">
        <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
          <p className="text-2xl mb-4">⚠️</p>
          <h1 className="text-xl font-semibold text-stone-800 mb-2">
            Booking Not Found
          </h1>
          <p className="text-stone-500 mb-6">
            {error ?? "Something went wrong."}
          </p>
          <Link
            href="/dashboard/reservations"
            className="inline-block bg-teal-700 text-white px-6 py-3 rounded-full font-medium hover:bg-teal-800 transition-colors"
          >
            View My Reservations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg w-full text-center">
        {/* Hero */}
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-stone-800 mb-2">
          You&apos;re confirmed!
        </h1>
        <p className="text-stone-500 mb-8">
          Your overwater stay at Lina Point is booked. We can&apos;t wait to
          welcome you.
        </p>

        {/* Confirmation number */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-6 py-4 mb-8">
          <p className="text-sm text-teal-700 font-medium uppercase tracking-wider mb-1">
            Confirmation Number
          </p>
          <p className="text-2xl font-bold text-teal-800 font-mono">
            {reservation.confirmation_number}
          </p>
        </div>

        {/* Summary table */}
        <div className="text-left divide-y divide-stone-100 mb-8">
          <SummaryRow label="Room" value={reservation.room_type} />
          <SummaryRow
            label="Check-in"
            value={formatDate(reservation.check_in)}
          />
          <SummaryRow
            label="Check-out"
            value={formatDate(reservation.check_out)}
          />
          <SummaryRow
            label="Nights"
            value={`${reservation.nights} night${reservation.nights === 1 ? "" : "s"}`}
          />
          <SummaryRow
            label="Total Paid"
            value={`$${Number(reservation.total_amount).toFixed(2)} USD`}
            highlight
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/reservations"
            className="bg-teal-700 text-white px-6 py-3 rounded-full font-medium hover:bg-teal-800 transition-colors"
          >
            View My Reservations
          </Link>
          <Link
            href="/experiences"
            className="border border-teal-700 text-teal-700 px-6 py-3 rounded-full font-medium hover:bg-teal-50 transition-colors"
          >
            Explore Experiences
          </Link>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          A confirmation email has been sent to your registered address.
        </p>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between py-3">
      <span className="text-stone-500 text-sm">{label}</span>
      <span
        className={`text-sm font-medium ${highlight ? "text-teal-700" : "text-stone-800"}`}
      >
        {value}
      </span>
    </div>
  );
}
