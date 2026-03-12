import { SupabaseClient } from '@supabase/supabase-js'
import { findAvailableRoom, markDatesBooked, resolveRoomType, getRoomTypeInfo } from './inventory'
import type { RoomType } from './inventory'

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
      total_amount: input.totalAmount,
      payment_status: 'pending',
      booking_id: input.bookingId,
      special_requests: input.specialRequests || null,
      status: 'confirmed',
    })
    .select('id')
    .single()

  if (resErr || !reservation) throw new Error('Failed to create reservation: ' + (resErr?.message || 'unknown'))

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
    .select('id, confirmation_number, guest_id, room_type, base_rate, nights, total_room_cost, total_amount, check_in, check_out')
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
  const taxRate = 0.125 // 12.5% Belize GST
  const subtotal = roomCost
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  // Build line items
  const items = [
    {
      description: `${reservation.room_type} — ${reservation.nights} night${reservation.nights === 1 ? '' : 's'} @ $${Number(reservation.base_rate).toFixed(2)}/night`,
      quantity: reservation.nights,
      unit_price: Number(reservation.base_rate),
      total: Number(reservation.total_room_cost),
    },
  ]

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
