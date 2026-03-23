/**
 * In-Stay Experience Agent
 *
 * Every morning at 7 AM, sends personalized messages to active guests:
 * - Weather/activity suggestions based on day number
 * - Personalized tips from guest memory
 * - Tour upsells based on interests
 * - Dining reminders
 *
 * Tracks touchpoints to avoid duplicate sends.
 */

import { grokLLM } from "@/lib/grokIntegration";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { writeGuestMemory } from "@/lib/agents/guestIntelligenceAgent";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveStayReservation {
  id: string;
  guest_id: string;
  confirmation_number: string;
  room_type: string;
  check_in_date: string;
  check_out_date: string;
  check_in_day: number; // 1-based — 1 = first full day
}

export interface InStayTouchpoint {
  reservationId: string;
  guestId: string;
  dayNumber: number;
  messageSent: string;
  touchpointType: string;
}

const STAY_TIP_PROMPT = `You are Maya, the AI concierge at Lina Point Resort — an overwater resort on the Caribbean Sea in San Pedro, Ambergris Caye, Belize.

You are sending a personalized morning message to a guest who is currently staying at the resort.

RESORT KNOWLEDGE:
- Tours: Hol Chan Marine Reserve snorkeling ($120), Sport Fishing ($280), Mayan Ruins ($165), Cenote Swimming ($110), Mangrove Kayak ($75)
- Dining: Reef Restaurant (breakfast 7-10AM, lunch 12-3PM, dinner 6-10PM), Palapa Bar (cocktails, 11AM-midnight)
- Water activities: Kayaks & paddleboards complimentary, Dive shop on-site
- Check-out: 11 AM

RULES:
- Keep message under 4 sentences. Warm, personal, never generic.
- Mention their stay day number (Day 1, Day 2, etc.)
- If they have interests/tour history, reference them.
- If it's their last day (before checkout), mention check-out time and invite them back.
- If they haven't booked any tours, gently suggest one fitting their interests.
- Use 1-2 emojis max. WhatsApp-friendly — no markdown walls.
- End with ONE specific call-to-action (e.g., "Reply YES for the snorkel boat at 9AM" or "Swing by the Palapa Bar at sunset").`;

/**
 * Find all guests currently checked in (check_in <= today < check_out).
 */
export async function findActiveStays(supabase: SupabaseClient): Promise<
  Array<{
    reservation: ActiveStayReservation;
    guestName: string | null;
    phone: string | null;
    interests: string[];
    memories: string[];
    dayNumber: number;
    totalNights: number;
    isLastDay: boolean;
  }>
> {
  const today = new Date().toISOString().split("T")[0];

  const { data: reservations } = await supabase
    .from("reservations")
    .select(
      "id, guest_id, confirmation_number, room_type, check_in_date, check_out_date, status",
    )
    .lte("check_in_date", today)
    .gt("check_out_date", today)
    .eq("status", "confirmed");

  if (!reservations?.length) return [];

  const results = [];

  for (const res of reservations) {
    try {
      // Load profile + intelligence + memories in parallel
      const [{ data: profile }, { data: guestIntel }, { data: memories }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "full_name, phone_number, maya_interests, dietary_restrictions",
            )
            .eq("user_id", res.guest_id)
            .maybeSingle(),
          supabase
            .from("guest_intelligence")
            .select("interest_tags, previous_tours, activity_level")
            .eq("guest_id", res.guest_id)
            .maybeSingle(),
          supabase
            .from("guest_memory")
            .select("content, memory_type")
            .eq("guest_id", res.guest_id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const phone = profile?.phone_number || null;
      if (!phone) continue; // Can't send WhatsApp without phone

      const checkIn = new Date(res.check_in_date + "T00:00:00");
      const checkOut = new Date(res.check_out_date + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      const dayNumber =
        Math.floor((todayDate.getTime() - checkIn.getTime()) / 86400000) + 1;
      const totalNights = Math.round(
        (checkOut.getTime() - checkIn.getTime()) / 86400000,
      );
      const isLastDay = dayNumber >= totalNights;

      results.push({
        reservation: {
          ...res,
          check_in_day: dayNumber,
        } as ActiveStayReservation,
        guestName: profile?.full_name || null,
        phone,
        interests: [
          ...(guestIntel?.interest_tags || []),
          ...(profile?.maya_interests || []),
        ],
        memories: (memories || []).map((m) => m.content),
        dayNumber,
        totalNights,
        isLastDay,
      });
    } catch (err) {
      console.error(
        `[InStayAgent] Error loading guest data for ${res.id}:`,
        err,
      );
    }
  }

  return results;
}

/**
 * Check if we already sent a touchpoint for this reservation + day.
 */
async function alreadySent(
  supabase: SupabaseClient,
  reservationId: string,
  dayNumber: number,
  touchpointType: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("in_stay_touchpoints")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("day_number", dayNumber)
    .eq("touchpoint_type", touchpointType)
    .maybeSingle();

  return !!data;
}

/**
 * Generate a personalized morning message for an active guest using Grok.
 */
async function generateMorningMessage(opts: {
  guestName: string | null;
  roomType: string;
  dayNumber: number;
  totalNights: number;
  isLastDay: boolean;
  interests: string[];
  memories: string[];
}): Promise<string> {
  const firstName = opts.guestName?.split(" ")[0] || "there";
  const interestStr = opts.interests.length
    ? `Guest interests: ${opts.interests.slice(0, 6).join(", ")}`
    : "";
  const memoryStr = opts.memories.length
    ? `Known about this guest: ${opts.memories.slice(0, 3).join(" | ")}`
    : "";

  const basePrompt = await getActivePrompt("in_stay_morning", STAY_TIP_PROMPT);

  const contextPrompt = `Guest name: ${firstName}
Room: ${opts.roomType}
Day ${opts.dayNumber} of ${opts.totalNights}
${opts.isLastDay ? "⚠️ LAST DAY — mention check-out at 11 AM and invite them to return." : ""}
${interestStr}
${memoryStr}

Write a warm, personal morning WhatsApp message for Day ${opts.dayNumber} of their stay.`;

  const { result } = await runWithRecursion(
    async () =>
      grokLLM.invoke([
        new SystemMessage(basePrompt),
        new HumanMessage(contextPrompt),
      ]),
    async (response) => {
      const text = typeof response.content === "string" ? response.content : "";
      const goal =
        "A short, warm, personalized morning message for an in-stay guest.";
      const eval_ = await evaluateTextQuality(goal, text);
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
    : `Good morning, ${firstName}! 🌊 Hope you're enjoying your stay at Lina Point. What can I arrange for Day ${opts.dayNumber}?`;
}

/**
 * Main cron function: find active stays, send morning messages.
 */
export async function runInStayAgent(supabase: SupabaseClient): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> {
  const stats = { sent: 0, skipped: 0, errors: 0 };
  const touchpointType = "morning_message";

  const activeStays = await findActiveStays(supabase);

  for (const stay of activeStays) {
    try {
      // Skip if already sent today
      if (
        await alreadySent(
          supabase,
          stay.reservation.id,
          stay.dayNumber,
          touchpointType,
        )
      ) {
        stats.skipped++;
        continue;
      }

      const message = await generateMorningMessage({
        guestName: stay.guestName,
        roomType: stay.reservation.room_type,
        dayNumber: stay.dayNumber,
        totalNights: stay.totalNights,
        isLastDay: stay.isLastDay,
        interests: stay.interests,
        memories: stay.memories,
      });

      // Send via WhatsApp
      await sendWhatsAppMessage(stay.phone!, message);

      // Log touchpoint
      await supabase.from("in_stay_touchpoints").insert({
        reservation_id: stay.reservation.id,
        guest_id: stay.reservation.guest_id,
        touchpoint_type: touchpointType,
        message_sent: message,
        day_number: stay.dayNumber,
      });

      // Write memory: note that we sent day N message (agent observation)
      void (async () => {
        try {
          await writeGuestMemory(supabase, stay.reservation.guest_id, {
            memory_type: "observation",
            content: `In-stay Day ${stay.dayNumber} message sent on ${new Date().toISOString().split("T")[0]}`,
            source: "in_stay_agent",
            reservation_id: stay.reservation.id,
          });
        } catch {
          /* non-fatal */
        }
      })();

      stats.sent++;
    } catch (err) {
      console.error(
        `[InStayAgent] Error for reservation ${stay.reservation.id}:`,
        err,
      );
      stats.errors++;
    }
  }

  return stats;
}
