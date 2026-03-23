/**
 * Competitor Intelligence Agent
 *
 * Reads ota_price_history and detects three actionable patterns:
 *  1. Day-of-week trends        — OTAs consistently price higher Fri/Sat/Sun
 *  2. Panic discounting         — sudden ≥15% price drop within 7-14 days
 *  3. Time-to-arrival curves    — how much OTAs ramp/discount as check-in nears
 *
 * Output: CompetitorPattern[] — stored in ai_insights + returned to pricingOptimizationAgent.
 * Cron: weekly (Monday 06:00 UTC recommended).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface CompetitorPattern {
  type: "day_of_week" | "panic_discount" | "arrival_curve";
  ota: string;
  roomType: string;
  description: string;
  /** Percentage change relative to baseline (positive = premium, negative = discount) */
  magnitude: number;
  /** 0–1 confidence */
  confidence: number;
  actionableInsight: string;
}

interface OtaPriceRow {
  room_type: string;
  ota_name: string;
  price: number;
  check_in: string;
  fetched_at: string;
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay(); // 0=Sun…6=Sat
}

function daysUntilCheckin(checkIn: string, fetchedAt: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(checkIn).getTime() - new Date(fetchedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
}

/**
 * Detect day-of-week pricing patterns.
 * Reports if weekend avg differs from weekday avg by >5%.
 */
function detectDayOfWeekPatterns(rows: OtaPriceRow[]): CompetitorPattern[] {
  const patterns: CompetitorPattern[] = [];
  const grouped = new Map<string, OtaPriceRow[]>();

  for (const row of rows) {
    const key = `${row.ota_name}:${row.room_type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  for (const [key, data] of grouped) {
    if (data.length < 20) continue;
    const [ota, roomType] = key.split(":");

    const byDay = Array.from({ length: 7 }, () => [] as number[]);
    for (const row of data) byDay[dayOfWeek(row.check_in)].push(row.price);

    const dayAvgs = byDay.map((prices) =>
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : null,
    );

    const validAvgs = dayAvgs
      .map((avg, dow) => ({ dow, avg }))
      .filter((x): x is { dow: number; avg: number } => x.avg !== null);

    if (validAvgs.length < 4) continue;

    const overallAvg =
      validAvgs.reduce((a, b) => a + b.avg, 0) / validAvgs.length;
    const weekendPrices = [dayAvgs[0], dayAvgs[5], dayAvgs[6]].filter(
      (v): v is number => v !== null,
    );
    const weekdayPrices = validAvgs
      .filter((x) => x.dow >= 1 && x.dow <= 4)
      .map((x) => x.avg);

    if (!weekendPrices.length || !weekdayPrices.length) continue;

    const weekendAvg =
      weekendPrices.reduce((a, b) => a + b, 0) / weekendPrices.length;
    const weekdayAvg =
      weekdayPrices.reduce((a, b) => a + b, 0) / weekdayPrices.length;
    const variance = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;

    if (Math.abs(variance) < 5) continue;
    void overallAvg; // referenced for future trend weighting

    patterns.push({
      type: "day_of_week",
      ota,
      roomType,
      description: `${ota} charges ${Math.abs(variance).toFixed(1)}% ${variance > 0 ? "more" : "less"} on weekends`,
      magnitude: variance,
      confidence: Math.min(0.9, data.length / 50),
      actionableInsight:
        variance > 0
          ? `Apply a weekend premium of +${Math.min(8, Math.round(variance * 0.6))}% for Fri-Sun to stay price-competitive`
          : `Weekend demand is soft — consider ${Math.abs(Math.min(8, Math.round(variance * 0.4)))}% Fri-Sun discount to fill rooms`,
    });
  }

  return patterns;
}

/**
 * Detect panic discounting: price drop ≥15% within 7-14 days for the same check-in date.
 */
function detectPanicDiscounting(rows: OtaPriceRow[]): CompetitorPattern[] {
  const patterns: CompetitorPattern[] = [];
  const grouped = new Map<string, OtaPriceRow[]>();

  for (const row of rows) {
    const key = `${row.ota_name}:${row.room_type}:${row.check_in}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  for (const [, data] of grouped) {
    if (data.length < 2) continue;

    const sorted = [...data].sort(
      (a, b) =>
        new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime(),
    );

    const first = sorted[0].price;
    const last = sorted[sorted.length - 1].price;
    const change = ((last - first) / first) * 100;
    const daysDiff = Math.round(
      (new Date(sorted[sorted.length - 1].fetched_at).getTime() -
        new Date(sorted[0].fetched_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (change >= -15 || daysDiff > 14) continue;

    patterns.push({
      type: "panic_discount",
      ota: sorted[0].ota_name,
      roomType: sorted[0].room_type,
      description: `${sorted[0].ota_name} panic-dropped ${Math.abs(change).toFixed(1)}% in ${daysDiff}d for ${sorted[0].check_in}`,
      magnitude: change,
      confidence: 0.8,
      actionableInsight: `Competitor filling slow inventory. Consider last-minute promo of ${Math.abs(Math.min(12, Math.round(Math.abs(change) * 0.5)))}% to capture price-sensitive demand`,
    });
  }

  return patterns;
}

/**
 * Detect time-to-arrival price curve.
 * Compares price when >90 days out vs <14 days out for the same OTA × room_type.
 */
function detectArrivalCurve(rows: OtaPriceRow[]): CompetitorPattern[] {
  const patterns: CompetitorPattern[] = [];
  const grouped = new Map<string, OtaPriceRow[]>();

  for (const row of rows) {
    const key = `${row.ota_name}:${row.room_type}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  for (const [key, data] of grouped) {
    if (data.length < 30) continue;
    const [ota, roomType] = key.split(":");

    const buckets: Record<string, number[]> = {
      "90+": [],
      "30-90": [],
      "14-30": [],
      "0-14": [],
    };
    for (const row of data) {
      const days = daysUntilCheckin(row.check_in, row.fetched_at);
      if (days >= 90) buckets["90+"].push(row.price);
      else if (days >= 30) buckets["30-90"].push(row.price);
      else if (days >= 14) buckets["14-30"].push(row.price);
      else buckets["0-14"].push(row.price);
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const earlyAvg = avg(buckets["90+"]);
    const lastMinAvg = avg(buckets["0-14"]);
    if (!earlyAvg || !lastMinAvg) continue;

    const scarcityPremium = ((lastMinAvg - earlyAvg) / earlyAvg) * 100;
    if (Math.abs(scarcityPremium) < 8) continue;

    patterns.push({
      type: "arrival_curve",
      ota,
      roomType,
      description: `${ota} prices ${scarcityPremium > 0 ? "+" : ""}${scarcityPremium.toFixed(1)}% vs 90-day-out when <14d to arrival`,
      magnitude: scarcityPremium,
      confidence: Math.min(0.85, data.length / 50),
      actionableInsight:
        scarcityPremium > 0
          ? `Match competitor scarcity curve with +${Math.min(15, Math.round(scarcityPremium * 0.7))}% multiplier for 0-14 day window`
          : `OTAs discount last-minute — hold rate or offer targeted deal to beat them`,
    });
  }

  return patterns;
}

/**
 * Run the competitor intelligence analysis on ota_price_history.
 */
export async function runCompetitorIntelligenceAgent(
  supabase?: SupabaseClient,
): Promise<CompetitorPattern[]> {
  const client =
    supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rows } = await client
    .from("ota_price_history")
    .select("room_type, ota_name, price, check_in, fetched_at")
    .gte("fetched_at", since.toISOString())
    .eq("source", "live");

  const priceRows = (rows || []) as OtaPriceRow[];
  if (priceRows.length < 10) return []; // Not enough data yet

  const patterns: CompetitorPattern[] = [
    ...detectDayOfWeekPatterns(priceRows),
    ...detectPanicDiscounting(priceRows),
    ...detectArrivalCurve(priceRows),
  ];

  // Persist high-confidence patterns as ai_insights
  const highConfidence = patterns.filter((p) => p.confidence >= 0.7);
  if (highConfidence.length > 0) {
    void (async () => {
      try {
        await client.from("ai_insights").insert(
          highConfidence.map((p) => ({
            insight_type: "competitor_pattern",
            title: p.description,
            body: p.actionableInsight,
            confidence: p.confidence,
            status: "pending",
            action_suggestion: p.actionableInsight,
          })),
        );
      } catch {
        /* non-fatal */
      }
    })();
  }

  return patterns;
}

/**
 * Get a formatted competitor pattern summary string for LLM injection.
 */
export async function getCompetitorPatternSummary(
  supabase: SupabaseClient,
): Promise<string> {
  try {
    const patterns = await runCompetitorIntelligenceAgent(supabase);
    if (!patterns.length)
      return "No competitor patterns detected yet (insufficient OTA price history — collect 10+ live price fetches first).";

    return patterns
      .map(
        (p) =>
          `[${p.type.toUpperCase()}] ${p.description} → ${p.actionableInsight} (confidence: ${Math.round(p.confidence * 100)}%)`,
      )
      .join("\n");
  } catch {
    return "Competitor pattern analysis unavailable.";
  }
}
