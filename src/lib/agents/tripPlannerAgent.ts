/**
 * Trip Planner Agent
 *
 * Multi-turn itinerary builder accessible via WhatsApp.
 * Uses guest preferences + availability to create day-by-day plans.
 */

import { grokLLM } from '@/lib/grokIntegration'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ItineraryDay {
  day: number
  date: string
  morning: string
  afternoon: string
  evening: string
  estimatedCost: number
}

export interface TripPlan {
  summary: string
  days: ItineraryDay[]
  totalEstimatedCost: number
  whatsAppFormatted: string
}

/**
 * Generate a personalized trip itinerary via Grok.
 */
export async function generateTripPlan(
  supabase: SupabaseClient,
  params: {
    userId: string
    checkIn: string
    checkOut: string
    roomType: string
    interests?: string[]
    budget?: string
    groupSize?: number
    specialRequests?: string
  },
): Promise<TripPlan> {
  // Fetch guest preferences for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, maya_interests, dietary_restrictions, travel_style, ai_preferences')
    .eq('user_id', params.userId)
    .maybeSingle()

  const aiPrefs = (profile?.ai_preferences as any) || {}
  const nights = Math.round(
    (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / (1000 * 60 * 60 * 24),
  )
  const guestName = profile?.full_name?.split(' ')[0] || 'Guest'

  const systemPrompt = `You are Maya, the AI concierge trip planner at Lina Point Resort, San Pedro, Belize.

Create a day-by-day itinerary. Return ONLY a valid JSON object:
{
  "summary": "One sentence trip summary",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "morning": "activity description",
      "afternoon": "activity description",
      "evening": "activity description",
      "estimatedCost": 150
    }
  ],
  "totalEstimatedCost": 500,
  "whatsAppFormatted": "📋 *Your Lina Point Itinerary*\\n\\n*Day 1 - Mon, Mar 10*\\n☀️ Morning: ...\\n🌊 Afternoon: ...\\n🌅 Evening: ...\\n\\n..."
}

AVAILABLE ACTIVITIES:
- Hol Chan Snorkeling ($95-150, half day)
- Sport Fishing ($250-500, full day)
- Mayan Ruins Day Trip ($120-200, full day)
- Cenote Swimming ($80-180, half day)
- Mangrove Kayaking ($60-120, half day)
- Blue Hole Diving ($180-450, full day)
- Island Hopping & Beach Picnic ($100-200, half day)
- Complimentary: kayaks, paddleboards, beach lounging
- Reef Restaurant (seafood, 7AM-10PM)
- Palapa Bar (cocktails, 11AM-midnight)
- Room Service (7AM-9PM)

RULES:
- Include 1 rest/beach day for every 3 tour days
- Lunch/dinner should alternate between restaurant & bar
- No more than 1 full-day tour per day
- WhatsApp formatted text should use *bold* and emojis, under 1600 chars
- Return ONLY valid JSON, no markdown fences.`

  const context = JSON.stringify({
    guestName,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    nights,
    roomType: params.roomType,
    interests: params.interests || aiPrefs.activityInterests || [],
    budget: params.budget || aiPrefs.budgetTier || 'mid',
    groupSize: params.groupSize || 2,
    travelStyle: profile?.travel_style || 'leisure',
    dietary: profile?.dietary_restrictions || [],
    specialRequests: params.specialRequests,
  })

  try {
    const response = await grokLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(context),
    ])
    const text = typeof response.content === 'string' ? response.content : String(response.content)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    // Fallback plan
    const days: ItineraryDay[] = []
    const start = new Date(params.checkIn + 'T00:00:00')
    for (let i = 0; i < nights; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      days.push({
        day: i + 1,
        date: d.toISOString().split('T')[0],
        morning: i % 3 === 0 ? 'Hol Chan Snorkeling Tour' : 'Beach & complimentary kayaks',
        afternoon: i % 2 === 0 ? 'Palapa Bar cocktails & lunch' : 'Reef Restaurant lunch',
        evening: 'Dinner at Reef Restaurant, sunset from your room',
        estimatedCost: i % 3 === 0 ? 150 : 50,
      })
    }
    const total = days.reduce((s, d) => s + d.estimatedCost, 0)
    const formatted = days
      .map(
        (d) =>
          `*Day ${d.day} - ${new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}*\n☀️ ${d.morning}\n🌊 ${d.afternoon}\n🌅 ${d.evening}`,
      )
      .join('\n\n')

    return {
      summary: `${nights}-night itinerary mixing adventure and relaxation.`,
      days,
      totalEstimatedCost: total,
      whatsAppFormatted: `📋 *Your Lina Point Itinerary*\n\n${formatted}\n\n💰 Est. total: $${total}`,
    }
  }
}
