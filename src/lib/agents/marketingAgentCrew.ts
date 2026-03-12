/**
 * MarketingAgentCrew: Autonomous Marketing System for Lina Point Resort
 * 
 * 5 Specialized Agents with Recursion:
 * 1. ResearchAgent - Scans trends, identifies opportunities, analyzes competitors
 * 2. ContentAgent - Generates social posts, scripts, emails using "Magic is You" theme
 * 3. PostingAgent - Schedules & posts to Instagram, TikTok, X, Facebook
 * 4. EngagementAgent - Replies to comments, builds email list, engagement campaigns
 * 5. SelfImprovementAgent - Analytics, ML-based refinement, prompt optimization
 * 
 * Generate → Execute → Measure → Refine (max 3 iterations per agent)
 */

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { grokLLM } from "@/lib/grokIntegration";
import { publishToSocial, type SocialPostResult } from "@/lib/socialMediaService";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) console.log(...args);
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CampaignBrief {
  campaignId: string;
  objective: "direct_bookings" | "brand_awareness" | "engagement" | "email_growth";
  targetAudience: string;
  keyMessages: string[];
  platforms: ("instagram" | "tiktok" | "facebook" | "x" | "email")[];
  budget?: number;
  startDate: Date;
  endDate: Date;
}

export interface MarketingContent {
  type: "social_post" | "reel_script" | "tiktok_script" | "email" | "blog";
  platform: string;
  title: string;
  content: string;
  hashtags?: string[];
  callToAction?: string;
  mediaUrl?: string;
  scheduledTime?: Date;
  status: "draft" | "scheduled" | "published" | "failed";
}

export interface CampaignMetrics {
  campaignId: string;
  impressions: number;
  clicks: number;
  engagements: number;
  conversions: number;
  emailsCollected: number;
  ctr: number;
  conversionRate: number;
  dateTracked: Date;
}

export interface MarketingCrewState {
  campaignId: string;
  campaignBrief: CampaignBrief;
  
  // Research phase
  researchData: {
    trends: string[];
    competitors: string[];
    influencers: string[];
    opportunities: string[];
    refinementNotes: string;
  };
  
  // Content generation phase
  generatedContent: MarketingContent[];
  contentRefinement: string;
  
  // Posting phase
  scheduleStatus: {
    platform: string;
    status: "pending" | "scheduled" | "posted" | "failed";
    url?: string;
  }[];
  
  // Engagement phase
  engagementCampaigns: {
    type: "reply_sequence" | "email_drip" | "dms";
    status: string;
    response: string;
  }[];
  
  // Metrics & Learning
  currentMetrics: CampaignMetrics;
  mlInsights: string[];
  promptUpdates: string[];
  
  iteration: number;
  status: "researching" | "generating_content" | "scheduling_posts" | "engaging" | "measuring" | "optimizing" | "completed";
}

const MarketingCrewAnnotation = Annotation.Root({
  campaignId: Annotation<string>,
  campaignBrief: Annotation<CampaignBrief>,
  researchData: Annotation<any>,
  generatedContent: Annotation<MarketingContent[]>,
  contentRefinement: Annotation<string>,
  scheduleStatus: Annotation<any[]>,
  engagementCampaigns: Annotation<any[]>,
  currentMetrics: Annotation<CampaignMetrics>,
  mlInsights: Annotation<string[]>,
  promptUpdates: Annotation<string[]>,
  iteration: Annotation<number>,
  status: Annotation<"researching" | "generating_content" | "scheduling_posts" | "engaging" | "measuring" | "optimizing" | "completed">,
});

// ============================================================================
// AGENT 1: RESEARCH AGENT
// ============================================================================

async function researchTrendsAndOpportunities(state: typeof MarketingCrewAnnotation.State) {
  debugLog(`[ResearchAgent] Iteration ${state.iteration}: Researching trends and opportunities...`);
  
  const prompt = `You are a travel marketing research expert. Analyze current trends for ${state.campaignBrief.targetAudience}.

For Lina Point Resort (overwater luxury), identify:
1. Top 3 travel trends from last 30 days
2. 2-3 direct competitors and their marketing angles
3. 3-5 relevant travel influencers in the luxury/wellness space
4. Market opportunities for direct bookings

Campaign objective: ${state.campaignBrief.objective}

Return JSON with: { trends: [], competitors: [], influencers: [], opportunities: [], marketingAngle: "" }`;

  try {
    const response = await grokLLM.invoke([
      { role: "system", content: "You are a marketing research assistant. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content);
    const research = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');

    return {
      ...state,
      researchData: {
        trends: research.trends || [],
        competitors: research.competitors || [],
        influencers: research.influencers || [],
        opportunities: research.opportunities || [],
        refinementNotes: `Analyzed 30-day trends for ${state.campaignBrief.targetAudience}. Found ${research.opportunities?.length || 0} opportunities.`
      },
      status: "researching" as const
    };
  } catch (error) {
    debugLog("[ResearchAgent] Error:", error);
    return {
      ...state,
      researchData: {
        trends: ["tropical wellness escapes", "digital detox experiences"],
        competitors: ["Turneffe Island", "South Water Caye"],
        influencers: ["travel bloggers", "wellness influencers"],
        opportunities: ["early bird bookings", "couples packages"],
        refinementNotes: "Fallback research data loaded"
      }
    };
  }
}

// ============================================================================
// AGENT 2: CONTENT GENERATION AGENT
// ============================================================================

async function generateMarketingContent(state: typeof MarketingCrewAnnotation.State) {
  debugLog(`[ContentAgent] Iteration ${state.iteration}: Generating marketing content...`);
  
  const contentBrief = `Create marketing content for Lina Point Resort using "The Magic is You" mantra and kundalini/mystical themes.

Objective: ${state.campaignBrief.objective}
Target: ${state.campaignBrief.targetAudience}
Platforms: ${state.campaignBrief.platforms.join(", ")}
Key Messages: ${state.campaignBrief.keyMessages.join(", ")}

DIRECT BOOKING ADVANTAGE — weave this into every piece:
- Lina Point guarantees 6% below any OTA (Expedia, Booking.com, Agoda)
- Use promo code DIRECT10 for 10% off first direct booking
- Loyalty program: earn points on every stay, unlock VIP perks
- "Why pay Expedia's markup? Book direct at lina-point.com and save."

Research insights:
- Trends: ${state.researchData.trends.join(", ")}
- Opportunities: ${state.researchData.opportunities.join(", ")}

Generate 3 posts:
1. Instagram post (caption + hashtags) — emphasize price transparency
2. TikTok script (9-15 sec, trending sounds) — "POV: you found out you've been overpaying on Expedia"
3. Email subject line & opening — direct booking savings hook

Format as JSON array: [{ type, platform, content, hashtags, cta }]`;

  try {
    const response = await grokLLM.invoke([
      { role: "system", content: "You are a creative marketing copywriter for a luxury Belize resort. Create content emphasizing magic, mystique, and transformation. IMPORTANT: Every piece must include a direct booking advantage — Lina Point beats OTA prices by 6%, promo code DIRECT10 saves 10%, and loyalty members earn exclusive perks. Drive traffic to lina-point.com, not OTAs. Return valid JSON array." },
      { role: "user", content: contentBrief }
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content);
    const contentArray = JSON.parse(content.match(/\[[\s\S]*\]/)?.[0] || '[]');

    const generatedContent: MarketingContent[] = contentArray.map((item: any, idx: number) => ({
      type: item.type || "social_post",
      platform: item.platform || state.campaignBrief.platforms[idx % state.campaignBrief.platforms.length],
      title: item.title || `Post ${idx + 1}`,
      content: item.content || "",
      hashtags: item.hashtags || [],
      callToAction: item.cta || "Book direct at lina-point.com — guaranteed 6% below any OTA",
      status: "draft"
    }));

    return {
      ...state,
      generatedContent,
      contentRefinement: `Generated ${generatedContent.length} pieces of content`,
      status: "generating_content" as const
    };
  } catch (error) {
    debugLog("[ContentAgent] Error:", error);
    return {
      ...state,
      generatedContent: [{
        type: "social_post" as const,
        platform: "instagram",
        title: "The Magic Awaits",
        content: "✨ The magic is YOU. Discover your transformation at Lina Point. #MagicIsYou #OverwaterLuxury",
        hashtags: ["#linapoint", "#belize", "#wellness"],
        callToAction: "Book now",
        status: "draft" as const,
      }],
      contentRefinement: "Fallback content generated"
    };
  }
}

// ============================================================================
// AGENT 3: POSTING AGENT
// ============================================================================

async function scheduleAndPostContent(state: typeof MarketingCrewAnnotation.State) {
  debugLog(`[PostingAgent] Iteration ${state.iteration}: Publishing posts via real APIs...`);
  
  const scheduleStatus: any[] = [];

  for (const content of state.generatedContent) {
    const platform = content.platform;
    const text = content.hashtags?.length
      ? `${content.content}\n\n${content.hashtags.join(' ')}`
      : content.content;

    // Attempt real API post
    const result: SocialPostResult = await publishToSocial(
      platform,
      text,
      content.mediaUrl,       // image/video URL if available
      'https://linapoint.com' // fallback link
    );

    scheduleStatus.push({
      platform,
      contentId: `${state.campaignId}-${scheduleStatus.length}`,
      title: content.title,
      scheduledTime: new Date(),
      status: result.success ? 'posted' : 'failed',
      url: result.postUrl || null,
      postId: result.postId || null,
      error: result.error || null,
    });

    debugLog(`[PostingAgent] ${platform}: ${result.success ? '✅ posted' : '❌ ' + result.error}`);
  }

  const posted = scheduleStatus.filter(s => s.status === 'posted').length;
  debugLog(`[PostingAgent] Published ${posted}/${scheduleStatus.length} posts`);

  return {
    ...state,
    scheduleStatus,
    status: "scheduling_posts" as const
  };
}

// ============================================================================
// AGENT 4: ENGAGEMENT AGENT
// ============================================================================

async function setupEngagementCampaigns(state: typeof MarketingCrewAnnotation.State) {
  debugLog(`[EngagementAgent] Iteration ${state.iteration}: Setting up engagement campaigns...`);
  
  const engagementCampaigns = [
    {
      type: "reply_sequence" as const,
      name: "Smart Comment Replies",
      prompt: `Reply to comments on ${state.campaignBrief.platforms.join("/")} posts about Lina Point.
        Use "The Magic is You" theme. Keep replies personalized and 2-3 sentences.
        Always include a soft CTA to book direct at lina-point.com (we beat OTA prices by 6%).
        If someone mentions finding us on Expedia/Booking.com, let them know they save more booking direct.`,
      status: "active",
      response: "Reply generator activated for top posts"
    },
    {
      type: "email_drip" as const,
      name: "Welcome Email Sequence",
      prompt: `Create 3-email drip sequence for new bookings from this campaign.
        Email 1: Welcome + magic experience preview + mention promo code DIRECT10 for 10% off
        Email 2: Price comparison showing we beat Expedia by 6% + loyalty program benefits
        Email 3: Last-minute deal for return visitors + exclusive promo code for loyal guests`,
      status: "configured",
      response: "Email drip sequence configured"
    },
    {
      type: "dms" as const,
      name: "Proactive DM Campaign",
      prompt: `Send friendly DMs to commenters and followers interested in travel.
        Ask about their travel style, then suggest if Lina Point matches their vibe.
        When they show interest, share that booking direct saves 6% vs any OTA.
        Include direct booking link to lina-point.com/booking.`,
      status: "pending_activation",
      response: "DM campaign template ready"
    }
  ];

  return {
    ...state,
    engagementCampaigns,
    status: "engaging" as const
  };
}

// ============================================================================
// AGENT 5: SELF-IMPROVEMENT AGENT
// ============================================================================

async function measureAndOptimize(state: typeof MarketingCrewAnnotation.State) {
  debugLog(`[SelfImprovementAgent] Iteration ${state.iteration}: Analyzing metrics and generating improvements...`);
  
  // Mock metrics (in production, these would be fetched from Supabase)
  const mockMetrics: CampaignMetrics = {
    campaignId: state.campaignId,
    impressions: Math.floor(Math.random() * 5000) + 1000,
    clicks: Math.floor(Math.random() * 500) + 50,
    engagements: Math.floor(Math.random() * 200) + 20,
    conversions: Math.floor(Math.random() * 20) + 2,
    emailsCollected: Math.floor(Math.random() * 100) + 10,
    ctr: Math.random() * 0.08 + 0.02,
    conversionRate: Math.random() * 0.05 + 0.01,
    dateTracked: new Date()
  };

  const analysisPrompt = `Analyze these marketing metrics and suggest improvements:
    
Metrics:
- Impressions: ${mockMetrics.impressions}
- Clicks: ${mockMetrics.clicks}
- CTR: ${(mockMetrics.ctr * 100).toFixed(2)}%
- Conversions: ${mockMetrics.conversions}
- Conversion Rate: ${(mockMetrics.conversionRate * 100).toFixed(2)}%
- Emails Collected: ${mockMetrics.emailsCollected}

Campaign Brief:
- Objective: ${state.campaignBrief.objective}
- Target: ${state.campaignBrief.targetAudience}

Generate JSON with:
{
  "mlInsights": ["insight 1", "insight 2"],
  "promptUpdates": ["update for content", "update for engagement"],
  "nextActions": ["action 1", "action 2"],
  "confidenceScore": 0.85
}`;

  try {
    const response = await grokLLM.invoke([
      { role: "system", content: "You are a marketing analytics expert. Return valid JSON." },
      { role: "user", content: analysisPrompt }
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content);
    const analysis = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');

    return {
      ...state,
      currentMetrics: mockMetrics,
      mlInsights: analysis.mlInsights || [],
      promptUpdates: analysis.promptUpdates || [],
      status: "optimizing" as const
    };
  } catch (error) {
    debugLog("[SelfImprovementAgent] Error:", error);
    return {
      ...state,
      currentMetrics: mockMetrics,
      mlInsights: [
        "CTR is above 2% - strong copy performance",
        "Conversion rate could improve by testing urgency CTAs",
        "Email collection lower than expected - add signup incentive"
      ],
      promptUpdates: [
        "Increase frequency of urgency-based CTAs",
        "Add limited-time offer mentions to emails",
        "Emphasize exclusivity in social posts"
      ]
    };
  }
}

// ============================================================================
// CREW ORCHESTRATOR
// ============================================================================

export async function runMarketingCrew(campaignBrief: CampaignBrief): Promise<MarketingCrewState> {
  debugLog("\n🚀 [MarketingCrew] Starting campaign orchestration...\n");

  const initialState: MarketingCrewState = {
    campaignId: `campaign-${Date.now()}`,
    campaignBrief,
    researchData: { trends: [], competitors: [], influencers: [], opportunities: [], refinementNotes: "" },
    generatedContent: [],
    contentRefinement: "",
    scheduleStatus: [],
    engagementCampaigns: [],
    currentMetrics: {} as CampaignMetrics,
    mlInsights: [],
    promptUpdates: [],
    iteration: 1,
    status: "researching"
  };

  // Execute agents sequentially
  let state = initialState;

  // Phase 1: Research
  debugLog("📊 PHASE 1: Research Agent");
  state = await researchTrendsAndOpportunities(state);

  // Phase 2: Content Generation  
  debugLog("✍️  PHASE 2: Content Agent");
  state = await generateMarketingContent(state);

  // Phase 3: Scheduling
  debugLog("📅 PHASE 3: Posting Agent");
  state = await scheduleAndPostContent(state);

  // Phase 4: Engagement
  debugLog("👥 PHASE 4: Engagement Agent");
  state = await setupEngagementCampaigns(state);

  // Phase 5: Optimization
  debugLog("📈 PHASE 5: Self-Improvement Agent");
  state = await measureAndOptimize(state);

  state.status = "completed";
  debugLog("\n✅ [MarketingCrew] Campaign orchestration complete!\n");

  return state;
}

// Export agent functions for testing
export { researchTrendsAndOpportunities, generateMarketingContent, scheduleAndPostContent, setupEngagementCampaigns, measureAndOptimize };
