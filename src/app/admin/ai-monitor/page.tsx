'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

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
  success: 'bg-green-100 text-green-700',
  running: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

export default function AIMonitorPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createBrowserSupabaseClient();
      try {
        const [runsRes, insightsRes] = await Promise.all([
          supabase
            .from('agent_runs')
            .select('id, agent_name, status, duration_ms, started_at, error_message')
            .order('started_at', { ascending: false })
            .limit(30),
          supabase
            .from('ai_insights')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        setRuns(runsRes.data || []);
        setInsights(insightsRes.data || []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  // Agent stats
  const agents = [...new Set(runs.map((r) => r.agent_name))];
  const agentStats = agents.map((name) => {
    const agentRuns = runs.filter((r) => r.agent_name === name);
    const successRate = agentRuns.length > 0
      ? Math.round((agentRuns.filter((r) => r.status === 'success').length / agentRuns.length) * 100)
      : 0;
    const avgDuration = agentRuns.filter((r) => r.duration_ms).length > 0
      ? Math.round(agentRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / agentRuns.filter((r) => r.duration_ms).length)
      : 0;
    return { name, runs: agentRuns.length, successRate, avgDuration, lastRun: agentRuns[0] };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">AI Agent Monitor</h1>
        <p className="text-sm text-gray-600 mt-1">Real-time agent performance, insights, and self-improvement status</p>
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
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[agent.lastRun.status] || 'bg-gray-100'}`}>
                      {agent.lastRun.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{agent.runs}</p>
                    <p className="text-[10px] text-gray-500">Runs</p>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${agent.successRate >= 90 ? 'text-green-600' : agent.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {agent.successRate}%
                    </p>
                    <p className="text-[10px] text-gray-500">Success</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{agent.avgDuration}ms</p>
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
              <p className="text-sm text-gray-500 text-center py-4">No insights generated yet</p>
            ) : (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        insight.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        insight.status === 'acted' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {insight.status}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{insight.insight_type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{insight.body}</p>
                    {insight.action_suggestion && (
                      <p className="text-xs text-green-600 mt-1">Suggestion: {insight.action_suggestion}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(insight.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent runs table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Recent Runs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Agent</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Duration</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 15).map((run) => (
                    <tr key={run.id} className="border-t">
                      <td className="px-4 py-2 text-gray-900">{run.agent_name}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[run.status] || 'bg-gray-100'}`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{run.duration_ms ? `${run.duration_ms}ms` : '—'}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {run.started_at ? new Date(run.started_at).toLocaleString() : '—'}
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
