import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { code, roomType, bookingAmount, userId } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ valid: false, error: 'Promo code is required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const normalizedCode = code.trim().toUpperCase()

  // Look up the promo code
  const { data: promo, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle()

  if (error || !promo) {
    return NextResponse.json({ valid: false, error: 'Invalid promo code' })
  }

  // Check date validity
  const today = new Date().toISOString().split('T')[0]
  if (promo.valid_from && today < promo.valid_from) {
    return NextResponse.json({ valid: false, error: 'This promo code is not yet active' })
  }
  if (promo.valid_to && today > promo.valid_to) {
    return NextResponse.json({ valid: false, error: 'This promo code has expired' })
  }

  // Check usage limits
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return NextResponse.json({ valid: false, error: 'This promo code has reached its usage limit' })
  }

  // Check single-use-per-guest
  if (promo.single_use_per_guest && userId) {
    const { data: usedBefore } = await supabase
      .from('promo_code_usage')
      .select('id')
      .eq('promo_code_id', promo.id)
      .eq('user_id', userId)
      .limit(1)

    if (usedBefore && usedBefore.length > 0) {
      return NextResponse.json({ valid: false, error: 'You have already used this promo code' })
    }
  }

  // Check minimum booking amount
  if (bookingAmount && promo.min_booking_amount && bookingAmount < Number(promo.min_booking_amount)) {
    return NextResponse.json({
      valid: false,
      error: `Minimum booking amount is $${Number(promo.min_booking_amount).toFixed(2)}`,
    })
  }

  // Check room type restriction
  if (promo.room_type && roomType && promo.room_type !== roomType) {
    return NextResponse.json({ valid: false, error: 'This promo code is not valid for the selected room type' })
  }

  // Calculate discount
  let discount = 0
  if (promo.discount_type === 'fixed') {
    discount = Number(promo.discount_value)
  } else if (promo.discount_type === 'percent' && bookingAmount) {
    discount = Math.round(bookingAmount * (Number(promo.discount_value) / 100) * 100) / 100
    // Apply max discount cap
    if (promo.max_discount && discount > Number(promo.max_discount)) {
      discount = Number(promo.max_discount)
    }
  }

  return NextResponse.json({
    valid: true,
    promoId: promo.id,
    code: promo.code,
    description: promo.description,
    discountType: promo.discount_type,
    discountValue: Number(promo.discount_value),
    discount,
    maxDiscount: promo.max_discount ? Number(promo.max_discount) : null,
  })
}
