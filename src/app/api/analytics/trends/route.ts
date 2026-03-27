import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const brand = url.searchParams.get("brand") || "linapoint";
  // Trend: CTR per day (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("event, created_at, brand")
    .eq("brand", brand)
    .gte("created_at", since);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  // Aggregate by day
  const byDay: Record<
    string,
    { impressions: number; clicks: number; conversions: number }
  > = {};
  (data || []).forEach((row: any) => {
    const day = row.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { impressions: 0, clicks: 0, conversions: 0 };
    if (row.event === "impression") byDay[day].impressions++;
    if (row.event === "click") byDay[day].clicks++;
    if (row.event === "conversion") byDay[day].conversions++;
  });
  const trend = Object.entries(byDay).map(([day, stats]) => ({
    day,
    ...stats,
    ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
    anomaly: stats.impressions > 10 && stats.clicks / stats.impressions < 0.01,
  }));
  // Brand comparison (last 30 days)
  const { data: allBrands } = await supabase
    .from("events")
    .select("event, brand")
    .gte("created_at", since);
  const brandAgg: Record<
    string,
    { impressions: number; clicks: number; conversions: number }
  > = {};
  (allBrands || []).forEach((row: any) => {
    const b = row.brand || "unknown";
    if (!brandAgg[b])
      brandAgg[b] = { impressions: 0, clicks: 0, conversions: 0 };
    if (row.event === "impression") brandAgg[b].impressions++;
    if (row.event === "click") brandAgg[b].clicks++;
    if (row.event === "conversion") brandAgg[b].conversions++;
  });
  const brandComparison = Object.entries(brandAgg).map(([brand, stats]) => ({
    brand,
    ...stats,
    ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0,
  }));
  return NextResponse.json({ trend, brandComparison });
}
