"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

interface GuestProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_tier: string | null;
  loyalty_points: number | null;
  total_stays: number;
  role: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
}

interface Reservation {
  id: string;
  confirmation_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  total_cost: number | null;
}

export default function GuestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const [profileRes, resRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", id).single(),
          supabase
            .from("reservations")
            .select(
              "id, confirmation_number, room_type, check_in, check_out, status, total_cost",
            )
            .eq("user_id", id)
            .order("check_in", { ascending: false }),
        ]);
        setGuest(profileRes.data);
        if (!id) {
          return <div>Invalid guest ID</div>;
        }
        setReservations(resRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!guest) {
    return <p className="text-center py-12 text-gray-500">Guest not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/guests"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          ← Back
        </Link>
      </div>

      <header className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
            {(guest.full_name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {guest.full_name || "Unknown Guest"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{guest.email}</p>
            {guest.phone && (
              <p className="text-sm text-gray-500">{guest.phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Member since</p>
            <p className="font-medium text-gray-900">
              {new Date(guest.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Loyalty Tier</p>
          <p className="text-lg font-bold text-gray-900">
            {guest.loyalty_tier || "Bronze"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Points</p>
          <p className="text-lg font-bold text-gray-900">
            {(guest.loyalty_points || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total Stays</p>
          <p className="text-lg font-bold text-gray-900">
            {guest.total_stays || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Total Revenue</p>
          <p className="text-lg font-bold text-gray-900">
            $
            {reservations
              .reduce((sum, r) => sum + (r.total_cost || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Reservation History */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-900 mb-3">
          Reservation History
        </h2>
        {reservations.length === 0 ? (
          <p className="text-sm text-gray-500">No reservations</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {r.room_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.check_in).toLocaleDateString()} –{" "}
                    {new Date(r.check_out).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {r.total_cost != null ? `$${r.total_cost}` : "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.confirmation_number}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
