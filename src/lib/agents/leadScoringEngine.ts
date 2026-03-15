/**
 * Lead Scoring Engine
 *
 * Scores users across the Overwater / Lina Point / Magic Is You ecosystem
 * based on cross-site behavior events. Updates lead_scores table and
 * determines tier (cold → warm → hot → qualified).
 *
 * Scoring model:
 *  +5  page_view (any site)
 *  +15 quiz_completed (Overwater)
 *  +20 blueprint_generated (MIY)
 *  +10 chat_message_sent (MIY concierge)
 *  +25 subscription_started (MIY)
 *  +30 booking_started / booking_completed (LP)
 *  +10 signup_completed (any site)
 *  +20 cross-site visitor (seen on 2+ sources)
 *  +10 return visitor (seen on 3+ days)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface LeadScore {
  session_id: string;
  user_id?: string;
  email?: string;
  score: number;
  tier: "cold" | "warm" | "hot" | "qualified";
  sources: string[];
  events_count: number;
  quiz_element?: string;
  has_blueprint: boolean;
  has_booking: boolean;
  has_subscription: boolean;
  utm_source?: string;
  utm_campaign?: string;
}

const EVENT_SCORES: Record<string, number> = {
  page_view: 5,
  quiz_started: 10,
  quiz_completed: 15,
  blueprint_generated: 20,
  chat_message_sent: 10,
  subscription_started: 25,
  booking_started: 30,
  booking_completed: 30,
  signup_completed: 10,
  concierge_message: 10,
  element_result_viewed: 15,
};

function calculateTier(score: number): "cold" | "warm" | "hot" | "qualified" {
  if (score >= 80) return "qualified";
  if (score >= 50) return "hot";
  if (score >= 20) return "warm";
  return "cold";
}

/**
 * Process recent events and update lead scores.
 * Called by the ecosystem-triggers cron job.
 */
export async function updateLeadScores(
  supabase: SupabaseClient,
  since: Date
): Promise<{ updated: number; newLeads: number }> {
  // Fetch events since last run
  const { data: events, error } = await supabase
    .from("events")
    .select("event, properties, source, session_id, user_id, page_url, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error || !events?.length) {
    return { updated: 0, newLeads: 0 };
  }

  // Group events by session_id
  const sessionMap = new Map<string, typeof events>();
  for (const ev of events) {
    if (!ev.session_id) continue;
    const list = sessionMap.get(ev.session_id) || [];
    list.push(ev);
    sessionMap.set(ev.session_id, list);
  }

  let updated = 0;
  let newLeads = 0;

  for (const [sessionId, sessionEvents] of sessionMap) {
    // Calculate score from new events
    let addedScore = 0;
    const sources = new Set<string>();
    let quizElement: string | undefined;
    let hasBlueprint = false;
    let hasBooking = false;
    let hasSubscription = false;
    let userId: string | undefined;

    for (const ev of sessionEvents) {
      addedScore += EVENT_SCORES[ev.event] || 5;
      if (ev.source) sources.add(ev.source);
      if (ev.user_id) userId = ev.user_id;

      if (ev.event === "quiz_completed" && ev.properties?.element) {
        quizElement = String(ev.properties.element);
      }
      if (ev.event === "blueprint_generated") hasBlueprint = true;
      if (ev.event === "booking_completed") hasBooking = true;
      if (ev.event === "subscription_started") hasSubscription = true;
    }

    // Cross-site bonus
    if (sources.size >= 2) addedScore += 20;

    // Fetch existing lead score
    const { data: existing } = await supabase
      .from("lead_scores")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      const mergedSources = [...new Set([...existing.sources, ...sources])];
      const newScore = existing.score + addedScore;
      const newTier = calculateTier(newScore);

      await supabase
        .from("lead_scores")
        .update({
          score: newScore,
          tier: newTier,
          sources: mergedSources,
          events_count: existing.events_count + sessionEvents.length,
          last_seen_at: new Date().toISOString(),
          ...(userId && { user_id: userId }),
          ...(quizElement && { quiz_element: quizElement }),
          ...(hasBlueprint && { has_blueprint: true }),
          ...(hasBooking && { has_booking: true }),
          ...(hasSubscription && { has_subscription: true }),
        })
        .eq("session_id", sessionId);

      updated++;
    } else {
      const score = addedScore;
      const tier = calculateTier(score);

      await supabase.from("lead_scores").insert({
        session_id: sessionId,
        user_id: userId || null,
        score,
        tier,
        sources: [...sources],
        events_count: sessionEvents.length,
        quiz_element: quizElement || null,
        has_blueprint: hasBlueprint,
        has_booking: hasBooking,
        has_subscription: hasSubscription,
      });

      newLeads++;
    }
  }

  return { updated, newLeads };
}

/**
 * Get leads by tier for marketing targeting
 */
export async function getLeadsByTier(
  supabase: SupabaseClient,
  tier: "cold" | "warm" | "hot" | "qualified",
  limit = 100
) {
  const { data } = await supabase
    .from("lead_scores")
    .select("*")
    .eq("tier", tier)
    .order("score", { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get leads who haven't been nurtured yet (no active sequence)
 */
export async function getUnnurturedHotLeads(
  supabase: SupabaseClient,
  limit = 50
) {
  const { data: hotLeads } = await supabase
    .from("lead_scores")
    .select("*")
    .in("tier", ["hot", "qualified"])
    .order("score", { ascending: false })
    .limit(limit);

  if (!hotLeads?.length) return [];

  // Filter out those already in a nurture sequence
  const sessionIds = hotLeads.map((l) => l.session_id);
  const { data: activeSequences } = await supabase
    .from("nurture_sequences")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("status", "active");

  const nurturedIds = new Set(activeSequences?.map((s) => s.session_id) || []);
  return hotLeads.filter((l) => !nurturedIds.has(l.session_id));
}
