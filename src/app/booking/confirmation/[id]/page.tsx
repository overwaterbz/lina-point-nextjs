import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getReservation } from '@/lib/bookingFulfillment'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const confirmationNumber = id.toUpperCase()

  const supabase = await createServerSupabaseClient()
  const reservation = await getReservation(supabase, confirmationNumber)

  if (!reservation) notFound()

  // Fetch associated tours
  const { data: tours } = await supabase
    .from('tour_bookings')
    .select('tour_name, price, status')
    .eq('booking_id', reservation.booking_id)

  const daysLeft = daysUntil(reservation.check_in)
  const isPast = daysLeft < 0
  const isToday = daysLeft === 0

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    checked_out: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-yellow-100 text-yellow-800',
  }

  const paymentColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-4 shadow-lg mb-4">
            <svg className="w-12 h-12 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-600 mt-2">Lina Point Resort — San Pedro, Belize</p>
        </div>

        {/* Confirmation Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Confirmation Number Banner */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-700 px-8 py-6 text-center">
            <p className="text-teal-100 text-sm font-medium uppercase tracking-wide">Confirmation Number</p>
            <p className="text-4xl font-bold text-white tracking-widest mt-1">{reservation.confirmation_number}</p>
          </div>

          <div className="p-8 space-y-6">
            {/* Status Badges */}
            <div className="flex gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[reservation.status] || 'bg-gray-100'}`}>
                {reservation.status.replace('_', ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${paymentColors[reservation.payment_status] || 'bg-gray-100'}`}>
                Payment: {reservation.payment_status}
              </span>
            </div>

            {/* Countdown */}
            {!isPast && !isToday && reservation.status === 'confirmed' && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                <p className="text-4xl font-bold text-teal-700">{daysLeft}</p>
                <p className="text-teal-600 text-sm">days until your trip</p>
              </div>
            )}
            {isToday && reservation.status === 'confirmed' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">Welcome to Lina Point!</p>
                <p className="text-amber-600 text-sm">Check-in today at 3:00 PM</p>
              </div>
            )}

            {/* Reservation Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Reservation Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Room</p>
                  <p className="font-medium text-gray-900">{reservation.rooms?.name || 'Room'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Guests</p>
                  <p className="font-medium text-gray-900">{reservation.guests_count}</p>
                </div>
                <div>
                  <p className="text-gray-500">Check-in</p>
                  <p className="font-medium text-gray-900">{formatDate(reservation.check_in)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Check-out</p>
                  <p className="font-medium text-gray-900">{formatDate(reservation.check_out)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Nights</p>
                  <p className="font-medium text-gray-900">{reservation.nights}</p>
                </div>
                <div>
                  <p className="text-gray-500">Nightly Rate</p>
                  <p className="font-medium text-gray-900">${Number(reservation.base_rate).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Tours */}
            {tours && tours.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Curated Experiences</h3>
                <div className="space-y-2">
                  {tours.map((tour: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-3">
                      <span className="text-gray-900">{tour.tour_name}</span>
                      <span className="font-medium text-gray-700">${Number(tour.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 flex justify-between items-center">
              <span className="text-amber-900 font-semibold text-lg">Total</span>
              <span className="text-2xl font-bold text-amber-800">${Number(reservation.total_amount).toFixed(2)}</span>
            </div>

            {/* Check-in Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">Check-in Information</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2"><span>🕐</span><span>Check-in: <strong>3:00 PM</strong> · Check-out: <strong>11:00 AM</strong></span></li>
                <li className="flex gap-2"><span>📍</span><span>Lina Point Resort, San Pedro, Ambergris Caye, Belize</span></li>
                <li className="flex gap-2"><span>🚤</span><span>Water taxi from Belize City or direct flight to San Pedro (TZA)</span></li>
                <li className="flex gap-2"><span>🛶</span><span>Free: Kayaks, paddleboards, snorkel gear, Wi-Fi, hammocks</span></li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <a
                href="https://wa.me/5016329205"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-center py-3 rounded-xl font-semibold transition-colors"
              >
                Chat with Concierge
              </a>
              <Link
                href="/"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-3 rounded-xl font-semibold transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
