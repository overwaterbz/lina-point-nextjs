/**
 * Ecosystem Command Center
 * Route: /admin/ecosystem
 *
 * Unified view of cross-site analytics, lead funnel,
 * marketing triggers, nurture sequences, and campaign performance.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@supabase/supabase-js";

interface Snapshot {
  snapshot_date: string;
  overwater_events: number;
  lina_point_events: number;
  magic_is_you_events: number;
  total_sessions: number;
  cross_site_sessions: number;
  new_leads: number;
  hot_leads: number;
  qualified_leads: number;
  triggers_fired: number;
  emails_sent: number;
  blog_posts_published: number;
  campaigns_run: number;
}

interface LeadScore {
  id: string;
  session_id: string;
  score: number;
  tier: string;
  sources: string[];
  quiz_element: string | null;
  has_blueprint: boolean;
  has_booking: boolean;
  has_subscription: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

interface Trigger {
  id: string;
  trigger_type: string;
  action_taken: string;
  status: string;
  created_at: string;
}

interface NurtureSeq {
  id: string;
  sequence_name: string;
  current_step: number;
  total_steps: number;
  status: string;
  created_at: string;
}

export default function EcosystemCommandCenter() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [leads, setLeads] = useState<LeadScore[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [sequences, setSequences] = useState<NurtureSeq[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "triggers" | "nurture">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [snapshotRes, leadRes, triggerRes, seqRes] = await Promise.all([
      supabase
        .from("ecosystem_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(14),
      supabase
        .from("lead_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(100),
      supabase
        .from("marketing_triggers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("nurture_sequences")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setSnapshots(snapshotRes.data || []);
    setLeads(leadRes.data || []);
    setTriggers(triggerRes.data || []);
    setSequences(seqRes.data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login?redirect=/admin/ecosystem");
      return;
    }
    if (user) fetchData();
  }, [user, authLoading, router, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-lg animate-pulse">Loading Command Center...</div>
      </div>
    );
  }

  const latest = snapshots[0];
  const tierCounts = {
    cold: leads.filter((l) => l.tier === "cold").length,
    warm: leads.filter((l) => l.tier === "warm").length,
    hot: leads.filter((l) => l.tier === "hot").length,
    qualified: leads.filter((l) => l.tier === "qualified").length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-amber-900/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Ecosystem Command Center</h1>
            <p className="text-gray-500 text-sm">Overwater · Lina Point · The Magic Is You</p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-amber-600/20 border border-amber-600/40 rounded-lg text-amber-400 hover:bg-amber-600/30 transition text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        {latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KPICard label="OW Events" value={latest.overwater_events} color="blue" />
            <KPICard label="LP Events" value={latest.lina_point_events} color="green" />
            <KPICard label="MIY Events" value={latest.magic_is_you_events} color="purple" />
            <KPICard label="Sessions" value={latest.total_sessions} color="amber" />
            <KPICard label="Cross-Site" value={latest.cross_site_sessions} color="cyan" />
            <KPICard label="Triggers" value={latest.triggers_fired} color="red" />
          </div>
        )}

        {/* Lead Funnel */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-amber-400 mb-4">Lead Funnel</h2>
          <div className="flex items-end gap-2 h-32">
            <FunnelBar label="Cold" count={tierCounts.cold} total={leads.length} color="bg-gray-600" />
            <FunnelBar label="Warm" count={tierCounts.warm} total={leads.length} color="bg-yellow-600" />
            <FunnelBar label="Hot" count={tierCounts.hot} total={leads.length} color="bg-orange-500" />
            <FunnelBar label="Qualified" count={tierCounts.qualified} total={leads.length} color="bg-red-500" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800 pb-1">
          {(["overview", "leads", "triggers", "nurture"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-amber-600/20 text-amber-400 border-b-2 border-amber-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Daily Snapshots (Last 14 Days)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-right py-2 px-3">OW</th>
                    <th className="text-right py-2 px-3">LP</th>
                    <th className="text-right py-2 px-3">MIY</th>
                    <th className="text-right py-2 px-3">Sessions</th>
                    <th className="text-right py-2 px-3">Cross-Site</th>
                    <th className="text-right py-2 px-3">New Leads</th>
                    <th className="text-right py-2 px-3">Triggers</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.snapshot_date} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-amber-400">{s.snapshot_date}</td>
                      <td className="text-right py-2 px-3">{s.overwater_events}</td>
                      <td className="text-right py-2 px-3">{s.lina_point_events}</td>
                      <td className="text-right py-2 px-3">{s.magic_is_you_events}</td>
                      <td className="text-right py-2 px-3">{s.total_sessions}</td>
                      <td className="text-right py-2 px-3 text-cyan-400">{s.cross_site_sessions}</td>
                      <td className="text-right py-2 px-3">{s.new_leads}</td>
                      <td className="text-right py-2 px-3">{s.triggers_fired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Top Leads by Score</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left py-2 px-3">Session</th>
                    <th className="text-right py-2 px-3">Score</th>
                    <th className="text-center py-2 px-3">Tier</th>
                    <th className="text-left py-2 px-3">Sources</th>
                    <th className="text-left py-2 px-3">Element</th>
                    <th className="text-center py-2 px-3">Blueprint</th>
                    <th className="text-center py-2 px-3">Booking</th>
                    <th className="text-left py-2 px-3">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 font-mono text-xs text-gray-400">{l.session_id.slice(0, 8)}…</td>
                      <td className="text-right py-2 px-3 font-bold text-amber-400">{l.score}</td>
                      <td className="text-center py-2 px-3">
                        <TierBadge tier={l.tier} />
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          {l.sources.map((s) => (
                            <SourceBadge key={s} source={s} />
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-300">{l.quiz_element || "—"}</td>
                      <td className="text-center py-2 px-3">{l.has_blueprint ? "✦" : "—"}</td>
                      <td className="text-center py-2 px-3">{l.has_booking ? "✓" : "—"}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{new Date(l.last_seen_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "triggers" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Recent Marketing Triggers</h3>
            <div className="space-y-2">
              {triggers.map((t) => (
                <div key={t.id} className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <span className="text-amber-400 font-medium">{t.trigger_type}</span>
                    <p className="text-gray-400 text-sm mt-1">{t.action_taken}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={t.status} />
                    <p className="text-gray-600 text-xs mt-1">{new Date(t.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {triggers.length === 0 && (
                <p className="text-gray-600 text-center py-8">No triggers fired yet. Events from all three sites will trigger autonomous marketing actions.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "nurture" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Nurture Sequences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500">
                    <th className="text-left py-2 px-3">Sequence</th>
                    <th className="text-center py-2 px-3">Progress</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {sequences.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-amber-400">{s.sequence_name.replace(/_/g, " ")}</td>
                      <td className="text-center py-2 px-3">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${(s.current_step / s.total_steps) * 100}%` }}
                            />
                          </div>
                          <span className="text-gray-400 text-xs">{s.current_step}/{s.total_steps}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-2 px-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {sequences.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-600">
                        No nurture sequences yet. Hot leads will auto-enroll when detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────

function KPICard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 border-blue-800/50",
    green: "text-green-400 border-green-800/50",
    purple: "text-purple-400 border-purple-800/50",
    amber: "text-amber-400 border-amber-800/50",
    cyan: "text-cyan-400 border-cyan-800/50",
    red: "text-red-400 border-red-800/50",
  };

  return (
    <div className={`bg-gray-900/60 border rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(" ")[0]}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full bg-gray-800/50 rounded-t relative" style={{ height: `${Math.max(pct, 5)}%` }}>
        <div className={`absolute bottom-0 w-full rounded-t ${color}`} style={{ height: "100%" }} />
      </div>
      <span className="text-white font-bold text-lg">{count}</span>
      <span className="text-gray-500 text-xs">{label}</span>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    cold: "bg-gray-700 text-gray-300",
    warm: "bg-yellow-900/50 text-yellow-400",
    hot: "bg-orange-900/50 text-orange-400",
    qualified: "bg-red-900/50 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier] || colors.cold}`}>
      {tier}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    overwater: "bg-blue-900/40 text-blue-400",
    "lina-point": "bg-green-900/40 text-green-400",
    "magic-is-you": "bg-purple-900/40 text-purple-400",
  };
  const labels: Record<string, string> = {
    overwater: "OW",
    "lina-point": "LP",
    "magic-is-you": "MIY",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${colors[source] || "bg-gray-800 text-gray-400"}`}>
      {labels[source] || source}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    sent: "bg-green-900/40 text-green-400",
    active: "bg-blue-900/40 text-blue-400",
    completed: "bg-amber-900/40 text-amber-400",
    failed: "bg-red-900/40 text-red-400",
    skipped: "bg-gray-700 text-gray-400",
    pending: "bg-yellow-900/40 text-yellow-400",
    paused: "bg-gray-700 text-gray-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}
