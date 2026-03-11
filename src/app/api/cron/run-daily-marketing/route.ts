/**
 * API Route: GET /api/cron/run-daily-marketing
 * Scheduled via vercel.json to run once per day
 * Triggers MarketingAgentCrew for daily autonomous campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runMarketingCrew } from "@/lib/agents/marketingAgentCrew";

const debugLog = (...args: unknown[]) => {
  console.log("[Marketing Cron]", ...args);
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    debugLog("🌙 [Cron] Running daily marketing campaigns...");

    // Fetch campaigns that are scheduled for today
    const { data: scheduledCampaigns, error: fetchError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("status", "draft")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled campaigns:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    let processedCount = 0;
    const results = [];

    // Run each campaign
    for (const campaign of scheduledCampaigns) {
      try {
        const crewResult = await runMarketingCrew({
          campaignId: campaign.id,
          objective: campaign.objective,
          targetAudience: campaign.target_audience,
          keyMessages: campaign.key_messages,
          platforms: campaign.platforms,
          startDate: new Date(campaign.created_at),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        // Update campaign with results
        const { error: updateError } = await supabase
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
            updated_at: new Date().toISOString()
          })
          .eq("id", campaign.id);

        if (updateError) {
          console.error(`Failed to update campaign ${campaign.id}:`, updateError);
        } else {
          processedCount++;
          results.push({
            campaignId: campaign.id,
            status: "success",
            contentGenerated: crewResult.generatedContent.length,
            postsScheduled: crewResult.scheduleStatus.length
          });
        }
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          status: "failed",
          error: String(error)
        });
      }
    }

    debugLog(`✅ [Cron] Daily marketing complete: ${processedCount}/${scheduledCampaigns.length} campaigns processed`);

    // Run autonomous improvement daily
    await runDailyAutoImprovement();

    return NextResponse.json(
      {
        success: true,
        message: "Daily marketing campaigns executed",
        processed: processedCount,
        total: scheduledCampaigns.length,
        results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Cron task failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Run daily self-improvement via agents
 */
async function runDailyAutoImprovement() {
  try {
    debugLog("🤖 [DailyImprovement] Analyzing marketing performance...");

    // Get metrics from last 24 hours
    const { data: recentCampaigns } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!recentCampaigns || recentCampaigns.length === 0) {
      debugLog("ℹ️  No campaigns to analyze");
      return;
    }

    // Aggregate metrics
    const totalMetrics = recentCampaigns.reduce((acc, campaign) => {
      const metrics = campaign.metrics || {};
      return {
        impressions: (acc.impressions || 0) + (metrics.impressions || 0),
        clicks: (acc.clicks || 0) + (metrics.clicks || 0),
        conversions: (acc.conversions || 0) + (metrics.conversions || 0),
        campaignCount: (acc.campaignCount || 0) + 1
      };
    }, {});

    // Calculate performance insights
    const ctr = totalMetrics.impressions > 0 
      ? ((totalMetrics.clicks / totalMetrics.impressions) * 100).toFixed(2)
      : "N/A";
    
    const conversionRate = totalMetrics.clicks > 0
      ? ((totalMetrics.conversions / totalMetrics.clicks) * 100).toFixed(2)
      : "N/A";

    debugLog(`📊 [DailyImprovement] Metrics Summary:
      - Campaigns: ${totalMetrics.campaignCount}
      - Impressions: ${totalMetrics.impressions}
      - Clicks: ${totalMetrics.clicks}
      - CTR: ${ctr}%
      - Conversions: ${totalMetrics.conversions}
      - Conversion Rate: ${conversionRate}%
    `);

    // Store daily summary
    const { error: summaryError } = await supabase
      .from("marketing_agent_logs")
      .insert({
        agent_name: "DailyImprovement",
        action: "Daily performance summary",
        status: "completed",
        output_data: {
          ...totalMetrics,
          ctr,
          conversionRate
        }
      });

    if (summaryError) {
      console.error("Failed to log daily summary:", summaryError);
    }

  } catch (error) {
    console.error("Daily improvement error:", error);
  }
}
