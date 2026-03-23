/**
 * Welcome Agent
 *
 * Generates personalized pre-arrival welcome messages for guests
 * checking in within the next 24-48 hours.
 *
 * Uses guest profile + memory + Grok to craft:
 * - A personalized welcome WhatsApp message
 * - Key arrival tips (check-in time, transport, special preparations)
 * - A teaser for their personalized experience
 *
 * Marks reservation.welcome_prepared = true once sent.
 */

import { grokLLM } from "@/lib/grokIntegration";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import type { SupabaseClient } from "@supabase/supabase-js";

const WELCOME_PROMPT = `You are Maya, the AI concierge at Lina Point Resort — a stunning overwater resort in San Pedro, Ambergris Caye, Belize.

You are sending a personalized pre-arrival welcome message on WhatsApp the evening before a guest arrives.

RESORT ARRIVAL INFO:
- Check-in: 3 PM (early check-in from 11 AM subject to availability — mention this)
- Location: Over the Caribbean Sea in San Pedro, Belize
- Transport from Belize City: Water taxi ~90 min, or Tropic Air local flight ~15 min
- Pro tip: Download WhatsApp for easy communication with the resort
- Reef Restaurant opens for dinner 6 PM

RULES:
- 3-4 sentences max. Warm, personal, excited — not generic hotel copy.
- Reference guest name.
- If they have special occasions (birthday, anniversary), acknowledge it warmly.
- If they have interests, briefly hint at what's waiting for them.
- End with ONE practical tip (transport, packing for Belize, etc.)
- Use 1-2 emojis. No walls of text.
- If returning guest, say "Welcome back!" and reference previous stay.`;

/**
 * Find reservations arriving in the next 24-48 hours that haven't had welcome messages sent.
 */
export async function findGuestsNeedingWelcome(
  supabase: SupabaseClient,
): Promise<
  Array<{
    reservationId: string;
    guestId: string;
    guestName: string | null;
    phone: string | null;
    checkIn: string;
    checkOut: string;
    roomType: string;
    interests: string[];
    memories: string[];
    stayCount: number;
    specialOccasions: Array<{ type: string; date: string }>;
    birthday: string | null;
    anniversary: string | null;
  }>
> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const dayAfterStr = dayAfter.toISOString().split("T")[0];

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, guest_id, check_in_date, check_out_date, room_type, status, welcome_prepared",
    )
    .gte("check_in_date", tomorrowStr)
    .lte("check_in_date", dayAfterStr)
    .eq("status", "confirmed")
    .eq("welcome_prepared", false);

  if (!reservations?.length) return [];

  const results = [];

  for (const res of reservations) {
    try {
      const [
        { data: profile },
        { data: guestIntel },
        { data: memories },
        { count: stayCount },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, phone_number, maya_interests, birthday, anniversary, special_events",
          )
          .eq("user_id", res.guest_id)
          .maybeSingle(),
        supabase
          .from("guest_intelligence")
          .select("interest_tags")
          .eq("guest_id", res.guest_id)
          .maybeSingle(),
        supabase
          .from("guest_memory")
          .select("content")
          .eq("guest_id", res.guest_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("guest_id", res.guest_id)
          .eq("status", "confirmed"),
      ]);

      const phone = profile?.phone_number || null;
      if (!phone) continue; // Can't send WhatsApp without phone

      results.push({
        reservationId: res.id,
        guestId: res.guest_id,
        guestName: profile?.full_name || null,
        phone,
        checkIn: res.check_in_date,
        checkOut: res.check_out_date,
        roomType: res.room_type,
        interests: [
          ...(guestIntel?.interest_tags || []),
          ...(profile?.maya_interests || []),
        ],
        memories: (memories || []).map((m) => m.content),
        stayCount: (stayCount || 0) as number,
        specialOccasions:
          (profile?.special_events as Array<{ type: string; date: string }>) ||
          [],
        birthday: profile?.birthday || null,
        anniversary: profile?.anniversary || null,
      });
    } catch (err) {
      console.error(
        `[WelcomeAgent] Error loading guest for reservation ${res.id}:`,
        err,
      );
    }
  }

  return results;
}

/**
 * Generate personalized welcome message using Grok.
 */
async function generateWelcomeMessage(opts: {
  guestName: string | null;
  roomType: string;
  checkIn: string;
  checkOut: string;
  interests: string[];
  memories: string[];
  stayCount: number;
  birthday: string | null;
  anniversary: string | null;
  specialOccasions: Array<{ type: string; date: string }>;
}): Promise<string> {
  const firstName = opts.guestName?.split(" ")[0] || "there";
  const isReturning = opts.stayCount > 1;

  const checkInFmt = new Date(opts.checkIn + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    },
  );

  const nights = Math.round(
    (new Date(opts.checkOut + "T00:00:00").getTime() -
      new Date(opts.checkIn + "T00:00:00").getTime()) /
      86400000,
  );

  // Detect upcoming occasions during stay
  const upcomingOccasions: string[] = [];
  const stayDates: string[] = [];
  const start = new Date(opts.checkIn + "T00:00:00");
  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    stayDates.push(
      `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`,
    );
  }
  if (opts.birthday) {
    const bdMD = opts.birthday.slice(5); // MM-DD
    if (stayDates.includes(bdMD))
      upcomingOccasions.push("birthday during stay");
  }
  if (opts.anniversary) {
    const annMD = opts.anniversary.slice(5);
    if (stayDates.includes(annMD))
      upcomingOccasions.push("anniversary during stay");
  }
  for (const event of opts.specialOccasions || []) {
    if (stayDates.includes(event.date?.slice(5)))
      upcomingOccasions.push(`${event.type} during stay`);
  }

  const basePrompt = await getActivePrompt(
    "welcome_preparation",
    WELCOME_PROMPT,
  );

  const contextPrompt =
    `Guest: ${firstName} (${isReturning ? `returning guest, stay #${opts.stayCount}` : "first-time guest"})\n` +
    `Room: ${opts.roomType}\n` +
    `Arrival: ${checkInFmt} (${nights} nights)\n` +
    (opts.interests.length
      ? `Interests: ${opts.interests.slice(0, 6).join(", ")}\n`
      : "") +
    (opts.memories.length
      ? `Known context: ${opts.memories.slice(0, 3).join(" | ")}\n`
      : "") +
    (upcomingOccasions.length
      ? `Special: ${upcomingOccasions.join(", ")}\n`
      : "") +
    `\nWrite their personalized WhatsApp welcome message.`;

  const { result } = await runWithRecursion(
    async () =>
      grokLLM.invoke([
        new SystemMessage(basePrompt),
        new HumanMessage(contextPrompt),
      ]),
    async (response) => {
      const text = typeof response.content === "string" ? response.content : "";
      const eval_ = await evaluateTextQuality(
        "A short, warm, personalized pre-arrival welcome message.",
        text,
      );
      return { score: eval_.score, feedback: eval_.feedback, data: response };
    },
    async (response, feedback, iteration) => {
      const text = typeof response.content === "string" ? response.content : "";
      return {
        content: text,
        additional_kwargs: {
          refinementHint: `Iteration ${iteration + 1}: ${feedback}`,
        },
      };
    },
  );

  return typeof result.content === "string"
    ? result.content
    : `Hi ${firstName}! 🌊 We're getting everything ready for your arrival tomorrow at Lina Point. Check-in is from 3 PM — we can't wait to welcome you!`;
}

/**
 * Main cron function: find guests needing welcome messages and send them.
 */
export async function runWelcomePreparation(supabase: SupabaseClient): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const stats = { sent: 0, skipped: 0, errors: 0 };
  const guests = await findGuestsNeedingWelcome(supabase);

  for (const guest of guests) {
    try {
      const message = await generateWelcomeMessage({
        guestName: guest.guestName,
        roomType: guest.roomType,
        checkIn: guest.checkIn,
        checkOut: guest.checkOut,
        interests: guest.interests,
        memories: guest.memories,
        stayCount: guest.stayCount,
        birthday: guest.birthday,
        anniversary: guest.anniversary,
        specialOccasions: guest.specialOccasions,
      });

      await sendWhatsAppMessage(guest.phone!, message);

      // Mark welcome_prepared = true
      await supabase
        .from("reservations")
        .update({ welcome_prepared: true })
        .eq("id", guest.reservationId);

      stats.sent++;
    } catch (err) {
      console.error(`[WelcomeAgent] Error for guest ${guest.guestId}:`, err);
      stats.errors++;
    }
  }

  return stats;
}
