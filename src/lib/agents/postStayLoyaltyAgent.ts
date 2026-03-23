/**
 * Post-Stay Loyalty Agent
 *
 * Handles everything after checkout:
 * - Thank-you email/WhatsApp with review request
 * - Referral code generation and delivery
 * - Loyalty points accrual
 * - Re-booking incentive for loyalty tier upgrades
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { randomBytes } from "crypto";
import { writeGuestMemory } from "@/lib/agents/guestIntelligenceAgent";

// ── Review Request ──────────────────────────────────────────

const REVIEW_URLS: Record<string, string> = {
  google: "https://g.page/r/linapoint-resort/review",
  tripadvisor:
    "https://www.tripadvisor.com/UserReviewEdit-g291960-d28429543-Lina_Point-San_Pedro_Ambergris_Caye_Belize_Cayes_Belize.html",
  facebook: "https://www.facebook.com/linapoint/reviews",
};

export async function sendReviewRequest(
  supabase: SupabaseClient,
  opts: {
    guestId: string;
    reservationId: string;
    guestName: string;
    phone: string | null;
    email: string | null;
    platform?: string;
  },
): Promise<{ sent: boolean; platform: string }> {
  const platform = opts.platform || "google";
  const reviewUrl = REVIEW_URLS[platform] || REVIEW_URLS.google;
  const firstName = opts.guestName?.split(" ")[0] || "there";

  // Check if already sent for this reservation
  const { data: existing } = await supabase
    .from("review_requests")
    .select("id")
    .eq("reservation_id", opts.reservationId)
    .maybeSingle();

  if (existing) return { sent: false, platform };

  const sentVia = opts.phone ? "whatsapp" : opts.email ? "email" : "both";

  // Send via WhatsApp
  if (opts.phone) {
    const message =
      `Hi ${firstName}! 🌊 Thank you for choosing Lina Point Resort — we hope you had an incredible stay!\n\n` +
      `Would you mind sharing your experience? A quick review helps other travelers discover our little paradise:\n\n` +
      `⭐ ${reviewUrl}\n\n` +
      `As a thank you, you'll earn 100 loyalty points toward your next stay! 🎁`;

    await sendWhatsAppMessage(opts.phone, message);
  }

  // Record the request
  await supabase.from("review_requests").insert({
    reservation_id: opts.reservationId,
    guest_id: opts.guestId,
    platform,
    sent_via: sentVia,
    review_url: reviewUrl,
  });

  return { sent: true, platform };
}

// ── Referral Code Generation ────────────────────────────────

function generateReferralCode(guestName: string): string {
  const prefix = (guestName || "LP")
    .split(" ")[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const suffix = randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
  return `${prefix}-${suffix}`;
}

export async function ensureReferralCode(
  supabase: SupabaseClient,
  userId: string,
  guestName: string,
): Promise<string> {
  // Check if they already have one
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.referral_code) return profile.referral_code;

  // Generate unique code
  let code = generateReferralCode(guestName);
  let attempts = 0;
  while (attempts < 5) {
    const { data: clash } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (!clash) break;
    code = generateReferralCode(guestName);
    attempts++;
  }

  // Save to profile
  await supabase
    .from("profiles")
    .update({ referral_code: code })
    .eq("user_id", userId);

  return code;
}

export async function sendReferralOffer(
  supabase: SupabaseClient,
  opts: {
    guestId: string;
    guestName: string;
    phone: string | null;
    referralCode: string;
  },
): Promise<void> {
  if (!opts.phone) return;

  const firstName = opts.guestName?.split(" ")[0] || "there";
  const message =
    `${firstName}, share the love! 💙\n\n` +
    `Give your friends $25 off their first Lina Point stay with your personal code:\n\n` +
    `🎟️ *${opts.referralCode}*\n\n` +
    `You'll earn *$50 credit* for every friend who books! No limit.\n\n` +
    `Share link: https://linapoint.com/booking?ref=${encodeURIComponent(opts.referralCode)}`;

  await sendWhatsAppMessage(opts.phone, message);

  // Record referral entry
  await supabase.from("referrals").insert({
    referrer_id: opts.guestId,
    referral_code: opts.referralCode,
    status: "pending",
  });
}

// ── Loyalty Points Accrual ──────────────────────────────────

const POINTS_PER_DOLLAR = 10; // 10 points per $1 spent

export async function accrueStayPoints(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    reservationId: string;
    totalAmount: number;
  },
): Promise<{ pointsEarned: number; newTotal: number; newTier: string }> {
  const pointsEarned = Math.round(opts.totalAmount * POINTS_PER_DOLLAR);

  // Get current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("loyalty_points, total_stays, total_spend")
    .eq("user_id", opts.userId)
    .maybeSingle();

  const currentPoints = profile?.loyalty_points || 0;
  const currentStays = profile?.total_stays || 0;
  const currentSpend = Number(profile?.total_spend) || 0;

  const newTotal = currentPoints + pointsEarned;
  const newStays = currentStays + 1;
  const newSpend = currentSpend + opts.totalAmount;

  // Calculate tier from stays
  const newTier =
    newStays >= 6
      ? "vip"
      : newStays >= 3
        ? "loyal"
        : newStays >= 1
          ? "returning"
          : "new";

  await supabase
    .from("profiles")
    .update({
      loyalty_points: newTotal,
      total_stays: newStays,
      total_spend: newSpend,
      last_stay_at: new Date().toISOString().split("T")[0],
      loyalty_tier: newTier,
    })
    .eq("user_id", opts.userId);

  // Award tier upgrade reward if applicable
  if (
    newTier !== "new" &&
    newTier !==
      (currentStays >= 6
        ? "vip"
        : currentStays >= 3
          ? "loyal"
          : currentStays >= 1
            ? "returning"
            : "new")
  ) {
    const rewardMap: Record<string, { value: number; desc: string }> = {
      returning: {
        value: 25,
        desc: "Welcome back! $25 credit for your next stay",
      },
      loyal: {
        value: 50,
        desc: "Loyal guest reward: $50 credit + priority upgrades",
      },
      vip: {
        value: 100,
        desc: "VIP tier achieved! $100 credit + complimentary upgrades",
      },
    };
    const reward = rewardMap[newTier];
    if (reward) {
      await supabase.from("loyalty_rewards").insert({
        user_id: opts.userId,
        reward_type: "stay_credit",
        value: reward.value,
        description: reward.desc,
        expires_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }
  }

  return { pointsEarned, newTotal, newTier };
}

// ── Full Post-Stay Flow ─────────────────────────────────────

export async function runPostStayFlow(
  supabase: SupabaseClient,
  opts: {
    guestId: string;
    reservationId: string;
    guestName: string;
    phone: string | null;
    email: string | null;
    totalAmount: number;
  },
) {
  const results = {
    pointsAccrued: 0,
    reviewSent: false,
    referralCode: "",
    newTier: "",
  };

  // 1. Accrue loyalty points
  const points = await accrueStayPoints(supabase, {
    userId: opts.guestId,
    reservationId: opts.reservationId,
    totalAmount: opts.totalAmount,
  });
  results.pointsAccrued = points.pointsEarned;
  results.newTier = points.newTier;

  // 2. Send thank-you + review request (delay simulated — in production use a queue)
  const review = await sendReviewRequest(supabase, {
    guestId: opts.guestId,
    reservationId: opts.reservationId,
    guestName: opts.guestName,
    phone: opts.phone,
    email: opts.email,
  });
  results.reviewSent = review.sent;

  // 3. Generate referral code and send offer
  const referralCode = await ensureReferralCode(
    supabase,
    opts.guestId,
    opts.guestName,
  );
  results.referralCode = referralCode;

  if (opts.phone) {
    await sendReferralOffer(supabase, {
      guestId: opts.guestId,
      guestName: opts.guestName,
      phone: opts.phone,
      referralCode,
    });
  }

  // 4. Send loyalty points summary
  if (opts.phone) {
    const tierEmoji: Record<string, string> = {
      new: "🌱",
      returning: "🌿",
      loyal: "🌴",
      vip: "👑",
    };
    const msg =
      `🎉 You earned *${points.pointsEarned} points* from your stay!\n\n` +
      `${tierEmoji[points.newTier] || "⭐"} Tier: *${points.newTier.toUpperCase()}*\n` +
      `💰 Total points: *${points.newTotal}*\n\n` +
      `Points unlock exclusive perks — room upgrades, tour discounts, and more. ` +
      `We can't wait to welcome you back!`;

    await sendWhatsAppMessage(opts.phone, msg);
  }

  return results;
}

// ── Post-Stay Memory Capture ────────────────────────────────────────────────

const MEMORY_QUESTIONS = [
  "What was your favourite part of your stay? 🌟",
  "Any activities or food you'd love next time?",
  "One word to describe your Lina Point experience:",
];

/**
 * Send 3 micro-questions to a guest after checkout.
 * Their replies are parsed by processPostStayReply() and saved to guest_memory.
 *
 * Marks reservation.post_stay_memory_sent = true so we only send once.
 */
export async function runPostStayMemoryCapture(
  supabase: SupabaseClient,
): Promise<{ sent: number; errors: number }> {
  const stats = { sent: 0, errors: 0 };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Find guests who checked out yesterday and haven't had memory capture sent
  const { data: checkouts } = await supabase
    .from("reservations")
    .select("id, guest_id, status")
    .eq("check_out_date", yesterdayStr)
    .eq("status", "confirmed")
    .eq("post_stay_memory_sent", false);

  if (!checkouts?.length) return stats;

  for (const res of checkouts) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, full_name")
        .eq("user_id", res.guest_id)
        .maybeSingle();

      const phone = profile?.phone_number;
      if (!phone) continue;

      const firstName = profile?.full_name?.split(" ")[0] || "there";

      // Send all 3 questions in one WhatsApp message
      const questionsText =
        `Hey ${firstName}, hope you settled in well after your Lina Point stay! 🌊\n\n` +
        `Quick 3-question check-in (just reply below):\n\n` +
        MEMORY_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n") +
        `\n\nThank you for helping us make every stay magical! 💙`;

      await sendWhatsAppMessage(phone, questionsText);

      // Mark sent
      await supabase
        .from("reservations")
        .update({ post_stay_memory_sent: true })
        .eq("id", res.id);

      stats.sent++;
    } catch (err) {
      console.error(`[PostStayMemory] Error for reservation ${res.id}:`, err);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Parse a guest's post-stay survey reply and write memories.
 * Called from the WhatsApp webhook when we detect a numbered reply to the survey.
 *
 * Expects message format like:
 *   "1. The overwater view was incredible
 *    2. More snorkeling tours
 *    3. Magical"
 */
export async function processPostStayReply(
  supabase: SupabaseClient,
  guestId: string,
  reservationId: string | null,
  message: string,
): Promise<void> {
  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const memoryMap: Array<{
    type: "experience" | "preference" | "feedback";
    content: string;
  }> = [];

  for (const line of lines) {
    const m = line.match(/^[1-3]\.?\s*(.+)/);
    if (!m) continue;
    const idx = parseInt(line[0]) - 1;
    const answer = m[1].trim();

    if (idx === 0) {
      memoryMap.push({
        type: "experience",
        content: `Favourite part of stay: ${answer}`,
      });
    } else if (idx === 1) {
      memoryMap.push({
        type: "preference",
        content: `Would like next time: ${answer}`,
      });
    } else if (idx === 2) {
      memoryMap.push({
        type: "feedback",
        content: `One-word description: ${answer}`,
      });
    }
  }

  // If no structured parse, store the whole thing as a feedback memory
  if (!memoryMap.length && message.length > 5 && message.length < 500) {
    memoryMap.push({
      type: "feedback",
      content: `Post-stay feedback: ${message.slice(0, 300)}`,
    });
  }

  for (const mem of memoryMap) {
    await writeGuestMemory(supabase, guestId, {
      memory_type: mem.type,
      content: mem.content,
      source: "post_stay_survey",
      confidence: 0.9,
      reservation_id: reservationId,
    });
  }
}
