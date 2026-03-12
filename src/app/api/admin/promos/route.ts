import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ promos: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()

  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code: body.code,
      description: body.description || null,
      discount_type: body.discount_type,
      discount_value: body.discount_value,
      min_booking_amount: body.min_booking_amount || 0,
      max_discount: body.max_discount || null,
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: body.valid_to || null,
      max_uses: body.max_uses || null,
      single_use_per_guest: body.single_use_per_guest ?? true,
      room_type: body.room_type || null,
      active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ promo: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ error: 'Missing promo id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('promo_codes')
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq('id', body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
