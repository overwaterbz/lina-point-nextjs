import { SupabaseClient } from '@supabase/supabase-js'
import { findAvailableRoom, markDatesBooked, resolveRoomType, getRoomTypeInfo } from './inventory'
import type { RoomType } from './inventory'
import { fireN8nWorkflow } from './n8nClient'

/**
 * Generate a human-friendly confirmation number: LP-XXXXXX
 */
function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `LP-${code}`
}

export interface CreateReservationInput {
  guestId: string
  roomTypeInput: string // display name from form, e.g. "overwater bungalow"
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  guestsCount: number
  totalAmount: number // room + tours + dining
  bookingId: string // links to tour_bookings
  specialRequests?: string
  promoCode?: string // optional promo code to apply
}

export interface ReservationResult {
  reservationId: string
  confirmationNumber: string
  roomId: string
  roomType: RoomType
  roomName: string
  baseRate: number
  nights: number
  totalRoomCost: number
  promoDiscount?: number
  promoCodeApplied?: string
}

/**
 * Create a reservation: find room, mark inventory, insert reservation row.
 * Throws if no availability.
 */
export async function createReservation(
  supabase: SupabaseClient,
  input: CreateReservationInput,
): Promise<ReservationResult> {
  const roomType = resolveRoomType(input.roomTypeInput)
  const info = getRoomTypeInfo(roomType)

  // Find an available room
  const roomId = await findAvailableRoom(supabase, roomType, input.checkIn, input.checkOut)
  if (!roomId) {
    throw new Error(`No ${info.label} rooms available for ${input.checkIn} to ${input.checkOut}`)
  }

  // Get room details + nightly rate
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, name, base_rate_usd')
    .eq('id', roomId)
    .single()

  if (roomErr || !room) throw new Error('Failed to load room details')

  const nights = Math.round(
    (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / (1000 * 60 * 60 * 24),
  )
  const baseRate = Number(room.base_rate_usd)
  const totalRoomCost = baseRate * nights

  // Generate unique confirmation number (retry on collision)
  let confirmationNumber = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateConfirmationNumber()
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('confirmation_number', candidate)
      .maybeSingle()

    if (!existing) {
      confirmationNumber = candidate
      break
    }
  }
  if (!confirmationNumber) throw new Error('Failed to generate unique confirmation number')

  // Validate and apply promo code if provided
  let promoDiscount = 0
  let promoCodeId: string | null = null
  let promoCodeApplied: string | undefined

  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase()
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .maybeSingle()

    if (promo) {
      const now = new Date()
      const validFrom = promo.valid_from ? new Date(promo.valid_from) : null
      const validTo = promo.valid_to ? new Date(promo.valid_to) : null
      const withinDates = (!validFrom || now >= validFrom) && (!validTo || now <= validTo)
      const withinUses = !promo.max_uses || promo.current_uses < promo.max_uses
      const roomOk = !promo.room_type || promo.room_type === roomType
      const meetsMin = !promo.min_booking_amount || input.totalAmount >= promo.min_booking_amount

      if (withinDates && withinUses && roomOk && meetsMin) {
        // Check single-use-per-guest
        let singleUseOk = true
        if (promo.single_use_per_guest) {
          const { data: prior } = await supabase
            .from('promo_code_usage')
            .select('id')
            .eq('promo_code_id', promo.id)
            .eq('user_id', input.guestId)
            .maybeSingle()
          if (prior) singleUseOk = false
        }

        if (singleUseOk) {
          if (promo.discount_type === 'percent') {
            promoDiscount = Math.round(input.totalAmount * (promo.discount_value / 100) * 100) / 100
          } else {
            promoDiscount = Number(promo.discount_value)
          }
          if (promo.max_discount && promoDiscount > promo.max_discount) {
            promoDiscount = Number(promo.max_discount)
          }
          promoCodeId = promo.id
          promoCodeApplied = code
        }
      }
    }
  }

  const finalAmount = Math.round((input.totalAmount - promoDiscount) * 100) / 100

  // Insert reservation
  const { data: reservation, error: resErr } = await supabase
    .from('reservations')
    .insert({
      confirmation_number: confirmationNumber,
      guest_id: input.guestId,
      room_id: roomId,
      room_type: roomType,
      check_in: input.checkIn,
      check_out: input.checkOut,
      nights,
      guests_count: input.guestsCount,
      base_rate: baseRate,
      total_room_cost: totalRoomCost,
      total_amount: finalAmount,
      payment_status: 'pending',
      booking_id: input.bookingId,
      special_requests: input.specialRequests || null,
      status: 'confirmed',
      ...(promoCodeId ? { promo_code_id: promoCodeId, promo_discount: promoDiscount } : {}),
    })
    .select('id')
    .single()

  if (resErr || !reservation) throw new Error('Failed to create reservation: ' + (resErr?.message || 'unknown'))

  // Record promo usage & increment counter
  if (promoCodeId) {
    await supabase.from('promo_code_usage').insert({
      promo_code_id: promoCodeId,
      user_id: input.guestId,
      reservation_id: reservation.id,
      discount_applied: promoDiscount,
    })
    // Increment current_uses on the promo code
    const { data: currentPromo } = await supabase
      .from('promo_codes')
      .select('current_uses')
      .eq('id', promoCodeId)
      .single()
    if (currentPromo) {
      await supabase
        .from('promo_codes')
        .update({ current_uses: (currentPromo.current_uses || 0) + 1 })
        .eq('id', promoCodeId)
    }
  }

  // Mark inventory dates as booked
  await markDatesBooked(supabase, roomId, input.checkIn, input.checkOut, reservation.id)

  return {
    reservationId: reservation.id,
    confirmationNumber,
    roomId,
    roomType,
    roomName: room.name,
    baseRate,
    nights,
    totalRoomCost,
    ...(promoDiscount > 0 ? { promoDiscount, promoCodeApplied } : {}),
  }
}

/**
 * Mark a reservation as paid after payment webhook confirms success.
 * Also generates an invoice automatically.
 */
export async function markReservationPaid(
  supabase: SupabaseClient,
  bookingId: string,
  paymentId: string,
  processor: 'square' | 'stripe',
): Promise<string | null> {
  const { data, error } = await supabase
    .from('reservations')
    .update({
      payment_status: 'paid',
      payment_processor: processor,
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .eq('payment_status', 'pending') // idempotent: only update if still pending
    .select('id, confirmation_number, guest_id, room_type, base_rate, nights, total_room_cost, total_amount, check_in, check_out, promo_discount')
    .maybeSingle()

  if (error) {
    console.warn('[BookingFulfillment] Failed to mark paid:', error.message)
    return null
  }

  if (!data) return null

  // Auto-generate invoice
  try {
    await generateInvoice(supabase, data)
  } catch (invErr) {
    console.warn('[BookingFulfillment] Invoice generation failed:', invErr)
  }

  // Grant free Magic Is You Dreamweaver access for the stay
  try {
    const { data: guest } = await supabase.auth.admin.getUserById(data.guest_id)
    if (guest?.user?.email) {
      const { grantMagicAccess } = await import('./magicBridge')
      await grantMagicAccess(
        supabase,
        guest.user.email,
        guest.user.user_metadata?.full_name || guest.user.email.split('@')[0],
        bookingId,
        data.check_in,
        data.check_out,
      )
    }
  } catch (bridgeErr) {
    console.warn('[BookingFulfillment] Magic bridge failed (non-fatal):', bridgeErr)
  }

  // Notify n8n of new paid booking (fire-and-forget)
  fireN8nWorkflow('new-booking', {
    reservationId: bookingId,
    confirmationNumber: data.confirmation_number,
    guestId: data.guest_id,
    roomType: data.room_type,
    checkIn: data.check_in,
    checkOut: data.check_out,
    total: data.total_room_cost,
  })

  return data.confirmation_number || null
}

/**
 * Generate an invoice for a paid reservation.
 */
async function generateInvoice(
  supabase: SupabaseClient,
  reservation: {
    id: string
    confirmation_number: string
    guest_id: string
    room_type: string
    base_rate: number
    nights: number
    total_room_cost: number
    total_amount: number
  },
): Promise<void> {
  // Check if invoice already exists for this reservation
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('reservation_id', reservation.id)
    .maybeSingle()

  if (existing) return // already invoiced

  const roomCost = Number(reservation.total_room_cost) || Number(reservation.total_amount) || 0
  const promoDiscount = Number((reservation as any).promo_discount) || 0
  const taxRate = 0.125 // 12.5% Belize GST
  const subtotal = roomCost - promoDiscount
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  // Build line items
  const items: { description: string; quantity: number; unit_price: number; total: number }[] = [
    {
      description: `${reservation.room_type} — ${reservation.nights} night${reservation.nights === 1 ? '' : 's'} @ $${Number(reservation.base_rate).toFixed(2)}/night`,
      quantity: reservation.nights,
      unit_price: Number(reservation.base_rate),
      total: Number(reservation.total_room_cost),
    },
  ]

  if (promoDiscount > 0) {
    items.push({
      description: 'Promo Code Discount',
      quantity: 1,
      unit_price: -promoDiscount,
      total: -promoDiscount,
    })
  }

  // Check for tour bookings associated with same booking
  const { data: tours } = await supabase
    .from('tour_bookings')
    .select('total_price, num_guests, tours(name)')
    .eq('user_id', reservation.guest_id)
    .eq('status', 'paid') as any

  for (const tb of tours || []) {
    if (tb.total_price > 0) {
      items.push({
        description: `Tour: ${tb.tours?.name || 'Activity'}`,
        quantity: tb.num_guests || 1,
        unit_price: Number(tb.total_price) / (tb.num_guests || 1),
        total: Number(tb.total_price),
      })
    }
  }

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  const invoiceNumber = `INV-${dateStr}-${rand}`

  await supabase.from('invoices').insert({
    reservation_id: reservation.id,
    guest_id: reservation.guest_id,
    invoice_number: invoiceNumber,
    items: JSON.stringify(items),
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    status: 'paid',
    issued_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
  })
}

/**
 * Cancel a reservation and release inventory.
 */
export async function cancelReservation(
  supabase: SupabaseClient,
  reservationId: string,
): Promise<void> {
  const { releaseDates } = await import('./inventory')

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', reservationId)

  if (error) throw new Error('Failed to cancel reservation: ' + error.message)

  await releaseDates(supabase, reservationId)
}

/**
 * Look up reservation by confirmation number.
 */
export async function getReservation(
  supabase: SupabaseClient,
  confirmationNumber: string,
) {
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      rooms (name, room_type, amenities, description)
    `)
    .eq('confirmation_number', confirmationNumber.toUpperCase())
    .maybeSingle()

  if (error) throw new Error('Failed to look up reservation: ' + error.message)
  return data
}
