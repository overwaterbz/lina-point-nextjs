/**
 * Ecosystem Marketing Triggers
 *
 * Watches cross-site events and autonomously fires marketing actions:
 *  - Quiz completed → personalized follow-up email
 *  - Blueprint generated → cross-promote LP booking
 *  - Cross-site visitor → WhatsApp outreach (if opted in)
 *  - Lead score threshold → enroll in nurture sequence
 *  - Subscription started → welcome + ecosystem intro
 *
 * Runs as a Vercel cron every 2 hours.
 */

import { SupabaseClient } from "@supabase/supabase-js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Lina Point Resort <concierge@linapoint.com>";

interface TriggerResult {
  trigger_type: string;
  session_id?: string;
  action_taken: string;
  status: "sent" | "failed" | "skipped";
  details?: Record<string, unknown>;
}

/**
 * Process quiz completions → send personalized element email
 */
async function processQuizCompletions(
  supabase: SupabaseClient,
  since: Date
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];

  // Find quiz completions that haven't been triggered yet
  const { data: quizEvents } = await supabase
    .from("events")
    .select("session_id, user_id, properties, created_at")
    .eq("event", "quiz_completed")
    .eq("source", "overwater")
    .gte("created_at", since.toISOString());

  if (!quizEvents?.length) return results;

  for (const ev of quizEvents) {
    const sessionId = ev.session_id;
    if (!sessionId) continue;

    // Check if we already triggered for this session
    const { data: existing } = await supabase
      .from("marketing_triggers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("trigger_type", "quiz_followup")
      .single();

    if (existing) continue;

    const element = ev.properties?.element || "Water";
    const soulPath = ev.properties?.soul_path || "The Flowing Path";

    // Get user email if authenticated
    let email: string | undefined;
    if (ev.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(ev.user_id);
      email = user?.user?.email ?? undefined;
    }

    if (email && RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email],
            subject: `Your Element is ${element} — Here's What It Means for Your Journey`,
            html: buildQuizFollowupEmail(element, soulPath),
          }),
        });

        await supabase.from("marketing_triggers").insert({
          trigger_type: "quiz_followup",
          session_id: sessionId,
          user_id: ev.user_id,
          source_event: "quiz_completed",
          action_taken: `Sent ${element} follow-up email`,
          action_details: { element, soulPath, email },
          status: "sent",
          executed_at: new Date().toISOString(),
        });

        results.push({
          trigger_type: "quiz_followup",
          session_id: sessionId,
          action_taken: `Sent ${element} follow-up email to ${email}`,
          status: "sent",
        });
      } catch {
        results.push({
          trigger_type: "quiz_followup",
          session_id: sessionId,
          action_taken: "Email send failed",
          status: "failed",
        });
      }
    } else {
      // Log the trigger even without email (for lead scoring)
      await supabase.from("marketing_triggers").insert({
        trigger_type: "quiz_followup",
        session_id: sessionId,
        user_id: ev.user_id,
        source_event: "quiz_completed",
        action_taken: "Quiz completed — no email available",
        action_details: { element, soulPath },
        status: "skipped",
      });

      results.push({
        trigger_type: "quiz_followup",
        session_id: sessionId,
        action_taken: "Skipped — no email on file",
        status: "skipped",
      });
    }
  }

  return results;
}

/**
 * Process blueprint generations → cross-promote LP booking
 */
async function processBlueprintGenerations(
  supabase: SupabaseClient,
  since: Date
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];

  const { data: blueprintEvents } = await supabase
    .from("events")
    .select("session_id, user_id, properties, created_at")
    .eq("event", "blueprint_generated")
    .eq("source", "magic-is-you")
    .gte("created_at", since.toISOString());

  if (!blueprintEvents?.length) return results;

  for (const ev of blueprintEvents) {
    const sessionId = ev.session_id;
    if (!sessionId) continue;

    const { data: existing } = await supabase
      .from("marketing_triggers")
      .select("id")
      .eq("session_id", sessionId)
      .eq("trigger_type", "blueprint_booking_cta")
      .single();

    if (existing) continue;

    let email: string | undefined;
    if (ev.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(ev.user_id);
      email = user?.user?.email ?? undefined;
    }

    if (email && RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [email],
            subject: "Your Cosmic Blueprint is Ready — Now Experience It at Lina Point",
            html: buildBlueprintBookingEmail(),
          }),
        });

        await supabase.from("marketing_triggers").insert({
          trigger_type: "blueprint_booking_cta",
          session_id: sessionId,
          user_id: ev.user_id,
          source_event: "blueprint_generated",
          action_taken: "Sent blueprint → booking cross-promo email",
          action_details: { email },
          status: "sent",
          executed_at: new Date().toISOString(),
        });

        results.push({
          trigger_type: "blueprint_booking_cta",
          session_id: sessionId,
          action_taken: `Sent booking cross-promo to ${email}`,
          status: "sent",
        });
      } catch {
        results.push({
          trigger_type: "blueprint_booking_cta",
          session_id: sessionId,
          action_taken: "Email send failed",
          status: "failed",
        });
      }
    } else {
      await supabase.from("marketing_triggers").insert({
        trigger_type: "blueprint_booking_cta",
        session_id: sessionId,
        user_id: ev.user_id,
        source_event: "blueprint_generated",
        action_taken: "Blueprint generated — no email available",
        action_details: {},
        status: "skipped",
      });

      results.push({
        trigger_type: "blueprint_booking_cta",
        session_id: sessionId,
        action_taken: "Skipped — no email on file",
        status: "skipped",
      });
    }
  }

  return results;
}

/**
 * Enroll hot leads into nurture sequences
 */
async function enrollHotLeadsInNurture(
  supabase: SupabaseClient,
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];

  // Find hot/qualified leads not yet in a nurture sequence
  const { data: hotLeads } = await supabase
    .from("lead_scores")
    .select("*")
    .in("tier", ["hot", "qualified"])
    .order("score", { ascending: false })
    .limit(20);

  if (!hotLeads?.length) return results;

  const sessionIds = hotLeads.map((l) => l.session_id);
  const { data: activeSeqs } = await supabase
    .from("nurture_sequences")
    .select("session_id")
    .in("session_id", sessionIds)
    .in("status", ["active", "completed"]);

  const enrolled = new Set(activeSeqs?.map((s) => s.session_id) || []);

  for (const lead of hotLeads) {
    if (enrolled.has(lead.session_id)) continue;

    // Determine the best sequence based on lead's journey
    let sequenceName: string;
    let totalSteps: number;

    if (lead.quiz_element && !lead.has_blueprint) {
      sequenceName = "quiz_to_blueprint";
      totalSteps = 3;
    } else if (lead.has_blueprint && !lead.has_booking) {
      sequenceName = "blueprint_to_booking";
      totalSteps = 4;
    } else if (lead.sources.includes("overwater") && !lead.has_booking) {
      sequenceName = "ownership_interest";
      totalSteps = 3;
    } else {
      sequenceName = "ecosystem_welcome";
      totalSteps = 3;
    }

    // Schedule first email for tomorrow 10am UTC
    const nextSend = new Date();
    nextSend.setUTCDate(nextSend.getUTCDate() + 1);
    nextSend.setUTCHours(10, 0, 0, 0);

    await supabase.from("nurture_sequences").insert({
      session_id: lead.session_id,
      user_id: lead.user_id || null,
      email: lead.email || null,
      sequence_name: sequenceName,
      current_step: 0,
      total_steps: totalSteps,
      status: "active",
      next_send_at: nextSend.toISOString(),
      metadata: {
        lead_score: lead.score,
        lead_tier: lead.tier,
        quiz_element: lead.quiz_element,
      },
    });

    await supabase.from("marketing_triggers").insert({
      trigger_type: "nurture_enrollment",
      session_id: lead.session_id,
      user_id: lead.user_id,
      source_event: `lead_score_${lead.tier}`,
      action_taken: `Enrolled in ${sequenceName} sequence`,
      action_details: {
        sequence: sequenceName,
        score: lead.score,
        tier: lead.tier,
        steps: totalSteps,
      },
      status: "sent",
      executed_at: new Date().toISOString(),
    });

    results.push({
      trigger_type: "nurture_enrollment",
      session_id: lead.session_id,
      action_taken: `Enrolled in ${sequenceName} (score: ${lead.score})`,
      status: "sent",
    });
  }

  return results;
}

/**
 * Take daily ecosystem snapshot for command center
 */
async function takeEcosystemSnapshot(
  supabase: SupabaseClient,
  since: Date
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Count events by source
  const { data: owEvents } = await supabase
    .from("events")
    .select("id", { count: "exact" })
    .eq("source", "overwater")
    .gte("created_at", since.toISOString());

  const { data: lpEvents } = await supabase
    .from("events")
    .select("id", { count: "exact" })
    .eq("source", "lina-point")
    .gte("created_at", since.toISOString());

  const { data: miyEvents } = await supabase
    .from("events")
    .select("id", { count: "exact" })
    .eq("source", "magic-is-you")
    .gte("created_at", since.toISOString());

  // Count unique sessions
  const { data: sessions } = await supabase
    .from("events")
    .select("session_id, source")
    .gte("created_at", since.toISOString());

  const uniqueSessions = new Set(sessions?.map((s) => s.session_id).filter(Boolean));

  // Cross-site sessions (session_id appears with multiple sources)
  const sessionSources = new Map<string, Set<string>>();
  for (const s of sessions || []) {
    if (!s.session_id || !s.source) continue;
    const set = sessionSources.get(s.session_id) || new Set();
    set.add(s.source);
    sessionSources.set(s.session_id, set);
  }
  const crossSite = [...sessionSources.values()].filter((s) => s.size >= 2).length;

  // Lead counts
  const { count: newLeads } = await supabase
    .from("lead_scores")
    .select("id", { count: "exact" })
    .gte("first_seen_at", since.toISOString());

  const { count: hotLeads } = await supabase
    .from("lead_scores")
    .select("id", { count: "exact" })
    .eq("tier", "hot");

  const { count: qualifiedLeads } = await supabase
    .from("lead_scores")
    .select("id", { count: "exact" })
    .eq("tier", "qualified");

  // Trigger counts
  const { count: triggersFired } = await supabase
    .from("marketing_triggers")
    .select("id", { count: "exact" })
    .gte("created_at", since.toISOString());

  await supabase
    .from("ecosystem_snapshots")
    .upsert({
      snapshot_date: today,
      overwater_events: owEvents?.length || 0,
      lina_point_events: lpEvents?.length || 0,
      magic_is_you_events: miyEvents?.length || 0,
      total_sessions: uniqueSessions.size,
      cross_site_sessions: crossSite,
      new_leads: newLeads || 0,
      hot_leads: hotLeads || 0,
      qualified_leads: qualifiedLeads || 0,
      triggers_fired: triggersFired || 0,
    }, { onConflict: "snapshot_date" });
}

/**
 * Main trigger runner — called by cron
 */
export async function runEcosystemTriggers(
  supabase: SupabaseClient,
  since: Date
): Promise<{
  quizFollowups: TriggerResult[];
  blueprintCTAs: TriggerResult[];
  nurtureEnrollments: TriggerResult[];
  snapshotTaken: boolean;
}> {
  const [quizFollowups, blueprintCTAs, nurtureEnrollments] = await Promise.all([
    processQuizCompletions(supabase, since),
    processBlueprintGenerations(supabase, since),
    enrollHotLeadsInNurture(supabase),
  ]);

  await takeEcosystemSnapshot(supabase, since);

  return {
    quizFollowups,
    blueprintCTAs,
    nurtureEnrollments,
    snapshotTaken: true,
  };
}

// ── Email Templates ───────────────────────────────────────

function buildQuizFollowupEmail(element: string, soulPath: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #0a0a1a; color: #e8e0d0; padding: 40px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #c9a55a; font-size: 28px; margin: 0;">Your Element: ${element}</h1>
    <p style="color: #8a7a6a; font-size: 14px;">${soulPath}</p>
  </div>

  <p style="line-height: 1.8; font-size: 16px;">
    The waters remember what the mind forgets. Your quiz revealed <strong style="color: #c9a55a;">${element}</strong>
    as your guiding element — and this is just the beginning of your journey.
  </p>

  <div style="background: #1a1a2e; border: 1px solid #c9a55a33; border-radius: 12px; padding: 24px; margin: 30px 0;">
    <h2 style="color: #c9a55a; font-size: 18px; margin-top: 0;">Your Next Steps</h2>
    <p style="line-height: 1.6;">
      <strong>1.</strong> <a href="https://magic.overwater.com?utm_source=email&utm_medium=quiz_followup&utm_campaign=${element.toLowerCase()}" style="color: #c9a55a;">Discover your full Cosmic Blueprint</a> — 35+ elements mapped to your soul's purpose<br>
      <strong>2.</strong> <a href="https://linapoint.com?utm_source=email&utm_medium=quiz_followup&utm_campaign=${element.toLowerCase()}" style="color: #c9a55a;">Book your stay at Lina Point</a> — experience ${element} energy in person, overwater<br>
      <strong>3.</strong> <a href="https://overwater.com/own?utm_source=email&utm_medium=quiz_followup&utm_campaign=${element.toLowerCase()}" style="color: #c9a55a;">Own the magic</a> — fractional cabana ownership starting at $458/mo
    </p>
  </div>

  <p style="line-height: 1.8; font-size: 16px;">
    Use code <strong style="color: #c9a55a;">DIRECT10</strong> for 10% off your first booking at Lina Point.
  </p>

  <div style="text-align: center; margin-top: 40px;">
    <a href="https://linapoint.com?utm_source=email&utm_medium=quiz_followup&utm_campaign=${element.toLowerCase()}"
       style="background: linear-gradient(135deg, #c9a55a, #8a6a2a); color: #0a0a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Book Your Transformation →
    </a>
  </div>

  <p style="color: #5a5a6a; font-size: 12px; text-align: center; margin-top: 40px;">
    Overwater.com · Lina Point Resort · The Magic Is You<br>
    A Lina Point Experience
  </p>
</body>
</html>`;
}

function buildBlueprintBookingEmail(): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #0a0a1a; color: #e8e0d0; padding: 40px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #c9a55a; font-size: 28px; margin: 0;">Your Blueprint Awaits in Person</h1>
    <p style="color: #8a7a6a; font-size: 14px;">From cosmic knowledge to embodied experience</p>
  </div>

  <p style="line-height: 1.8; font-size: 16px;">
    You've uncovered your cosmic blueprint — 35+ elements that reveal your soul's purpose.
    Now imagine experiencing that alignment <em>overwater</em>, where the Caribbean meets ancient Maya wisdom.
  </p>

  <div style="background: #1a1a2e; border: 1px solid #c9a55a33; border-radius: 12px; padding: 24px; margin: 30px 0;">
    <h2 style="color: #c9a55a; font-size: 18px; margin-top: 0;">Why Lina Point?</h2>
    <ul style="line-height: 1.8; padding-left: 20px;">
      <li>Overwater cabanas aligned with elemental energy</li>
      <li>Personalized experiences based on <em>your</em> blueprint</li>
      <li>Maya ceremonial spaces for soul-contract activation</li>
      <li>6% below OTA prices — always</li>
    </ul>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <a href="https://linapoint.com?utm_source=email&utm_medium=blueprint_followup&utm_campaign=booking"
       style="background: linear-gradient(135deg, #c9a55a, #8a6a2a); color: #0a0a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Book at Lina Point — Use Code DIRECT10 →
    </a>
  </div>

  <p style="text-align: center; margin-top: 20px;">
    <a href="https://overwater.com/own?utm_source=email&utm_medium=blueprint_followup&utm_campaign=ownership"
       style="color: #c9a55a; font-size: 14px;">
      Or explore fractional ownership →
    </a>
  </p>

  <p style="color: #5a5a6a; font-size: 12px; text-align: center; margin-top: 40px;">
    Overwater.com · Lina Point Resort · The Magic Is You<br>
    A Lina Point Experience
  </p>
</body>
</html>`;
}
