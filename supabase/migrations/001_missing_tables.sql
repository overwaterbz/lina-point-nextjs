-- ============================================================
-- Lina Point — Missing Tables Migration
-- Run once against your Supabase project:
--   psql $DATABASE_URL < supabase/migrations/001_missing_tables.sql
-- ============================================================

-- 1. Loyalty Redemptions
--    Tracks when a guest spends loyalty points
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  points_redeemed INTEGER NOT NULL CHECK (points_redeemed > 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS loyalty_redemptions_user_id_idx ON loyalty_redemptions(user_id);

-- 2. Pricing Audit Log
--    Written by the price-scout agent whenever a rate suggestion is made
CREATE TABLE IF NOT EXISTS pricing_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type       TEXT NOT NULL,
  suggested_rate  NUMERIC(10, 2) NOT NULL,
  current_rate    NUMERIC(10, 2),
  reason          TEXT,
  occupancy_pct   NUMERIC(5, 2),
  agent_version   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_audit_room_type_idx ON pricing_audit(room_type);
CREATE INDEX IF NOT EXISTS pricing_audit_created_at_idx ON pricing_audit(created_at DESC);

-- 3. Cancellation Ledger
--    Full audit trail for every cancellation + refund action
CREATE TABLE IF NOT EXISTS cancellation_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  cancelled_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason          TEXT,
  refund_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  refund_status   TEXT NOT NULL DEFAULT 'pending' CHECK (refund_status IN ('pending', 'issued', 'failed', 'none')),
  payment_id      TEXT,
  processor       TEXT CHECK (processor IN ('stripe', 'square', 'manual', NULL)),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cancellation_ledger_reservation_id_idx ON cancellation_ledger(reservation_id);

-- 4. Client Error Logs
--    Collected by the /api/error-reporting endpoint from the browser
CREATE TABLE IF NOT EXISTS client_error_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_error_logs_user_id_idx  ON client_error_logs(user_id);
CREATE INDEX IF NOT EXISTS client_error_logs_created_at_idx ON client_error_logs(created_at DESC);

-- 5. Revenue Snapshots
--    Daily roll-up written by the snapshot-revenue cron
CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date     DATE NOT NULL UNIQUE,   -- one row per calendar day
  total_paid        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reservation_count INTEGER NOT NULL DEFAULT 0,
  rooms_booked      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenue_snapshots_date_idx ON revenue_snapshots(snapshot_date DESC);

-- ============================================================
-- Row Level Security (enable but don't block service-role key)
-- ============================================================
ALTER TABLE loyalty_redemptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_audit         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_ledger   ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_error_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_snapshots     ENABLE ROW LEVEL SECURITY;

-- Guests can read their own loyalty redemptions
CREATE POLICY "guests_own_loyalty_redemptions" ON loyalty_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- Guests can insert their own error logs (error reporting)
CREATE POLICY "guests_insert_own_error_logs" ON client_error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- All other tables: admins only via service-role key (no public policies needed)
