'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Reservation {
  id: string;
  confirmation_number: string;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const { data } = await supabase
          .from('reservations')
          .select('id, confirmation_number, room_type, check_in, check_out, status')
          .eq('user_id', user.id)
          .order('check_in', { ascending: true })
          .limit(3);
        setReservations(data || []);
      } catch {}
    })();
  }, [user]);

  if (loading) return null;

  const upcoming = reservations.filter(
    (r) => r.status === 'confirmed' && new Date(r.check_in) >= new Date()
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your Lina Point experience.
        </p>
      </header>

      {/* Onboarding prompt */}
      {!profile?.opt_in_magic && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-800">Complete your profile ✨</h3>
          <p className="text-sm text-amber-700 mt-1">
            Enable agent permissions to unlock personalized songs, videos, and curated experiences.
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            className="mt-3 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            Finish onboarding
          </button>
        </div>
      )}

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/reservations"
          className="bg-white rounded-lg shadow hover:shadow-md transition p-5 group"
        >
          <p className="text-2xl mb-2">🗓️</p>
          <h3 className="font-semibold text-gray-900 group-hover:text-teal-700">My Reservations</h3>
          <p className="text-sm text-gray-500 mt-1">View, modify, or cancel bookings</p>
        </Link>
        <Link
          href="/dashboard/tours"
          className="bg-white rounded-lg shadow hover:shadow-md transition p-5 group"
        >
          <p className="text-2xl mb-2">🌊</p>
          <h3 className="font-semibold text-gray-900 group-hover:text-teal-700">Tours & Activities</h3>
          <p className="text-sm text-gray-500 mt-1">Browse and book island adventures</p>
        </Link>
        <Link
          href="/dashboard/magic"
          className="bg-white rounded-lg shadow hover:shadow-md transition p-5 group"
        >
          <p className="text-2xl mb-2">✨</p>
          <h3 className="font-semibold text-gray-900 group-hover:text-teal-700">Magic Content</h3>
          <p className="text-sm text-gray-500 mt-1">Personalized songs & videos</p>
        </Link>
      </section>

      {/* Upcoming reservations */}
      <section className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Upcoming Stays</h2>
          <Link href="/dashboard/reservations" className="text-sm text-teal-600 hover:text-teal-800">
            View all →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🏖️</p>
            <p className="text-sm text-gray-500">No upcoming reservations. Ready to plan your next getaway?</p>
            <Link
              href="/rooms"
              className="inline-block mt-3 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Browse Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                <div className="text-2xl">🏨</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 capitalize">
                    {r.room_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(r.check_in).toLocaleDateString()} – {new Date(r.check_out).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {r.confirmation_number}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
