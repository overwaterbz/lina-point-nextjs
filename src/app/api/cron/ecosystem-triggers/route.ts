/**
 * API Route: GET /api/cron/ecosystem-triggers
 * Scheduled every 2 hours via vercel.json
 *
 * Autonomous ecosystem marketing engine:
 * 1. Update lead scores from cross-site events
 * 2. Fire event-driven marketing triggers
 * 3. Process nurture sequence steps
 * 4. Take daily ecosystem snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";
import { updateLeadScores } from "@/lib/agents/leadScoringEngine";
import { runEcosystemTriggers } from "@/lib/agents/ecosystemTriggers";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Lina Point Resort <concierge@linapoint.com>";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const log = (...args: unknown[]) => console.log("[EcosystemTriggers]", ...args);

export async function GET(request: NextRequest) {
  try {
    const denied = verifyCronSecret(request.headers.get("authorization"));
    if (denied) return denied;

    const since = new Date(Date.now() - 2 * 60 * 60 * 1000); // last 2 hours
    log("Running ecosystem triggers since", since.toISOString());

    // 1. Update lead scores
    log("Updating lead scores...");
    const scoreResults = await updateLeadScores(supabase, since);
    log(`Lead scores: ${scoreResults.updated} updated, ${scoreResults.newLeads} new`);

    // 2. Run event-driven triggers
    log("Running marketing triggers...");
    const triggerResults = await runEcosystemTriggers(supabase, since);
    log(`Triggers: ${triggerResults.quizFollowups.length} quiz, ${triggerResults.blueprintCTAs.length} blueprint, ${triggerResults.nurtureEnrollments.length} nurture`);

    // 3. Process nurture sequence steps
    log("Processing nurture sequences...");
    const nurtureResults = await processNurtureSteps();

    // 4. Log summary
    await supabase.from("marketing_agent_logs").insert({
      agent_name: "EcosystemTriggers",
      action: "Cron run",
      status: "completed",
      output_data: {
        leadScores: scoreResults,
        triggers: {
          quiz: triggerResults.quizFollowups.length,
          blueprint: triggerResults.blueprintCTAs.length,
          nurture: triggerResults.nurtureEnrollments.length,
        },
        nurtureSteps: nurtureResults,
        snapshot: triggerResults.snapshotTaken,
      },
    });

    return NextResponse.json({
      success: true,
      leadScores: scoreResults,
      triggers: {
        quizFollowups: triggerResults.quizFollowups.length,
        blueprintCTAs: triggerResults.blueprintCTAs.length,
        nurtureEnrollments: triggerResults.nurtureEnrollments.length,
      },
      nurtureSteps: nurtureResults,
      snapshotTaken: true,
    });
  } catch (error) {
    console.error("Ecosystem triggers cron error:", error);
    return NextResponse.json(
      { error: "Ecosystem triggers failed", details: String(error) },
      { status: 500 }
    );
  }
}

// ── Nurture Sequence Processor ────────────────────────────

interface NurtureStep {
  sequenceName: string;
  step: number;
  subject: string;
  html: string;
}

const NURTURE_SEQUENCES: Record<string, NurtureStep[]> = {
  quiz_to_blueprint: [
    {
      sequenceName: "quiz_to_blueprint",
      step: 1,
      subject: "Your Element Journey Continues — Unlock Your Full Cosmic Blueprint",
      html: buildNurtureEmail(
        "Your Element is Just the Beginning",
        "The Overwater quiz revealed your guiding element. But there are 35+ cosmic forces shaping your path — your Maya day-sign, your soul contract, your life cycles. Your full Cosmic Blueprint maps them all.",
        "Discover Your Blueprint",
        "https://magic-is-you.vercel.app?utm_source=email&utm_medium=nurture&utm_campaign=quiz_to_blueprint&utm_content=step1"
      ),
    },
    {
      sequenceName: "quiz_to_blueprint",
      step: 2,
      subject: "What Your Soul Contract Reveals About Your Next Chapter",
      html: buildNurtureEmail(
        "The Soul Contract You Signed Before Birth",
        "Ancient Maya wisdom teaches that we each arrive with a sacred contract — agreements made before this lifetime about what we'll learn, create, and transform. Your Cosmic Blueprint reveals yours.",
        "Read Your Soul Contract",
        "https://magic-is-you.vercel.app/pricing?utm_source=email&utm_medium=nurture&utm_campaign=quiz_to_blueprint&utm_content=step2"
      ),
    },
    {
      sequenceName: "quiz_to_blueprint",
      step: 3,
      subject: "Experience Your Element Overwater — Special Offer Inside",
      html: buildNurtureEmail(
        "From Digital Discovery to Embodied Magic",
        "You know your element. You've glimpsed your cosmic blueprint. Now imagine living inside that alignment — overwater, where Caribbean tides meet ancient wisdom. Lina Point was built for this moment.",
        "Book at Lina Point — Code DIRECT10",
        "https://linapoint.com?utm_source=email&utm_medium=nurture&utm_campaign=quiz_to_blueprint&utm_content=step3"
      ),
    },
  ],
  blueprint_to_booking: [
    {
      sequenceName: "blueprint_to_booking",
      step: 1,
      subject: "Your Blueprint in 3D — Lina Point Experiences Matched to You",
      html: buildNurtureEmail(
        "Your Blueprint, Brought to Life",
        "Every element in your Cosmic Blueprint has a corresponding experience at Lina Point Resort. Water signs? Kayak meditation at dawn. Fire signs? Sunset ceremony on the pier. Your stay is designed around your cosmic alignment.",
        "See Your Personalized Itinerary",
        "https://linapoint.com?utm_source=email&utm_medium=nurture&utm_campaign=blueprint_to_booking&utm_content=step1"
      ),
    },
    {
      sequenceName: "blueprint_to_booking",
      step: 2,
      subject: "Why 87% of Our Guests Return — The Lina Point Difference",
      html: buildNurtureEmail(
        "More Than a Vacation",
        "Lina Point isn't just a resort — it's a transformation container. Overwater cabanas, Maya ceremonial spaces, personalized cosmic experiences. And always 6% below OTA prices when you book direct.",
        "Explore Lina Point",
        "https://linapoint.com?utm_source=email&utm_medium=nurture&utm_campaign=blueprint_to_booking&utm_content=step2"
      ),
    },
    {
      sequenceName: "blueprint_to_booking",
      step: 3,
      subject: "Your Cosmic Blueprint + Overwater Living = This",
      html: buildNurtureEmail(
        "Own the Magic",
        "What if you didn't just visit — what if you owned a piece of the magic? Fractional cabana ownership at Overwater.com starts at $458/month. Your cosmic home on the water is waiting.",
        "Learn About Ownership",
        "https://overwater.com/own?utm_source=email&utm_medium=nurture&utm_campaign=blueprint_to_booking&utm_content=step3"
      ),
    },
    {
      sequenceName: "blueprint_to_booking",
      step: 4,
      subject: "Last Chance: Your Personalized Offer Expires Tomorrow",
      html: buildNurtureEmail(
        "The Universe Doesn't Wait Forever",
        "Your cosmic window is open. Book in the next 24 hours with code DIRECT10 for 10% off your first stay — plus a complimentary Maya blessing ceremony on arrival.",
        "Book Now — DIRECT10",
        "https://linapoint.com?utm_source=email&utm_medium=nurture&utm_campaign=blueprint_to_booking&utm_content=step4"
      ),
    },
  ],
  ownership_interest: [
    {
      sequenceName: "ownership_interest",
      step: 1,
      subject: "Fractional Paradise: How Overwater Ownership Works",
      html: buildNurtureEmail(
        "Own the Magic — Starting at $458/mo",
        "Fractional ownership means you get a piece of overwater paradise without the full price tag. Guaranteed weeks, rental income when you're not there, and a community of like-minded seekers.",
        "See Ownership Options",
        "https://overwater.com/own?utm_source=email&utm_medium=nurture&utm_campaign=ownership&utm_content=step1"
      ),
    },
    {
      sequenceName: "ownership_interest",
      step: 2,
      subject: "Meet the Owners: Stories from the Overwater Community",
      html: buildNurtureEmail(
        "They Took the Leap",
        "Sarah discovered her Water element, booked a stay, and knew she had to own a piece. Now she splits her year between Montana and her overwater cabana, hosting transformative retreats. Her story could be yours.",
        "Read Owner Stories",
        "https://overwater.com/own?utm_source=email&utm_medium=nurture&utm_campaign=ownership&utm_content=step2"
      ),
    },
    {
      sequenceName: "ownership_interest",
      step: 3,
      subject: "Your Ownership Consultation — Book a Free Call",
      html: buildNurtureEmail(
        "Let's Talk About Your Vision",
        "Whether you want a personal retreat, a rental income property, or a place to host your community — we'll map out the ownership path that aligns with your goals. Book a free 15-minute consultation.",
        "Schedule Your Call",
        "https://overwater.com/own?utm_source=email&utm_medium=nurture&utm_campaign=ownership&utm_content=step3"
      ),
    },
  ],
  ecosystem_welcome: [
    {
      sequenceName: "ecosystem_welcome",
      step: 1,
      subject: "Welcome to the Lina Point Universe — 3 Paths to Magic",
      html: buildNurtureEmail(
        "Three Doorways, One Destination",
        "You've discovered something special. Our ecosystem has three paths: <strong>Overwater.com</strong> for fractional ownership, <strong>Lina Point Resort</strong> for transformative stays, and <strong>The Magic Is You</strong> for cosmic self-discovery. Each leads to the same truth: the magic is you.",
        "Explore the Ecosystem",
        "https://overwater.com?utm_source=email&utm_medium=nurture&utm_campaign=welcome&utm_content=step1"
      ),
    },
    {
      sequenceName: "ecosystem_welcome",
      step: 2,
      subject: "Which Element Are You? Take the 2-Minute Quiz",
      html: buildNurtureEmail(
        "Discover Your Element",
        "Water, Fire, Earth, Air, or Spirit? Your guiding element shapes how you travel, create, and transform. Take the 2-minute Overwater quiz to find yours — and unlock personalized recommendations across our entire ecosystem.",
        "Take the Quiz",
        "https://overwater.com/quiz?utm_source=email&utm_medium=nurture&utm_campaign=welcome&utm_content=step2"
      ),
    },
    {
      sequenceName: "ecosystem_welcome",
      step: 3,
      subject: "Your Cosmic Blueprint + 10% Off Your First Stay",
      html: buildNurtureEmail(
        "The Full Journey Awaits",
        "Discover your cosmic blueprint at The Magic Is You, then experience it overwater at Lina Point. Use code DIRECT10 for 10% off your first booking — and always save 6% vs OTA prices.",
        "Start Your Journey",
        "https://magic-is-you.vercel.app?utm_source=email&utm_medium=nurture&utm_campaign=welcome&utm_content=step3"
      ),
    },
  ],
};

async function processNurtureSteps(): Promise<{ sent: number; completed: number }> {
  let sent = 0;
  let completed = 0;

  const now = new Date();
  const { data: dueSequences } = await supabase
    .from("nurture_sequences")
    .select("*")
    .eq("status", "active")
    .lte("next_send_at", now.toISOString())
    .limit(50);

  if (!dueSequences?.length) return { sent: 0, completed: 0 };

  for (const seq of dueSequences) {
    const steps = NURTURE_SEQUENCES[seq.sequence_name];
    if (!steps) continue;

    const nextStep = seq.current_step;
    if (nextStep >= steps.length) {
      await supabase
        .from("nurture_sequences")
        .update({ status: "completed" })
        .eq("id", seq.id);
      completed++;
      continue;
    }

    const step = steps[nextStep];

    // Get email for this lead
    let email = seq.email;
    if (!email && seq.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(seq.user_id);
      email = user?.user?.email ?? undefined;
    }
    if (!email) {
      // Try lead_scores
      const { data: lead } = await supabase
        .from("lead_scores")
        .select("email")
        .eq("session_id", seq.session_id)
        .single();
      email = lead?.email;
    }

    if (!email || !RESEND_API_KEY) {
      // Can't send — skip this step but don't kill the sequence
      continue;
    }

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
          subject: step.subject,
          html: step.html,
        }),
      });

      // Schedule next step (2 days later)
      const nextSend = new Date();
      nextSend.setUTCDate(nextSend.getUTCDate() + 2);
      nextSend.setUTCHours(10, 0, 0, 0);

      await supabase
        .from("nurture_sequences")
        .update({
          current_step: nextStep + 1,
          last_sent_at: now.toISOString(),
          next_send_at:
            nextStep + 1 >= steps.length ? null : nextSend.toISOString(),
          ...(nextStep + 1 >= steps.length ? { status: "completed" } : {}),
        })
        .eq("id", seq.id);

      await supabase.from("marketing_triggers").insert({
        trigger_type: "nurture_step",
        session_id: seq.session_id,
        user_id: seq.user_id,
        source_event: `nurture_${seq.sequence_name}_step${nextStep + 1}`,
        action_taken: `Sent step ${nextStep + 1}/${steps.length} of ${seq.sequence_name}`,
        action_details: { email, subject: step.subject },
        status: "sent",
        executed_at: now.toISOString(),
      });

      sent++;
      if (nextStep + 1 >= steps.length) completed++;
    } catch {
      log(`Failed to send nurture step for ${seq.session_id}`);
    }
  }

  return { sent, completed };
}

// ── Nurture Email Template ────────────────────────────────

function buildNurtureEmail(
  headline: string,
  body: string,
  ctaText: string,
  ctaUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Georgia', serif; background: #0a0a1a; color: #e8e0d0; padding: 40px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #c9a55a; font-size: 24px; text-align: center;">${headline}</h1>
  <p style="line-height: 1.8; font-size: 16px; margin: 24px 0;">${body}</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${ctaUrl}"
       style="background: linear-gradient(135deg, #c9a55a, #8a6a2a); color: #0a0a1a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      ${ctaText} →
    </a>
  </div>
  <p style="color: #5a5a6a; font-size: 12px; text-align: center; margin-top: 40px;">
    Overwater.com · Lina Point Resort · The Magic Is You<br>
    A Lina Point Experience
  </p>
</body>
</html>`;
}
