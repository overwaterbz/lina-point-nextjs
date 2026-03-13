/**
 * Pricing Optimization Agent
 *
 * Analyzes occupancy trends, revenue data, and booking patterns
 * to suggest or auto-apply pricing rule adjustments.
 *
 * Autonomy model:
 * - Operational tweaks (multiplier ≤10% change): auto-apply
 * - Strategic changes (new rules, >10% change): flag for admin review
 */

import { createClient } from '@supabase/supabase-js'
import { grokLLM } from '@/lib/grokIntegration'
import { runWithRecursion } from '@/lib/agents/agentRecursion'
import { evaluateTextQuality } from '@/lib/agents/recursionEvaluators'
import { getActivePrompt } from '@/lib/agents/promptManager'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

export interface PricingInsight {
  type: 'adjustment' | 'new_rule' | 'deactivation'
  ruleId?: string
  ruleName: string
  roomType: string
  currentMultiplier?: number
  suggestedMultiplier?: number
  reasoning: string
  autoApply: boolean
}

export interface PricingOptimizationResult {
  insights: PricingInsight[]
  autoApplied: number
  flaggedForReview: number
  occupancySummary: Record<string, number>
  revenueTrend: string
}

/**
 * Gather occupancy data for the next 90 days.
 */
async function getOccupancyForecast(): Promise<Record<string, number>> {
  const forecast: Record<string, number> = {}
  const totalRooms = 16

  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 90)

  const { data: bookings } = await supabase
    .from('room_inventory')
    .select('date')
    .eq('status', 'booked')
    .gte('date', start.toISOString().split('T')[0])
    .lte('date', end.toISOString().split('T')[0])

  const countByDate = new Map<string, number>()
  for (const b of bookings || []) {
    countByDate.set(b.date, (countByDate.get(b.date) || 0) + 1)
  }

  // Group by week
  const current = new Date(start)
  while (current <= end) {
    const weekStart = new Date(current)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]

    let weekBooked = 0
    let weekDays = 0
    for (let d = 0; d < 7 && current <= end; d++) {
      const dateStr = current.toISOString().split('T')[0]
      weekBooked += countByDate.get(dateStr) || 0
      weekDays++
      current.setDate(current.getDate() + 1)
    }

    forecast[weekKey] = Math.round((weekBooked / (weekDays * totalRooms)) * 100)
  }

  return forecast
}

/**
 * Get recent revenue data.
 */
async function getRevenueTrend(): Promise<{ last30: number; prior30: number }> {
  const now = new Date()
  const d30 = new Date(now)
  d30.setDate(d30.getDate() - 30)
  const d60 = new Date(now)
  d60.setDate(d60.getDate() - 60)

  const { data: recent } = await supabase
    .from('reservations')
    .select('total_amount')
    .gte('check_in_date', d30.toISOString().split('T')[0])
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  const { data: prior } = await supabase
    .from('reservations')
    .select('total_amount')
    .gte('check_in_date', d60.toISOString().split('T')[0])
    .lt('check_in_date', d30.toISOString().split('T')[0])
    .in('status', ['confirmed', 'checked_in', 'checked_out'])

  const sum = (rows: Array<{ total_amount: number }> | null) =>
    (rows || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  return { last30: sum(recent), prior30: sum(prior) }
}

/**
 * Get current active pricing rules.
 */
async function getActiveRules() {
  const { data } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false })

  return data || []
}

/**
 * Run the AI pricing optimization analysis.
 */
export async function runPricingOptimization(): Promise<PricingOptimizationResult> {
  console.log('[PricingAgent] Starting pricing optimization...')

  const [occupancyForecast, revenue, rules] = await Promise.all([
    getOccupancyForecast(),
    getRevenueTrend(),
    getActiveRules(),
  ])

  const revenueDelta = revenue.prior30 > 0
    ? Math.round(((revenue.last30 - revenue.prior30) / revenue.prior30) * 100)
    : 0

  const analysisData = JSON.stringify({
    occupancyForecast,
    revenue: {
      last30Days: revenue.last30,
      prior30Days: revenue.prior30,
      changePercent: revenueDelta,
    },
    currentRules: rules.map((r: any) => ({
      id: r.id,
      name: r.rule_name,
      type: r.rule_type,
      roomType: r.room_type,
      multiplier: r.multiplier,
      priority: r.priority,
      startDate: r.start_date,
      endDate: r.end_date,
      minOccupancy: r.min_occupancy_pct,
      minDaysBefore: r.min_days_before,
      maxDaysBefore: r.max_days_before,
      loyaltyTier: r.loyalty_tier,
    })),
    propertyInfo: {
      totalRooms: 16,
      roomTypes: ['suite_2nd_floor', 'suite_1st_floor', 'cabana_duplex', 'cabana_1br', 'cabana_2br'],
      baseRates: { suite_2nd_floor: 130, suite_1st_floor: 150, cabana_duplex: 250, cabana_1br: 300, cabana_2br: 400 },
    },
  }, null, 2)

  const defaultPrompt = `You are a revenue management AI for Lina Point Resort (16-room boutique resort in San Pedro, Belize).
Analyze occupancy forecasts, revenue trends, and current pricing rules. Suggest adjustments.

Return JSON:
{
  "insights": [
    {
      "type": "adjustment" | "new_rule" | "deactivation",
      "ruleId": "uuid or null for new rules",
      "ruleName": "name",
      "roomType": "all" | specific type,
      "currentMultiplier": 1.2,
      "suggestedMultiplier": 1.15,
      "reasoning": "why this change"
    }
  ],
  "revenueTrend": "brief trend summary"
}

RULES:
- Never suggest multipliers below 0.75 or above 1.50 (protect revenue floor and guest trust)
- Prefer small incremental adjustments (±5-10%) over dramatic changes
- Consider both revenue maximization AND occupancy — empty rooms earn $0
- Return ONLY valid JSON, no markdown fences.`

  const systemPrompt = await getActivePrompt('pricing_optimization', defaultPrompt)

  let insights: PricingInsight[] = []
  let revenueTrend = `Revenue ${revenueDelta >= 0 ? 'up' : 'down'} ${Math.abs(revenueDelta)}% vs prior 30 days`

  try {
    const { result: text } = await runWithRecursion<string>(
      async () => {
        const response = await grokLLM.invoke([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisData },
        ])
        return typeof response.content === 'string' ? response.content : String(response.content)
      },
      async (output) => {
        const evalResult = await evaluateTextQuality(
          'Analyze hotel pricing data and produce specific, bounded pricing rule adjustments as valid JSON',
          output,
        )
        return { ...evalResult, data: output }
      },
      async (_prev, feedback) => {
        const response = await grokLLM.invoke([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${analysisData}\n\nPrevious attempt feedback: ${feedback}\nPlease improve.` },
        ])
        return typeof response.content === 'string' ? response.content : String(response.content)
      },
    )

    const parsed = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim())
    insights = (parsed.insights || []).map((i: any) => ({
      ...i,
      autoApply: i.type === 'adjustment' && i.currentMultiplier && i.suggestedMultiplier
        ? Math.abs(i.suggestedMultiplier - i.currentMultiplier) / i.currentMultiplier <= 0.10
        : false,
    }))
    if (parsed.revenueTrend) revenueTrend = parsed.revenueTrend
  } catch (err) {
    console.error('[PricingAgent] AI analysis failed:', err)
  }

  // Apply or flag insights
  let autoApplied = 0
  let flaggedForReview = 0

  for (const insight of insights) {
    if (insight.autoApply && insight.type === 'adjustment' && insight.ruleId && insight.suggestedMultiplier) {
      // Auto-apply: small operational tweak
      const { error } = await supabase
        .from('pricing_rules')
        .update({
          multiplier: insight.suggestedMultiplier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insight.ruleId)

      if (!error) {
        autoApplied++

        // Log to audit
        await supabase.from('pricing_audit_log').insert({
          room_type: insight.roomType,
          date: new Date().toISOString().split('T')[0],
          base_rate: 0,
          final_rate: 0,
          rules_applied: {
            action: 'auto_adjusted',
            rule: insight.ruleName,
            from: insight.currentMultiplier,
            to: insight.suggestedMultiplier,
            reasoning: insight.reasoning,
          },
          occupancy_pct: 0,
        })
      }
    } else {
      // Flag for admin review
      flaggedForReview++

      await supabase.from('agent_runs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        agent_name: 'pricing_optimization',
        status: 'completed',
        input: { type: 'pricing_review', insight },
        output: {
          message: `Pricing ${insight.type}: ${insight.ruleName} — ${insight.reasoning}`,
          requiresApproval: true,
        },
        finished_at: new Date().toISOString(),
      })
    }
  }

  console.log(`[PricingAgent] Complete: ${autoApplied} auto-applied, ${flaggedForReview} flagged for review`)

  return {
    insights,
    autoApplied,
    flaggedForReview,
    occupancySummary: occupancyForecast,
    revenueTrend,
  }
}
