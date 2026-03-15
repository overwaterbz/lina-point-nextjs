import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { grokLLM } from '@/lib/grokIntegration';
import { runWithRecursion } from '@/lib/agents/agentRecursion';
import { evaluateTextQuality } from '@/lib/agents/recursionEvaluators';
import { getActivePrompt } from '@/lib/agents/promptManager';

export interface WhatsAppProfile {
  user_id?: string | null;
  full_name?: string | null;
  birthday?: string | null;
  anniversary?: string | null;
  special_events?: Array<{ name: string; date: string }> | null;
  music_style?: string | null;
  maya_interests?: string[] | null;
  opt_in_magic?: boolean | null;
}

export type ConciergeActionType =
  | 'book_flow'
  | 'magic_content'
  | 'check_reservation'
  | 'book_tour'
  | 'check_availability'
  | 'trip_planner'
  | 'request_dining'
  | 'complaint';

export interface WhatsAppSessionContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string; ts: string }>;
  pending_action?: {
    type: ConciergeActionType;
    data?: Record<string, any>;
  } | null;
}

export interface WhatsAppAgentInput {
  message: string;
  phone: string;
  profile: WhatsAppProfile | null;
  sessionContext: WhatsAppSessionContext;
}

export interface WhatsAppAgentOutput {
  replyText: string;
  action: { type: ConciergeActionType; payload?: Record<string, any> } | null;
  updatedContext: WhatsAppSessionContext;
}

const ConciergeState = Annotation.Root({
  message: Annotation<string>,
  phone: Annotation<string>,
  profile: Annotation<WhatsAppProfile | null>,
  sessionContext: Annotation<WhatsAppSessionContext>,
  refinementHint: Annotation<string | undefined>,
  replyText: Annotation<string>,
  action: Annotation<{ type: ConciergeActionType; payload?: Record<string, any> } | null>,
});

const DEFAULT_CONCIERGE_PROMPT = `You are Maya, the AI concierge at Lina Point — an overwater resort on the Caribbean Sea in San Pedro, Ambergris Caye, Belize.

RESORT KNOWLEDGE:
- Rooms: 2nd Floor Hotel Suites ($130+/night), 1st Floor Hotel Suites ($150+), 1 Bed Duplex Cabanas ($250+), 1 Bedroom Overwater Cabana ($300+), 2 Bedroom Overwater Cabana ($400+). All have ocean views.
- Check-in 3 PM, Check-out 11 AM. Minimum 2-night stay.
- Dining: Reef Restaurant (seafood, 7AM-10PM), Palapa Bar (cocktails, 11AM-midnight), Room Service (7AM-9PM).
- Tours: Hol Chan Marine Reserve snorkeling ($95-150), Sport Fishing ($250-500), Mayan Ruins day trip ($120-200), Cenote swimming ($80-180), Mangrove kayaking ($60-120).
- Water taxi from Belize City ~90 min, or local flights via Tropic Air (~15 min).
- Wi-Fi included. Kayaks & paddleboards complimentary. Dive shop on-site.
- Magic Experiences: Personalized birthday/anniversary songs & videos created by AI. Guests can opt in.

ECOSYSTEM (mention when relevant):
- Kyla Point (kylapoint.com) — Sister community. Soulful mainland living with waterfront homes, lots, and resort amenities in Belize.
- Overwater (overwater.com) — Fractional ownership of luxury overwater living.
- Point Realtor (pointrealtor.com) — Licensed brokerage for all real estate inquiries across our properties.
- The Magic Is You (magic.overwater.com) — Human design & cosmic blueprint readings.`;

async function buildSystemPrompt(profile: WhatsAppProfile | null, refinementHint?: string) {
  const prefs = profile
    ? {
        name: profile.full_name,
        birthday: profile.birthday,
        anniversary: profile.anniversary,
        events: profile.special_events,
        music_style: profile.music_style,
        maya_interests: profile.maya_interests,
        opt_in_magic: profile.opt_in_magic,
      }
    : {};

  const hasName = profile?.full_name;
  const refinement = refinementHint ? `\nRefinement: ${refinementHint}` : '';

  const basePrompt = await getActivePrompt('whatsapp_concierge', DEFAULT_CONCIERGE_PROMPT);

  return `${basePrompt}

GUEST PREFERENCES: ${JSON.stringify(prefs)}

RULES:
- Keep replies under 3 sentences for simple questions. Be warm but concise — this is WhatsApp.
- ${hasName ? `Address the guest as ${profile!.full_name!.split(' ')[0]}.` : 'If you don\'t know the guest\'s name, ask for it naturally.'}
- Always promote direct booking (saves guests 3%+ vs OTAs).
- If a guest asks about pricing, offer to run a price comparison.
- If a guest mentions a celebration, suggest Magic Experiences.
- Never make up information. If unsure, say you'll check and follow up.
- Use 1-2 emojis max per message. No walls of text.${refinement}`;
}

function detectAction(message: string, context: WhatsAppSessionContext) {
  const lower = message.toLowerCase();
  const pending = context.pending_action;

  // If there's an existing pending action, continue it unless the user explicitly changes topic
  if (pending?.type) {
    const cancelWords = ['cancel', 'nevermind', 'never mind', 'stop', 'forget it'];
    if (cancelWords.some(w => lower.includes(w))) {
      return null; // User wants to cancel current flow
    }
    return pending;
  }

  // Reservation lookup — "my reservation", "confirmation", "LP-XXXXXX"
  const reservationKeywords = [
    'my reservation', 'my booking', 'confirmation', 'lp-',
    'check my', 'lookup', 'look up', 'status',
  ];
  if (reservationKeywords.some(kw => lower.includes(kw))) {
    return { type: 'check_reservation' as const, data: {} };
  }

  // Booking intent — rooms, stays, dates, availability
  const bookingKeywords = [
    'book', 'reserv', 'room', 'bungalow', 'villa', 'suite', 'stay',
    'check in', 'check-in', 'checkin', 'available', 'availability',
    'price', 'rate', 'cost', 'how much', 'per night', 'nights',
  ];
  if (bookingKeywords.some(kw => lower.includes(kw))) {
    return { type: 'book_flow' as const, data: {} };
  }

  // Tour booking — explicit tour intent
  const tourKeywords = [
    'tour', 'snorkel', 'fishing', 'dive', 'diving', 'kayak',
    'ruins', 'cenote', 'island hop', 'hol chan', 'blue hole',
    'excursion', 'activity', 'activities',
  ];
  if (tourKeywords.some(kw => lower.includes(kw))) {
    return { type: 'book_tour' as const, data: {} };
  }

  // Trip planner — itinerary building
  const plannerKeywords = [
    'itinerary', 'plan my trip', 'plan our trip', 'what should we do',
    'trip plan', 'schedule', 'what to do', 'suggest activities',
  ];
  if (plannerKeywords.some(kw => lower.includes(kw))) {
    return { type: 'trip_planner' as const, data: {} };
  }

  // Dining requests
  const diningKeywords = [
    'dinner', 'lunch', 'breakfast', 'restaurant', 'room service',
    'table', 'reservation at', 'eat', 'menu', 'food',
    'palapa', 'reef restaurant',
  ];
  if (diningKeywords.some(kw => lower.includes(kw))) {
    return { type: 'request_dining' as const, data: {} };
  }

  // Complaint handling
  const complaintKeywords = [
    'complaint', 'problem', 'issue', 'broken', 'not working',
    'disappointed', 'unhappy', 'terrible', 'worst', 'unacceptable',
    'manager', 'refund', 'compensat',
  ];
  if (complaintKeywords.some(kw => lower.includes(kw))) {
    return { type: 'complaint' as const, data: {} };
  }

  // Magic content intent — songs, videos, celebrations
  const magicKeywords = [
    'song', 'video', 'magic', 'birthday', 'anniversary', 'proposal',
    'surprise', 'celebration', 'personalized', 'custom music',
  ];
  if (magicKeywords.some(kw => lower.includes(kw))) {
    return { type: 'magic_content' as const, data: {} };
  }

  // Availability check without full booking
  const availKeywords = ['any rooms', 'anything available', 'open dates', 'vacancy'];
  if (availKeywords.some(kw => lower.includes(kw))) {
    return { type: 'check_availability' as const, data: {} };
  }

  return null;
}

function extractBookingDetails(message: string, existing?: Record<string, any>) {
  const data: Record<string, any> = { ...(existing || {}) };

  // ISO dates (2026-03-10)
  const isoDates = message.match(/\d{4}-\d{2}-\d{2}/g) || [];
  if (isoDates.length >= 1 && !data.checkInDate) data.checkInDate = isoDates[0];
  if (isoDates.length >= 2 && !data.checkOutDate) data.checkOutDate = isoDates[1];

  // US dates (3/10, 03/15/2026, March 10)
  const usDatePattern = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g;
  const usMatches = [...message.matchAll(usDatePattern)];
  if (usMatches.length >= 1 && !data.checkInDate) {
    const m = usMatches[0];
    const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : new Date().getFullYear().toString();
    data.checkInDate = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  if (usMatches.length >= 2 && !data.checkOutDate) {
    const m = usMatches[1];
    const year = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : new Date().getFullYear().toString();
    data.checkOutDate = `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }

  // "X to Y" date range with "to" or "through"
  const rangeMatch = message.match(/(\d{4}-\d{2}-\d{2})\s+(?:to|through|thru|-)\s+(\d{4}-\d{2}-\d{2})/i);
  if (rangeMatch) {
    if (!data.checkInDate) data.checkInDate = rangeMatch[1];
    if (!data.checkOutDate) data.checkOutDate = rangeMatch[2];
  }

  // "X nights" — auto-calculate checkout from checkin
  const nightsMatch = message.match(/(\d+)\s*nights?/i);
  if (nightsMatch && data.checkInDate && !data.checkOutDate) {
    const checkin = new Date(data.checkInDate);
    checkin.setDate(checkin.getDate() + parseInt(nightsMatch[1]));
    data.checkOutDate = checkin.toISOString().slice(0, 10);
  }

  const groupMatch = message.match(/(\d+)\s+(guests?|people|adults?|persons?)/i);
  if (groupMatch && !data.groupSize) data.groupSize = Number(groupMatch[1]);

  const lower = message.toLowerCase();
  if (lower.includes('overwater') || lower.includes('cabana')) data.roomType = 'overwater cabana';
  if (lower.includes('villa') || lower.includes('beach villa')) data.roomType = 'overwater cabana';
  if (lower.includes('2nd floor') || lower.includes('second floor')) data.roomType = '2nd floor suite';
  if (lower.includes('1st floor') || lower.includes('first floor') || lower.includes('hotel suite')) data.roomType = '1st floor suite';
  if (lower.includes('suite') && !data.roomType) data.roomType = '2nd floor suite';

  return data;
}

function extractMagicDetails(message: string, existing?: Record<string, any>) {
  const data: Record<string, any> = { ...(existing || {}) };
  const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (uuidMatch && !data.reservationId) data.reservationId = uuidMatch[0];

  const lower = message.toLowerCase();
  if (lower.includes('birthday')) data.occasion = 'birthday';
  if (lower.includes('anniversary')) data.occasion = 'anniversary';
  if (lower.includes('proposal')) data.occasion = 'proposal';
  if (lower.includes('renewal')) data.occasion = 'renewal';

  return data;
}

export async function runWhatsAppConciergeAgent(
  input: WhatsAppAgentInput
): Promise<WhatsAppAgentOutput> {
  const graph = new StateGraph(ConciergeState)
    .addNode('respond', async (state) => {
      const systemPrompt = await buildSystemPrompt(state.profile, state.refinementHint);
      const history = state.sessionContext.messages.slice(-5).map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      );

      const response = await grokLLM.invoke([
        new SystemMessage(systemPrompt),
        ...history,
        new HumanMessage(state.message),
      ]);

      const replyText =
        response.content && typeof response.content === 'string'
          ? response.content
          : 'Got it. Let me check on that.';

      const action = detectAction(state.message, state.sessionContext);

      return {
        replyText,
        action,
      };
    })
    .addEdge(START, 'respond')
    .addEdge('respond', END);

  const initialState = {
    message: input.message,
    phone: input.phone,
    profile: input.profile,
    sessionContext: input.sessionContext,
    refinementHint: undefined,
  };

  const { result } = await runWithRecursion(
    async () => graph.compile().invoke(initialState),
    async (state) => {
      const goal = 'Provide a short, friendly WhatsApp reply that moves the conversation forward.';
      const summary = `Reply: ${state.replyText}`;
      const evalResult = await evaluateTextQuality(goal, summary);
      return { score: evalResult.score, feedback: evalResult.feedback, data: state };
    },
    async (state, feedback, iteration) => ({
      ...state,
      refinementHint: `Iteration ${iteration + 1}: ${feedback || 'Be shorter and ask one clear question.'}`,
    })
  );

  const updatedContext: WhatsAppSessionContext = {
    ...input.sessionContext,
  };

  const now = new Date().toISOString();
  updatedContext.messages = [...input.sessionContext.messages, { role: 'user', content: input.message, ts: now }];

  if (result.replyText) {
    updatedContext.messages.push({ role: 'assistant', content: result.replyText, ts: now });
  }

  if (result.action?.type === 'book_flow' || result.action?.type === 'check_availability') {
    const data = extractBookingDetails(input.message, input.sessionContext.pending_action?.data);
    updatedContext.pending_action = { type: result.action.type, data };
  } else if (result.action?.type === 'magic_content') {
    const data = extractMagicDetails(input.message, input.sessionContext.pending_action?.data);
    updatedContext.pending_action = { type: 'magic_content', data };
  } else if (result.action?.type === 'check_reservation') {
    // Extract confirmation number (LP-XXXXXX pattern)
    const lpMatch = input.message.match(/LP-[A-Z0-9]{6}/i);
    updatedContext.pending_action = {
      type: 'check_reservation',
      data: { confirmationNumber: lpMatch?.[0]?.toUpperCase() || null },
    };
  } else if (result.action?.type === 'book_tour') {
    updatedContext.pending_action = {
      type: 'book_tour',
      data: extractBookingDetails(input.message, input.sessionContext.pending_action?.data),
    };
  } else if (result.action?.type === 'trip_planner') {
    const data = extractBookingDetails(input.message, input.sessionContext.pending_action?.data);
    updatedContext.pending_action = { type: 'trip_planner', data };
  } else if (result.action?.type === 'request_dining') {
    updatedContext.pending_action = {
      type: 'request_dining',
      data: { request: input.message },
    };
  } else if (result.action?.type === 'complaint') {
    updatedContext.pending_action = {
      type: 'complaint',
      data: { description: input.message },
    };
  } else {
    updatedContext.pending_action = null;
  }

  return {
    replyText: result.replyText || 'Got it. Let me check on that.',
    action: result.action,
    updatedContext,
  };
}
