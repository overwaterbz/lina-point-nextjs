import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchCompetitivePrices } from '@/lib/otaIntegration'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const ROOM_TYPE_LABELS: Record<string, string> = {
  suite_1st_floor: '1st Floor Hotel Suite',
  suite_2nd_floor: '2nd Floor Hotel Suite',
  cabana_1br: '1BR Overwater Cabana',
  cabana_2br: '2BR Overwater Cabana',
}

const BEAT_PERCENTAGE = 0.06 // 6% below lowest OTA
const MIN_RATE_FLOOR = 0.70 // never price below 70% of base rate

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const roomType = searchParams.get('roomType')
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')

  if (!roomType || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'Missing required params: roomType, checkIn, checkOut' },
      { status: 400 },
    )
  }

  if (!ROOM_TYPE_LABELS[roomType]) {
    return NextResponse.json({ error: 'Invalid room type' }, { status: 400 })
  }

  // Validate dates
  const ciDate = new Date(checkIn)
  const coDate = new Date(checkOut)
  if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime()) || coDate <= ciDate) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get base rate for this room type
  const { data: rooms } = await supabase
    .from('rooms')
    .select('base_rate_usd')
    .eq('room_type', roomType)
    .limit(1)

  const baseRate = rooms?.[0]?.base_rate_usd ? Number(rooms[0].base_rate_usd) : 199

  // Check DB cache first (30-min TTL)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: cached } = await supabase
    .from('ota_price_cache')
    .select('ota_name, price, currency, source_url, source, fetched_at')
    .eq('room_type', roomType)
    .eq('check_in', checkIn)
    .eq('check_out', checkOut)
    .gte('fetched_at', thirtyMinAgo)
    .order('fetched_at', { ascending: false })

  let otaPrices: Array<{
    ota: string
    price: number
    currency: string
    url: string
    source: string
  }>

  if (cached && cached.length >= 2) {
    // Use cached prices
    otaPrices = cached.map(c => ({
      ota: c.ota_name,
      price: Number(c.price),
      currency: c.currency || 'USD',
      url: c.source_url || '',
      source: c.source || 'live',
    }))
  } else {
    // Fetch live from Tavily
    const label = ROOM_TYPE_LABELS[roomType]
    const livePrices = await fetchCompetitivePrices(
      label,
      checkIn,
      checkOut,
      'San Pedro, Ambergris Caye, Belize',
    )

    otaPrices = livePrices.map(p => ({
      ota: p.ota,
      price: p.price,
      currency: p.currency,
      url: p.url,
      source: p.source,
    }))

    // Persist to cache (fire-and-forget)
    if (otaPrices.length > 0) {
      const cacheRows = otaPrices.map(p => ({
        room_type: roomType,
        check_in: checkIn,
        check_out: checkOut,
        ota_name: p.ota,
        price: p.price,
        currency: p.currency,
        source_url: p.url,
        source: p.source,
      }))
      supabase.from('ota_price_cache').insert(cacheRows).then(() => {})
    }
  }

  // Calculate lowest OTA price
  const lowestOTA = otaPrices.reduce(
    (best, p) => (p.price < best.price ? p : best),
    { ota: 'unknown', price: 99999, currency: 'USD', url: '', source: '' },
  )

  // Beat it by 6%, but enforce floor
  const floor = Math.round(baseRate * MIN_RATE_FLOOR * 100) / 100
  const rawBeatPrice = Math.round(lowestOTA.price * (1 - BEAT_PERCENTAGE) * 100) / 100
  const ourDirectPrice = Math.max(rawBeatPrice, floor)
  const savingsAmount = Math.round((lowestOTA.price - ourDirectPrice) * 100) / 100
  const savingsPercent = lowestOTA.price > 0
    ? Math.round((savingsAmount / lowestOTA.price) * 100 * 10) / 10
    : 0

  return NextResponse.json({
    otaPrices: otaPrices.map(p => ({
      ota: p.ota,
      price: p.price,
      currency: p.currency,
      url: p.url,
      source: p.source,
    })),
    lowestOTA: {
      ota: lowestOTA.ota,
      price: lowestOTA.price,
    },
    ourDirectPrice,
    baseRate,
    savingsAmount,
    savingsPercent,
    guaranteeBadge: savingsPercent > 0,
    beatPercentage: BEAT_PERCENTAGE * 100,
  })
}
