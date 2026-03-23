"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface AgentRun {
  id: string;
  agent_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
}

const CRON_AGENTS = [
  "daily-guest-ops",
  "revenue-snapshot",
  "demand-forecast",
  "rate-parity",
  "tour-prices",
  "channel-manager",
  "competitor-intelligence",
  "pricing-outcome-eval",
  "reputation-monitor",
  "newsletter-digest",
  "social-content",
  "ical-sync",
  "self-improvement",
  "ecosystem-triggers",
  "send-proactive-messages",
  "in-stay-agent",
  "welcome-preparation",
  "post-stay-memory",
  "run-daily-marketing",
];

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  error: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function CronStatusPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { createBrowserSupabaseClient } = await import("@/lib/supabase");
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase
          .from("agent_runs")
          .select(
            "id, agent_type, status, started_at, completed_at, error, metadata",
          )
          .in("agent_type", CRON_AGENTS)
          .order("started_at", { ascending: false })
          .limit(200);
        if (active) setRuns(data || []);
      } catch (err) {
        toast.error("Failed to load cron runs");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Latest run per agent type
  const latestByAgent = CRON_AGENTS.reduce<
    Record<string, AgentRun | undefined>
  >((acc, name) => {
    acc[name] = runs.find((r) => r.agent_type === name);
    return acc;
  }, {});

  const successCount = CRON_AGENTS.filter((n) =>
    ["success", "completed"].includes(latestByAgent[n]?.status ?? ""),
  ).length;
  const failCount = CRON_AGENTS.filter((n) =>
    ["failed", "error"].includes(latestByAgent[n]?.status ?? ""),
  ).length;
  const unknownCount = CRON_AGENTS.filter((n) => !latestByAgent[n]).length;

  // Recent run history (last 50)
  const recent = runs.slice(0, 50);

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <header>
        <h1 className="text-2xl font-bold text-gray-900">Cron Status</h1>
        <p className="text-sm text-gray-600 mt-1">
          Last run status for all {CRON_AGENTS.length} scheduled AI agents
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{successCount}</p>
          <p className="text-xs text-gray-500 mt-1">Healthy</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{failCount}</p>
          <p className="text-xs text-gray-500 mt-1">Failed</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{unknownCount}</p>
          <p className="text-xs text-gray-500 mt-1">Never Run</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Latest status grid */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <h2 className="text-sm font-semibold text-gray-700">
                Latest Run Per Agent
              </h2>
            </div>
            <div className="divide-y">
              {CRON_AGENTS.map((name) => {
                const run = latestByAgent[name];
                const statusClass = run
                  ? (STATUS_COLORS[run.status] ?? "bg-gray-100 text-gray-600")
                  : "bg-gray-100 text-gray-400";
                const duration =
                  run?.started_at && run?.completed_at
                    ? `${((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(1)}s`
                    : null;
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {name}
                      </p>
                      {run?.error && (
                        <p className="text-xs text-red-600 mt-0.5 truncate max-w-xs">
                          {run.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      {duration && (
                        <span className="text-xs text-gray-400">
                          {duration}
                        </span>
                      )}
                      {run?.started_at && (
                        <span className="text-xs text-gray-400">
                          {relTime(run.started_at)}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}
                      >
                        {run?.status ?? "never run"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent activity log */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <h2 className="text-sm font-semibold text-gray-700">
                Recent Activity (last 50 runs)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Agent
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Duration
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Started
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => {
                    const dur =
                      r.started_at && r.completed_at
                        ? `${((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)}s`
                        : "—";
                    return (
                      <tr key={r.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">
                          {r.agent_type}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {dur}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-400">
                          {relTime(r.started_at)}
                        </td>
                        <td className="px-4 py-2 text-xs text-red-500 max-w-xs truncate">
                          {r.error ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                  {recent.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-400"
                      >
                        No cron runs recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
