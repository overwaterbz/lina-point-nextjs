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
    .select('id, confirmation_number')
    .maybeSingle()

  if (error) {
    console.warn('[BookingFulfillment] Failed to mark paid:', error.message)
    return null
  }

  return data?.confirmation_number || null
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
