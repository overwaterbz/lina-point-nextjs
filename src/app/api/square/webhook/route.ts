import { NextResponse } from 'next/server'

const isProd = process.env.NODE_ENV === 'production'

/**
 * Square Webhook Handler
 * Processes payment.completed events from Square
 * Mirrors the Stripe webhook: marks tour_bookings as paid + sends confirmation email
 */
export async function POST(req: Request) {
  const body = await req.text()
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature') || ''
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''
  const notificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lina-point.vercel.app'}/api/square/webhook`

  // Verify webhook signature
  if (signatureKey) {
    try {
      const { WebhooksHelper } = await import('square')
      const isValid = await WebhooksHelper.verifySignature({
        requestBody: body,
        signatureHeader,
        signatureKey,
        notificationUrl,
      })

      if (!isValid) {
        console.error('[Square Webhook] Invalid signature')
        return NextResponse.json({ received: false }, { status: 400 })
      }
    } catch (err) {
      console.error('[Square Webhook] Signature verification error:', err)
      return NextResponse.json({ received: false }, { status: 400 })
    }
  } else if (isProd) {
    console.warn('[Square Webhook] No SQUARE_WEBHOOK_SIGNATURE_KEY configured — rejecting in production')
    return NextResponse.json({ received: false }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type || ''
  if (!isProd) console.log('[Square Webhook] Event:', eventType)

  if (eventType === 'payment.completed') {
    const payment = event.data?.object?.payment
    if (!payment) {
      console.warn('[Square Webhook] No payment object in event')
      return NextResponse.json({ received: true })
    }

    const bookingId = payment.reference_id
    const paymentId = payment.id

    if (!isProd) {
      console.log('[Square Webhook] Payment completed:', paymentId, 'booking:', bookingId)
    }

    if (bookingId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()

        // Idempotency: check if already processed
        const { data: existing } = await supabase
          .from('tour_bookings')
          .select('status')
          .eq('booking_id', bookingId)
          .eq('status', 'paid')
          .limit(1)
        if (existing && existing.length > 0) {
          if (!isProd) console.log(`[Square Webhook] Booking ${bookingId} already paid, skipping`)
          return NextResponse.json({ received: true })
        }

        const { error: updateErr } = await supabase
          .from('tour_bookings')
          .update({
            status: 'paid',
            payment_intent: paymentId,
            payment_processor: 'square',
          })
          .eq('booking_id', bookingId)

        if (updateErr) {
          console.warn('[Square Webhook] Failed to update tour_bookings:', updateErr.message)
        } else if (!isProd) {
          console.log(`[Square Webhook] Marked tour_bookings paid for ${bookingId}`)
        }

        // Mark reservation as paid
        const { markReservationPaid } = await import('@/lib/bookingFulfillment')
        await markReservationPaid(supabase as any, bookingId, paymentId, 'square')

        // Send confirmation email
        await sendBookingConfirmation(supabase, bookingId, paymentId, 'square')
      } catch (err) {
        console.error('[Square Webhook] Error processing payment:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}

async function sendBookingConfirmation(
  supabase: any,
  bookingId: string,
  paymentId: string,
  processor: string,
) {
  try {
    const { data: bookings } = await supabase
      .from('tour_bookings')
      .select('user_id, tour_name, price')
      .eq('booking_id', bookingId)

    if (!bookings?.length) return

    const userId = bookings[0].user_id
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (!user?.email) return

    const total = bookings.reduce((sum: number, b: any) => sum + (b.price || 0), 0)
    const tourList = bookings.map((b: any) => `• ${b.tour_name} — $${b.price}`).join('\n')

    const { Resend } = await import('resend')
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return

    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: process.env.MAGIC_FROM_EMAIL || 'magic@linapointresort.com',
      to: user.email,
      subject: '🌴 Lina Point Resort — Booking Confirmed!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0d9488;">Booking Confirmed!</h1>
          <p>Thank you for choosing Lina Point Resort. Your payment has been processed via ${processor}.</p>
          <h3>Your Experiences:</h3>
          <pre style="background: #f9fafb; padding: 16px; border-radius: 8px;">${tourList}</pre>
          <p><strong>Total: $${total.toFixed(2)}</strong></p>
          <p style="font-size: 12px; color: #6b7280;">Payment ID: ${paymentId} | Booking: ${bookingId}</p>
          <hr/>
          <p style="color: #6b7280;">Lina Point Resort — San Pedro, Ambergris Caye, Belize<br/>
          BZ +501.632.9205 | reservations@linapoint.com</p>
        </div>
      `,
    })

    if (!isProd) console.log(`[Square Webhook] Confirmation email sent to ${user.email}`)
  } catch (err) {
    console.warn('[Square Webhook] Email send failed:', err)
  }
}
