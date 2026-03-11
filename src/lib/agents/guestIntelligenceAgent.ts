/**
 * Guest Intelligence Agent
 *
 * Analyzes guest history (reservations, WhatsApp conversations, tour bookings,
 * interactions) and builds an AI-driven preference profile that powers
 * personalized recommendations across the entire guest journey.
 */

import { grokLLM } from '@/lib/grokIntegration'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GuestInsights {
  travelStyle: string
  preferredRoomType: string | null
  dietaryPreferences: string[]
  activityInterests: string[]
  budgetTier: 'budget' | 'mid' | 'luxury'
  communicationStyle: string
  specialOccasions: Array<{ type: string; date: string }>
  loyaltyTier: 'new' | 'returning' | 'loyal' | 'vip'
  sentimentTrend: 'positive' | 'neutral' | 'declining'
  personalizedTips: string[]
}

/**
 * Gather all guest data from Supabase and run through Grok for insight extraction.
 */
export async function analyzeGuest(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuestInsights> {
  // Parallel fetch of all guest data
  const [profileRes, reservationsRes, interactionsRes, tourBookingsRes, messagesRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase
        .from('reservations')
        .select('room_type, check_in_date, check_out_date, total_amount, status, special_requests')
        .eq('guest_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(20),
      supabase
        .from('guest_interactions')
        .select('interaction_type, channel, summary, sentiment, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('tour_bookings')
        .select('tour_name, tour_type, price, status')
        .eq('user_id', userId)
        .limit(20),
      supabase
        .from('whatsapp_messages')
        .select('body, direction, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ])

  const profile = profileRes.data
  const reservations = reservationsRes.data || []
  const interactions = interactionsRes.data || []
  const tourBookings = tourBookingsRes.data || []
  const messages = messagesRes.data || []

  const totalSpend = reservations.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
  const stayCount = reservations.filter((r) => r.status !== 'cancelled').length

  // Build context for Grok analysis
  const guestData = JSON.stringify(
    {
      profile: {
        name: profile?.full_name,
        birthday: profile?.birthday,
        anniversary: profile?.anniversary,
        specialEvents: profile?.special_events,
        musicStyle: profile?.music_style,
        mayaInterests: profile?.maya_interests,
        dietaryRestrictions: profile?.dietary_restrictions,
      },
      stayHistory: reservations.slice(0, 10).map((r) => ({
        roomType: r.room_type,
        dates: `${r.check_in_date} to ${r.check_out_date}`,
        amount: r.total_amount,
        requests: r.special_requests,
      })),
      tourHistory: tourBookings.slice(0, 10),
      recentConversations: messages.slice(0, 15).map((m) => ({
        role: m.direction === 'inbound' ? 'guest' : 'maya',
        text: m.body,
      })),
      interactionSummary: {
        total: interactions.length,
        positive: interactions.filter((i) => i.sentiment === 'positive').length,
        negative: interactions.filter((i) => i.sentiment === 'negative').length,
        channels: [...new Set(interactions.map((i) => i.channel))],
      },
      totalSpend,
      stayCount,
    },
    null,
    2,
  )

  const systemPrompt = `You are a luxury hospitality AI analyst for Lina Point Resort (San Pedro, Belize).
Analyze this guest's complete history and return a JSON object with EXACTLY these fields:
{
  "travelStyle": "adventure" | "relaxation" | "romantic" | "family" | "cultural",
  "preferredRoomType": "overwater_suite" | "suite_2nd_floor" | "cabana_1br" | "cabana_2br" | null,
  "dietaryPreferences": ["array of dietary notes"],
  "activityInterests": ["snorkeling", "fishing", etc.],
  "budgetTier": "budget" | "mid" | "luxury",
  "communicationStyle": "brief" | "detailed" | "emoji-heavy" | "formal",
  "specialOccasions": [{"type": "birthday", "date": "MM-DD"}],
  "loyaltyTier": "new" | "returning" | "loyal" | "vip",
  "sentimentTrend": "positive" | "neutral" | "declining",
  "personalizedTips": ["up to 3 actionable tips for staff"]
}
Rules:
- loyaltyTier: new=0 stays, returning=1-2, loyal=3-5, vip=6+
- budgetTier: based on spending patterns and room choices
- Return ONLY valid JSON, no markdown fences.`

  try {
    const response = await grokLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(guestData),
    ])
    const text = typeof response.content === 'string' ? response.content : String(response.content)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const insights: GuestInsights = JSON.parse(cleaned)
    return insights
  } catch {
    // Fallback: compute basic insights without LLM
    return {
      travelStyle: 'leisure',
      preferredRoomType: reservations[0]?.room_type || null,
      dietaryPreferences: (profile?.dietary_restrictions as string[]) || [],
      activityInterests: (profile?.maya_interests as string[]) || [],
      budgetTier: totalSpend > 5000 ? 'luxury' : totalSpend > 2000 ? 'mid' : 'budget',
      communicationStyle: 'brief',
      specialOccasions: profile?.birthday
        ? [{ type: 'birthday', date: profile.birthday.slice(5) }]
        : [],
      loyaltyTier: stayCount >= 6 ? 'vip' : stayCount >= 3 ? 'loyal' : stayCount >= 1 ? 'returning' : 'new',
      sentimentTrend: 'neutral',
      personalizedTips: [],
    }
  }
}

/**
 * Run full analysis and persist results back to the profile.
 */
export async function updateGuestIntelligence(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuestInsights> {
  const insights = await analyzeGuest(supabase, userId)

  await supabase
    .from('profiles')
    .update({
      travel_style: insights.travelStyle,
      loyalty_tier: insights.loyaltyTier,
      ai_preferences: insights as any,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return insights
}

/**
 * Log a guest interaction for future intelligence processing.
 */
export async function logInteraction(
  supabase: SupabaseClient,
  params: {
    userId: string
    type: string
    channel: string
    summary: string
    sentiment?: string
    metadata?: Record<string, any>
    reservationId?: string
  },
) {
  await supabase.from('guest_interactions').insert({
    user_id: params.userId,
    interaction_type: params.type,
    channel: params.channel,
    summary: params.summary,
    sentiment: params.sentiment || 'neutral',
    metadata: params.metadata || {},
    reservation_id: params.reservationId || null,
  })
}
