/**
 * Dynamic Pricing Engine
 *
 * Calculates real-time room rates based on:
 * - Base rate (from rooms table)
 * - Seasonal multipliers (peak Dec-Apr, shoulder Nov/May, low Jun-Oct)
 * - Occupancy-based surge pricing (>85% → +15%, >95% → +30%)
 * - Last-minute discounts (<3 days out → -20%)
 * - Loyalty tier discounts (returning -5%, loyal -10%, VIP -15%)
 * - Stacking: rules apply multiplicatively in priority order
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoomType } from "./inventory";
import { getRoomTypeInfo } from "./inventory";

export interface PricingResult {
  roomType: RoomType;
  baseRate: number;
  finalRate: number;
  nightlyRates: Array<{ date: string; rate: number }>;
  appliedRules: Array<{ name: string; multiplier: number }>;
  totalForStay: number;
  nights: number;
  savingsVsBase: number;
}

interface PricingRule {
  id: string;
  room_type: string;
  rule_name: string;
  rule_type: string;
  multiplier: number;
  start_date: string | null;
  end_date: string | null;
  min_occupancy_pct: number | null;
  max_occupancy_pct: number | null;
  min_days_before: number | null;
  max_days_before: number | null;
  loyalty_tier: string | null;
  priority: number;
}

/**
 * Get the current occupancy percentage for a specific date.
 */
async function getOccupancyForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<number> {
  const totalRooms = 16; // Fixed property size

  const { count } = await supabase
    .from("room_inventory")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("status", "booked");

  const bookedRooms = count || 0;
  return (bookedRooms / totalRooms) * 100;
}

/**
 * Yield management booking-window tiers.
 * Applied ONLY when no DB last_minute rule matched — prevents double-discounting.
 *
 * Tiers (daysBeforeCheckin, occupancyPct):
 *  >90 days                    → Early Bird −8%
 *  30–90 days                  → Standard (no adjustment)
 *  14–30 days + occ ≥60%       → Peak window +10%
 *  14–30 days + occ <60%       → Mild peak +5%
 *  <14 days + occ ≥70%         → Scarcity premium +20%
 *  <14 days + occ <70%         → Last-minute fill −15%
 */
function getBookingWindowMultiplier(
  daysBeforeCheckin: number,
  occupancyPct: number,
): { multiplier: number; name: string } | null {
  if (daysBeforeCheckin > 90) {
    return { multiplier: 0.92, name: "Early Bird (>90 days) −8%" };
  }
  if (daysBeforeCheckin > 30) {
    return null; // standard window — no adjustment
  }
  if (daysBeforeCheckin > 14) {
    return occupancyPct >= 60
      ? { multiplier: 1.1, name: "Peak Window (14-30d, demand high) +10%" }
      : { multiplier: 1.05, name: "Peak Window (14-30d) +5%" };
  }
  // < 14 days
  return occupancyPct >= 70
    ? { multiplier: 1.2, name: "Scarcity Premium (<14d, high occ) +20%" }
    : { multiplier: 0.85, name: "Last Minute Fill (<14d, low occ) −15%" };
}

/**
 * Calculate the dynamic rate for a single night.
 */
function applyRules(
  baseRate: number,
  date: string,
  rules: PricingRule[],
  occupancyPct: number,
  daysBeforeCheckin: number,
  loyaltyTier: string | null,
): { rate: number; applied: Array<{ name: string; multiplier: number }> } {
  let rate = baseRate;
  const applied: Array<{ name: string; multiplier: number }> = [];

  // Sort by priority descending — higher priority evaluated first
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    let matches = false;

    switch (rule.rule_type) {
      case "seasonal":
        if (rule.start_date && rule.end_date) {
          matches = date >= rule.start_date && date <= rule.end_date;
        }
        break;

      case "occupancy":
        if (rule.min_occupancy_pct !== null) {
          matches = occupancyPct >= rule.min_occupancy_pct;
          if (rule.max_occupancy_pct !== null) {
            matches = matches && occupancyPct <= rule.max_occupancy_pct;
          }
        }
        break;

      case "last_minute":
        if (rule.min_days_before !== null && rule.max_days_before !== null) {
          matches =
            daysBeforeCheckin >= rule.min_days_before &&
            daysBeforeCheckin <= rule.max_days_before;
        }
        break;

      case "loyalty":
        if (rule.loyalty_tier && loyaltyTier) {
          matches = rule.loyalty_tier === loyaltyTier;
        }
        break;
    }

    if (matches) {
      rate = Math.round(rate * rule.multiplier * 100) / 100;
      applied.push({ name: rule.rule_name, multiplier: rule.multiplier });
    }
  }

  return { rate: Math.max(rate, 50), applied }; // Floor at $50/night
}

/**
 * Check if we have a fresh OTA-beaten rate for this room+date.
 * Returns the "beat by 6%" rate if scraped within 24 hours, else null.
 */
async function getOTABeatRate(
  supabase: SupabaseClient,
  roomType: RoomType,
  date: string,
): Promise<number | null> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data } = await supabase
    .from("daily_ota_rates")
    .select("our_rate, scraped_at")
    .eq("room_type", roomType)
    .eq("date", date)
    .gt("scraped_at", twentyFourHoursAgo.toISOString())
    .not("our_rate", "is", null)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.our_rate ? Number(data.our_rate) : null;
}

/**
 * Calculate dynamic pricing for a full stay.
 * Priority: OTA-beaten rate (fresh) > rule-based pricing > base rate.
 */
export async function calculateDynamicPrice(
  supabase: SupabaseClient,
  roomType: RoomType,
  checkIn: string,
  checkOut: string,
  loyaltyTier?: string | null,
): Promise<PricingResult> {
  const info = getRoomTypeInfo(roomType);
  const baseRate = info.baseRate;

  // Fetch all active pricing rules
  const { data: allRules } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false });

  const rules = (allRules || []) as PricingRule[];

  // Filter rules applicable to this room type
  const applicableRules = rules.filter(
    (r) => r.room_type === "all" || r.room_type === roomType,
  );

  // Calculate per-night rates
  const nightlyRates: Array<{ date: string; rate: number }> = [];
  const allApplied = new Map<string, number>();
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  const current = new Date(start);
  const now = new Date();

  while (current < end) {
    const dateStr = current.toISOString().split("T")[0];
    const daysBeforeCheckin = Math.floor(
      (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Priority 1: Check for fresh OTA-beaten rate
    const otaBeatRate = await getOTABeatRate(supabase, roomType, dateStr);

    if (otaBeatRate) {
      // Apply loyalty discounts on top of OTA-beaten rate
      const loyaltyRules = applicableRules.filter(
        (r) => r.rule_type === "loyalty",
      );
      let finalRate = otaBeatRate;
      const applied: Array<{ name: string; multiplier: number }> = [
        { name: "OTA Beat Rate (−6%)", multiplier: 0.94 },
      ];
      for (const rule of loyaltyRules) {
        if (
          rule.loyalty_tier &&
          loyaltyTier &&
          rule.loyalty_tier === loyaltyTier
        ) {
          finalRate = Math.round(finalRate * rule.multiplier * 100) / 100;
          applied.push({ name: rule.rule_name, multiplier: rule.multiplier });
        }
      }
      nightlyRates.push({ date: dateStr, rate: Math.max(finalRate, 50) });
      for (const a of applied) {
        allApplied.set(a.name, a.multiplier);
      }
    } else {
      // Priority 2: Fall back to rule-based pricing
      const occupancy = await getOccupancyForDate(supabase, dateStr);
      const { rate: baseRuleRate, applied } = applyRules(
        baseRate,
        dateStr,
        applicableRules,
        occupancy,
        daysBeforeCheckin,
        loyaltyTier || null,
      );
      let rate = baseRuleRate;

      // Apply yield management booking window — only when DB has no last_minute rule
      const hasLastMinuteRule = applied.some(
        (a) =>
          a.name.toLowerCase().includes("last minute") ||
          a.name.toLowerCase().includes("last_minute"),
      );
      if (!hasLastMinuteRule) {
        const windowTier = getBookingWindowMultiplier(
          daysBeforeCheckin,
          occupancy,
        );
        if (windowTier) {
          rate = Math.round(rate * windowTier.multiplier * 100) / 100;
          applied.push(windowTier);
        }
      }

      nightlyRates.push({ date: dateStr, rate: Math.max(rate, 50) });
      for (const a of applied) {
        allApplied.set(a.name, a.multiplier);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const nights = nightlyRates.length;
  const totalForStay = nightlyRates.reduce((sum, nr) => sum + nr.rate, 0);
  const avgRate =
    nights > 0 ? Math.round((totalForStay / nights) * 100) / 100 : baseRate;
  const baseTotalForStay = baseRate * nights;
  const savingsVsBase =
    Math.round((baseTotalForStay - totalForStay) * 100) / 100;

  return {
    roomType,
    baseRate,
    finalRate: avgRate,
    nightlyRates,
    appliedRules: Array.from(allApplied.entries()).map(
      ([name, multiplier]) => ({
        name,
        multiplier,
      }),
    ),
    totalForStay: Math.round(totalForStay * 100) / 100,
    nights,
    savingsVsBase,
  };
}
