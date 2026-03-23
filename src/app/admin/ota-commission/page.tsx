"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface ChannelRow {
  source: string;
  bookings: number;
  revenue: number;
  commission: number;
}

interface RateParityRow {
  room_type: string;
  direct_price: number;
  ota_price: number;
  platform: string;
  is_parity_ok: boolean;
  difference_pct: number;
}

interface AnalysisSummary {
  directRevenueSaved: number;
  totalCommissionLost: number;
  softHoldsActive: number;
  channelRows: ChannelRow[];
  rateParity: RateParityRow[];
  generatedAt: string;
}

const OTA_RATES: Record<string, number> = {
  expedia: 18,
  booking: 15,
  agoda: 18,
  hotels: 18,
  tripadvisor: 12,
  airbnb: 3,
};

function commissionPct(source: string): number {
  const key = Object.keys(OTA_RATES).find((k) =>
    source.toLowerCase().includes(k),
  );
  return key ? OTA_RATES[key] : 0;
}

export default function OtaCommissionPage() {
  const [data, setData] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split("T")[0];

    (async () => {
      try {
        const [{ data: reservations }, { count: holds }] = await Promise.all([
          supabase
            .from("reservations")
            .select("source, total_price")
            .gte("created_at", sinceStr),
          supabase
            .from("booking_soft_holds")
            .select("id", { count: "exact", head: true })
            .gt("expires_at", new Date().toISOString()),
        ]);

        // Group by source
        const map: Record<string, ChannelRow> = {};
        for (const r of reservations ?? []) {
          const src = r.source ?? "direct";
          if (!map[src])
            map[src] = { source: src, bookings: 0, revenue: 0, commission: 0 };
          const rev = Number(r.total_price ?? 0);
          const pct = commissionPct(src);
          map[src].bookings += 1;
          map[src].revenue += rev;
          map[src].commission += rev * (pct / 100);
        }
        const channelRows = Object.values(map).sort(
          (a, b) => b.revenue - a.revenue,
        );

        const totalCommissionLost = channelRows.reduce(
          (s, r) => s + r.commission,
          0,
        );
        const directRow = channelRows.find((r) => r.source === "direct");
        const directRevenueSaved = directRow ? directRow.revenue * 0.15 : 0;

        setData({
          directRevenueSaved,
          totalCommissionLost,
          softHoldsActive: holds ?? 0,
          channelRows,
          rateParity: [],
          generatedAt: new Date().toLocaleString(),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRunCron() {
    setRunning(true);
    setRunMsg("");
    try {
      const res = await fetch(`/api/admin/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "channel-manager" }),
      });
      const json = await res.json();
      setRunMsg(
        res.ok
          ? `Done — ${json.holdsCleared ?? 0} expired holds cleared`
          : `Error: ${json.error ?? "unknown"}`,
      );
    } catch (e) {
      setRunMsg(String(e));
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalRevenue =
    data?.channelRows.reduce((s, r) => s + r.revenue, 0) ?? 0;
  const otaRevenue =
    data?.channelRows
      .filter((r) => r.source !== "direct" && r.source !== "whatsapp")
      .reduce((s, r) => s + r.revenue, 0) ?? 0;
  const directPct =
    totalRevenue > 0
      ? Math.round(
          (((data?.channelRows.find((r) => r.source === "direct")?.revenue ??
            0) +
            (data?.channelRows.find((r) => r.source === "whatsapp")?.revenue ??
              0)) /
            totalRevenue) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            OTA Commission & Channel Analysis
          </h1>
          <p className="text-sm text-gray-500">
            Last 30 days · generated {data?.generatedAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {runMsg && (
            <span className="text-sm text-teal-700 bg-teal-50 rounded px-3 py-1">
              {runMsg}
            </span>
          )}
          <button
            onClick={handleRunCron}
            disabled={running}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {running ? "Running…" : "Run Channel Manager"}
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Commission Lost (30d)"
          value={`$${(data?.totalCommissionLost ?? 0).toLocaleString("en", { maximumFractionDigits: 0 })}`}
          sub="paid to OTAs"
          color="red"
        />
        <KpiCard
          label="Direct Revenue Saved"
          value={`$${(data?.directRevenueSaved ?? 0).toLocaleString("en", { maximumFractionDigits: 0 })}`}
          sub="vs booking via OTAs"
          color="green"
        />
        <KpiCard
          label="Direct Booking Share"
          value={`${directPct}%`}
          sub="direct + WhatsApp"
          color="teal"
        />
        <KpiCard
          label="Soft Holds Active"
          value={String(data?.softHoldsActive ?? 0)}
          sub="pending payments"
          color="indigo"
        />
      </div>

      {/* Booking source breakdown */}
      <section className="rounded-xl bg-white shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Booking Source Breakdown
        </h2>
        {(data?.channelRows.length ?? 0) === 0 ? (
          <p className="text-sm text-gray-400">
            No reservations with a source tag yet. Add a{" "}
            <code className="text-xs">source</code> column to your reservations
            to track channels.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-6">Channel</th>
                  <th className="pb-2 pr-6 text-right">Bookings</th>
                  <th className="pb-2 pr-6 text-right">Revenue</th>
                  <th className="pb-2 pr-6 text-right">Commission</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.channelRows.map((row) => {
                  const pct = commissionPct(row.source);
                  const isDirect =
                    row.source === "direct" || row.source === "whatsapp";
                  return (
                    <tr key={row.source} className="hover:bg-gray-50">
                      <td className="py-2 pr-6 font-medium capitalize">
                        {row.source}
                        {isDirect && (
                          <span className="ml-2 text-xs text-teal-600 bg-teal-50 rounded px-1.5 py-0.5">
                            direct
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-6 text-right">{row.bookings}</td>
                      <td className="py-2 pr-6 text-right">
                        $
                        {row.revenue.toLocaleString("en", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                      <td className="py-2 pr-6 text-right font-medium text-red-600">
                        {row.commission > 0
                          ? `$${row.commission.toLocaleString("en", { maximumFractionDigits: 0 })}`
                          : "—"}
                      </td>
                      <td className="py-2 text-right text-gray-500">
                        {pct > 0 ? `${pct}%` : "0%"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* OTA independence bar */}
      {totalRevenue > 0 && (
        <section className="rounded-xl bg-white shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            OTA Independence Score
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Target: &gt;70% direct bookings
          </p>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${directPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="font-semibold text-teal-700">
              {directPct}% direct
            </span>
            <span>100%</span>
          </div>
        </section>
      )}

      {/* OTA commission reduction opportunities */}
      <section className="rounded-xl bg-amber-50 border border-amber-100 p-6">
        <h2 className="text-base font-semibold text-amber-900 mb-3">
          Commission Reduction Playbook
        </h2>
        <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
          <li>
            Add a direct booking price guarantee (we charge $
            {(otaRevenue * 0.05).toLocaleString("en", {
              maximumFractionDigits: 0,
            })}{" "}
            extra on OTA rates — remove it for direct guests)
          </li>
          <li>
            WhatsApp-first: collect guest phone numbers at check-in for next
            booking
          </li>
          <li>
            Loyalty programme: returning guests get 10 % off if they book direct
          </li>
          <li>
            Target Airbnb migration first (3% commission → 0% direct saves the
            most per booking)
          </li>
        </ul>
      </section>

      <div className="text-xs text-gray-400 text-right">
        <Link href="/admin/dashboard" className="hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "red" | "green" | "teal" | "indigo";
}) {
  const bg: Record<string, string> = {
    red: "bg-red-50",
    green: "bg-emerald-50",
    teal: "bg-teal-50",
    indigo: "bg-indigo-50",
  };
  const text: Record<string, string> = {
    red: "text-red-700",
    green: "text-emerald-700",
    teal: "text-teal-700",
    indigo: "text-indigo-700",
  };
  return (
    <div className={`rounded-xl p-5 shadow-sm ${bg[color]}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${text[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
