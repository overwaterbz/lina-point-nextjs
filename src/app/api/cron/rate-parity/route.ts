import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCompetitivePrices } from '@/lib/otaIntegration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/rate-parity
 *
 * Weekly rate parity check: compares our direct rates to OTA prices.
 * Creates AI insights when our rates aren't competitive.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get our current base rates by room type
  const { data: rooms } = await supabase
    .from('rooms')
    .select('room_type, base_rate_usd')
    .eq('status', 'active')

  if (!rooms || rooms.length === 0) {
    return NextResponse.json({ ok: true, message: 'No active rooms' })
  }

  // Deduplicate by room type and average rates
  const ratesByType = new Map<string, number[]>()
  for (const r of rooms) {
    const rates = ratesByType.get(r.room_type) || []
    rates.push(Number(r.base_rate_usd))
    ratesByType.set(r.room_type, rates)
  }

  const TYPE_LABELS: Record<string, string> = {
    suite_1st_floor: '1st Floor Hotel Suite',
    suite_2nd_floor: '2nd Floor Hotel Suite',
    cabana_1br: '1BR Overwater Cabana',
    cabana_2br: '2BR Overwater Cabana',
  }

  // Check rates for the next 30 days
  const checkIn = new Date()
  checkIn.setDate(checkIn.getDate() + 14)
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 2)
  const checkInStr = checkIn.toISOString().split('T')[0]
  const checkOutStr = checkOut.toISOString().split('T')[0]

  const results: Array<{
    roomType: string
    ourRate: number
    otaPrices: Array<{ ota: string; price: number; source: string }>
    alert: boolean
  }> = []

  for (const [roomType, rates] of ratesByType) {
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const label = TYPE_LABELS[roomType] || roomType

    try {
      const otaPrices = await fetchCompetitivePrices(
        label,
        checkInStr,
        checkOutStr,
        'San Pedro Ambergris Caye Belize',
      )

      const livePrices = otaPrices.filter(p => p.source === 'live')
      const lowestOTA = livePrices.length > 0
        ? Math.min(...livePrices.map(p => p.price))
        : null

      // Alert if any OTA is more than 15% cheaper than our rate
      const alert = lowestOTA !== null && lowestOTA < avgRate * 0.85

      results.push({
        roomType,
        ourRate: Math.round(avgRate),
        otaPrices: otaPrices.map(p => ({ ota: p.ota, price: p.price, source: p.source })),
        alert,
      })

      if (alert && lowestOTA !== null) {
        // Create an AI insight for the admin
        await supabase.from('ai_insights').insert({
          insight_type: 'pricing',
          title: `Rate Parity Alert: ${label}`,
          body: `OTA prices for ${label} are significantly lower than your direct rate of $${Math.round(avgRate)}/night. Lowest OTA rate found: $${Math.round(lowestOTA)}/night. Consider adjusting your direct pricing or contacting the OTA to enforce rate parity.`,
          action_suggestion: `Review pricing for ${label} — OTAs are ${Math.round(((avgRate - lowestOTA) / avgRate) * 100)}% cheaper`,
          confidence: livePrices.length >= 2 ? 0.85 : 0.5,
          status: 'new',
          metadata: JSON.stringify({
            roomType,
            ourRate: Math.round(avgRate),
            lowestOta: Math.round(lowestOTA),
            otaPrices: otaPrices.map(p => ({ ota: p.ota, price: p.price })),
            checkDate: checkInStr,
          }),
        })
      }
    } catch (err) {
      console.error(`[RateParity] Error checking ${roomType}:`, err)
    }
  }

  const alerts = results.filter(r => r.alert)
  console.log(`[RateParity] Checked ${results.length} room types, ${alerts.length} alerts generated`)

  return NextResponse.json({
    ok: true,
    checked: results.length,
    alerts: alerts.length,
    results,
  })
}
