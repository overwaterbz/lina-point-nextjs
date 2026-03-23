"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface AgentRun {
  id: string;
  agent_name: string;
  status: string;
  duration_ms: number | null;
  started_at: string;
  error_message: string | null;
}

interface Insight {
  id: string;
  insight_type: string;
  title: string;
  body: string;
  confidence: number | null;
  status: string;
  action_suggestion: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

interface PendingPrompt {
  id: string;
  agent_name: string;
  prompt_text: string;
  previous_prompt: string | null;
  version: number;
  change_type: string;
  updated_at: string;
}

interface FunnelStepStat {
  step: number;
  variantA_count: number;
  variantB_count: number;
  variantA_conversions: number;
  variantB_conversions: number;
}

export default function AIMonitorPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pendingPrompts, setPendingPrompts] = useState<PendingPrompt[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStepStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai");
      if (res.ok) {
        const data = await res.json();
        setPendingPrompts(data.pending || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handlePromptAction = useCallback(
    async (promptId: string, action: "approve" | "reject") => {
      try {
        const res = await fetch("/api/admin/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ promptId, action }),
        });
        if (res.ok) {
          setPendingPrompts((prev) => prev.filter((p) => p.id !== promptId));
        }
      } catch (err) {
        console.error(err);
      }
    },
    [],
  );

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const [runsRes, insightsRes] = await Promise.all([
          supabase
            .from("agent_runs")
            .select(
              "id, agent_name, status, duration_ms, started_at, error_message",
            )
            .order("started_at", { ascending: false })
            .limit(30),
          supabase
            .from("ai_insights")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        setRuns(runsRes.data || []);
        setInsights(insightsRes.data || []);

        // Fetch funnel experiment A/B stats
        const { data: funnelRows } = await supabase
          .from("funnel_experiments")
          .select("variant, step_reached, converted");

        if (funnelRows?.length) {
          const stats: FunnelStepStat[] = Array.from({ length: 6 }, (_, i) => ({
            step: i + 1,
            variantA_count: funnelRows.filter(
              (r) => r.variant === "A" && r.step_reached >= i + 1,
            ).length,
            variantB_count: funnelRows.filter(
              (r) => r.variant === "B" && r.step_reached >= i + 1,
            ).length,
            variantA_conversions: funnelRows.filter(
              (r) =>
                r.variant === "A" && r.converted && r.step_reached >= i + 1,
            ).length,
            variantB_conversions: funnelRows.filter(
              (r) =>
                r.variant === "B" && r.converted && r.step_reached >= i + 1,
            ).length,
          }));
          setFunnelStats(stats);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      // Fetch pending prompts via API
      await fetchPrompts();
    })();
  }, [fetchPrompts]);

  // Agent stats
  const agents = [...new Set(runs.map((r) => r.agent_name))];
  const agentStats = agents.map((name) => {
    const agentRuns = runs.filter((r) => r.agent_name === name);
    const successRate =
      agentRuns.length > 0
        ? Math.round(
            (agentRuns.filter((r) => r.status === "success").length /
              agentRuns.length) *
              100,
          )
        : 0;
    const avgDuration =
      agentRuns.filter((r) => r.duration_ms).length > 0
        ? Math.round(
            agentRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) /
              agentRuns.filter((r) => r.duration_ms).length,
          )
        : 0;
    return {
      name,
      runs: agentRuns.length,
      successRate,
      avgDuration,
      lastRun: agentRuns[0],
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">AI Agent Monitor</h1>
        <p className="text-sm text-gray-600 mt-1">
          Real-time agent performance, insights, and self-improvement status
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Agent cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agentStats.map((agent) => (
              <div key={agent.name} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  {agent.lastRun && (
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[agent.lastRun.status] || "bg-gray-100"}`}
                    >
                      {agent.lastRun.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {agent.runs}
                    </p>
                    <p className="text-[10px] text-gray-500">Runs</p>
                  </div>
                  <div>
                    <p
                      className={`text-lg font-bold ${agent.successRate >= 90 ? "text-green-600" : agent.successRate >= 70 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {agent.successRate}%
                    </p>
                    <p className="text-[10px] text-gray-500">Success</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {agent.avgDuration}ms
                    </p>
                    <p className="text-[10px] text-gray-500">Avg Time</p>
                  </div>
                </div>
              </div>
            ))}
            {agentStats.length === 0 && (
              <div className="sm:col-span-3 bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No agent runs recorded yet</p>
              </div>
            )}
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-900 mb-4">AI Insights</h2>
            {insights.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No insights generated yet
              </p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          insight.status === "new"
                            ? "bg-blue-100 text-blue-700"
                            : insight.status === "acted"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {insight.status}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {insight.insight_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {insight.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{insight.body}</p>
                    {insight.action_suggestion && (
                      <p className="text-xs text-green-600 mt-1">
                        Suggestion: {insight.action_suggestion}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(insight.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt Versioning — Pending Reviews */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Prompt Updates — Pending Review
              </h2>
              <span className="text-xs text-gray-500">
                Directional changes need your approval
              </span>
            </div>
            {pendingPrompts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No pending prompt updates
              </p>
            ) : (
              <div className="space-y-3">
                {pendingPrompts.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {prompt.agent_name}
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          v{prompt.version}
                        </span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          {prompt.change_type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handlePromptAction(prompt.id, "approve")
                          }
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handlePromptAction(prompt.id, "reject")
                          }
                          className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                      {prompt.prompt_text}
                    </div>
                    {prompt.previous_prompt && (
                      <details className="text-xs">
                        <summary className="text-gray-400 cursor-pointer hover:text-gray-600">
                          Previous prompt
                        </summary>
                        <div className="text-gray-500 bg-gray-50 rounded p-2 mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap">
                          {prompt.previous_prompt}
                        </div>
                      </details>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(prompt.updated_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* A/B Funnel Results */}
          {funnelStats.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="font-semibold text-gray-900 mb-1">
                Booking Funnel A/B Results
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                Sessions reaching each step — Variant A (control) vs B (test)
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">
                        Step
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        A Sessions
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        A Conv %
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        B Sessions
                      </th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">
                        B Conv %
                      </th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">
                        Winner
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelStats.map((stat) => {
                      const aConvRate =
                        stat.variantA_count > 0
                          ? (stat.variantA_conversions / stat.variantA_count) *
                            100
                          : 0;
                      const bConvRate =
                        stat.variantB_count > 0
                          ? (stat.variantB_conversions / stat.variantB_count) *
                            100
                          : 0;
                      const stepLabels = [
                        "Dates",
                        "Room",
                        "Experiences",
                        "Review",
                        "Magic Family",
                        "Checkout",
                      ];
                      const winner =
                        Math.abs(bConvRate - aConvRate) < 1
                          ? null
                          : bConvRate > aConvRate
                            ? "B"
                            : "A";
                      return (
                        <tr key={stat.step} className="border-t">
                          <td className="px-3 py-2 text-gray-700 font-medium">
                            Step {stat.step}: {stepLabels[stat.step - 1]}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {stat.variantA_count}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            {aConvRate.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {stat.variantB_count}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            {bConvRate.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-center">
                            {winner ? (
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  winner === "B"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {winner}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent runs table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Recent Runs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
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
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 15).map((run) => (
                    <tr key={run.id} className="border-t">
                      <td className="px-4 py-2 text-gray-900">
                        {run.agent_name}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[run.status] || "bg-gray-100"}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {run.duration_ms ? `${run.duration_ms}ms` : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
