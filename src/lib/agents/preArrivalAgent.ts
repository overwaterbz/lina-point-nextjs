/**
 * Pre-Arrival Agent
 *
 * Generates personalized pre-arrival packets 7 days before check-in:
 * - Weather forecast info for their dates
 * - Recommended tours based on guest preferences
 * - Dining suggestions
 * - Personalized tips from guest intelligence
 *
 * Sends via email (Resend) and optionally WhatsApp.
 */

import { grokLLM } from '@/lib/grokIntegration'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { runWithRecursion } from '@/lib/agents/agentRecursion'
import { evaluateTextQuality } from '@/lib/agents/recursionEvaluators'
import { getActivePrompt } from '@/lib/agents/promptManager'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PreArrivalPacket {
  reservationId: string
  guestName: string
  checkIn: string
  weatherSummary: string
  recommendedTours: Array<{ name: string; price: number; why: string }>
  diningSuggestions: Array<{ name: string; description: string }>
  personalizedTips: string
  whatsAppMessage: string
}

/**
 * Find reservations with check-in exactly N days from now.
 */
export async function findUpcomingArrivals(
  supabase: SupabaseClient,
  daysOut: number = 7,
) {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysOut)
  const dateStr = targetDate.toISOString().split('T')[0]

  const { data } = await supabase
    .from('reservations')
    .select(
      `
      id,
      guest_id,
      confirmation_number,
      room_type,
      room_id,
      check_in_date,
      check_out_date,
      total_amount,
      special_requests,
      status
    `,
    )
    .eq('check_in_date', dateStr)
    .eq('status', 'confirmed')

  return data || []
}

/**
 * Generate a personalized pre-arrival packet using Grok.
 */
export async function generatePreArrivalPacket(
  supabase: SupabaseClient,
  reservation: {
    id: string
    guest_id: string
    confirmation_number: string
    room_type: string
    check_in_date: string
    check_out_date: string
    special_requests?: string
  },
): Promise<PreArrivalPacket> {
  // Fetch guest profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone_number, maya_interests, music_style, dietary_restrictions, travel_style, ai_preferences')
    .eq('user_id', reservation.guest_id)
    .maybeSingle()

  const guestName = profile?.full_name || 'Guest'
  const interests = profile?.maya_interests || []
  const dietary = profile?.dietary_restrictions || []
  const travelStyle = profile?.travel_style || 'leisure'
  const aiPrefs = (profile?.ai_preferences as any) || {}

  const nights = Math.round(
    (new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) /
      (1000 * 60 * 60 * 24),
  )

  const defaultPrompt = `You are Maya, the AI concierge at Lina Point Resort in San Pedro, Belize.
Generate a pre-arrival packet for a guest arriving in 7 days.

Return a JSON object:
{
  "weatherSummary": "2-sentence Belize weather forecast for their dates",
  "recommendedTours": [{"name": "tour name", "price": 95, "why": "personalized reason"}],
  "diningSuggestions": [{"name": "meal/restaurant", "description": "brief description"}],
  "personalizedTips": "2-3 sentences of personalized advice",
  "whatsAppMessage": "A 3-4 sentence WhatsApp greeting message for 7 days before arrival"
}

Available tours: Hol Chan Snorkeling ($95-150), Sport Fishing ($250-500), Mayan Ruins ($120-200), Cenote Swimming ($80-180), Mangrove Kayaking ($60-120), Blue Hole Diving ($180-450), Island Hopping ($100-200).
Dining: Reef Restaurant (seafood, 7AM-10PM), Palapa Bar (cocktails, 11AM-midnight), Room Service (7AM-9PM).
Return ONLY valid JSON, no markdown fences.`

  const systemPrompt = await getActivePrompt('pre_arrival', defaultPrompt)

  const guestContext = JSON.stringify({
    name: guestName,
    roomType: reservation.room_type,
    checkIn: reservation.check_in_date,
    checkOut: reservation.check_out_date,
    nights,
    interests,
    dietary,
    travelStyle,
    specialRequests: reservation.special_requests,
    activityInterests: aiPrefs.activityInterests || [],
    budgetTier: aiPrefs.budgetTier || 'mid',
  })

  try {
    const { result: text } = await runWithRecursion<string>(
      async () => {
        const response = await grokLLM.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(guestContext),
        ])
        return typeof response.content === 'string' ? response.content : String(response.content)
      },
      async (output) => {
        const evalResult = await evaluateTextQuality(
          'Generate a personalized pre-arrival packet as valid JSON with weather, tours, dining, tips, and WhatsApp message',
          output,
        )
        return { ...evalResult, data: output }
      },
      async (_prev, feedback) => {
        const response = await grokLLM.invoke([
          new SystemMessage(systemPrompt),
          new HumanMessage(`${guestContext}\n\nPrevious attempt feedback: ${feedback}\nPlease improve the output.`),
        ])
        return typeof response.content === 'string' ? response.content : String(response.content)
      },
    )
    const cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim()
    const packet = JSON.parse(cleaned)

    return {
      reservationId: reservation.id,
      guestName,
      checkIn: reservation.check_in_date,
      ...packet,
    }
  } catch {
    return {
      reservationId: reservation.id,
      guestName,
      checkIn: reservation.check_in_date,
      weatherSummary:
        'Expect warm tropical weather in San Pedro — highs around 85°F with gentle Caribbean breezes.',
      recommendedTours: [
        { name: 'Hol Chan Marine Reserve Snorkeling', price: 95, why: 'Our most popular tour — pristine reef!' },
        { name: 'Mangrove Kayaking', price: 60, why: 'Great for wildlife spotting.' },
      ],
      diningSuggestions: [
        { name: 'Reef Restaurant', description: 'Fresh seafood with ocean views, open 7AM-10PM' },
        { name: 'Palapa Bar', description: 'Handcrafted cocktails over the water' },
      ],
      personalizedTips: 'Pack reef-safe sunscreen and water shoes for the best snorkeling experience.',
      whatsAppMessage: `Hi ${guestName}! 🌴 Your Lina Point getaway is just 7 days away! The weather is looking beautiful. We'll have your ${reservation.room_type.replace(/_/g, ' ')} ready. Any special requests? Just reply here!`,
    }
  }
}

/**
 * Send the pre-arrival packet via email and WhatsApp.
 */
export async function sendPreArrivalPacket(
  supabase: SupabaseClient,
  packet: PreArrivalPacket,
  guestPhone: string | null,
  guestEmail: string | null,
) {
  // Send WhatsApp if phone available
  if (guestPhone && packet.whatsAppMessage) {
    try {
      await sendWhatsAppMessage(guestPhone, packet.whatsAppMessage)
    } catch (err) {
      console.error('[PreArrival] WhatsApp send failed:', err)
    }
  }

  // Send email via Resend
  if (guestEmail) {
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Lina Point Resort <concierge@linapoint.com>',
            to: [guestEmail],
            subject: `${packet.guestName}, your Lina Point trip is 7 days away! 🌊`,
            html: buildPreArrivalEmailHtml(packet),
          }),
        })
      }
    } catch (err) {
      console.error('[PreArrival] Email send failed:', err)
    }
  }

  // Record in DB
  await supabase.from('pre_arrival_packets').insert({
    reservation_id: packet.reservationId,
    user_id: (
      await supabase
        .from('reservations')
        .select('guest_id')
        .eq('id', packet.reservationId)
        .single()
    ).data?.guest_id,
    sent_via: guestPhone && guestEmail ? 'both' : guestPhone ? 'whatsapp' : 'email',
    weather_forecast: { summary: packet.weatherSummary },
    recommended_tours: packet.recommendedTours,
    dining_suggestions: packet.diningSuggestions,
    personalized_tips: packet.personalizedTips,
  })
}

function buildPreArrivalEmailHtml(packet: PreArrivalPacket): string {
  const tourRows = packet.recommendedTours
    .map(
      (t) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${t.name}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${t.price}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${t.why}</td></tr>`,
    )
    .join('')

  const diningList = packet.diningSuggestions
    .map((d) => `<li><strong>${d.name}</strong> — ${d.description}</li>`)
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
  <div style="background:linear-gradient(135deg,#0d9488 0%,#0e7490 100%);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="margin:0;font-size:28px">Lina Point Resort</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px">Your trip is 7 days away!</p>
  </div>
  <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <h2 style="color:#0d9488;margin-top:0">Hello ${packet.guestName}!</h2>
    <p>We're counting down the days until your arrival on <strong>${new Date(packet.checkIn + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.</p>

    <h3 style="color:#374151">🌤 Weather</h3>
    <p>${packet.weatherSummary}</p>

    <h3 style="color:#374151">🐠 Recommended Tours</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr style="background:#f0fdfa"><th style="padding:8px 12px;text-align:left">Tour</th><th style="padding:8px 12px;text-align:right">From</th><th style="padding:8px 12px;text-align:left">Why</th></tr>
      ${tourRows}
    </table>

    <h3 style="color:#374151">🍽 Dining</h3>
    <ul style="font-size:14px;line-height:1.8">${diningList}</ul>

    <h3 style="color:#374151">💡 Tips</h3>
    <p style="font-size:14px">${packet.personalizedTips}</p>

    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
      <p style="margin:0;font-size:14px">Need anything? Message Maya on WhatsApp:</p>
      <p style="font-size:20px;font-weight:bold;color:#0d9488;margin:8px 0 0">+501-000-0000</p>
    </div>
  </div>
</body>
</html>`
}
