import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCompetitivePrices } from '@/lib/otaIntegration'
import { verifyCronSecret } from '@/lib/cronAuth'
import { fireN8nWorkflow } from '@/lib/n8nClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/rate-parity
 *
 * Daily rate parity + OTA price storage.
 * 1. Scrapes OTA prices for each room type for the next 60 days.
 * 2. Stores them in daily_ota_rates with calculated "beat by 6%" rate.
 * 3. Creates AI insights when our rates aren't competitive.
 */
export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get('authorization'))
  if (denied) return denied

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
    cabana_duplex: '1 Bed Duplex Cabana',
    cabana_1br: '1BR Overwater Cabana',
    cabana_2br: '2BR Overwater Cabana',
  }

  // Scrape OTA prices for sample dates across the next 60 days
  // We check ~4 date windows to avoid excessive API calls
  const dateWindows = [14, 28, 45, 60]
  const results: Array<{
    roomType: string
    ourRate: number
    window: number
    otaPrices: Array<{ ota: string; price: number; source: string }>
    alert: boolean
    storedRates: number
  }> = []

  let totalStored = 0

  for (const [roomType, rates] of ratesByType) {
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
    const label = TYPE_LABELS[roomType] || roomType

    for (const daysOut of dateWindows) {
      const checkIn = new Date()
      checkIn.setDate(checkIn.getDate() + daysOut)
      const checkOut = new Date(checkIn)
      checkOut.setDate(checkOut.getDate() + 2)
      const checkInStr = checkIn.toISOString().split('T')[0]
      const checkOutStr = checkOut.toISOString().split('T')[0]

      try {
        const otaPrices = await fetchCompetitivePrices(
          label,
          checkInStr,
          checkOutStr,
          'San Pedro Ambergris Caye Belize',
        )

        const livePrices = otaPrices.filter(p => p.source === 'live')
        const allPrices = otaPrices.length > 0 ? otaPrices : []
        const lowestOTA = allPrices.length > 0
          ? Math.min(...allPrices.map(p => p.price))
          : null

        // Calculate our "beat by 6%" rate
        const beatRate = lowestOTA
          ? Math.max(Math.round(lowestOTA * 0.94 * 100) / 100, avgRate * 0.75) // floor at 75% of base
          : null

        // Store OTA prices in daily_ota_rates for the check-in date
        let stored = 0
        for (const op of allPrices) {
          const { error: upsertErr } = await supabase
            .from('daily_ota_rates')
            .upsert(
              {
                room_type: roomType,
                date: checkInStr,
                ota_name: op.ota,
                ota_price: op.price,
                ota_url: op.url || null,
                is_live: op.source === 'live',
                our_rate: beatRate,
                scraped_at: new Date().toISOString(),
              },
              { onConflict: 'room_type,date,ota_name' },
            )
          if (!upsertErr) stored++
        }
        totalStored += stored

        // Alert if any OTA is more than 15% cheaper than our rate
        const alert = lowestOTA !== null && lowestOTA < avgRate * 0.85

        results.push({
          roomType,
          ourRate: Math.round(avgRate),
          window: daysOut,
          otaPrices: allPrices.map(p => ({ ota: p.ota, price: p.price, source: p.source })),
          alert,
          storedRates: stored,
        })

        if (alert && lowestOTA !== null) {
          await supabase.from('ai_insights').insert({
            insight_type: 'pricing',
            title: `Rate Parity Alert: ${label}`,
            body: `OTA prices for ${label} (${daysOut} days out) are significantly lower than your direct rate of $${Math.round(avgRate)}/night. Lowest OTA rate found: $${Math.round(lowestOTA)}/night. Our auto-beat rate: $${beatRate}/night.`,
            action_suggestion: `Review pricing for ${label} — OTAs are ${Math.round(((avgRate - lowestOTA) / avgRate) * 100)}% cheaper`,
            confidence: livePrices.length >= 2 ? 0.85 : 0.5,
            status: 'new',
            metadata: JSON.stringify({
              roomType,
              ourRate: Math.round(avgRate),
              lowestOta: Math.round(lowestOTA),
              beatRate,
              daysOut,
              otaPrices: allPrices.map(p => ({ ota: p.ota, price: p.price })),
              checkDate: checkInStr,
            }),
          })
        }
      } catch (err) {
        console.error(`[RateParity] Error checking ${roomType} (${daysOut}d):`, err)
      }
    }
  }

  const alerts = results.filter(r => r.alert)
  console.log(`[RateParity] Checked ${results.length} windows, ${alerts.length} alerts, ${totalStored} rates stored`)

  // Notify n8n if there are rate alerts
  if (alerts.length > 0) {
    fireN8nWorkflow('rate-alert', {
      alertCount: alerts.length,
      totalChecked: results.length,
      alerts: alerts.slice(0, 5),
    })
  }

  return NextResponse.json({
    ok: true,
    checked: results.length,
    alerts: alerts.length,
    storedRates: totalStored,
    results,
  })
}
