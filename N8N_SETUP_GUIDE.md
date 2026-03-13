# n8n Setup Guide for Lina Point + Magic Is You

## Overview

n8n automates workflows between your two projects and external services. This guide covers setting up n8n to work with Lina Point's booking system.

## Quick Start

### 1. Get n8n Running

**Option A: n8n Cloud (Recommended for beginners)**
1. Sign up at https://n8n.io/cloud
2. You get a hosted instance at `https://your-name.app.n8n.cloud`
3. No server management needed

**Option B: Self-hosted (Docker)**
```bash
docker run -d --name n8n -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```
Access at http://localhost:5678

### 2. Set Environment Variables in Vercel

Add these to your **lina-point-nextjs** Vercel project:
```
N8N_WEBHOOK_URL=https://your-name.app.n8n.cloud/webhook/booking-flow
N8N_WEBHOOK_SECRET=your-secret-here-min-32-chars
```

Generate a strong secret:
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])
```

---

## Workflow Templates

### Workflow 1: New Booking → Welcome Flow

**Trigger:** Webhook (receives POST from Lina Point on booking)

1. **Webhook** node: Receives `new-booking` event
   - Method: POST
   - Authentication: Header Auth (`x-n8n-secret`)
   - Path: `/booking-flow`

2. **Switch** node: Route by `workflow` field
   - `new-booking` → Welcome flow
   - `pre-arrival` → Pre-arrival flow
   - `post-stay` → Post-stay flow
   - `rate-alert` → Admin notification

3. **Supabase** node: Fetch guest details
   - Connect to your Supabase instance
   - Query: `reservations` where `id = {{ $json.data.reservationId }}`

4. **Send Email** (Resend/SendGrid): Welcome email
   - To: Guest email
   - Subject: "Your Lina Point Reservation is Confirmed!"

5. **Slack/Discord** node (optional): Notify team
   - Channel: #bookings
   - Message: "New booking: {{ $json.data.confirmationNumber }}"

### Workflow 2: Daily Smart Digest

**Trigger:** Cron (daily at 8 AM)

1. **Cron** node: 8:00 AM daily
2. **HTTP Request**: `GET https://lina-point.vercel.app/api/cron/rate-parity`
   - Header: `x-cron-secret: your-cron-secret`
3. **HTTP Request**: `GET https://lina-point.vercel.app/api/cron/tour-prices`
4. **Supabase**: Fetch today's bookings & revenue
5. **Merge** node: Combine all data
6. **Email/Slack**: Send daily digest to admin

### Workflow 3: Rate Alert → Auto-Adjust

**Trigger:** Webhook (receives `rate-alert` from Lina Point)

1. **Webhook** node: `/rate-alert`
2. **IF** node: Check if alert count > 2
3. **Supabase**: Update `price_overrides` table
4. **Slack**: Notify admin of price adjustments

### Workflow 4: Post-Stay → Review + Referral

**Trigger:** Webhook (receives `post-stay` from Lina Point)

1. **Wait** node: 2 hours after checkout
2. **HTTP Request**: Trigger post-stay flow
3. **Wait** node: 3 days
4. **Send Email**: Referral offer reminder

---

## Connection Setup in n8n

### Supabase Connection
1. In n8n, go to **Credentials** → **Add New**
2. Select **Supabase**
3. Enter:
   - Host: `https://seonmgpsyyzbpcsrzjxi.supabase.co`
   - Service Role Key: `your-service-role-key`

### Webhook Authentication
In each Webhook node:
1. Set **Authentication** to "Header Auth"
2. Header Name: `x-n8n-secret`
3. Header Value: Same value as your `N8N_WEBHOOK_SECRET` env var

---

## Events Sent from Lina Point

| Event | Trigger | Data |
|-------|---------|------|
| `new-booking` | Guest pays for reservation | reservationId, confirmationNumber, guestId, roomType, checkIn, checkOut, total |
| `pre-arrival` | 7 days before check-in (cron) | guestId, reservationId, checkIn |
| `post-stay` | After checkout (cron) | guestId, reservationId, stayDuration, totalSpent |
| `rate-alert` | OTA prices lower than ours | alertCount, alerts[] |
| `tour-price-update` | Tour prices scraped | toursUpdated, pricesFound |
| `self-improve` | AI self-improvement cycle | metrics, suggestions |
| `daily-digest` | Daily summary (cron) | bookings, revenue, occupancy |

---

## Testing

### Test inbound (n8n → Lina Point):
```bash
curl -X POST https://lina-point.vercel.app/api/trigger-n8n \
  -H "Content-Type: application/json" \
  -H "x-n8n-secret: your-secret" \
  -d '{"runSelfImprove": false, "test": true}'
```

### Test outbound (Lina Point → n8n):
Check the health endpoint:
```bash
curl https://lina-point.vercel.app/api/trigger-n8n
```

### Verify webhook receiving in n8n:
1. Create a Webhook node with "Test URL"
2. Set your N8N_WEBHOOK_URL to that test URL
3. Trigger a booking or run the rate-parity cron
4. Check n8n execution history

---

## Tips for Beginners

1. **Start simple**: Build Workflow 1 first (new-booking notification)
2. **Use the visual editor**: Drag nodes, connect them, test step-by-step
3. **n8n has built-in Supabase nodes**: No custom HTTP needed for DB queries
4. **Error handling**: Add an "Error Trigger" node to catch failures
5. **Community templates**: Search n8n community for "hotel booking" or "CRM" templates
6. **Self-learning**: n8n's "AI Agent" node can connect to Grok/OpenAI for smart decisions
