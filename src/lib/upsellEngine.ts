/**
 * Upsell Engine
 *
 * Generates and tracks personalized upsell offers:
 * - Room upgrades (cabana → suite → overwater)
 * - Tour add-ons based on guest interests
 * - Romance/celebration packages
 * - Dining packages
 *
 * Used by WhatsApp concierge and pre-arrival agent.
 */

import { grokLLM } from '@/lib/grokIntegration'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getRoomTypeInfo, type RoomType } from './inventory'

export interface UpsellOffer {
  offerType: 'room_upgrade' | 'tour_addon' | 'dining_package' | 'romance' | 'spa'
  description: string
  originalPrice: number | null
  offerPrice: number
  whatsAppPitch: string
}

const UPGRADE_PATH: Record<RoomType, RoomType | null> = {
  cabana_1br: 'suite_2nd_floor',
  cabana_2br: 'suite_2nd_floor',
  suite_2nd_floor: 'suite_1st_floor',
  suite_1st_floor: null, // Already top tier
}

/**
 * Generate upsell offers for a reservation.
 */
export async function generateUpsellOffers(
  supabase: SupabaseClient,
  params: {
    userId: string
    reservationId: string
    roomType: RoomType
    checkIn: string
    checkOut: string
    nights: number
  },
): Promise<UpsellOffer[]> {
  const offers: UpsellOffer[] = []

  // Fetch guest profile for personalization
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, ai_preferences, travel_style, loyalty_tier')
    .eq('user_id', params.userId)
    .maybeSingle()

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const aiPrefs = (profile?.ai_preferences as any) || {}
  const travelStyle = profile?.travel_style || 'leisure'

  // ── 1. Room Upgrade ────────────────────────────────────
  const upgradeTo = UPGRADE_PATH[params.roomType]
  if (upgradeTo) {
    const currentInfo = getRoomTypeInfo(params.roomType)
    const upgradeInfo = getRoomTypeInfo(upgradeTo)
    const diff = (upgradeInfo.baseRate - currentInfo.baseRate) * params.nights
    // Offer upgrade at 60% of the rate difference
    const discountedDiff = Math.round(diff * 0.6)

    offers.push({
      offerType: 'room_upgrade',
      description: `Upgrade from ${currentInfo.label} to ${upgradeInfo.label}`,
      originalPrice: diff,
      offerPrice: discountedDiff,
      whatsAppPitch: `Hey ${firstName}! 🌊 We have a ${upgradeInfo.label} available for your dates. Normally +$${diff}, but I can do it for just +$${discountedDiff} for ${params.nights} nights. Want me to upgrade you?`,
    })
  }

  // ── 2. Tour Add-ons ───────────────────────────────────
  const interests = aiPrefs.activityInterests || []
  const tourSuggestions: Array<{ name: string; price: number; interest: string }> = [
    { name: 'Hol Chan Marine Reserve Snorkeling', price: 95, interest: 'snorkeling' },
    { name: 'Sport Fishing Adventure', price: 250, interest: 'fishing' },
    { name: 'Blue Hole Diving Day Trip', price: 280, interest: 'diving' },
    { name: 'Mayan Ruins Day Trip', price: 120, interest: 'cultural' },
    { name: 'Mangrove Kayaking & Wildlife', price: 60, interest: 'nature' },
  ]

  // Check which tours they already booked
  const { data: existingTours } = await supabase
    .from('tour_bookings')
    .select('tour_name')
    .eq('user_id', params.userId)

  const bookedNames = new Set((existingTours || []).map((t) => t.tour_name))

  const relevantTours = tourSuggestions
    .filter((t) => !bookedNames.has(t.name))
    .filter((t) => interests.length === 0 || interests.some((i: string) => t.interest.includes(i)))
    .slice(0, 2)

  for (const tour of relevantTours) {
    offers.push({
      offerType: 'tour_addon',
      description: tour.name,
      originalPrice: tour.price,
      offerPrice: Math.round(tour.price * 0.9), // 10% direct booking discount
      whatsAppPitch: `🐠 ${tour.name} — $${Math.round(tour.price * 0.9)} (save 10% booking direct). Want me to add it?`,
    })
  }

  // ── 3. Romance/Celebration Package ─────────────────────
  if (travelStyle === 'romantic' || aiPrefs.specialOccasions?.length > 0) {
    offers.push({
      offerType: 'romance',
      description: 'Romance Package: champagne, rose petals, private dinner',
      originalPrice: 250,
      offerPrice: 199,
      whatsAppPitch: `🌹 Make it extra special! Our Romance Package includes champagne, rose petals, and a private candlelit dinner — $199 (normally $250). Shall I add it?`,
    })
  }

  // ── 4. Dining Package ──────────────────────────────────
  if (params.nights >= 3) {
    const mealPrice = 45 * params.nights
    const packagePrice = Math.round(mealPrice * 0.8) // 20% off
    offers.push({
      offerType: 'dining_package',
      description: `${params.nights}-night Reef Restaurant dinner package`,
      originalPrice: mealPrice,
      offerPrice: packagePrice,
      whatsAppPitch: `🍽 ${params.nights}-Night Dinner Package at Reef Restaurant — $${packagePrice} (save 20%). Includes a 3-course dinner each evening. Interested?`,
    })
  }

  return offers
}

/**
 * Persist an upsell offer and send it via WhatsApp.
 */
export async function sendUpsellOffer(
  supabase: SupabaseClient,
  offer: UpsellOffer,
  params: {
    reservationId: string
    userId: string
  },
): Promise<string> {
  const { data } = await supabase
    .from('upsell_offers')
    .insert({
      reservation_id: params.reservationId,
      user_id: params.userId,
      offer_type: offer.offerType,
      description: offer.description,
      original_price: offer.originalPrice,
      offer_price: offer.offerPrice,
      status: 'offered',
      offered_via: 'whatsapp',
    })
    .select('id')
    .single()

  return data?.id || ''
}
