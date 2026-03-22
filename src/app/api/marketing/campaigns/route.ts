/**
 * API Route: GET /api/marketing/campaigns
 * Fetches marketing campaign history and metrics
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error("Campaign fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        total: campaigns?.length || 0,
        campaigns: campaigns || [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Marketing campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST: Create a new campaign (alternative to run-campaign)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    const { data: campaign, error } = await supabase
      .from("marketing_campaigns")
      .insert({
        name: body.name || "Untitled Campaign",
        objective: body.objective,
        target_audience: body.targetAudience,
        key_messages: body.keyMessages || [],
        platforms: body.platforms || [],
        status: "draft",
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Campaign creation error:", error);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        campaign,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", details: String(error) },
      { status: 500 },
    );
  }
}
