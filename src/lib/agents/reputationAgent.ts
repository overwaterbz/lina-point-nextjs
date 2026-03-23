/**
 * Reputation Agent
 *
 * Monitors guest reviews and manages the resort's online reputation:
 *
 * 1. Review ingestion — Reads review_monitoring table (populated by scraping cron)
 * 2. Sentiment analysis — Classifies reviews as positive/neutral/negative
 * 3. Response drafting — Uses Grok to write personalised review responses
 * 4. Escalation — Flags negative reviews (≤3 stars) for manager action
 * 5. Reputation score — Tracks rolling average rating across platforms
 *
 * Run via: /api/cron/reputation-monitor (daily)
 */

import { grokLLM } from "@/lib/grokIntegration";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReviewRecord {
  id: string;
  platform: string; // 'google' | 'tripadvisor' | 'booking' | 'expedia' | 'airbnb'
  reviewer_name: string | null;
  rating: number; // 1-5
  review_text: string | null;
  review_date: string;
  response_drafted: boolean;
  response_sent: boolean;
  response_text: string | null;
  escalated: boolean;
  sentiment: "positive" | "neutral" | "negative" | null;
}

export interface ReputationSummary {
  overallScore: number; // 0-5 weighted average
  totalReviews: number;
  platform: Record<string, { count: number; avg: number }>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  responseRate: number; // % of reviews with responses
  pendingResponses: number;
  escalations: number;
}

const RESPONSE_SYSTEM_PROMPT = `You are the Guest Relations Manager at Lina Point Resort — a luxury overwater resort in San Pedro, Ambergris Caye, Belize.

You are writing a professional, warm response to a guest review on a public platform.

RULES:
- For positive reviews: thank them genuinely, mention something specific from their review, invite them back.
- For neutral reviews: acknowledge their feedback, mention specific improvements, show you care.
- For negative reviews: apologise sincerely (even if not at fault), acknowledge specific concerns, explain what you're doing to improve, invite them to contact you directly (guests@linapoint.com).
- Keep response to 3-4 sentences max. Professional but warm.
- Never be defensive or argue.
- Sign off with: "Warm regards, [Name], Guest Relations, Lina Point Resort"
- Use the manager name "Alex" unless given another.
- Do NOT mention specific prices or promises of refunds.`;

// ── Helpers ────────────────────────────────────────────────────────────────

function classifySentiment(
  rating: number,
  reviewText: string | null,
): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

// ── Response Drafting ──────────────────────────────────────────────────────

/**
 * Draft a personalised response to a review using Grok.
 */
async function draftReviewResponse(review: ReviewRecord): Promise<string> {
  const sentiment = classifySentiment(review.rating, review.review_text);
  const basePrompt = await getActivePrompt(
    "reputation_response",
    RESPONSE_SYSTEM_PROMPT,
  );

  const contextPrompt =
    `Platform: ${review.platform}\n` +
    `Rating: ${review.rating}/5\n` +
    `Sentiment: ${sentiment}\n` +
    `Reviewer: ${review.reviewer_name || "Guest"}\n` +
    `Review: "${review.review_text || "(no text — rating only)"}"\n\n` +
    `Write a response now.`;

  const { result } = await runWithRecursion(
    async () =>
      grokLLM.invoke([
        new SystemMessage(basePrompt),
        new HumanMessage(contextPrompt),
      ]),
    async (response) => {
      const text = typeof response.content === "string" ? response.content : "";
      const eval_ = await evaluateTextQuality(
        "Professional, warm, concise review response for a luxury resort.",
        text,
      );
      return { score: eval_.score, feedback: eval_.feedback, data: response };
    },
    async (response, feedback, iteration) => {
      const text = typeof response.content === "string" ? response.content : "";
      return {
        content: text,
        additional_kwargs: { hint: `Iteration ${iteration + 1}: ${feedback}` },
      };
    },
  );

  return typeof result.content === "string"
    ? result.content
    : `Thank you for staying at Lina Point Resort and sharing your feedback. We truly appreciate it and look forward to welcoming you back to our little slice of Caribbean paradise! 🌊\n\nWarm regards, Alex, Guest Relations, Lina Point Resort`;
}

// ── Reputation Summary ─────────────────────────────────────────────────────

/**
 * Calculate reputation metrics from review_monitoring table.
 */
export async function getReputationSummary(
  supabase: SupabaseClient,
): Promise<ReputationSummary> {
  const { data: reviews } = await supabase
    .from("review_monitoring")
    .select(
      "platform, rating, sentiment, response_drafted, response_sent, escalated",
    )
    .order("review_date", { ascending: false })
    .limit(500);

  if (!reviews?.length) {
    return {
      overallScore: 0,
      totalReviews: 0,
      platform: {},
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      responseRate: 0,
      pendingResponses: 0,
      escalations: 0,
    };
  }

  const platformStats: Record<string, { count: number; totalRating: number }> =
    {};
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  let totalRating = 0;
  let responsesWithReply = 0;
  let pendingResponses = 0;
  let escalations = 0;

  for (const r of reviews) {
    // Platform breakdown
    if (!platformStats[r.platform]) {
      platformStats[r.platform] = { count: 0, totalRating: 0 };
    }
    platformStats[r.platform].count++;
    platformStats[r.platform].totalRating += r.rating;
    totalRating += r.rating;

    // Sentiment
    const s = (r.sentiment || classifySentiment(r.rating, null)) as
      | "positive"
      | "neutral"
      | "negative";
    sentimentBreakdown[s]++;

    // Responses
    if (r.response_sent) responsesWithReply++;
    if (r.response_drafted && !r.response_sent) pendingResponses++;
    if (r.escalated) escalations++;
  }

  const platform: Record<string, { count: number; avg: number }> = {};
  for (const [key, val] of Object.entries(platformStats)) {
    platform[key] = {
      count: val.count,
      avg: Math.round((val.totalRating / val.count) * 10) / 10,
    };
  }

  return {
    overallScore: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    platform,
    sentimentBreakdown,
    responseRate:
      reviews.length > 0
        ? Math.round((responsesWithReply / reviews.length) * 100)
        : 0,
    pendingResponses,
    escalations,
  };
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Process pending reviews: classify sentiment, draft responses, flag escalations.
 */
export async function runReputationMonitor(supabase: SupabaseClient): Promise<{
  processed: number;
  responseDrafted: number;
  escalated: number;
  errors: number;
}> {
  const stats = { processed: 0, responseDrafted: 0, escalated: 0, errors: 0 };

  // Find reviews needing processing (no sentiment set yet)
  const { data: pendingReviews } = await supabase
    .from("review_monitoring")
    .select("*")
    .is("sentiment", null)
    .order("review_date", { ascending: false })
    .limit(20); // Process in batches

  if (!pendingReviews?.length) return stats;

  for (const review of pendingReviews as ReviewRecord[]) {
    try {
      const sentiment = classifySentiment(review.rating, review.review_text);
      const shouldEscalate = review.rating <= 3;
      const shouldDraftResponse =
        review.review_text && review.review_text.length > 20;

      let responseDraft: string | null = null;
      if (shouldDraftResponse) {
        responseDraft = await draftReviewResponse({ ...review, sentiment });
        stats.responseDrafted++;
      }

      await supabase
        .from("review_monitoring")
        .update({
          sentiment,
          escalated: shouldEscalate,
          response_text: responseDraft,
          response_drafted: !!responseDraft,
        })
        .eq("id", review.id);

      if (shouldEscalate) {
        // Insert an ai_insight for the admin dashboard
        void (async () => {
          try {
            await supabase.from("ai_insights").insert({
              insight_type: "reputation_alert",
              confidence: 0.95,
              data: {
                platform: review.platform,
                rating: review.rating,
                reviewer: review.reviewer_name,
                review_text: review.review_text?.slice(0, 200),
                review_date: review.review_date,
              },
              recommendation: `Negative review on ${review.platform} (${review.rating}★). Respond within 24h.`,
            });
          } catch {
            /* non-fatal */
          }
        })();
        stats.escalated++;
      }

      stats.processed++;
    } catch (err) {
      console.error(`[ReputationAgent] Error for review ${review.id}:`, err);
      stats.errors++;
    }
  }

  return stats;
}
