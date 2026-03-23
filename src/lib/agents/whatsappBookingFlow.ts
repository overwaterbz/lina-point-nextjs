/**
 * WhatsApp Booking Flow — 6-step state machine
 *
 * Steps:
 *  1 INQUIRY         → gather intent, ask for dates
 *  2 DATES           → parse check-in/out, show available rooms + dynamic prices
 *  3 ROOM_SELECTION  → guest picks room type
 *  4 EXPERIENCES     → offer top 3 tours; allow skip
 *  5 REVIEW          → full summary, ask "Reply YES to confirm"
 *  6 PAYMENT_LINK    → create pending reservation, send checkout URL
 *  7 CONFIRMED       → booking confirmed (set by Stripe webhook)
 *
 * State persists in whatsapp_sessions.context.booking_flow (JSONB).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAvailability } from "@/lib/inventory";
import { calculateDynamicPrice } from "@/lib/dynamicPricing";
import type { RoomType } from "@/lib/inventory";

// ── Types ──────────────────────────────────────────────────────────────────

export type BookingFlowStepName =
  | "INQUIRY"
  | "DATES"
  | "ROOM_SELECTION"
  | "EXPERIENCES"
  | "REVIEW"
  | "PAYMENT_LINK"
  | "CONFIRMED";

export interface BookingFlowData {
  checkInDate?: string;
  checkOutDate?: string;
  roomType?: string;
  roomId?: string | null;
  guestName?: string;
  groupSize?: number;
  selectedTours?: string[];
  totalRoomCost?: number;
  totalTourCost?: number;
  totalAmount?: number;
  paymentLinkUrl?: string | null;
  reservationId?: string | null;
  confirmationNumber?: string;
  loyaltyTier?: string | null;
}

export interface BookingFlowState {
  step: BookingFlowStepName;
  data: BookingFlowData;
  lastPromptAt?: string;
}

export interface BookingFlowResult {
  reply: string;
  nextState: BookingFlowState;
  done: boolean; // true when CONFIRMED or cancelled
}

// Room type display labels + emojis for WhatsApp messages
const ROOM_LABELS: Record<string, { emoji: string; label: string }> = {
  "2nd_floor_suite": { emoji: "🏨", label: "2nd Floor Hotel Suite" },
  "1st_floor_suite": { emoji: "🏨", label: "1st Floor Hotel Suite" },
  "1bed_duplex_cabana": { emoji: "🌴", label: "1 Bed Duplex Cabana" },
  "1bed_overwater_cabana": { emoji: "🌊", label: "1 Bed Overwater Cabana" },
  "2bed_overwater_cabana": { emoji: "🌊", label: "2 Bed Overwater Cabana" },
};

// Curated tour menu shown in EXPERIENCES step
const FEATURED_TOURS = [
  { name: "Hol Chan Marine Reserve Snorkel", price: 120, emoji: "🤿" },
  { name: "Sport Fishing Trip (half day)", price: 280, emoji: "🎣" },
  { name: "Mayan Ruins Day Trip", price: 165, emoji: "🏛️" },
  { name: "Cenote Swimming Adventure", price: 110, emoji: "💧" },
  { name: "Mangrove Kayak & Wildlife", price: 75, emoji: "🚣" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function parseMessageDates(message: string): {
  checkInDate?: string;
  checkOutDate?: string;
} {
  const result: { checkInDate?: string; checkOutDate?: string } = {};

  // ISO dates 2026-03-10
  const isoDates = message.match(/\d{4}-\d{2}-\d{2}/g) || [];
  if (isoDates[0]) result.checkInDate = isoDates[0];
  if (isoDates[1]) result.checkOutDate = isoDates[1];

  // Range: "to" / "through" / "-"
  const rangeMatch = message.match(
    /(\d{4}-\d{2}-\d{2})\s+(?:to|through|thru|–|-)\s+(\d{4}-\d{2}-\d{2})/i,
  );
  if (rangeMatch) {
    result.checkInDate = rangeMatch[1];
    result.checkOutDate = rangeMatch[2];
  }

  // US dates: 3/10, 03/15/2026
  const usDatePattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
  const usMatches = [...message.matchAll(usDatePattern)];
  if (usMatches.length >= 1 && !result.checkInDate) {
    const m = usMatches[0];
    const year = m[3]
      ? m[3].length === 2
        ? `20${m[3]}`
        : m[3]
      : new Date().getFullYear().toString();
    result.checkInDate = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  if (usMatches.length >= 2 && !result.checkOutDate) {
    const m = usMatches[1];
    const year = m[3]
      ? m[3].length === 2
        ? `20${m[3]}`
        : m[3]
      : new Date().getFullYear().toString();
    result.checkOutDate = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }

  // "X nights" from check-in
  const nightsMatch = message.match(/(\d+)\s*nights?/i);
  if (nightsMatch && result.checkInDate && !result.checkOutDate) {
    const ciDate = new Date(result.checkInDate + "T00:00:00");
    ciDate.setDate(ciDate.getDate() + parseInt(nightsMatch[1]));
    result.checkOutDate = ciDate.toISOString().slice(0, 10);
  }

  return result;
}

function parseRoomChoice(
  message: string,
  availableTypes: string[],
): string | null {
  const lower = message.toLowerCase();

  // Numeric choice (1, 2, 3 …)
  const numMatch = lower.match(/\b([1-5])\b/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    if (idx >= 0 && idx < availableTypes.length) return availableTypes[idx];
  }

  // Keyword match
  if (
    lower.includes("2bed") ||
    lower.includes("2 bed") ||
    lower.includes("two bed")
  )
    return "2bed_overwater_cabana";
  if (
    lower.includes("overwater") ||
    lower.includes("over water") ||
    lower.includes("1 bed over") ||
    lower.includes("1bed over")
  )
    return "1bed_overwater_cabana";
  if (lower.includes("duplex")) return "1bed_duplex_cabana";
  if (
    lower.includes("1st floor") ||
    lower.includes("first floor") ||
    lower.includes("ground")
  )
    return "1st_floor_suite";
  if (
    lower.includes("2nd floor") ||
    lower.includes("second floor") ||
    lower.includes("standard") ||
    lower.includes("suite")
  )
    return "2nd_floor_suite";

  return null;
}

function parseTourChoices(message: string): number[] {
  const lower = message.toLowerCase();
  if (
    lower.includes("skip") ||
    lower.includes("no tour") ||
    lower.includes("none")
  )
    return [];

  const chosen: number[] = [];
  // "all" = select all
  if (lower.includes("all") || lower.includes("everything")) {
    return FEATURED_TOURS.map((_, i) => i);
  }

  // Parse comma/space separated numbers
  const numMatches = lower.match(/\b([1-5])\b/g) || [];
  for (const n of numMatches) {
    const idx = parseInt(n) - 1;
    if (idx >= 0 && idx < FEATURED_TOURS.length && !chosen.includes(idx)) {
      chosen.push(idx);
    }
  }

  // If nothing selected, check if they're just describing a tour
  if (!chosen.length) {
    FEATURED_TOURS.forEach((t, i) => {
      if (lower.includes(t.name.split(" ")[0].toLowerCase())) {
        chosen.push(i);
      }
    });
  }

  return chosen;
}

function isCancellation(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("cancel") ||
    lower.includes("nevermind") ||
    lower.includes("never mind") ||
    lower.includes("forget it") ||
    lower.includes("stop booking")
  );
}

function formatDateFriendly(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Step Handlers ──────────────────────────────────────────────────────────

/**
 * INQUIRY: Guest signalled booking intent. Ask for dates.
 */
function handleInquiry(
  message: string,
  state: BookingFlowState,
  guestName: string | null,
): BookingFlowResult {
  const first = guestName?.split(" ")[0];
  const greeting = first ? `Hey ${first}! ` : "Hey! ";
  const reply =
    `${greeting}I'd love to book you in! 🏖️\n\n` +
    `When are you thinking? Send dates like:\n` +
    `*2026-05-10 to 2026-05-14* or *May 10 for 4 nights*\n\n` +
    `(Minimum 2 nights, check-in 3 PM, check-out 11 AM)`;

  return {
    reply,
    nextState: {
      ...state,
      step: "DATES",
      lastPromptAt: new Date().toISOString(),
    },
    done: false,
  };
}

/**
 * DATES: Parse dates + show available rooms with dynamic prices.
 */
async function handleDates(
  supabase: SupabaseClient,
  message: string,
  state: BookingFlowState,
  guestName: string | null,
  loyaltyTier: string | null,
): Promise<BookingFlowResult> {
  const { checkInDate, checkOutDate } = parseMessageDates(message);

  const ci = checkInDate || state.data.checkInDate;
  const co = checkOutDate || state.data.checkOutDate;

  if (!ci || !co) {
    const reply =
      `I need both check-in and check-out dates. 📅\n\n` +
      `Example: *2026-05-10 to 2026-05-14* or *May 10 for 4 nights*`;
    return {
      reply,
      nextState: {
        ...state,
        data: { ...state.data, checkInDate: ci, checkOutDate: co },
      },
      done: false,
    };
  }

  // Validate dates
  const now = new Date();
  const ciDate = new Date(ci + "T00:00:00");
  const coDate = new Date(co + "T00:00:00");

  if (ciDate < now) {
    return {
      reply: `Those dates are in the past. 😊 What dates work for you?`,
      nextState: {
        ...state,
        data: {
          ...state.data,
          checkInDate: undefined,
          checkOutDate: undefined,
        },
      },
      done: false,
    };
  }

  if (coDate <= ciDate) {
    return {
      reply: `Check-out must be after check-in. What dates work?`,
      nextState: { ...state, data: { ...state.data, checkInDate: ci } },
      done: false,
    };
  }

  const nights = Math.round((coDate.getTime() - ciDate.getTime()) / 86400000);
  if (nights < 2) {
    return {
      reply: `We require a minimum 2-night stay. Can you extend by one more night?`,
      nextState: { ...state, data: { ...state.data, checkInDate: ci } },
      done: false,
    };
  }

  try {
    const availableRooms = await checkAvailability(supabase, ci, co);
    const available = availableRooms.filter((r) => r.available);

    if (!available.length) {
      return {
        reply:
          `I'm sorry, we're fully booked for ${formatDateFriendly(ci)} to ${formatDateFriendly(co)}. 😔\n\n` +
          `Try shifting by a day or two — we often have gaps! What other dates work?`,
        nextState: {
          ...state,
          data: { ...state.data, checkInDate: ci, checkOutDate: co },
        },
        done: false,
      };
    }

    // Get dynamic prices for available room types
    const priceLines: string[] = [];
    const displayRooms: string[] = [];

    for (let i = 0; i < available.length; i++) {
      const room = available[i];
      try {
        const pricing = await calculateDynamicPrice(
          supabase,
          room.roomType,
          ci,
          co,
          loyaltyTier,
        );
        const info = ROOM_LABELS[room.roomType] || {
          emoji: "🏠",
          label: room.roomType,
        };
        priceLines.push(
          `*${i + 1}. ${info.emoji} ${info.label}*\n` +
            `   $${pricing.finalRate}/night · Total $${pricing.totalForStay}\n` +
            `   ${room.availableRooms} of ${room.totalRooms} available` +
            (pricing.savingsVsBase > 0
              ? ` · Save $${pricing.savingsVsBase} 🤑`
              : ""),
        );
        displayRooms.push(room.roomType);
      } catch {
        const info = ROOM_LABELS[room.roomType] || {
          emoji: "🏠",
          label: room.roomType,
        };
        priceLines.push(
          `*${i + 1}. ${info.emoji} ${info.label}*\n   ${room.availableRooms} rooms available`,
        );
        displayRooms.push(room.roomType);
      }
    }

    const reply =
      `📅 *${formatDateFriendly(ci)} → ${formatDateFriendly(co)}* (${nights} nights)\n\n` +
      `*Available Rooms:*\n\n${priceLines.join("\n\n")}\n\n` +
      `Reply with the number (1, 2, 3…) or room name to pick.`;

    return {
      reply,
      nextState: {
        ...state,
        step: "ROOM_SELECTION",
        data: {
          ...state.data,
          checkInDate: ci,
          checkOutDate: co,
        },
        lastPromptAt: new Date().toISOString(),
      },
      done: false,
      // store available types for parsing in next step — embed in message as machine metadata
    };
  } catch {
    return {
      reply: `I had trouble checking availability. Let me try again in a moment — send your dates once more!`,
      nextState: { ...state },
      done: false,
    };
  }
}

/**
 * ROOM_SELECTION: Guest picked a room. Show experience options.
 */
async function handleRoomSelection(
  supabase: SupabaseClient,
  message: string,
  state: BookingFlowState,
  loyaltyTier: string | null,
): Promise<BookingFlowResult> {
  const ci = state.data.checkInDate!;
  const co = state.data.checkOutDate!;

  const availableRooms = await checkAvailability(supabase, ci, co);
  const availableTypes = availableRooms
    .filter((r) => r.available)
    .map((r) => r.roomType);

  const chosen = parseRoomChoice(message, availableTypes);

  if (!chosen) {
    const names = availableTypes
      .map((rt, i) => {
        const info = ROOM_LABELS[rt] || { emoji: "🏠", label: rt };
        return `${i + 1}. ${info.label}`;
      })
      .join("\n");
    return {
      reply: `Which room would you like? Reply with the number:\n\n${names}`,
      nextState: state,
      done: false,
    };
  }

  // Get pricing for chosen room
  const pricing = await calculateDynamicPrice(
    supabase,
    chosen as RoomType,
    ci,
    co,
    loyaltyTier,
  );

  // Show experiences
  const tourLines = FEATURED_TOURS.map(
    (t, i) => `${i + 1}. ${t.emoji} *${t.name}* — $${t.price}/person`,
  ).join("\n");

  const info = ROOM_LABELS[chosen] || { emoji: "🏠", label: chosen };

  const reply =
    `${info.emoji} *${info.label}* selected! Great choice.\n\n` +
    `*Add experiences to your stay?* 🌟\n\n${tourLines}\n\nSkip: ___\n\n` +
    `Reply with numbers (e.g. *1 3*) or *skip* to continue without tours.`;

  return {
    reply,
    nextState: {
      ...state,
      step: "EXPERIENCES",
      data: {
        ...state.data,
        roomType: chosen,
        totalRoomCost: pricing.totalForStay,
      },
      lastPromptAt: new Date().toISOString(),
    },
    done: false,
  };
}

/**
 * EXPERIENCES: Collect tour selections and show review.
 */
function handleExperiences(
  message: string,
  state: BookingFlowState,
): BookingFlowResult {
  const tourIndices = parseTourChoices(message);
  const selectedTours = tourIndices.map((i) => FEATURED_TOURS[i].name);
  const totalTourCost = tourIndices.reduce(
    (sum, i) => sum + FEATURED_TOURS[i].price,
    0,
  );
  const totalRoomCost = state.data.totalRoomCost || 0;
  const totalAmount = totalRoomCost + totalTourCost;

  const ci = state.data.checkInDate!;
  const co = state.data.checkOutDate!;
  const roomInfo = ROOM_LABELS[state.data.roomType || ""] || {
    emoji: "🏠",
    label: state.data.roomType || "room",
  };
  const nights = Math.round(
    (new Date(co + "T00:00:00").getTime() -
      new Date(ci + "T00:00:00").getTime()) /
      86400000,
  );

  const tourSummary = selectedTours.length
    ? selectedTours.map((t) => `   • ${t}`).join("\n")
    : "   None";

  const reply =
    `✨ *Booking Summary*\n\n` +
    `📅 ${formatDateFriendly(ci)} → ${formatDateFriendly(co)} (${nights} nights)\n` +
    `${roomInfo.emoji} ${roomInfo.label} — $${totalRoomCost.toFixed(2)}\n\n` +
    `🌟 *Experiences:*\n${tourSummary}\n` +
    (totalTourCost > 0
      ? `   Tours total: $${totalTourCost.toFixed(2)}\n`
      : "") +
    `\n💰 *Total: $${totalAmount.toFixed(2)}*\n\n` +
    `Reply *YES* to confirm and get your payment link, or tell me what to change.`;

  return {
    reply,
    nextState: {
      ...state,
      step: "REVIEW",
      data: {
        ...state.data,
        selectedTours,
        totalTourCost,
        totalAmount,
      },
      lastPromptAt: new Date().toISOString(),
    },
    done: false,
  };
}

/**
 * REVIEW: Guest confirmed. Create pending reservation + payment link.
 */
async function handleReview(
  supabase: SupabaseClient,
  message: string,
  state: BookingFlowState,
  guestId: string | null,
  guestName: string | null,
  phone: string,
): Promise<BookingFlowResult> {
  const lower = message.toLowerCase();
  const confirmed =
    lower.includes("yes") ||
    lower.includes("confirm") ||
    lower.includes("book it") ||
    lower.includes("let's do it") ||
    lower.includes("proceed");

  if (!confirmed) {
    // They want to change something — drop back to DATES step
    return {
      reply:
        `No worries! What would you like to change?\n\n` +
        `• *dates* — pick new dates\n` +
        `• *room* — pick a different room\n` +
        `• *tours* — change experiences\n\n` +
        `Or reply *YES* when ready.`,
      nextState: state,
      done: false,
    };
  }

  if (!guestId) {
    return {
      reply:
        `Almost there! 🎉 To complete your booking I need to link it to your account.\n\n` +
        `Please sign up at *linapoint.com/booking* with this WhatsApp number, then message me again!`,
      nextState: state,
      done: false,
    };
  }

  try {
    const { data: reservation } = await supabase
      .from("reservations")
      .insert({
        guest_id: guestId,
        room_type: state.data.roomType,
        check_in_date: state.data.checkInDate,
        check_out_date: state.data.checkOutDate,
        total_amount: state.data.totalAmount,
        status: "pending_payment",
        payment_status: "pending",
        special_requests: state.data.selectedTours?.length
          ? `Tours requested: ${state.data.selectedTours.join(", ")}`
          : null,
        source: "whatsapp",
      })
      .select("id, confirmation_number")
      .single();

    const resId = reservation?.id || null;
    const confNum = reservation?.confirmation_number || null;

    // Payment link points to the resort checkout page with pre-filled details
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://linapoint.com";
    const paymentUrl = resId
      ? `${baseUrl}/checkout?reservationId=${resId}`
      : `${baseUrl}/booking`;

    const reply =
      `🎉 *Booking Held!* Your reservation is secured for 30 minutes.\n\n` +
      (confNum ? `🔖 Confirmation: *${confNum}*\n\n` : "") +
      `Complete payment here:\n${paymentUrl}\n\n` +
      `Questions? Just reply here and I'll help. See you soon! 🌊`;

    return {
      reply,
      nextState: {
        ...state,
        step: "PAYMENT_LINK",
        data: {
          ...state.data,
          reservationId: resId,
          confirmationNumber: confNum || undefined,
          paymentLinkUrl: paymentUrl,
        },
        lastPromptAt: new Date().toISOString(),
      },
      done: false,
    };
  } catch {
    return {
      reply: `I had a hiccup creating your reservation. Let me try again — reply *YES* once more.`,
      nextState: state,
      done: false,
    };
  }
}

// ── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Advance the booking flow one step based on the guest's message.
 *
 * @param supabase  Service-role Supabase client
 * @param message   Raw WhatsApp message text from guest
 * @param state     Current booking flow state (from session context)
 * @param guestId   null if guest not linked to an account
 * @param guestName Guest's full name (or null)
 * @param phone     Guest's phone number (E.164)
 * @param loyaltyTier Guest loyalty tier (for dynamic pricing)
 */
export async function advanceBookingFlow(
  supabase: SupabaseClient,
  message: string,
  state: BookingFlowState,
  guestId: string | null,
  guestName: string | null,
  phone: string,
  loyaltyTier: string | null = null,
): Promise<BookingFlowResult> {
  if (isCancellation(message) && state.step !== "CONFIRMED") {
    return {
      reply: `No problem! Booking cancelled. 😊 Send "book" any time you want to start again.`,
      nextState: { step: "INQUIRY", data: {} },
      done: true,
    };
  }

  switch (state.step) {
    case "INQUIRY":
      return handleInquiry(message, state, guestName);

    case "DATES":
      return handleDates(supabase, message, state, guestName, loyaltyTier);

    case "ROOM_SELECTION":
      return handleRoomSelection(supabase, message, state, loyaltyTier);

    case "EXPERIENCES":
      return handleExperiences(message, state);

    case "REVIEW":
      return handleReview(supabase, message, state, guestId, guestName, phone);

    case "PAYMENT_LINK":
      // Waiting for payment — remind them of the link
      return {
        reply:
          `Your payment link is waiting! 💳\n\n${state.data.paymentLinkUrl}\n\n` +
          `Once paid, your booking is confirmed. Any questions?`,
        nextState: state,
        done: false,
      };

    case "CONFIRMED":
      return {
        reply:
          `✅ You're all set! Confirmation: *${state.data.confirmationNumber}*\n\n` +
          `Need anything else? Ask me about tours, dining, or anything Lina Point! 🌊`,
        nextState: state,
        done: true,
      };

    default:
      // Fallback: restart
      return handleInquiry(message, { step: "INQUIRY", data: {} }, guestName);
  }
}

/**
 * Detect if a message is a booking initiation keyword.
 */
export function isBookingIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const keywords = [
    "book",
    "reserv",
    "available",
    "availability",
    "check in",
    "checkin",
    "stay",
    "room",
    "cabin",
    "how much",
    "per night",
    "price",
    "rate",
  ];
  return keywords.some((kw) => lower.includes(kw));
}
