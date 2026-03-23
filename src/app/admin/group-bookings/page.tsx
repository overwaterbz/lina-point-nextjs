"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface GroupQuote {
  id: string;
  check_in_date: string;
  check_out_date: string;
  event_type: string;
  total_guests: number;
  rooms_required: number;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  special_requirements: string | null;
  grand_total: number | null;
  discount_pct: number;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-yellow-100 text-yellow-700",
};

export default function GroupBookingsPage() {
  const [quotes, setQuotes] = useState<GroupQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const refetch = async (currentFilter: string) => {
    const supabase = createBrowserSupabaseClient();
    let query = supabase
      .from("group_booking_quotes")
      .select("*")
      .order("created_at", { ascending: false });
    if (currentFilter !== "all") query = query.eq("status", currentFilter);
    const { data } = await query;
    setQuotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      let query = supabase
        .from("group_booking_quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      if (active) {
        setQuotes(data || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter]);

  const handleStatusChange = async (id: string, status: string) => {
    const supabase = createBrowserSupabaseClient();
    await supabase
      .from("group_booking_quotes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    refetch(filter);
  };

  const nights = (q: GroupQuote) => {
    const ms =
      new Date(q.check_out_date).getTime() -
      new Date(q.check_in_date).getTime();
    return Math.round(ms / 86400000);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Bookings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage group quotes and event bookings
          </p>
        </div>
        <span className="text-sm text-gray-500">{quotes.length} quotes</span>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "draft", "sent", "accepted", "declined", "expired"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ),
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No group quotes found
        </div>
      ) : (
        <div className="grid gap-4">
          {quotes.map((q) => (
            <div key={q.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 capitalize">
                      {q.event_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status] || STATUS_COLORS.draft}`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(q.check_in_date).toLocaleDateString()} –{" "}
                    {new Date(q.check_out_date).toLocaleDateString()}
                    <span className="ml-2 text-gray-400">
                      ({nights(q)} nights)
                    </span>
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>👥 {q.total_guests} guests</span>
                    <span>🏨 {q.rooms_required} rooms</span>
                    {q.grand_total != null && (
                      <span className="font-medium text-gray-900">
                        ${q.grand_total.toLocaleString()}
                        {q.discount_pct > 0 && (
                          <span className="ml-1 text-green-600 text-xs">
                            (-{q.discount_pct}%)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {q.contact_name && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">
                        {q.contact_name}
                      </span>
                      {q.contact_email && (
                        <span className="ml-2">{q.contact_email}</span>
                      )}
                      {q.contact_phone && (
                        <span className="ml-2">{q.contact_phone}</span>
                      )}
                    </div>
                  )}
                  {q.special_requirements && (
                    <p className="mt-1 text-xs text-gray-400 italic">
                      &ldquo;{q.special_requirements}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {q.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange(q.id, "sent")}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Mark Sent
                    </button>
                  )}
                  {q.status === "sent" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(q.id, "accepted")}
                        className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange(q.id, "declined")}
                        className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {q.valid_until && (
                    <span className="text-xs text-gray-400">
                      Valid until {new Date(q.valid_until).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
