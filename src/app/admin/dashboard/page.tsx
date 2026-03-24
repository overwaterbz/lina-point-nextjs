"use client";

import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";

interface KPIs {
  activeReservations: number;
  occupiedRooms: number;
  totalRooms: number;
  pendingHousekeeping: number;
  unpaidInvoices: number;
  unreadNotifications: number;
  upcomingTours: number;
}

interface RecentReservation {
  id: string;
  confirmation_number: string;
  check_in: string;
  check_out: string;
  status: string;
  rooms: { name: string } | null;
}

interface HousekeepingTask {
  id: string;
  task_type: string;
  status: string;
  priority: string;
  rooms: { name: string } | null;
}

export default function AdminDashboardPage() {
  const { user, profile, loading } = useAuth();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [recentRes, setRecentRes] = useState<RecentReservation[]>([]);
  const [housekeeping, setHousekeeping] = useState<HousekeepingTask[]>([]);
  const [revpar, setRevpar] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) {
      setFetching(false);
      return;
    }
    const supabase = createBrowserSupabaseClient();
    const today = new Date().toISOString().split("T")[0];

    (async () => {
      try {
        const [
          { count: activeRes },
          { count: totalRooms },
          { count: occupiedRooms },
          { count: pendingHK },
          { count: unpaidInv },
          { count: unreadNotif },
          { count: upcomingTours },
          { data: recent },
          { data: hkTasks },
          { data: revenueSnap },
        ] = await Promise.all([
          supabase
            .from("reservations")
            .select("id", { count: "exact", head: true })
            .in("status", ["confirmed", "checked_in"]),
          supabase.from("rooms").select("id", { count: "exact", head: true }),
          supabase
            .from("room_inventory")
            .select("id", { count: "exact", head: true })
            .eq("date", today)
            .eq("status", "booked"),
          supabase
            .from("housekeeping_tasks")
            .select("id", { count: "exact", head: true })
            .eq("date", today)
            .in("status", ["pending", "in_progress"]),
          supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .in("status", ["draft", "sent"]),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .or(`user_id.eq.${user.id},user_id.is.null`)
            .eq("read", false),
          supabase
            .from("tour_bookings")
            .select("id", { count: "exact", head: true })
            .gte("tour_date", today)
            .eq("status", "confirmed"),
          supabase
            .from("reservations")
            .select(
              "id, confirmation_number, check_in, check_out, status, rooms(name)",
            )
            .order("check_in", { ascending: false })
            .limit(5),
          supabase
            .from("housekeeping_tasks")
            .select("id, task_type, status, priority, rooms(name)")
            .eq("date", today)
            .order("priority", { ascending: true })
            .limit(5),
          supabase
            .from("revenue_snapshots")
            .select("total_room_revenue, total_rooms")
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setKpis({
          activeReservations: activeRes || 0,
          totalRooms: totalRooms || 0,
          occupiedRooms: occupiedRooms || 0,
          pendingHousekeeping: pendingHK || 0,
          unpaidInvoices: unpaidInv || 0,
          unreadNotifications: unreadNotif || 0,
          upcomingTours: upcomingTours || 0,
        });
        setRecentRes((recent || []) as unknown as RecentReservation[]);
        setHousekeeping((hkTasks || []) as unknown as HousekeepingTask[]);
        if (revenueSnap && revenueSnap.total_rooms > 0) {
          setRevpar(
            Math.round(
              revenueSnap.total_room_revenue / revenueSnap.total_rooms,
            ),
          );
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setFetching(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null; // Layout handles redirect
  }

  const occupancyPct =
    kpis && kpis.totalRooms > 0
      ? Math.round((kpis.occupiedRooms / kpis.totalRooms) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-600">
          Today&apos;s snapshot —{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </header>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Reservations"
          value={kpis?.activeReservations ?? 0}
          icon="🗓️"
          href="/admin/calendar"
        />
        <KpiCard
          label="Occupancy Today"
          value={`${occupancyPct}%`}
          sub={`${kpis?.occupiedRooms ?? 0} / ${kpis?.totalRooms ?? 0} rooms`}
          icon="🏨"
          href="/admin/rooms"
        />
        <KpiCard
          label="RevPAR"
          value={revpar !== null ? `$${revpar}` : "—"}
          sub="revenue per room"
          icon="📈"
          href="/admin/pricing"
        />
        <KpiCard
          label="Housekeeping"
          value={kpis?.pendingHousekeeping ?? 0}
          sub="pending today"
          icon="🧹"
          href="/admin/housekeeping"
        />
        <KpiCard
          label="Upcoming Tours"
          value={kpis?.upcomingTours ?? 0}
          icon="🌊"
          href="/admin/tours"
        />
        <KpiCard
          label="Unpaid Invoices"
          value={kpis?.unpaidInvoices ?? 0}
          icon="💰"
          href="/admin/pricing"
        />
        <KpiCard
          label="Notifications"
          value={kpis?.unreadNotifications ?? 0}
          sub="unread"
          icon="🔔"
          href="/admin/notifications"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reservations */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Reservations
            </h2>
            <Link
              href="/admin/calendar"
              className="text-sm text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {recentRes.length === 0 ? (
            <p className="text-sm text-gray-400">No reservations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Confirmation</th>
                    <th className="py-2 pr-4">Room</th>
                    <th className="py-2 pr-4">Check-in</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRes.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.confirmation_number}
                      </td>
                      <td className="py-2 pr-4">{r.rooms?.name ?? "—"}</td>
                      <td className="py-2 pr-4 text-gray-500">
                        {new Date(r.check_in).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Housekeeping Today */}
        <section className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Housekeeping Today
            </h2>
            <Link
              href="/admin/housekeeping"
              className="text-sm text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {housekeeping.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks for today.</p>
          ) : (
            <div className="space-y-2">
              {housekeeping.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {t.rooms?.name ?? "—"}
                    </span>
                    <span className="ml-2 text-gray-500 capitalize">
                      {t.task_type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityDot priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  href?: string;
}) {
  const content = (
    <div className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    checked_in: "bg-blue-100 text-blue-700",
    checked_out: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-400",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full inline-block ${colors[priority] || "bg-gray-400"}`}
      title={priority}
    />
  );
}
