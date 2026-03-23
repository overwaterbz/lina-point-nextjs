"use client";

import { useEffect, useState, useCallback } from "react";

interface RevenueData {
  date: string;
  occupancy: { booked: number; total: number; pct: number };
  revenue30d: {
    rooms: number;
    tours: number;
    tourCommission: number;
    upsells: number;
    total: number;
  };
  reservations30d: {
    total: number;
    confirmed: number;
    paid: number;
    cancelled: number;
  };
  roomBreakdown: Record<string, { count: number; revenue: number }>;
  upsells: {
    offered: number;
    accepted: number;
    conversionPct: number;
    revenue: number;
  };
  guests: { total: number; loyal: number };
  whatsapp: { messages30d: number };
}

const ROOM_LABELS: Record<string, string> = {
  suite_1st_floor: "1st Floor Suite",
  suite_2nd_floor: "2nd Floor Suite",
  cabana_duplex: "1 Bed Duplex Cabana",
  cabana_1br: "1BR Cabana",
  cabana_2br: "2BR Cabana",
};

const ROOM_COLORS: Record<string, string> = {
  suite_1st_floor: "#0d9488",
  suite_2nd_floor: "#7c3aed",
  cabana_duplex: "#059669",
  cabana_1br: "#2563eb",
  cabana_2br: "#d97706",
};

function StatCard({
  label,
  value,
  sub,
  color = "#0d9488",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct > 90 ? "#dc2626" : pct > 70 ? "#d97706" : "#0d9488";
  return (
    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function BarChart({
  data,
  maxValue,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  maxValue: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 w-28 truncate">
            {item.label}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
              style={{
                width: `${maxValue > 0 ? Math.max((item.value / maxValue) * 100, 5) : 5}%`,
                backgroundColor: item.color,
              }}
            >
              <span className="text-xs font-bold text-white">
                ${item.value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RevenueDashboardPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/revenue", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-3">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-500 font-semibold text-lg">
            Failed to load dashboard
          </p>
          <p className="text-gray-500 text-sm mt-2">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const roomChartData = Object.entries(data.roomBreakdown).map(
    ([type, info]) => ({
      label: ROOM_LABELS[type] || type,
      value: info.revenue,
      color: ROOM_COLORS[type] || "#6b7280",
    }),
  );
  const maxRoomRevenue = Math.max(...roomChartData.map((d) => d.value), 1);

  const revenueSegments = [
    { label: "Room Revenue", value: data.revenue30d.rooms, color: "#0d9488" },
    { label: "Tour Revenue", value: data.revenue30d.tours, color: "#2563eb" },
    {
      label: "Tour Commission",
      value: data.revenue30d.tourCommission,
      color: "#7c3aed",
    },
    {
      label: "Upsell Revenue",
      value: data.revenue30d.upsells,
      color: "#d97706",
    },
  ];
  const maxRevSegment = Math.max(...revenueSegments.map((s) => s.value), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Revenue Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Live data as of{" "}
              {new Date(data.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full" />
            )}
            <a
              href="/admin/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              ← Admin Home
            </a>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Today's Occupancy"
            value={`${data.occupancy.pct}%`}
            sub={`${data.occupancy.booked}/${data.occupancy.total} rooms`}
            color={
              data.occupancy.pct > 90
                ? "#dc2626"
                : data.occupancy.pct > 70
                  ? "#d97706"
                  : "#0d9488"
            }
          />
          <StatCard
            label="30-Day Revenue"
            value={`$${data.revenue30d.total.toLocaleString()}`}
            sub="All sources combined"
          />
          <StatCard
            label="Reservations"
            value={data.reservations30d.confirmed}
            sub={`${data.reservations30d.paid} paid · ${data.reservations30d.cancelled} cancelled`}
            color="#2563eb"
          />
          <StatCard
            label="Guest Database"
            value={data.guests.total}
            sub={`${data.guests.loyal} loyal/VIP`}
            color="#7c3aed"
          />
        </div>

        {/* Occupancy Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Today&apos;s Occupancy
            </h2>
            <span
              className="text-2xl font-bold"
              style={{ color: data.occupancy.pct > 90 ? "#dc2626" : "#0d9488" }}
            >
              {data.occupancy.booked}/{data.occupancy.total}
            </span>
          </div>
          <OccupancyBar pct={data.occupancy.pct} />
          <p className="text-xs text-gray-400 mt-2">
            {data.occupancy.total - data.occupancy.booked} rooms available
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Breakdown (30d)
            </h2>
            <BarChart data={revenueSegments} maxValue={maxRevSegment} />
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-xl font-bold text-teal-600">
                ${data.revenue30d.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Room Type Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue by Room Type (30d)
            </h2>
            {roomChartData.length > 0 ? (
              <BarChart data={roomChartData} maxValue={maxRoomRevenue} />
            ) : (
              <p className="text-gray-400 text-sm">No booking data yet</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data.roomBreakdown).map(([type, info]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: ROOM_COLORS[type] || "#6b7280",
                      }}
                    />
                    <span className="text-xs text-gray-600">
                      {ROOM_LABELS[type] || type}: {info.count} bookings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Three-Column Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upsell Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upsell Performance
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Offers Sent</span>
                <span className="font-semibold">{data.upsells.offered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Accepted</span>
                <span className="font-semibold text-green-600">
                  {data.upsells.accepted}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Conversion</span>
                <span
                  className="font-semibold"
                  style={{
                    color:
                      data.upsells.conversionPct > 20 ? "#059669" : "#d97706",
                  }}
                >
                  {data.upsells.conversionPct}%
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Revenue
                </span>
                <span className="text-lg font-bold text-amber-600">
                  ${data.upsells.revenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Reservation Funnel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Funnel (30d)
            </h2>
            <div className="space-y-2">
              {[
                {
                  label: "Total",
                  value: data.reservations30d.total,
                  color: "#6b7280",
                  pct: 100,
                },
                {
                  label: "Confirmed",
                  value: data.reservations30d.confirmed,
                  color: "#2563eb",
                  pct:
                    data.reservations30d.total > 0
                      ? (data.reservations30d.confirmed /
                          data.reservations30d.total) *
                        100
                      : 0,
                },
                {
                  label: "Paid",
                  value: data.reservations30d.paid,
                  color: "#059669",
                  pct:
                    data.reservations30d.total > 0
                      ? (data.reservations30d.paid /
                          data.reservations30d.total) *
                        100
                      : 0,
                },
              ].map((step) => (
                <div key={step.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{step.label}</span>
                    <span className="font-semibold">{step.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(step.pct, 3)}%`,
                        backgroundColor: step.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              {data.reservations30d.cancelled > 0 && (
                <p className="text-xs text-red-500 mt-2">
                  {data.reservations30d.cancelled} cancelled
                </p>
              )}
            </div>
          </div>

          {/* WhatsApp & Engagement */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Engagement
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                  💬
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.whatsapp.messages30d}
                  </p>
                  <p className="text-xs text-gray-500">
                    WhatsApp messages (30d)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                  👑
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.guests.loyal}
                  </p>
                  <p className="text-xs text-gray-500">Loyal & VIP guests</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                  ⬆️
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.upsells.offered}
                  </p>
                  <p className="text-xs text-gray-500">
                    Upsell offers delivered
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
