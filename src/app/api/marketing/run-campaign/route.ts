/**
 * API Route: POST /api/marketing/run-campaign
 * Triggers MarketingAgentCrew for the specified campaign brief
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  runMarketingCrew,
  type CampaignBrief,
} from "@/lib/agents/marketingAgentCrew";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function POST(request: NextRequest) {
  try {
    // Verify auth - require admin or authenticated user
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

    // Parse request body
    const body = await request.json();
    const {
      objective,
      targetAudience,
      keyMessages,
      platforms,
      startDate,
      campaignName,
    } = body;

    if (!objective || !targetAudience || !platforms) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: objective, targetAudience, platforms",
        },
        { status: 400 },
      );
    }

    // Create campaign record in Supabase
    const { data: campaignData, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .insert({
        name: campaignName || `Campaign-${Date.now()}`,
        objective,
        target_audience: targetAudience,
        key_messages: keyMessages || [],
        platforms,
        status: "running",
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (campaignError || !campaignData) {
      console.error("Campaign creation error:", campaignError);
      return NextResponse.json(
        { error: "Failed to create campaign record" },
        { status: 500 },
      );
    }

    const campaignBrief: CampaignBrief = {
      campaignId: campaignData.id,
      objective: objective as any,
      targetAudience,
      keyMessages: keyMessages || [],
      platforms: platforms as any[],
      startDate: new Date(startDate || Date.now()),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    // Run marketing crew (non-blocking for production)
    const crewResult = await runMarketingCrew(campaignBrief);

    // Save results to Supabase
    const { error: resultsError } = await supabase
      .from("marketing_campaigns")
      .update({
        status: "completed",
        research_data: crewResult.researchData,
        generated_content: crewResult.generatedContent,
        scheduled_posts: crewResult.scheduleStatus,
        engagement_campaigns: crewResult.engagementCampaigns,
        metrics: crewResult.currentMetrics,
        ml_insights: crewResult.mlInsights,
        prompt_updates: crewResult.promptUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignData.id);

    if (resultsError) {
      console.error("Failed to save campaign results:", resultsError);
    }

    return NextResponse.json(
      {
        success: true,
        campaignId: campaignData.id,
        message: "Marketing campaign executed successfully",
        results: {
          contentGenerated: crewResult.generatedContent.length,
          postsScheduled: crewResult.scheduleStatus.length,
          engagementCampaigns: crewResult.engagementCampaigns.length,
          metrics: crewResult.currentMetrics,
          insights: crewResult.mlInsights,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Marketing crew error:", error);
    return NextResponse.json(
      { error: "Failed to run marketing campaign", details: String(error) },
      { status: 500 },
    );
  }
}
