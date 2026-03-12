import type { ReservationResult } from './bookingFulfillment'

interface Tour {
  name: string
  price: number
}

/**
 * Generate the booking confirmation email HTML.
 */
export function confirmationEmailHtml(opts: {
  guestName: string
  confirmation: ReservationResult
  tours: Tour[]
  dinnerName: string
  dinnerPrice: number
  totalAmount: number
  checkIn: string
  checkOut: string
}): string {
  const { guestName, confirmation, tours, dinnerName, dinnerPrice, totalAmount, checkIn, checkOut } = opts

  const tourRows = tours
    .map(t => `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${t.name}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${t.price.toFixed(2)}</td></tr>`)
    .join('')

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
  <div style="background:linear-gradient(135deg,#0d9488 0%,#0e7490 100%);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="margin:0;font-size:28px">Lina Point Resort</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px">San Pedro, Ambergris Caye, Belize</p>
  </div>

  <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <h2 style="color:#0d9488;margin-top:0">Booking Confirmed!</h2>
    <p>Hello ${guestName},</p>
    <p>Your reservation at Lina Point Resort has been confirmed. We can't wait to welcome you to paradise!</p>

    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px">CONFIRMATION NUMBER</p>
      <p style="font-size:32px;font-weight:bold;color:#0d9488;margin:0;letter-spacing:2px">${confirmation.confirmationNumber}</p>
    </div>

    <h3 style="color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Reservation Details</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#6b7280">Room</td><td style="padding:6px 0;text-align:right;font-weight:600">${confirmation.roomName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Check-in</td><td style="padding:6px 0;text-align:right">${formatDate(checkIn)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Check-out</td><td style="padding:6px 0;text-align:right">${formatDate(checkOut)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Nights</td><td style="padding:6px 0;text-align:right">${confirmation.nights}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Nightly Rate</td><td style="padding:6px 0;text-align:right">$${confirmation.baseRate.toFixed(2)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;border-bottom:1px solid #e5e7eb">Room Total</td><td style="padding:6px 0;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">$${confirmation.totalRoomCost.toFixed(2)}</td></tr>
    </table>

    ${tours.length > 0 ? `
    <h3 style="color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-top:24px">Curated Experiences</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${tourRows}
      <tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${dinnerName}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right">$${dinnerPrice.toFixed(2)}</td></tr>
    </table>
    ` : ''}

    <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;text-align:center">
      <p style="font-size:12px;color:#92400e;margin:0 0 4px">TOTAL AMOUNT</p>
      <p style="font-size:28px;font-weight:bold;color:#92400e;margin:0">$${totalAmount.toFixed(2)}</p>
    </div>

    <h3 style="color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Check-in Information</h3>
    <ul style="color:#4b5563;font-size:14px;line-height:1.8">
      <li>Check-in time: <strong>3:00 PM</strong></li>
      <li>Check-out time: <strong>11:00 AM</strong></li>
      <li>Address: <strong>Lina Point Resort, San Pedro, Ambergris Caye, Belize</strong></li>
      <li>Airport transfer: Water taxi from Philip S.W. Goldson International Airport</li>
      <li>Free amenities: Kayaks, paddleboards, Wi-Fi, hammocks</li>
    </ul>

    <div style="background:#eff6ff;border-radius:8px;padding:16px;margin:24px 0;text-align:center">
      <p style="font-size:14px;color:#1e40af;margin:0 0 8px"><strong>Need help planning your trip?</strong></p>
      <a href="https://wa.me/5016327767" style="display:inline-block;background:#25d366;color:white;padding:10px 24px;border-radius:24px;text-decoration:none;font-weight:600;font-size:14px">Chat with our AI Concierge on WhatsApp</a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Lina Point Resort — San Pedro, Ambergris Caye, Belize<br/>
      BZ +501.632.7767 | <a href="mailto:reservations@linapoint.com" style="color:#6b7280">reservations@linapoint.com</a><br/>
      <a href="https://lina-point.vercel.app/booking/confirmation/${confirmation.confirmationNumber}" style="color:#0d9488">View your booking online</a>
    </p>
  </div>
</body>
</html>`
}

/**
 * Generate admin notification email HTML (short summary).
 */
export function adminNotificationHtml(opts: {
  confirmationNumber: string
  guestEmail: string
  roomName: string
  checkIn: string
  checkOut: string
  nights: number
  totalAmount: number
  guestsCount: number
}): string {
  return `
<div style="font-family:sans-serif;max-width:500px">
  <h2 style="color:#0d9488">New Booking: ${opts.confirmationNumber}</h2>
  <p><strong>Guest:</strong> ${opts.guestEmail}</p>
  <p><strong>Room:</strong> ${opts.roomName}</p>
  <p><strong>Dates:</strong> ${opts.checkIn} → ${opts.checkOut} (${opts.nights} nights)</p>
  <p><strong>Guests:</strong> ${opts.guestsCount}</p>
  <p><strong>Total:</strong> $${opts.totalAmount.toFixed(2)}</p>
  <p><a href="https://lina-point.vercel.app/admin/dashboard">Open Admin Dashboard</a></p>
</div>`
}

/**
 * Post-stay thank-you email with review request and referral code.
 */
export function postStayEmailHtml(opts: {
  guestName: string
  referralCode: string
  pointsEarned: number
  totalPoints: number
  loyaltyTier: string
  reviewUrl: string
}): string {
  const tierLabels: Record<string, string> = {
    new: 'New Guest',
    returning: 'Returning Guest',
    loyal: 'Loyal Guest',
    vip: 'VIP Guest',
  }
  const tierColors: Record<string, string> = {
    new: '#6b7280',
    returning: '#0d9488',
    loyal: '#7c3aed',
    vip: '#d97706',
  }
  const tierColor = tierColors[opts.loyaltyTier] || '#0d9488'
  const tierLabel = tierLabels[opts.loyaltyTier] || 'Guest'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
  <div style="background:linear-gradient(135deg,#0d9488 0%,#0e7490 100%);color:white;padding:32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="margin:0;font-size:28px">Thank You, ${opts.guestName.split(' ')[0]}!</h1>
    <p style="margin:8px 0 0;opacity:0.9;font-size:14px">We loved having you at Lina Point Resort</p>
  </div>

  <div style="background:white;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <p>We hope your stay was everything you dreamed of. Here's a quick recap of your loyalty rewards:</p>

    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:20px;margin:24px 0;text-align:center">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px">POINTS EARNED THIS STAY</p>
      <p style="font-size:36px;font-weight:bold;color:#0d9488;margin:0">+${'$'}{opts.pointsEarned.toLocaleString()}</p>
      <p style="font-size:14px;color:#6b7280;margin:8px 0 0">Total Balance: <strong>${'$'}{opts.totalPoints.toLocaleString()} points</strong></p>
      <div style="display:inline-block;margin-top:12px;padding:4px 16px;border-radius:20px;background:${'$'}{tierColor};color:white;font-size:12px;font-weight:600">
        ${'$'}{tierLabel}
      </div>
    </div>

    <h3 style="color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">⭐ Share Your Experience</h3>
    <p style="font-size:14px;color:#4b5563">Your feedback helps fellow travelers discover our paradise. It only takes a minute:</p>
    <div style="text-align:center;margin:20px 0">
      <a href="${'$'}{opts.reviewUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 32px;border-radius:24px;text-decoration:none;font-weight:600;font-size:16px">Leave a Review</a>
    </div>

    <h3 style="color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:8px">🎟️ Share the Love</h3>
    <p style="font-size:14px;color:#4b5563">Give your friends <strong>$25 off</strong> their first stay, and you'll earn <strong>$50 credit</strong> for each friend who books!</p>
    <div style="background:#eff6ff;border:2px dashed #3b82f6;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px">YOUR REFERRAL CODE</p>
      <p style="font-size:28px;font-weight:bold;color:#1e40af;margin:0;letter-spacing:3px">${'$'}{opts.referralCode}</p>
    </div>

    <div style="background:#fef3c7;border-radius:8px;padding:16px;margin:24px 0;text-align:center">
      <p style="font-size:14px;color:#92400e;margin:0"><strong>Ready to come back?</strong></p>
      <p style="font-size:13px;color:#92400e;margin:4px 0 12px">Loyal guests enjoy exclusive rates and priority room selection.</p>
      <a href="https://lina-point.vercel.app/booking" style="display:inline-block;background:#d97706;color:white;padding:10px 24px;border-radius:24px;text-decoration:none;font-weight:600;font-size:14px">Book Your Next Stay</a>
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Lina Point Resort — San Pedro, Ambergris Caye, Belize<br/>
      BZ +501.632.7767 | <a href="mailto:reservations@linapoint.com" style="color:#6b7280">reservations@linapoint.com</a>
    </p>
  </div>
</body>
</html>`
}
