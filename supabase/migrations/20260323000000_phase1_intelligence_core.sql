-- Phase 1: Intelligence Core — OTA Price History, Revenue Feedback Loop, Guest Profile Enrichment
-- Run: supabase db push  OR  supabase migration up

-- ============================================================
-- 1. OTA Price History
--    Stores every competitive price fetch so we can track
--    7-day rolling averages and spot pricing trends.
-- ============================================================
CREATE TABLE IF NOT EXISTS ota_price_history (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_type   text        NOT NULL,
  check_in    date        NOT NULL,
  check_out   date        NOT NULL,
  ota_name    text        NOT NULL,
  price       numeric(10, 2) NOT NULL,
  source      text        NOT NULL DEFAULT 'live', -- 'live' | 'fallback'
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_type, check_in, check_out, ota_name, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_ota_price_history_lookup
  ON ota_price_history (room_type, fetched_at DESC);

-- ============================================================
-- 2. Pricing Rule Outcomes
--    Records each auto-applied pricing adjustment, then the
--    eval cron fills in before/after booking metrics to
--    calculate whether the change actually improved revenue.
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rule_outcomes (
  id                 uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id            uuid          REFERENCES pricing_rules (id) ON DELETE SET NULL,
  rule_name          text          NOT NULL,
  room_type          text,
  multiplier_before  numeric(5, 3),
  multiplier_after   numeric(5, 3),
  applied_at         timestamptz   NOT NULL DEFAULT now(),
  bookings_before_7d integer,
  bookings_after_7d  integer,
  revenue_before     numeric(12, 2),
  revenue_after      numeric(12, 2),
  verdict            text CHECK (verdict IN ('improved', 'degraded', 'neutral')),
  evaluated_at       timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rule_outcomes_pending
  ON pricing_rule_outcomes (applied_at DESC)
  WHERE verdict IS NULL;

-- ============================================================
-- 3. Guest Intelligence — Add enrichment columns
--    Columns captured at booking time (StepMagicFamily) and
--    read by preArrivalAgent for hyper-personalized packets.
-- ============================================================
ALTER TABLE guest_intelligence
  ADD COLUMN IF NOT EXISTS interest_tags        text[],
  ADD COLUMN IF NOT EXISTS activity_level       text,
  ADD COLUMN IF NOT EXISTS anniversary          date,
  ADD COLUMN IF NOT EXISTS birthday             date,
  ADD COLUMN IF NOT EXISTS music_style          text,
  ADD COLUMN IF NOT EXISTS room_type_preference text,
  ADD COLUMN IF NOT EXISTS last_booking_date    date,
  ADD COLUMN IF NOT EXISTS previous_tours       text[],
  ADD COLUMN IF NOT EXISTS engagement_score     numeric(5, 2);

-- Partial index for anniversary/birthday lookups (e.g. upcoming celebrations)
CREATE INDEX IF NOT EXISTS idx_guest_intel_anniversary
  ON guest_intelligence (anniversary)
  WHERE anniversary IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_intel_birthday
  ON guest_intelligence (birthday)
  WHERE birthday IS NOT NULL;
