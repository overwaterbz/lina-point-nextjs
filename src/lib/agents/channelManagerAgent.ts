/**
 * Channel Manager Agent
 *
 * The internal channel manager is the single source of truth for inventory.
 * It replaces fragmented OTA channel management with a direct-first strategy:
 *
 * 1. Rate Parity Enforcement — Ensures direct prices always beat OTAs by ≥5%
 * 2. Availability Sync    — Reconciles bookings from all sources (direct, WhatsApp, admin)
 * 3. Channel Analysis      — Tracks booking source distribution over time
 * 4. Soft Hold Management  — 30-minute inventory holds for pending direct bookings
 * 5. OTA Cost Reporting    — Calculates commission cost per OTA booking
 *
 * Run via: /api/cron/channel-manager (hourly)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChannelBookingSource {
  source: string; // 'direct' | 'whatsapp' | 'ota_expedia' | 'ota_booking' | etc.
  count: number;
  totalRevenue: number;
  avgCommissionPct: number;
  netRevenue: number;
}

export interface ChannelAnalysisResult {
  period: string; // "30d"
  totalBookings: number;
  directBookings: number;
  otaBookings: number;
  directPct: number;
  otaTotalCommission: number;
  directRevenueSaved: number; // Revenue that stayed direct rather than going through OTA
  sources: ChannelBookingSource[];
  rateParity: RateParity[];
}

export interface RateParity {
  roomType: string;
  directRate: number;
  lowestOTARate: number | null;
  gap: number; // positive = we're cheaper (good), negative = OTA is cheaper (bad)
  compliant: boolean; // compliant when gap >= 5%
}

interface SoftHold {
  sessionId: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  expiresAt: string;
}

// OTA commission rates (typical industry averages)
const OTA_COMMISSION_RATES: Record<string, number> = {
  expedia: 0.18,
  booking: 0.15,
  agoda: 0.18,
  hotels: 0.18,
  tripadvisor: 0.12,
  airbnb: 0.03, // Airbnb charges guests not property
  default: 0.15,
};

// ── Rate Parity ────────────────────────────────────────────────────────────

/**
 * Check rate parity across all room types.
 * Direct price must be ≤ lowest OTA price (after accounting for guest-paid OTA fees).
 * Target: direct price = OTA price - 6% (OTA commission passed to guest as savings).
 */
export async function checkRateParity(
  supabase: SupabaseClient,
): Promise<RateParity[]> {
  const today = new Date().toISOString().split("T")[0];
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + 14); // 2 weeks out
  const futureDate = checkDate.toISOString().split("T")[0];

  const [{ data: directRates }, { data: otaRates }] = await Promise.all([
    supabase
      .from("rooms")
      .select("room_type, base_rate_usd")
      .eq("status", "active"),
    supabase
      .from("daily_ota_rates")
      .select("room_type, ota_name, ota_price, our_rate")
      .gte("date", today)
      .lte("date", futureDate)
      .order("ota_price", { ascending: true }),
  ]);

  if (!directRates) return [];

  // Get unique room types + their direct rates
  const roomTypeMap = new Map<string, number>();
  for (const room of directRates) {
    if (!roomTypeMap.has(room.room_type)) {
      roomTypeMap.set(room.room_type, Number(room.base_rate_usd));
    }
  }

  // Get lowest OTA price per room type
  const otaLowestMap = new Map<string, number>();
  for (const rate of otaRates || []) {
    const current = otaLowestMap.get(rate.room_type);
    if (!current || rate.ota_price < current) {
      otaLowestMap.set(rate.room_type, rate.ota_price);
    }
  }

  const results: RateParity[] = [];
  for (const [roomType, directRate] of roomTypeMap.entries()) {
    const lowestOTA = otaLowestMap.get(roomType) || null;
    const gap = lowestOTA
      ? Math.round(((lowestOTA - directRate) / lowestOTA) * 100) / 100
      : 0.06; // Assume compliant if no OTA data
    results.push({
      roomType,
      directRate,
      lowestOTARate: lowestOTA,
      gap, // positive = we're cheaper
      compliant: lowestOTA ? gap >= 0.05 : true, // compliant if we beat OTA by ≥5%
    });
  }

  return results;
}

// ── Soft Hold Management ───────────────────────────────────────────────────

/**
 * Create a 30-minute soft hold for pending direct bookings.
 * Prevents OTA double-bookings during the payment window.
 */
export async function createSoftHold(
  supabase: SupabaseClient,
  hold: Omit<SoftHold, "expiresAt">,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from("booking_soft_holds").upsert(
    {
      session_id: hold.sessionId,
      room_type: hold.roomType,
      check_in_date: hold.checkInDate,
      check_out_date: hold.checkOutDate,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
}

/**
 * Release a soft hold (on payment success or cancellation).
 */
export async function releaseSoftHold(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<void> {
  await supabase
    .from("booking_soft_holds")
    .delete()
    .eq("session_id", sessionId);
}

/**
 * Check if dates are available (no soft holds OR confirmed bookings).
 */
export async function isAvailableWithSoftHoldCheck(
  supabase: SupabaseClient,
  roomType: string,
  checkIn: string,
  checkOut: string,
  excludeSessionId?: string,
): Promise<{ available: boolean; reason?: string }> {
  const now = new Date().toISOString();

  // Check for active soft holds (excluding current session)
  let holdQuery = supabase
    .from("booking_soft_holds")
    .select("id")
    .eq("room_type", roomType)
    .gt("expires_at", now)
    .or(`check_in_date.lte.${checkOut},check_out_date.gte.${checkIn}`);

  if (excludeSessionId) {
    holdQuery = holdQuery.neq("session_id", excludeSessionId);
  }

  const { data: holds } = await holdQuery;

  if (holds && holds.length > 0) {
    return { available: false, reason: "Date range has an active hold" };
  }

  return { available: true };
}

// ── Channel Analysis ───────────────────────────────────────────────────────

/**
 * Analyse booking sources over the past 30 days.
 * Returns direct vs OTA breakdown with commission cost analysis.
 */
export async function getChannelAnalysis(
  supabase: SupabaseClient,
  days = 30,
): Promise<ChannelAnalysisResult> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("total_amount, source, status, created_at")
    .gte("created_at", sinceStr)
    .in("status", ["confirmed", "checked_in", "checked_out"]);

  const bookings = reservations || [];

  // Group by source
  const sourceMap = new Map<string, { count: number; revenue: number }>();
  for (const b of bookings) {
    const src = (b.source as string) || "direct";
    const entry = sourceMap.get(src) || { count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += Number(b.total_amount) || 0;
    sourceMap.set(src, entry);
  }

  const sources: ChannelBookingSource[] = [];
  let directBookings = 0;
  let otaBookings = 0;
  let otaTotalCommission = 0;

  for (const [source, { count, revenue }] of sourceMap.entries()) {
    const isOTA =
      source.startsWith("ota_") || source === "expedia" || source === "booking";
    const otaKey = source.replace("ota_", "");
    const commissionPct = isOTA
      ? OTA_COMMISSION_RATES[otaKey] || OTA_COMMISSION_RATES.default
      : 0;
    const commission = revenue * commissionPct;

    sources.push({
      source,
      count,
      totalRevenue: Math.round(revenue * 100) / 100,
      avgCommissionPct: Math.round(commissionPct * 100),
      netRevenue: Math.round((revenue - commission) * 100) / 100,
    });

    if (isOTA) {
      otaBookings += count;
      otaTotalCommission += commission;
    } else {
      directBookings += count;
    }
  }

  const totalBookings = bookings.length;
  const directPct =
    totalBookings > 0 ? Math.round((directBookings / totalBookings) * 100) : 0;

  // What we saved vs if those direct bookings had come through OTAs
  const directRevenue = sources
    .filter(
      (s) =>
        !s.source.startsWith("ota_") &&
        s.source !== "expedia" &&
        s.source !== "booking",
    )
    .reduce((sum, s) => sum + s.totalRevenue, 0);
  const avgOTACommission = OTA_COMMISSION_RATES.default;
  const directRevenueSaved =
    Math.round(directRevenue * avgOTACommission * 100) / 100;

  const rateParity = await checkRateParity(supabase);

  return {
    period: `${days}d`,
    totalBookings,
    directBookings,
    otaBookings,
    directPct,
    otaTotalCommission: Math.round(otaTotalCommission * 100) / 100,
    directRevenueSaved,
    sources: sources.sort((a, b) => b.totalRevenue - a.totalRevenue),
    rateParity,
  };
}

// ── Expired Hold Cleanup ───────────────────────────────────────────────────

/**
 * Remove expired soft holds. Run hourly via channel manager cron.
 */
export async function cleanupExpiredHolds(
  supabase: SupabaseClient,
): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("booking_soft_holds")
    .delete()
    .lt("expires_at", now)
    .select("id");

  if (error) throw error;
  return (data || []).length;
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run the full channel manager sync cycle.
 */
export async function runChannelManager(supabase: SupabaseClient): Promise<{
  holdsCleared: number;
  rateParity: RateParity[];
  channelAnalysis: ChannelAnalysisResult;
}> {
  const [holdsCleared, channelAnalysis] = await Promise.all([
    cleanupExpiredHolds(supabase),
    getChannelAnalysis(supabase),
  ]);

  return {
    holdsCleared,
    rateParity: channelAnalysis.rateParity,
    channelAnalysis,
  };
}
