/**
 * Group & Event Booking Agent
 *
 * Handles large group bookings (6+ rooms) and special events:
 *
 * 1. Group detection — Identifies group inquiries (weddings, corporate, etc.)
 * 2. Capacity check — Verifies enough inventory for the group
 * 3. Group pricing — Custom rates: 3-5 rooms → 5% discount, 6+ → 10% discount
 * 4. Quote generation — Detailed PDF-ready quote with itemised costs
 * 5. Event packages — Pre-configured packages for weddings/corporate/retreats
 *
 * Invoked from WhatsApp flow + direct web form.
 */

import { grokLLM } from "@/lib/grokIntegration";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { runWithRecursion } from "@/lib/agents/agentRecursion";
import { evaluateTextQuality } from "@/lib/agents/recursionEvaluators";
import { getActivePrompt } from "@/lib/agents/promptManager";
import { checkAvailability } from "@/lib/inventory";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoomType } from "@/lib/inventory";

// ── Types ──────────────────────────────────────────────────────────────────

export type EventType =
  | "wedding"
  | "corporate"
  | "retreat"
  | "celebration"
  | "reunion"
  | "general";

export interface GroupBookingRequest {
  checkInDate: string;
  checkOutDate: string;
  totalGuests: number;
  roomsRequired: number;
  eventType: EventType;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  specialRequirements?: string;
}

export interface GroupRoomAllocation {
  roomType: RoomType;
  quantity: number;
  pricePerNight: number;
  subtotal: number;
}

export interface GroupQuote {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  eventType: EventType;
  totalGuests: number;
  roomAllocations: GroupRoomAllocation[];
  baseRoomTotal: number;
  groupDiscountPct: number;
  groupDiscountAmount: number;
  diningPackage: { name: string; pricePerPerson: number; total: number } | null;
  eventServices: Array<{ name: string; price: number }>;
  subtotal: number;
  tourCredits: number;
  grandTotal: number;
  validUntil: string; // ISO
  notes: string;
  coverLetter: string; // Grok-generated personalised email/cover letter
}

// ── Event Packages ─────────────────────────────────────────────────────────

export const EVENT_PACKAGES: Record<
  EventType,
  {
    diningPackage: { name: string; pricePerPerson: number } | null;
    services: Array<{ name: string; price: number }>;
    tourCredits: number;
  }
> = {
  wedding: {
    diningPackage: {
      name: "Wedding Banquet — Reef Restaurant",
      pricePerPerson: 95,
    },
    services: [
      { name: "Beach Ceremony Setup", price: 800 },
      { name: "Floral Decorations", price: 600 },
      { name: "Photographer (half day)", price: 1200 },
    ],
    tourCredits: 200, // Per couple
  },
  corporate: {
    diningPackage: { name: "Conference Dining Package", pricePerPerson: 65 },
    services: [
      { name: "Meeting Room Setup (daily rate)", price: 250 },
      { name: "AV Equipment", price: 150 },
      { name: "Team-Building Activity", price: 75 },
    ],
    tourCredits: 100,
  },
  retreat: {
    diningPackage: { name: "Wellness Dining Package", pricePerPerson: 75 },
    services: [
      { name: "Yoga Session (daily)", price: 120 },
      { name: "Meditation Space Setup", price: 80 },
    ],
    tourCredits: 150,
  },
  celebration: {
    diningPackage: { name: "Celebration Dinner Package", pricePerPerson: 85 },
    services: [
      { name: "Cake & Decorations", price: 300 },
      { name: "Welcome Drinks Reception", price: 400 },
    ],
    tourCredits: 100,
  },
  reunion: {
    diningPackage: { name: "Family Reunion Buffet", pricePerPerson: 60 },
    services: [{ name: "Group Photo Session", price: 400 }],
    tourCredits: 75,
  },
  general: {
    diningPackage: null,
    services: [],
    tourCredits: 50,
  },
};

// ── Group Discount Logic ───────────────────────────────────────────────────

function getGroupDiscount(roomsRequired: number): number {
  if (roomsRequired >= 10) return 0.15; // 15% for 10+
  if (roomsRequired >= 6) return 0.1; // 10% for 6-9
  if (roomsRequired >= 3) return 0.05; // 5% for 3-5
  return 0;
}

// ── Group Detection ────────────────────────────────────────────────────────

/**
 * Detect if a message is likely a group booking inquiry.
 */
export function detectGroupInquiry(message: string): {
  isGroup: boolean;
  estimatedSize: number;
  eventType: EventType;
} {
  const lower = message.toLowerCase();

  // Room count detection
  const roomMatches = lower.match(/(\d+)\s*(rooms?|suites?|cabanas?)/);
  const guestMatches = lower.match(/(\d+)\s*(guests?|people|persons?|adults?)/);
  const roomCount = roomMatches ? parseInt(roomMatches[1]) : 0;
  const guestCount = guestMatches ? parseInt(guestMatches[1]) : 0;
  const estimatedRooms = roomCount || Math.ceil(guestCount / 2);
  const estimatedSize = guestCount || roomCount * 2;

  // Event type detection
  let eventType: EventType = "general";
  if (
    lower.includes("wedding") ||
    lower.includes("elope") ||
    lower.includes("bride")
  )
    eventType = "wedding";
  else if (
    lower.includes("corporate") ||
    lower.includes("offsite") ||
    lower.includes("conference") ||
    lower.includes("team")
  )
    eventType = "corporate";
  else if (
    lower.includes("retreat") ||
    lower.includes("wellness") ||
    lower.includes("yoga")
  )
    eventType = "retreat";
  else if (
    lower.includes("birthday") ||
    lower.includes("anniversary") ||
    lower.includes("celebration")
  )
    eventType = "celebration";
  else if (lower.includes("reunion") || lower.includes("family"))
    eventType = "reunion";

  return {
    isGroup: estimatedRooms >= 3 || estimatedSize >= 6,
    estimatedSize: Math.max(estimatedSize, estimatedRooms * 2),
    eventType,
  };
}

// ── Quote Generation ───────────────────────────────────────────────────────

const QUOTE_PROMPT = `You are the Sales Manager at Lina Point Resort, a luxury overwater resort in San Pedro, Ambergris Caye, Belize.

You are writing a personalised cover letter for a group booking quote. It will be emailed to the organiser alongside the itemised quote.

TONE: Professional, warm, excited — this is a personal letter, not a template.
LENGTH: 2 short paragraphs + brief closing.
INCLUDE: Resort highlights relevant to their event type, personal excitement about hosting them.
DO NOT: List prices (those are in the attached quote), make specific guarantees you can't keep.
SIGN: "With warm regards, [Manager Name], Group Sales, Lina Point Resort" (use "Maya" as manager name).`;

/**
 * Generate a full group booking quote.
 */
export async function generateGroupQuote(
  supabase: SupabaseClient,
  request: GroupBookingRequest,
): Promise<GroupQuote> {
  const checkIn = new Date(request.checkInDate + "T00:00:00");
  const checkOut = new Date(request.checkOutDate + "T00:00:00");
  const nights = Math.round(
    (checkOut.getTime() - checkIn.getTime()) / 86400000,
  );

  // Check availability
  const available = await checkAvailability(
    supabase,
    request.checkInDate,
    request.checkOutDate,
  );
  const totalAvailable = available.reduce(
    (sum, r) => sum + r.availableRooms,
    0,
  );

  if (totalAvailable < request.roomsRequired) {
    throw new Error(
      `Insufficient inventory: ${totalAvailable} rooms available, ${request.roomsRequired} requested`,
    );
  }

  // Allocate rooms — prefer overwater cabanas for immersive experience,
  // fill with hotel suites if necessary
  const allocations: GroupRoomAllocation[] = [];
  let roomsToAllocate = request.roomsRequired;

  const preferenceOrder: RoomType[] = [
    "cabana_1br",
    "cabana_2br",
    "cabana_duplex",
    "suite_1st_floor",
    "suite_2nd_floor",
  ];

  for (const roomType of preferenceOrder) {
    if (roomsToAllocate <= 0) break;
    const avail = available.find((r) => r.roomType === roomType);
    if (!avail || avail.availableRooms === 0) continue;

    const qty = Math.min(avail.availableRooms, roomsToAllocate);
    const baseRate = avail.baseRate;
    allocations.push({
      roomType,
      quantity: qty,
      pricePerNight: baseRate,
      subtotal: baseRate * qty * nights,
    });
    roomsToAllocate -= qty;
  }

  const baseRoomTotal = allocations.reduce((sum, a) => sum + a.subtotal, 0);
  const discountPct = getGroupDiscount(request.roomsRequired);
  const discountAmount = Math.round(baseRoomTotal * discountPct * 100) / 100;

  // Event package
  const pkg = EVENT_PACKAGES[request.eventType];
  const diningPackage = pkg.diningPackage
    ? {
        name: pkg.diningPackage.name,
        pricePerPerson: pkg.diningPackage.pricePerPerson,
        total: pkg.diningPackage.pricePerPerson * request.totalGuests * nights,
      }
    : null;
  const totalDining = diningPackage?.total || 0;
  const totalEventServices = pkg.services.reduce(
    (sum, s) => sum + s.price * nights,
    0,
  );
  const tourCredits = pkg.tourCredits * nights;

  const subtotal =
    baseRoomTotal - discountAmount + totalDining + totalEventServices;
  const grandTotal = subtotal - tourCredits;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  // Generate cover letter with Grok
  const basePrompt = await getActivePrompt("group_quote_letter", QUOTE_PROMPT);
  const contextPrompt =
    `Event: ${request.eventType}\n` +
    `Group size: ${request.totalGuests} guests, ${request.roomsRequired} rooms\n` +
    `Dates: ${request.checkInDate} to ${request.checkOutDate} (${nights} nights)\n` +
    `Contact: ${request.contactName || "the organiser"}\n` +
    (request.specialRequirements
      ? `Special requirements: ${request.specialRequirements}\n`
      : "") +
    `\nWrite the personalised cover letter now.`;

  const { result } = await runWithRecursion(
    async () =>
      grokLLM.invoke([
        new SystemMessage(basePrompt),
        new HumanMessage(contextPrompt),
      ]),
    async (response) => {
      const text = typeof response.content === "string" ? response.content : "";
      const eval_ = await evaluateTextQuality(
        "Warm, professional group booking cover letter.",
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

  const coverLetter =
    typeof result.content === "string"
      ? result.content
      : `Dear ${request.contactName || "Organiser"},\n\nThank you for considering Lina Point Resort for your ${request.eventType}. We would be honoured to host your group in our paradise on the Caribbean Sea.\n\nWith warm regards, Maya, Group Sales, Lina Point Resort`;

  // Save to DB
  const quoteId = crypto.randomUUID();
  void (async () => {
    try {
      await supabase.from("group_booking_quotes").insert({
        id: quoteId,
        check_in_date: request.checkInDate,
        check_out_date: request.checkOutDate,
        event_type: request.eventType,
        total_guests: request.totalGuests,
        rooms_required: request.roomsRequired,
        contact_name: request.contactName,
        contact_phone: request.contactPhone,
        contact_email: request.contactEmail,
        special_requirements: request.specialRequirements,
        grand_total: grandTotal,
        discount_pct: discountPct * 100,
        status: "draft",
        valid_until: validUntil.toISOString(),
      });
    } catch {
      /* non-fatal */
    }
  })();

  return {
    id: quoteId,
    checkInDate: request.checkInDate,
    checkOutDate: request.checkOutDate,
    nights,
    eventType: request.eventType,
    totalGuests: request.totalGuests,
    roomAllocations: allocations,
    baseRoomTotal: Math.round(baseRoomTotal * 100) / 100,
    groupDiscountPct: discountPct * 100,
    groupDiscountAmount: discountAmount,
    diningPackage,
    eventServices: pkg.services,
    subtotal: Math.round(subtotal * 100) / 100,
    tourCredits,
    grandTotal: Math.max(Math.round(grandTotal * 100) / 100, 0),
    validUntil: validUntil.toISOString(),
    notes: `Quote valid for 30 days. 30% deposit required to confirm. Remaining balance due 60 days before arrival.`,
    coverLetter,
  };
}

/**
 * Format group quote as a WhatsApp-friendly summary.
 */
export function formatGroupQuoteForWhatsApp(quote: GroupQuote): string {
  const roomSummary = quote.roomAllocations
    .map(
      (a) =>
        `${a.quantity}× ${a.roomType.replace(/_/g, " ")} ($${a.pricePerNight}/night)`,
    )
    .join("\n");

  return (
    `🏨 *Group Quote — ${quote.eventType.charAt(0).toUpperCase() + quote.eventType.slice(1)}*\n\n` +
    `📅 ${quote.checkInDate} → ${quote.checkOutDate} (${quote.nights} nights)\n` +
    `👥 ${quote.totalGuests} guests · ${quote.roomAllocations.reduce((s, a) => s + a.quantity, 0)} rooms\n\n` +
    `*Rooms:*\n${roomSummary}\n` +
    (quote.groupDiscountPct > 0
      ? `\n🎁 *Group Discount: ${quote.groupDiscountPct}% ($${quote.groupDiscountAmount} off)*`
      : "") +
    (quote.diningPackage ? `\n🍽️ ${quote.diningPackage.name}` : "") +
    `\n\n💰 *Grand Total: $${quote.grandTotal.toLocaleString()}*\n` +
    `($${Math.round(quote.grandTotal / quote.nights / quote.totalGuests)} per person/night)\n\n` +
    `Quote valid until ${new Date(quote.validUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.\n` +
    `30% deposit to confirm. Reply to proceed! 🌊`
  );
}
