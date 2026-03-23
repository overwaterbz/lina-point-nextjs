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
  total_spend: number | null;
  last_stay_at: string | null;
  role: string | null;
  country: string | null;
  language: string | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  created_at: string;
}

interface Reservation {
  id: string;
  confirmation_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number | null;
}

interface WhatsAppMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
}

interface GuestMemory {
  id: string;
  memory_type: string;
  content: string;
  source: string | null;
  confidence: number | null;
  created_at: string;
}

export default function GuestDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [memories, setMemories] = useState<GuestMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const [profileRes, resRes, msgRes, memRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", id).single(),
          supabase
            .from("reservations")
            .select(
              "id, confirmation_number, room_type, check_in, check_out, status, total_amount",
            )
            .eq("user_id", id)
            .order("check_in", { ascending: false }),
          supabase
            .from("whatsapp_messages")
            .select("id, direction, body, created_at")
            .eq("user_id", id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("guest_memory")
            .select("id, memory_type, content, source, confidence, created_at")
            .eq("guest_id", id)
            .order("created_at", { ascending: false })
            .limit(30),
        ]);
        setGuest(profileRes.data);
        setReservations(resRes.data || []);
        setMessages(msgRes.data || []);
        setMemories(memRes.data || []);
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
          <p className="text-xs text-gray-500 uppercase">Total Spend</p>
          <p className="text-lg font-bold text-gray-900">
            $
            {(
              guest.total_spend ||
              reservations.reduce((s, r) => s + (r.total_amount || 0), 0)
            ).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Guest Preferences */}
      {(guest.country ||
        guest.language ||
        guest.dietary_restrictions ||
        guest.accessibility_needs) && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            Preferences & Needs
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2 text-sm">
            {guest.country && (
              <>
                <dt className="text-gray-500">Country</dt>
                <dd className="font-medium text-gray-900">{guest.country}</dd>
              </>
            )}
            {guest.language && (
              <>
                <dt className="text-gray-500">Language</dt>
                <dd className="font-medium text-gray-900">{guest.language}</dd>
              </>
            )}
            {guest.dietary_restrictions && (
              <>
                <dt className="text-gray-500">Dietary</dt>
                <dd className="font-medium text-gray-900">
                  {guest.dietary_restrictions}
                </dd>
              </>
            )}
            {guest.accessibility_needs && (
              <>
                <dt className="text-gray-500">Accessibility</dt>
                <dd className="font-medium text-gray-900">
                  {guest.accessibility_needs}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

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
                    {r.total_amount != null
                      ? `$${r.total_amount.toLocaleString()}`
                      : "—"}
                  </p>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : r.status === "checked_in"
                          ? "bg-blue-100 text-blue-700"
                          : r.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.confirmation_number}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guest Memory (AI) */}
      {memories.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-3">AI Guest Memory</h2>
          <div className="space-y-2">
            {memories.map((m) => (
              <div
                key={m.id}
                className="flex gap-3 py-2 border-b last:border-0"
              >
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 font-medium whitespace-nowrap">
                  {m.memory_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{m.content}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {m.source && <span className="mr-2">{m.source}</span>}
                    {new Date(m.created_at).toLocaleDateString()}
                    {m.confidence != null && (
                      <span className="ml-2 text-gray-300">
                        conf: {(m.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp History */}
      {messages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-900 mb-3">
            WhatsApp History (last 20)
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 ${m.direction === "outbound" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                    m.direction === "outbound"
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-gray-100 text-gray-800 rounded-tl-none"
                  }`}
                >
                  {m.body}
                  <p
                    className={`text-xs mt-1 ${m.direction === "outbound" ? "text-indigo-200" : "text-gray-400"}`}
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
