/**
 * Demand Forecasting Engine
 *
 * Produces a demand_score (0–1) per room_type per week for the next 90 days.
 * Combines:
 *  1. Historical booking velocity (reservations per week, last 12 weeks)
 *  2. Seasonal indices (ISO-week-based occupancy avg over last 2 years)
 *  3. Lead-time decay (demand typically lower when booking >8 weeks out)
 *  4. Competitor avg price (from ota_price_history — higher price = latent demand)
 *
 * Results are upserted to demand_forecast table and available for:
 *  - pricingOptimizationAgent (LLM context)
 *  - Yield Calendar UI (/admin/pricing)
 *
 * Cron: daily at 02:00 UTC recommended.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

export interface DemandForecastEntry {
  room_type: string;
  week_start: string; // YYYY-MM-DD (Monday of the week)
  demand_score: number; // 0.000–1.000
  confidence: number; // 0.000–1.000
  factors: {
    seasonal_index: number;
    booking_velocity: number;
    competitor_avg_price: number | null;
    lead_time_factor: number;
  };
}

const TOTAL_ROOMS = 16;
const ROOM_TYPES = [
  "suite_2nd_floor",
  "suite_1st_floor",
  "cabana_duplex",
  "cabana_1br",
  "cabana_2br",
] as const;

/** ISO week number (1–52) of a date */
function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Get closest Monday on or before a given date */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Build seasonal index: average occupancy per ISO week (1–52), normalized to 1.0 = overall average.
 * Uses last 2 years of room_inventory data.
 */
async function buildSeasonalIndices(
  supabase: SupabaseClient,
): Promise<Map<number, number>> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const { data } = await supabase
    .from("room_inventory")
    .select("date")
    .eq("status", "booked")
    .gte("date", twoYearsAgo.toISOString().split("T")[0]);

  // Count booked room-nights per ISO week
  const bookedPerWeek = new Map<number, number>();
  for (const row of data || []) {
    const wk = isoWeek(new Date(row.date + "T00:00:00Z"));
    bookedPerWeek.set(wk, (bookedPerWeek.get(wk) || 0) + 1);
  }

  // Count total room-nights per ISO week across the date range
  const roomNightsPerWeek = new Map<number, number>();
  const cur = new Date(twoYearsAgo);
  const now = new Date();
  while (cur <= now) {
    const wk = isoWeek(cur);
    roomNightsPerWeek.set(wk, (roomNightsPerWeek.get(wk) || 0) + TOTAL_ROOMS);
    cur.setDate(cur.getDate() + 1);
  }

  // Compute raw occupancy rate per week
  const rawIndices = new Map<number, number>();
  let sum = 0;
  let count = 0;
  for (const [wk, totalNights] of roomNightsPerWeek) {
    const booked = bookedPerWeek.get(wk) || 0;
    const occ = booked / totalNights;
    rawIndices.set(wk, occ);
    sum += occ;
    count++;
  }

  const overallAvg = count > 0 ? sum / count : 0.5;

  // Normalize: index 1.0 = overall average week
  const normalized = new Map<number, number>();
  for (let wk = 1; wk <= 52; wk++) {
    const raw = rawIndices.get(wk) ?? overallAvg;
    normalized.set(wk, overallAvg > 0 ? raw / overallAvg : 1.0);
  }
  return normalized;
}

/** Weekly booking rate (confirmed reservations per week) for a room type, based on last 12 weeks */
async function buildBookingVelocity(
  supabase: SupabaseClient,
  roomType: string,
): Promise<number> {
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const { count } = await supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("room_type", roomType)
    .eq("status", "confirmed")
    .gte("created_at", twelveWeeksAgo.toISOString());

  return (count || 0) / 12; // avg bookings per week
}

/** Average competitor price for check-in dates within a given week */
async function getCompetitorAvgPrice(
  supabase: SupabaseClient,
  weekStartStr: string,
  weekEndStr: string,
  roomType: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("ota_price_history")
    .select("price")
    .eq("room_type", roomType)
    .gte("check_in", weekStartStr)
    .lte("check_in", weekEndStr)
    .eq("source", "live");

  if (!data?.length) return null;
  return (
    Math.round(
      (data.reduce((a, b) => a + Number(b.price), 0) / data.length) * 100,
    ) / 100
  );
}

/**
 * Run demand forecast for all room types for the next 90 days.
 * Upserts results to demand_forecast table.
 */
export async function runDemandForecast(
  supabase?: SupabaseClient,
): Promise<DemandForecastEntry[]> {
  const client =
    supabase ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

  const seasonalIndices = await buildSeasonalIndices(client);
  const entries: DemandForecastEntry[] = [];
  const now = new Date();

  // Generate weekly forecast for next 13 weeks (~90 days)
  const weeks: Date[] = [];
  const weekCursor = getMondayOfWeek(now);
  for (let i = 0; i < 13; i++) {
    weeks.push(new Date(weekCursor));
    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  for (const roomType of ROOM_TYPES) {
    const bookingVelocity = await buildBookingVelocity(client, roomType);

    // Active room count for this type (for normalization)
    const { count: roomCount } = await client
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("room_type", roomType)
      .eq("status", "active");

    const activeRooms = Math.max(1, roomCount || 1);

    for (const weekStart of weeks) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];
      const wk = isoWeek(weekStart);

      const seasonalIndex = seasonalIndices.get(wk) ?? 1.0;

      // Lead-time factor: bookings placed far out are less certain demand signals
      const weeksUntil = Math.round(
        (weekStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7),
      );
      const leadTimeFactor =
        weeksUntil <= 2
          ? 1.0
          : weeksUntil <= 4
            ? 0.85
            : weeksUntil <= 8
              ? 0.7
              : 0.55;

      const competitorAvgPrice = await getCompetitorAvgPrice(
        client,
        weekStartStr,
        weekEndStr,
        roomType,
      );

      // Base velocity score — normalized to 0–1 by room capacity
      const maxWeeklyBookings = activeRooms * 7; // full occupancy baseline
      const baseVelocityScore = Math.min(
        1.0,
        (bookingVelocity * 2) / maxWeeklyBookings,
      );

      // Composite demand score
      const rawScore = baseVelocityScore * seasonalIndex * leadTimeFactor;
      const demand_score = Math.min(1.0, Math.max(0.0, rawScore));

      // Confidence increases with more historical data
      const confidence = Math.min(
        0.9,
        0.35 + Math.min(bookingVelocity / 4, 0.55),
      );

      entries.push({
        room_type: roomType,
        week_start: weekStartStr,
        demand_score,
        confidence,
        factors: {
          seasonal_index: seasonalIndex,
          booking_velocity: bookingVelocity,
          competitor_avg_price: competitorAvgPrice,
          lead_time_factor: leadTimeFactor,
        },
      });
    }
  }

  // Upsert to demand_forecast
  if (entries.length > 0) {
    void (async () => {
      try {
        await client.from("demand_forecast").upsert(
          entries.map((e) => ({
            room_type: e.room_type,
            week_start: e.week_start,
            demand_score: e.demand_score,
            confidence: e.confidence,
            seasonal_index: e.factors.seasonal_index,
            booking_velocity: e.factors.booking_velocity,
            competitor_avg_price: e.factors.competitor_avg_price,
            lead_time_factor: e.factors.lead_time_factor,
            computed_at: new Date().toISOString(),
          })),
          { onConflict: "room_type,week_start" },
        );
      } catch {
        /* non-fatal */
      }
    })();
  }

  return entries;
}

/**
 * Get a concise demand summary string for LLM injection in pricingOptimizationAgent.
 */
export async function getDemandForecastSummary(
  supabase: SupabaseClient,
  roomType?: string,
): Promise<string> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const ninetyOut = new Date();
    ninetyOut.setDate(ninetyOut.getDate() + 90);

    let query = supabase
      .from("demand_forecast")
      .select(
        "room_type, week_start, demand_score, confidence, competitor_avg_price",
      )
      .gte("week_start", today)
      .lte("week_start", ninetyOut.toISOString().split("T")[0])
      .order("week_start");

    if (roomType) query = query.eq("room_type", roomType);

    const { data } = await query;
    if (!data?.length)
      return "Demand forecast not yet computed (run demand-forecast cron first).";

    const high = data.filter((d) => d.demand_score >= 0.7);
    const low = data.filter((d) => d.demand_score < 0.35);
    const avgScore = data.reduce((a, b) => a + b.demand_score, 0) / data.length;

    let summary = `90-day avg demand: ${(avgScore * 100).toFixed(0)}% (${high.length} high-demand weeks, ${low.length} low-demand weeks).`;
    if (high.length)
      summary += ` Peak weeks: ${high
        .slice(0, 3)
        .map((d) => d.week_start)
        .join(", ")}.`;
    if (low.length)
      summary += ` Soft weeks: ${low
        .slice(0, 3)
        .map((d) => d.week_start)
        .join(", ")}. Consider discounts on these weeks.`;

    return summary;
  } catch {
    return "Demand forecast unavailable.";
  }
}
