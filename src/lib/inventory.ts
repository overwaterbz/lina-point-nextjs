import { SupabaseClient } from '@supabase/supabase-js'

export type RoomType = 'cabana_1br' | 'cabana_2br' | 'suite_2nd_floor' | 'suite_1st_floor'

/** Maps the booking page's display names to DB enum values */
const ROOM_TYPE_MAP: Record<string, RoomType> = {
  'overwater cabana': 'cabana_1br',
  'cabana 1br': 'cabana_1br',
  'cabana_1br': 'cabana_1br',
  'cabana 2br': 'cabana_2br',
  'cabana_2br': 'cabana_2br',
  'family cabana': 'cabana_2br',
  '2nd floor suite': 'suite_2nd_floor',
  'reef suite': 'suite_2nd_floor',
  'suite_2nd_floor': 'suite_2nd_floor',
  '1st floor suite': 'suite_1st_floor',
  'hotel suite': 'suite_1st_floor',
  'suite_1st_floor': 'suite_1st_floor',
  // Legacy aliases
  'overwater bungalow': 'cabana_1br',
  'overwater suite': 'suite_1st_floor',
  'overwater_suite': 'suite_1st_floor',
  'beach villa': 'cabana_1br',
}

/** Room type display labels and total counts */
const ROOM_TYPE_INFO: Record<RoomType, { label: string; total: number; baseRate: number }> = {
  suite_1st_floor: { label: '1st Floor Hotel Suite', total: 4, baseRate: 299 },
  suite_2nd_floor: { label: '2nd Floor Hotel Suite', total: 4, baseRate: 249 },
  cabana_1br: { label: '1BR Overwater Cabana', total: 7, baseRate: 199 },
  cabana_2br: { label: '2BR Overwater Cabana', total: 1, baseRate: 349 },
}

export function resolveRoomType(input: string): RoomType {
  const key = input.toLowerCase().trim()
  return ROOM_TYPE_MAP[key] || 'suite_1st_floor'
}

export function getRoomTypeInfo(rt: RoomType) {
  return ROOM_TYPE_INFO[rt]
}

/** Generate date array [checkIn, checkIn+1, ..., checkOut-1] */
function dateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const start = new Date(checkIn + 'T00:00:00')
  const end = new Date(checkOut + 'T00:00:00')
  const current = new Date(start)
  while (current < end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export interface AvailabilityResult {
  roomType: RoomType
  label: string
  totalRooms: number
  availableRooms: number
  baseRate: number
  nights: number
  estimatedTotal: number
  available: boolean
}

/**
 * Check availability for all room types on a date range.
 * Returns how many rooms of each type are free.
 */
export async function checkAvailability(
  supabase: SupabaseClient,
  checkIn: string,
  checkOut: string,
): Promise<AvailabilityResult[]> {
  const dates = dateRange(checkIn, checkOut)
  const nights = dates.length

  if (nights < 1) return []

  // Get all rooms grouped by type
  const { data: rooms, error: roomErr } = await supabase
    .from('rooms')
    .select('id, room_type, base_rate_usd')
    .eq('status', 'active')

  if (roomErr || !rooms) throw new Error('Failed to load rooms: ' + (roomErr?.message || 'unknown'))

  // Get booked/blocked inventory for the date range
  const { data: blockedInventory, error: invErr } = await supabase
    .from('room_inventory')
    .select('room_id, date')
    .in('date', dates)
    .in('status', ['booked', 'blocked', 'maintenance'])

  if (invErr) throw new Error('Failed to check inventory: ' + invErr.message)

  // Build set of room_ids that are blocked on ANY date in the range
  const blockedRoomIds = new Set<string>()
  const blockedByRoom = new Map<string, Set<string>>()
  for (const inv of blockedInventory || []) {
    if (!blockedByRoom.has(inv.room_id)) blockedByRoom.set(inv.room_id, new Set())
    blockedByRoom.get(inv.room_id)!.add(inv.date)
  }

  // A room is unavailable if ANY date in the range is blocked
  for (const room of rooms) {
    const blocked = blockedByRoom.get(room.id)
    if (blocked && dates.some(d => blocked.has(d))) {
      blockedRoomIds.add(room.id)
    }
  }

  // Group by type and count available
  const byType = new Map<RoomType, { total: number; available: number; baseRate: number }>()
  for (const room of rooms) {
    const rt = room.room_type as RoomType
    if (!byType.has(rt)) {
      byType.set(rt, { total: 0, available: 0, baseRate: Number(room.base_rate_usd) })
    }
    const entry = byType.get(rt)!
    entry.total++
    if (!blockedRoomIds.has(room.id)) {
      entry.available++
    }
  }

  const results: AvailabilityResult[] = []
  for (const [rt, info] of Object.entries(ROOM_TYPE_INFO)) {
    const roomType = rt as RoomType
    const data = byType.get(roomType) || { total: info.total, available: info.total, baseRate: info.baseRate }
    results.push({
      roomType,
      label: info.label,
      totalRooms: data.total,
      availableRooms: data.available,
      baseRate: data.baseRate,
      nights,
      estimatedTotal: data.baseRate * nights,
      available: data.available > 0,
    })
  }

  return results
}

/**
 * Find a specific available room_id for a given room type + date range.
 * Returns null if no rooms are available.
 */
export async function findAvailableRoom(
  supabase: SupabaseClient,
  roomType: RoomType,
  checkIn: string,
  checkOut: string,
): Promise<string | null> {
  const dates = dateRange(checkIn, checkOut)

  // Get all active rooms of this type
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_type', roomType)
    .eq('status', 'active')

  if (!rooms?.length) return null

  // Get blocked inventory for these rooms in this date range
  const roomIds = rooms.map(r => r.id)
  const { data: blockedInventory } = await supabase
    .from('room_inventory')
    .select('room_id, date')
    .in('room_id', roomIds)
    .in('date', dates)
    .in('status', ['booked', 'blocked', 'maintenance'])

  const blockedByRoom = new Map<string, Set<string>>()
  for (const inv of blockedInventory || []) {
    if (!blockedByRoom.has(inv.room_id)) blockedByRoom.set(inv.room_id, new Set())
    blockedByRoom.get(inv.room_id)!.add(inv.date)
  }

  // Find first room with ALL dates available
  for (const room of rooms) {
    const blocked = blockedByRoom.get(room.id)
    if (!blocked || !dates.some(d => blocked.has(d))) {
      return room.id
    }
  }

  return null
}

/**
 * Mark dates as booked for a room. Creates inventory rows if they don't exist.
 */
export async function markDatesBooked(
  supabase: SupabaseClient,
  roomId: string,
  checkIn: string,
  checkOut: string,
  reservationId: string,
): Promise<void> {
  const dates = dateRange(checkIn, checkOut)

  // Upsert inventory rows for each date
  const rows = dates.map(date => ({
    room_id: roomId,
    date,
    status: 'booked' as const,
    reservation_id: reservationId,
  }))

  const { error } = await supabase
    .from('room_inventory')
    .upsert(rows, { onConflict: 'room_id,date' })

  if (error) throw new Error('Failed to mark dates booked: ' + error.message)
}

/**
 * Release booked dates (for cancellations).
 */
export async function releaseDates(
  supabase: SupabaseClient,
  reservationId: string,
): Promise<void> {
  const { error } = await supabase
    .from('room_inventory')
    .delete()
    .eq('reservation_id', reservationId)

  if (error) throw new Error('Failed to release dates: ' + error.message)
}
