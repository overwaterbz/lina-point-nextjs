/**
 * Health Monitor Agent — Autonomous error tracking, diagnostics, and self-healing
 * 
 * This agent runs on a cron schedule and:
 * 1. Checks all system endpoints for health
 * 2. Reviews recent agent_runs for failures
 * 3. Analyzes error patterns with Grok
 * 4. Generates fix recommendations
 * 5. Logs issues to Supabase for the self-improvement loop
 * 6. Triggers self-healing actions when possible
 */

import { createClient } from '@supabase/supabase-js';
import { grokLLM } from '@/lib/grokIntegration';
import { runSelfImprovementAndPersist } from '@/lib/agents/selfImprovementAgent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTimeMs: number;
  statusCode?: number;
  error?: string;
}

export interface AgentFailure {
  id: string;
  agent_name: string;
  error_message: string;
  created_at: string;
  input: unknown;
}

export interface DiagnosticReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  endpointChecks: HealthCheckResult[];
  recentFailures: AgentFailure[];
  errorPatterns: string[];
  recommendations: string[];
  autoFixesApplied: string[];
  nextCheckIn: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lina-point.vercel.app';

const HEALTH_ENDPOINTS = [
  { path: '/', name: 'Homepage' },
  { path: '/api/check-events', name: 'Events API' },
  { path: '/api/magic/list', name: 'Magic Content API' },
];

/**
 * Check a single endpoint for health
 */
async function checkEndpoint(endpoint: { path: string; name: string }): Promise<HealthCheckResult> {
  const url = `${SITE_URL}${endpoint.path}`;
  const start = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: endpoint.path.startsWith('/api/') ? 'GET' : 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'LinaPoint-HealthMonitor/1.0' },
    });
    
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;
    
    return {
      endpoint: endpoint.name,
      status: response.ok ? (responseTimeMs > 5000 ? 'degraded' : 'healthy') : 'degraded',
      responseTimeMs,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      endpoint: endpoint.name,
      status: 'down',
      responseTimeMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetch recent agent failures from Supabase
 */
async function getRecentFailures(hoursBack: number = 24): Promise<AgentFailure[]> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, agent_name, error_message, created_at, input')
    .eq('status', 'failed')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('[HealthMonitor] Failed to fetch agent failures:', error.message);
    return [];
  }
  
  return (data || []) as AgentFailure[];
}

/**
 * Analyze error patterns and generate recommendations using Grok
 */
async function analyzeErrorPatterns(
  failures: AgentFailure[],
  endpointChecks: HealthCheckResult[]
): Promise<{ patterns: string[]; recommendations: string[] }> {
  if (failures.length === 0 && endpointChecks.every(c => c.status === 'healthy')) {
    return { patterns: [], recommendations: ['All systems healthy. No action needed.'] };
  }

  const failureSummary = failures.map(f => ({
    agent: f.agent_name,
    error: f.error_message?.slice(0, 200),
    time: f.created_at,
  }));

  const unhealthyEndpoints = endpointChecks.filter(c => c.status !== 'healthy');

  try {
    const response = await grokLLM.invoke([
      {
        role: 'system',
        content: `You are a system diagnostics AI for Lina Point Resort. Analyze errors and return JSON:
{
  "patterns": ["pattern1", "pattern2"],
  "recommendations": ["fix1", "fix2"],
  "severity": "low|medium|high|critical"
}

Be specific and actionable. Group related errors. Prioritize by impact on guest experience.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          recentFailures: failureSummary,
          unhealthyEndpoints,
          totalFailures24h: failures.length,
          failuresByAgent: groupBy(failures, 'agent_name'),
        }),
      },
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content);
    const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    
    return {
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };
  } catch {
    // Fallback: basic pattern detection without LLM
    const agentCounts = groupBy(failures, 'agent_name');
    const patterns = Object.entries(agentCounts).map(
      ([agent, items]) => `${agent}: ${(items as AgentFailure[]).length} failures in 24h`
    );
    return { patterns, recommendations: ['Review agent logs for root cause'] };
  }
}

/**
 * Attempt automatic fixes for known issues
 */
async function attemptAutoFixes(
  failures: AgentFailure[],
  endpointChecks: HealthCheckResult[]
): Promise<string[]> {
  const fixes: string[] = [];

  // Auto-fix 1: Clear stale agent runs stuck in 'started' state
  const { data: staleRuns } = await supabase
    .from('agent_runs')
    .select('id, agent_name, created_at')
    .eq('status', 'started')
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());

  if (staleRuns && staleRuns.length > 0) {
    const { error } = await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Auto-terminated: exceeded 30min timeout',
        finished_at: new Date().toISOString(),
      })
      .in('id', staleRuns.map(r => r.id));

    if (!error) {
      fixes.push(`Terminated ${staleRuns.length} stale agent runs (stuck >30min)`);
    }
  }

  // Auto-fix 2: If an agent has >5 consecutive failures, log a prompt review request
  const agentCounts = groupBy(failures, 'agent_name');
  for (const [agentName, agentFailures] of Object.entries(agentCounts)) {
    if ((agentFailures as AgentFailure[]).length >= 5) {
      // Flag for self-improvement agent to review
      const { error } = await supabase
        .from('agent_runs')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // system user
          agent_name: 'health_monitor',
          status: 'completed',
          input: { type: 'prompt_review_request', target_agent: agentName },
          output: {
            message: `${agentName} has ${(agentFailures as AgentFailure[]).length} failures in 24h — prompt review recommended`,
          },
          finished_at: new Date().toISOString(),
        });

      if (!error) {
        fixes.push(`Flagged ${agentName} for prompt review (${(agentFailures as AgentFailure[]).length} failures)`);
      }
    }
  }

  return fixes;
}

/**
 * Store diagnostic report in Supabase
 */
async function storeReport(report: DiagnosticReport): Promise<void> {
  await supabase
    .from('agent_runs')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      agent_name: 'health_monitor',
      status: 'completed',
      input: { type: 'health_check', timestamp: report.timestamp },
      output: report,
      finished_at: new Date().toISOString(),
      duration_ms: 0,
    });
}

/**
 * Main entry point — run full health check cycle
 */
export async function runHealthCheck(): Promise<DiagnosticReport> {
  const timestamp = new Date().toISOString();
  console.log(`[HealthMonitor] Starting health check at ${timestamp}`);

  // Phase 1: Endpoint checks (parallel)
  const endpointChecks = await Promise.all(HEALTH_ENDPOINTS.map(checkEndpoint));

  // Phase 2: Recent failures
  const recentFailures = await getRecentFailures(24);

  // Phase 3: Analyze patterns
  const { patterns, recommendations } = await analyzeErrorPatterns(recentFailures, endpointChecks);

  // Phase 4: Attempt auto-fixes
  const autoFixesApplied = await attemptAutoFixes(recentFailures, endpointChecks);

  // Determine overall status
  const downCount = endpointChecks.filter(c => c.status === 'down').length;
  const degradedCount = endpointChecks.filter(c => c.status === 'degraded').length;
  const failureRate = recentFailures.length;

  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (downCount > 0 || failureRate > 20) overallStatus = 'critical';
  else if (degradedCount > 0 || failureRate > 5) overallStatus = 'degraded';

  const report: DiagnosticReport = {
    timestamp,
    overallStatus,
    endpointChecks,
    recentFailures: recentFailures.slice(0, 10), // Top 10 for report
    errorPatterns: patterns,
    recommendations,
    autoFixesApplied,
    nextCheckIn: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6h from now
  };

  // Phase 5: Store report
  await storeReport(report);

  // Phase 6: Trigger self-improvement if critical or high failure rate
  if (overallStatus === 'critical' || failureRate >= 10) {
    console.log(`[HealthMonitor] ${overallStatus} status detected — triggering self-improvement agent`);
    try {
      const siResult = await runSelfImprovementAndPersist(supabase, {
        logsSummary: `Health check triggered: ${overallStatus}. ${failureRate} failures in 24h. Patterns: ${patterns.join('; ')}`,
        bookingSummary: `Auto-fixes applied: ${autoFixesApplied.join('; ')}`,
        prefsSummary: `Recommendations: ${recommendations.join('; ')}`,
        conversionSummary: `Endpoints: ${endpointChecks.map(e => `${e.endpoint}=${e.status}`).join(', ')}`,
      });
      console.log(`[HealthMonitor] Self-improvement complete: score=${siResult.score}, ${siResult.promptUpdates.length} prompt updates`);
    } catch (siError) {
      console.error('[HealthMonitor] Self-improvement trigger failed:', siError);
    }
  }

  console.log(`[HealthMonitor] Check complete: ${overallStatus} | ${recentFailures.length} failures | ${autoFixesApplied.length} auto-fixes`);
  return report;
}

// Utility
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}
