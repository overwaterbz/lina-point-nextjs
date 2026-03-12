'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';

interface Reservation {
  id: string;
  confirmation_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  total_cost: number | null;
  num_guests: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  checked_in: 'bg-blue-100 text-blue-700',
  checked_out: 'bg-gray-100 text-gray-600',
};

export default function ReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const { data } = await supabase
          .from('reservations')
          .select('id, confirmation_number, room_type, check_in, check_out, status, total_cost, num_guests, created_at')
          .eq('user_id', user.id)
          .order('check_in', { ascending: false });
        setReservations(data || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const now = new Date();
  const filtered = reservations.filter((r) => {
    if (filter === 'upcoming') return new Date(r.check_in) >= now;
    if (filter === 'past') return new Date(r.check_out) < now;
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage your bookings at Lina Point</p>
        </div>
        <Link
          href="/rooms"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          + New Booking
        </Link>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'upcoming', 'past'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-3xl mb-3">🏖️</p>
          <h2 className="text-lg font-semibold text-gray-900">No reservations found</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filter === 'upcoming'
              ? "You don't have any upcoming stays. Time to plan your next island getaway!"
              : 'Your reservation history will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-lg shadow p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {r.room_type.replace(/_/g, ' ')}
                  </h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(r.check_in).toLocaleDateString()} – {new Date(r.check_out).toLocaleDateString()}
                  {r.num_guests ? ` · ${r.num_guests} guest${r.num_guests > 1 ? 's' : ''}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {r.total_cost != null && (
                  <p className="text-lg font-bold text-gray-900">${r.total_cost}</p>
                )}
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
                  {r.confirmation_number}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
