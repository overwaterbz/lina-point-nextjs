'use client';

import { useEffect, useState, useMemo } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Reservation {
  id: string;
  confirmation_number: string;
  room_type: string;
  room_number: string | null;
  check_in: string;
  check_out: string;
  status: string;
  guest_name: string | null;
  num_guests: number | null;
}

const ROOM_TYPES = ['cabana_1br', 'cabana_2br', 'suite_2nd_floor', 'overwater_suite'] as const;
const ROOM_LABELS: Record<string, string> = {
  cabana_1br: '1BR Cabana',
  cabana_2br: '2BR Cabana',
  suite_2nd_floor: 'Reef Suite',
  overwater_suite: 'Overwater Suite',
};
const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-500',
  checked_in: 'bg-blue-500',
  pending: 'bg-yellow-500',
  cancelled: 'bg-red-400',
  checked_out: 'bg-gray-400',
};

export default function CalendarPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'timeline'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 2, 0).toISOString().split('T')[0];

    (async () => {
      try {
        const { data } = await supabase
          .from('reservations')
          .select('id, confirmation_number, room_type, room_number, check_in, check_out, status, guest_name, num_guests')
          .gte('check_out', start)
          .lte('check_in', end)
          .order('check_in');
        setReservations(data || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month grid helpers
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date();

  // Timeline: 14-day window starting from 3 days ago
  const timelineStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d;
  }, []);
  const timelineDays = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(timelineStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getReservationsForDay = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(
      (r) => r.check_in <= dateStr && r.check_out > dateStr
    );
  };

  const getTimelineReservations = (roomType: string) => {
    return reservations.filter((r) => r.room_type === roomType);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservation Calendar</h1>
          <p className="text-sm text-gray-600 mt-1">Property-wide availability and booking timeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${view === 'month' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Month
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${view === 'timeline' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Timeline
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : view === 'month' ? (
        /* Month Grid View */
        <div className="bg-white rounded-lg shadow">
          <div className="flex items-center justify-between p-4 border-b">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">←</button>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">→</button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {/* Empty cells for first week offset */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100" />
            ))}
            {days.map((day) => {
              const dayReservations = getReservationsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div
                  key={day}
                  className={`h-24 border-b border-r border-gray-100 p-1 ${isToday ? 'bg-indigo-50' : ''}`}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-700' : 'text-gray-500'}`}>{day}</p>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayReservations.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        className={`text-[10px] text-white px-1 py-0.5 rounded truncate ${STATUS_COLORS[r.status] || 'bg-gray-400'}`}
                        title={`${r.guest_name || r.confirmation_number} — ${ROOM_LABELS[r.room_type] || r.room_type}`}
                      >
                        {r.guest_name || r.confirmation_number}
                      </div>
                    ))}
                    {dayReservations.length > 3 && (
                      <p className="text-[10px] text-gray-400">+{dayReservations.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Timeline / Gantt View */
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-white z-10 px-4 py-2 text-left text-xs font-medium text-gray-500 w-36">
                  Room Type
                </th>
                {timelineDays.map((d) => {
                  const isToday = d.toDateString() === today.toDateString();
                  return (
                    <th
                      key={d.toISOString()}
                      className={`px-1 py-2 text-center text-[10px] font-medium min-w-[50px] ${isToday ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'}`}
                    >
                      <div>{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                      <div>{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROOM_TYPES.map((rt) => {
                const rtReservations = getTimelineReservations(rt);
                return (
                  <tr key={rt} className="border-b">
                    <td className="sticky left-0 bg-white z-10 px-4 py-3 text-sm font-medium text-gray-900">
                      {ROOM_LABELS[rt]}
                    </td>
                    {timelineDays.map((d) => {
                      const dateStr = d.toISOString().split('T')[0];
                      const active = rtReservations.filter(
                        (r) => r.check_in <= dateStr && r.check_out > dateStr
                      );
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <td
                          key={d.toISOString()}
                          className={`px-0.5 py-1 text-center ${isToday ? 'bg-indigo-50' : ''}`}
                        >
                          {active.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {active.slice(0, 2).map((r) => (
                                <div
                                  key={r.id}
                                  className={`h-5 rounded text-[9px] text-white flex items-center justify-center ${STATUS_COLORS[r.status] || 'bg-gray-400'}`}
                                  title={`${r.guest_name || r.confirmation_number}`}
                                >
                                  {active.length === 1 ? (r.guest_name?.split(' ')[0] || r.confirmation_number.slice(-4)) : ''}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-5 rounded bg-green-100" title="Available" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex items-center gap-4 p-3 border-t text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Confirmed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Checked In</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" /> Past</span>
          </div>
        </div>
      )}

      {/* Upcoming check-ins / check-outs */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Check-ins</h3>
          {reservations.filter((r) => r.check_in === today.toISOString().split('T')[0]).length === 0 ? (
            <p className="text-sm text-gray-500">No check-ins today</p>
          ) : (
            <div className="space-y-2">
              {reservations
                .filter((r) => r.check_in === today.toISOString().split('T')[0])
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.guest_name || r.confirmation_number}</span>
                    <span className="text-gray-500">{ROOM_LABELS[r.room_type]}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Check-outs</h3>
          {reservations.filter((r) => r.check_out === today.toISOString().split('T')[0]).length === 0 ? (
            <p className="text-sm text-gray-500">No check-outs today</p>
          ) : (
            <div className="space-y-2">
              {reservations
                .filter((r) => r.check_out === today.toISOString().split('T')[0])
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{r.guest_name || r.confirmation_number}</span>
                    <span className="text-gray-500">{ROOM_LABELS[r.room_type]}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
