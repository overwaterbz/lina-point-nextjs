import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Outbound iCal feed for a specific room.
 * FreeToBook can import this URL to block dates booked on our website.
 *
 * GET /api/ical/[roomId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Get room info
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, room_number')
    .eq('id', roomId)
    .single()

  if (!room) {
    return new NextResponse('Room not found', { status: 404 })
  }

  // Get reservations for this room (confirmed or checked_in, today+)
  const today = new Date().toISOString().split('T')[0]
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, check_in, check_out, confirmation_number, status')
    .eq('room_id', roomId)
    .in('status', ['confirmed', 'checked_in'])
    .gte('check_out', today)

  // Also get manually blocked inventory dates (not from freetobook_sync)
  const { data: blocked } = await supabase
    .from('room_inventory')
    .select('date, status, notes')
    .eq('room_id', roomId)
    .in('status', ['blocked', 'maintenance'])
    .neq('notes', 'freetobook_sync')
    .gte('date', today)
    .order('date')

  // Build ICS
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lina Point Resort//Room Availability//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Lina Point - ${room.room_number} ${room.name}`,
  ]

  // Add reservation events
  for (const res of reservations || []) {
    const uid = `res-${res.id}@linapoint.com`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${res.check_in.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${res.check_out.replace(/-/g, '')}`,
      `SUMMARY:Booked - ${res.confirmation_number}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  // Add blocked date ranges (group consecutive dates)
  const blockedDates = (blocked || []).map(b => b.date).sort()
  const ranges = groupConsecutiveDates(blockedDates)
  for (const range of ranges) {
    const endPlusOne = addDays(range.end, 1)
    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${range.start}-${room.id}@linapoint.com`,
      `DTSTART;VALUE=DATE:${range.start.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${endPlusOne.replace(/-/g, '')}`,
      'SUMMARY:Blocked',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="room-${room.room_number}.ics"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}

function groupConsecutiveDates(dates: string[]): { start: string; end: string }[] {
  if (dates.length === 0) return []
  const ranges: { start: string; end: string }[] = []
  let start = dates[0]
  let prev = dates[0]

  for (let i = 1; i < dates.length; i++) {
    const expected = addDays(prev, 1)
    if (dates[i] === expected) {
      prev = dates[i]
    } else {
      ranges.push({ start, end: prev })
      start = dates[i]
      prev = dates[i]
    }
  }
  ranges.push({ start, end: prev })
  return ranges
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}
