/**
 * FreeToBook iCal Sync Engine
 *
 * Fetches iCal feeds from FreeToBook for each room and syncs
 * blocked/booked dates into room_inventory.
 *
 * FreeToBook iCal feeds only provide open/closed dates (no guest info, no rates).
 * Blocked date ranges appear as VEVENT entries with DTSTART/DTEND.
 */

import { createClient } from '@supabase/supabase-js'

const SYNC_NOTE = 'freetobook_sync'

interface ParsedEvent {
  start: string // YYYY-MM-DD
  end: string   // YYYY-MM-DD (exclusive, per iCal spec)
  summary?: string
}

/** Parse an ICS feed into date-range events */
export function parseIcal(icsText: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const blocks = icsText.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0]
    const start = extractDateValue(block, 'DTSTART')
    const end = extractDateValue(block, 'DTEND')
    if (!start || !end) continue

    const summaryMatch = block.match(/SUMMARY[^:]*:(.+)/i)
    events.push({
      start,
      end,
      summary: summaryMatch?.[1]?.trim(),
    })
  }

  return events
}

/** Extract a DATE or DATE-TIME value from an iCal property line */
function extractDateValue(block: string, prop: string): string | null {
  // Matches DTSTART;VALUE=DATE:20260315 or DTSTART:20260315T120000Z
  const regex = new RegExp(`${prop}[^:]*:(\\d{4})(\\d{2})(\\d{2})`, 'i')
  const match = block.match(regex)
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

/** Generate array of dates from start (inclusive) to end (exclusive) */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00Z')
  const endDate = new Date(end + 'T00:00:00Z')
  while (current < endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

interface SyncResult {
  roomId: string
  roomName: string
  blocked: number
  released: number
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface InventoryRow { id: string; date: string; status: string; notes: string }

/** Sync a single room's iCal feed into room_inventory */
export async function syncRoom(
  supabase: AnySupabase,
  room: { id: string; name: string; ical_url: string }
): Promise<SyncResult> {
  const result: SyncResult = { roomId: room.id, roomName: room.name, blocked: 0, released: 0 }

  try {
    // Fetch iCal feed with a timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(room.ical_url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      result.error = `HTTP ${response.status}`
      return result
    }

    const icsText = await response.text()
    const events = parseIcal(icsText)

    // Collect all blocked dates from the feed
    const blockedDates = new Set<string>()
    for (const event of events) {
      for (const d of dateRange(event.start, event.end)) {
        blockedDates.add(d)
      }
    }

    // Only sync dates from today forward (ignore past)
    const today = new Date().toISOString().split('T')[0]
    const futureDates = [...blockedDates].filter(d => d >= today)

    // Get existing sync-managed inventory rows for this room (today onward)
    const { data: existing } = await supabase
      .from('room_inventory')
      .select('id, date, status, notes')
      .eq('room_id', room.id)
      .eq('notes', SYNC_NOTE)
      .gte('date', today) as { data: InventoryRow[] | null }

    const rows = existing || []
    const existingByDate = new Map(rows.map((r: InventoryRow) => [r.date, r]))

    // UPSERT blocked dates
    const toUpsert = futureDates
      .filter(d => !existingByDate.has(d))
      .map(d => ({
        room_id: room.id,
        date: d,
        status: 'booked',
        notes: SYNC_NOTE,
      }))

    if (toUpsert.length > 0) {
      await supabase
        .from('room_inventory')
        .upsert(toUpsert, { onConflict: 'room_id,date' })
      result.blocked = toUpsert.length
    }

    // RELEASE dates that are no longer blocked in the feed
    // Only release rows that WE created (notes = SYNC_NOTE)
    const toRelease = rows
      .filter((r: InventoryRow) => !blockedDates.has(r.date) && r.status === 'booked')
      .map((r: InventoryRow) => r.id)

    if (toRelease.length > 0) {
      await supabase
        .from('room_inventory')
        .delete()
        .in('id', toRelease)
      result.released = toRelease.length
    }

    // Update room's last sync timestamp
    await supabase
      .from('rooms')
      .update({ last_ical_sync: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', room.id)

  } catch (err: unknown) {
    result.error = err instanceof Error ? err.message : 'Unknown error'
  }

  return result
}

/** Sync all rooms that have an iCal URL configured */
export async function syncAllRooms(): Promise<SyncResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, ical_url')
    .not('ical_url', 'is', null) as { data: { id: string; name: string; ical_url: string }[] | null }

  if (!rooms || rooms.length === 0) return []

  const results: SyncResult[] = []
  for (const room of rooms) {
    const r = await syncRoom(supabase, room)
    results.push(r)
  }

  return results
}
