import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  try {
    // Auth check — require a valid session (admin or booking owner)
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const bookingId = url.searchParams.get('booking_id')
    if (!bookingId) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

    // Only return bookings owned by this user (unless admin)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',')
    const isAdmin = adminEmails.includes(user.email || '')

    let query = supabase
      .from('tour_bookings')
      .select('*')
      .eq('booking_id', bookingId)

    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ rows: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'server error' }, { status: 500 })
  }
}
