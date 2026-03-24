# Lina Point — Forward Roadmap

> Generated after completing the 3-session code health initiative.
> Zero TypeScript errors. All critical security + data-integrity gaps resolved.

---

## Current State Summary

All originally identified gaps are implemented and verified:

- Auth guards on every admin API route
- Column mismatches fixed
- `cancelReservation()` with real Stripe refund API + refund policy lookup
- Loyalty `handleRedeem()` with DB writes + rollback on insert failure
- Invoice tour scoping by `booking_id`
- Promo race condition closed with optimistic lock
- Console.log guards in all cron + payment routes
- Rate limiting on payment intent creation
- RevPAR KPI, pricing audit trail, housekeeping staff assignment
- `alert()` replaced with `toast` in all pages
- **Auth callback route** at `/auth/callback` — fixes email confirmation 404 (just added, this was the last critical gap)

---

## Priority 1 — Database Migrations Needed

These tables are referenced in code but may not exist in production Supabase yet.
Run these migrations before shipping.

### 1a. `loyalty_redemptions`

```sql
CREATE TABLE loyalty_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id    UUID NOT NULL,
  reward_name  TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | fulfilled | cancelled
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON loyalty_redemptions (user_id);
```

### 1b. `pricing_audit`

```sql
CREATE TABLE pricing_audit (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID NOT NULL,
  changed_by   UUID NOT NULL REFERENCES auth.users(id),
  old_price    NUMERIC(10,2),
  new_price    NUMERIC(10,2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1c. `cancellation_ledger`

```sql
CREATE TABLE cancellation_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL,
  refund_amount   NUMERIC(10,2) NOT NULL,
  refund_pct      INTEGER NOT NULL,
  processor       TEXT NOT NULL, -- stripe | square | none
  stripe_refund_id TEXT,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 1d. `client_error_logs`

```sql
CREATE TABLE client_error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error       TEXT,
  context     TEXT,
  url         TEXT,
  user_agent  TEXT,
  user_id     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON client_error_logs (created_at DESC);
```

### 1e. `revenue_snapshots` (required for RevPAR KPI)

```sql
CREATE TABLE revenue_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  total       NUMERIC(12,2) NOT NULL,
  rooms_sold  INTEGER NOT NULL,
  total_rooms INTEGER NOT NULL,
  revpar      NUMERIC(10,2) GENERATED ALWAYS AS (total / NULLIF(total_rooms, 0)) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Priority 2 — Revenue Snapshots Cron

The RevPAR card on the admin dashboard queries `revenue_snapshots` but **nothing populates this table**. Add a daily cron job.

**File to create:** `src/app/api/cron/snapshot-revenue/route.ts`

Logic:

1. Cron auth guard
2. Query yesterday's `reservations` where `payment_status = 'paid'` grouped by `check_in` date
3. Upsert a row into `revenue_snapshots`
4. Run next.js revalidation on the dashboard

Add to vercel.json cron config:

```json
{ "path": "/api/cron/snapshot-revenue", "schedule": "0 1 * * *" }
```

---

## Priority 3 — Supabase Realtime Notifications

Current state: Notifications load once on page mount. Admin staff miss new alerts.

**Where to add:** `src/app/admin/notifications/page.tsx` and/or `src/app/admin/layout.tsx`

```ts
// In admin layout — live notification badge
useEffect(() => {
  const channel = supabase
    .channel("admin-notifications")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        setUnreadCount((n) => n + 1);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

This powers a live badge counter in the sidebar nav next to "Notifications 🔔".

---

## Priority 4 — Automated Loyalty Points on Payment

When a reservation is paid, loyalty points should auto-accrue. Currently nothing adds points on payment.

**Where to add:** `src/lib/bookingFulfillment.ts` → `markReservationPaid()` function.

After the payment_status update succeeds:

```ts
// Award 1 point per $1 paid (tier multiplier can be added later)
const pointsEarned = Math.floor(amount / 100); // amount is in cents
await supabase
  .from("profiles")
  .update({ loyalty_points: supabase.raw(`loyalty_points + ${pointsEarned}`) })
  .eq("user_id", reservation.user_id);
```

This closes the loop: book → pay → earn points → redeem.

---

## Priority 5 — Admin: Single Reservation Detail Page

Currently the admin reservations list (`/admin/guests` or similar) shows a flat list. There's no drill-down to see a single reservation with its booking, invoice, and payment details together.

**Files to create:**

- `src/app/admin/reservations/[id]/page.tsx`

Sections:

1. Reservation header (dates, status, room)
2. Guest info card with contact
3. Invoice line items (tours, extras)
4. Payment history (Stripe/Square events)
5. Admin action bar: Mark paid / Cancel / Refund / Send invoice

---

## Priority 6 — Square Refund SDK Integration

`cancelReservation()` currently logs a warning for Square payments and skips the actual API call. Square has a Refunds SDK:

```ts
import { SquareClient } from "square";
const sq = new SquareClient({ token: process.env.SQUARE_ACCESS_TOKEN! });
const refundResult = await sq.refunds.refundPayment({
  idempotencyKey: crypto.randomUUID(),
  amountMoney: { amount: BigInt(refundCents), currency: "USD" },
  paymentId: reservation.payment_id,
  reason: "Guest cancellation refund",
});
```

**File to update:** `src/lib/bookingFulfillment.ts` → `cancelReservation()` Square branch.

---

## Priority 7 — Booking Modification Flow

Guest dashboard has a "modify" button/hint but no flow exists. Minimum viable modification:

- Change dates (subject to availability)
- Add/remove extra guests
- No room change (too complex, keep for v2)

**Files to create:**

- `src/app/api/reservations/[id]/modify/route.ts` — validates new dates, re-runs availability check, recalculates price delta, updates reservation
- `src/app/dashboard/reservations/modify/[id]/page.tsx` — form UI

---

## Priority 8 — Booking Confirmation Page

After checkout completes, users land back on the dashboard with no confirmation screen. Add:

**File to create:** `src/app/book-confirmation/page.tsx`

- Read `?booking_id=` and `?payment_id=` from query params
- Show: "You're confirmed! 🎉" with dates, room, total
- CTA: "View in My Reservations" → `/dashboard/reservations`
- Auto-send confirmation email via Resend (trigger in `markReservationPaid`)

---

## Priority 9 — Error Monitoring (Sentry)

`/api/stripe/webhook` and the cron jobs are high-value. If they silently fail, you lose revenue.

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add `.env`:

```
SENTRY_DSN=<your-dsn>
SENTRY_ORG=<org>
SENTRY_PROJECT=<project>
```

Instrument `src/app/api/stripe/webhook/route.ts` with `Sentry.captureException(err)` in the catch block.

---

## Priority 10 — SEO Metadata on Public Pages

Key guest-facing pages lack `export const metadata` or have incomplete descriptions.

Pages to audit:

- `src/app/rooms/page.tsx`
- `src/app/experiences/page.tsx`
- `src/app/tours/page.tsx`
- `src/app/blog/[slug]/page.tsx`

Pattern to add (per page):

```ts
export const metadata: Metadata = {
  title: "Overwater Bungalows in Belize | Lina Point",
  description:
    "Secluded overwater bungalows in Southern Belize. All-inclusive packages with snorkeling, diving, and jungle tours.",
  openGraph: {
    images: [{ url: "/og/rooms.jpg" }],
    type: "website",
  },
};
```

---

## Stretch / V2

| Feature                            | Rationale                                                  |
| ---------------------------------- | ---------------------------------------------------------- |
| Admin role management UI           | Currently roles set directly in DB; no UI                  |
| Waitlist system                    | Capture demand for sold-out dates                          |
| Group booking deposit flow         | `/admin/group-bookings` exists but has no payment handling |
| Email newsletter via Resend        | Marketing sends WhatsApp — add email drip                  |
| In-app WhatsApp-style chat widget  | Guests ask questions mid-stay                              |
| Affiliate / partner discount codes | Extension of promo system                                  |
| OTA channel management push        | Update Airbnb/Booking.com availability from admin          |

---

## Quick Wins (< 2 hours each)

| Task                                     | File                  | Effort |
| ---------------------------------------- | --------------------- | ------ |
| DB migration script for all tables above | New SQL file          | 30 min |
| Revenue snapshots cron                   | New route file        | 45 min |
| Realtime notification badge in admin nav | layout.tsx            | 1 hr   |
| Loyalty points on payment (auto-accrue)  | bookingFulfillment.ts | 30 min |
| Booking confirmation page                | New page file         | 1 hr   |
| Square refund SDK call                   | bookingFulfillment.ts | 1 hr   |
