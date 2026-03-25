export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

const isProd = process.env.NODE_ENV === "production";
let cachedLocationId: string | null = null;

/**
 * Returns the active Square location ID for the frontend Web Payments SDK.
 * Cached after first successful lookup.
 */
export async function GET(req: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(req), 60);
  if (limited) return limited;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Square not configured" },
      { status: 503 },
    );
  }

  if (cachedLocationId) {
    return NextResponse.json({ locationId: cachedLocationId });
  }

  try {
    const { SquareClient, SquareEnvironment } = await import("square");
    const client = new SquareClient({
      token,
      environment: isProd
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    });

    const result = await client.locations.list();
    const locations: any[] =
      (result as any).data ?? (result as any).locations ?? [];
    const active = locations.find((l: any) => l.status === "ACTIVE");

    if (!active) {
      return NextResponse.json(
        { error: "No active Square location found" },
        { status: 404 },
      );
    }

    cachedLocationId = active.id;
    if (!isProd)
      console.log("[Square] Location resolved:", active.name, active.id);
    return NextResponse.json({ locationId: active.id });
  } catch (err: any) {
    console.error("[Square] Failed to get location:", err);
    return NextResponse.json(
      { error: "Failed to retrieve Square location" },
      { status: 500 },
    );
  }
}
